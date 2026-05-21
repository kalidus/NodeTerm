# Proceso de release ? NodeTerm

Flujo para publicar versiones con el asistente `npm run release` y una sola fuente de verdad para los cambios.

## Archivos y roles

| Archivo | Rol |
|---------|-----|
| **`CHANGELOG.md`** | Fuente de verdad ([Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)). Todo cambio notable va aqu?. |
| **`RELEASE_NOTES.md`** | Borrador **opcional** solo de la versi?n en curso (tono usuario). No duplicar historial. |
| **`README.md`** | Badge, resumen corto de la ?ltima versi?n publicada y enlaces a changelog/releases. **Sin** changelog embebido. |
| **`package.json`** | Versi?n de la app; webpack y electron-builder la propagan. |

GitHub Release recibe el texto de la secci?n `## [x.y.z]` de **`CHANGELOG.md`** (v?a `scripts/release.js`).

## Flujo est?ndar

### 1. Preparaci?n (rama `release/x.y.z`)

```bash
git checkout -b release/1.6.8   # ejemplo
npm version patch --no-git-tag-version
```

- A?adir en `CHANGELOG.md`:

  ```markdown
  ## [1.6.8] - YYYY-MM-DD

  ### Added / Changed / Fixed ...
  ```

- Opcional: redactar resumen en `RELEASE_NOTES.md` (solo esta versi?n).
- Actualizar `README.md`: badge, tabla de versi?n y 1 p?rrafo de resumen (sin listar versiones antiguas).
- Commit: `release: preparaci?n v1.6.8`

Durante el desarrollo, ir a?adiendo bullets bajo esa secci?n del changelog.

### 2. Integraci?n

- Merge de `release/x.y.z` ? `main` cuando el c?digo est? listo para publicar.
- Cerrar fecha en `CHANGELOG.md` y quitar entradas tipo ?En preparaci?n? si ya no aplican.

### 3. Publicaci?n (normalmente en `main`)

```bash
npm run release
```

El asistente puede:

- Compilar y generar instaladores en `dist/`
- Crear tag `vX.Y.Z` y subir a GitHub
- Publicar notas desde **`CHANGELOG.md`**
- Subir `latest.yml` y artefactos

Si las notas en GitHub salen mal codificadas en Windows:

```bash
npm run fix-release-notes
```

### 4. Tras publicar

- En `main`: README con la versi?n **ya publicada** (no la rama en curso).
- Borrador de `RELEASE_NOTES.md` listo para la **siguiente** versi?n o vac?o con la plantilla.

## Checklist antes del tag

- [ ] `package.json` / `package-lock.json` con la versi?n correcta
- [ ] `CHANGELOG.md` con secci?n completa y fecha
- [ ] `README.md`: badge y resumen alineados con la release publicada
- [ ] `RELEASE_NOTES.md` (opcional): solo borrador de esta versi?n, sin historial apilado
- [ ] `npm run build` si quieres verificar la versi?n en la UI

## Consejos

1. **GH_TOKEN**: el script puede usar `gh auth token` o pedir el token al vuelo.
2. **Timeouts**: si falla la subida por tama?o, reintentar la etapa de publicaci?n.
3. **No mantener tres changelogs**: detalle solo en `CHANGELOG.md`; README y GitHub resumen o enlazan.
