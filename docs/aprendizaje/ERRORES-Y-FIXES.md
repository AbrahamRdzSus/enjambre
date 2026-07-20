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
