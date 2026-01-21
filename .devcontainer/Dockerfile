FROM mcr.microsoft.com/devcontainers/typescript-node:20

# Install additional tools
RUN apt-get update && apt-get install -y \
    postgresql-client \
    redis-tools \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create pnpm store directory with correct permissions
RUN mkdir -p /home/node/.local/share/pnpm && chown -R node:node /home/node/.local

# Create workspace directory
WORKDIR /workspace

# Set user
USER node
