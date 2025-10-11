# Sistema de Grabación de Sesiones SSH

## 📋 Descripción

Sistema completo de grabación y reproducción de sesiones SSH integrado en NodeTerm. Permite grabar sesiones SSH en tiempo real, almacenarlas de forma segura y reproducirlas posteriormente para auditoría, debugging o documentación.

## 🏗️ Arquitectura

### Backend (Proceso Principal)

#### 1. **SessionRecorder** (`src/services/SessionRecorder.js`)
- Clase encargada de capturar entrada/salida SSH en tiempo real
- Formato de grabación: **asciicast v2** (compatible con asciinema)
- Funcionalidades:
  - `startRecording(tabId, metadata)`: Inicia grabación
  - `stopRecording(tabId)`: Detiene y finaliza grabación
  - `recordOutput(tabId, data)`: Captura salida del servidor
  - `recordInput(tabId, data)`: Captura entrada del usuario
  - `pauseRecording(tabId)` / `resumeRecording(tabId)`: Control de grabación
  - `toAsciicast(recording)`: Convierte a formato exportable

#### 2. **SessionRecordingManager** (`src/services/SessionRecordingManager.js`)
- Gestiona almacenamiento y recuperación de grabaciones
- Almacenamiento en `userData/recordings/`
- Soporte para cifrado con `SecureStorage`
- Funcionalidades:
  - `saveRecording(recording, encrypt)`: Guarda grabación
  - `loadRecording(recordingId)`: Carga grabación
  - `deleteRecording(recordingId)`: Elimina grabación
  - `searchRecordings(filters)`: Búsqueda con filtros
  - `exportToAsciicast(recordingId)`: Exporta formato estándar

#### 3. **Recording Handlers** (`src/main/handlers/recording-handlers.js`)
- IPC handlers para comunicación renderer ↔ main process
- Endpoints disponibles:
  - `recording:start` - Iniciar grabación
  - `recording:stop` - Detener y guardar
  - `recording:pause` / `recording:resume` - Control
  - `recording:list` - Listar grabaciones
  - `recording:load` - Cargar grabación específica
  - `recording:delete` - Eliminar grabación
  - `recording:export` - Exportar a archivo
  - `recording:stats` - Estadísticas globales

#### 4. **Integración en main.js**
- Instancia global de `SessionRecorder`
- Captura automática en puntos clave:
  - Output SSH (bastion y directo)
  - Input del usuario
- Hooks integrados sin afectar flujo normal

### Frontend (Proceso Renderer)

#### 1. **AuditTab** (`src/components/AuditTab.js`)
- Componente React para listar grabaciones de una conexión
- Filtrado por host + usuario
- Características:
  - Lista de grabaciones con metadata
  - Estadísticas (total, duración, tamaño)
  - Acciones: Reproducir, Exportar, Eliminar
  - Actualización en tiempo real

#### 2. **RecordingPlayerTab** (`src/components/RecordingPlayerTab.js`)
- Reproductor de grabaciones con xterm.js
- Controles de reproducción:
  - Play / Pause / Stop / Restart
  - Control de velocidad (0.5x - 3x)
  - Barra de progreso
  - Display de tiempo
- Renderiza eventos asciicast en terminal

#### 3. **Menús Contextuales**

**TerminalContextMenu** (`src/components/contextmenus/TerminalContextMenu.js`):
- Opción "⏺ Iniciar grabación" / "⏹ Detener grabación"
- Control directo desde el terminal activo

**SidebarNodeContextMenu** (via `useSidebarManagement`):
- Opción "📼 Auditoría" en nodos SSH
- Abre tab de auditoría para esa conexión específica

#### 4. **TabContentRenderer** (`src/components/TabContentRenderer.js`)
- Soporte para nuevos tipos de tabs:
  - `type: 'audit'` → Renderiza AuditTab
  - `type: 'recording-player'` → Renderiza RecordingPlayerTab
- Callback automático para abrir reproductor desde auditoría

## 🔄 Flujo de Uso

### Grabar una Sesión

1. Usuario abre terminal SSH
2. Click derecho en terminal → "⏺ Iniciar grabación"
3. Sistema captura toda la entrada/salida en tiempo real
4. Click derecho → "⏹ Detener grabación"
5. Grabación se guarda automáticamente en `userData/recordings/`

### Consultar Grabaciones

1. Click derecho en conexión SSH de la sidebar
2. Seleccionar "📼 Auditoría"
3. Se abre tab con lista de todas las grabaciones
4. Filtrado automático por host + usuario
5. Vista de estadísticas (total, duración, tamaño)

### Reproducir una Grabación

1. En tab de auditoría, click en "Reproducir"
2. Se abre nuevo tab con reproductor
3. Controles disponibles:
   - Play/Pause/Stop
   - Velocidad ajustable
   - Barra de progreso
4. Renderizado en terminal con xterm.js

### Exportar Grabación

1. En tab de auditoría, click en icono "↓ Exportar"
2. Seleccionar ubicación
3. Formato: `.cast` (asciicast v2)
4. Compatible con asciinema-player y otras herramientas

## 📦 Formato de Datos

### Archivo de Grabación (.cast)

```
{"version": 2, "width": 80, "height": 24, "timestamp": 1234567890, ...}
[0.123, "o", "data output"]
[0.456, "i", "user input"]
[1.789, "o", "more output"]
```

### Metadata (.meta.json)

```json
{
  "id": "rec_1234567890_abc123",
  "title": "user@host",
  "host": "192.168.1.100",
  "username": "admin",
  "port": 22,
  "startTime": 1234567890000,
  "endTime": 1234567990000,
  "duration": 100.5,
  "eventCount": 1523,
  "bytesRecorded": 45678,
  "useBastionWallix": false,
  "createdAt": 1234567890000
}
```

## 🔐 Seguridad

- **Cifrado opcional**: Grabaciones pueden cifrarse con master key
- **Integración con SecureStorage**: Usa sistema de cifrado existente
- **Almacenamiento local**: No se envían datos a servidores externos
- **Metadata separada**: Índice rápido sin descifrar contenido completo

## 🎨 UI/UX

### Indicadores Visuales

- **🔴 Grabando**: Indicador rojo en terminal activo (futuro)
- **📼**: Icono de auditoría en sidebar
- **▶️**: Tab de reproducción
- **⏺/⏹**: Botones de control en menú contextual

### Temas

- Respeta temas de terminal configurados
- UI adaptativa según modo claro/oscuro
- Iconos PrimeReact consistentes

## 🚀 Características Futuras

- [ ] Indicador visual de grabación activa en tab
- [ ] Búsqueda de texto dentro de grabaciones
- [ ] Marcadores/timestamps en grabaciones
- [ ] Exportación a GIF animado
- [ ] Compartir grabaciones (con cifrado)
- [ ] Limpieza automática de grabaciones antiguas
- [ ] Compresión de grabaciones
- [ ] Anotaciones en reproducción

## 📊 Casos de Uso

1. **Auditoría de Seguridad**: Registro de acciones en servidores críticos
2. **Debugging**: Reproducir secuencias que causaron errores
3. **Documentación**: Crear tutoriales paso a paso
4. **Formación**: Compartir sesiones de ejemplo
5. **Compliance**: Cumplir requisitos de trazabilidad

## 🔧 Mantenimiento

### Estructura de Archivos

```
userData/
└── recordings/
    ├── rec_123_abc.cast          # Contenido de grabación
    ├── rec_123_abc.meta.json     # Metadata
    ├── rec_456_def.cast
    └── rec_456_def.meta.json
```

### Limpieza

Para liberar espacio, eliminar archivos `.cast` y `.meta.json` correspondientes desde el tab de auditoría.

## 🐛 Debugging

### Logs Principales

- `📹 Grabación iniciada: <recordingId>`
- `💾 Grabación guardada: <filepath>`
- `📂 Grabación cargada: <recordingId>`
- `🗑️ Grabación eliminada: <recordingId>`

### Verificación

```javascript
// En renderer console
await window.electron.ipcRenderer.invoke('recording:stats');
// Retorna: { total, totalDuration, totalSize, ... }
```

## 📚 Referencias

- [asciicast v2 format](https://github.com/asciinema/asciinema/blob/develop/doc/asciicast-v2.md)
- [xterm.js documentation](https://xtermjs.org/)
- Sistema de encriptación: Ver `docs/SISTEMA_ENCRIPTACION.md`

---

**Última actualización**: 2025-01-11  
**Versión**: 1.0.0  
**Estado**: ✅ Implementación completa

