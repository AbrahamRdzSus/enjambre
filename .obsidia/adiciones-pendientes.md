# Adiciones pendientes (sembradas por analisis-externo)
# estados: pendiente (el hook avisa) / aceptada / descartada (auditoria)

- pendiente | 2026-08-08 | oh-my-cli (qwen-code-dev-bot): patrones folder-trust, tools fail-closed, sesiones JSONL durables | -> solo-idea | seguridad: LIMPIO (bloquea RCE en su policy) | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-08 | Ponytail (DietrichGebert, MIT): regla anti-over-engineering del agente | -> solo-idea | seguridad: LIMPIO | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-08 | Headroom (chopratejas/headroom, Apache): compresion de contexto | -> usar SOLO con beacon apagado | seguridad: HALLAZGO beacon.py 'anonymous upload ON by default, opt-out, FAILS-OPEN' contradice 'local-first' de PyPI; mitigar con HEADROOM_BEACON=off + DO_NOT_TRACK=1 o DESCARTAR. Decision del owner | ref:REPO_EVAL_CATALOG
- pendiente | 2026-08-08 | DeepEval (Apache-2.0, 15.7k): framework de EVALS de agentes (Python/pytest, metricas sobre trazas, CI). Rastreado como candidato para el hueco de evals | -> usar/evaluar (encaja con tooling Python) | seguridad: gate pendiente | ref:REPO_EVAL_CATALOG
