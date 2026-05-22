# Borrador de release — NodeTerm v1.6.8

> **Uso:** texto opcional orientado al usuario antes de publicar en GitHub.  
> **Fuente de verdad:** el historial completo está en [`CHANGELOG.md`](CHANGELOG.md).  
> `npm run release` publica en GitHub la sección `## [x.y.z]` del changelog (no este archivo).

**Fecha prevista:** 2026-05-21  
**Versión anterior:** v1.6.7

---

## Resumen

Esta versión **retira el chat de IA integrado** y el **MCP propio de NodeTerm** que ya no se usaban en la interfaz. La experiencia de IA pasa por los **clientes dedicados** (AnythingLLM, Open WebUI, terminales CLI, etc.).

### Qué desaparece
- Pestaña / atajos del chat IA local dentro de NodeTerm.
- Explorador de archivos MCP en la sidebar.
- Gestor MCP del chat (`MCPManagerTab`) y procesos MCP en segundo plano del propio NodeTerm.

### Qué sigue igual (o mejor)
- **AnythingLLM**: botón de engranaje → *Configuración MCP de AnythingLLM* (añadir servidores, guardar JSON, diagnóstico).
- Todos los **clientes IA** en sidebar y **Clientes IA** en ajustes.
- Menos consultas automáticas a Ollama en segundo plano (consola más limpia en dev).

### Sync entre PCs
Si sincronizabas datos entre instancias, el historial y la config del chat integrado (`aichat_*`, `nodeterm_ai_*`) **ya no se copian** — era código retirado.

---

## Referencias

- [CHANGELOG.md](CHANGELOG.md) — historial técnico de todas las versiones
- [GitHub Releases](https://github.com/kalidus/NodeTerm/releases)
- [Proceso de release](docs/release-process.md)
