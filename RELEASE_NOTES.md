# Borrador de release — NodeTerm v1.7.5

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.  
> **Fuente de verdad:** el historial completo está en [`CHANGELOG.md`](CHANGELOG.md).  
> `npm run release` publica en GitHub la sección `## [x.y.z]` del changelog (no este archivo).

**Fecha:** 2026-08-31  
**Versión anterior:** v1.7.4

---

## Novedades Principales
 
### 🖥️ RDP Nativo HTML5 (IronRDP WASM)
- **Motor 100% Nativo**: Conexión RDP en pestaña web sin dependencias de `guacd`, WSL ni Docker.
- **Bastiones y Wallix**: Soporte para TLS Direct, auto-logon, filtrado de canales y normalización de renderizado.
- **Portapapeles y Archivos**: Sincronización continua de texto/archivos y transferencia bidireccional.
- **Impresora Virtual**: Redirección de impresión remota a archivos PDF locales.
- **Control de Pantalla**: Selector dinámico de resolución, presets rápidos y auto-ajuste.

### 📊 Dashboard de Inicio Modular
- **Paneles Reorganizables**: Grid interactivo drag-and-drop para conexiones, favoritos y telemetría de sistema.
- **Monitor en Tiempo Real**: Visualización de métricas de CPU, RAM, Red y GPU.

### 🥑 Guacamole y Optimizaciones
- **Gestión Limpia**: Desacoplamiento de `guacd` para evitar procesos en segundo plano cuando no está en uso.
- **Rendimiento**: Aceleración gráfica en canvas, soporte mejorado en Wayland/Linux y optimización de pestañas.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial técnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)

