# Clave maestra: backup `.nodeterm` y sincronización Nextcloud

Este documento describe **cuándo** se pide la clave maestra (Master Key), qué **no** se transfiere nunca fuera del dispositivo y cómo se comportan el backup local y la nube.

---

## Dos contraseñas distintas

| | **Clave maestra (Master Key)** | **Contraseña del archivo `.nodeterm`** (opcional) |
|---|---|---|
| **Para qué sirve** | Cifra conexiones, contraseñas del gestor, documentos, etc. dentro de la app | Cifra **todo el archivo** de backup al exportar |
| **¿Sale del PC?** | **No** (ni en `.nodeterm` ni en Nextcloud) | Solo viaja dentro del `.nodeterm` si se activa al exportar |
| **Dónde se configura** | Ajustes → Clave maestra, o diálogos de desbloqueo | Solo al exportar/importar `.nodeterm` |

La clave maestra **no se importa desde la nube ni desde el archivo de backup**: el usuario debe **introducir la misma clave** que en el equipo de origen; la aplicación la guarda **solo en este dispositivo** (archivo local de Electron y/o `localStorage`).

---

## Uso diario de la aplicación

| Situación | Comportamiento |
|-----------|----------------|
| Primera configuración | **Ajustes → Clave maestra** → definir y confirmar (mín. 6 caracteres) |
| Clave ya guardada al abrir la app | **UnlockDialog** (“Desbloquear NodeTerm”), salvo que esté activo “Recordar contraseña” |
| Recordar contraseña | Auto-desbloqueo al iniciar (`nodeterm_remember_password`) |
| Cambiar clave | Ajustes → cambiar (clave actual + nueva) |

Componentes: `UnlockDialog.js`, `SettingsDialog.js` (sección clave maestra), `SecureStorage.js`.

---

## Backup NodeTerm (archivo `.nodeterm`)

### Exportar

1. Se exportan los datos seleccionados (conexiones, contraseñas, config, etc.).
2. **Opcional**: cifrar el archivo completo con una **contraseña del `.nodeterm`** (mín. 8 caracteres, distinta de la master key).
3. Si en la app hay datos cifrados con master key, el backup incluye los blobs tal cual (`passwords_encrypted`, `connections_encrypted`, …).
4. **La clave maestra no se incluye** en el archivo.

Componentes: `ExportDialog.js`, `ExportImportService.js`.

### Importar

1. **Archivo cifrado como `.nodeterm`**: se pide la **contraseña del archivo** para desbloquearlo.
2. **Blobs cifrados con master key dentro del JSON** (aunque el archivo no esté cifrado): se pide la **clave maestra** para el **preview** (ver estadísticas reales).
3. Al confirmar la importación, los blobs se copian a `localStorage` **sin instalar** la master key.
4. En un **PC limpio**: hay que configurar la **misma** clave maestra en Ajustes (o usar el flujo de Nextcloud descrito abajo) para poder leer esos datos.

Componentes: `ImportExportDialog.js`, `ExportImportService.js`.

Referencia adicional: `docs/EXPORT_IMPORT_SYSTEM.md`.

---

## Sincronización Nextcloud

### Archivos en la nube

| Archivo | Contenido |
|---------|-----------|
| `nodeterm-settings.json` | Temas, fuentes, historial, etc. (sin secretos de vault) |
| `nodeterm-tree.json` | Estructura del árbol (carpetas, nombres, hosts). **Sin contraseñas** si existe vault local cifrado |
| `nodeterm-connections.enc` | Vault de conexiones (blob cifrado con master key) |
| `nodeterm-passwords.enc` | Vault del gestor de contraseñas |
| `nodeterm-passwords-meta.json` | Metadatos y copia de respaldo del vault |
| `nodeterm-sync-manifest.json` | Manifiesto: `requiresMasterKeyForSecrets`, `masterKeyExported: false`, `treeSanitized`, etc. |
| `nodeterm-sessions.enc` | Sesiones cifradas (si hay clave disponible al subir) |

La **clave maestra nunca se sube** a Nextcloud.

### Subir (sync → nube)

1. Si existe `connections_encrypted`, se sube a `nodeterm-connections.enc` y el árbol se **sanitiza** (se eliminan `password`, `privateKey`, etc. del JSON).
2. Si existe `passwords_encrypted`, se sube a `nodeterm-passwords.enc` (y respaldo en meta).
3. Se actualiza el manifiesto de sincronización.

Componente principal: `SyncManager.js` (`syncToCloud`, `prepareTreeJsonForCloudUpload`).

### Bajar (nube → instalación limpia)

1. Se descargan configuración, favoritos, documentos y los vaults `.enc` a `localStorage`.
2. Se importa `nodeterm-tree.json` (estructura; credenciales reales están en el vault si el backup es reciente).
3. Si hay vaults cifrados y **no** hay clave maestra usable en este PC:
   - Se dispara el evento `cloud-restore-requires-master-key`.
   - Se muestra **`CloudRestoreMasterKeyDialog`**: el usuario introduce la **misma** clave del origen (con confirmación).
   - La app **valida** descifrando los vaults, **guarda** la clave en el dispositivo y recarga conexiones y contraseñas.
4. Si ya existía clave maestra guardada: al abrir la app aplica el flujo normal de **UnlockDialog**.

Componentes: `SyncManager.js` (`syncFromCloud`), `CloudRestoreMasterKeyDialog.js`, `SyncSettingsDialog.js`, `App.js`.

### Backups antiguos en la nube

Si el backup se creó antes de la sanitización del árbol, `nodeterm-tree.json` puede contener **credenciales en texto plano**. En ese caso las conexiones pueden verse **sin** desbloquear la master key, pero el gestor de contraseñas seguirá requiriendo el vault. Conviene **volver a subir** desde un equipo con clave maestra configurada para migrar al formato seguro.

---

## Diagrama resumido (Nextcloud)

```
Origen (PC con Master Key "X")
  ├── Sube nodeterm-connections.enc  (cifrado con X)
  ├── Sube nodeterm-passwords.enc    (cifrado con X)
  └── Sube nodeterm-tree.json        (sin secretos)
  └── NO sube la clave X

Destino (instalación limpia)
  ├── Descarga vaults .enc → localStorage
  ├── Diálogo: "Introduce la misma clave X"
  ├── Valida descifrado → saveMasterKey(X) en este PC
  └── Carga conexiones y contraseñas
```

---

## Eventos y claves de almacenamiento

| Evento | Uso |
|--------|-----|
| `cloud-restore-requires-master-key` | Tras descarga de nube sin poder descifrar vaults |
| `connections-synced-from-cloud` | Recargar árbol de conexiones tras sync |
| `passwords-synced-from-cloud` | Recargar gestor de contraseñas tras sync |

| Clave `localStorage` / archivo | Contenido |
|-------------------------------|-----------|
| `nodeterm_master_key` | Clave maestra cifrada (protección por huella del dispositivo) |
| `connections_encrypted` | Árbol de conexiones cifrado |
| `passwords_encrypted` | Árbol del gestor de contraseñas cifrado |
| `basicapp2_tree_data` | Árbol en claro (solo si no hay master key activa) |

---

## Mantenimiento

Al cambiar el comportamiento de sync o import/export, actualizar este documento y, si aplica, `docs/EXPORT_IMPORT_SYSTEM.md` y `docs/SISTEMA_ENCRIPTACION.md`.
