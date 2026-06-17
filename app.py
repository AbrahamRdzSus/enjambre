"""ENJAMBRE - GUI Streamlit (MVP real, Fase 1).

Usa el nucleo de orquestacion (`src/enjambre`): valida keys de verdad y despacha
el prompt en paralelo a los agentes habilitados, mostrando las salidas lado a
lado. NO escribe archivos (eso es Fase 2 con su safety gate).
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import streamlit as st
from dotenv import load_dotenv

sys.path.insert(0, str(Path(__file__).parent / "src"))

from enjambre import config  # noqa: E402
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
    st.text_input("Nombre del proyecto", value="default")

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

# --- Main: lanzar enjambre ---
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

st.caption(f"ENJAMBRE v0.4 - Fase 1 (comparacion, sin escritura de archivos)")
