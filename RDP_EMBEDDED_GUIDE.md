# Guía de Sesiones RDP Embebidas

## Descripción General

El sistema de sesiones RDP embebidas permite ejecutar conexiones de escritorio remoto directamente dentro de las pestañas de la aplicación NodeTerm, proporcionando una experiencia integrada y unificada.

## Características Principales

### ✅ Funcionalidades Implementadas

1. **Conexiones RDP Embebidas**: Las sesiones RDP se ejecutan como pestañas dentro de la aplicación
2. **Gestión de Credenciales**: Sistema seguro para manejar credenciales de conexión
3. **Configuración Avanzada**: Soporte para múltiples opciones de RDP:
   - Resolución personalizable
   - Profundidad de color configurable
   - Redirección de recursos (carpetas, portapapeles, impresoras, audio)
   - Modo pantalla completa
   - Ajuste automático de ventana
   - Soporte para múltiples monitores
   - Sesiones administrativas
4. **Controles Integrados**: Botones para conectar, desconectar, reconectar y editar
5. **Estado de Conexión**: Indicadores visuales del estado de la conexión
6. **Gestión de Ventanas**: Control de ventanas RDP desde la aplicación

### 🔧 Componentes Técnicos

#### 1. Componente Principal: `EmbeddedRdpSession.js`
- Maneja la interfaz de usuario para las sesiones RDP embebidas
- Gestiona el estado de conexión y credenciales
- Proporciona controles para la sesión RDP

#### 2. Handlers IPC en `main.js`
- `rdp:create-embedded-window`: Crea ventanas RDP embebidas
- `rdp:disconnect-window`: Desconecta ventanas RDP específicas
- `rdp:toggle-fullscreen`: Alterna modo pantalla completa
- `rdp:get-embedded-windows`: Obtiene información de ventanas activas

#### 3. API en `preload.js`
- Expone métodos seguros para comunicación entre renderer y main process
- Maneja la comunicación IPC para operaciones RDP

## Cómo Usar

### Paso 1: Crear una Conexión RDP

1. **Desde el Sidebar**:
   - Haz clic derecho en una carpeta
   - Selecciona "Nueva Conexión RDP"
   - Completa la configuración

2. **Desde el Gestor RDP**:
   - Abre el gestor de conexiones RDP
   - Configura los parámetros de conexión
   - Guarda en el sidebar

### Paso 2: Abrir Sesión Embebida

1. **Haz clic en la conexión RDP** en el sidebar
2. **Se abrirá una nueva pestaña** con la interfaz de RDP embebido
3. **Haz clic en "Conectar"** para iniciar la sesión
4. **Ingresa las credenciales** si es necesario

### Paso 3: Gestionar la Sesión

#### Controles Disponibles:
- **Conectar**: Inicia la conexión RDP
- **Reconectar**: Reinicia la conexión
- **Desconectar**: Termina la sesión
- **Editar**: Modifica la configuración
- **Pantalla Completa**: Alterna modo pantalla completa

#### Estados de Conexión:
- 🔴 **Desconectado**: Sesión no iniciada
- 🟡 **Conectando**: Estableciendo conexión
- 🟢 **Conectado**: Sesión activa
- 🔴 **Error**: Problema de conexión

## Configuración Avanzada

### Parámetros de Conexión

```javascript
{
  name: "Mi Servidor",
  server: "192.168.1.100",
  username: "usuario",
  password: "contraseña",
  port: 3389,
  resolution: "1920x1080",
  colorDepth: 32,
  redirectFolders: true,
  redirectClipboard: true,
  redirectPrinters: false,
  redirectAudio: true,
  fullscreen: false,
  smartSizing: true,
  span: false,
  admin: false,
  public: false
}
```

### Resoluciones Soportadas

- **HD Ready**: 1280x720, 1366x768
- **Full HD**: 1920x1080, 1920x1200
- **2K QHD**: 2560x1440, 2560x1600
- **4K UHD**: 3840x2160, 4096x2160
- **Ultrawide**: 2560x1080, 3440x1440, 5120x1440

### Profundidades de Color

- 8 bits (256 colores)
- 15 bits (High Color)
- 16 bits (High Color)
- 24 bits (True Color)
- 32 bits (True Color) - **Recomendado**

## Requisitos del Sistema

### Windows
- Windows 10/11 (recomendado)
- mstsc.exe disponible (incluido por defecto)
- PowerShell para funciones avanzadas

### Limitaciones Actuales
- Solo disponible en Windows
- Las ventanas RDP se ejecutan como procesos separados
- No hay captura directa de la pantalla remota en la pestaña

## Solución de Problemas

### Error: "RDP embebido solo disponible en Windows"
- **Causa**: La función solo está disponible en Windows
- **Solución**: Usar en Windows o usar conexión RDP externa

### Error: "No se pudo crear la ventana RDP"
- **Causa**: Problemas con mstsc.exe o configuración
- **Solución**: 
  1. Verificar que mstsc.exe esté disponible
  2. Revisar la configuración de red
  3. Verificar credenciales

### La ventana RDP no aparece
- **Causa**: La ventana puede estar minimizada o en segundo plano
- **Solución**: 
  1. Usar el botón "Pantalla Completa"
  2. Verificar la barra de tareas
  3. Usar Alt+Tab para cambiar entre ventanas

### Problemas de rendimiento
- **Causa**: Configuración de resolución o color muy alta
- **Solución**:
  1. Reducir la resolución
  2. Cambiar a 16 bits de color
  3. Deshabilitar redirecciones innecesarias

## Desarrollo y Extensión

### Agregar Nuevas Funcionalidades

1. **Nuevos Handlers IPC**:
   ```javascript
   ipcMain.handle('rdp:new-feature', async (event, params) => {
     // Implementar nueva funcionalidad
   });
   ```

2. **Actualizar API en preload.js**:
   ```javascript
   newFeature: (params) => ipcRenderer.invoke('rdp:new-feature', params)
   ```

3. **Modificar el componente**:
   ```javascript
   const handleNewFeature = async () => {
     const result = await window.electronAPI.rdp.newFeature(params);
   };
   ```

### Personalización de la UI

El componente `EmbeddedRdpSession.js` está diseñado para ser fácilmente personalizable:

- **Estilos**: Usa variables CSS para temas
- **Layout**: Estructura modular con flexbox
- **Controles**: Botones configurables con PrimeReact

## Archivos Relacionados

- `src/components/EmbeddedRdpSession.js` - Componente principal
- `src/components/App.js` - Integración con el sistema de pestañas
- `main.js` - Handlers IPC del proceso principal
- `preload.js` - API de comunicación segura
- `src/components/RdpManager.js` - Gestor de conexiones RDP

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] Captura directa de pantalla en la pestaña
- [ ] Soporte para múltiples monitores
- [ ] Grabación de sesiones
- [ ] Transferencia de archivos integrada
- [ ] Soporte para otros protocolos (VNC, SSH X11)

### Optimizaciones Técnicas
- [ ] Mejor gestión de memoria
- [ ] Reconexión automática
- [ ] Compresión de datos
- [ ] Cifrado adicional

---

**Nota**: Esta implementación proporciona una base sólida para sesiones RDP embebidas. Las ventanas RDP se ejecutan como procesos nativos de Windows, lo que garantiza compatibilidad y rendimiento óptimos. 