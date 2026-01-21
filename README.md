# ktb.clubmanager

**ktb.clubmanager** is an open-source project for the development of a modern club management solution with integrated accounting. The project fills a gap in the market: there is no modern, web-based open-source solution that combines full double-entry accounting (SKR42) with state-of-the-art technology and German compliance.

## Development Setup

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop)
- [VS Code](https://code.visualstudio.com/) with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)

### Quick Start

1. Clone the repository
2. Open in VS Code
3. Click "Reopen in Container" when prompted
4. Wait for the container to build and dependencies to install

### Local Customizations

You can customize the DevContainer without affecting committed files.

#### Volume Mounts

Edit `.devcontainer/docker-compose.local.yml` (auto-created, gitignored) to mount host directories:

```yaml
services:
  dev:
    volumes:
      - ~/.config/some-tool:/home/node/.config/some-tool:cached
```

#### VS Code Extensions

Add personal extensions via VS Code user settings (not committed):

1. Open Settings (`Cmd+,` / `Ctrl+,`)
2. Search for `dev.containers.defaultExtensions`
3. Add extension IDs:

```json
"dev.containers.defaultExtensions": [
    "publisher.extension-name"
]
```

See [.devcontainer/README.md](.devcontainer/README.md) for more details.
