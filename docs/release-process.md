# Proceso de Release Profesional - NodeTerm

Este documento detalla el flujo de trabajo estándar para realizar lanzamientos oficiales de NodeTerm utilizando el asistente automatizado.

## Flujo de Release Estándar

El proceso se divide en tres etapas lógicas para asegurar que el código publicado sea estable y esté correctamente documentado.

### Etapa 1: Preparación (En tu rama de trabajo)
En esta fase se deja el código listo para ser integrado en la versión oficial.
*   **Verificación de Git**: Se asegura que no haya cambios accidentales.
*   **Versionado Semántico**: Se elige el tipo de incremento (`Patch`, `Minor` o `Major`).
*   **CHANGELOG.md**: Se actualiza el historial de cambios con la nueva versión y fecha.
*   **Commit de Release**: Se crea un commit que marca el fin del desarrollo de esa versión.

### Etapa 2: Integración (Merge a Main)
Nada se publica si no está consolidado en la rama principal.
*   **Switch a Main**: El script cambia automáticamente a la rama `main`.
*   **Merge**: Se fusionan los cambios de tu rama en `main`. Esto garantiza que `main` siempre sea el reflejo exacto de lo que está en producción.

### Etapa 3: Despliegue (En la rama Main)
Una vez el código está en `main`, se procede a la construcción y entrega.
*   **Build**: Compilación de producción para maximizar rendimiento.
*   **Dist**: Generación de los instaladores (`.exe`) y la **versión portable** (`.exe`). Los encontrarás en la carpeta `dist/`.
*   **GitHub Publishing**: El script te pedirá el `GH_TOKEN` si no está configurado, permitiendo subir los binarios directamente a GitHub Releases.
*   **Git Tag**: Se crea una etiqueta inmutable (ej. `v1.6.4`) que apunta a este release.

---

## Cómo ejecutar el asistente

Simplemente ejecuta el siguiente comando y sigue las instrucciones en pantalla:

```bash
npm run release
```

### Consejos para un buen release:
1.  **Revisa tus cambios**: Antes de empezar, asegúrate de que todo funciona localmente.
2.  **GH_TOKEN**: Si no tienes configurada la variable de entorno, el script te pedirá el token interactivamente para subirlo a GitHub.
3.  **Versión Portable**: Recuerda que la versión portable se genera automáticamente en `dist/` junto al instalador.
