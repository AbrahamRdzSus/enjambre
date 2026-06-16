# Legal Risk Review — ENJAMBRE

Este documento resume riesgos legales y decisiones de diseño para publicar ENJAMBRE como open source.

No es asesoría legal.

## 1. Conclusión ejecutiva

El concepto de ENJAMBRE es viable como open source si se diseña como una capa de orquestación BYOK —bring your own key— y no como un servicio que entrena, destila, revende o replica modelos de terceros.

El riesgo principal no es tener varios modelos en una misma interfaz. El riesgo aparece si el proyecto:

- usa outputs de un proveedor para entrenar modelos competidores;
- usa outputs para destilación;
- revende outputs o scraping de outputs;
- promete que los usuarios pueden hacer “cualquier cosa” con modelos de terceros;
- oculta que cada proveedor tiene sus propios términos;
- almacena API keys inseguramente;
- ejecuta código sin sandbox o sin confirmación humana;
- usa marcas/logos de terceros como si fueran propias;
- combina código copyleft fuerte de forma incompatible.

## 2. Proveedores y restricciones relevantes

### OpenAI

Riesgos:
- No usar outputs para desarrollar modelos que compitan con OpenAI.
- No reverse engineering.
- No extracción programática abusiva de outputs.
- No presentar output como humano si no lo es.
- Cumplir usage policies.

Diseño recomendado:
- Adaptador OpenAI opcional.
- Usuario aporta su propia key.
- No entrenar modelos con outputs.
- No guardar outputs para datasets de entrenamiento.
- Mostrar advertencia de términos.

Fuente revisada:
- https://openai.com/policies/row-terms-of-use/
- https://openai.com/policies/how-your-data-is-used-to-improve-model-performance/

### Anthropic / Claude

Riesgos:
- No usar outputs para entrenar modelos competitivos.
- No apoyar intentos de terceros para hacer lo mismo.
- Evitar distillation, reverse engineering o convertir outputs en training targets de chatbots generales.

Diseño recomendado:
- Claude como proveedor opcional.
- Usar outputs solo como resultados de tarea para el usuario.
- Prohibir explícitamente modo "dataset builder" o "distillation mode".

Fuente revisada:
- https://support.claude.com/en/articles/12326764-can-i-use-my-outputs-to-train-an-ai-model

### Google Gemini API

Riesgos:
- No usar Gemini API para desarrollar modelos que compitan con Gemini API o Google AI Studio.
- No reverse engineering, extracción o replicación de componentes del servicio.
- En servicios gratuitos/unpaid, Google puede usar prompts y outputs para mejorar productos y puede haber revisión humana.
- Restricciones regionales y de edad.

Diseño recomendado:
- Advertir que para datos sensibles no se usen servicios gratuitos/unpaid.
- Separar modo "local/private" de proveedores cloud.
- Indicar que el usuario es responsable de usar regiones y planes permitidos.

Fuente revisada:
- https://ai.google.dev/gemini-api/terms

### xAI / Grok

Riesgos:
- No usar servicio ni outputs para desarrollar modelos o servicios competidores.
- No scraping/reventa de inputs u outputs.
- Consumer Terms otorgan derechos amplios de uso de contenido a xAI.
- Enterprise Terms pueden ofrecer mejores condiciones de retención/no training dependiendo del contrato.

Diseño recomendado:
- Tratar Grok como proveedor opcional.
- Recomendar Enterprise/API adecuado para datos sensibles.
- No usar outputs para destilación o entrenamiento.

Fuentes revisadas:
- https://x.ai/legal/terms-of-service
- https://x.ai/legal/terms-of-service-enterprise

## 3. Regla de oro del proyecto

ENJAMBRE puede comparar outputs para ayudar al usuario a tomar decisiones, pero no debe convertir esos outputs en entrenamiento de otro modelo.

Permitido conceptualmente:
- Mostrar respuestas lado a lado.
- Resumir propuestas.
- Crear diffs para revisión humana.
- Generar documentación o código para el usuario.
- Ejecutar tests locales.
- Abrir PR con aprobación del usuario.

No recomendado / prohibir en la app:
- “Entrenar mi modelo con todas las respuestas de Claude/OpenAI/Gemini/Grok”.
- “Destilar Claude/GPT/Gemini/Grok a un modelo local”.
- “Recolectar outputs para construir un chatbot competidor”.
- “Bypassear rate limits”.
- “Scrapear outputs masivamente”.
- “Ocultar que el código fue generado por IA cuando legalmente se requiera transparencia”.

## 4. Licencia open source recomendada

### Opción recomendada: Apache-2.0

Ventajas:
- Permisiva.
- Amigable para empresas.
- Incluye licencia de patente.
- Compatible con contribuciones comunitarias.
- Reduce incertidumbre frente a patentes de contribuyentes.

### Opción alternativa: MIT

Ventajas:
- Muy simple.
- Muy aceptada.
- Menos fricción.

Desventaja:
- No tiene lenguaje de patente tan explícito como Apache-2.0.

### Evitar inicialmente

AGPL/GPL si el objetivo es que cualquiera pueda usarlo sin carga legal fuerte. No son malas licencias, pero pueden espantar adopción empresarial o crear obligaciones de distribución que el usuario no espera.

## 5. Marcas y branding

No usar logos oficiales de terceros salvo que sus brand guidelines lo permitan.

Usar nombres en texto como integraciones descriptivas:

- “OpenAI-compatible provider”
- “Anthropic Claude provider”
- “Google Gemini provider”
- “xAI Grok provider”

Agregar nota:

> All product names, logos, and brands are property of their respective owners. Use of these names does not imply endorsement.

## 6. Privacidad y datos

Riesgos:
- API keys robadas.
- Subir código privado a proveedores cloud.
- Guardar logs con secretos.
- Enviar `.env`, claves, tokens o credenciales accidentalmente.
- Proveedores con entrenamiento/retención distinta según plan.

Medidas mínimas:
- Secret scanning antes de enviar contexto.
- Bloquear envío de `.env`, claves, certificados y llaves privadas.
- Lista `.enjambreignore`.
- Redacción automática de secretos.
- Storage local cifrado para API keys.
- Botón para borrar historial.
- Modo "no guardar outputs".
- Modo "solo local".

## 7. Seguridad técnica

ENJAMBRE debe asumir que los modelos pueden proponer código peligroso.

Medidas:
- Sandbox para ejecución.
- Confirmación humana antes de comandos.
- Lista de comandos bloqueados.
- No ejecutar `rm -rf`, curl|bash, scripts remotos, cambios de permisos peligrosos o comandos con credenciales sin confirmación.
- Mostrar diff antes de aplicar cambios.
- Crear branch temporal.
- Tests antes de merge.
- Logs auditables.

## 8. Responsabilidad del usuario

El usuario final debe aceptar que:
- Es responsable de sus API keys.
- Es responsable de cumplir términos de cada proveedor.
- Es responsable de revisar output.
- Es responsable de no subir datos confidenciales sin autorización.
- ENJAMBRE no garantiza exactitud, seguridad, legalidad ni calidad del código generado.

## 9. Checklist antes de publicar

- [ ] LICENSE Apache-2.0.
- [ ] NOTICE con marcas de terceros.
- [ ] SECURITY.md.
- [ ] DISCLAIMER.md.
- [ ] CONTRIBUTING.md con DCO o CLA.
- [ ] CODE_OF_CONDUCT.md.
- [ ] `.env.example`, nunca `.env`.
- [ ] `.enjambreignore`.
- [ ] Secret scanner.
- [ ] Política explícita de no training/no distillation.
- [ ] Modo BYOK.
- [ ] Terms acceptance en UI.
- [ ] Human approval gates.
- [ ] Sandbox opcional.
