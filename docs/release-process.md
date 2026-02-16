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
*   **Merge**: Se fusionan los cambios de tu rama en `main`. Esto garantiza que `main` siempre sea el reflejo exacto de lo que está en producción.

### Etapa 3: Despliegue (En la rama Main)
Una vez el código está en `main`, se procede a la construcción y entrega.
*   **Build Unificado**: El script compila el código y genera los ejecutables en un solo paso eficiente, evitando compilaciones duplicadas.
*   **Artefactos**: Se genera el **Instalador** (`-Setup.exe`) y la **Versión Portable** (`.exe` sin Setup).
*   **GitHub Publishing**: Sube binarios y el archivo de actualización (**`latest.yml`**) directamente. Si no tienes el token configurado, el script te lo pedirá.
*   **Git Tag**: Crea una etiqueta oficial (ej. `v1.6.4`) y la sube al repositorio.

---

## Cómo ejecutar el asistente

Simplemente ejecuta el siguiente comando y sigue las instrucciones en pantalla:

```bash
npm run release
```

### Consejos para un buen release:
1.  **GH_TOKEN**: El script te permite pegar el token en el momento, no es necesario configurar variables de entorno antes.
2.  **Timeouts**: Si la subida a GitHub falla por tiempo de espera (debido al tamaño del archivo), el script te informará; en ese caso, puedes intentar relanzar la Etapa 3.
3.  **Archivos**: Todos los archivos finales se encuentran en la carpeta `dist/`.
