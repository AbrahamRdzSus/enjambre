# Imagen del agente CLI contenido (W3, ADR docs/adr/0001-contencion-agente-cli.md).
#
# Corre `claude` headless con SOLO el worktree montado (contencion de FS): el
# contenedor no ve el filesystem del host fuera de /work ni el home real. La auth de
# claude se monta read-only en /home/node/.claude al ejecutar (NO se hornea en la
# imagen: no lleva credenciales).
#
# Build (una vez):  docker build -f docker/cli-agent.Dockerfile -t enjambre/cli-agent .
# Uso: lo invoca enjambre.cli_agent cuando ENJAMBRE_CLI_SANDBOX=1 (ver docs/CLI_AGENT.md).
FROM node:20-slim

# git: el worktree montado necesita operaciones git dentro del contenedor si claude
# las usa; ca-certificates: TLS hacia la API. Sin recomendados para imagen chica.
RUN apt-get update \
    && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# El coding-agent. Fijar la version por reproducibilidad se hace via build-arg.
ARG CLAUDE_VERSION=latest
RUN npm install -g @anthropic-ai/claude-code@${CLAUDE_VERSION}

# Usuario no-root: el proceso dentro del contenedor no corre como root. El montaje
# del worktree debe ser escribible por este uid (se resuelve al ejecutar).
USER node
WORKDIR /work

# Sin ENTRYPOINT fijo: enjambre.cli_agent pasa el comando `claude -p ... --output-format json`.
