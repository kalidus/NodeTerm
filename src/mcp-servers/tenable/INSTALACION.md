# Instalación del MCP de Tenable.io

## 📦 Requisitos

- **Node.js** 16+ (recomendado 18+)
- **npm** 8+
- **Conexión a Internet** (para acceder a cloud.tenable.com)
- **Cuenta de Tenable.io** con API Keys generadas

## 🚀 Pasos de Instalación

### 1. Verificar Node.js

```powershell
node --version
npm --version
```

Deberías ver versiones similares a:
- `v18.17.0` (Node.js)
- `9.6.7` (npm)

Si no tienes Node.js instalado, descárgalo de [nodejs.org](https://nodejs.org)

### 2. Instalar Dependencias

```powershell
# Navega al directorio del MCP
cd src\mcp-servers\tenable

# Instala las dependencias
npm install
```

Esto instalará:
- `@modelcontextprotocol/sdk`: SDK del protocolo MCP
- `axios`: Cliente HTTP para las peticiones a Tenable.io

### 3. Verificar Instalación

```powershell
# Prueba que el servidor se inicia correctamente
node index.js
```

Deberías ver en la consola:
```
[Tenable MCP Server] Started successfully
```

Presiona `Ctrl+C` para detener.

### 4. Configurar Credenciales

Opción A: **Variables de Entorno** (para desarrollo/testing)
```powershell
# En PowerShell
$env:TENABLE_ACCESS_KEY = "tu_access_key_aqui"
$env:TENABLE_SECRET_KEY = "tu_secret_key_aqui"
node index.js
```

Opción B: **Archivo de Configuración** (recomendado para producción)
Usa el panel de NodeTerm: **Configuración** → **🔌 MCP Tools** → Tenable.io ⚙️

### 5. Prueba Rápida

```powershell
# Inicia el servidor con credenciales
$env:TENABLE_ACCESS_KEY = "your_key"
$env:TENABLE_SECRET_KEY = "your_secret"
node index.js
```

En otra terminal, prueba con curl (requiere herramientas adicionales o usa Postman):
```powershell
# Envía una solicitud JSON-RPC 2.0
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | 
  node -e "
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin });
    rl.on('line', (line) => {
      console.log('Request:', line);
    });
  "
```

## 🔧 Estructura de Archivos

```
src/mcp-servers/tenable/
├── package.json              # Dependencias y metadata
├── index.js                  # Servidor MCP principal
├── README.md                 # Documentación
└── INSTALACION.md           # Este archivo
```

## 📚 API de Tenable.io

El MCP usa la API v2 de Tenable.io:

```
Base URL: https://cloud.tenable.com/api/v2

Authentication: 
  X-ApiKeys: accessKey={TENABLE_ACCESS_KEY};secretKey={TENABLE_SECRET_KEY}
```

### Endpoints Utilizados

- `GET /assets` - Listar activos
- `GET /assets/{id}` - Detalles de activo
- `POST /assets/find` - Buscar activos
- `GET /assets/{id}/vulnerabilities` - Vulnerabilidades

## ⚙️ Configuración Avanzada

### Cambiar el Timeout (por defecto: 30 segundos)

En `index.js`, línea 37:
```javascript
timeout: 30000,  // Cambiar a 60000 para 60 segundos
```

### Cambiar el URL de la API

En `index.js`, línea 26:
```javascript
const TENABLE_API_URL = "https://cloud.tenable.com/api/v2";
// Cambiar si usas una instancia privada de Tenable
```

## 🐛 Debugging

Para ver logs detallados:

```powershell
# Modo verbose
$env:DEBUG = "tenable:*"
node index.js
```

## 🚨 Errores Comunes

### `Error: ENOENT: no such file or directory`
- El directorio `node_modules` no existe
- **Solución**: Ejecuta `npm install` en el directorio del MCP

### `Error: Cannot find module '@modelcontextprotocol/sdk'`
- Las dependencias no se instalaron correctamente
- **Solución**: 
  ```powershell
  rm -r node_modules package-lock.json
  npm install
  ```

### `Error: ECONNREFUSED at cloud.tenable.com`
- No hay conexión a Internet o está bloqueada
- **Solución**: Verifica tu conexión a Internet y firewall

### `Error: Unauthorized (401)`
- Las credenciales de Tenable.io son incorrectas
- **Solución**: Verifica que sean las correctas desde cloud.tenable.com

## 📝 Scripts Útiles

Agregar a `package.json` para facilitar desarrollo:

```json
{
  "scripts": {
    "start": "node index.js",
    "dev": "node index.js",
    "test": "echo \"No tests defined yet\""
  }
}
```

Luego puedes usar:
```powershell
npm start
```

## 🔐 Seguridad en Desarrollo

**NUNCA** hagas esto en producción:

```powershell
# ❌ MALO - Credenciales en línea de comandos
node index.js --access-key=my_key --secret-key=my_secret

# ❌ MALO - Credenciales en código
const API_KEY = "sk-1234567890";
```

**SÍ** haz esto:

```powershell
# ✅ BUENO - Variables de entorno
$env:TENABLE_ACCESS_KEY = "..."
node index.js

# ✅ BUENO - Archivo .env (ignorado por git)
# Crear .env con:
# TENABLE_ACCESS_KEY=...
# TENABLE_SECRET_KEY=...
```

## 🔗 Enlaces Útiles

- [API Documentation](https://developer.tenable.com/reference/navigate)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Node.js MCP SDK](https://github.com/modelcontextprotocol/sdk-js)

## ✅ Checklist de Verificación

- [ ] Node.js 16+ instalado
- [ ] `npm install` ejecutado exitosamente
- [ ] Credenciales de Tenable.io válidas
- [ ] Servidor se inicia sin errores: `node index.js`
- [ ] Herramientas disponibles en NodeTerm chat
- [ ] Primeras pruebas funcionan: `get_assets` retorna datos

## 📞 Soporte

Si tienes problemas:

1. Revisa los logs en la consola del MCP
2. Verifica la documentación en `README.md`
3. Consulta la documentación de Tenable.io
4. Abre un issue en GitHub

---

**Versión**: 1.0  
**Última actualización**: 10 de Noviembre de 2025


