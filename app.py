"""ENJAMBRE - GUI Streamlit (MVP real).

Fase 1: valida keys de verdad y despacha el prompt en paralelo a los agentes,
mostrando las salidas lado a lado.
Fase 2: workspace seguro - seleccion de contexto, vista de diff y aplicacion de
cambios SOLO bajo aprobacion humana explicita.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent / "src"))

from enjambre import config, workspace  # noqa: E402
from enjambre.changes import Change, ChangeSet  # noqa: E402
from enjambre.orchestrator import Orchestrator  # noqa: E402
from enjambre.registry import Registry  # noqa: E402

load_dotenv()

st.set_page_config(page_title="ENJAMBRE", layout="wide")
st.title("ENJAMBRE")
st.markdown("**Orquestador local-first de agentes IA de codificacion (BYOK)**")

registry = Registry.load()

# --- Sidebar: proyecto y API keys (BYOK) ---
with st.sidebar:
    st.header("Proyecto")
    project_root = st.text_input("Raiz del proyecto", value=".")

    st.header("API Keys (BYOK)")
    keys: dict[str, str] = {}
    for provider, env_var in config.PROVIDER_ENV.items():
        keys[provider] = st.text_input(
            f"{provider} ({env_var})",
            value=config.get_key(provider),
            type="password",
        )

    if st.button("Validar Keys"):
        orch = Orchestrator(registry, keys=keys)
        results = asyncio.run(orch.validate_keys())
        if not results:
            st.info("No hay agentes habilitados que usen proveedores.")
        for name, res in sorted(results.items()):
            estado = "OK" if res.ok else "FALLO"
            (st.success if res.ok else st.error)(f"{name}: {estado} - {res.detail}")

tab_comparar, tab_workspace = st.tabs(["Comparar agentes", "Workspace"])

# --- Fase 1: comparar agentes ---
with tab_comparar:
    col1, col2 = st.columns([3, 2])
    with col1:
        st.subheader("Lanzar Enjambre")
        prompt = st.text_area(
            "Prompt / tarea de codigo", height=150,
            placeholder="Refactoriza esta funcion para que sea mas legible...",
        )
        agent_names = [a.name for a in registry.agents]
        default_sel = [a.name for a in registry.enabled()]
        selected = st.multiselect("Agentes", agent_names, default=default_sel)

        if st.button("Lanzar Enjambre", type="primary"):
            if not prompt.strip():
                st.warning("Escribe un prompt primero.")
            elif not selected:
                st.warning("Selecciona al menos un agente.")
            else:
                with st.spinner("Consultando agentes en paralelo..."):
                    orch = Orchestrator(registry, keys=keys)
                    report = asyncio.run(orch.run(prompt, agents=selected))

                for w in report.warnings:
                    st.warning(w)

                st.caption(f"Costo estimado total: ${report.total_cost_usd:.6f} USD")
                cols = st.columns(max(1, len(report.runs)))
                for c, run in zip(cols, report.runs):
                    with c:
                        st.markdown(f"**{run.agent}** ({run.provider}/{run.model})")
                        if run.result.ok:
                            st.caption(
                                f"{run.result.latency_ms} ms - "
                                f"${run.result.cost_usd:.6f}")
                            st.text_area("salida", value=run.result.text,
                                         height=300, key=f"out-{run.agent}")
                        else:
                            st.error(run.result.error)

    with col2:
        st.subheader("Agentes registrados")
        for a in registry.agents:
            estado = "habilitado" if a.enabled else "deshabilitado"
            st.metric(label=a.name, value=a.provider, delta=estado)

# --- Fase 2: workspace seguro ---
with tab_workspace:
    st.subheader("Workspace seguro")
    root = Path(project_root)
    if not root.is_dir():
        st.error(f"La raiz '{project_root}' no es un directorio.")
    else:
        files = workspace.iter_files(root)
        st.caption(f"{len(files)} archivos visibles (excluye .enjambreignore y "
                   "archivos sensibles).")
        ctx_sel = st.multiselect("Archivos de contexto", files)
        if ctx_sel:
            with st.expander("Contexto (con secretos redactados)"):
                st.code(workspace.build_context(root, ctx_sel))

        st.divider()
        st.markdown("**Aplicar un cambio (revision de diff + aprobacion)**")
        target = st.text_input("Ruta del archivo a cambiar (relativa a la raiz)")
        new_content = st.text_area("Contenido nuevo propuesto", height=200)

        if target and new_content:
            change = Change(target, new_content)
            st.markdown("Diff propuesto:")
            diff = change.diff(root)
            st.code(diff or "(archivo nuevo o sin cambios)", language="diff")

            approved = st.checkbox(
                "Apruebo aplicar este cambio al disco (accion irreversible)")
            if st.button("Aplicar cambio", type="primary", disabled=not approved):
                report = ChangeSet([change]).apply(root, approved=approved)
                if report.ok:
                    st.success(f"Escrito: {', '.join(report.written)}")
                else:
                    for path, motivo in report.rejected:
                        st.error(f"Rechazado {path}: {motivo}")

st.caption("ENJAMBRE v0.5 - Fase 1 (comparacion) + Fase 2 (workspace seguro)")
