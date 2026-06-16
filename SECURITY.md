# Security Policy

## Secretos

ENJAMBRE nunca debe registrar API keys completas en logs ni enviarlas a agentes.

Formato visual permitido:

```txt
sk-••••••••••••4F2A
```

## Archivos bloqueados por defecto

- `.env`
- `.env.*`
- `*.pem`
- `*.key`
- `id_rsa`
- `id_ed25519`
- `secrets.*`
- `credentials.*`
- `*.p12`
- `*.pfx`

## Comandos peligrosos

Requieren confirmación explícita:

- `rm -rf`
- `sudo`
- `chmod -R 777`
- `curl ... | bash`
- `wget ... | sh`
- `git push --force`
- `npm publish`
- `docker system prune`
- migraciones de base de datos
- cambios de infraestructura

## Ejecución de código

Toda ejecución debe ocurrir en sandbox cuando sea posible.

## Reportar vulnerabilidades

Abrir un issue privado o enviar correo al mantenedor del proyecto.
