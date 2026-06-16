# HANDOFF — enjambre

> Memoria viva del repo. El repositorio (este archivo + git + `docs/gates/`) es la
> unica fuente de verdad entre sesiones y entre agentes. No dependas de contexto
> que viva fuera del repo. Manten este archivo PODADO: indice, no historia completa.

## Estado actual
- Rama / version:
- Que funciona hoy:
- Que esta a medias:

## Siguiente paso
1.
2.

## Decisiones congeladas
<!-- Decisiones que NO se vuelven a discutir sin una razon nueva. Linkea el commit/gate. -->
-

## Riesgos / bloqueos abiertos
-

## Gates de aceptacion (docs/gates/)
Antes de ejecutar un cambio grande, escribe el criterio de aceptacion en
`docs/gates/<slice>.md` y CONGELALO (no lo edites para que pase el trabajo a
posteriori). Un gate define: que entra, que NO entra, y como se verifica
(comando, prueba, o evidencia observable). El que ejecuta cumple el gate; un
pase de revision SEPARADO juzga el diff contra la intencion, no solo "pasan los
tests".

## Protocolo de trabajo (resumen)
1. SCOUT: reconocimiento barato del area antes de planear (no plantillas fijas).
2. GATE: congela criterios en `docs/gates/`.
3. EJECUTA: cambios del tamano de un PR; aislar trabajo paralelo (worktrees) si aplica.
4. REVISA: pase separado que lee el diff contra la intencion + corre los gates.
5. ACTUALIZA este HANDOFF y poda lo viejo.

_Ultima actualizacion: 2026-06-16_
