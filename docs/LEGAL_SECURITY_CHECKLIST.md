# Checklist legal y de seguridad — ENJAMBRE

No es asesoría legal. Documento para reducir riesgos antes de publicar open source.

---

## 1. Reglas obligatorias del proyecto

ENJAMBRE debe tener estas reglas desde el README:

```txt
ENJAMBRE coordina agentes de IA.
No entrena modelos.
No destila modelos.
No scrapea outputs.
No revende outputs.
No replica servicios de terceros.
No incluye API keys.
```

---

## 2. Proveedores

### Permitido

- Usar API key del usuario.
- Enviar prompts autorizados por el usuario.
- Mostrar respuestas.
- Comparar respuestas.
- Generar código para uso del usuario.
- Guardar logs locales si el usuario lo permite.

### No permitido

- Usar outputs para entrenar modelos competidores.
- Crear datasets con outputs propietarios.
- Distillation.
- Scraping masivo.
- Reventa de outputs.
- Bypass de filtros/rate limits.
- Reverse engineering.

---

## 3. Mensaje en UI antes de activar proveedor

```txt
Al activar este proveedor confirmas que tienes una API key válida y aceptas cumplir sus términos. ENJAMBRE no está afiliado ni patrocinado por este proveedor. No uses outputs para entrenar o destilar modelos competidores.
```

---

## 4. Privacidad

No decir:

```txt
100% privado siempre
Tus datos nunca salen
```

Decir:

```txt
Local-first
Tú decides qué contexto enviar
Tus API keys se guardan localmente
Si usas proveedores cloud, esos proveedores procesarán el contexto enviado
```

---

## 5. Marcas

No usar logos de terceros salvo permiso.

Agregar en NOTICE:

```txt
All product names, logos, and brands are property of their respective owners. Use of these names does not imply endorsement, sponsorship, or affiliation.
```

---

## 6. Licencias de dependencias

Antes de agregar dependencia, revisar licencia:

Preferidas:

```txt
MIT
Apache-2.0
BSD-2-Clause
BSD-3-Clause
ISC
```

Cuidado:

```txt
GPL
AGPL
SSPL
Elastic License
Business Source License
Licencias custom
```

---

## 7. Seguridad mínima

- `.env` nunca se sube.
- API keys enmascaradas.
- Secret scanner antes de enviar contexto.
- `.enjambreignore`.
- No ejecutar comandos sin confirmación.
- Diff antes de escribir.
- Sandbox para comandos.
- No enviar llaves privadas.
- Botón de borrar historial.
- Logs exportables y borrables.

---

## 8. Disclaimer recomendado

```txt
ENJAMBRE se proporciona “AS IS”, sin garantías. El usuario es responsable de revisar el código generado, cumplir términos de proveedores, proteger sus API keys y validar cualquier cambio antes de producción.
```

---

## 9. Riesgo para Obsidia

Riesgos si se publica mal:

1. Usuarios culpan a Obsidia por costos de API.
2. Usuarios filtran secretos y culpan a la app.
3. Proveedores reclaman uso de marca.
4. Proveedores reclaman distillation/training.
5. Código generado causa daños.
6. App ejecuta comando destructivo.
7. Dependencia con licencia incompatible contamina repo.
8. Promesas de privacidad demasiado absolutas.

Mitigación:

- BYOK claro.
- Disclaimers.
- No logos externos.
- No training/no distillation.
- Security gates.
- Apache-2.0.
- Documentación transparente.
