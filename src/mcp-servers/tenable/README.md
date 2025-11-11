# Tenable.io MCP Server

Servidor MCP para integración con Tenable.io. Proporciona herramientas para gestionar activos y analizar vulnerabilidades.

## Características

- **get_assets**: Listar activos con paginación
- **get_asset_details**: Obtener información detallada de un activo específico
- **search_assets**: Buscar activos por hostname, IP u otros criterios
- **get_asset_vulnerabilities**: Obtener vulnerabilidades de un activo

## Configuración

### 1. Obtener Credenciales de Tenable.io

1. Accede a [cloud.tenable.com](https://cloud.tenable.com)
2. Ve a **Settings** → **My Account** → **API Keys**
3. Genera un nuevo par de claves:
   - **Access Key** (TENABLE_ACCESS_KEY)
   - **Secret Key** (TENABLE_SECRET_KEY)

### 2. Configurar el MCP

Las credenciales se configuran a través del panel de NodeTerm:

1. Abre **Configuración** → **Seguridad** → **Tenable.io**
2. Ingresa:
   - `TENABLE_ACCESS_KEY`
   - `TENABLE_SECRET_KEY`
3. Haz clic en "Probar Conexión" para validar

### 3. Usar en Chat

El MCP estará disponible en el chat como herramientas que la IA puede usar automáticamente.

## API Endpoints

| Herramienta | Endpoint | Descripción |
|---|---|---|
| get_assets | GET /assets | Listar activos |
| get_asset_details | GET /assets/{id} | Detalles de activo |
| search_assets | POST /assets/find | Buscar activos |
| get_asset_vulnerabilities | GET /assets/{id}/vulnerabilities | Vulnerabilidades |

## Limitaciones

- Rate limiting de Tenable.io: ~100 requests/minute
- Máximo 1000 resultados por request
- Requiere credenciales válidas con permisos suficientes

## Seguridad

- Las credenciales se encriptan en mcp-config.json
- Nunca se guardan en texto plano
- Solo se transmiten a través de HTTPS a cloud.tenable.com


