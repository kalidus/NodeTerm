---
name: release-management
description: Guía e instrucciones para preparar y publicar versiones de NodeTerm utilizando GitHub Flow y GitHub Actions CI/CD.
---

# Release Management Skill — NodeTerm

Esta habilidad define cómo preparar y ejecutar releases en NodeTerm.

## Cuándo usar esta habilidad
Usar cuando el usuario pida realizar un despliegue, publicar una versión, hacer una release o crear un tag de versión.

## Procedimiento para hacer una Release

1. **Verificar que estamos en la rama `main`:**
   Comprobar que no hay ramas `release/*` antiguas y que estamos sincronizados con `origin/main`.

2. **Revisar `CHANGELOG.md`:**
   Asegurar que los cambios importantes están listados en [CHANGELOG.md](file:///c:/Users/kalid/Documents/Antigravity/NodeTerm/CHANGELOG.md).

3. **Ejecutar el comando correspondiente según el tipo de versión:**
   - **Patch Release (parche de bugs, ej. v1.7.1 -> v1.7.2):**
     `npm run release:patch`
   - **Minor Release (nueva característica, ej. v1.7.0 -> v1.8.0):**
     `npm run release:minor`
   - **Manual / Local (interactivo):**
     `npm run release`

4. **Verificación:**
   Verificar en GitHub Actions que el workflow de compilación multiplataforma ha iniciado correctamente para el tag generado.
