# Configuración de MCP en AnythingLLM

Esta guía explica cómo modificar el archivo JSON de configuración de AnythingLLM para añadir servidores MCP (Model Context Protocol).

## 📍 Ubicación del Archivo de Configuración

Los datos de AnythingLLM se almacenan en:
- **Windows**: `%APPDATA%\NodeTerm\anythingllm-data` o `%USERPROFILE%\.nodeterm\anythingllm-data`
- **Linux/macOS**: `~/.nodeterm/anythingllm-data`

El archivo de configuración MCP se busca en las siguientes ubicaciones (en orden de prioridad):
1. `mcp.json` (formato estándar)
2. `.mcp.json` (archivo oculto)
3. `config/mcp.json` (en subdirectorio)
4. `mcp-servers.json`

## 🔧 Métodos Disponibles desde NodeTerm

NodeTerm expone los siguientes métodos para gestionar la configuración MCP de AnythingLLM:

### Obtener el Directorio de Datos

```javascript
const response = await window.electron.anythingLLM.getDataDir();
if (response.success) {
  console.log('Directorio de datos:', response.dataDir);
}
```

### Leer Configuración MCP

```javascript
const response = await window.electron.anythingLLM.readMCPConfig();
if (response.success) {
  console.log('Configuración MCP:', response.config);
  // Estructura esperada: { mcpServers: { ... } }
}
```

### Escribir Configuración MCP Completa

```javascript
const config = {
  mcpServers: {
    "mi-servidor": {
      command: "node",
      args: ["/ruta/al/servidor.js"],
      env: {
        API_KEY: "valor-secreto"
      }
    }
  }
};

const response = await window.electron.anythingLLM.writeMCPConfig(config);
if (response.success) {
  console.log('Configuración guardada correctamente');
}
```

### Añadir un Servidor MCP

```javascript
const serverName = "mi-servidor-mcp";
const serverConfig = {
  command: "node",
  args: ["/ruta/al/servidor-mcp.js"],
  env: {
    API_KEY: "tu-api-key"
  }
};

const response = await window.electron.anythingLLM.addMCPServer(serverName, serverConfig);
if (response.success) {
  console.log('Servidor añadido. Configuración actualizada:', response.config);
}
```

### Eliminar un Servidor MCP

```javascript
const response = await window.electron.anythingLLM.removeMCPServer("mi-servidor-mcp");
if (response.success) {
  console.log('Servidor eliminado. Configuración actualizada:', response.config);
}
```

### Leer/Escribir Cualquier Archivo JSON

```javascript
// Leer cualquier archivo JSON
const readResponse = await window.electron.anythingLLM.readJsonFile('config.json');
if (readResponse.success) {
  console.log('Contenido:', readResponse.data);
}

// Escribir cualquier archivo JSON
const writeResponse = await window.electron.anythingLLM.writeJsonFile('mi-archivo.json', {
  clave: 'valor',
  numero: 123
});
if (writeResponse.success) {
  console.log('Archivo guardado');
}
```

### Listar Archivos en el Directorio de Datos

```javascript
const response = await window.electron.anythingLLM.listDataFiles();
if (response.success) {
  console.log('Archivos disponibles:', response.files);
}
```

## 📝 Formato del Archivo mcp.json

El archivo de configuración MCP sigue este formato estándar:

```json
{
  "mcpServers": {
    "nombre-del-servidor": {
      "command": "comando-para-ejecutar",
      "args": ["arg1", "arg2"],
      "env": {
        "VARIABLE_ENTORNO": "valor"
      }
    },
    "otro-servidor": {
      "command": "python",
      "args": ["-m", "mcp_servidor"],
      "env": {
        "PYTHONPATH": "/ruta/a/modulos"
      }
    }
  }
}
```

## 🎯 Ejemplo Completo: Añadir un Servidor MCP

```javascript
// Ejemplo: Añadir un servidor MCP de filesystem
async function añadirServidorMCPFilesystem() {
  const serverName = "filesystem";
  const serverConfig = {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/ruta/permitida"],
    env: {}
  };

  try {
    const response = await window.electron.anythingLLM.addMCPServer(serverName, serverConfig);
    
    if (response.success) {
      console.log('✅ Servidor MCP añadido correctamente');
      console.log('Configuración completa:', response.config);
    } else {
      console.error('❌ Error:', response.error);
    }
  } catch (error) {
    console.error('❌ Excepción:', error);
  }
}

// Ejecutar
añadirServidorMCPFilesystem();
```

## 🔄 Sincronización con AnythingLLM

Después de modificar la configuración MCP:

1. **Reinicia AnythingLLM** (si está ejecutándose):
   - Puedes usar `window.electron.anythingLLM.stop()` y luego `window.electron.anythingLLM.start()`
   - O simplemente recarga la interfaz de AnythingLLM en el webview

2. **Verifica en la UI de AnythingLLM**:
   - Ve a "Agent Skills" → "MCP Servers"
   - Haz clic en "Refresh" para recargar los servidores
   - Los nuevos servidores deberían aparecer en la lista

## ⚠️ Notas Importantes

1. **Backup**: Siempre haz una copia de seguridad del archivo `mcp.json` antes de modificarlo manualmente.

2. **Formato JSON**: Asegúrate de que el JSON esté bien formateado. Los métodos de NodeTerm validan el formato automáticamente.

3. **Rutas**: Las rutas en Windows deben usar barras invertidas (`\\`) o barras normales (`/`). NodeTerm maneja esto automáticamente.

4. **Permisos**: Asegúrate de que NodeTerm tenga permisos de escritura en el directorio de datos de AnythingLLM.

5. **Variables de Entorno**: Los valores en `env` pueden contener información sensible. Considera usar variables de entorno del sistema en lugar de hardcodear valores.

## 🐛 Solución de Problemas

### El archivo no se encuentra
- Verifica que AnythingLLM se haya iniciado al menos una vez
- Usa `getDataDir()` para confirmar la ubicación del directorio
- Usa `listDataFiles()` para ver qué archivos existen

### Los cambios no se reflejan en AnythingLLM
- Reinicia el contenedor de AnythingLLM
- Verifica que el archivo JSON esté bien formateado
- Revisa los logs de AnythingLLM: `docker logs nodeterm-anythingllm`

### Error de permisos
- Asegúrate de que el directorio de datos tenga permisos de escritura
- En Windows, verifica que no esté bloqueado por antivirus
- En Linux/macOS, verifica los permisos del directorio

## 📚 Referencias

- [Documentación de AnythingLLM sobre MCP](https://docs.useanything.com/)
- [Especificación MCP](https://modelcontextprotocol.io/)
- [Integración AnythingLLM en NodeTerm](./ANYTHINGLLM_INTEGRATION.md)

