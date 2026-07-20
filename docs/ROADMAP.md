# Roadmap técnico y de producto — ENJAMBRE

> Plan de fixes de seguridad/robustez (auditoria ULTRA 2026-07-12): ver `docs/PLAN-FIXES-2026-07-12.md`.
> Seguimiento de adopciones de recursos externos (2026-07-12): ver `docs/SEGUIMIENTO-ADOPCIONES-2026-07-12.md`.
> Errores reales y sus fixes: `docs/aprendizaje/ERRORES-Y-FIXES.md`.

## Estado 2026-07-20

```
main = 866c3af   CI verde   262 tests   ruff limpio   frontend build verde

v0.6.1  ██████████  en main + tag         Release NO publicada  <-- cuello
v0.6.2  ██████████  en main + tag         W2 robustez + W3 andamiaje docker
v0.7.0  ██████████  en main (PR #19)      tool calling T0-T4+T6, tools OFF por defecto
Release ████░░░░░░  ultima publicada = v0.6.0 (2026-07-11)
```

| Pieza | Estado |
|---|---|
| W1 seguridad barata | en main (v0.6.1) |
| W2 procesos / TOCTOU / ticket SSE | en main (v0.6.2) |
| W3 contención docker | **andamiaje** en main, flag `ENJAMBRE_CLI_SANDBOX` **OFF** |
| Tool calling (T0-T4, T6) | en main (v0.7.0), gates `ENJAMBRE_TOOLS` / `VITE_TOOLS` OFF |
| T5 tools nativos Anthropic/Google | diferido, no bloquea (los free ya andan) |

**Bloqueante (owner):** ninguna Release desde v0.6.0 → **el auto-update nunca se ha validado
end-to-end**. Frontend con flags y sidecar PyInstaller ya están recongelados y verificados; falta
`cargo tauri build` firmado + tag `v0.7.0` + subir los **tres** artefactos (`.exe`, `.sig`,
`latest.json`) + comprobar la actualización desde v0.6.0.

**Owner además:** spike Docker (construir la imagen y verificar que `claude` arranca dentro con su
auth `~/.claude` ro) antes de poner `ENJAMBRE_CLI_SANDBOX` en ON por defecto; y un E2E real de tool
calling con BYOK antes de anunciar 0.7.0.

**Deuda P2 abierta (ULTRA):** LICENSE placeholder, `requirements` sin versiones fijadas, denylist de
comandos host evitable, "multi-modelo" sobre-vendido (el CLI está cableado a `claude`). Superficie
SDK sin cablear (`github.py`/`gitops.py`/`pull_request.py`/`sandbox.py`, `gates.py` inalcanzable
desde la API): **no anunciar como features**.

## Fase 0 — Limpieza conceptual

Objetivo: preparar repo seguro y entendible.

Entregables:

- README.md.
- LICENSE Apache-2.0.
- NOTICE.
- SECURITY.md.
- DISCLAIMER.md.
- PROVIDER_POLICY.md.
- LEGAL_RISK_REVIEW.md.
- CONTRIBUTING.md.
- CODE_OF_CONDUCT.md.
- `.env.example`.
- `.enjambreignore`.

---

## Fase 1 — MVP funcional local

Objetivo: demostrar valor sin riesgo alto.

Funcionalidades:

- Crear proyecto local.
- Registrar API keys.
- Validar API keys.
- Crear agentes.
- Enviar prompt a 2 o 3 proveedores.
- Mostrar respuestas paralelas.
- Guardar logs locales.
- Mostrar tokens/costo estimado.
- No modificar archivos todavía.

Criterio de éxito:

```txt
Usuario puede comparar respuestas de varios agentes sobre una tarea de código sin salir de la app.
```

---

## Fase 2 — Workspace seguro

Funcionalidades:

- Árbol de archivos.
- Selección de contexto.
- `.enjambreignore`.
- Secret scanner.
- Diff viewer.
- Aplicar cambios con aprobación.
- Crear branch temporal.

Criterio de éxito:

```txt
Usuario puede revisar un diff generado por agentes y aplicarlo manualmente.
```

---

## Fase 3 — Orquestación multiagente real

Funcionalidades:

- Task planner.
- Roles.
- Modo paralelo.
- Modo secuencial.
- Modo debate.
- Modo votación.
- Comparación por criterios.
- Checkpoints.

Criterio de éxito:

```txt
Agentes con roles diferentes producen outputs complementarios y el usuario puede elegir/aprobar.
```

---

## Fase 4 — GitHub y PRs

Funcionalidades:

- Conectar GitHub.
- Leer issues.
- Crear branch.
- Crear commit.
- Crear PR.
- Comentar resumen.
- Adjuntar logs.

Criterio de éxito:

```txt
ENJAMBRE puede convertir una tarea aprobada en un PR revisable.
```

---

## Fase 5 — Sandbox y ejecución

Funcionalidades:

- Docker sandbox.
- Ejecutar tests.
- Bloquear comandos peligrosos.
- Reportar resultados.
- Reintentos seguros.
- Logs auditables.

Criterio de éxito:

```txt
ENJAMBRE puede ejecutar tests sin poner en riesgo la máquina del usuario.
```

---

## Fase 6 — Ecosistema open source

Funcionalidades:

- Plugin SDK.
- Provider SDK.
- Templates de agentes.
- Templates de workflows.
- Ejemplos.
- Docs.
- Comunidad.
- Benchmarks.

Criterio de éxito:

```txt
Otros usuarios pueden crear proveedores, agentes y flujos sin tocar el core.
```
