# Borrador de release — NodeTerm v1.7.6

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.
> **Fuente de verdad:** el historial completo esta en [`CHANGELOG.md`](CHANGELOG.md).
> `npm run release` publica en GitHub la seccion `## [x.y.z]` del changelog (no este archivo).

**Fecha:** 2026-09-23
**Version anterior:** v1.7.5

---

## Novedades principales

### HomeTab
- Cockpit con widgets, paleta y panel Acciones (import/export, sync, stats).
- Paneles flotantes tipo OS: arrastre, anti-colision, multi-pantalla y terminal fijo.
- Recientes/favoritos unificados, busqueda, filtros y panel Novedades desde el changelog.

### RDP y VNC
- IronRDP por defecto, Wallix (directo/cadena), CyberArk PAM y clipboard cliprdr estable via bastion.
- Cliente VNC nativo (noVNC) con calidad, compresion y reconexion.

### UI, rendimiento y seguridad
- Temas/marcos holograficos, tipografia unificada 8-32, menus y sidebar corregidos.
- GPU, telemetria reactiva, xterm y explorador en paralelo.
- Vault, IPC, MCP timing-safe, host SSH, CSP y safeStorage.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial tecnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)
