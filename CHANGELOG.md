# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.2] - Por definir

### 🔧 Mejoras y Correcciones
- **Actualización de Versión**: Actualización a versión 1.6.2 con mejoras generales

## [1.6.1] - 2025-11-19

### 🐛 Correcciones de Bugs
- **Fix de Conexión WALLIX**: Corrección de problemas con conexiones a través de Bastion Wallix

## [1.6.0] - 2025-11-19

### 🤖 Nuevas Características - Sistema Completo de IA y Chat
- **Chat de IA Integrado**: Sistema completo de chat con múltiples proveedores (OpenAI GPT, Anthropic Claude, Google Gemini, Ollama)
- **Soporte Multi-Proveedor**: Integración nativa con OpenAI GPT, Anthropic Claude, Google Gemini, y modelos locales Ollama
- **Gestión de Conversaciones**: Sistema completo de historial con carpetas, favoritos y búsqueda avanzada
- **Análisis de Código con IA**: Análisis inteligente de archivos de código con soporte para múltiples lenguajes de programación
- **Adjuntos de Archivos**: Soporte completo para adjuntar y analizar archivos (PDF, DOCX, JSON, XML, CSV, TXT, código fuente)
- **Detección Inteligente de Archivos**: Sistema avanzado de detección de tipos de archivo y lenguajes de programación
- **Formateo Markdown**: Renderizado completo de markdown con resaltado de sintaxis profesional
- **Gestión de Tokens**: Sistema de gestión de tokens con contadores en tiempo real y configuración por modelo
- **Rendimiento Optimizado**: Configuración de tokens por modelo (LOW/MEDIUM/HIGH) para máximo rendimiento
- **Interfaz Moderna de Chat**: Diseño moderno y responsive para el chat de IA
- **Vista de Historial**: Panel lateral con historial completo de conversaciones
- **Búsqueda Avanzada**: Búsqueda rápida en conversaciones y archivos
- **Motor de Análisis de Código**: Motor avanzado de análisis de código con soporte multi-lenguaje

### 🔌 Integración MCP (Model Context Protocol)
- **Sistema MCP Completo**: Integración nativa con Model Context Protocol para extender capacidades de IA
- **MCP con Modelos Locales**: Soporte para usar MCP tools con modelos locales (Ollama, DeepSeek, Llama) mediante System Prompt
- **MCP SSH/Terminal Nativo**: Servidor MCP nativo para ejecutar comandos localmente (WSL, Ubuntu, Kali, Cygwin, PowerShell) y remotamente (SSH)
- **MCP Filesystem**: Acceso completo al sistema de archivos a través de MCP
- **MCP Web Search Nativo**: Búsqueda web integrada con JavaScript nativo
- **MCP Tenable**: Integración con Tenable para seguridad y auditoría
- **Gestión de MCPs**: Interfaz completa para configurar, activar y gestionar servidores MCP
- **Catálogo de MCPs**: Catálogo integrado con información detallada de servidores MCP disponibles
- **Tools Orchestrator**: Sistema inteligente para orquestar múltiples herramientas MCP
- **Indicadores Visuales**: Indicadores en tiempo real de ejecución de herramientas MCP
- **MCPService**: Servicio completo para gestión de servidores MCP
- **MCPClientService**: Cliente robusto para comunicación con servidores MCP
- **Servidores MCP Nativos**: SSH/Terminal, Filesystem, Web Search, Tenable
- **Gestión de Estado**: Sistema centralizado para estado de servidores MCP

### 🌐 Integración AnythingLLM
- **AnythingLLM Integrado**: Integración completa con AnythingLLM para RAG (Retrieval Augmented Generation)
- **MCP Filesystem para AnythingLLM**: Acceso al sistema de archivos desde AnythingLLM
- **Configuración Docker**: Gestión automática de contenedores Docker para AnythingLLM
- **Guía Completa**: Documentación detallada para configuración y uso

### 🌐 Integración OpenWebUI
- **OpenWebUI Integrado**: Interfaz web moderna para interactuar con modelos de lenguaje
- **Gestión Automática de Docker**: Inicio y gestión automática de contenedores OpenWebUI
- **Webview Embebido**: Interfaz integrada directamente en NodeTerm
- **Configuración Flexible**: Variables de entorno personalizables

### 🐳 Conexiones Docker
- **Terminales Docker**: Conexión directa a contenedores Docker con terminales interactivas
- **Listado de Contenedores**: Visualización de contenedores en ejecución
- **Status Bar para Docker**: Información en tiempo real de recursos del contenedor
- **Gestión de Sesiones**: Múltiples sesiones Docker simultáneas

### 🖥️ Mejoras de Terminales
- **Terminales Mejorados**: Mejoras significativas en todos los tipos de terminales
- **Cygwin Mejorado**: Mejor integración y ejecución automática de comandos locales
- **Status Bar Standalone**: Barra de estado independiente para terminales locales
- **Switch de Terminales**: Cambio fluido entre diferentes tipos de terminales
- **Auto-detección de Comandos**: Detección inteligente de tipo de comando (Linux/Windows)

### 🔄 Sistema de Actualización Automática
- **Actualizaciones desde GitHub Releases**: Sistema completo de actualización automática
- **Configuración Avanzada**: Control completo sobre cuándo y cómo actualizar
- **Canales Stable/Beta**: Elige entre versiones estables o beta
- **Notificaciones Inteligentes**: Recibe avisos de nuevas versiones sin interrupciones
- **Actualizaciones Seguras**: Todas las actualizaciones están firmadas y verificadas
- **Descarga en Background**: Sin interrumpir tu flujo de trabajo

### 🎨 Mejoras de UI/UX
- **Nueva Pestaña de Actualizaciones**: Interfaz dedicada en configuración
- **Interfaz de Chat IA**: Interfaz moderna y responsive para el chat de IA
- **Indicadores Visuales**: Estado claro de actualizaciones disponibles y ejecución de herramientas
- **Proceso Transparente**: Información detallada del progreso de actualización
- **Configuración Flexible**: Personaliza intervalos y canales de actualización
- **Mejoras de Layout**: Correcciones y mejoras en el diseño general

### 🔧 Mejoras Técnicas
- **Integración electron-updater**: Sistema robusto de actualización automática
- **Gestión de Versiones**: Control avanzado de versiones y compatibilidad
- **Seguridad Reforzada**: Verificación de firmas y checksums
- **Arquitectura Mejorada**: Mejor separación de responsabilidades
- **Sistema de Memoria de Modelos**: Gestión inteligente de memoria para modelos Ollama
- **Refactorización Completa**: Refactorización del sistema de IA con proveedores modulares
- **Gestión de Contexto**: Sistema avanzado de gestión de contexto para conversaciones largas
- **Cache de Ejecución de Tools**: Sistema de caché para optimizar ejecución de herramientas
- **Arquitectura Modular de IA**: Refactorización completa del sistema de IA con proveedores modulares (BaseProvider, OpenAIProvider, AnthropicProvider, GoogleProvider, OllamaProvider)
- **Nuevos Servicios**: AIService, MCPService, ConversationService, FileAnalysisService, ModelMemoryService
- **Componentes Modulares**: AIChatPanel, AIConfigDialog, MCPManagerTab, AnythingLLMTab, OpenWebUITab
- **Estado Centralizado**: Mejor gestión del estado de conversaciones y MCPs
- **Encriptación de Conversaciones**: Almacenamiento seguro de conversaciones

### 🎥 Sistema de Auditoría y Grabación de Sesiones
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
- **Exportación y Compatibilidad**: Exportación a archivos `.cast` estándar, compatible con asciinema-player

### 🐛 Correcciones de Bugs

#### 🤖 Correcciones de Chat IA
- **Fix de Conversaciones Mezcladas**: Corrección de problemas con conversaciones que se mezclaban
- **Fix de Conversaciones Antiguas**: Mejoras en la carga de conversaciones antiguas
- **Fix de UI Chat IA**: Múltiples correcciones en la interfaz de chat
- **Fix de Tool Results**: Corrección de problemas con resultados de herramientas MCP
- **Fix de Markdown**: Mejoras en el renderizado de markdown
- **Fix de Mensajes Vacíos**: Corrección de problemas con mensajes sin contenido
- **Fix de Gestión de Contexto**: Mejoras en la gestión de contexto para conversaciones largas

#### 🔄 Correcciones de Actualizaciones
- **Gestión de Versiones**: Corrección de problemas al verificar versiones
- **Descarga de Actualizaciones**: Mejoras en el proceso de descarga
- **Instalación**: Mejor manejo del proceso de instalación
- **Notificaciones**: Corrección de problemas en notificaciones de actualización

#### 🖥️ Correcciones de Terminales
- **Fix de Terminales**: Mejoras en la estabilidad de terminales
- **Fix de Cygwin**: Correcciones en la integración con Cygwin
- **Fix de Switch**: Mejoras en el cambio entre tipos de terminales
- **Fix de Delay de Inicio**: Corrección de problemas de retraso al iniciar

#### 🐳 Correcciones de Docker
- **Fix de Docker**: Correcciones en la integración con Docker
- **Fix de Conexiones**: Mejoras en la gestión de conexiones Docker
- **Fix de Status Bar**: Correcciones en la barra de estado de Docker

#### 🔧 Correcciones de Rendimiento
- **Gestión de Memoria**: Optimización en el manejo de actualizaciones y modelos IA
- **Carga de Datos**: Mejor rendimiento al verificar actualizaciones y cargar conversaciones
- **Renderizado**: Los componentes se renderizan más eficientemente

#### 🎯 Correcciones Generales
- **Estabilidad General**: Mejoras significativas en la estabilidad de la aplicación
- **UI/UX**: Corrección de problemas visuales en la interfaz
- **Compatibilidad**: Mejor compatibilidad con diferentes sistemas operativos
- **Optimización de Rendimiento**: Mejoras en la carga de componentes

## [1.5.9] - 2025-11-19

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

## [1.5.8] - 2025-01-XX (En Desarrollo)

### 🚧 Desarrollo
- **Rama de Desarrollo**: Preparación para nuevas funcionalidades
- **Mejoras de Estabilidad**: Correcciones y optimizaciones internas

## [1.5.7] - 2025-10-02

### 🔧 Correcciones de Bugs
- **Fix de Checksum Final**: Versión definitiva con checksum corregido
- **Actualización de Dependencias**: package-lock.json actualizado
- **Instalador Funcional**: Resuelve problemas de actualización

## [1.5.6] - 2025-10-02

### 🐛 Correcciones de Bugs
- **Fix de Checksum Issue**: Corrección del error "sha512 checksum mismatch"
- **Instalador Corregido**: Nuevo instalador con checksum válido
- **Mejor Manejo de Errores**: Enhanced error handling para futuros problemas de checksum
- **Nota Importante**: Usuarios deben actualizar de v1.5.4 → v1.5.6 (saltar v1.5.5)


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
