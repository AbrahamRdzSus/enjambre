# Roadmap técnico y de producto — ENJAMBRE

> Plan de fixes de seguridad/robustez (auditoria ULTRA 2026-07-12): ver `docs/PLAN-FIXES-2026-07-12.md`.

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
