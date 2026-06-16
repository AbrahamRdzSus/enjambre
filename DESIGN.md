# DESIGN.md

> Sistema de diseno del proyecto. Un agente debe poder generar UI consistente
> leyendo SOLO este archivo. Manten valores concretos, no parrafos.

## Principios
- ...

## Color
| Rol | Token | Valor |
|---|---|---|
| Fondo | `--bg` | #0b0b0f |
| Texto | `--fg` | #f5f5f7 |
| Acento | `--accent` | #6d5efc |

## Tipografia
| Rol | Familia | Peso |
|---|---|---|
| Titulos | ... | 600 |
| Cuerpo | ... | 400 |

## Espaciado
Escala base 4px: 4 / 8 / 12 / 16 / 24 / 32 / 48.

## Radios y sombras
- Radio: 8px (sm), 12px (md), 16px (lg)
- Sombra: 0 1px 2px rgba(0,0,0,.2)

## Componentes
- Boton, Card, Input: describir variantes y estados (hover/focus/disabled).

## Reglas
- Mobile-first y responsive.
- Respetar accesibilidad (contraste AA, foco visible).
