# 🐧 Integración Completa de Cygwin en NodeTerm

NodeTerm incluye **Cygwin embebido** (portable) directamente en el instalador, similar a cómo MobaXterm lo integra. **No requiere instalación por parte del usuario** - todo viene integrado en la aplicación, eliminando la necesidad de descargas o instalaciones adicionales.

## 📋 ¿Qué es Cygwin?

Cygwin es una colección de herramientas Unix/Linux para Windows que proporciona un entorno completo de línea de comandos estilo Unix directamente en Windows.

## 🎯 Características y Ventajas

### Características Técnicas
- ✅ **Completamente embebido** - No requiere instalación separada
- ✅ **Shell Bash** - Terminal Unix completo en Windows
- ✅ **Herramientas incluidas** - ls, grep, sed, git, vim, nano, curl, wget, etc.
- ✅ **Integración nativa** - Funciona como PowerShell o WSL
- ✅ **Status bar** con estadísticas del sistema
- ✅ **Temas personalizables**

### Ventajas para el Usuario
- ✅ **Completamente transparente** - Sin descargas ni instalaciones
- ✅ **Funciona inmediatamente** - Disponible desde el primer uso
- ✅ **Sin dependencias de red** - No requiere conexión a internet
- ✅ **Confiable** - Siempre la misma versión probada
- ✅ **Portable** - Funciona en cualquier Windows

## 📋 Cómo Crear el Paquete Cygwin

### 1. Crear Cygwin Portable

Ejecuta el script principal para crear la instalación completa:

```powershell
# Instalación MEDIUM (POR DEFECTO - RECOMENDADO)
# Básicos + red + utilidades + herramientas avanzadas (sin compiladores ni lenguajes)
.\scripts\create-cygwin-portable.ps1

# O explícitamente:
.\scripts\create-cygwin-portable.ps1 -Medium

# Instalación mínima (solo básico)
.\scripts\create-cygwin-portable.ps1 -Minimal

# Instalación completa (MEDIUM + compiladores y herramientas de desarrollo)
.\scripts\create-cygwin-portable.ps1 -Full

# Instalación ULTRA COMPLETA (FULL + lenguajes de programación)
.\scripts\create-cygwin-portable.ps1 -NoUltraComplete

# Instalación en directorio temporal (para evitar problemas de permisos)
.\scripts\create-cygwin-portable.ps1 -UseTemp
```

Esto creará `resources\cygwin64\` con todo Cygwin instalado.

**Paquetes incluidos por modo:**

**🔹 MODO MINIMAL (`-Minimal`):**
- ✅ **Básicos**: bash, coreutils, grep, sed, gawk, findutils, which, less, ncurses
- 📦 **Tamaño estimado**: ~50-100 MB

**🔹 MODO MEDIUM (`-Medium` o por defecto):**
- ✅ **Básicos**: bash, coreutils, grep, sed, gawk, findutils, which, less, ncurses
- ✅ **Red esencial**: wget, curl, openssh, netcat, iputils (ping), nmap, net-tools, openssl, ca-certificates, libcurl4, libssh2, rsync
- ✅ **Utilidades básicas**: git, vim, nano, tar, gzip, zip, unzip, procps-ng
- ✅ **Herramientas avanzadas**: htop (monitoreo del sistema)
- ❌ **SIN herramientas pesadas** (tcpdump, strace, lsof, telnet - tienen muchas dependencias)
- ❌ **SIN compiladores** (gcc, g++, make, cmake)
- ❌ **SIN lenguajes de programación** (python, nodejs, ruby, etc.)
- ❌ **SIN documentación pesada** (man-db, info)
- ❌ **SIN herramientas redundantes** (bzip2, diffutils, file, inetutils, traceroute, ltrace, iotop, sysstat, more)
- 📦 **Tamaño estimado**: ~200-400 MB (optimizado con nmap y htop)

**🔹 MODO FULL (`-Full`):**
- ✅ **Todo MEDIUM** PLUS:
- ✅ **Desarrollo**: gcc, g++, make, cmake, autoconf, automake, libtool, pkg-config, binutils
- 📦 **Tamaño estimado**: ~500-800 MB

**🔹 MODO ULTRA COMPLETE (`-NoUltraComplete` o sin parámetros):**
- ✅ **Todo FULL** PLUS:
- ✅ **Utilidades adicionales**: tree, psmisc, util-linux, time, parallel
- ✅ **Lenguajes**: python3, pip, nodejs, npm, yarn, ruby, perl, php, go, rust, java-openjdk
- ✅ **Utilidades avanzadas**: gnuplot, graphviz, imagemagick, ffmpeg
- 📦 **Tamaño estimado**: ~1-2 GB

### 3. Verificar Estructura

Después de ejecutar el script, verifica que exista esta estructura:

```
NodeTerm/
└── resources/
    └── cygwin64/           ✓ Creado por el script
        ├── bin/
        │   ├── bash.exe    ✓ Archivo principal
        │   ├── ls.exe
        │   └── ...
        ├── etc/
        ├── home/
        ├── lib/
        └── usr/
```

### 4. Compilar la Aplicación

```bash
# Desarrollo (para probar):
npm start

# Build de producción:
npm run build       # Webpack
npm run dist        # Electron builder
```

Electron Builder automáticamente incluirá la carpeta `resources/cygwin64/` en el instalador gracias a la configuración `extraResources` en `package.json`.

### 5. Usar Cygwin

Una vez compilada la aplicación:

1. **Abre NodeTerm**
2. **Verás "Cygwin" en el selector de terminal** (solo en Windows)
3. **Crea una nueva pestaña** seleccionando Cygwin
4. **¡Disfruta del terminal Unix en Windows!**

## 🚀 Cómo Funciona

1. **Usuario instala NodeTerm** desde el instalador
2. **Cygwin ya está incluido** en `resources\cygwin64\`
3. **Usuario abre NodeTerm** y selecciona terminal Cygwin
4. **¡Funciona inmediatamente!** - Sin descargas ni instalaciones

## 📊 Tamaños Esperados

**Modo MEDIUM (por defecto):**
- **Cygwin sin comprimir:** ~150-300 MB
- **Instalador final:** ~100-200 MB (comprimido por Electron Builder)
- **Espacio en disco del usuario:** ~150-300 MB después de instalar

**Modo FULL:**
- **Cygwin sin comprimir:** ~500-800 MB
- **Instalador final:** ~300-500 MB (comprimido)
- **Espacio en disco del usuario:** ~500-800 MB después de instalar

**Modo ULTRA COMPLETE:**
- **Cygwin sin comprimir:** ~1-2 GB
- **Instalador final:** ~600-900 MB (comprimido)
- **Espacio en disco del usuario:** ~1-2 GB después de instalar

## 🔧 Arquitectura Técnica

### Backend (`src/main/services/CygwinService.js`)

- **Detección automática** del Cygwin embebido
- **Spawn de procesos** usando `node-pty` con WinPTY
- **Gestión de sesiones** por pestaña
- **Variables de entorno** configuradas automáticamente

### Frontend (`src/components/CygwinTerminal.js`)

- **xterm.js** para renderizado del terminal
- **Tema Unix-like** (verde sobre negro por defecto)
- **Status bar** con métricas del sistema
- **Copy/paste** con Ctrl+C/Ctrl+V

### Handlers IPC (`main.js`)

```javascript
// Detección
ipcMain.handle('cygwin:detect', async () => { ... });

// Operaciones por pestaña
ipcMain.on(`cygwin:start:${tabId}`, ...);
ipcMain.on(`cygwin:data:${tabId}`, ...);
ipcMain.on(`cygwin:resize:${tabId}`, ...);
ipcMain.on(`cygwin:stop:${tabId}`, ...);
```

## 📦 Distribución

### En Desarrollo

El Cygwin portable debe estar en:
```
NodeTerm/resources/cygwin64/
```

### En Producción

Electron Builder copia automáticamente Cygwin a:
```
C:\Users\<user>\AppData\Local\Programs\NodeTerm\resources\cygwin64\
```

## 🔄 Actualizaciones

Para actualizar Cygwin:

1. Ejecuta `.\scripts\create-cygwin-portable.ps1` para crear nueva versión
2. Ejecuta `npm run dist` para crear nuevo instalador
3. Distribuye el nuevo instalador a los usuarios
4. Los usuarios instalan la nueva versión que incluye el Cygwin actualizado

## 🎨 Personalización

### Tema

Edita el tema de Cygwin en `src/components/CygwinTerminal.js`:

```javascript
theme: {
    background: '#000000',      // Fondo negro
    foreground: '#00FF00',      // Texto verde (clásico)
    cursor: '#00FF00',
    // ... más colores
}
```

### Paquetes Adicionales

Modifica el script `scripts/create-cygwin-portable.ps1`:

```powershell
# Línea de paquetes
$FULL_PACKAGES = "bash,coreutils,grep,sed,gawk,findutils,which,less,ncurses,wget,curl,git,vim,nano,openssh,tar,gzip,bzip2,diffutils,file,procps-ng,YOUR_PACKAGE_HERE"
```

## 🛠️ Mantenimiento

### Verificar Instalación

Después de ejecutar los scripts, puedes verificar que las herramientas estén disponibles:

```bash
# En tu terminal de Cygwin
which nc
which ping
which telnet
which nmap

# Probar herramientas
nc --version
ping --version
```

### Verificar Integridad

Puedes verificar que Cygwin está correctamente incluido en el instalador:

```powershell
# Verificar que bash.exe está en el instalador
Test-Path "dist\win-unpacked\resources\cygwin64\bin\bash.exe"

# Verificar configuración fstab
Get-Content "dist\win-unpacked\resources\cygwin64\etc\fstab" | Select-String "tmp"
```

### Configuración Automática

El instalador incluye automáticamente `resources\cygwin64\` gracias a la configuración en `package.json`:

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

## 📋 Requisitos para Desarrollo

- **PowerShell 5.0+**
- **Conexión a Internet** (para descargar paquetes)
- **Permisos de escritura** en el directorio del proyecto
- **~150-300MB de espacio libre** para instalación Medium (por defecto)
- **~500-800MB de espacio libre** para instalación Full
- **~1-2GB de espacio libre** para instalación Ultra Complete
- **~50-100MB de espacio libre** para instalación Minimal

## ⚠️ Notas Importantes

1. **Primera ejecución**: Los scripts descargan el instalador de Cygwin (~2MB)
2. **Tiempo de instalación**: 5-10 minutos dependiendo de la conexión y modo seleccionado
3. **Tamaño final**: 
   - **Medium (por defecto)**: ~150-300MB
   - **Full**: ~500-800MB
   - **Ultra Complete**: ~1-2GB
4. **Reinstalación**: Ejecutar `create-cygwin-portable.ps1` sobrescribe la instalación anterior

## 🐛 Solución de Problemas

### Error de permisos
```powershell
# Usar directorio temporal
.\scripts\create-cygwin-portable.ps1 -UseTemp
```

### Error de conexión
- Verificar conexión a Internet
- Intentar con otro mirror: cambiar URL en el script

### Herramientas no encontradas
```powershell
# Verificar que el paquete se instaló correctamente
Get-ChildItem .\resources\cygwin64\bin\ | Where-Object { $_.Name -like "*nc*" }
```

### Error `/tmp` en Cygwin
Este error se solucionó automáticamente en el script. Si aparece:
1. Verificar que `resources\cygwin64\etc\fstab` contiene la línea para `/tmp`
2. Si no está, ejecutar nuevamente `create-cygwin-portable.ps1`

### Cygwin no aparece en el selector

1. Verifica que `resources/cygwin64/bin/bash.exe` existe
2. Revisa la consola de desarrollo (F12) para errores
3. Busca el log: `🔍 Cygwin disponible: false`

### Error al iniciar Cygwin

**Síntoma:** `No se pudo iniciar Cygwin`

**Soluciones:**
1. Ejecuta el script de creación de Cygwin de nuevo
2. Verifica permisos de la carpeta `resources/cygwin64/`
3. En desarrollo, verifica que `app.getAppPath()` apunta correctamente

### Comandos no funcionan

**Síntoma:** Comandos como `ls`, `git` no se encuentran

**Solución:**
- Verifica que los paquetes están instalados
- Vuelve a ejecutar el script sin `-Minimal`

## ❓ FAQ

### ¿Por qué incluirlo en el instalador?

- **Transparencia total** - El usuario no necesita hacer nada
- **Sin dependencias de red** - Funciona offline
- **Confiable** - Siempre la misma versión probada
- **Inmediato** - Disponible desde el primer uso

### ¿El instalador será muy grande?

- **Medium (por defecto): ~100-200MB** - Incluye herramientas esenciales y de red
- **Full: ~300-500MB** - Incluye también compiladores
- **Ultra Complete: ~600-900MB** - Incluye lenguajes de programación
- **Una sola descarga** - El usuario no necesita descargar nada más
- **Sin instalaciones adicionales** - Todo viene listo

### ¿Puedo crear versiones más pequeñas?

Sí, usando los parámetros del script:
- **Por defecto (Medium)**: ~150-300MB (básicos + red + utilidades + herramientas avanzadas esenciales)
- `-Minimal`: ~50-100MB (solo herramientas básicas)
- `-Full`: ~500-800MB (Medium + compiladores)
- Sin parámetros: ~1-2GB (Ultra Complete con lenguajes)

## 📊 Rendimiento

- **Uso de memoria:** ~50-80 MB por sesión
- **Tiempo de inicio:** ~1-2 segundos
- **Backend:** WinPTY (mejor compatibilidad que ConPTY)

## 🔐 Seguridad

- Cygwin se ejecuta con los permisos del usuario actual
- No requiere permisos de administrador
- Sandboxed dentro de Electron
- Sin conexiones de red salientes por defecto

## 📄 Licencia

Cygwin está bajo licencia GPLv3. Al distribuir NodeTerm con Cygwin embebido, debes:

1. Incluir el código fuente de Cygwin (o un enlace)
2. Mantener las licencias de Cygwin
3. Cumplir con los términos de la GPL

## 🎯 Roadmap Futuro

- [ ] Actualización automática de Cygwin
- [ ] Selector de paquetes en la UI
- [ ] Soporte para X11 (aplicaciones gráficas)
- [ ] Integración con WSL para compartir home

## 📚 Más Información

- [Documentación de Cygwin](https://cygwin.com/cygwin-ug-net/)
- [Lista de paquetes disponibles](https://cygwin.com/packages/)
- [MobaXterm](https://mobaxterm.mobatek.net/)
- [node-pty](https://github.com/microsoft/node-pty)
- [xterm.js](https://xtermjs.org/)

---

**¡Disfruta de tu terminal Unix embebido en Windows! 🎉**
