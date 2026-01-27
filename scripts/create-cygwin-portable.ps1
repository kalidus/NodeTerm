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

# Paquetes MEDIUM (básicos + red + utilidades básicas - versión optimizada)
# Incluye: básicos + red esencial (wget,curl,netcat,openssh) + utilidades (tar,gzip,git,vim,nano) + sistema (procps-ng,net-tools)
# SIN: tcpdump, strace, lsof (muy pesados con muchas dependencias), telnet (menos usado)
# SIN compiladores, lenguajes de programación, documentación pesada ni herramientas redundantes
# NOTA: nmap/htop/ping no se incluyen porque no están disponibles en Cygwin de forma oficial
$MEDIUM_PACKAGES = "$MINIMAL_PACKAGES,wget,curl,git,vim,nano,openssh,tar,gzip,procps-ng,netcat,net-tools,bind-utils,openssl,ca-certificates,libcurl4,libssh2,rsync,unzip,zip"

# Paquetes completos (MEDIUM + desarrollo)
# Incluye: MEDIUM + compiladores y herramientas de desarrollo (gcc,g++,make,cmake)
$FULL_PACKAGES = "$MEDIUM_PACKAGES,gcc,g++,make,cmake,autoconf,automake,libtool,pkg-config,binutils"

# Paquetes ultra completos (FULL + lenguajes de programación + herramientas adicionales)
$ULTRA_COMPLETE_PACKAGES = "$FULL_PACKAGES,tree,psmisc,util-linux,time,parallel,gnuplot,graphviz,imagemagick,ffmpeg,python3,pip,nodejs,npm,yarn,ruby,perl,php,go,rust,java-openjdk"

# Lógica de selección: MEDIUM es el modo por defecto (cuando no se especifica ningún parámetro)
$PACKAGES = if ($Minimal) { 
    $MINIMAL_PACKAGES 
}
elseif ($Full) { 
    $FULL_PACKAGES 
}
elseif ($UltraComplete) { 
    $ULTRA_COMPLETE_PACKAGES 
}
elseif ($NoUltraComplete) { 
    $FULL_PACKAGES  # NoUltraComplete = Full (sin lenguajes)
}
elseif ($Medium) { 
    $MEDIUM_PACKAGES 
}
else { 
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

# Determinar modo
$mode = if ($Minimal) { 'Minimal' } 
elseif ($Full) { 'Full' } 
elseif ($UltraComplete) { 'Ultra Complete' }
elseif ($NoUltraComplete) { 'Full (NoUltraComplete)' }
elseif ($Medium) { 'Medium' } 
else { 'Medium (por defecto)' }

Write-Host "Configuracion:" -ForegroundColor Yellow
Write-Host "   Proyecto: $ProjectRoot"
Write-Host "   Output: $OutputDir"
Write-Host "   Mode: $mode" -ForegroundColor Cyan
Write-Host "   Paquetes seleccionados: $($PACKAGES.Split(',').Count) paquetes"
Write-Host ""

# Verificar tamaño de instalación anterior si existe
if (Test-Path $OutputDir) {
    $oldSize = (Get-ChildItem $OutputDir -Recurse -File -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum / 1MB
    if ($oldSize -gt 0) {
        Write-Host "   Instalacion anterior detectada: $([math]::Round($oldSize, 2)) MB" -ForegroundColor Yellow
        Write-Host "   Se eliminara antes de instalar el modo $mode" -ForegroundColor Yellow
        Write-Host ""
    }
}

# Descargar setup si no existe
if (-not (Test-Path $SETUP_FILE)) {
    Write-Host "Descargando Cygwin setup..." -ForegroundColor Cyan
    try {
        Invoke-WebRequest -Uri $CYGWIN_URL -OutFile $SETUP_FILE -UseBasicParsing
        Write-Host "   Descarga completada" -ForegroundColor Green
    }
    catch {
        Write-Host "   Error descargando setup: $_" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "Setup ya existe, reutilizando..." -ForegroundColor Green
}

# Limpiar instalación anterior si existe
Write-Host ""
Write-Host "Verificando instalacion anterior..." -ForegroundColor Cyan
if (Test-Path $OutputDir) {
    $oldSize = (Get-ChildItem $OutputDir -Recurse -File -ErrorAction SilentlyContinue | 
        Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "   Instalacion anterior encontrada: $([math]::Round($oldSize, 2)) MB" -ForegroundColor Yellow
    Write-Host "   Eliminando instalacion anterior..." -ForegroundColor Yellow
    try {
        Remove-Item -Path $OutputDir -Recurse -Force -ErrorAction Stop
        Write-Host "   Instalacion anterior eliminada correctamente" -ForegroundColor Green
    }
    catch {
        Write-Host "   Error eliminando instalacion anterior: $_" -ForegroundColor Red
        Write-Host "   Intentando continuar (puede haber conflictos)..." -ForegroundColor Yellow
    }
}
else {
    Write-Host "   No hay instalacion anterior, continuando..." -ForegroundColor Green
}

# Crear directorio de salida limpio
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
    }
    else {
        throw "Setup salio con codigo: $($process.ExitCode)"
    }
}
catch {
    Write-Host "   Error durante instalacion: $_" -ForegroundColor Red
    exit 1
}

# Verificar bash.exe
Write-Host ""
Write-Host "Verificando instalacion..." -ForegroundColor Cyan
$bashPath = Join-Path $OutputDir "bin\bash.exe"
if (Test-Path $bashPath) {
    Write-Host "   bash.exe encontrado" -ForegroundColor Green
}
else {
    Write-Host "   bash.exe NO encontrado!" -ForegroundColor Red
    exit 1
}

# Calcular tamano
Write-Host ""
Write-Host "Calculando tamano..." -ForegroundColor Cyan
$size = (Get-ChildItem $OutputDir -Recurse -File -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "   Tamano total: $([math]::Round($size, 2)) MB" -ForegroundColor Yellow

# Analizar qué ocupa más espacio (solo en modo Medium para diagnóstico)
if ($mode -like 'Medium*') {
    Write-Host ""
    Write-Host "Analizando tamano por directorio..." -ForegroundColor Cyan
    $dirSizes = @{}
    $topDirs = @("bin", "lib", "usr\lib", "usr\bin", "usr\share", "usr\include", "usr\src", "usr\local")
    
    foreach ($dir in $topDirs) {
        $fullPath = Join-Path $OutputDir $dir
        if (Test-Path $fullPath) {
            $size = (Get-ChildItem $fullPath -Recurse -File -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1MB
            if ($size -gt 0) {
                $dirSizes[$dir] = $size
            }
        }
    }
    
    $dirSizes.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "   $($_.Key): $([math]::Round($_.Value, 2)) MB" -ForegroundColor Gray
    }
}

# Limpiar archivos temporales y documentación innecesaria
Write-Host ""
Write-Host "Limpiando archivos temporales e innecesarios..." -ForegroundColor Cyan
$cleanupPaths = @(
    "$OutputDir\etc\setup",
    "$OutputDir\var\cache\cygwin",
    "$OutputDir\usr\share\man",
    "$OutputDir\usr\share\info",
    "$OutputDir\usr\share\doc",
    "$OutputDir\usr\include",
    "$OutputDir\usr\src",
    "$OutputDir\usr\local\include",
    "$OutputDir\usr\local\lib",
    "$OutputDir\usr\local\src"
)

$totalCleaned = 0
foreach ($cleanPath in $cleanupPaths) {
    if (Test-Path $cleanPath) {
        $sizeBefore = (Get-ChildItem $cleanPath -Recurse -File -ErrorAction SilentlyContinue | 
            Measure-Object -Property Length -Sum).Sum / 1MB
        Remove-Item $cleanPath -Recurse -Force -ErrorAction SilentlyContinue
        if ($sizeBefore -gt 0) {
            Write-Host "   Eliminado: $cleanPath ($([math]::Round($sizeBefore, 2)) MB)" -ForegroundColor Gray
            $totalCleaned += $sizeBefore
        }
    }
}

# Limpiar librerías estáticas (.a) que no son necesarias en runtime
Write-Host "   Limpiando librerias estaticas (.a)..." -ForegroundColor Gray
$libDirs = @("$OutputDir\lib", "$OutputDir\usr\lib")
foreach ($libDir in $libDirs) {
    if (Test-Path $libDir) {
        $staticLibs = Get-ChildItem $libDir -Recurse -Filter "*.a" -ErrorAction SilentlyContinue
        if ($staticLibs) {
            $sizeBefore = ($staticLibs | Measure-Object -Property Length -Sum).Sum / 1MB
            $staticLibs | Remove-Item -Force -ErrorAction SilentlyContinue
            if ($sizeBefore -gt 0) {
                Write-Host "   Eliminadas librerias estaticas: $([math]::Round($sizeBefore, 2)) MB" -ForegroundColor Gray
                $totalCleaned += $sizeBefore
            }
        }
    }
}

# Limpiar archivos de depuracion y metadatos que sobran
Write-Host "   Eliminando archivos de depuracion (*.pdb, *.dbg, *.la, *.exp)..." -ForegroundColor Gray
$debugPatterns = @("*.pdb", "*.dbg", "*.la", "*.exp")
foreach ($pattern in $debugPatterns) {
    $debugFiles = Get-ChildItem $OutputDir -Recurse -Filter $pattern -ErrorAction SilentlyContinue
    if ($debugFiles) {
        $sizeBefore = ($debugFiles | Measure-Object -Property Length -Sum).Sum / 1MB
        $debugFiles | Remove-Item -Force -ErrorAction SilentlyContinue
        if ($sizeBefore -gt 0) {
            Write-Host "   Eliminado $pattern`: $([math]::Round($sizeBefore, 2)) MB" -ForegroundColor Gray
            $totalCleaned += $sizeBefore
        }
    }
}

if ($totalCleaned -gt 0) {
    Write-Host "   Total limpiado: $([math]::Round($totalCleaned, 2)) MB" -ForegroundColor Green
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

# Force TERM to a known terminfo we bundle (para evitar problemas en top/ncurses)
export TERM=xterm-256color

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

# Crear versión LITE (solo binarios esenciales) al estilo MobaXterm
Write-Host ""
Write-Host "Creando version LITE (solo binarios esenciales)..." -ForegroundColor Cyan
Write-Host "   Se reemplazara la instalacion completa por la version reducida." -ForegroundColor Yellow

$liteDir = Join-Path $ProjectRoot "resources\cygwin64-lite-temp"
if (Test-Path $liteDir) {
    Remove-Item $liteDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $liteDir -Force | Out-Null

# Binarios esenciales basados en MEDIUM (sin nmap/htop)
$essentialBinaries = @(
    "bash.exe", "sh.exe", "dash.exe",
    "ls.exe", "grep.exe", "sed.exe", "awk.exe", "gawk.exe",
    "find.exe", "which.exe", "less.exe", "tput.exe", "clear.exe", "stty.exe",
    "wget.exe", "curl.exe", "git.exe",
    "vim.exe", "nano.exe",
    "ssh.exe", "scp.exe", "sftp.exe", "ssh-keygen.exe",
    "tar.exe", "gzip.exe", "gunzip.exe", "zip.exe", "unzip.exe",
    "nc.exe", "netcat.exe",
    "ps.exe", "top.exe",
    "rsync.exe", "cp.exe", "mv.exe", "rm.exe", "mkdir.exe", "rmdir.exe",
    "cat.exe", "echo.exe", "head.exe", "tail.exe", "sort.exe", "uniq.exe",
    "chmod.exe", "chown.exe", "ln.exe"
)

# Estructura mínima necesaria
$essentialDirs = @(
    "bin", "lib", "etc", "home",
    "usr\bin", "usr\lib", "usr\share\terminfo", "usr\share\procps-ng",
    "var", "var\run", "var\log"
)
foreach ($dir in $essentialDirs) {
    $fullPath = Join-Path $liteDir $dir
    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
}

# Escanear todos los .exe de la instalación completa
Write-Host "   Escaneando binarios instalados..." -ForegroundColor DarkGray
$allExeFiles = Get-ChildItem $OutputDir -Recurse -Filter "*.exe" -ErrorAction SilentlyContinue
Write-Host "   Total binarios encontrados: $($allExeFiles.Count)" -ForegroundColor DarkGray

# Mapeo de binarios alternativos
$binAlternatives = @{}
$binAlternatives["awk.exe"] = @("gawk.exe", "gawk-*.exe")
$binAlternatives["gunzip.exe"] = @("gzip.exe")
$binAlternatives["netcat.exe"] = @("nc.exe")

$binLocationMap = @{}

foreach ($bin in $essentialBinaries) {
    $baseName = $bin -replace "\.exe$", ""

    # Nombre exacto
    $exactMatch = $allExeFiles | Where-Object { $_.Name -eq $bin } | Select-Object -First 1
    if ($exactMatch) {
        $binLocationMap[$bin] = $exactMatch.FullName
        continue
    }

    # Variantes con prefijo/base
    $foundMatches = $allExeFiles | Where-Object {
        $_.Name -like "$baseName*.exe" -or $_.Name -like "*$baseName*.exe"
    }
    if ($foundMatches) {
        $preferred = $foundMatches | Where-Object { $_.Name -like "$baseName*.exe" } | Select-Object -First 1
        $selected = if ($preferred) { $preferred } else { $foundMatches | Select-Object -First 1 }
        $binLocationMap[$bin] = $selected.FullName
        continue
    }

    # Alternativos
    if ($binAlternatives.ContainsKey($bin)) {
        $foundAlt = $false
        foreach ($altPattern in $binAlternatives[$bin]) {
            if ($altPattern -like "*`**") {
                $altBase = $altPattern -replace "\.exe$", "" -replace "\*", ""
                $altMatches = $allExeFiles | Where-Object { $_.Name -like "$altBase*.exe" }
                if ($altMatches) {
                    $selectedAlt = $altMatches | Select-Object -First 1
                    $binLocationMap[$bin] = $selectedAlt.FullName
                    $foundAlt = $true
                    break
                }
            }
            else {
                $altExact = $allExeFiles | Where-Object { $_.Name -eq $altPattern } | Select-Object -First 1
                if ($altExact) {
                    $binLocationMap[$bin] = $altExact.FullName
                    $foundAlt = $true
                    break
                }
            }
        }
        if ($foundAlt) { continue }
    }
}

# Copiar binarios esenciales
$copiedBinaries = 0
$missingBinaries = @()
foreach ($bin in $essentialBinaries) {
    if ($binLocationMap.ContainsKey($bin)) {
        $actualBinPath = $binLocationMap[$bin]
        $destPath = Join-Path $liteDir "bin\$bin"
        Copy-Item $actualBinPath $destPath -Force -ErrorAction SilentlyContinue
        $copiedBinaries++
    }
    else {
        $missingBinaries += $bin
    }
}

# Crear binarios alternativos (gunzip desde gzip, netcat desde nc)
$alternativeMappings = @{
    "gunzip.exe" = "gzip.exe"
    "netcat.exe" = "nc.exe"
}

foreach ($altBin in $alternativeMappings.Keys) {
    $sourceBin = $alternativeMappings[$altBin]
    $sourcePath = Join-Path $liteDir "bin\$sourceBin"
    $destPath = Join-Path $liteDir "bin\$altBin"
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force -ErrorAction SilentlyContinue
        $copiedBinaries++
        $missingBinaries = $missingBinaries | Where-Object { $_ -ne $altBin }
    }
}

# Integrar ping.exe desde Windows si está disponible
$pingDest = Join-Path $liteDir "bin\ping.exe"
if (-not (Test-Path $pingDest)) {
    $windowsPing = "C:\Windows\System32\ping.exe"
    if (Test-Path $windowsPing) {
        Copy-Item $windowsPing $pingDest -Force -ErrorAction SilentlyContinue
        $copiedBinaries++
    }
}

# Reportar faltantes (informativo)
$missingReport = $missingBinaries | Where-Object { $_ -ne "ping.exe" }
if ($missingReport.Count -gt 0) {
    Write-Host "   Binarios no encontrados (se omitiran en LITE): $($missingReport -join ', ')" -ForegroundColor Yellow
}

# Copiar DLLs de lib y bin (enfoque seguro)
Write-Host "   Copiando DLLs..." -ForegroundColor Gray
$copiedDlls = 0
$libDlls = Get-ChildItem (Join-Path $OutputDir "lib") -Filter "*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $libDlls) {
    $dllDest = Join-Path $liteDir "lib\$($dll.Name)"
    Copy-Item $dll.FullName $dllDest -Force -ErrorAction SilentlyContinue
    $copiedDlls++
}
$binDlls = Get-ChildItem (Join-Path $OutputDir "bin") -Filter "*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $binDlls) {
    $dllDest = Join-Path $liteDir "bin\$($dll.Name)"
    Copy-Item $dll.FullName $dllDest -Force -ErrorAction SilentlyContinue
    $copiedDlls++
}
# DLLs en usr\bin y usr\lib (algunas dependencias adicionales)
$usrBinDlls = Get-ChildItem (Join-Path $OutputDir "usr\bin") -Filter "*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $usrBinDlls) {
    $dllDest = Join-Path $liteDir "usr\bin\$($dll.Name)"
    Copy-Item $dll.FullName $dllDest -Force -ErrorAction SilentlyContinue
    $copiedDlls++
}
$usrLibDlls = Get-ChildItem (Join-Path $OutputDir "usr\lib") -Filter "*.dll" -ErrorAction SilentlyContinue
foreach ($dll in $usrLibDlls) {
    $dllDest = Join-Path $liteDir "usr\lib\$($dll.Name)"
    Copy-Item $dll.FullName $dllDest -Force -ErrorAction SilentlyContinue
    $copiedDlls++
}

# Copiar configuración esencial
$etcFiles = @("fstab", "nsswitch.conf", "profile")
foreach ($file in $etcFiles) {
    $src = Join-Path $OutputDir "etc\$file"
    if (Test-Path $src) {
        $dest = Join-Path $liteDir "etc\$file"
        Copy-Item $src $dest -Force -ErrorAction SilentlyContinue
    }
}

if (Test-Path "$OutputDir\etc\profile.d") {
    $profileDest = Join-Path $liteDir "etc\profile.d"
    New-Item -ItemType Directory -Path $profileDest -Force | Out-Null
    $profileFiles = Get-ChildItem "$OutputDir\etc\profile.d" -File -ErrorAction SilentlyContinue
    if ($profileFiles) {
        Copy-Item $profileFiles.FullName $profileDest -Force -ErrorAction SilentlyContinue
    }
}

# Copiar home (estructura)
if (Test-Path "$OutputDir\home") {
    Copy-Item "$OutputDir\home" "$liteDir\" -Recurse -Force -ErrorAction SilentlyContinue
}

# Terminfo completo (para evitar problemas con top/ncurses)
if (Test-Path "$OutputDir\usr\share\terminfo") {
    Write-Host "   Copiando terminfo completo..." -ForegroundColor Gray
    Copy-Item "$OutputDir\usr\share\terminfo" (Join-Path $liteDir "usr\share") -Recurse -Force -ErrorAction SilentlyContinue
}

# Datos de procps-ng (top) si existen
if (Test-Path "$OutputDir\usr\share\procps-ng") {
    Write-Host "   Copiando datos de procps-ng..." -ForegroundColor Gray
    Copy-Item "$OutputDir\usr\share\procps-ng" (Join-Path $liteDir "usr\share") -Recurse -Force -ErrorAction SilentlyContinue
}

# Archivos utmp/wtmp para top/ps (vacíos)
$utmpPath = Join-Path $liteDir "var\run\utmp"
if (-not (Test-Path $utmpPath)) {
    New-Item -ItemType File -Path $utmpPath -Force | Out-Null
}
$wtmpPath = Join-Path $liteDir "var\log\wtmp"
if (-not (Test-Path $wtmpPath)) {
    New-Item -ItemType File -Path $wtmpPath -Force | Out-Null
}

# Reemplazar instalación completa con la versión LITE
Write-Host "   Reemplazando instalacion completa con version LITE..." -ForegroundColor Yellow
$backupDir = "$OutputDir-backup"
if (Test-Path $backupDir) {
    Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue
}
Rename-Item $OutputDir $backupDir -Force
Move-Item $liteDir $OutputDir -Force

# Calcular reducción
$oldSizeFiles = Get-ChildItem $backupDir -Recurse -File -ErrorAction SilentlyContinue
$oldSize = if ($oldSizeFiles) { ($oldSizeFiles | Measure-Object -Property Length -Sum).Sum / 1MB } else { 0 }
$newSizeFiles = Get-ChildItem $OutputDir -Recurse -File -ErrorAction SilentlyContinue
$newSize = if ($newSizeFiles) { ($newSizeFiles | Measure-Object -Property Length -Sum).Sum / 1MB } else { 0 }
$reduction = $oldSize - $newSize

Write-Host "   Binarios copiados: $copiedBinaries" -ForegroundColor Green
Write-Host "   DLLs copiadas: $copiedDlls" -ForegroundColor Green
Write-Host "   Tamano anterior: $([math]::Round($oldSize, 2)) MB" -ForegroundColor Gray
Write-Host "   Tamano nuevo: $([math]::Round($newSize, 2)) MB" -ForegroundColor Green
if ($oldSize -gt 0) {
    Write-Host "   Reduccion: $([math]::Round($reduction, 2)) MB ($([math]::Round(($reduction/$oldSize)*100, 1))%)" -ForegroundColor Cyan
}

# Limpiar backup
Remove-Item $backupDir -Recurse -Force -ErrorAction SilentlyContinue

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

# Recalcular tamaño final después de toda la limpieza
Write-Host ""
Write-Host "Recalculando tamano final..." -ForegroundColor Cyan
$size = (Get-ChildItem $OutputDir -Recurse -File -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum / 1MB

# Resumen final
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  Cygwin Portable Creado Exitosamente!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Modo instalado: $mode" -ForegroundColor Cyan
Write-Host "Ubicacion: $OutputDir" -ForegroundColor White
Write-Host "Tamano final: $([math]::Round($size, 2)) MB" -ForegroundColor White
Write-Host "Bash: $bashPath" -ForegroundColor White
Write-Host ""
Write-Host "Siguiente paso: Compilar la aplicacion con Electron Builder" -ForegroundColor Yellow
$msgFinal = "   La carpeta resources sera incluida automaticamente"
Write-Host $msgFinal -ForegroundColor Yellow
Write-Host ""