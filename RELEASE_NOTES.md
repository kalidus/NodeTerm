# Borrador de release — NodeTerm v1.7.4

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.  
> **Fuente de verdad:** el historial completo esta en [`CHANGELOG.md`](CHANGELOG.md).  
> `npm run release` publica en GitHub la seccion `## [x.y.z]` del changelog (no este archivo).

**Fecha prevista:** 2026-07-31  
**Version anterior:** v1.7.3

---

## Resumen

Hotfix: restaura el copiado al portapapeles en la build de produccion (contrasenas, detalles de conexion, etc.). En v1.7.3 el handler IPC no se registraba en el paquete empaquetado; v1.7.4 lo aisla del arranque de Joplin/tar y anade fallback en el renderer.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial tecnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)
