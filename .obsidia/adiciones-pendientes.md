# Adiciones pendientes (sembradas por analisis-externo)
# estados: pendiente (el hook avisa) / aceptada / descartada (auditoria)

- pendiente | 2026-08-08 | oh-my-cli (qwen-code-dev-bot): patrones folder-trust, tools fail-closed, sesiones JSONL durables | -> solo-idea | seguridad: LIMPIO (bloquea RCE en su policy) | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-08 | Ponytail (DietrichGebert, MIT): regla anti-over-engineering del agente | -> solo-idea | seguridad: LIMPIO | ref:REPO_EVAL_CATALOG
- descartada | 2026-08-08 | Headroom (chopratejas/headroom): beacon de subida ON-por-defecto fails-open contradice 'local-first' -> DESCARTADO (privacidad). Reconsiderar solo con beacon off si hiciera falta compresion | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-08 | DeepEval (Apache-2.0, 15.7k): framework de EVALS de agentes (Python/pytest, metricas sobre trazas, CI). Rastreado como candidato para el hueco de evals | -> usar/evaluar (encaja con tooling Python) | seguridad: gate pendiente | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-19 | CI rojo desde 08-08 (3 corridas) + react-router 2 High (GHSA-qwww-vcr4-c8h2) fix disponible sin aplicar + Release desde v0.6.0 sigue sin cortar (owner) | -> apagar CI + bump + release | seguridad: CSRF con fix | ref:ANALISIS-OBSIDIA-2026-08-19 N4/N5

# 2026-09-07: lote Downloads/Analisar (doble motor Claude + Codex). Entregable: dev/externos/lote-analisar-2026-09-07/ENTREGABLE-2026-09-07.md. MODO: INTEGRAR / BASE FORMAL / DESDE 0.
- pendiente | 2026-09-07 | huangruiteng/loopx (Apache-2.0 desde v0.4.8, 5.7k*): control plane de loops largos (objetivos, gates, EVIDENCIA, handoffs, reanudacion). Extraer el patron de evidencia+handoff; NO sustituir los loops propios. Gate: interrupcion real y reanudacion sin perder prohibiciones. BASE FORMAL · S | -> estudiar | ref:REPO_EVAL_CATALOG#lote-analisis-externo-2026-09-07
- pendiente | 2026-09-07 | xyflow/xyflow React Flow (MIT): mapa navegable de agentes/tareas/fuentes en el frontend React; agrupar/filtrar antes de cientos de nodos. INTEGRAR · S | -> cuando se toque el canvas | ref:REPO_EVAL_CATALOG#lote-analisis-externo-2026-09-07
- referencia | 2026-09-07 | Claude Managed Agents (video V05; pricing oficial 0.08 USD/h activa + tokens aparte): evaluar contra docs (skill claude-api) para trabajo 24/7 fuera de SERVER288. Harness-of-Harness (MIT, 89*) y AREX-Skill (Apache, SIN sandbox) solo como ideas de ciclos plan -> dev -> QA independiente | ref:REPO_EVAL_CATALOG#lote-analisis-externo-2026-09-07
