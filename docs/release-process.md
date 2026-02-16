# Proceso de Release - NodeTerm

Este documento detalla los pasos necesarios para realizar un nuevo lanzamiento (release) de NodeTerm.

## Pre-requisitos
- Tener una rama limpia (sin cambios pendientes por commitear).
- Estar en la rama principal (`main` o `master`).
- Tener instaladas todas las dependencias (`npm install`).

## Pasos del Release (Manuales)

1.  **Revisar Versión Actual**: Comprueba la versión actual en `package.json`.
2.  **Actualizar Changelog**: Asegúrate de que `CHANGELOG.md` tenga los últimos cambios bajo una nueva cabecera de versión.
3.  **Compilar y Probar**: Ejecuta `npm run build` para asegurar que el código compila correctamente.
4.  **Generar Binarios**: Ejecuta `npm run dist` para crear los instaladores.
5.  **Scan de Virus**: Ejecuta `npm run scan:virustotal` para verificar la seguridad del binario.
6.  **Git Tag**: Crea un tag de git con la nueva versión (ej. `v1.6.4`).
7.  **Subir a GitHub**: Sube los cambios y el tag a GitHub.

---

## Proceso Automatizado (Recomendado)

Se ha implementado un script interactivo que te guía por todo este proceso:

```bash
npm run release
```

### ¿Qué hace el script?
1.  **Verificación de Git**: Comprueba que no hay archivos sin guardar.
2.  **Selección de Versión**: Te permite elegir si es un cambio de parche (patch), menor (minor) o mayor (major).
3.  **Actualización Automática**:
    *   Actualiza la versión en `package.json`.
    *   Actualiza la fecha y versión en `CHANGELOG.md`.
4.  **Compilación**: Ejecuta el build de producción.
5.  **Empaquetado y Escaneo (Opcional)**: Te pregunta si quieres generar los binarios y enviarlos a VirusTotal.
6.  **Guía Final**: Te proporciona los comandos de Git necesarios para finalizar el proceso.

## Publicación
Una vez subidos los tags a GitHub, el sistema de publicación configurado en `package.json` se encargará de crear el borrador de la release en el repositorio.
