# Provider Policy

ENJAMBRE permite conectar proveedores de modelos mediante API keys del usuario.

## Principios

1. BYOK: el usuario trae sus propias API keys.
2. No se incluyen keys en el repositorio.
3. No se revenden servicios de terceros.
4. No se entrena ni destila modelos usando outputs de proveedores.
5. No se eluden rate limits, filtros ni medidas de seguridad.
6. Cada proveedor debe ser opcional y reemplazable.
7. El usuario debe aceptar los términos de cada proveedor antes de usarlo.

## Uso permitido dentro de ENJAMBRE

- Enviar prompts/tareas a modelos.
- Recibir respuestas.
- Mostrar respuestas lado a lado.
- Comparar respuestas mediante criterios de calidad.
- Generar archivos o diffs para revisión humana.
- Ejecutar pruebas locales con autorización.
- Crear documentación.
- Generar commits o PRs solo con aprobación.

## Uso no permitido dentro de ENJAMBRE

- Crear datasets de entrenamiento con outputs de modelos propietarios.
- Entrenar, fine-tunear o destilar modelos competidores con esos outputs.
- Scraping masivo de outputs.
- Revender outputs.
- Ocultar o falsificar origen de outputs cuando sea relevante.
- Saltarse restricciones de seguridad.
- Enviar secretos sin advertencia.

## Recomendación de UI

Antes de activar cada proveedor, mostrar:

> Al activar este proveedor confirmas que tienes una cuenta/API key válida y aceptas cumplir sus términos. ENJAMBRE no es afiliado ni patrocinado por este proveedor. No uses outputs para entrenar o destilar modelos competidores.
