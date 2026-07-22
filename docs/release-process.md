# Proceso de Release — NodeTerm (GitHub Flow & CI/CD)

Este documento describe la estrategia de releases de NodeTerm bajo **GitHub Flow** utilizando **GitHub Actions** para la publicación automatizada en la nube.

---

## Estrategia de Ramas (GitHub Flow)

1. **`main` es la rama principal e inmutable de producción.**
2. Todo el desarrollo se realiza mediante Feature Branches efímeras (`feature/mi-tarea`) o pequeños commits integrados en `main`.
3. **No se crean ni mantienen ramas por versión (`release/v1.7.0`).**
4. Las versiones se marcan mediante **Git Tags** (`vX.Y.Z`) generados directamente desde la rama `main`.

---

## Archivos de Versión y Publicación

| Archivo | Rol |
|---------|-----|
| **`CHANGELOG.md`** | Fuente de verdad ([Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)). Todo cambio notable se registra aquí bajo `## [x.y.z]`. |
| **`package.json`** | Contiene la versión actual de la aplicación (`"version": "1.7.1"`). |
| **`.github/workflows/release.yml`** | Workflow de GitHub Actions que compila para Windows, macOS y Linux automáticamente al subir un tag. |
| **`scripts/release.js`** | Asistente de preparación y publicación de versión. |

---

## Flujo de Lanzamiento de una Release

### Opción 1: Lanzamiento Nube con GitHub Actions (RECOMENDADO)

Para realizar una release de forma automatizada sin cargar la máquina local:

#### Requisito: Estar en la rama `main`

#### 1. Versión Parche (Bugfixes - ej. 1.7.1 ➡️ 1.7.2)
```bash
npm run release:patch
```

#### 2. Versión Minor (Funcionalidades nuevas - ej. 1.7.0 ➡️ 1.8.0)
```bash
npm run release:minor
```

**¿Qué hace este comando automáticamente?**
1. Incrementa la versión en `package.json`.
2. Actualiza la cabecera en `CHANGELOG.md` con la versión y la fecha de hoy.
3. Hace commit de la preparación en `main`.
4. Crea el tag Git (ej: `v1.7.2`).
5. Sube el commit y el tag a GitHub (`git push origin main --tags`).
6. **GitHub Actions se activa automáticamente** en los servidores de GitHub, compila para Windows, Mac y Linux en paralelo, y publica los instaladores en GitHub Releases.

---

### Opción 2: Lanzamiento o Compilación Local (Manual)

Si deseas compilar los paquetes en tu propia máquina en lugar de la nube:

```bash
npm run release:local
```
O simplemente ejecuta el asistente interactivo:
```bash
npm run release
```
El asistente te dará la opción de:
1. Compilar solo localmente (sin publicar).
2. Compilar y publicar localmente en GitHub (requiere `GH_TOKEN` o sesión `gh`).
3. Disparar la publicación en la nube con GitHub Actions.

---

## Reparación de notas de versión en GitHub (UTF-8)

Si por alguna razón las notas de la release en GitHub presentan problemas de codificación de caracteres:

```bash
npm run fix-release-notes
```

---

## Checklist de Verificación antes de una Release

- [ ] Estar en la rama `main` con todos los cambios integrados y probados.
- [ ] Verificar que `CHANGELOG.md` contiene los cambios notables de la versión.
- [ ] Ejecutar `npm run release:patch` o `npm run release:minor`.
- [ ] Comprobar en la pestaña **Actions** de GitHub que el build se ejecuta sin errores.
