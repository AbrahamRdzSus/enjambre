# Auditoria ULTRA — Enjambre — 2026-07-12

Doble auditor independiente (agente Claude very-thorough + Codex CLI reasoning-high, solo lectura)
+ verificacion manual de los criticos. Enjambre (rama `feat/v0.6.1-robustez`): orquestador de
agentes de IA (swarm) de escritorio. Core Python en `src/enjambre/` (sidecar FastAPI en
`127.0.0.1`), frontend Tauri. Corre agentes API (adapters HTTP BYOK) y un agente CLI (`claude`
headless en un git worktree). BYOK = claves de proveedores del usuario.

**Veredicto: Enjambre es el mas SANO de las apps sensibles de esta tanda. Ambos auditores coinciden
en que NO hay P0: el sidecar SI tiene autenticacion por token (+ guard anti DNS-rebinding + rate
limit), la CSP del webview esta presente y estricta (el hallazgo previo "webview sin CSP" ya esta
CORREGIDO), no hay `shell=True` ni inyeccion de comandos, la BYOK no se persiste ni se devuelve, y
el bug de 0-tokens esta CORREGIDO para los candidatos.** Los hallazgos vivos son P1/P2 con un modelo
de amenaza acotado: **proceso local del mismo usuario** (el token vive en `%APPDATA%`, legible por
procesos del mismo usuario) o un prompt/modelo malicioso dentro del agente CLI. El token SI protege
frente a paginas web y otros usuarios del sistema.

**Nota del doble auditor:** aqui Codex aporto MAS que el agente Claude (varias primitivas de lectura
fuera del root), al reves que en otros repos. Ambos hallazgos unicos de Codex que verifique
(`workspace.py:82` traversal, `cli_agent.py:153` returncode) resultaron REALES.

---

## 1. P1 — Hallazgos (modelo de amenaza: proceso local del mismo usuario / prompt malicioso)

| # | Hallazgo | Evidencia | Auditor |
|---|---|---|---|
| P1-1 | **"Worktree aislado" sobre-promete; el agente CLI NO esta sandboxeado.** El worktree solo aisla las ESCRITURAS al repo destino. El proceso `claude` lanzado (`cli_agent.py:123`, `create_subprocess_exec`, sin shell) corre con el usuario real, red y entorno completos: puede **LEER cualquier ruta (incluido `.env` con las claves BYOK), exfiltrar por red, y tocar el sistema fuera del worktree**. El gate humano solo cubre APLICAR el diff, no lo que el agente hace mientras corre. Un prompt/modelo malicioso roba las claves aunque el diff nunca se apruebe | `cli_agent.py:89-154` | ambos |
| P1-2 | **Traversal de lectura en `/workspace/context`** (VERIFICADO): `build_context` hace `root / rel_norm` sin `resolve()+is_relative_to`, asi que `../../archivo` o una ruta absoluta lee fuera del root. Mitigado (no cerrado) por `is_blocked_file` + `redact_secrets`, pero un archivo no bloqueado se lee | `workspace.py:82` | Codex |
| P1-3 | **`/changes/preview` lee el archivo ANTES de validar traversal:** exfiltra un archivo externo via un diff sin necesidad de aplicar cambios | `changes.py:27`, `api.py:562` | Codex |
| P1-4 | **La aprobacion re-lee el worktree vivo (TOCTOU), no el diff revisado:** un proceso hijo persistente puede cambiar archivos entre el preview y el approve; borrados/binarios/permisos/symlinks no se reproducen fielmente | `api.py:638` | Codex |
| P1-5 | **`ok=True` sin comprobar `proc.returncode`** (VERIFICADO): `claude` puede terminar en error y la API igual devuelve exito si git puede calcular el diff. Fallo silencioso, justo lo que la rama "robustez" deberia cerrar | `cli_agent.py:153` | Codex |
| P1-6 | **El timeout mata solo el proceso padre, no el arbol:** un agente/comando malicioso deja hijos vivos fuera de la limpieza | `cli_agent.py:130` | Codex |
| P1-7 | **La sesion guarda el prompt ORIGINAL en claro** (el enviado al proveedor se redacta, la sesion no): una API key pegada por error en el prompt se persiste en claro, y `save` esta activo por defecto | `orchestrator.py:83`, `sessions.py:72`, `RunPage.tsx:80` | Codex |
| P1-8 | **`confirm`/`approved` es un booleano del cliente** y el paquete no configura roots permitidos: quien tenga el token registra cualquier root y pide escritura/ejecucion CLI. `SECURITY.md:60` afirma que el token protege contra malware local = FALSO para procesos del mismo usuario | `api.py:171,192,638` | ambos |
| P1-9 | **Politica de comandos del sandbox host es denylist bypassable:** regex sobre la linea de comando, trivial de evadir (`python -c "..."`, `bash -c '...'`, `git config core.hooksPath`). Solo `docker --network none` es sandbox real; el modo host (aunque exige `approved`) no lo es | `commands.py:15-46` | Claude |

## 2. P2 (correctitud / robustez)

- **Costo del arquitecto no se contabiliza** (mismo tipo de bug que el de 0-tokens, sin cerrar): los
  `verdicts` del arquitecto en modos vote/debate consumen tokens que NO se reportan
  (`multiagent.py:90-92`). La UI muestra costo incompleto en esos modos. Ambos.
- **`/run` solo expone los candidatos de la ultima ronda** en debate: los tokens por tarjeta no
  representan todo lo consumido (aunque sesiones/stats si agregan bien) (`api.py:118`). Codex.
- **`MultiAgentReport` no tiene `prompt`** -> sesiones sequential/debate/vote guardan prompt vacio
  (`sessions.py:66`); y al reconstruir, `usage` queda como `dict` no `Usage`, rompiendo consumidores
  que esperan `c.usage.input_tokens` (`sessions.py:123`). Codex.
- **Falso exito con texto vacio:** una respuesta HTTP 200 sin `choices`/contenido nulo se convierte
  en texto vacio y se marca exitosa (`openai_compat.py:70`). Codex.
- **Fallos silenciosos de estado:** JSON corrupto -> listas vacias sin aviso; eventos de
  suscriptores lentos se descartan sin metrica (`projects.py:37`, `logs.py:54`); un solo `/health`
  OK -> "Todos los sistemas" aunque un proceso ajeno ocupe el puerto 8000 (`AppShell.tsx:34`). Codex.
- **Comparacion de token no es de tiempo constante** (`api.py:324` `!=` en vez de
  `secrets.compare_digest`); **token en query param** (`?token=`) para SSE puede filtrarse a logs.
  Riesgo bajo (loopback) pero trivial de endurecer. Claude+Codex.
- **Multi-modelo sobre-vendido:** el agente CLI esta hardcodeado a `claude`
  (`CLAUDE.md`/`docs/CLI_AGENT.md` mencionan Codex/Gemini/Jules); el resto de "multi-modelo" son
  llamadas de texto a APIs, no varios coding CLIs. Codex.
- **`LICENSE` Apache-2.0 es un placeholder** (no trae el texto completo); `requirements.txt` sin
  versiones y aun incluye `rich` (el changelog dice haberla quitado). Debilita reproducibilidad y
  auditoria de licencias. Falta SBOM/THIRD_PARTY_NOTICES. Codex.

## 3. Aspectos SANOS confirmados (no tocar)

- **Auth del sidecar presente:** middleware exige token en todo salvo `/health`/preflight
  (`api.py:315-327`); token `secrets.token_urlsafe(32)` persistido 0600; **guard anti
  DNS-rebinding** + **rate limit token-bucket** default-on.
- **CSP estricta** (`tauri.conf.json:21`): `script-src 'self'`, `object-src 'none'`,
  `frame-ancestors 'none'`, `connect-src` a loopback. **El hallazgo previo "webview sin CSP" esta
  CORREGIDO.**
- **Sin `shell=True` ni `os.system`** en codigo propio; todo subprocess con listas de args; el
  prompt del CLI va como argv (`claude -p prompt`), sin inyeccion de comandos.
- **`base_url` NO manipulable por request** (fijado por subclase de provider): sin SSRF ni desvio de
  clave por API. `/keys` y `/providers` nunca devuelven la clave (solo `key_present: bool`).
- **BYOK en env/memoria, nunca persistida ni en el bus de eventos**; sin secretos hardcodeados; sin
  telemetria activa.
- **`ChangeSet.apply`** valida path-traversal (`resolve()` + `is_relative_to`), escanea secretos y
  exige `approved=True` antes de escribir. **Sandbox** default `dry`; ejecucion real exige
  `approved`; `docker --network none`; si no hay docker BLOQUEA (no cae a host).
- **Bug 0-tokens CORREGIDO** para candidatos (`multiagent.py:52-64`, `api.py:121-143`).
- **Licencias limpias:** proyecto Apache-2.0; deps (streamlit, pydantic, httpx, rich) permisivas.

## 4. Prioridad de correccion (pendiente de aprobacion; NO ejecutada)

```
  P1-A  sandboxear el agente CLI (contener/limitar red+FS del proceso claude) o
        documentar CLARO que corre con acceso total del usuario y puede leer las
        claves BYOK -> ajustar SECURITY.md (el token NO protege de malware
        del mismo usuario) y los claims de "worktree aislado"                     (S1)
  P1-B  cerrar los traversal de lectura: resolve()+is_relative_to en
        workspace.build_context y validar traversal ANTES de leer en changes/preview (S2)
  P1-C  comprobar proc.returncode en el agente CLI (no ok=True en error); matar el
        arbol de procesos en timeout                                              (S3)
  P1-D  aplicar el diff REVISADO en la aprobacion (no re-leer el worktree vivo);
        no guardar el prompt original en claro en la sesion                        (S4)
  ----  luego P2: contabilizar el costo del arquitecto; secrets.compare_digest;
        no marcar exito con texto vacio; LICENSE completo + versiones + SBOM;
        ajustar el claim multi-modelo (CLI = solo claude hoy)
```

**Contencion:** el modelo de amenaza es LOCAL (mismo usuario) o prompt malicioso en el CLI; no hay
brecha remota. El eje es que ejecutar un agente = ejecutar codigo con los privilegios del usuario,
y el producto no debe presentarlo como "aislado". Es el mas maduro en hardening de las apps
sensibles (auth + CSP + no-shell + BYOK-no-persistida ya hechos). Arbol git limpio, sin trabajo
ajeno.
