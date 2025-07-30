# Instalación Manual del Módulo ActiveX RDP Control

Si el script automático `install.ps1` da problemas, sigue estos pasos manualmente:

## 1. Verificar Prerrequisitos

### Node.js y npm
```powershell
node --version
npm --version
```
Si no están instalados, descarga desde: https://nodejs.org/

### Visual Studio Build Tools
Verifica si tienes Visual Studio Build Tools instalado:
```powershell
Get-ChildItem "C:\Program Files (x86)\Microsoft Visual Studio"
```

Si no está instalado:
1. Descarga desde: https://aka.ms/vs/17/release/vs_buildtools.exe
2. Instala con: C++ build tools, Windows 10 SDK

### mstscax.dll
Verifica que existe:
```powershell
Test-Path "C:\Windows\System32\mstscax.dll"
```

## 2. Instalar node-gyp

```powershell
npm install -g node-gyp
```

## 3. Instalar Dependencias

### Dependencias globales
```powershell
npm install -g node-addon-api
```

### Dependencias locales
```powershell
cd native/rdp-activex
npm install
```

## 4. Compilar el Módulo

```powershell
npm run build
```

## 5. Verificar la Instalación

```powershell
node -e "console.log('Módulo cargado:', require('./index.js'))"
```

## 6. Configurar Variables de Entorno

```powershell
[Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=4096", "User")
[Environment]::SetEnvironmentVariable("PYTHON", "python3", "User")
```

## 7. Probar en la Aplicación

1. Reinicia tu terminal
2. Ejecuta tu aplicación Electron
3. Intenta crear una conexión RDP

## Troubleshooting

### Error: "node-gyp rebuild" falla
- Asegúrate de tener Visual Studio Build Tools instalado
- Ejecuta como administrador
- Verifica que Python esté instalado

### Error: "mstscax.dll no encontrado"
- Habilita Remote Desktop Services en Windows
- Verifica que el archivo existe en System32

### Error: "Module not found"
- Verifica que la compilación fue exitosa
- Revisa que el archivo `build/Release/rdp_activex.node` existe

### Error: "Access denied"
- Ejecuta PowerShell como administrador
- Verifica permisos de escritura en el directorio

## Comandos de Diagnóstico

```powershell
# Verificar versión de Node.js
node --version

# Verificar versión de npm
npm --version

# Verificar node-gyp
node-gyp --version

# Verificar Python
python --version

# Verificar Visual Studio Build Tools
Get-ChildItem "C:\Program Files (x86)\Microsoft Visual Studio"

# Verificar mstscax.dll
Test-Path "C:\Windows\System32\mstscax.dll"

# Verificar compilación
ls build/Release/

# Verificar módulo
node -e "console.log(require('./index.js'))"
``` 