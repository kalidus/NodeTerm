# Borrador de release — NodeTerm v1.7.5

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.  
> **Fuente de verdad:** el historial completo está en [`CHANGELOG.md`](CHANGELOG.md).  
> `npm run release` publica en GitHub la sección `## [x.y.z]` del changelog (no este archivo).

**Fecha:** 2026-08-31  
**Versión anterior:** v1.7.4

---

## Novedades Principales

### 🖥️ RDP Nativo HTML5 (IronRDP WASM de Alto Rendimiento)
- **Motor 100% Nativo e In-Process (Zero-Dependency)**: Conexión de escritorio remoto en pestaña web HTML5 sin requerir `guacd`, WSL (`ubuntu.exe`), Docker ni binarios externos de Node.js.
- **Canal TCP+TLS Integrado**: Resuelve de forma nativa e in-process la compatibilidad con certificados autofirmados de Windows RDP en Electron/BoringSSL mediante negociación segura RSA TLS 1.2 sin procesos secundarios ni sobrecoste de IPC.
- **Compatibilidad con Bastiones y Wallix**:
  - Negociación y soporte nativo para **Wallix TLS Direct** y preflight X.224.
  - Corrección de `selectedProtocol` en X.224 Connection Confirm y alineación de Client Core Data (`CS_CORE`).
  - Auto-Logon transparente con parche dinámico de `TS_INFO_PACKET`.
  - Normalización de banderas en paquetes de fuentes `FontMap` (`patchFontSequenceFlags`).
  - Filtrado inteligente de `Message Channel` (canal 1001) respondiendo automáticamente `Auto-Detect RTT/BW` para evitar pantallas negras y bloqueos en bastiones.
  - Normalización y división de teselas RLE 16bpp en subtiles estándar de 64x64 y corrección de stride (`fixWallixBitmapStrideCrop`), eliminando artefactos y caídas de renderizado.
- **Portapapeles Bidireccional Continuo**:
  - Canal virtual `cliprdr` con sincronización continua entre el portapapeles local y el escritorio remoto.
  - Soporte de copia de archivos desde el escritorio remoto directamente al portapapeles de Windows (`CF_HDROP`).
- **Transferencia de Archivos Bidireccional**:
  - Subida directa de archivos locales hacia el escritorio remoto RDP mediante proveedor de almacenamiento virtual.
- **Redirección de Impresora Virtual a PDF (`RDPRND`)**:
  - Permite imprimir documentos desde la sesión Windows remota, guardándolos automáticamente en formato PDF en la carpeta de Descargas local.
- **Barra de Acciones HUD Cyberpunk y Control de Pantalla**:
  - Rediseño moderno con estética futurista para la barra superior de acciones RDP.
  - **Selector dinámico de resolución interactivo**: presets rápidos (HD, Full HD, 2K, 4K, Ultrawide) y modo Auto-Ajuste adaptable (`canvasResizedCallback` / `displayControl`).
  - Botones de acceso directo para combinaciones de teclas de sistema (Ctrl+Alt+Del, Tecla Windows, Alt+Tab, etc.).
- **Trazas y Diagnóstico Limpio**:
  - Silenciado de logs verbosos de paquetes de red y volcados a disco en producción (`NODETERM_RDP_DEBUG=1`).
  - Reporte de cierre de sesión unificado en una sola línea indicando el motivo exacto (cerrado por el usuario, desconexión de servidor, etc.).

### 📊 Inicio Modular y Monitor Cyberpunk (Home Dashboard)
- **Paneles Modulares y Persistentes**: Sistema de grid interactivo drag-and-drop con paneles arrastrables y redimensionables.
- **Panel de Telemetría y Monitor de Sistema**: Métricas en tiempo real con estética cyberpunk para monitorizar CPU, RAM, Red, GPU y estadísticas de conexión.
- **Adaptabilidad Fluida**: Preservación de columnas independientes y filas fluidas en los paneles de Conexiones y Favoritos sin deformaciones ni scrollbars innecesarias.

### 🥑 Guacamole y Servicios Secundarios
- **Desacoplamiento de Ciclo de Vida**: Separación total entre Apache Guacamole y el nuevo motor RDP Nativo.
- **Arranque Limpio**: Evita el inicio automático e innecesario del demonio `guacd` cuando Guacamole está desactivado.
- **Ajustes y APPs**: Limpieza de avisos redundantes y sincronización de estado local persistente.

### ⚡ Rendimiento, Gráficos y Compatibilidad Linux / Wayland
- **Aceleración Gráfica**: Rasterización OOP de canvas, transferencia directa GPU y aislamiento de layout CSS.
- **Linux & Wayland**: Detección mejorada de sesión Wayland, corrección de bloqueo de clics al desminimizar ventanas y optimización de renderizado.
- **Gestión de Pestañas**: Eliminación de re-renders forzados y deduplicación de eventos IPC en el cambio de pestañas.

### 💖 Comunidad y Soporte
- **GitHub Sponsors**: Integración de opciones y accesos de patrocinio directo para apoyar el desarrollo continuo del proyecto.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial técnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)

