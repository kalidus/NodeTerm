# Guía de Auditoría y Grabación de Sesiones SSH

> Sistema completo de grabación, almacenamiento y reproducción de sesiones SSH para NodeTerm

---

## 📋 Tabla de Contenidos

1. [Introducción](#-introducción)
2. [Características Principales](#-características-principales)
3. [Guía de Usuario](#-guía-de-usuario)
4. [Arquitectura Técnica](#️-arquitectura-técnica)
5. [Formato de Datos](#-formato-de-datos)
6. [Seguridad y Privacidad](#-seguridad-y-privacidad)
7. [Solución de Problemas](#-solución-de-problemas)
8. [Referencias](#-referencias)

---

## 🎯 Introducción

El sistema de auditoría de sesiones SSH permite grabar, almacenar y reproducir sesiones completas de terminal SSH en tiempo real. Es ideal para:

- **Auditoría de seguridad**: Mantener registro de operaciones en servidores críticos
- **Debugging y troubleshooting**: Reproducir exactamente qué comandos causaron un problema
- **Documentación**: Crear tutoriales interactivos de procedimientos
- **Formación**: Compartir ejemplos prácticos de administración de sistemas
- **Compliance**: Cumplir con requisitos regulatorios de trazabilidad

### ¿Por qué usar este sistema?

✅ **Sin software adicional**: Todo integrado en NodeTerm  
✅ **Formato estándar**: Compatible con asciinema y herramientas externas  
✅ **Almacenamiento local**: Sin dependencias de servicios en la nube  
✅ **Cifrado opcional**: Protección de datos sensibles  
✅ **Búsqueda rápida**: Índice de metadata para localizar grabaciones  

---

## ✨ Características Principales

### Grabación en Tiempo Real
- Captura completa de entrada y salida
- Sin impacto en el rendimiento del terminal
- Soporte para SSH directo y Bastion/Wallix
- Control granular (iniciar, pausar, reanudar, detener)

### Gestión de Grabaciones
- Lista organizada por conexión (host + usuario)
- Estadísticas: duración total, número de grabaciones, tamaño
- Búsqueda y filtrado avanzado
- Exportación a formato estándar `.cast`

### Reproductor Integrado
- Interfaz similar a un reproductor de video
- Controles: Play, Pause, Stop, Reiniciar
- Velocidad ajustable (0.5x hasta 3x)
- Barra de progreso interactiva
- Renderizado con xterm.js (mismo motor que el terminal)

---

## 🎮 Guía de Usuario

### 1. Iniciar una Grabación

#### Método 1: Desde el Terminal Activo

1. Abre una conexión SSH normalmente
2. **Click derecho** dentro del terminal
3. Selecciona **"⏺ Iniciar grabación"**
4. Verás una notificación verde confirmando el inicio

```
✓ Grabación iniciada
  Grabando sesión: admin@servidor.com
```

5. Trabaja normalmente en el terminal - todo se graba automáticamente
6. Cuando termines, **click derecho** → **"⏹ Detener grabación"**

```
✓ Grabación detenida
  Grabación guardada (127s, 843 eventos)
```

#### Estados del Botón

- **⏺ Iniciar grabación**: Cuando no hay grabación activa
- **⏹ Detener grabación**: Cuando está grabando (texto en rojo)

### 2. Ver Grabaciones (Auditoría)

#### Acceso al Panel de Auditoría

1. En la **sidebar izquierda**, localiza la conexión SSH
2. **Click derecho** sobre la conexión
3. Selecciona **"📼 Auditoría"**
4. Se abre una nueva pestaña con todas las grabaciones de esa conexión

#### Vista de Auditoría

El panel muestra:

```
┌─────────────────────────────────────────────┐
│ 📼 Auditoría de Sesiones                    │
│ admin@192.168.1.100:22                      │
├─────────────────────────────────────────────┤
│                                             │
│ 📊 Estadísticas                             │
│  • 8 Grabaciones                            │
│  • 2h 35m 14s Duración Total                │
│  • 4.2 MB Tamaño Total                      │
│                                             │
├─────────────────────────────────────────────┤
│ Lista de Grabaciones:                       │
│                                             │
│ 🎥 admin@servidor - 11 ene 15:30            │
│    15m 23s • 1.2 MB • [PLAY] [⬇] [🗑]      │
│                                             │
│ 🎥 admin@servidor - 11 ene 10:15            │
│    45m 10s • 2.8 MB • [PLAY] [⬇] [🗑]      │
│                                             │
└─────────────────────────────────────────────┘
```

**Columnas mostradas:**
- **Título**: Nombre de la sesión (usuario@host)
- **Fecha**: Cuándo se grabó
- **Duración**: Tiempo total de la grabación
- **Tamaño**: Espacio en disco
- **Acciones**: Reproducir, Exportar, Eliminar

### 3. Reproducir una Grabación

#### Abrir el Reproductor

1. En el panel de auditoría, click en **"Reproducir"** (▶️) de cualquier grabación
2. Se abre una nueva pestaña con el reproductor

#### Controles del Reproductor

```
┌──────────────────────────────────────────────────────────┐
│ ▶️ admin@servidor.com                    00:15 / 15:23   │
├──────────────────────────────────────────────────────────┤
│ [▶️ Play] [⏸ Pause] [⏹ Stop] [🔄 Reiniciar] [1x ▼]     │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░ 25%                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ [TERMINAL REPRODUCIENDO LA GRABACIÓN]                   │
│                                                          │
│ $ ls -la                                                 │
│ total 128                                                │
│ drwxr-xr-x 5 admin admin  4096 Jan 11 15:30 .          │
│ ...                                                      │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Controles Disponibles

| Botón | Función | Atajo |
|-------|---------|-------|
| ▶️ Play | Iniciar/Reanudar reproducción | - |
| ⏸ Pause | Pausar | - |
| ⏹ Stop | Detener y volver al inicio | - |
| 🔄 Reiniciar | Reiniciar desde el principio | - |
| 1x ▼ | Cambiar velocidad (0.5x, 1x, 1.5x, 2x, 3x) | - |

**Barra de progreso:**
- Muestra el avance actual de la reproducción
- Tiempo transcurrido / Tiempo total

### 4. Exportar una Grabación

Las grabaciones pueden exportarse para:
- Compartir con colegas
- Archivar fuera de NodeTerm
- Usar con herramientas externas (asciinema-player)

#### Pasos para Exportar

1. En el panel de auditoría, click en el icono **⬇ Exportar**
2. Selecciona la ubicación donde guardar
3. Elige nombre de archivo (extensión `.cast`)
4. El archivo se guarda en formato asciicast v2 estándar

**Usos del archivo exportado:**
- Reproducir en navegador con [asciinema-player](https://github.com/asciinema/asciinema-player)
- Convertir a GIF animado con herramientas externas
- Compartir en documentación online

### 5. Eliminar Grabaciones

⚠️ **Advertencia**: Esta acción es permanente y no se puede deshacer.

1. En el panel de auditoría, click en el icono **🗑 Eliminar**
2. Confirma la eliminación
3. Los archivos `.cast` y `.meta.json` se eliminan del disco

**Cuándo eliminar:**
- Para liberar espacio en disco
- Cuando la grabación ya no es necesaria
- Por políticas de retención de datos

---

## 🏗️ Arquitectura Técnica

### Componentes del Sistema

```
┌─────────────────────────────────────────────────────────┐
│                    PROCESO RENDERER                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  AuditTab   │  │ RecordingPla │  │ TerminalConte │ │
│  │             │  │   yerTab     │  │   xtMenu      │ │
│  └──────┬──────┘  └──────┬───────┘  └───────┬───────┘ │
│         │                │                   │          │
│         └────────────────┴───────────────────┘          │
│                          │                               │
│         ┌────────────────▼─────────────────┐            │
│         │  useRecordingManagement Hook     │            │
│         │  - Estado de grabaciones         │            │
│         │  - Funciones IPC                 │            │
│         └────────────────┬─────────────────┘            │
│                          │                               │
└──────────────────────────┼───────────────────────────────┘
                           │ IPC
┌──────────────────────────▼───────────────────────────────┐
│                    PROCESO MAIN                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌───────────────────────────────────────────────────┐ │
│  │        Recording Handlers (IPC)                   │ │
│  │  - recording:start, :stop, :pause, :resume       │ │
│  │  - recording:list, :load, :delete, :export       │ │
│  └───────────────────┬───────────────────────────────┘ │
│                      │                                   │
│  ┌───────────────────▼───────────────────────────────┐ │
│  │           SessionRecorder                         │ │
│  │  - Captura entrada/salida en tiempo real         │ │
│  │  - Formato asciicast v2                          │ │
│  │  - Gestión de estado de grabaciones              │ │
│  └───────────────────┬───────────────────────────────┘ │
│                      │                                   │
│  ┌───────────────────▼───────────────────────────────┐ │
│  │      SessionRecordingManager                      │ │
│  │  - Almacenamiento en userData/recordings/        │ │
│  │  - Gestión de archivos .cast y .meta.json       │ │
│  │  - Búsqueda y filtrado                           │ │
│  └───────────────────────────────────────────────────┘ │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### Flujo de Datos

#### Al Iniciar Grabación

```
Usuario Click → TerminalContextMenu
                      ↓
          handleStartRecording()
                      ↓
          IPC: recording:start
                      ↓
          SessionRecorder.startRecording()
                      ↓
          Retorna recordingId
                      ↓
          Toast: "Grabación iniciada"
```

#### Durante la Grabación

```
SSH Output → main.js (línea 630, 1263)
                      ↓
          sessionRecorder.recordOutput(tabId, data)
                      ↓
          Evento guardado en memoria
          
Usuario Input → main.js (línea 1370)
                      ↓
          sessionRecorder.recordInput(tabId, data)
                      ↓
          Evento guardado en memoria
```

#### Al Detener Grabación

```
Usuario Click → handleStopRecording()
                      ↓
          IPC: recording:stop
                      ↓
          SessionRecorder.stopRecording()
                      ↓
          Genera archivo .cast (asciicast)
                      ↓
          Guarda en userData/recordings/
                      ↓
          Crea archivo .meta.json
                      ↓
          Toast: "Grabación guardada (Xs, Y eventos)"
```

### Archivos Principales

| Archivo | Descripción | Responsabilidad |
|---------|-------------|-----------------|
| `src/services/SessionRecorder.js` | Motor de grabación | Captura de eventos en tiempo real |
| `src/services/SessionRecordingManager.js` | Gestor de archivos | Almacenamiento y recuperación |
| `src/main/handlers/recording-handlers.js` | IPC Handlers | Comunicación renderer ↔ main |
| `src/components/AuditTab.js` | UI de auditoría | Lista de grabaciones |
| `src/components/RecordingPlayerTab.js` | Reproductor | Playback de grabaciones |
| `src/hooks/useRecordingManagement.js` | Hook React | Estado y funciones de grabación |

---

## 📦 Formato de Datos

### Estructura de Directorios

```
C:\Users\{username}\AppData\Roaming\NodeTerm\recordings\
├── rec_1704988800000_a3f8d9.cast          # Contenido de la grabación
├── rec_1704988800000_a3f8d9.meta.json     # Metadata para búsqueda
├── rec_1704992400000_b7e2c1.cast
├── rec_1704992400000_b7e2c1.meta.json
└── ...
```

### Archivo de Grabación (.cast)

Formato **asciicast v2** - Estándar de la industria para grabaciones de terminal.

**Estructura:**
```
{"version": 2, "width": 80, "height": 24, "timestamp": 1704988800, "title": "admin@server"}
[0.123456, "o", "$ ls -la\r\n"]
[0.234567, "i", "cd /var/log"]
[0.345678, "o", "total 128\r\ndrwxr-xr-x 5 root root 4096 Jan 11 15:30 .\r\n"]
[1.456789, "o", "drwxr-xr-x 14 root root 4096 Jan  1 00:00 ..\r\n"]
...
```

**Formato de eventos:**
- `[tiempo_relativo, tipo, datos]`
- `tipo`: `"o"` = output (servidor), `"i"` = input (usuario)
- `tiempo_relativo`: Segundos desde el inicio (con decimales)

### Archivo de Metadata (.meta.json)

```json
{
  "id": "rec_1704988800000_a3f8d9",
  "title": "admin@servidor.empresa.com",
  "host": "servidor.empresa.com",
  "username": "admin",
  "port": 22,
  "connectionType": "ssh",
  "useBastionWallix": false,
  "bastionHost": null,
  "bastionUser": null,
  "sessionName": "Mantenimiento DB Principal",
  "startTime": 1704988800000,
  "endTime": 1704989723000,
  "duration": 923.45,
  "eventCount": 1847,
  "bytesRecorded": 156789,
  "encrypted": false,
  "createdAt": 1704988800000,
  "filepath": "C:\\Users\\...\\recordings\\rec_1704988800000_a3f8d9.cast",
  "filename": "rec_1704988800000_a3f8d9.cast"
}
```

**Campos importantes:**
- `id`: Identificador único de la grabación
- `title`: Nombre descriptivo (generalmente usuario@host)
- `host`, `username`, `port`: Datos de conexión para filtrado
- `duration`: Duración en segundos
- `eventCount`: Número total de eventos capturados
- `bytesRecorded`: Tamaño de datos capturados
- `encrypted`: Indica si está cifrada (para futuras versiones)

---

## 🔐 Seguridad y Privacidad

### Almacenamiento Local

✅ **Ventajas:**
- Los datos nunca salen de tu máquina
- Sin dependencias de servicios externos
- Control total sobre los archivos
- Sin riesgo de fugas en la nube

⚠️ **Consideraciones:**
- Asegura backups regulares si las grabaciones son importantes
- Los archivos están en texto plano por defecto
- Protege el acceso físico al equipo

### Cifrado (Planeado)

El sistema está preparado para integración con `SecureStorage`:

```javascript
// Futuro: Guardar grabación cifrada
await recordingManager.saveRecording(recording, encrypt: true);

// Futuro: Requiere master password para acceder
const recording = await recordingManager.loadRecording(recordingId);
```

### Datos Sensibles

⚠️ **Las grabaciones pueden contener:**
- Contraseñas visibles en comandos
- Claves API y tokens
- Información confidencial de sistemas
- Datos personales en logs

🛡️ **Recomendaciones:**
1. No ejecutes comandos con contraseñas visibles si estás grabando
2. Usa variables de entorno o archivos de configuración
3. Revisa las grabaciones antes de compartirlas
4. Elimina grabaciones que ya no necesites
5. Considera cifrar grabaciones sensibles manualmente

### Políticas de Retención

Sugerencias para gestión de grabaciones:

| Tipo de Sesión | Retención Sugerida |
|----------------|-------------------|
| Operaciones rutinarias | 7 días |
| Troubleshooting | 30 días |
| Cambios críticos | 1 año |
| Auditoría de seguridad | Según normativa |
| Formación/Documentación | Indefinido |

---

## 🐛 Solución de Problemas

### La grabación no inicia

**Síntomas:** Click en "Iniciar grabación" no hace nada o muestra error

**Soluciones:**
1. Verifica que la conexión SSH esté activa
2. Revisa la consola de desarrollo (F12) por errores
3. Reinicia la aplicación completamente
4. Verifica que `preload.js` incluya el patrón `/^recording:.*$/`

**Logs a revisar:**
```javascript
// En consola del renderer
console.log(window.electron?.ipcRenderer); // Debe existir

// En consola de Electron
// Busca: "✅ Recording handlers registrados"
```

### No aparecen las grabaciones

**Síntomas:** Panel de auditoría vacío o sin grabaciones esperadas

**Soluciones:**
1. Verifica la ubicación: `%APPDATA%\NodeTerm\recordings\`
2. Comprueba que existan archivos `.meta.json`
3. Verifica filtros: el panel filtra por host + usuario
4. Revisa permisos de lectura del directorio

**Comando de verificación:**
```powershell
# En PowerShell
dir $env:APPDATA\NodeTerm\recordings\
```

### El reproductor no funciona

**Síntomas:** La grabación se abre pero no se reproduce

**Soluciones:**
1. Verifica que el archivo `.cast` no esté corrupto
2. Comprueba que xterm.js esté cargado correctamente
3. Revisa errores en consola de desarrollo
4. Intenta exportar y abrir con asciinema-player externo

### Grabaciones corruptas

**Síntomas:** Error al cargar o reproducir una grabación

**Soluciones:**
1. El archivo `.cast` debe ser JSON válido (primera línea) + eventos
2. Usa un editor de texto para verificar la estructura
3. Si está corrupto, elimínalo para liberar espacio
4. Evita cerrar NodeTerm bruscamente durante una grabación

### Mucho espacio en disco

**Síntomas:** Carpeta `recordings` ocupa mucho espacio

**Soluciones:**
1. Usa el panel de auditoría para eliminar grabaciones antiguas
2. Exporta grabaciones importantes antes de eliminar
3. Considera implementar rotación automática
4. Comprime archivos `.cast` manualmente con gzip si es necesario

---

## 📚 Referencias

### Documentación Relacionada

- [Sistema de Encriptación](./SISTEMA_ENCRIPTACION.md) - Cifrado de datos sensibles
- [Sistema de Actualización](./SISTEMA_ACTUALIZACION.md) - Gestión de actualizaciones
- [Cygwin Preempaquetado](./CYGWIN_PREPACKAGED.md) - Terminal embebido

### Recursos Externos

- [asciicast v2 Format](https://github.com/asciinema/asciinema/blob/develop/doc/asciicast-v2.md) - Especificación del formato
- [asciinema-player](https://github.com/asciinema/asciinema-player) - Reproductor web
- [xterm.js](https://xtermjs.org/) - Motor de terminal
- [Electron IPC](https://www.electronjs.org/docs/latest/api/ipc-main) - Comunicación entre procesos

### Herramientas Compatibles

| Herramienta | Propósito | URL |
|-------------|-----------|-----|
| asciinema | Suite completa de grabación | https://asciinema.org/ |
| asciinema-player | Reproductor web embebible | https://github.com/asciinema/asciinema-player |
| asciicast2gif | Convertir a GIF animado | https://github.com/asciinema/asciicast2gif |
| svg-term-cli | Convertir a SVG | https://github.com/marionebl/svg-term-cli |

---

## 📝 Notas de Versión

### v1.0.0 (11 Enero 2025)

✨ **Implementación Inicial**

**Funcionalidades:**
- ✅ Grabación en tiempo real de sesiones SSH
- ✅ Soporte para SSH directo y Bastion/Wallix
- ✅ Panel de auditoría con lista de grabaciones
- ✅ Reproductor integrado con controles completos
- ✅ Exportación a formato asciicast v2 estándar
- ✅ Eliminación de grabaciones
- ✅ Estadísticas por conexión

**Archivos Creados:**
- `src/services/SessionRecorder.js`
- `src/services/SessionRecordingManager.js`
- `src/main/handlers/recording-handlers.js`
- `src/components/AuditTab.js`
- `src/components/RecordingPlayerTab.js`
- `src/hooks/useRecordingManagement.js`

**Modificaciones:**
- `main.js` - Integración de captura SSH
- `preload.js` - Exposición de IPC handlers
- `src/components/contextmenus/TerminalContextMenu.js` - Botón de grabación
- `src/hooks/useSidebarManagement.js` - Menú de auditoría
- `src/components/TabContentRenderer.js` - Renderizado de nuevos tabs
- `src/components/App.js` - Integración de hook de grabación
- `src/components/MainContentArea.js` - Props de grabación

---

## 🤝 Contribución

### Mejoras Sugeridas

Si quieres contribuir al sistema de auditoría, considera:

1. **Búsqueda de texto**: Buscar dentro del contenido de grabaciones
2. **Marcadores**: Agregar timestamps y comentarios
3. **Filtros avanzados**: Por fecha, duración, tamaño
4. **Exportación a GIF**: Para documentación visual
5. **Compresión automática**: Reducir espacio en disco
6. **Cifrado integrado**: Protección de grabaciones sensibles
7. **Compartir seguro**: Subida encriptada a Nextcloud

### Reportar Problemas

Si encuentras un bug o tienes una sugerencia:

1. Revisa la sección "Solución de Problemas" primero
2. Verifica los logs en consola de desarrollo
3. Anota los pasos para reproducir el problema
4. Incluye versión de NodeTerm y SO

---

**Documentación actualizada:** 11 Enero 2025  
**Versión del sistema:** 1.0.0  
**Estado:** ✅ Producción

---

*Esta documentación es parte del proyecto NodeTerm. Para más información, consulta el README principal.*

