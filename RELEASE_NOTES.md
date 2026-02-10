# 🚀 NodeTerm v1.6.3 - Release Notes

**Fecha de Release**: 2026-02-10  
**Tipo de Release**: Feature & Patch Release  
**Versión Anterior**: v1.6.2

---

## 🎉 ¡Bienvenido a NodeTerm v1.6.3!

Esta actualización es un gran salto adelante que incluye soporte para **múltiples instancias**, un **asistente de importación rediseñado** y la posibilidad de gestionar **favoritos directamente desde la sidebar**, además de multitud de correcciones de estabilidad.

---

## ✨ Características Principales

### 🔄 Soporte para Múltiples Instancias
- **Ejecución Simultánea**: Ahora puedes abrir varias ventanas de NodeTerm al mismo tiempo.
- **Sincronización en Tiempo Real**: Los cambios en conexiones, favoritos o configuraciones se sincronizan instantáneamente entre todas las instancias abiertas.
- **Gestión de Recursos**: Optimización del uso de memoria al detectar procesos compartidos.

### 📥 Refactor del Asistente de Importación
- **Nueva Interfaz**: Rediseño completo del diálogo de importación para mayor claridad.
- **Asistente Paso a Paso**: Proceso de importación más guiado y robusto.
- **Mejor Compatibilidad**: Mejoras en la detección e importación de formatos externos.

### ⭐ Favoritos desde la Sidebar
- **Acceso Rápido**: Añade o quita cualquier conexión de favoritos directamente desde el menú contextual.
- **Gestión Unificada**: Los cambios se reflejan inmediatamente en la pestaña Home.
- **Soporte para Túneles**: Ahora los túneles SSH también pueden ser marcados como favoritos y lanzados desde la UI central.

### 🔧 Multitud de Fixes y Mejoras
- **Estabilidad de Túneles**: Corregido el error que impedía conectar a túneles guardados en favoritos.
- **Correcciones Visuales**: Ajustes en el layout y temas para una experiencia más pulida.
- **Rendimiento**: Optimizaciones en la carga de listas grandes de conexiones.

---

### 🔌 Túneles SSH Mejorados
- **Verificación de Puertos**: Verificación automática de puertos libres antes de crear túneles SSH
- **Limpieza Automática**: Cierre automático de túneles anteriores que usen el mismo puerto local
- **Gestión de Recursos**: Prevención de puertos ocupados y túneles huérfanos
- **Limpieza al Cerrar**: Todos los túneles SSH se cierran correctamente al cerrar la aplicación
- **Mensajes de Error Claros**: Información detallada cuando un puerto está ocupado por otra aplicación
- **Soporte Completo**: Funciona con túneles locales, remotos y proxies SOCKS dinámicos

### 🚀 Optimizaciones de Arranque
- **Arranque Mucho Más Rápido**: Optimizaciones significativas que reducen drásticamente el tiempo de inicio
- **Lazy Loading Inteligente**: Módulos pesados (SSH2, Docker, Guacamole, AnythingLLM, OpenWebUI) se cargan solo cuando se necesitan
- **Inicialización Diferida**: Servicios pesados se inicializan después de que la ventana esté visible, mejorando la percepción de velocidad
- **Registro Progresivo**: Handlers críticos se registran inmediatamente, secundarios después de 50ms para no bloquear la UI
- **Profiler Integrado**: Sistema de medición de tiempos de carga para monitorear y optimizar el arranque
- **Optimización de Desarrollo**: electron-reloader solo se carga en modo desarrollo, reduciendo el overhead en producción

### 🤖 Sistema Completo de IA y Chat
- **Chat de IA Integrado**: Sistema completo de chat con múltiples proveedores (OpenAI, Anthropic, Google, Ollama)
- **Soporte Multi-Proveedor**: Integración nativa con OpenAI GPT, Anthropic Claude, Google Gemini, y modelos locales Ollama
- **Gestión de Conversaciones**: Sistema completo de historial con carpetas, favoritos y búsqueda avanzada
- **Análisis de Código con IA**: Análisis inteligente de archivos de código con soporte para múltiples lenguajes
- **Adjuntos de Archivos**: Soporte completo para adjuntar y analizar archivos (PDF, DOCX, JSON, XML, CSV, TXT, código fuente)
- **Detección Inteligente de Archivos**: Sistema avanzado de detección de tipos de archivo y lenguajes de programación
- **Formateo Markdown**: Renderizado completo de markdown con resaltado de sintaxis profesional
- **Gestión de Tokens**: Sistema de gestión de tokens con contadores en tiempo real y configuración por modelo
- **Rendimiento Optimizado**: Configuración de tokens por modelo (LOW/MEDIUM/HIGH) para máximo rendimiento

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
- **Splits de Terminales SSH Mejorados**: 
  - **Selección de Orientación en Primer Split**: Al hacer el primer split de un terminal SSH, se muestra opciones para elegir entre división vertical u horizontal
  - **Fix de Split Horizontal**: Corrección del problema donde el split horizontal no funcionaba correctamente
  - **Apertura Automática en Splits Subsecuentes**: El 3er y 4to split se abren automáticamente sin pedir orientación para una experiencia más fluida

### 🎥 Sistema de Auditoría y Grabación de Sesiones
- **Grabación de Sesiones SSH**: Captura completa de entrada/salida en tiempo real
- **Panel de Auditoría**: Nueva pestaña para gestionar grabaciones
- **Reproductor Integrado**: Playback profesional de grabaciones con controles completos
- **Exportación y Compatibilidad**: Exportación a archivos `.cast` estándar, compatible con asciinema-player

### 🔄 Sistema de Actualización Automática
- **Actualizaciones desde GitHub Releases**: Sistema completo de actualización automática
- **Configuración Avanzada**: Control completo sobre cuándo y cómo actualizar
- **Canales Stable/Beta**: Elige entre versiones estables o beta
- **Notificaciones Inteligentes**: Recibe avisos de nuevas versiones sin interrupciones
- **Actualizaciones Seguras**: Todas las actualizaciones están firmadas y verificadas
- **Descarga en Background**: Sin interrumpir tu flujo de trabajo

---

## 🎨 Mejoras de UI/UX

### 🤖 Interfaz de Chat IA
- **Interfaz Moderna**: Diseño moderno y responsive para el chat de IA
- **Indicadores Visuales**: Estado claro de ejecución de herramientas MCP y respuestas del modelo
- **Gestión de Conversaciones**: Interfaz intuitiva para organizar conversaciones en carpetas
- **Vista de Historial**: Panel lateral con historial completo de conversaciones
- **Búsqueda Avanzada**: Búsqueda rápida en conversaciones y archivos

### 🔄 Sistema de Actualizaciones
- **Pestaña Dedicada**: Nueva sección en configuración para gestionar actualizaciones
- **Estado Visual**: Indicadores claros del estado de actualizaciones
- **Progreso en Tiempo Real**: Seguimiento del progreso de descarga e instalación
- **Configuración Intuitiva**: Interfaz fácil de usar para personalizar el comportamiento

### 🔧 Mejoras de Rendimiento
- **Descarga Optimizada**: Mejor rendimiento en la descarga de actualizaciones
- **Gestión Eficiente**: Optimización en el manejo de versiones
- **Proceso No Intrusivo**: Actualizaciones sin interrumpir el trabajo
- **Optimización de IA**: Mejoras significativas en el rendimiento del chat de IA

---

## 🔧 Mejoras Técnicas

### 🤖 Sistema de IA
- **Arquitectura Modular**: Refactorización completa del sistema de IA con proveedores modulares
- **Gestión de Contexto**: Sistema avanzado de gestión de contexto para conversaciones largas
- **Sistema de Memoria de Modelos**: Gestión inteligente de memoria para modelos Ollama
- **Cache de Ejecución de Tools**: Sistema de caché para optimizar ejecución de herramientas
- **Tool Orchestrator**: Sistema inteligente para orquestar múltiples herramientas MCP
- **Análisis de Código**: Motor avanzado de análisis de código con soporte multi-lenguaje

### 🔌 Integración MCP
- **MCPService**: Servicio completo para gestión de servidores MCP
- **MCPClientService**: Cliente robusto para comunicación con servidores MCP
- **Servidores MCP Nativos**: SSH/Terminal, Filesystem, Web Search, Tenable
- **Gestión de Estado**: Sistema centralizado para estado de servidores MCP
- **Catálogo de MCPs**: Sistema de catálogo con información detallada

### 🔄 Integración de Actualizaciones
- **electron-updater**: Integración completa con la librería profesional de actualizaciones
- **Gestión de Versiones**: Sistema robusto para manejo de versiones
- **Verificación de Firmas**: Seguridad de nivel militar para actualizaciones
- **Compatibilidad Total**: Soporte completo para Windows, Linux y macOS

### 🏗️ Arquitectura Mejorada
- **Nuevos Servicios**: AIService, MCPService, ConversationService, FileAnalysisService, ModelMemoryService
- **Componentes Modulares**: AIChatPanel, AIConfigDialog, MCPManagerTab, AnythingLLMTab, OpenWebUITab
- **Estado Centralizado**: Mejor gestión del estado de conversaciones y MCPs
- **Código Más Limpio**: Refactorización completa de componentes relacionados
- **Proveedores de IA**: BaseProvider, OpenAIProvider, AnthropicProvider, GoogleProvider, OllamaProvider

### 🧪 Seguridad y Privacidad
- **Actualizaciones Firmadas**: Todas las actualizaciones están firmadas y verificadas
- **Sin Servicios Externos**: Todo se procesa desde GitHub Releases oficial
- **Verificación de Checksums**: Validación automática de integridad
- **Encriptación de Conversaciones**: Almacenamiento seguro de conversaciones

---

## 🐛 Correcciones de Bugs

### 🤖 Correcciones de Chat IA
- **Fix de Conversaciones Mezcladas**: Corrección de problemas con conversaciones que se mezclaban
- **Fix de Conversaciones Antiguas**: Mejoras en la carga de conversaciones antiguas
- **Fix de UI Chat IA**: Múltiples correcciones en la interfaz de chat
- **Fix de Tool Results**: Corrección de problemas con resultados de herramientas MCP
- **Fix de Markdown**: Mejoras en el renderizado de markdown

### 🔄 Correcciones de Actualizaciones
- **Gestión de Versiones**: Corrección de problemas al verificar versiones
- **Descarga de Actualizaciones**: Mejoras en el proceso de descarga
- **Instalación**: Mejor manejo del proceso de instalación
- **Notificaciones**: Corrección de problemas en notificaciones de actualización

### 🖥️ Correcciones de Terminales
- **Fix de Terminales**: Mejoras en la estabilidad de terminales
- **Fix de Cygwin**: Correcciones en la integración con Cygwin
- **Fix de Switch**: Mejoras en el cambio entre tipos de terminales
- **Fix de Delay de Inicio**: Corrección de problemas de retraso al iniciar
- **Fix de Split Horizontal**: Corrección del problema donde el split horizontal en terminales SSH no funcionaba y siempre se abría como vertical

### 🐳 Correcciones de Docker
- **Fix de Docker**: Correcciones en la integración con Docker
- **Fix de Conexiones**: Mejoras en la gestión de conexiones Docker
- **Fix de Status Bar**: Correcciones en la barra de estado de Docker

### 🔧 Correcciones de Rendimiento
- **Gestión de Memoria**: Optimización en el manejo de actualizaciones y modelos IA
- **Carga de Datos**: Mejor rendimiento al verificar actualizaciones y cargar conversaciones
- **Renderizado**: Los componentes se renderizan más eficientemente
- **Arranque Optimizado**: Reducción significativa del tiempo de inicio gracias a lazy loading e inicialización diferida

### 🔌 Correcciones de Túneles SSH
- **Fix de Túneles Huérfanos**: Corrección de problemas donde los túneles quedaban abiertos al cerrar la app
- **Fix de Puertos Ocupados**: Mejor manejo de errores cuando un puerto está en uso
- **Fix de Limpieza**: Corrección de problemas de limpieza de recursos al cerrar túneles
- **Mejora de Estabilidad**: Los túneles ahora se gestionan de forma más robusta

### 🎯 Correcciones Generales
- **Estabilidad General**: Mejoras significativas en la estabilidad de la aplicación
- **UI/UX**: Corrección de problemas visuales en la interfaz
- **Compatibilidad**: Mejor compatibilidad con diferentes sistemas operativos
- **Optimización de Rendimiento**: Mejoras en la carga de componentes

---

## 📁 Cambios en la Estructura del Proyecto

### 🗂️ Nuevos Componentes
```
src/components/
├── AIChatPanel.js                    # Panel principal de chat IA
├── AIChatTab.js                      # Pestaña de chat IA
├── AIConfigDialog.js                 # Diálogo de configuración de IA
├── AIClientsTab.js                   # Pestaña de clientes de IA
├── AnythingLLMTab.js                 # Pestaña de AnythingLLM
├── OpenWebUITab.js                   # Pestaña de OpenWebUI
├── ConversationHistory.js            # Historial de conversaciones
├── AttachedFilesDisplay.js           # Visualización de archivos adjuntos
├── MCPManagerTab.js                  # Gestión de MCPs
├── MCPCatalog.js                     # Catálogo de MCPs
├── MCPActiveTools.js                 # Herramientas MCP activas
├── DockerTerminal.js                 # Terminal Docker
├── FolderManager.js                  # Gestor de carpetas
├── FolderMenu.js                     # Menú de carpetas
├── FileUploader.js                    # Cargador de archivos
├── FileTypeDetectionPanel.js         # Panel de detección de tipos
├── AIPerformanceStats.js             # Estadísticas de rendimiento
├── ModelMemoryIndicator.jsx          # Indicador de memoria de modelos
└── StandaloneStatusBar.js            # Barra de estado standalone

src/services/
├── AIService.js                      # Servicio principal de IA
├── MCPService.js                     # Servicio de MCP (main process)
├── MCPClientService.js               # Cliente MCP (renderer)
├── ConversationService.js            # Gestión de conversaciones
├── FileAnalysisService.js            # Análisis de archivos
├── ModelMemoryService.js             # Gestión de memoria de modelos
├── AnythingLLMService.js            # Servicio de AnythingLLM
├── OpenWebUIService.js               # Servicio de OpenWebUI
├── ToolOrchestrator.js               # Orquestador de herramientas
├── ToolExecutionCache.js             # Cache de ejecución
├── SmartFileDetectionService.js      # Detección inteligente de archivos
├── MarkdownFormatter.js              # Formateador de markdown
├── PDFProcessor.js                   # Procesador de PDFs
└── GPUMemoryService.js               # Servicio de memoria GPU

src/services/ai/
├── ModelManager.js                   # Gestor de modelos
├── CodeAnalyzer.js                   # Analizador de código
├── ContextManager.js                 # Gestor de contexto
├── ToolProcessor.js                  # Procesador de herramientas
└── providers/
    ├── BaseProvider.js               # Proveedor base
    ├── OpenAIProvider.js              # Proveedor OpenAI
    ├── AnthropicProvider.js           # Proveedor Anthropic
    ├── GoogleProvider.js              # Proveedor Google
    └── OllamaProvider.js              # Proveedor Ollama

src/main/services/
├── MCPService.js                     # Servicio MCP (main)
├── DockerService.js                  # Servicio Docker
└── WebSearchService.js               # Servicio de búsqueda web

src/main/services/native/
├── SSHTerminalNativeServer.js        # Servidor MCP SSH/Terminal
└── WebSearchNativeServer.js          # Servidor MCP Web Search

src/mcp-servers/
└── tenable/                          # Servidor MCP Tenable
```

### 📦 Componentes Actualizados
- **App.js**: Integración del sistema de IA y MCP
- **MainContentArea.js**: Soporte para nuevas funcionalidades
- **DialogsManager.js**: Nuevos diálogos de IA y MCP
- **SettingsDialog.js**: Nueva pestaña de actualizaciones y MCP
- **HomeTab.js**: Integración de clientes de IA
- **Sidebar.js**: Mejoras en la navegación
- **FileExplorer.js**: Mejoras en el explorador de archivos

---

## 🚀 Instalación y Actualización

### 📥 Para Usuarios Nuevos
1. Descarga la última versión desde [Releases](https://github.com/kalidus/NodeTerm/releases)
2. Instala siguiendo las instrucciones de tu sistema operativo
3. ¡Disfruta de las nuevas características!

### 🔄 Para Usuarios Existentes
1. **Actualización Automática**: La aplicación se actualizará automáticamente
2. **Actualización Manual**: Ve a Configuración → Actualizaciones → Buscar Actualizaciones
3. **Configuración**: Personaliza el comportamiento de actualizaciones según tus preferencias

### 🛠️ Para Desarrolladores
```bash
# Clonar el repositorio
git clone https://github.com/kalidus/NodeTerm.git
cd NodeTerm

# Cambiar a la rama v1.6.3
git checkout v1.6.3

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Construir para producción
npm run build
```

---

## 📚 Documentación

Esta versión incluye documentación completa para todas las nuevas características:

- **[Guía de Integración MCP con Modelos Locales](docs/INTEGRACION_MCP_MODELOS_LOCALES.md)**: Cómo usar MCP con modelos locales
- **[Guía de AnythingLLM MCP](docs/GUIA_ESENCIAL_ANYTHINGLLM_MCP.md)**: Configuración de AnythingLLM
- **[Guía de OpenWebUI](docs/GUIA_OPENWEBUI.md)**: Uso de OpenWebUI integrado
- **[MCP SSH/Terminal Completo](docs/MCP_SSH_TERMINAL_COMPLETO.md)**: Guía del servidor MCP SSH/Terminal
- **[MCP Web Search Nativo](docs/MCP_WEB_SEARCH_NATIVE.md)**: Búsqueda web con MCP
- **[Sistema de Detección de Archivos](docs/SISTEMA_DETECCION_ARCHIVOS.md)**: Detección inteligente de archivos
- **[Optimización de Rendimiento IA](docs/OPTIMIZACION_RENDIMIENTO_IA.md)**: Optimización de modelos IA
- **[Gestión de Memoria de Modelos](docs/MEMORIA_MODELOS.md)**: Gestión de memoria para Ollama
- **[Guía de Auditoría de Sesiones](docs/GUIA_AUDITORIA_SESIONES.md)**: Sistema de grabación de sesiones

## 🎯 Próximas Versiones

### v1.7.0 (Planificado)
- 🔑 **Soporte para Llaves SSH**: Autenticación con claves privadas
- 🔐 **Gestión de Credenciales**: Almacenamiento seguro de credenciales
- 🌐 **Sincronización Cloud**: Sincronización con servicios en la nube
- 🤖 **Mejoras de IA**: Nuevas capacidades de análisis y procesamiento

### v1.8.0 (Concepto)
- 📊 **Analytics**: Estadísticas de uso y rendimiento
- 🔍 **Búsqueda Avanzada**: Búsqueda mejorada en conversaciones y archivos
- 🎨 **Temas Personalizados**: Más opciones de personalización

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si encuentras bugs o tienes ideas para nuevas características:

1. 🍴 **Fork** el repositorio
2. 🌿 Crea una **rama** para tu feature
3. 💾 **Commit** tus cambios
4. 📤 **Push** a la rama
5. 🔄 Abre un **Pull Request**

### 🐛 Reportar Bugs
- Usa las [GitHub Issues](https://github.com/kalidus/NodeTerm/issues)
- Incluye detalles del sistema operativo y versión
- Proporciona pasos para reproducir el problema

---

## 💰 Donaciones

¿Te gusta NodeTerm? Puedes apoyar el desarrollo:

- **ETH y tokens EVM:** `0xE6df364718CCFB96025eF24078b7C8D387a47242`
- **Solana (SOL):** `3b4UFMaXHmuincSXKpfgCoroFV1RYZVaAWbGTcfeNh5q`

¡Gracias por tu apoyo! 🙏

---

## 📄 Licencia

MIT. Hecho con ❤️ por [kalidus](https://github.com/kalidus).

---

## ☕ ¿Te gusta el proyecto?

Puedes invitarme a un café ☕ o dejar una estrella ⭐ en GitHub. ¡Gracias!

---

**¡Disfruta de NodeTerm v1.6.3!** 🚀