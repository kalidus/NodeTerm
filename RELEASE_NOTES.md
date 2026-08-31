# Borrador de release — NodeTerm v1.8.0

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.  
> **Fuente de verdad:** el historial completo está en [`CHANGELOG.md`](CHANGELOG.md).  
> `npm run release` publica en GitHub la sección `## [x.y.z]` del changelog (no este archivo).

**Fecha prevista:** 2026-08-31  
**Versión anterior:** v1.7.4

---

## Resumen

Esta versión introduce una renovación masiva del acceso remoto y la experiencia de inicio en NodeTerm:

1. **RDP Web Nativo HTML5 (IronRDP WASM de Alto Rendimiento)**:
   - Conexión RDP 100% nativa en pestaña web sin dependencias de `guacd`, WSL o Docker.
   - Soporte avanzado para bastiones Wallix (TLS Direct, Auto-Logon, parches de fuentes y normalización bitmap RLE).
   - Portapapeles continuo bidireccional de texto y copia directa de archivos al portapapeles de Windows (`CF_HDROP`).
   - Transferencia de archivos bidireccional y redirección de impresora virtual a PDF (`RDPRND`).
   - Barra de control HUD Cyberpunk y selector de resolución dinámico e interactivo con auto-ajuste.

2. **Panel de Inicio Modular y Telemetría Cyberpunk (Home Dashboard)**:
   - Grid interactivo drag-and-drop con paneles arrastrables y redimensionables.
   - Monitor de telemetría en tiempo real (CPU, RAM, Red, GPU) con estética cyberpunk.
   - Paneles fluidos de Conexiones y Favoritos adaptados a cualquier tamaño de ventana.

3. **Optimizaciones de Rendimiento y Sistema**:
   - Rasterización OOP en canvas y aceleración GPU directa.
   - Mejoras de estabilidad en Linux y Wayland.
   - Desacoplamiento total del ciclo de vida de Apache Guacamole.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial técnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)

