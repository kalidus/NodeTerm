# 🔧 Scripts de Cygwin para NodeTerm

Esta carpeta contiene scripts para crear y expandir instalaciones de Cygwin embebido.

## 📦 Scripts Disponibles

### 1. `create-cygwin-portable.ps1`
Crea una instalación completa de Cygwin portable desde cero.

```powershell
# Instalación ULTRA COMPLETA con TODAS las herramientas (RECOMENDADO)
.\scripts\create-cygwin-portable.ps1

# Instalación completa (herramientas básicas + red, sin lenguajes)
.\scripts\create-cygwin-portable.ps1 -NoUltraComplete

# Instalación mínima (solo básico)
.\scripts\create-cygwin-portable.ps1 -Minimal

# Instalación en directorio temporal (para evitar problemas de permisos)
.\scripts\create-cygwin-portable.ps1 -UseTemp
```

**Paquetes incluidos (modo Ultra Complete - POR DEFECTO):**
- ✅ **Básicos**: bash, coreutils, grep, sed, gawk, findutils
- ✅ **Red**: wget, curl, openssh, netcat, ping, telnet, nmap
- ✅ **Herramientas**: git, vim, nano, tar, gzip, bzip2
- ✅ **Diagnóstico**: traceroute, tcpdump, net-tools
- ✅ **Sistema**: htop, iotop, tree, strace, lsof, sysstat
- ✅ **Lenguajes**: python3, nodejs, ruby, perl, php, go, rust, java
- ✅ **Utilidades**: gnuplot, graphviz, imagemagick, ffmpeg

### 2. `expand-cygwin-packages.ps1`
Expande una instalación existente de Cygwin con paquetes adicionales.

```powershell
# Agregar solo herramientas de red
.\scripts\expand-cygwin-packages.ps1 -NetworkTools

# Agregar herramientas de desarrollo
.\scripts\expand-cygwin-packages.ps1 -DevTools

# Agregar todo
.\scripts\expand-cygwin-packages.ps1 -AllTools

# Especificar directorio personalizado
.\scripts\expand-cygwin-packages.ps1 -CygwinDir "C:\mi\cygwin" -NetworkTools
```

### 3. `package-cygwin.ps1`
Empaqueta la instalación de Cygwin en un archivo ZIP para distribución.

```powershell
.\scripts\package-cygwin.ps1
```

## 🚀 Uso Rápido

### Para instalar herramientas de red en tu Cygwin actual:

```powershell
# Ejecutar desde la raíz del proyecto
.\scripts\expand-cygwin-packages.ps1 -NetworkTools
```

Esto agregará:
- `nc` (netcat)
- `ping`
- `telnet`
- `nmap`
- `traceroute`
- `tcpdump`
- `net-tools`

### Para crear una instalación completamente nueva:

```powershell
# Crear instalación ULTRA COMPLETA (incluye TODO)
.\scripts\create-cygwin-portable.ps1

# Empaquetar para distribución
.\scripts\package-cygwin.ps1
```

**¡IMPORTANTE!** El modo por defecto ahora es **Ultra Complete**, que incluye:
- ✅ Todas las herramientas de red (nc, ping, telnet, nmap, etc.)
- ✅ Lenguajes de programación (Python, Node.js, Ruby, Perl, PHP, Go, Rust, Java)
- ✅ Herramientas de sistema (htop, iotop, tree, strace, lsof)
- ✅ Utilidades avanzadas (gnuplot, graphviz, imagemagick, ffmpeg)

## 📋 Requisitos

- **PowerShell 5.0+**
- **Conexión a Internet** (para descargar paquetes)
- **Permisos de escritura** en el directorio del proyecto
- **~500MB de espacio libre** para instalación Ultra Complete
- **~200MB de espacio libre** para instalación Full
- **~50MB de espacio libre** para instalación Minimal

## 🔍 Verificar Instalación

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

## ⚠️ Notas Importantes

1. **Primera ejecución**: Los scripts descargan el instalador de Cygwin (~2MB)
2. **Tiempo de instalación**: 5-10 minutos dependiendo de la conexión
3. **Tamaño final**: ~150-200MB para instalación completa
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

## 📚 Más Información

- [Documentación de Cygwin](https://cygwin.com/cygwin-ug-net/)
- [Lista de paquetes disponibles](https://cygwin.com/packages/)
- [Documentación de NodeTerm](../docs/CYGWIN_INTEGRATION.md)
