# Cloud VM Starter Backend (Azure Functions)

## Setup

```sh
npm install
cp local.settings.example.json local.settings.json
# Trage deine Azure Secrets ein
```

## Lokale Entwicklung

```sh
func start
```

## Deployment

```sh
func azure functionapp publish <dein-function-app-name>
```

## Hinweise

- `local.settings.json` niemals committen!
- Setze Secrets im Azure Portal unter "Configuration".
