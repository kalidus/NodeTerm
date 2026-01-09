# 📚 Guía de Integración: Open WebUI en NodeTerm

## 🎯 Descripción

Open WebUI es una interfaz web moderna y extensible para interactuar con modelos de lenguaje (LLMs). Esta guía explica cómo usar Open WebUI integrado en NodeTerm.

## 🚀 Inicio Rápido

1. **Abrir Open WebUI**: Haz clic en el botón 🌐 "Open WebUI" en la barra lateral de NodeTerm
2. **Esperar inicialización**: El sistema automáticamente:
   - Verifica que Docker Desktop esté ejecutándose
   - Descarga la imagen Docker si es necesario (`ghcr.io/open-webui/open-webui:main`)
   - Inicia el contenedor Docker
   - Espera a que el servicio esté listo
3. **Usar la interfaz**: Una vez listo, la interfaz de Open WebUI se cargará automáticamente en la pestaña

## ⚙️ Configuración

### Variables de Entorno

Puedes personalizar Open WebUI usando las siguientes variables de entorno:

- `NODETERM_OPENWEBUI_IMAGE`: Imagen Docker personalizada (default: `ghcr.io/open-webui/open-webui:main`)
- `NODETERM_OPENWEBUI_CONTAINER`: Nombre del contenedor (default: `nodeterm-openwebui`)
- `NODETERM_OPENWEBUI_PORT`: Puerto del host (default: `3000`)
- `NODETERM_OPENWEBUI_URL`: URL base personalizada (default: `http://127.0.0.1:3000`)
- `NODETERM_OPENWEBUI_DATA`: Directorio de datos personalizado (default: `~/.nodeterm/openwebui-data`)

### Variables de Entorno del Contenedor

- `NODETERM_OPENWEBUI_WEBUI_AUTH`: Activar/desactivar autenticación (default: `false` para desarrollo local)
- `NODETERM_OPENWEBUI_OPENAI_API_BASE_URL`: URL base de API OpenAI compatible (opcional)

### Ejemplo de Configuración

```bash
# Windows PowerShell
$env:NODETERM_OPENWEBUI_PORT = "3001"
$env:NODETERM_OPENWEBUI_WEBUI_AUTH = "true"
$env:NODETERM_OPENWEBUI_OPENAI_API_BASE_URL = "http://localhost:11434"
```

## 📁 Ubicación de Datos

Por defecto, los datos de Open WebUI se almacenan en:
- **Windows**: `%APPDATA%\nodeterm\openwebui-data`
- **Linux/Mac**: `~/.nodeterm/openwebui-data`

Este directorio contiene:
- Configuraciones de usuarios
- Historial de conversaciones
- Modelos y configuraciones personalizadas

## 🔧 Funcionalidades

### Gestión del Contenedor

- **Inicio automático**: El contenedor se inicia automáticamente al abrir la pestaña
- **Health check**: El sistema verifica que el servicio esté respondiendo antes de mostrar la UI
- **Reinicio**: Puedes reiniciar el contenedor desde la interfaz si es necesario

### Interfaz Web

- **Webview embebido**: La interfaz de Open WebUI se muestra directamente en NodeTerm
- **Abrir en navegador**: Botón para abrir Open WebUI en tu navegador externo
- **Recargar**: Botón para recargar la interfaz sin reiniciar el contenedor

## 🐛 Solución de Problemas

### Error: "Docker no está instalado o no se encuentra en el PATH"

**Solución**: 
1. Instala Docker Desktop desde [docker.com](https://www.docker.com/products/docker-desktop/)
2. Asegúrate de que Docker Desktop esté ejecutándose
3. Reinicia NodeTerm

### Error: "Docker Desktop no está en ejecución"

**Solución**:
1. Abre Docker Desktop
2. Espera a que se inicie completamente (ícono de Docker en la bandeja del sistema)
3. Vuelve a intentar abrir Open WebUI

### Error: "El servicio Open WebUI no respondió dentro del tiempo esperado"

**Posibles causas**:
- El contenedor está tardando más de lo normal en iniciar
- El puerto está ocupado por otro servicio
- Problemas de red

**Soluciones**:
1. Verifica que el puerto 3000 (o el configurado) no esté en uso:
   ```powershell
   # Windows PowerShell
   netstat -ano | findstr :3000
   ```
2. Cambia el puerto usando `NODETERM_OPENWEBUI_PORT`
3. Reinicia Docker Desktop
4. Reintenta abrir Open WebUI

### El webview no carga

**Solución**:
1. Haz clic en el botón "Recargar UI" en la barra de herramientas
2. Si persiste, haz clic en "Abrir en navegador" para verificar que el servicio funciona
3. Verifica los logs del contenedor:
   ```powershell
   docker logs nodeterm-openwebui
   ```

### Problemas con la autenticación

Si configuraste `WEBUI_AUTH=true` pero no puedes acceder:
1. Verifica la configuración en Open WebUI
2. Puede ser necesario crear un usuario inicial desde la interfaz web
3. Consulta la documentación oficial de Open WebUI para más detalles

## 🔗 Integración con Otros Servicios

### Conectar con Ollama

Para conectar Open WebUI con Ollama local:

```bash
$env:NODETERM_OPENWEBUI_OPENAI_API_BASE_URL = "http://localhost:11434"
```

Luego reinicia el contenedor de Open WebUI.

### Conectar con AnythingLLM

Open WebUI puede conectarse a AnythingLLM si expone una API compatible con OpenAI. Consulta la documentación de AnythingLLM para más detalles.

## 📝 Notas Importantes

1. **Primera ejecución**: La primera vez que abres Open WebUI, puede tardar varios minutos mientras se descarga la imagen Docker (varios GB)
2. **Persistencia**: Todos los datos se guardan en el directorio de datos, así que tus conversaciones y configuraciones se mantienen entre reinicios
3. **Recursos**: Open WebUI requiere recursos suficientes. Asegúrate de tener al menos 2GB de RAM disponibles
4. **Puerto**: Por defecto usa el puerto 3000. Si tienes otro servicio usando ese puerto, cambia `NODETERM_OPENWEBUI_PORT`

## 🆚 Diferencias con AnythingLLM

| Característica | Open WebUI | AnythingLLM |
|---------------|------------|-------------|
| Enfoque | Interfaz web para LLMs | Plataforma RAG completa |
| MCP Support | No | Sí |
| Autenticación | Opcional | Requerida |
| Puerto por defecto | 3000 | 3001 |
| Caso de uso | Chat con LLMs | Documentos + RAG + Agentes |

## 📚 Recursos Adicionales

- [Documentación oficial de Open WebUI](https://docs.openwebui.com/)
- [Repositorio de Open WebUI](https://github.com/open-webui/open-webui)
- [Documentación de Docker](https://docs.docker.com/)

## 🆘 Soporte

Si encuentras problemas:
1. Revisa los logs del contenedor: `docker logs nodeterm-openwebui`
2. Verifica que Docker Desktop esté funcionando correctamente
3. Consulta la documentación oficial de Open WebUI
4. Revisa los logs de NodeTerm en la consola de desarrollador




