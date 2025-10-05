# 🐧 Integración de Cygwin en NodeTerm

NodeTerm ahora incluye **Cygwin embebido** (portable), similar a cómo MobaXterm lo integra. **No requiere instalación por parte del usuario** - todo viene integrado en la aplicación.

## 📋 ¿Qué es Cygwin?

Cygwin es una colección de herramientas Unix/Linux para Windows que proporciona un entorno completo de línea de comandos estilo Unix directamente en Windows.

## 🎯 Características

- ✅ **Completamente embebido** - No requiere instalación separada
- ✅ **Shell Bash** - Terminal Unix completo en Windows
- ✅ **Herramientas incluidas** - ls, grep, sed, git, vim, nano, curl, wget, etc.
- ✅ **Integración nativa** - Funciona como PowerShell o WSL
- ✅ **Status bar** con estadísticas del sistema
- ✅ **Temas personalizables**

## 🚀 Pasos para Habilitar Cygwin

### 1. Crear Cygwin Portable

Ejecuta el script de PowerShell proporcionado para crear el paquete de Cygwin:

```powershell
# En PowerShell (como administrador, desde la raíz del proyecto):
.\scripts\create-cygwin-portable.ps1

# O para una versión mínima (más pequeña):
.\scripts\create-cygwin-portable.ps1 -Minimal
```

Este script:
- Descarga el setup de Cygwin
- Instala los paquetes necesarios
- Crea un Cygwin portable en `resources/cygwin64/`
- Configura el entorno automáticamente
- Limpia archivos temporales

**Tiempo estimado:** 5-10 minutos  
**Tamaño resultante:**
- Mínimo: ~50-80 MB
- Completo: ~150-200 MB

### 2. Verificar Estructura

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

### 3. Compilar la Aplicación

```bash
# Desarrollo (para probar):
npm start

# Build de producción:
npm run build       # Webpack
npm run dist        # Electron builder
```

Electron Builder automáticamente incluirá la carpeta `resources/cygwin64/` en el instalador gracias a la configuración `extraResources` en `package.json`.

### 4. Usar Cygwin

Una vez compilada la aplicación:

1. **Abre NodeTerm**
2. **Verás "Cygwin" en el selector de terminal** (solo en Windows)
3. **Crea una nueva pestaña** seleccionando Cygwin
4. **¡Disfruta del terminal Unix en Windows!**

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

## 🐛 Troubleshooting

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

## 🙏 Referencias

- [Cygwin Official](https://cygwin.com/)
- [MobaXterm](https://mobaxterm.mobatek.net/)
- [node-pty](https://github.com/microsoft/node-pty)
- [xterm.js](https://xtermjs.org/)

---

**¡Disfruta de tu terminal Unix embebido en Windows! 🎉**
