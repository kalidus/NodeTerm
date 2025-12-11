    # Script para crear Cygwin portable par NodeTerm
# Ejecutar: .\scripts\create-cygwin-portable.ps1

param(
    [string]$OutputDir = "",
    [switch]$Minimal,
    [switch]$Medium,
    [switch]$Full,
    [switch]$UltraComplete,
    [switch]$NoUltraComplete,
    [switch]$UseTemp
)

$ErrorActionPreference = "Stop"

# Obtener la ruta absoluta del directorio raíz del proyecto
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Si no se especifica OutputDir, usar la ruta por defecto en la raíz del proyecto
if ([string]::IsNullOrEmpty($OutputDir)) {
    $OutputDir = Join-Path $ProjectRoot "resources\cygwin64"
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Creando Cygwin Portable para NodeTerm" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

$CYGWIN_URL = "https://cygwin.com/setup-x86_64.exe"
$SETUP_FILE = Join-Path $ProjectRoot "cygwin-setup-temp.exe"

# Paquetes minimos
$MINIMAL_PACKAGES = "bash,coreutils,grep,sed,gawk,findutils,which,less,ncurses"

# Paquetes MEDIUM (básicos + red + utilidades básicas + herramientas avanzadas esenciales)
# Incluye: básicos + red (wget,curl,netcat,ping,telnet,nmap) + utilidades (tar,gzip,git,vim,nano) + avanzadas (htop,strace,lsof,tcpdump,net-tools)
# SIN compiladores, lenguajes de programación, documentación pesada ni herramientas redundantes
$MEDIUM_PACKAGES = "$MINIMAL_PACKAGES,wget,curl,git,vim,nano,openssh,tar,gzip,procps-ng,netcat,iputils,telnet,nmap,tcpdump,net-tools,openssl,ca-certificates,libcurl4,libssh2,rsync,unzip,zip,htop,strace,lsof"

# Paquetes completos (MEDIUM + desarrollo)
# Incluye: MEDIUM + compiladores y herramientas de desarrollo (gcc,g++,make,cmake)
$FULL_PACKAGES = "$MEDIUM_PACKAGES,gcc,g++,make,cmake,autoconf,automake,libtool,pkg-config,binutils"

# Paquetes ultra completos (FULL + lenguajes de programación + herramientas adicionales)
$ULTRA_COMPLETE_PACKAGES = "$FULL_PACKAGES,tree,psmisc,util-linux,time,parallel,gnuplot,graphviz,imagemagick,ffmpeg,python3,pip,nodejs,npm,yarn,ruby,perl,php,go,rust,java-openjdk"

# Lógica de selección: MEDIUM es el modo por defecto (cuando no se especifica ningún parámetro)
$PACKAGES = if ($Minimal) { 
    $MINIMAL_PACKAGES 
} elseif ($Full) { 
    $FULL_PACKAGES 
} elseif ($UltraComplete) { 
    $ULTRA_COMPLETE_PACKAGES 
} elseif ($NoUltraComplete) { 
    $FULL_PACKAGES  # NoUltraComplete = Full (sin lenguajes)
} elseif ($Medium) { 
    $MEDIUM_PACKAGES 
} else { 
    # Por defecto: MEDIUM (sin parámetros)
    $MEDIUM_PACKAGES 
}

# Si UseTemp, instalar en directorio temporal
$TempInstall = $false
$FinalOutputDir = $OutputDir
if ($UseTemp) {
    $TempInstall = $true
    $OutputDir = Join-Path $env:TEMP "nodeterm-cygwin-install"
    Write-Host "MODO TEMPORAL: Instalando en $OutputDir" -ForegroundColor Magenta
    Write-Host "Luego se movera a: $FinalOutputDir" -ForegroundColor Magenta
}

Write-Host "Configuracion:" -ForegroundColor Yellow
Write-Host "   Proyecto: $ProjectRoot"
Write-Host "   Output: $OutputDir"
$mode = if ($Minimal) { 'Minimal' } 
        elseif ($Full) { 'Full' } 
        elseif ($UltraComplete) { 'Ultra Complete' }
        elseif ($NoUltraComplete) { 'Full (NoUltraComplete)' }
        elseif ($Medium) { 'Medium' } 
        else { 'Medium (por defecto)' }
Write-Host "   Mode: $mode"
Write-Host "   Packages: $PACKAGES"
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

# Crear directorio de salida
Write-Host ""
Write-Host "Creando directorio de salida..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Instalar Cygwin
Write-Host ""
Write-Host "Instalando Cygwin portable..." -ForegroundColor Cyan
Write-Host "   Esto puede tomar varios minutos..." -ForegroundColor Yellow

$installArgs = @(
    "--quiet-mode",
    "--root", (Resolve-Path $OutputDir).Path,
    "--site", "https://mirrors.kernel.org/sourceware/cygwin/",
    "--packages", $PACKAGES,
    "--no-shortcuts",
    "--no-desktop",
    "--no-startmenu"
)

try {
    $process = Start-Process -FilePath $SETUP_FILE -ArgumentList $installArgs -Wait -PassThru -NoNewWindow
    if ($process.ExitCode -eq 0) {
        Write-Host "   Instalacion completada" -ForegroundColor Green
    } else {
        throw "Setup salio con codigo: $($process.ExitCode)"
    }
} catch {
    Write-Host "   Error durante instalacion: $_" -ForegroundColor Red
    exit 1
}

# Verificar bash.exe
Write-Host ""
Write-Host "Verificando instalacion..." -ForegroundColor Cyan
$bashPath = Join-Path $OutputDir "bin\bash.exe"
if (Test-Path $bashPath) {
    Write-Host "   bash.exe encontrado" -ForegroundColor Green
} else {
    Write-Host "   bash.exe NO encontrado!" -ForegroundColor Red
    exit 1
}

# Calcular tamano
Write-Host ""
Write-Host "Calculando tamano..." -ForegroundColor Cyan
$size = (Get-ChildItem $OutputDir -Recurse -ErrorAction SilentlyContinue | 
         Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "   Tamano total: $([math]::Round($size, 2)) MB" -ForegroundColor Yellow

# Limpiar archivos temporales innecesarios
Write-Host ""
Write-Host "Limpiando archivos temporales..." -ForegroundColor Cyan
$cleanupPaths = @(
    "$OutputDir\etc\setup",
    "$OutputDir\var\cache\cygwin"
)

foreach ($cleanPath in $cleanupPaths) {
    if (Test-Path $cleanPath) {
        Remove-Item $cleanPath -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "   Eliminado: $cleanPath" -ForegroundColor Gray
    }
}

# Crear archivo .cygwinrc personalizado
Write-Host ""
Write-Host "Creando configuracion personalizada..." -ForegroundColor Cyan

# Configurar fstab para /tmp
Write-Host "   Configurando fstab para /tmp..." -ForegroundColor Gray
$fstabPath = Join-Path $OutputDir "etc\fstab"
if (Test-Path $fstabPath) {
    $fstabContent = Get-Content $fstabPath -Raw
    if ($fstabContent -notmatch "/tmp") {
        # NOTA: usar LF puro (sin CR) y ASCII encoding para evitar problemas
        $fstabContent = $fstabContent.Replace("`r`n", "`n")
        $fstabContent += "none /tmp usertemp binary,posix=0,user 0 0`n"
        # Escribir con encoding ASCII (no UTF8) para compatibilidad máxima
        [System.IO.File]::WriteAllText($fstabPath, $fstabContent, [System.Text.Encoding]::ASCII)
    }
}
$cygwinrc = @"
# NodeTerm Cygwin Configuration
# This file is sourced by bash on login

# Set prompt
export PS1='\[\e[32m\]\u@\h\[\e[0m\]:\[\e[34m\]\w\[\e[0m\]\$ '

# Aliases
alias ll='ls -lah'
alias ..='cd ..'
alias ...='cd ../..'

# Enable color support
export CLICOLOR=1
export LS_COLORS='di=34:ln=35:so=32:pi=33:ex=31:bd=46;34:cd=43;34:su=41;30:sg=46;30:tw=42;30:ow=43;30'

echo "Welcome to NodeTerm Cygwin Terminal"
"@

$etcProfilePath = Join-Path $OutputDir "etc\profile.d"
New-Item -ItemType Directory -Path $etcProfilePath -Force | Out-Null
$cygwinrc | Out-File -FilePath "$etcProfilePath\nodeterm.sh" -Encoding ASCII
Write-Host "   Configuracion creada" -ForegroundColor Green

# Limpiar setup
Write-Host ""
Write-Host "Limpiando setup..." -ForegroundColor Cyan
Remove-Item $SETUP_FILE -Force -ErrorAction SilentlyContinue
Write-Host "   Setup eliminado" -ForegroundColor Green

# Limpiar directorios basura creados por el instalador
Write-Host ""
Write-Host "Limpiando directorios basura..." -ForegroundColor Cyan
Get-ChildItem -Path $ProjectRoot -Directory | Where-Object { 
    $_.Name -like "http*" -or 
    $_.Name -like "ftp*" -or 
    $_.Name -like "*%*" 
} | ForEach-Object {
    Write-Host "   Eliminando: $($_.Name)" -ForegroundColor Gray
    Remove-Item $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
}
Write-Host "   Limpieza completada" -ForegroundColor Green

# Si se uso instalacion temporal, mover a la ubicacion final
if ($TempInstall) {
    Write-Host ""
    Write-Host "Moviendo instalacion a ubicacion final..." -ForegroundColor Cyan
    Write-Host "   Desde: $OutputDir" -ForegroundColor Gray
    Write-Host "   Hacia: $FinalOutputDir" -ForegroundColor Gray
    
    # Crear directorio padre si no existe
    $parentDir = Split-Path $FinalOutputDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    
    # Eliminar destino si existe
    if (Test-Path $FinalOutputDir) {
        Write-Host "   Eliminando instalacion anterior..." -ForegroundColor Yellow
        Remove-Item $FinalOutputDir -Recurse -Force
    }
    
    # Mover instalacion
    Move-Item -Path $OutputDir -Destination $FinalOutputDir -Force
    Write-Host "   Movido correctamente" -ForegroundColor Green
    
    # Actualizar variables para resumen
    $OutputDir = $FinalOutputDir
    $bashPath = Join-Path $FinalOutputDir "bin\bash.exe"
}

# Resumen final
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  Cygwin Portable Creado Exitosamente!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Ubicacion: $OutputDir" -ForegroundColor White
Write-Host "Tamano: $([math]::Round($size, 2)) MB" -ForegroundColor White
Write-Host "Bash: $bashPath" -ForegroundColor White
Write-Host ""
Write-Host "Siguiente paso: Compilar la aplicacion con Electron Builder" -ForegroundColor Yellow
Write-Host "   La carpeta 'resources' sera incluida automaticamente" -ForegroundColor Yellow
Write-Host ""