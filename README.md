# 🚀 NodeTerm

<div align="center">
  <img src="src/assets/app-icon.png" alt="NodeTerm Logo" width="96" style="border-radius:16px; margin-bottom:12px;"/>
  <br>
  <b>Cliente SSH moderno y multiplataforma para administradores y devs</b>
  <br><br>
  <a href="https://github.com/kalidus/NodeTerm/releases"><img src="https://img.shields.io/badge/version-1.6.8-blue.svg"/></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg"/></a>
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/electron-latest-brightgreen.svg"/></a>
  <a href="#donaciones"><img src="https://img.shields.io/badge/💰-Donate_Crypto-yellow.svg"/></a>
</div>

---

## ✨ ¿Qué es NodeTerm?

NodeTerm es un cliente SSH visual, rápido y personalizable, pensado para administradores, devs y entusiastas que buscan productividad y una experiencia moderna tanto en escritorio como en web/PWA.

- 🔒 **Seguro**: Encriptación AES-256 para credenciales y datos sensibles.
- ⚡ **Rápido**: Conexión instantánea y gestión de múltiples sesiones.
- 🎨 **Personalizable**: Temas, iconos, fuentes y más.
- 🌐 **Multiplataforma**: Windows, Linux, Mac y versión web progresiva.

<details>
<summary>🖼️ <strong>Ver vista previa</strong></summary>

<div align="center">
  <img src="src/assets/screenshot-main.png" alt="NodeTerm Screenshot" width="600"/>
</div>

</details>

---

## 🚀 Instalación Rápida

### Desktop (Electron)
```sh
# Descarga el instalador desde la sección Releases
https://github.com/kalidus/NodeTerm/releases
```

<details>
<summary>🛠️ <strong>Desarrollo local</strong></summary>

```sh
# Clonar el repositorio
git clone https://github.com/kalidus/NodeTerm.git
cd NodeTerm

# Instalar dependencias
npm install

# Modo desarrollo
npm run dev

# Construir ejecutable
npm run build:win
```

</details>

---

## 🛠️ Características Principales

|  |  |
|--|--|
| 🖥️ Múltiples terminales SSH | 📁 Explorador de archivos remoto |
| 🗂️ Agrupación de pestañas   | 🎨 Temas y personalización total |
| 🔄 Sincronización en tiempo real | 🧩 Soporte para iconos y fuentes |
| 🛡️ Seguridad local y cifrado | 🌙 Modo oscuro y claro |
| 🖱️ Menús contextuales avanzados | ⚡ Atajos de teclado |
| 🔄 Actualizaciones automáticas | 📦 Sistema de actualización integrado |

<details>
<summary>🔎 <strong>Desglose avanzado de características</strong></summary>

### 🔄 **Sistema de Splits Avanzado**
- Splits horizontales y verticales con redimensionamiento fluido
- Menú contextual intuitivo para elegir orientación
- Barras de separación responsive
- Reutilización de sesiones SSH existentes

### 🌐 **Gestión SSH Profesional**
- Soporte completo para bastiones Wallix
- Autenticación por usuario/contraseña
- Organización jerárquica de sesiones en carpetas
- Agrupación de pestañas por proyectos
- Pool de conexiones para optimización de recursos

### 🔌 **Túneles SSH Avanzados**
- **Túneles Locales (-L)**: Redirige puerto local a servidor remoto
- **Túneles Remotos (-R)**: Redirige puerto remoto a servidor local
- **Proxy SOCKS Dinámico (-D)**: Proxy SOCKS5 para enrutar todo el tráfico
- **Verificación de Puertos**: Verificación automática de puertos libres antes de crear túneles
- **Limpieza Automática**: Cierre automático de túneles anteriores que usen el mismo puerto
- **Gestión de Recursos**: Prevención de puertos ocupados y túneles huérfanos
- **Limpieza al Cerrar**: Todos los túneles se cierran correctamente al cerrar la aplicación
- **Logs en Tiempo Real**: Visualización de logs y estado de túneles activos

### 🚀 **Optimizaciones de Arranque**
- **Arranque Mucho Más Rápido**: Optimizaciones significativas que reducen drásticamente el tiempo de inicio
- **Lazy Loading Inteligente**: Módulos pesados se cargan solo cuando se necesitan
- **Inicialización Diferida**: Servicios pesados se inicializan después de mostrar la ventana
- **Registro Progresivo**: Handlers críticos primero, secundarios después para no bloquear la UI
- **Profiler Integrado**: Sistema de medición de tiempos para monitorear el arranque

### 📊 **Monitoreo y Estadísticas**
- CPU, RAM y carga del sistema en tiempo real
- Gráficas de histórico de rendimiento
- Detección automática de distribuciones Linux
- Indicadores visuales de estado de conexión

### 🎨 **Personalización Total**
- Múltiples temas para terminal y UI
- Fuentes personalizables (FiraCode, JetBrains Mono, etc.)
- Temas de iconos (Material, VSCode, etc.)
- Interfaz responsive y moderna

### 📁 **Explorador de Archivos Integrado**
- Navegación remota por SSH
- Operaciones de archivos (copiar, pegar, eliminar)
- Búsqueda y filtrado inteligente
- Temas de color personalizables

### 🔄 **Sistema de Actualización Automática**
- Actualizaciones desde GitHub Releases
- Comprobación automática configurable (cada 1-168 horas)
- Descarga en segundo plano sin interrumpir tu trabajo
- Notificaciones de nuevas versiones disponibles
- Instalación con un clic
- Soporte para canales stable/beta
- Actualizaciones firmadas y verificadas

</details>

---

## 🎉 Versión Actual: v1.6.8 (21 Mayo 2026) — en preparación

### 🚧 Próximo release
- Rama `release/1.6.8` activa; cambios y notas se consolidarán antes de publicar en GitHub.

---

## 🎉 Versión publicada: v1.6.7 (21 Mayo 2026)

### 🧭 Sidebar, notas, conexiones e IA
- **Sidebar rediseñada**: Pestañas por sección, favoritos virtuales, lazy loading y tema Cursor opcional.
- **Notas**: Editor Tiptap, sync Nextcloud y gestión alineada con conexiones.
- **Conexiones**: Diálogos SSH/RDP/VNC unificados; ProxyJump, host keys, grabación por sesión.
- **IA**: Clientes Claude, Gemini, OpenCode, Codex, Antigravity y Open Notebook en pestañas.
- **Seguridad y rendimiento**: Endurecimiento IPC/Docker, calculadora CVSS y arranque más rápido.

---

## 🎉 Versión Anterior: v1.6.5 (21 Marzo 2026)

### 🎨 Presets, sidebar y terminal
- **Presets de tema e iconos**: Configuración desde la barra lateral con panel usable y mejoras por versiones.
- **Acciones rápidas en la sidebar**: Barra de acciones con separadores y enlace al gestor de contraseñas.
- **Ocean Pro — marco colapsado**: Estilo opcional para el marco de la barra lateral colapsada.
- **Sidebar**: Menos lag, corrección de color difuminado y mejor comportamiento al redimensionar y al alternar preset/temas.
- **Tema del terminal**: Ajustes de sombras, iconos por defecto y procesamiento del tema.

### 🚀 Release y dependencias
- **Scripts de release**: Correcciones de rutas y flujo del asistente.
- **Build**: Ajustes en despliegue (`cpu-features`) y actualización de dependencias por vulnerabilidades.

---

## 🎉 Versión Anterior: v1.6.4 (16 Febrero 2026)

### 🔧 Fixes y Mejoras de Release
- **GitHub Release Notes**: Sistema mejorado para forzar notas de release vía API.
- **SSH Password Saving**: Fix en el guardado automático de contraseñas tras login manual.
- **Modernización de Iconos**: Nuevos iconos premium en el sidebar con mejor visibilidad.
- **Tags de Protocolo**: Ajuste de posición y tamaño de tags para no ocultar iconos.
- **Drag & Drop**: Fix en el movimiento de conexiones a carpetas en el sidebar.
- **Tab Flash Bug**: Corrección definitiva del parpadeo visual al abrir terminales locales.
- **Monitoreo de GPU**: Soporte para detección de gráficas integradas Intel en Windows.

---

## 🎉 v1.6.3 (10 Febrero 2026)

### 🚀 Múltiples Instancias y Sincronización
- **Soporte Multi-Instancia**: Abre múltiples ventanas de NodeTerm simultáneamente.
- **Auto-Sync**: Sincronización en tiempo real de favoritos, conexiones y temas entre todas las instancias.

### 📥 Importación y Gestión de Favoritos
- **Refactor de Importación**: Nuevo asistente de importación más intuitivo y robusto.
- **Favoritos desde Sidebar**: Añade/Elimina favoritos directamente desde el menú contextual de la sidebar.
- **Soporte de Túneles**: Los túneles SSH ahora se pueden guardar en favoritos y conectar desde el Hub.

### 🎨 Rediseño de HomeTab y UI
- **Nuevo Panel de Filtros**: Sistema de filtrado avanzado con diseño *glassmorphism*, selección múltiple y búsqueda de grupos.
- **Estética Refinada**: Botones de acciones y opciones completamente rediseñados con efectos de cristal.

### 🚀 Performance y Arranque
- **Arranque Instantáneo**: Implementación de `StartupProfiler` y optimización de carga de servicios (lazy loading).
- **Fluid UI**: Animaciones más suaves y renderizado optimizado en procesos compartidos.

### 🛠️ Nuevas Funcionalidades
- **Accesos Rápidos de Servicio**: Configura Guacd, Ollama y Vault directamente desde los botones de estado.
- **Gestión de PowerShell**: Mejor soporte para terminales locales en Windows.

### 🐛 Correcciones de Bugs (Multitud de fixes)
- **Fix de Túneles**: Corregido error al conectar a túneles desde la sección de favoritos.
- **Fix de Superposición**: Corregido error visual donde el terminal cubría diálogos modales.
- **Contadores de Filtros**: Lógica corregida para mostrar conteos precisos.

---

## 🎨 Personalización

- Cambia temas, iconos y fuentes desde el menú de configuración.
- Sincroniza tus preferencias entre escritorio y web.
- Soporte para temas personalizados y extensiones (próximamente).

---

## 🔄 Sistema de Actualización

NodeTerm incluye un sistema de actualización automática que mantiene tu aplicación siempre al día:

### Configuración

Accede a `Configuración → Actualizaciones` para personalizar:

- **Actualizaciones Automáticas**: Activa/desactiva la comprobación automática
- **Intervalo de Comprobación**: Configura cada cuántas horas buscar actualizaciones (1-168 horas)
- **Descarga Automática**: Las actualizaciones se descargan en segundo plano automáticamente
- **Canal de Actualizaciones**: 
  - **Estable (Recomendado)**: Versiones probadas y estables
  - **Beta**: Versiones de prueba con nuevas funcionalidades

### Procedimiento de Actualización

1. **Comprobación**: La app comprueba automáticamente si hay nuevas versiones en GitHub Releases
2. **Notificación**: Si hay una actualización disponible, recibirás una notificación
3. **Descarga**: La actualización se descarga en segundo plano sin interrumpir tu trabajo
4. **Instalación**: Cuando esté lista, haz clic en "Instalar y Reiniciar" para aplicar la actualización
5. **Reinicio**: La aplicación se reinicia automáticamente con la nueva versión

### Actualización Manual

Si prefieres controlar las actualizaciones manualmente:

1. Abre `Configuración → Actualizaciones`
2. Haz clic en **"Buscar Actualizaciones"**
3. Si hay una versión disponible, haz clic en **"Descargar"**
4. Una vez descargada, haz clic en **"Instalar y Reiniciar"**

### Seguridad

- Todas las actualizaciones provienen de GitHub Releases oficial
- Las actualizaciones están firmadas y verificadas automáticamente
- El proceso de actualización es completamente seguro y no requiere permisos de administrador

---

---

## 🏗️ Arquitectura Técnica

<details>
<summary>🛠️ <strong>Stack y estructura</strong></summary>

**Stack Tecnológico**
```
Frontend:  React 18 + PrimeReact + React Icons
Backend:   Electron 28 + Node.js
SSH:       node-ssh + ssh2-promise  
Terminal:  xterm.js + addons
Build:     Webpack 5 + Babel
```

**Estructura del Proyecto**
```
NodeTerm/
├── 📁 src/
│   ├── 📁 components/     # Componentes React
│   ├── 📁 assets/         # Estilos CSS
│   └── 📄 themes.js       # Temas del terminal
├── 📄 main.js             # Proceso principal Electron
├── 📄 preload.js          # Script de preload
└── 📄 webpack.config.js   # Configuración Webpack
```

</details>

---

## 🗓️ Roadmap

| Versión | Características | Estado |
|---------|----------------|--------|
| **v1.6.8** | 🚧 Próximo release (rama en preparación) | 🔄 En curso |
| **v1.6.7** | 🧭 Sidebar, notas, conexiones e IA | ✅ Actual |
| **v1.6.6** | 🚧 Release intermedia | ✅ Completado |
| **v1.6.5** | 🎨 Presets, sidebar rápida y fixes de UI | ✅ Completado |
| **v1.6.4** | 🔧 Fixes y Mejoras de Release | ✅ Completado |
| **v1.6.3** | 🔄 Múltiples Instancias e Importación | ✅ Completado |
| **v1.6.1** | 🐛 Fix de Conexión WALLIX | ✅ Completado |
| **v1.6.0** | 🔄 Sistema de Actualización Automática + Configuración Avanzada + Canales Stable/Beta | ✅ Completado |
| **v1.5.9** | 🔐 Password Manager Integrado + KeePass + Auto-completado de Credenciales | ✅ Completado |
| **v1.5.8** | 🚧 Rama de Desarrollo + Mejoras de Estabilidad | ✅ Completado |
| **v1.5.7** | 🔧 Fix de Checksum Final + Instalador Funcional | ✅ Completado |
| **v1.5.6** | 🐛 Fix de Checksum Issue + Instalador Corregido | ✅ Completado |
| **v1.5.5** | 🎨 Sistema de Temas Avanzado + Temas Personalizados | ✅ Completado |
| **v1.7.0** | 🔑 Soporte para llaves SSH + Autenticación mejorada | 📋 Planificado |
| **v1.8.0** | 🖥️ Terminal integrado con múltiples shells | 💭 Concepto |

---

## 📝 Changelog

### v1.6.8 (21 Mayo 2026) - EN PREPARACIÓN
- 🚧 Rama `release/1.6.8`; notas y changelog se completarán antes del tag en GitHub

### v1.6.7 (21 Mayo 2026)
- 🧭 **Sidebar y navegación** - Pestañas por sección, favoritos, lazy loading y búsqueda mejorada
- 📝 **Notas** - Editor Tiptap, Zen Mode, TTS y sync Nextcloud
- 🔌 **Conexiones** - Diálogos SSH/RDP/VNC unificados y opciones avanzadas SSH
- 🤖 **IA** - Clientes CLI locales y Open Notebook; retirado chat IA legacy
- 🔐 **Seguridad** - IPC endurecido, CVSS y mitigaciones Docker/AnythingLLM

### v1.6.5 (21 Marzo 2026)
- 🎨 **Presets y sidebar** - Presets de tema/iconos, acciones rápidas, opción Ocean Pro (marco colapsado)
- 🖥️ **Terminal** - Mejoras de tema, sombras e iconos por defecto
- 🐛 **Sidebar** - Menos lag, color difuminado y redimensionado corregidos; alternancia preset/temas
- 🚀 **Release** - Scripts de release y despliegue (`cpu-features`); dependencias actualizadas

### v1.6.4 (16 Febrero 2026)
- 🚀 **GitHub Release Fix** - Implementado script de post-release para garantizar notas en GitHub
- 🔐 **SSH Password Fix** - Corregido el guardado de contraseñas tras reintento manual
- 🎨 **Iconos Premium** - Nuevos iconos de colapso/expansión más modernos
- 🏷️ **Protocol Tags** - Ajuste estético de tags de protocolo en favoritos
- 🐛 **Bug Fixes** - Corrección de drag-and-drop a carpetas y parpadeo de pestañas
- 📊 **System Stats** - Detección mejorada de Intel GPU para todos los usuarios

### v1.6.3 (10 Febrero 2026)
- 🎨 **Rediseño Total de HomeTab** - Nueva barra de filtros, diseño glassmorphism y panel de opciones moderno
- 🚀 **Arranque Optimizado** - Reducción drástica del tiempo de carga con `StartupProfiler`
- ✨ **Mejoras de UX** - Botones de servicio interactivos (Guacd, Ollama, Vault) y visualización refinada
- 🖥️ **PowerShell Manager** - Mejor soporte para terminales locales en Windows
- 🐛 **Bug Fixes** - Correcciones en drag-and-drop, contadores de filtros y superposición de UI

### v1.6.1 (19 Noviembre 2025)
- 🐛 **Fix de Conexión WALLIX** - Corrección de problemas con conexiones a través de Bastion Wallix

### v1.6.0 (19 Noviembre 2025)
- 🤖 **Sistema Completo de IA y Chat** - Chat integrado con múltiples proveedores (OpenAI, Anthropic, Google, Ollama)
- 🔌 **Integración MCP Completa** - Model Context Protocol para extender capacidades de IA
- 🌐 **AnythingLLM y OpenWebUI** - Integración completa con AnythingLLM y OpenWebUI
- 🐳 **Conexiones Docker** - Terminales Docker con gestión de contenedores
- 🎥 **Sistema de Auditoría** - Grabación y reproducción de sesiones SSH
- 🔄 **Sistema de Actualización Automática** - Actualizaciones desde GitHub Releases
- ⚙️ **Configuración Avanzada** - Control completo sobre el proceso de actualización
- 📦 **Canales Stable/Beta** - Elige tu nivel de riesgo
- 🔔 **Notificaciones Mejoradas** - Avisos inteligentes de nuevas versiones
- 🛡️ **Seguridad Reforzada** - Verificación de firmas y actualizaciones seguras
- 📱 **Descarga en Background** - Sin interrumpir tu flujo de trabajo
- 🎨 **UI Mejorada** - Nueva pestaña de actualizaciones en configuración

### v1.5.9 (3 Noviembre 2025)
- 🔐 **Password Manager Integrado** - Sistema completo de gestor de contraseñas con KeePass
- 🎨 **Sidebar de Password Manager** - Panel lateral para gestión de credenciales
- 📥 **Importación de KeePass** - Importa bases de datos .kdbx de forma nativa
- 🔄 **Auto-completado de Credenciales** - Relleno automático de formularios SSH/RDP
- 🛡️ **Seguridad Mejorada** - Encriptación adicional para credenciales importadas
- 🏗️ **Código Más Modular** - Refactorización de componentes para mejor mantenibilidad

### v1.5.8 (12 Octubre 2025)
- 🚧 **Rama de Desarrollo** - Preparación para nuevas funcionalidades
- 🔧 **Mejoras de Estabilidad** - Correcciones y optimizaciones internas

### v1.5.7 (2 Octubre 2025)
- 🔧 **Fix de Checksum Final** - Versión definitiva con checksum corregido
- 📦 **Actualización de Dependencias** - package-lock.json actualizado
- ✅ **Instalador Funcional** - Resuelve problemas de actualización

### v1.5.6 (2 Octubre 2025)
- 🐛 **Fix de Checksum Issue** - Corrección del error "sha512 checksum mismatch"
- 📥 **Instalador Corregido** - Nuevo instalador con checksum válido
- 🔄 **Mejor Manejo de Errores** - Enhanced error handling para futuros problemas de checksum
- ⚠️ **Nota Importante** - Usuarios deben actualizar de v1.5.4 → v1.5.6 (saltar v1.5.5)

### v1.5.5
- 🎨 **Sistema de Temas Avanzado** - Nuevo gestor de temas para pestañas con mayor flexibilidad
- 🎯 **Temas Personalizados** - Soporte para temas personalizados con configuración granular
- 🔧 **Selector de Temas Mejorado** - Interfaz más intuitiva para selección de temas
- 💾 **Persistencia de Temas** - Los temas seleccionados se mantienen entre sesiones
- ⚡ **Gestión de Temas Optimizada** - Mejor rendimiento en la carga y aplicación de temas
- 🏗️ **Código Más Modular** - Refactorización del sistema de temas para mejor mantenibilidad
- 🐛 **Corrección de Temas** - Mejor aplicación de temas en pestañas
- 🔄 **Fix de Persistencia** - Los temas se mantienen correctamente al reiniciar
- 🚀 **Corrección de Rendimiento** - Mejoras en la carga de temas personalizados

### v1.5.4
- 🚀 **Optimización del main.js** - Refactorización completa del archivo principal de Electron
- ⚡ **Mejor Gestión de Memoria** - Optimización de la gestión de recursos del sistema
- 🏃 **Reducción de Tiempo de Inicio** - Mejoras en el tiempo de arranque de la aplicación
- 🔧 **Optimización de IPC** - Mejor comunicación entre procesos principal y renderer
- 🧹 **Código Más Limpio** - Refactorización de funciones y mejor organización del código
- 🛡️ **Mejor Manejo de Errores** - Mejores mensajes de error y logging
- 🔄 **Corrección de Memory Leaks** - Eliminación de fugas de memoria en el proceso principal
- 🎯 **Mejor Estabilidad** - Corrección de crashes ocasionales durante el inicio
- 📁 **Reorganización de main.js** - Mejor estructura y modularidad
- 🐛 **Correcciones de Bugs** - Mejoras de estabilidad y rendimiento

### v1.5.3
- 📥 **Sistema de Importación de Sesiones** - Importa conexiones desde archivos XML (mRemoteNG, etc.)
- 🎨 **Selector de Colores Avanzado** - Personalización completa de temas con paleta de colores
- 📁 **Sidebar Colapsable Inteligente** - Mejor gestión del espacio y experiencia de usuario
- 🏗️ **Refactor Completo de Estilos CSS** - Nueva estructura organizada y modular
- 🔧 **Diálogos Mejorados** - Mejor UX en formularios SSH/RDP con opciones avanzadas
- 🎯 **Duplicación de Conexiones** - Duplica carpetas y conexiones fácilmente
- 🔄 **Modo Vinculado** - Importación automática desde archivos externos
- 🎨 **Temas Mejorados** - Iconos y colores más elegantes
- 📱 **UI Responsiva** - Mejor adaptación a diferentes tamaños de pantalla
- 🐛 **Correcciones de Bugs** - Mejoras de estabilidad y rendimiento

### v1.5.2
- 🚀 **Major Performance Optimization** - React Re-render Optimization
- ⚡ **Memoización de componentes** (TabHeader, TabContentRenderer, Sidebar)
- 🔧 **Refactor de App.js** - Extracción de MainContentArea
- 📉 **Reducción de 30-40%** en re-renders innecesarios
- 🎯 **Optimización de props** con useCallback y useMemo
- 🏗️ **Mejor arquitectura** de componentes
- 📏 **App.js reducido** de ~1100 a ~900 líneas
- 🎨 **Drag & drop más fluido** y responsivo
- 🔄 **Mejor respuesta** de la interfaz de usuario
- 🧪 **Preparación para testing** y mantenimiento
- 📦 **Código más modular** y mantenible

### v1.4.1
- Soporte completo para conexiones RDP con smart sizing
- Corrección de errores en conexiones RDP desde sidebar
- Mejoras de estabilidad y rendimiento
- UI refinada y más moderna
- Sincronización mejorada entre escritorio y web
- Corrección de bugs y optimizaciones

### v1.4.0
- Exportación/importación de configuraciones
- Mejoras de estabilidad y rendimiento
- UI refinada y más moderna
- Sincronización mejorada entre escritorio y web
- Corrección de bugs y optimizaciones

### v1.3.0
- Menús contextuales para explorador de sesiones
- Menú contextual en área vacía del árbol
- Interface más limpia sin botones inline

<details>
<summary>Ver más versiones...</summary>

### v1.2.0
- Sistema de versionado implementado
- Diálogo "Acerca de" con información completa
- Versión mostrada en barra de estado
- Interfaz mejorada con diseño profesional

### v1.1.0
- Panel lateral optimizado
- Iconos automáticos por distribución Linux
- Sistema de overflow inteligente
- Funcionalidad move-to-front
- Corrección de memory leaks

</details>

---

## 💰 Donaciones

¿Te gusta NodeTerm? Puedes apoyar el desarrollo con una donación en cripto:

- **ETH y tokens EVM:** `0xE6df364718CCFB96025eF24078b7C8D387a47242`
- **Solana (SOL):** `3b4UFMaXHmuincSXKpfgCoroFV1RYZVaAWbGTcfeNh5q`

¡Gracias por tu apoyo! 🙏

---

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Si quieres ayudar a mejorar NodeTerm:

1. 🍴 **Fork** el repositorio
2. 🌿 Crea una **rama** para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. 💾 **Commit** tus cambios (`git commit -m 'feat: añadir nueva funcionalidad'`)
4. 📤 **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. 🔄 Abre un **Pull Request**

### 🐛 Reportar Bugs
- Usa las [GitHub Issues](https://github.com/kalidus/NodeTerm/issues)
- Incluye detalles del sistema operativo y versión de NodeTerm
- Proporciona pasos para reproducir el problema

### 💡 Solicitar Funcionalidades
- Abre una [Feature Request](https://github.com/kalidus/NodeTerm/issues/new)
- Describe claramente la funcionalidad deseada
- Explica cómo mejoraría la experiencia de usuario

---

## 🔒 Seguridad y Encriptación

NodeTerm incluye un sistema completo de encriptación AES-256 para proteger todas las credenciales y datos sensibles:

- **Encriptación AES-256**: Grado militar para passwords y conexiones
- **Master Password**: Clave única para desbloquear la aplicación
- **Auto-Unlock**: Opción para no pedir contraseña cada vez
- **Migración Automática**: Encripta datos existentes sin pérdida
- **Retrocompatibilidad**: Funciona con y sin encriptación

📖 **Documentación completa**: [docs/SISTEMA_ENCRIPTACION.md](docs/SISTEMA_ENCRIPTACION.md)

---

## 📹 Sistema de Auditoría y Grabación

NodeTerm incluye un sistema completo de grabación y auditoría de sesiones SSH para compliance, debugging y documentación:

- **Grabación en tiempo real**: Captura toda la entrada/salida de sesiones SSH
- **Formato estándar**: Compatible con asciicast v2 (asciinema)
- **Reproductor integrado**: Playback con controles de velocidad
- **Búsqueda y filtrado**: Encuentra grabaciones por conexión
- **Exportación**: Comparte grabaciones en formato estándar
- **Almacenamiento local**: Sin dependencias de servicios externos

📖 **Guía completa**: [docs/GUIA_AUDITORIA_SESIONES.md](docs/GUIA_AUDITORIA_SESIONES.md)

---

## 🤖 Sobre el Desarrollo

**NodeTerm** es un proyecto innovador desarrollado utilizando **IA avanzada** en colaboración humano-máquina. Lo que comenzó como un ejercicio de **vibe coding** se ha transformado en una herramienta profesional y moderna, específicamente diseñada para **administradores de infraestructuras** que necesitan una solución SSH robusta y eficiente.

¡Las PRs y sugerencias son bienvenidas! Consulta [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

---

## 📄 Licencia

MIT. Hecho con ❤️ por [kalidus](https://github.com/kalidus).

---

## ☕ ¿Te gusta el proyecto?

Puedes invitarme a un café ☕ o dejar una estrella ⭐ en GitHub. ¡Gracias! 
