export type AgentStatus = 'pensando' | 'ejecutando' | 'en-curso' | 'en-espera'

export const STATUS_LABEL: Record<AgentStatus, string> = {
  pensando: 'Pensando',
  ejecutando: 'Ejecutando',
  'en-curso': 'En curso',
  'en-espera': 'En espera',
}

export const STATUS_COLOR: Record<AgentStatus, string> = {
  pensando: 'var(--primary)',
  ejecutando: 'var(--success)',
  'en-curso': 'var(--primary)',
  'en-espera': 'var(--accent)',
}

export const apiKeys = [
  { name: 'Grok', status: 'Activa', tone: 'success' as const },
  { name: 'Claude', status: 'Activa', tone: 'success' as const },
  { name: 'Codex', status: 'Activa', tone: 'success' as const },
  { name: 'Gemini', status: 'Activa', tone: 'success' as const },
  { name: 'Jules', status: 'Válida', tone: 'accent' as const },
]

export const registeredAgents = [
  { name: 'Arquitecto', model: 'Claude 3.5 Sonnet', on: true },
  { name: 'Backend Dev', model: 'Grok 3', on: true },
  { name: 'Frontend Dev', model: 'Gemini 1.5 Pro', on: true },
  { name: 'QA & Debug', model: 'Codex GPT-4o', on: true },
  { name: 'Doc Writer', model: 'Jules', on: true },
]

export const metrics = [
  { label: 'AGENTES ACTIVOS', value: '4 / 5', extra: '80%', kind: 'progress', pct: 80 },
  { label: 'TAREAS EN PROGRESO', value: '12', extra: '↑ 3 nuevas', kind: 'up' },
  { label: 'PROYECTOS ACTIVOS', value: '3', extra: 'De 10', kind: 'muted' },
  { label: 'TOKENS USADOS', value: '2.45M', extra: '$ 1.82 USD', kind: 'chart' },
  { label: 'COSTO HOY', value: '$ 1.82 USD', extra: '↓ 8% vs ayer', kind: 'down' },
  { label: 'TASA DE ÉXITO', value: '96.4%', extra: '↑ 4.2%', kind: 'ring', pct: 96 },
]

export const tokenUsage = [
  { name: 'Grok 3', value: '1.02M', pct: 41.8, color: 'var(--primary)' },
  { name: 'Claude 3.5', value: '784K', pct: 31.3, color: 'var(--accent)' },
  { name: 'Gemini 1.5 Pro', value: '412K', pct: 16.9, color: 'var(--chart-3)' },
  { name: 'Codex GPT-4o', value: '198K', pct: 8.1, color: 'var(--success)' },
  { name: 'Jules', value: '58K', pct: 2.2, color: 'var(--chart-5)' },
]

export const activity = [
  { time: '10:42:20', text: 'Frontend Dev actualizó MiniCarrito.tsx', tag: 'Gemini 1.5 Pro' },
  { time: '10:42:18', text: 'Backend Dev creó carrito.routes.ts', tag: 'Grok 3' },
  { time: '10:42:15', text: 'Arquitecto actualizó architecture_swarm.md', tag: 'Claude 3.5' },
  { time: '10:42:10', text: 'QA & Debug ejecutó pruebas E2E', tag: 'Codex GPT-4o' },
  { time: '10:42:05', text: 'Commit push a main', tag: 'GitHub' },
]

export const recentTasks = [
  { name: 'Implementar carrito persistente', status: 'En curso', pct: '67%', tone: 'primary' },
  { name: 'Integración pasarela de pagos', status: 'En curso', pct: '46%', tone: 'primary' },
  { name: 'Optimizar carga de imágenes', status: 'Completado', pct: '100%', tone: 'success' },
  { name: 'Tests E2E flujo de compra', status: 'En curso', pct: '75%', tone: 'primary' },
  { name: 'Documentación API', status: 'Pendiente', pct: '0%', tone: 'muted' },
]

export const deployments = [
  { version: 'v1.2.3', env: 'Producción', by: 'Desplegado por Enjambre' },
  { version: 'v1.2.2', env: 'Staging', by: 'Desplegado por Enjambre' },
  { version: 'v1.2.1', env: 'Pruebas', by: 'Desplegado por Enjambre' },
]

export const conversations = [
  {
    agent: 'Arquitecto',
    model: 'Claude 3.5',
    time: '10:42:15',
    text: 'He actualizado el diagrama de arquitectura para soportar el nuevo módulo de carrito persistente con Redis como capa de caché.',
    files: [{ name: 'architecture_swarm.md', size: '2.4 KB' }],
  },
  {
    agent: 'Backend Dev',
    model: 'Grok 3',
    time: '10:42:18',
    text: 'Implementando endpoints para sincronización de carrito... Creando CarritoService y actualizando las rutas.',
    files: [{ name: 'carrito.service.ts' }, { name: 'carrito.routes.ts' }],
    more: 2,
  },
  {
    agent: 'Frontend Dev',
    model: 'Gemini 1.5 Pro',
    time: '10:42:20',
    text: 'Diseñando componente de mini carrito y estado global con Zustand.',
    files: [{ name: 'MiniCarrito.tsx', badge: 'TSX' }],
  },
]

/* ---------- LANZAR TAREA / CHATS view ---------- */

export const selectableAgents = [
  { name: 'Grok', provider: 'xAI', on: true },
  { name: 'Claude', provider: 'Claude 3.5', on: true },
  { name: 'Codex', provider: 'OpenAI', on: true },
  { name: 'Gemini', provider: 'Gemini 1.5 Pro', on: true },
  { name: 'Jules', provider: 'Google Labs', on: true },
]

export const parallelChats = [
  {
    agent: 'Grok',
    provider: 'xAI',
    time: '10:43:22',
    text: 'He creado el store de Zustand con persistencia y sincronización optimista. Incluye cálculos en tiempo real y manejo de errores.',
    files: [{ name: 'cart.store.ts', badge: 'TS' }],
    more: 2,
  },
  {
    agent: 'Claude',
    provider: 'Claude 3.5',
    time: '10:43:18',
    text: 'Implementé el servicio de carrito con sincronización a backend y reintentos exponenciales. Añadí validaciones con Zod.',
    files: [{ name: 'cart.service.ts', badge: 'TS' }],
    more: 3,
  },
  {
    agent: 'Codex',
    provider: 'OpenAI',
    time: '10:43:15',
    text: 'Estructura completa del módulo con tests unitarios y mocks. Cobertura inicial del 87% en funciones críticas.',
    files: [{ name: 'cart.service.test.ts', badge: 'TS' }],
    more: 4,
  },
  {
    agent: 'Gemini',
    provider: 'Gemini 1.5 Pro',
    time: '10:43:12',
    text: 'Componentes de UI del carrito con estados optimizados y feedback visual. Soporte para modo offline.',
    files: [{ name: 'CartDrawer.tsx', badge: 'TSX' }],
    more: 2,
  },
  {
    agent: 'Jules',
    provider: 'Google Labs',
    time: '10:43:10',
    text: 'Documentación técnica y guía de integración. Diagramas y flujo de datos del módulo de carrito.',
    files: [{ name: 'docs/cart-module.md', badge: 'MD' }],
    more: 1,
  },
]

export const realtimeLogs = [
  { time: '10:43:22', agent: 'Grok', text: 'Store de Zustand inicializado', file: 'store.ts' },
  { time: '10:43:20', agent: 'Claude', text: 'Conectando con API /cart/sync', file: 'api.ts' },
  { time: '10:43:18', agent: 'Codex', text: 'Generando tests unitarios', file: 'tests.ts' },
  { time: '10:43:16', agent: 'Gemini', text: 'Renderizando componente CartDrawer', file: 'ui.tsx' },
  { time: '10:43:14', agent: 'Jules', text: 'Generando documentación técnica', file: 'docs.md' },
  { time: '10:43:12', agent: 'Grok', text: 'Sincronización optimista activada', file: 'sync.ts' },
  { time: '10:43:10', agent: 'Claude', text: 'Validaciones con Zod completadas', file: 'schema.ts' },
]

export const taskStats = [
  { label: 'Tiempo estimado', value: '12m 24s' },
  { label: 'Tiempo transcurrido', value: '08m 12s' },
  { label: 'Agentes activos', value: '5 / 5' },
  { label: 'Pasos completados', value: '8 / 12' },
]

export const taskProgress = [
  { label: 'Análisis y planificación', pct: 100 },
  { label: 'Implementación', pct: 72 },
  { label: 'Pruebas unitarias', pct: 55 },
  { label: 'Documentación', pct: 30 },
]

export const attachedFiles = [
  { name: 'PRD - Carrito de Compras.pdf', size: '1.2 MB', kind: 'pdf' as const },
  { name: 'diagrama-arquitectura.png', size: '890 KB', kind: 'image' as const },
  { name: 'api-endpoints.http', size: '2.1 KB', kind: 'code' as const },
  { name: 'captura-flujo-carrito.png', size: '1.3 MB', kind: 'image' as const },
]

export const compareCols = ['Grok', 'Claude', 'Codex', 'Gemini', 'Jules']

export const compareRows = [
  { label: 'Estructura', values: [4, 5, 4, 5, 5] },
  { label: 'Calidad código', values: [4, 5, 5, 4, 4] },
  { label: 'Cobertura tests', values: ['78%', '85%', '87%', '80%', '75%'] },
  { label: 'Performance', values: [4, 4, 5, 4, 4] },
  { label: 'Claridad', values: [4, 5, 5, 4, 5] },
  { label: 'Listo para PR', values: ['ok', 'no', 'ok', 'ok', 'maybe'] },
]
