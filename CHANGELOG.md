# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.9] - 2025-01-13

### 🔐 Nuevas Características - Password Manager
- **Integración de KeePass**: Sistema completo de gestor de contraseñas
- **Sidebar de Password Manager**: Panel lateral para gestión de credenciales
- **Importación de KeePass**: Importa bases de datos .kdbx
- **Panel de Importación**: Nueva interfaz para importar credenciales
- **Auto-completado de Credenciales**: Relleno automático de formularios SSH/RDP

### 🎨 Mejoras de UI/UX
- **Nueva Sidebar**: Panel lateral para gestión de contraseñas
- **Diálogos Mejorados**: Mejor UX en importación de KeePass
- **Iconos y Temas**: Nuevos iconos para password manager

### 🔧 Mejoras Técnicas
- **Servicios de KeePass**: Integración con kdbxweb
- **Gestión de Estado**: Mejor manejo de credenciales
- **Seguridad Mejorada**: Encriptación de credenciales importadas

### 🐛 Correcciones de Bugs
- **Estabilidad General**: Mejoras en la estabilidad de la aplicación
- **Optimización de Rendimiento**: Mejoras en la carga de componentes

## [1.6.0] - 2025-01-11

### 🎥 Nueva Funcionalidad: Sistema de Auditoría y Grabación de Sesiones

- **Grabación de Sesiones SSH**: Captura completa de entrada/salida en tiempo real
  - Formato estándar asciicast v2 (compatible con asciinema)
  - Soporte para conexiones SSH directas y con Bastion/Wallix
  - Control desde menú contextual del terminal (⏺ Iniciar / ⏹ Detener)
  - Captura automática sin impacto en el rendimiento

- **Panel de Auditoría**: Nueva pestaña para gestionar grabaciones
  - Acceso desde menú contextual de conexión SSH (📼 Auditoría)
  - Lista filtrada por host y usuario
  - Estadísticas: total de grabaciones, duración, tamaño
  - Acciones: Reproducir, Exportar, Eliminar

- **Reproductor Integrado**: Playback profesional de grabaciones
  - Controles completos: Play, Pause, Stop, Reiniciar
  - Velocidad ajustable (0.5x - 3x)
  - Barra de progreso interactiva
  - Renderizado con xterm.js (mismo motor que terminal)
  - Display de tiempo transcurrido / total

- **Exportación y Compatibilidad**:
  - Exportación a archivos `.cast` estándar
  - Compatible con asciinema-player y otras herramientas
  - Almacenamiento local en `userData/recordings/`
  - Metadata separada para búsqueda rápida

### 🔧 Mejoras Técnicas

- **Backend (Proceso Principal)**:
  - Nueva clase `SessionRecorder` para captura en tiempo real
  - Nueva clase `SessionRecordingManager` para gestión de archivos
  - IPC handlers: `recording:start`, `recording:stop`, `recording:list`, etc.
  - Integración no invasiva en flujo SSH existente
  
- **Frontend (Proceso Renderer)**:
  - Nuevo componente `AuditTab` para lista de grabaciones
  - Nuevo componente `RecordingPlayerTab` para reproducción
  - Hook `useRecordingManagement` para gestión de estado
  - Integración en menús contextuales (terminal y sidebar)
  - Soporte para nuevos tipos de tabs (`audit`, `recording-player`)

- **Preload Script**:
  - Nuevos canales IPC permitidos: `/^recording:.*$/`
  - Exposición segura de métodos de grabación

### 📖 Documentación

- **Nueva Guía Completa**: [docs/GUIA_AUDITORIA_SESIONES.md](docs/GUIA_AUDITORIA_SESIONES.md)
  - Introducción y casos de uso
  - Guía de usuario detallada con ejemplos visuales
  - Arquitectura técnica y flujos de datos
  - Especificación de formato de datos
  - Seguridad y privacidad
  - Solución de problemas
  - Referencias y herramientas compatibles

- **README Actualizado**: Nueva sección sobre sistema de auditoría

### 📁 Archivos Nuevos

```
src/services/
├── SessionRecorder.js               # Motor de grabación en tiempo real
└── SessionRecordingManager.js       # Gestión de almacenamiento

src/main/handlers/
└── recording-handlers.js            # IPC handlers para grabaciones

src/components/
├── AuditTab.js                      # UI de lista de grabaciones
└── RecordingPlayerTab.js            # UI de reproductor

src/hooks/
└── useRecordingManagement.js        # Hook React para grabaciones

docs/
└── GUIA_AUDITORIA_SESIONES.md       # Documentación completa
```

### 📁 Archivos Modificados

- `main.js` - Integración de captura SSH
- `preload.js` - Exposición de canales IPC
- `src/components/contextmenus/TerminalContextMenu.js` - Botón de grabación
- `src/hooks/useSidebarManagement.js` - Menú de auditoría
- `src/components/TabContentRenderer.js` - Renderizado de nuevos tabs
- `src/components/App.js` - Integración de hook
- `src/components/MainContentArea.js` - Props de grabación

### 🎯 Casos de Uso

1. **Auditoría de Seguridad**: Registro de acciones en servidores críticos
2. **Debugging**: Reproducir secuencias que causaron errores
3. **Documentación**: Crear tutoriales paso a paso
4. **Formación**: Compartir sesiones de ejemplo
5. **Compliance**: Cumplir requisitos de trazabilidad

### 🚀 Características Futuras Planificadas

- [ ] Indicador visual de grabación activa en tab
- [ ] Búsqueda de texto dentro de grabaciones
- [ ] Marcadores/timestamps en grabaciones
- [ ] Exportación a GIF animado
- [ ] Cifrado de grabaciones sensibles
- [ ] Limpieza automática de grabaciones antiguas
- [ ] Compresión de grabaciones
- [ ] Anotaciones en reproducción

---

## [1.5.5] - 2024-12-21

### 🎨 Mejoras de Temas y Personalización
- **Sistema de Temas Avanzado**: Nuevo gestor de temas para pestañas con mayor flexibilidad
- **Temas Personalizados**: Soporte para temas personalizados con configuración granular
- **Selector de Temas Mejorado**: Interfaz más intuitiva para selección de temas
- **Persistencia de Temas**: Los temas seleccionados se mantienen entre sesiones

### 🔧 Mejoras Técnicas
- **Gestión de Temas Optimizada**: Mejor rendimiento en la carga y aplicación de temas
- **Código Más Modular**: Refactorización del sistema de temas para mejor mantenibilidad
- **Mejor Organización**: Estructura más clara para la gestión de temas

### 🐛 Correcciones de Bugs
- **Corrección de Temas**: Mejor aplicación de temas en pestañas
- **Fix de Persistencia**: Los temas se mantienen correctamente al reiniciar
- **Corrección de Rendimiento**: Mejoras en la carga de temas personalizados

## [1.5.4] - 2024-12-20

### 🚀 Optimizaciones de Rendimiento
- **Optimización del main.js**: Refactorización completa del archivo principal de Electron
- **Mejor Gestión de Memoria**: Optimización de la gestión de recursos del sistema
- **Reducción de Tiempo de Inicio**: Mejoras en el tiempo de arranque de la aplicación
- **Optimización de IPC**: Mejor comunicación entre procesos principal y renderer

### 🔧 Mejoras Técnicas
- **Código Más Limpio**: Refactorización de funciones y mejor organización del código
- **Mejor Manejo de Errores**: Mejores mensajes de error y logging
- **Optimización de Dependencias**: Mejor gestión de módulos nativos
- **Preparación para Escalabilidad**: Arquitectura más robusta para futuras funcionalidades

### 🐛 Correcciones de Bugs
- **Corrección de Memory Leaks**: Eliminación de fugas de memoria en el proceso principal
- **Mejor Estabilidad**: Corrección de crashes ocasionales durante el inicio
- **Fix de Reconexión**: Mejor manejo de reconexiones automáticas
- **Corrección de Timeouts**: Mejor gestión de timeouts en conexiones SSH

### 📁 Cambios en Estructura
- **Reorganización de main.js**: Mejor estructura y modularidad
- **Optimización de Handlers**: Mejor organización de manejadores de eventos
- **Mejor Separación de Responsabilidades**: Código más mantenible

## [1.5.3] - 2024-12-19

### ✨ Nuevas Características
- **Sistema de Importación de Sesiones**: Importa conexiones desde archivos XML (mRemoteNG, etc.)
- **Selector de Colores Avanzado**: Personalización completa de temas con paleta de colores
- **Sidebar Colapsable Inteligente**: Mejor gestión del espacio y experiencia de usuario
- **Duplicación de Conexiones**: Duplica carpetas y conexiones fácilmente
- **Modo Vinculado**: Importación automática desde archivos externos
- **Opciones Avanzadas en Diálogos**: Mejor UX en formularios SSH/RDP

### 🎨 Mejoras de UI/UX
- **Refactor Completo de Estilos CSS**: Nueva estructura organizada y modular
- **Temas Mejorados**: Iconos y colores más elegantes
- **UI Responsiva**: Mejor adaptación a diferentes tamaños de pantalla
- **Diálogos Mejorados**: Mejor experiencia en formularios de conexión
- **Sidebar con Transiciones Suaves**: Animaciones elegantes al colapsar/expandir

### 🔧 Mejoras Técnicas
- **Nueva Estructura de Estilos**: Organización modular en `src/styles/`
- **Componentes CSS Separados**: Mejor mantenibilidad del código
- **Optimización de Rendimiento**: Mejoras en la gestión de memoria
- **Mejor Gestión de Estado**: Optimización de re-renders

### 🐛 Correcciones de Bugs
- **Corrección de Scroll en Sidebar**: Eliminado scroll innecesario
- **Fix de Reconexión PowerShell**: Mejor estabilidad en terminales locales
- **Corrección de Tamaños**: Mejor gestión de dimensiones en sidebar
- **Fix de Menús Contextuales**: Mejor funcionamiento de menús
- **Corrección de Formularios**: Desbloqueo correcto de formularios

### 📁 Cambios en Estructura
- **Nueva Organización CSS**:
  - `src/styles/base/` - Estilos base
  - `src/styles/components/` - Componentes específicos
  - `src/styles/layout/` - Layouts y estructura
  - `src/styles/pages/` - Páginas específicas
  - `src/styles/themes/` - Temas y personalización

### 🔄 Cambios en Funcionalidad
- **Importación de Sesiones**: Soporte para múltiples formatos XML
- **Gestión de Carpetas**: Mejor organización de conexiones
- **Sincronización**: Mejoras en la sincronización de configuraciones
- **Temas**: Mayor flexibilidad en personalización

## [1.5.2] - 2024-12-15

### ✨ Nuevas Características
- **Major Performance Optimization**: React Re-render Optimization
- **Memoización de Componentes**: TabHeader, TabContentRenderer, Sidebar
- **Refactor de App.js**: Extracción de MainContentArea

### 🚀 Mejoras de Rendimiento
- **Reducción de 30-40%** en re-renders innecesarios
- **Optimización de Props**: Uso de useCallback y useMemo
- **Mejor Arquitectura**: Componentes más modulares
- **App.js Reducido**: De ~1100 a ~900 líneas

### 🎨 Mejoras de UI
- **Drag & Drop Más Fluido**: Mejor respuesta de la interfaz
- **Mejor Respuesta de UI**: Interfaz más responsiva
- **Código Más Modular**: Mejor mantenibilidad

### 🧪 Preparación para Testing
- **Arquitectura Mejorada**: Preparación para testing automatizado
- **Código Más Limpio**: Mejor estructura para mantenimiento

## [1.5.1] - 2024-12-10

### ✨ Nuevas Características
- **Favoritos y Conexiones Recientes**: Sistema de favoritos implementado
- **Estado de NodeTerm**: Información del sistema en tiempo real
- **Iconos para Distribuciones**: Detección automática de distros Linux
- **Status Bar para Terminales Locales**: PowerShell y WSL

### 🎨 Mejoras de UI
- **Iconos para Unidades de Red**: Mejor identificación visual
- **Estado Visual**: Indicadores de estado del sistema
- **Mejor Organización**: Agrupación de conexiones

### 🔧 Mejoras Técnicas
- **Mejor Gestión de Estado**: Optimización de componentes
- **Iconos Dinámicos**: Detección automática de sistemas
- **Status Bar Inteligente**: Información contextual

## [1.4.1] - 2024-12-05

### ✨ Nuevas Características
- **Soporte Completo RDP**: Conexiones RDP con smart sizing
- **Mejoras de Estabilidad**: Mejor rendimiento general

### 🐛 Correcciones de Bugs
- **Corrección de Errores RDP**: Mejor funcionamiento desde sidebar
- **Mejoras de Estabilidad**: Corrección de bugs menores

### 🎨 Mejoras de UI
- **UI Refinada**: Interfaz más moderna
- **Sincronización Mejorada**: Mejor sync entre escritorio y web

## [1.4.0] - 2024-12-01

### ✨ Nuevas Características
- **Exportación/Importación**: Sistema de configuración
- **Sincronización Mejorada**: Entre escritorio y web

### 🎨 Mejoras de UI
- **UI Refinada**: Interfaz más moderna
- **Mejoras de Estabilidad**: Mejor rendimiento

### 🐛 Correcciones de Bugs
- **Corrección de Bugs**: Varias correcciones menores
- **Optimizaciones**: Mejoras de rendimiento

## [1.3.0] - 2024-11-25

### ✨ Nuevas Características
- **Menús Contextuales**: Para explorador de sesiones
- **Menú Contextual en Área Vacía**: Mejor UX

### 🎨 Mejoras de UI
- **Interface Más Limpia**: Sin botones inline
- **Mejor Experiencia**: Menús más intuitivos

## [1.2.0] - 2024-11-20

### ✨ Nuevas Características
- **Sistema de Versionado**: Implementado completamente
- **Diálogo "Acerca de"**: Información completa de la aplicación
- **Versión en Status Bar**: Información de versión visible

### 🎨 Mejoras de UI
- **Interfaz Mejorada**: Diseño más profesional
- **Mejor Información**: Datos de versión accesibles

## [1.1.0] - 2024-11-15

### ✨ Nuevas Características
- **Panel Lateral Optimizado**: Mejor organización
- **Iconos Automáticos**: Por distribución Linux
- **Sistema de Overflow Inteligente**: Mejor gestión de espacio
- **Funcionalidad Move-to-Front**: Mejor navegación

### 🐛 Correcciones de Bugs
- **Corrección de Memory Leaks**: Mejor gestión de memoria
- **Mejoras de Estabilidad**: Corrección de bugs menores

---

## Tipos de Cambios

- **✨ Nuevas Características**: Para nuevas funcionalidades
- **🎨 Mejoras de UI/UX**: Para cambios en la interfaz de usuario
- **🔧 Mejoras Técnicas**: Para mejoras en el código y arquitectura
- **🐛 Correcciones de Bugs**: Para corrección de errores
- **📁 Cambios en Estructura**: Para cambios en la organización del proyecto
- **🔄 Cambios en Funcionalidad**: Para modificaciones en funcionalidades existentes
- **🚀 Mejoras de Rendimiento**: Para optimizaciones de rendimiento
- **🧪 Preparación para Testing**: Para cambios relacionados con testing
