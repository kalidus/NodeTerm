# Script de instalación simple para ActiveX RDP Control
# Ejecutar como administrador en PowerShell

Write-Host "🚀 Instalando ActiveX RDP Control..." -ForegroundColor Green

# Verificar que estamos en Windows
if ($env:OS -ne "Windows_NT") {
    Write-Error "Este script solo funciona en Windows"
    exit 1
}

# Verificar permisos de administrador
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $isAdmin) {
    Write-Warning "Se recomienda ejecutar este script como administrador"
}

# Verificar Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Error "Node.js no está instalado. Por favor instala Node.js 16+ desde https://nodejs.org/"
    exit 1
}

# Verificar npm
try {
    $npmVersion = npm --version
    Write-Host "✅ npm detectado: $npmVersion" -ForegroundColor Green
} catch {
    Write-Error "npm no está instalado"
    exit 1
}

# Verificar Visual Studio Build Tools
$vsTools = Get-ChildItem "C:\Program Files (x86)\Microsoft Visual Studio" -ErrorAction SilentlyContinue
if (-not $vsTools) {
    Write-Warning "Visual Studio Build Tools no detectado"
    Write-Host "📥 Descargando Visual Studio Build Tools..." -ForegroundColor Yellow
    
    $vsToolsUrl = "https://aka.ms/vs/17/release/vs_buildtools.exe"
    $vsToolsPath = "$env:TEMP\vs_buildtools.exe"
    
    try {
        Invoke-WebRequest -Uri $vsToolsUrl -OutFile $vsToolsPath
        Write-Host "✅ Visual Studio Build Tools descargado" -ForegroundColor Green
        Write-Host "🔧 Por favor instala Visual Studio Build Tools manualmente desde: $vsToolsPath" -ForegroundColor Yellow
        Write-Host "   Asegúrate de incluir: C++ build tools, Windows 10 SDK" -ForegroundColor Yellow
    }
    catch {
        Write-Error "Error descargando Visual Studio Build Tools: $_"
        exit 1
    }
} else {
    Write-Host "✅ Visual Studio Build Tools detectado" -ForegroundColor Green
}

# Verificar node-gyp
try {
    $nodeGypVersion = node-gyp --version
    Write-Host "✅ node-gyp detectado: $nodeGypVersion" -ForegroundColor Green
} catch {
    Write-Host "📦 Instalando node-gyp..." -ForegroundColor Yellow
    npm install -g node-gyp
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Error instalando node-gyp"
        exit 1
    }
    Write-Host "✅ node-gyp instalado" -ForegroundColor Green
}

# Verificar mstscax.dll
$mstscaxPath = "C:\Windows\System32\mstscax.dll"
if (-not (Test-Path $mstscaxPath)) {
    Write-Error "mstscax.dll no encontrado en $mstscaxPath"
    Write-Host "💡 Asegúrate de que Remote Desktop Services esté habilitado" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ mstscax.dll detectado" -ForegroundColor Green
}

# Instalar dependencias
Write-Host "📦 Instalando dependencias..." -ForegroundColor Yellow

# Instalar node-addon-api globalmente
npm install -g node-addon-api
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando node-addon-api"
    exit 1
}

# Instalar dependencias locales
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error instalando dependencias locales"
    exit 1
}

Write-Host "✅ Dependencias instaladas" -ForegroundColor Green

# Compilar el módulo
Write-Host "🔨 Compilando módulo nativo..." -ForegroundColor Yellow

# Limpiar builds anteriores
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
}

# Compilar
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Error compilando el módulo nativo"
    exit 1
}

Write-Host "✅ Módulo nativo compilado" -ForegroundColor Green

# Verificar la instalación
Write-Host "🧪 Verificando instalación..." -ForegroundColor Yellow

try {
    node -e "console.log('✅ Módulo cargado correctamente:', require('./index.js'))"
    Write-Host "✅ Instalación verificada exitosamente" -ForegroundColor Green
} catch {
    Write-Warning "⚠️  Error en verificación: $_"
}

# Configurar variables de entorno
Write-Host "🔧 Configurando variables de entorno..." -ForegroundColor Yellow

[Environment]::SetEnvironmentVariable("NODE_OPTIONS", "--max-old-space-size=4096", "User")
[Environment]::SetEnvironmentVariable("PYTHON", "python3", "User")

Write-Host "✅ Variables de entorno configuradas" -ForegroundColor Green

# Mostrar información final
Write-Host ""
Write-Host "🎉 ¡Instalación completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
Write-Host "   1. Reinicia tu terminal para aplicar las variables de entorno" -ForegroundColor White
Write-Host "   2. Ejecuta 'npm test' para verificar la funcionalidad" -ForegroundColor White
Write-Host "   3. Integra el componente ActiveXRdpSession en tu aplicación" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentación: README.md" -ForegroundColor Cyan
Write-Host "🐛 Troubleshooting: Ver logs de Electron para errores" -ForegroundColor Cyan
Write-Host "" 