# Borrador de release — NodeTerm v1.7.6

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.
> **Fuente de verdad:** el historial completo esta en [`CHANGELOG.md`](CHANGELOG.md).
> `npm run release` publica en GitHub la seccion `## [x.y.z]` del changelog (no este archivo).

**Fecha:** 2026-09-23
**Version anterior:** v1.7.5

---

## Novedades principales

### Dashboard HomeTab
- **Cockpit**: widgets, paleta de lanzamiento y panel Acciones (import/export, sync y stats).
- **Paneles flotantes tipo OS**: arrastre, anti-colision, multi-pantalla y terminal fijo.
- **Recientes y favoritos**: busqueda, filtros por protocolo y widget Novedades desde el changelog.

### RDP y VNC nativos
- **IronRDP por defecto**: cliente nativo al crear e importar; Wallix directo/cadena y CyberArk PAM.
- **Portapapeles y sesion**: clipboard cliprdr estable via bastion; la sesion no se corta al redimensionar.
- **VNC nativo**: cliente noVNC con calidad, compresion y reconexion automatica.

### UI, temas y editor
- **Marcos y tipografia**: estilo sin marco, temas holograficos/cyberpunk y selector de tamano 8-32.
- **Editor y sidebar**: barra de acciones, copiar contrasena, host Wallix real y menus contextuales estables.

### Rendimiento, seguridad y CI
- **Rendimiento**: aceleracion GPU, telemetria reactiva, chunks xterm y explorador en paralelo.
- **Seguridad**: vault, IPC, MCP timing-safe, host SSH, CSP y safeStorage.
- **CI**: SignPath retirado; `npm ci` con legacy-peer-deps para xterm 6.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial tecnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)
