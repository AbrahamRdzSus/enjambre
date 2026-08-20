# Errores y fixes - ENJAMBRE

Errores reales, con sintoma, causa y fix. Human-first: no asume IA.

---

## 1. El rebase que iba a REVERTIR W2 y W3

**Sintoma.** La rama `feat/tool-calling` (tool calling, T0-T4+T6) llevaba dias sin mergear. Al
mirarla contra `main`, el diff decia **`93 archivos, +4013 / -1678`**. Mergearla habria borrado
1678 lineas que nadie en esa rama habia tocado. Y al intentar `git rebase origin/main`, git
empezaba a replayar **20 commits** y reventaba en conflictos sin sentido en `client.ts`,
`OverviewPage.tsx`, `RunPage.tsx`: archivos que la feature no toca.

**Causa.** La rama salio de `128d22d`, que era la punta de `feat/v0.6.1-robustez` **antes** de que
esa rama se mergeara a main **con squash** (`6b4a1ad`).

El squash reescribe la identidad de los commits. Los 14 commits originales de v0.6.1 existen en la
rama hija, pero en `main` no existen como tales: existe **uno solo** que contiene su suma. Git no
tiene forma de saber que son "lo mismo", asi que al rebasar intenta aplicarlos otra vez encima de
un main que ya los contiene -> conflicto en cada uno.

Y peor: como la rama nacio antes de W2 (robustez del agente CLI) y W3 (contencion docker), un merge
directo habria propuesto **quitar** esas 1678 lineas. De ahi el numero.

**Fix.** Rebasar SOLO los commits propios de la rama, usando la base vieja como corte:

```
git rebase --onto origin/main 128d22d feat/tool-calling
```

Se replayan los 6 commits de tool calling y nada mas. Resultado: **cero conflictos** y el diff pasa
a `+1361 / -14`, aditivo puro.

**Verificacion observable.** Despues del rebase, comprobar que el trabajo posterior SIGUE ahi (no
basta con que compile):

```
ls docker/cli-agent.Dockerfile docs/adr/0001-contencion-agente-cli.md
grep -c "_kill_tree\|_claude_argv\|_egress_flags" src/enjambre/cli_agent.py   # W2/W3
grep -c "sse-ticket" src/enjambre/api.py                                      # W2.3
```

Luego `pytest -q` (262 passed), `ruff check . --no-cache`, `npm run build`.

**Leccion.** La senal de alarma es el **signo del diff**: si `git diff --stat main...rama` muestra
muchas lineas BORRADAS en archivos que la rama nunca toco, la base esta mal, no el codigo. Antes de
rebasar una rama vieja, mirar `git log --oneline main..rama` y localizar donde acaba el trabajo
PROPIO y empieza el del padre ya mergeado; ese commit es el argumento de `--onto`.

---

## 2. Ruff falla sin que el lint falle

**Sintoma.** `ruff check .` devuelve error, pero el mensaje no habla de ninguna regla:
`Failed to rename temporary cache file ... (os error 32)`.

**Causa.** Otro proceso tenia tomado `.ruff_cache`. Es un fallo de bloqueo de archivo en Windows,
no una violacion de lint.

**Fix.** `ruff check . --no-cache`. Salio `All checks passed!`.

**Leccion.** Leer el mensaje antes de "arreglar" codigo: un exit code distinto de cero no siempre
significa que tu codigo este mal. Aqui la herramienta fallo por el entorno, no por el repo.

---

# Errores y fixes — el gate de deps era rojo por el LOCKFILE, no por las dependencias (2026-08-20)

**Sintoma:** los jobs `deps audit (frontend)` y `deps audit (landing)` en rojo desde el 2026-08-08, y
eran **los unicos rojos del repo**: `ruff`, los 3 `pytest`, `tauri`, `deps audit (python)` y los dos
`web` estaban verdes.

```
frontend  7 high: brace-expansion, fast-uri, js-yaml, nanoid, postcss,
                  react-router, react-router-dom
landing   2 high: nanoid, postcss
```

**Diagnostico inicial equivocado, y conviene dejarlo escrito.** Se catalogo como el arreglo mas caro
de la tanda y se dejo para el final por eso: `react-router` 7.12-7.18.1 (CSRF en modo RSC) parecia
obligar a subir `react-router-dom`, lo que podia tumbar el job `web (frontend)` que **hoy pasa**. Se
temia ademas tener que tocar dos arboles con CVEs distintos.

**Causa real:** las versiones parcheadas **ya cabian en los rangos declarados** en los
`package.json`. Lo que estaba viejo era el **lockfile**, no las dependencias elegidas.

**Fix (`d9262ba`):** `npm update` en los dos directorios. Cero cambios en `package.json`, cero saltos
de major, cero riesgo para el build. Es la misma forma que tenia Azuras ese mismo dia.

**Verificacion observable**, corriendo los comandos EXACTOS del job `web` en los dos directorios:

```
npm audit --audit-level=high  -> found 0 vulnerabilities   (frontend y landing)
npm ci                        -> exit 0                    (frontend y landing)
npm run lint (solo frontend)  -> exit 0
npm run build                 -> exit 0, dist generado      (frontend y landing)
```

**Deuda anotada, no resuelta aqui:** el gate sigue siendo `npm audit --audit-level=high`, que **no
sabe baselinear** y por tanto se re-rompe solo con cada advisory nuevo, sin que nadie toque el
codigo. La salida facil ante eso es `|| true`, que es exactamente como **obsidia-class** acabo
escaneando y saliendo verde SIEMPRE: cobertura falsa. Se cambiara por el gate con allowlist por GHSA
(motivo + fecha de revision, patron de `silix/web/scripts/audit-gate.mjs`) cuando ese patron se lleve
al molde, para no crear una tercera variante.

**Leccion:** antes de asumir que una vulnerabilidad exige subir un major, prueba **`npm update`**:
distingue "dependencia mal elegida" de "lockfile viejo", que son problemas distintos con coste muy
distinto. Ver `la-cola-de-un-informe-no-es-el-informe` (familia: mirar el informe entero antes de
dimensionar el trabajo).
