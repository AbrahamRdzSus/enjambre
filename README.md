# ENJAMBRE

> Tu equipo de IAs trabajando en paralelo.

ENJAMBRE es una aplicación local-first para coordinar múltiples agentes de IA en tareas de desarrollo de software. El usuario conecta sus propias API keys, registra agentes, abre proyectos locales o repositorios GitHub, lanza tareas en paralelo, revisa salidas por agente, compara resultados y aplica cambios con control humano.

ENJAMBRE no es un modelo de IA, no entrena modelos y no vende acceso a modelos de terceros. Es una capa de orquestación, UI y flujo de trabajo.

## Estado

Proyecto experimental / beta.

## Objetivos

- Coordinar varios agentes de IA en paralelo.
- Mantener proyectos y API keys bajo control del usuario.
- Permitir comparar respuestas por modelo/agente.
- Mostrar logs, consumo de tokens y costo estimado.
- Integrar proyectos locales y repositorios GitHub.
- Evitar lock-in de proveedor mediante adaptadores.
- Mantener una base open source fácil de auditar.

## Qué NO es

- No es un modelo fundacional.
- No es un servicio para distilar modelos.
- No entrena modelos usando outputs de proveedores.
- No revende outputs de OpenAI, Anthropic, Google, xAI u otros.
- No incluye API keys.
- No intenta saltarse límites, rate limits, filtros o medidas de seguridad de proveedores.
- No usa marcas de terceros como si fueran propias.

## Arquitectura resumida

```txt
ENJAMBRE
├── UI Dashboard
│   ├── Inicio
│   ├── Proyectos
│   ├── Chats paralelos
│   ├── Agentes
│   ├── API Keys
│   ├── Logs
│   └── Estadísticas
├── Core Orchestrator
│   ├── Task planner
│   ├── Agent router
│   ├── Parallel runner
│   ├── Result comparator
│   └── Human approval gate
├── Providers
│   ├── OpenAI adapter
│   ├── Anthropic adapter
│   ├── Google Gemini adapter
│   ├── xAI adapter
│   └── Custom OpenAI-compatible adapter
├── Project Workspace
│   ├── File tree
│   ├── Git integration
│   ├── Diff viewer
│   ├── Patch staging
│   └── Optional sandbox
└── Compliance Layer
    ├── BYOK only
    ├── No training/distillation mode
    ├── Provider terms warnings
    ├── Local secrets storage
    └── Audit logs
```

## Principio de seguridad

Todas las acciones destructivas deben pasar por confirmación humana:

- Escribir archivos.
- Borrar archivos.
- Ejecutar comandos.
- Crear commits.
- Crear pull requests.
- Subir cambios a repositorios.
- Instalar dependencias.
- Modificar configuración sensible.

## Modelo de agentes

Ejemplo inicial:

| Agente | Modelo sugerido | Función |
|---|---|---|
| Arquitecto | Claude / Gemini / OpenAI | Divide tareas, diseña arquitectura y revisa consistencia |
| Backend Dev | OpenAI / Grok / Claude | Implementa servicios, endpoints y lógica |
| Frontend Dev | Gemini / Claude / OpenAI | Implementa componentes y estados UI |
| QA & Debug | OpenAI / Claude | Genera tests, detecta errores y revisa diffs |
| Doc Writer | Cualquier proveedor | Documenta cambios y genera guías |

Los modelos son configurables. El proyecto debe evitar hardcodear dependencias exclusivas de un proveedor.

## Instalación propuesta

```bash
git clone https://github.com/obsidia-studio/enjambre-ia-coder.git
cd enjambre-ia-coder

python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

pip install -r requirements.txt
cp .env.example .env
streamlit run app.py
```

## Variables de entorno

```env
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
XAI_API_KEY=
GITHUB_TOKEN=
ENJAMBRE_LOCAL_ONLY=true
ENJAMBRE_DISABLE_TRAINING_EXPORTS=true
```

## Reglas legales básicas

Lee `LEGAL_RISK_REVIEW.md` y `PROVIDER_POLICY.md` antes de publicar, empaquetar o monetizar este proyecto.

Resumen corto:

1. El usuario usa sus propias API keys.
2. ENJAMBRE no incluye, comparte ni revende API keys.
3. ENJAMBRE no usa outputs para entrenar, ajustar, mejorar o distilar modelos competidores.
4. ENJAMBRE debe respetar rate limits, filtros, términos y políticas de cada proveedor.
5. Las marcas OpenAI, Claude, Gemini, Grok, xAI, Google, Anthropic, GitHub y otras pertenecen a sus respectivos titulares.
6. Los outputs pueden ser inexactos. El usuario debe revisarlos antes de aplicarlos.
7. El proyecto se distribuye sin garantía.

## Licencia recomendada

Recomendación inicial: **Apache-2.0**.

Motivo: es permisiva como MIT, pero incluye lenguaje explícito de patente. Para un proyecto open source que puede recibir contribuciones y conectarse a múltiples proveedores, Apache-2.0 suele ser una opción más segura que MIT.

## Descargo

Este repositorio no ofrece asesoría legal. Antes de uso comercial, publicación en marketplaces, distribución empaquetada o integración empresarial, consulta a un abogado especializado en software, datos e IA.
