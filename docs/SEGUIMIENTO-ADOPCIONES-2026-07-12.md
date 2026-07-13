# Seguimiento de adopciones — recursos externos (2026-07-12)

> Documento de SEGUIMIENTO. Deriva del analisis de recursos externos aplicables a
> ENJAMBRE (orquestador local-first de flota de agentes: Tauri 2 + React + sidecar
> Python; agente CLI en git worktrees; router por tiers; BYOK).
>
> **NO es una orden de implementacion.** Ver "Requiere aprobacion antes de ejecutar"
> al final. Aqui solo se documenta que es cada recurso, como encaja, los pasos, el
> criterio de aceptacion, el esfuerzo (S/M/L) y el gate (referencia = libre;
> codigo externo = pasa por gate de licencias/anexado).

## Convenciones

- **Esfuerzo**: S (< 1 dia), M (1-3 dias), L (> 3 dias o multi-fase).
- **Gate**:
  - `REFERENCIA` = solo se estudian ideas/datos, no se copia codigo -> libre.
  - `GATE-EXTERNO` = si se decidiera reusar codigo del repo, pasa por el gate de
    anexado (skill `anexar-externo`, catalogo `dev/REPO_EVAL_CATALOG.md`).
- Todo cambio destructivo o de codigo sigue la regla dura de ENJAMBRE: aprobacion
  humana + BYOK + respeto a terminos/rate-limits de cada proveedor
  (`PROVIDER_POLICY.md`).

---

## Item 1 — free-llm-api-resources: cerrar el gap de tool calling en free providers

**Que es.** `github.com/cheahjs/free-llm-api-resources` — lista mantenida de APIs
LLM con capa gratuita (proveedor, modelos, cuotas). **SIN licencia declarada** ->
se usa como DATOS/referencia, NO se copia codigo ni el contenido literal del repo.

**Por que aplica.** Gap conocido de ENJAMBRE: los 4 free providers actuales NO
soportan tool calling, asi que un agente free no puede ejecutar herramientas (leer/
escribir/ejecutar). Esto limita el valor del tier gratuito frente a los BYOK de
pago. La lista es la fuente para encontrar candidatos free CON tool calling.

**Encaje.** Alimenta el router por tiers y el registro de providers (`src/enjambre`
Provider SDK). Sin tocar la arquitectura: un nuevo provider free que soporte tools
entra por el mismo SDK extensible que ya existe.

**Candidatos a evaluar (prioridad por cuota).**
1. Cerebras — cuota alta, latencia baja; verificar soporte tool calling.
2. Groq — cuota alta; historicamente soporta tool calling en varios modelos.
3. Google AI Studio (Gemini free tier) — cuota generosa; function calling nativo.

**Pasos.**
1. Extraer de la lista (como datos) los providers free vigentes y su cuota.
2. Por cada candidato (Cerebras, Groq, Google AI Studio): leer la doc OFICIAL del
   proveedor y confirmar si el/los modelos free exponen tool/function calling
   (no fiarse de la lista: verificar en la fuente primaria del proveedor).
3. Marcar en una tabla: proveedor / modelo free / tool calling si-no / cuota /
   terminos que afecten a ENJAMBRE (rate limit, prohibiciones de uso).
4. Elegir 1 candidato ganador y prototipar un provider en el SDK (rama aparte,
   detras de flag), con BYOK del propio usuario para la key free.
5. Ejecutar un caso end-to-end: prompt -> el modelo free decide llamar una tool ->
   ENJAMBRE ejecuta la tool bajo gate humano -> el modelo consume el resultado.

**Criterio de aceptacion.** Un provider free ejecuta una **tool call real**: el
modelo emite una llamada a herramienta, ENJAMBRE la corre bajo aprobacion y el
modelo continua con el resultado, dentro de la cuota gratuita y respetando los
terminos del proveedor. Documentar cuota y limites en `PROVIDER_POLICY.md`.

**Esfuerzo.** M (verificacion + 1 provider prototipo). L si se cablean los 3.

**Gate.** REFERENCIA (la lista son datos; el codigo del provider se escribe nativo
contra la API oficial de cada proveedor, no se copia del repo sin licencia).

---

## Item 2 — CodexBar: portar un "lector de uso" de Codex/Claude a Windows

**Que es.** `github.com/steipete/CodexBar` — app de barra de menu macOS (Swift, MIT)
que muestra observabilidad de costo/uso de Codex y Claude. **No corre en Windows.**

**Por que aplica.** ENJAMBRE orquesta Codex/Claude entre otros; falta visibilidad
de consumo/cuota. CodexBar ya resolvio "de donde se leen los stats"; ese know-how
se estudia y se porta un lector propio a Windows dentro del sidecar/HUD de ENJAMBRE.

**Encaje.** Nuevo "lector de uso" en el sidecar (endpoint read-only) + panel en el
HUD (junto a "Actividad por modelo"). No cambia la orquestacion; es telemetria.

**Pasos.**
1. Estudiar en CodexBar COMO obtiene los stats: que archivos de config local de
   Codex/Claude lee, que endpoints de cuota/uso consulta, formato de los datos.
2. Documentar las fuentes (rutas de config, endpoints) y su equivalente en Windows
   (rutas `%APPDATA%`/`%USERPROFILE%`, mismos endpoints si son de red).
3. Diseñar un lector nativo en Python (read-only, sin escribir nada) que lea esas
   fuentes en Windows y normalice: proveedor / uso / costo / cuota restante.
4. Exponerlo como endpoint del sidecar y un panel en el HUD.

**Criterio de aceptacion.** El HUD de ENJAMBRE muestra, en Windows, uso/costo de
al menos un proveedor (Codex o Claude) leido de la config/endpoint reales, sin
escribir en la maquina del usuario y sin exponer secretos.

**Esfuerzo.** M (estudio de fuentes + lector + panel minimo).

**Gate.** CodexBar es MIT: estudiar el patron es REFERENCIA. Si se reusara codigo
Swift/porte literal -> `GATE-EXTERNO` (anexado + registro de licencia MIT). El
puerto Python nativo es codigo propio.

---

## Item 3 — Orca: robar patrones de UX (vara de medir, no reemplazo)

**Que es.** `github.com/stablyai/orca` — MIT, ~17k stars. Orquestador de agentes con
fan-out a worktrees, comparacion de N salidas lado a lado, merge selectivo y
companion movil.

**Por que aplica.** Es la vara de medir del espacio. ENJAMBRE ya tiene fan-out a
worktrees; Orca pule la UX de comparar y fusionar. **NO se reemplaza ENJAMBRE**:
perderiamos local-first + router por tiers. Se roban patrones de UX.

**Patrones a estudiar (UX, no codigo).**
- Comparacion de N salidas lado a lado (diff/columnas por agente).
- Merge selectivo (elegir hunks/archivos de una salida u otra).
- Companion movil (si aplica a la vision de ENJAMBRE; probablemente fuera de scope).

**Pasos.**
1. Recorrer Orca (demo/README/capturas) y catalogar los patrones de UX de comparar
   y fusionar salidas.
2. Mapear cada patron contra lo que ENJAMBRE ya tiene (Actividad por modelo,
   ChangeSet.apply bajo aprobacion) y marcar el gap de UX real.
3. Proponer (en un doc de diseño aparte, con las herramientas de UI del ecosistema,
   nunca SVG a mano) los 2-3 patrones de mayor valor para el HUD.

**Criterio de aceptacion.** Un doc de diseño con 2-3 patrones de UX priorizados,
cada uno justificado contra un gap real de ENJAMBRE y compatible con local-first +
tiers. (Este item entrega DISEÑO, no codigo.)

**Esfuerzo.** S (estudio + doc de patrones). La implementacion posterior es aparte.

**Gate.** REFERENCIA (solo UX/ideas). Orca es MIT: si algun dia se reusara codigo,
`GATE-EXTERNO`.

---

## Item 4 — "Multica": investigar el repo real (competidor/insumo)

**Que es.** Nota pendiente: plataforma de gestion de coding agents. Falta ubicar el
repo/producto REAL ("Multica") y clasificarlo como competidor y/o insumo.

**Pasos.**
1. Localizar el repo/producto real (nombre exacto, org, licencia, estado).
2. Clasificar: competidor directo, insumo de patrones, o irrelevante.
3. Si aporta, abrir item propio en un seguimiento futuro con su gate.

**Criterio de aceptacion.** Nota cerrada con: identidad real del proyecto, licencia,
y veredicto (competidor / insumo / descartar) con 1 linea de razon.

**Esfuerzo.** S (investigacion).

**Gate.** REFERENCIA (investigacion). Reuso eventual -> `GATE-EXTERNO`.

---

## Orden recomendado

1. **Item 1 (free tool calling)** — mayor impacto: desbloquea el tier gratuito.
   Empezar por la VERIFICACION (Cerebras/Groq/Google AI Studio) antes de codear.
2. **Item 4 (Multica)** — barato; cierra una incognita competitiva y puede reordenar
   prioridades.
3. **Item 3 (Orca UX)** — barato; entrega diseño que guia el HUD.
4. **Item 2 (CodexBar / lector de uso)** — mas trabajo; hacerlo cuando el HUD ya
   tenga foco (encaja junto a "Actividad por modelo").

## Requiere aprobacion antes de ejecutar

Este documento NO autoriza implementar nada. Cada item se ejecuta solo tras
aprobacion explicita, en rama aparte y detras de flag cuando toque codigo. Los
items marcados `GATE-EXTERNO` que impliquen reuso de codigo de terceros pasan
primero por el gate de anexado (skill `anexar-externo` + catalogo
`dev/REPO_EVAL_CATALOG.md`). Se respetan BYOK, `PROVIDER_POLICY.md` y el gate de
aprobacion humana en toda accion destructiva.
