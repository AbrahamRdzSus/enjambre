# REPO.md

> Meta-ficha del repositorio: que es, a quien sirve y su lugar en el ecosistema.
> Complementa README.md (como usar) y CLAUDE.md (instrucciones a agentes).

- **Nombre**: enjambre
- **Audiencia**: ambos (open-source Apache-2.0; uso interno Obsidia Studio)
- **Tipo**: herramienta
- **Estado**: wip (MVP simulado; orquestacion real pendiente)
- **Stack**: Python + Streamlit (GUI) + PowerShell (hub Windows)
- **Despliegue**: local-first (corre en la maquina del usuario; BYOK)

## Para que sirve
Orquestador local-first de agentes IA de codificacion (Grok/Claude/Codex/Gemini/
Jules en paralelo): dashboard, comparacion de salidas lado-a-lado y gate de
aprobacion humana. Capa de orquestacion/UI; NO entrena ni revende modelos.

## Relaciones
- Depende de: proveedores externos via API (BYOK), ecosistema Obsidia (essentials).
- Usado por: desarrolladores que quieren comparar/orquestar varios modelos.
- Relacionado: Obsidia Eye (rama Studio); solapa conceptualmente con Obsidia Hub
  y oh-my-claudecode. Blueprint de arquitectura: docs/ARCHITECT_LOOP_BLUEPRINT.md.

## Notas
- Obsidia Studio. Apache-2.0, open-source (BYOK = el usuario trae sus claves).
- PENDIENTE seguridad: rotar 2 claves filtradas en versiones viejas (OpenAI/Gemini).
- Lo primero que debe saber alguien nuevo: el MVP actual es SIMULADO; el siguiente
  trabajo real es el loop arquitecto/builder (ver blueprint + ROADMAP Fase 3).
