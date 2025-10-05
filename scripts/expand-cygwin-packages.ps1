# Script para expandir paquetes de Cygwin existente
# Ejecutar: .\scripts\expand-cygwin-packages.ps1

param(
    [string]$CygwinDir = ".\resources\cygwin64",
    [switch]$NetworkTools = $true,
    [switch]$DevTools = $false,
    [switch]$AllTools = $false
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Expandir Paquetes de Cygwin para NodeTerm" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que Cygwin existe
if (-not (Test-Path "$CygwinDir\bin\bash.exe")) {
    Write-Host "❌ Error: Cygwin no encontrado en $CygwinDir" -ForegroundColor Red
    Write-Host "   Ejecuta primero: .\scripts\create-cygwin-portable.ps1" -ForegroundColor Yellow
    exit 1
}

$CYGWIN_URL = "https://cygwin.com/setup-x86_64.exe"
$SETUP_FILE = ".\cygwin-setup-expand.exe"

# Definir grupos de paquetes
$NETWORK_PACKAGES = "netcat,iputils,inetutils,telnet,nmap,traceroute,tcpdump,net-tools,openssl"
$DEV_PACKAGES = "gcc,g++,make,cmake,autoconf,automake,libtool,pkg-config,binutils"
$UTILITY_PACKAGES = "tree,htop,iotop,sysstat,psmisc,lsof,strace,ltrace"

# Determinar qué paquetes instalar
$PACKAGES_TO_INSTALL = @()

if ($NetworkTools -or $AllTools) {
    $PACKAGES_TO_INSTALL += $NETWORK_PACKAGES
    Write-Host "✅ Incluyendo herramientas de red" -ForegroundColor Green
}

if ($DevTools -or $AllTools) {
    $PACKAGES_TO_INSTALL += $DEV_PACKAGES
    Write-Host "✅ Incluyendo herramientas de desarrollo" -ForegroundColor Green
}

if ($AllTools) {
    $PACKAGES_TO_INSTALL += $UTILITY_PACKAGES
    Write-Host "✅ Incluyendo utilidades adicionales" -ForegroundColor Green
}

$PACKAGES_STRING = ($PACKAGES_TO_INSTALL | ForEach-Object { $_ }) -join ","

if ([string]::IsNullOrEmpty($PACKAGES_STRING)) {
    Write-Host "❌ Error: No se seleccionaron paquetes para instalar" -ForegroundColor Red
    Write-Host "   Usa -NetworkTools, -DevTools, o -AllTools" -ForegroundColor Yellow
    exit 1
}

Write-Host "Configuración:" -ForegroundColor Yellow
Write-Host "   Cygwin: $CygwinDir"
Write-Host "   Paquetes: $PACKAGES_STRING"
Write-Host ""

# Descargar setup si no existe
if (-not (Test-Path $SETUP_FILE)) {
    Write-Host "Descargando Cygwin setup..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $CYGWIN_URL -OutFile $SETUP_FILE -UseBasicParsing
        Write-Host "   Descarga completada" -ForegroundColor Green
    } catch {
        Write-Host "   Error descargando setup: $_" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Setup ya existe, reutilizando..." -ForegroundColor Green
}

# Instalar paquetes adicionales
Write-Host ""
Write-Host "Instalando paquetes adicionales..." -ForegroundColor Cyan
Write-Host "   Esto puede tomar varios minutos..." -ForegroundColor Yellow

$installArgs = @(
    "--quiet-mode",
    "--root", (Resolve-Path $CygwinDir).Path,
    "--site", "https://mirrors.kernel.org/sourceware/cygwin/",
    "--packages", $PACKAGES_STRING,
    "--no-shortcuts",
    "--no-desktop",
    "--no-startmenu"
)

try {
    $process = Start-Process -FilePath $SETUP_FILE -ArgumentList $installArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "   Instalación completada" -ForegroundColor Green
    } else {
        throw "Setup salió con código: $($process.ExitCode)"
    }
} catch {
    Write-Host "   Error durante instalación: $_" -ForegroundColor Red
    exit 1
}

# Verificar herramientas instaladas
Write-Host ""
Write-Host "Verificando herramientas instaladas..." -ForegroundColor Cyan

$toolsToCheck = @(
    @{Name="nc"; Path="$CygwinDir\bin\nc.exe"},
    @{Name="ping"; Path="$CygwinDir\bin\ping.exe"},
    @{Name="telnet"; Path="$CygwinDir\bin\telnet.exe"},
    @{Name="nmap"; Path="$CygwinDir\bin\nmap.exe"},
    @{Name="traceroute"; Path="$CygwinDir\bin\traceroute.exe"}
)

foreach ($tool in $toolsToCheck) {
    if (Test-Path $tool.Path) {
        Write-Host "   ✅ $($tool.Name) instalado" -ForegroundColor Green
    } else {
        Write-Host "   ❌ $($tool.Name) no encontrado" -ForegroundColor Red
    }
}

# Calcular nuevo tamaño
Write-Host ""
Write-Host "Calculando nuevo tamaño..." -ForegroundColor Cyan
$size = (Get-ChildItem $CygwinDir -Recurse -ErrorAction SilentlyContinue | 
         Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "   Tamaño total: $([math]::Round($size, 2)) MB" -ForegroundColor Yellow

# Limpiar setup
Write-Host ""
Write-Host "Limpiando setup..." -ForegroundColor Cyan
Remove-Item $SETUP_FILE -Force -ErrorAction SilentlyContinue
Write-Host "   Setup eliminado" -ForegroundColor Green

# Resumen final
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  Paquetes de Cygwin Expandidos Exitosamente!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicación: $CygwinDir" -ForegroundColor White
Write-Host "Tamaño: $([math]::Round($size, 2)) MB" -ForegroundColor White
Write-Host "Paquetes agregados: $PACKAGES_STRING" -ForegroundColor White
Write-Host ""
Write-Host "Ahora puedes usar herramientas como:" -ForegroundColor Yellow
Write-Host "   nc (netcat), ping, telnet, nmap, traceroute" -ForegroundColor Yellow
Write-Host ""
