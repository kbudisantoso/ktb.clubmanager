# DevContainer Configuration

This folder contains the DevContainer configuration for ktb.clubmanager.

## Quick Start

1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Install VS Code with [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
3. Open this folder in VS Code
4. Click "Reopen in Container" when prompted

## Local Customizations (Optional)

You can add local volume mounts and VS Code extensions without affecting the committed configuration.

### Volume Mounts

An empty `docker-compose.local.yml` is auto-created if missing. Edit it to add your mounts:

```yaml
services:
  dev:
    volumes:
      - ~/.config/some-tool:/home/node/.config/some-tool:cached
```

### VS Code Extensions

To install personal extensions in the container without committing them, add them to your VS Code **user settings**:

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for `dev.containers.defaultExtensions`
3. Add extension IDs:

```json
"dev.containers.defaultExtensions": [
    "publisher.extension-name"
]
```

These extensions will be installed in all your dev containers automatically.

### Apply Changes

After modifying `docker-compose.local.yml`, rebuild the container:

**VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

**CLI:** `docker compose -f .devcontainer/docker-compose.yml up -d --build`

## Files

| File                       | Purpose                     | Committed |
| -------------------------- | --------------------------- | --------- |
| `devcontainer.json`        | VS Code DevContainer config | Yes       |
| `docker-compose.yml`       | Container orchestration     | Yes       |
| `Dockerfile`               | Development image           | Yes       |
| `docker-compose.local.yml` | Your local mounts           | No        |
