# Reglas del Proyecto / Project Rules

- **Control de Commits**: No realizar `git commit` sin el permiso explícito del usuario.

## Flujo de Trabajo Git y Despliegues (GitHub Flow)

- **Estrategia de Ramas**: El proyecto utiliza **GitHub Flow**. El desarrollo se realiza sobre `main` o en ramas cortas por funcionalidad (`feature/*`). No se crean ni mantienen ramas por versión (`release/*`).
- **Instrucciones para Releases**:
  - Para lanzar una release de parche (ej: `v1.7.2`): pedir autorización para ejecutar `npm run release:patch`.
  - Para lanzar una release minor (ej: `v1.8.0`): pedir autorización para ejecutar `npm run release:minor`.
  - Las releases se compilan y publican automáticamente a través de **GitHub Actions** (`.github/workflows/release.yml`) al detectarse el tag `v*`.
  - Documentación completa disponible en [docs/release-process.md](file:///c:/Users/kalid/Documents/Antigravity/NodeTerm/docs/release-process.md).
