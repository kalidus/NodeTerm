# 📦 Cygwin Pre-empaquetado para NodeTerm

En lugar de instalar Cygwin desde cero (que tarda 10 minutos y puede causar reinicios), NodeTerm descarga un **paquete pre-empaquetado** de Cygwin que ya está listo para usar.

## 🎯 Ventajas

- ✅ **Más rápido** - 2-3 minutos vs 10+ minutos
- ✅ **Sin reinicios** - Descarga fuera del proyecto
- ✅ **Confiable** - Siempre la misma versión probada
- ✅ **Sin instalación** - Solo descarga y extrae

## 📋 Cómo Crear el Paquete

### 1. Crear Cygwin Portable

Primero, crea el Cygwin portable localmente:

```powershell
cd C:\Users\kalid\Documents\Cursor\NodeTerm
.\scripts\create-cygwin-portable.ps1
```

Esto creará `resources\cygwin64\` con todo Cygwin instalado.

### 2. Empaquetar Cygwin

Una vez creado, empaquétalo en un archivo comprimido:

```powershell
.\scripts\package-cygwin.ps1
```

Esto creará `cygwin64-portable.zip` (~80-100 MB comprimido).

### 3. Subir a GitHub Releases

1. Ve a tu repositorio en GitHub
2. Click en **Releases** → **Create a new release**
3. Tag: `cygwin-v1.0.0`
4. Title: `Cygwin Portable Package v1.0.0`
5. Description:
   ```markdown
   Paquete de Cygwin portable pre-instalado para NodeTerm.
   
   Incluye:
   - bash, coreutils, grep, sed, gawk
   - git, vim, nano
   - curl, wget
   - openssh, tar, gzip, bzip2
   ```
6. **Adjunta el archivo** `cygwin64-portable.zip`
7. **Publish release**

### 4. Actualizar URL en el Código

Edita `src/main/services/CygwinDownloader.js`:

```javascript
const CYGWIN_PACKAGE_URL = 'https://github.com/TU_USUARIO/NodeTerm/releases/download/cygwin-v1.0.0/cygwin64-portable.zip';
```

Reemplaza:
- `TU_USUARIO` con tu usuario de GitHub
- `NodeTerm` con el nombre de tu repo
- `cygwin-v1.0.0` con tu tag de release

## 🚀 Cómo Funciona

1. **Usuario intenta usar Cygwin** por primera vez
2. **NodeTerm detecta** que no está instalado
3. **Descarga automáticamente** el paquete desde GitHub Releases
4. **Extrae** en `resources\cygwin64\`
5. **¡Listo para usar!**

## 📊 Tamaños Esperados

- **Sin comprimir:** ~150-200 MB
- **Comprimido (ZIP):** ~80-100 MB
- **Comprimido (7Z):** ~60-80 MB (mejor compresión)

## 🔄 Actualizaciones

Para actualizar Cygwin:

1. Crea una nueva versión con el script
2. Empaquétalo
3. Sube como nuevo release (ej: `cygwin-v1.1.0`)
4. Actualiza la URL en el código
5. Los usuarios descargarán la nueva versión automáticamente

## 🛠️ Mantenimiento

### Verificar Integridad

Puedes generar un hash SHA256 del paquete:

```powershell
Get-FileHash .\cygwin64-portable.zip -Algorithm SHA256
```

### Incluir en el Instalador (Opcional)

Si quieres que venga pre-instalado en el instalador de la app:

1. Incluye `resources\cygwin64\` en el build
2. Actualiza `package.json`:
   ```json
   "build": {
     "extraResources": [
       {
         "from": "resources/cygwin64",
         "to": "cygwin64",
         "filter": ["**/*"]
       }
     ]
   }
   ```

Esto aumentará el tamaño del instalador en ~80-100 MB, pero Cygwin estará disponible inmediatamente sin descargas.

## 📝 Notas

- El paquete se descarga en `%TEMP%\nodeterm-cygwin-download\`
- Después de extraer, los archivos temporales se eliminan
- Si la descarga falla, se puede reintentar
- La extracción usa PowerShell `Expand-Archive` (nativo en Windows 10+)

## ❓ FAQ

### ¿Por qué no incluirlo directamente en el repo?

Git no maneja bien archivos grandes (>100 MB). GitHub tiene límites y el clone sería muy lento.

### ¿Y si GitHub está bloqueado?

Puedes:
1. Subir el paquete a tu propio servidor
2. Usar un CDN
3. Incluirlo directamente en el instalador

### ¿Puedo usar 7-Zip en lugar de ZIP?

Sí, pero necesitarías que 7-Zip esté instalado en la máquina del usuario. ZIP es nativo en PowerShell.

---

**¡Esta solución es mucho más simple y confiable!** 🎉
