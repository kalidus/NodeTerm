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

# Paquetes minimos (shell + coreutils)
$MINIMAL_PACKAGES = "bash,coreutils,grep,sed,gawk,findutils,which,less,ncurses"

# LITE embebido: Minimal + ssh + curl (objetivo ~12-15 MB en el Setup de NodeTerm)
$LITE_PACKAGES = "$MINIMAL_PACKAGES,curl,openssh,openssl,ca-certificates,libcurl4"

# Paquetes MEDIUM (upgrade opcional desde Apps)
$MEDIUM_PACKAGES = "$LITE_PACKAGES,wget,git,vim,nano,tar,gzip,procps-ng,netcat,net-tools,bind-utils,libssh2,rsync,unzip,zip"

# Paquetes completos (MEDIUM + desarrollo)
$FULL_PACKAGES = "$MEDIUM_PACKAGES,gcc,g++,make,cmake,autoconf,automake,libtool,pkg-config,binutils"

# Paquetes ultra completos (FULL + lenguajes)
$ULTRA_COMPLETE_PACKAGES = "$FULL_PACKAGES,tree,psmisc,util-linux,time,parallel,gnuplot,graphviz,imagemagick,ffmpeg,python3,pip,nodejs,npm,yarn,ruby,perl,php,go,rust,java-openjdk"

# Por defecto: LITE (embebido). -Minimal = solo coreutils sin ssh/curl.
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
    $FULL_PACKAGES
}
elseif ($Medium) {
    $MEDIUM_PACKAGES
}
else {
    $LITE_PACKAGES
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
else { 'Lite (embebido, por defecto)' }

# Techo de tamaño para el artefacto embebido (sin comprimir)
$MaxLiteSizeMB = 40

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

$localPkgDir = Join-Path $env:TEMP "nodeterm-cygwin-packages"
New-Item -ItemType Directory -Path $localPkgDir -Force | Out-Null
$installArgs = @(
    "--quiet-mode",
    "--root", (Resolve-Path $OutputDir).Path,
    "--site", "https://mirrors.kernel.org/sourceware/cygwin/",
    "--only-site",
    "--local-package-dir", $localPkgDir,
    "--packages", $PACKAGES,
    "--no-admin",
    "--wait",
    "--no-shortcuts",
    "--no-desktop",
    "--no-startmenu",
    "--no-write-registry"
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

echo "Welcome to NodeTerm Terminal"
"@

$etcProfilePath = Join-Path $OutputDir "etc\profile.d"
New-Item -ItemType Directory -Path $etcProfilePath -Force | Out-Null
# LF puro (bash en Cygwin falla con CRLF)
$cygwinrcLf = ($cygwinrc -replace "`r`n", "`n" -replace "`r", "`n")
[System.IO.File]::WriteAllText("$etcProfilePath\nodeterm.sh", $cygwinrcLf, [System.Text.Encoding]::ASCII)
Write-Host "   Configuracion creada" -ForegroundColor Green

# Crear versión LITE (bash + coreutils + ssh + curl) al estilo MobaXterm
Write-Host ""
Write-Host "Creando version LITE (bash + coreutils + ssh + curl)..." -ForegroundColor Cyan
Write-Host "   Se reemplazara la instalacion completa por la version reducida." -ForegroundColor Yellow

$liteDir = Join-Path $ProjectRoot "resources\cygwin64-lite-temp"
if (Test-Path $liteDir) {
    Remove-Item $liteDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $liteDir -Force | Out-Null

# Binarios esenciales del runtime embebido (sin git/vim/wget/tar)
$essentialBinaries = @(
    "bash.exe", "sh.exe", "dash.exe",
    "ls.exe", "grep.exe", "sed.exe", "awk.exe", "gawk.exe",
    "find.exe", "which.exe", "less.exe", "tput.exe", "clear.exe", "stty.exe",
    "curl.exe",
    "ssh.exe", "scp.exe", "sftp.exe", "ssh-keygen.exe", "ssh-add.exe", "ssh-agent.exe",
    "cp.exe", "mv.exe", "rm.exe", "mkdir.exe", "rmdir.exe",
    "cat.exe", "echo.exe", "head.exe", "tail.exe", "sort.exe", "uniq.exe",
    "chmod.exe", "chown.exe", "ln.exe", "pwd.exe", "env.exe", "printenv.exe",
    "tr.exe", "cut.exe", "wc.exe", "tee.exe", "date.exe", "uname.exe", "id.exe", "whoami.exe",
    "openssl.exe"
)

# Estructura mínima necesaria
$essentialDirs = @(
    "bin", "etc", "etc\ssh", "home",
    "usr\share\terminfo", "usr\ssl",
    "var", "var\run", "var\log", "tmp"
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

# Reportar faltantes (informativo)
if ($missingBinaries.Count -gt 0) {
    Write-Host "   Binarios no encontrados (se omitiran en LITE): $($missingBinaries -join ', ')" -ForegroundColor Yellow
}

# Copiar solo DLLs referenciadas por los .exe/.dll LITE (escaneo de strings PE)
Write-Host "   Resolviendo DLLs por dependencia (sin volcar todo bin/)..." -ForegroundColor Gray
$copiedDlls = 0
$dllNeeded = New-Object 'System.Collections.Generic.HashSet[string]' ([StringComparer]::OrdinalIgnoreCase)
$dllQueue = New-Object System.Collections.Generic.Queue[string]
$dllRx = [regex]'cyg[A-Za-z0-9_+\-.]+\.dll'
Get-ChildItem (Join-Path $liteDir "bin") -Filter "*.exe" -ErrorAction SilentlyContinue | ForEach-Object {
    [void]$dllNeeded.Add($_.Name)
    $dllQueue.Enqueue($_.Name)
}
$srcBin = Join-Path $OutputDir "bin"
while ($dllQueue.Count -gt 0) {
    $cur = $dllQueue.Dequeue()
    $curPath = Join-Path $srcBin $cur
    if (-not (Test-Path $curPath)) {
        $curPath = Join-Path $liteDir "bin\$cur"
    }
    if (-not (Test-Path $curPath)) { continue }
    try {
        $ascii = [System.Text.Encoding]::ASCII.GetString([System.IO.File]::ReadAllBytes($curPath))
    } catch {
        continue
    }
    foreach ($m in $dllRx.Matches($ascii)) {
        $dllName = $m.Value
        $dllSrc = Join-Path $srcBin $dllName
        if (-not (Test-Path $dllSrc)) { continue }
        if ($dllNeeded.Add($dllName)) {
            $dllQueue.Enqueue($dllName)
        }
    }
}
foreach ($dllName in $dllNeeded) {
    if (-not $dllName.EndsWith('.dll')) { continue }
    $dllSrc = Join-Path $srcBin $dllName
    if (-not (Test-Path $dllSrc)) { continue }
    $dllDest = Join-Path $liteDir "bin\$dllName"
    Copy-Item $dllSrc $dllDest -Force -ErrorAction SilentlyContinue
    $copiedDlls++
}
Write-Host "   DLLs por dependencia: $copiedDlls" -ForegroundColor Gray

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

# OpenSSH host/config y certificados SSL (curl/ssh)
if (Test-Path "$OutputDir\etc\ssh") {
    Write-Host "   Copiando etc/ssh..." -ForegroundColor Gray
    Copy-Item "$OutputDir\etc\ssh\*" (Join-Path $liteDir "etc\ssh") -Recurse -Force -ErrorAction SilentlyContinue
}
foreach ($sslSrc in @("$OutputDir\usr\ssl", "$OutputDir\etc\pki", "$OutputDir\etc\ssl")) {
    if (Test-Path $sslSrc) {
        $sslName = Split-Path $sslSrc -Leaf
        $sslParent = if ($sslSrc -like "*\usr\*") { "usr" } else { "etc" }
        $sslDestParent = Join-Path $liteDir $sslParent
        New-Item -ItemType Directory -Path $sslDestParent -Force | Out-Null
        Write-Host "   Copiando $sslParent/$sslName..." -ForegroundColor Gray
        Copy-Item $sslSrc (Join-Path $sslDestParent $sslName) -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# Copiar home (estructura)
if (Test-Path "$OutputDir\home") {
    Copy-Item "$OutputDir\home" "$liteDir\" -Recurse -Force -ErrorAction SilentlyContinue
}

# Terminfo (ncurses/less/clear)
if (Test-Path "$OutputDir\usr\share\terminfo") {
    Write-Host "   Copiando terminfo..." -ForegroundColor Gray
    New-Item -ItemType Directory -Path (Join-Path $liteDir "usr\share") -Force | Out-Null
    Copy-Item "$OutputDir\usr\share\terminfo" (Join-Path $liteDir "usr\share") -Recurse -Force -ErrorAction SilentlyContinue
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

if ($size -gt $MaxLiteSizeMB) {
    Write-Host "ERROR: LITE supera el techo de $MaxLiteSizeMB MB ($([math]::Round($size, 2)) MB)." -ForegroundColor Red
    Write-Host "   Reduce DLLs/paquetes antes de empaquetar en el instalador." -ForegroundColor Red
    exit 2
}

# Meta para el runtime / Apps
$meta = @{
    tier        = "lite"
    source      = "bundled"
    builtAt     = (Get-Date).ToString("o")
    sizeMB      = [math]::Round($size, 2)
    mode        = $mode
}
$meta | ConvertTo-Json | Set-Content -Path (Join-Path $OutputDir "nodeterm-cygwin-meta.json") -Encoding UTF8

Write-Host "Siguiente paso: electron-builder (extraResources -> cygwin64 en Windows)" -ForegroundColor Yellow
Write-Host "   Genera resources\cygwin64 ANTES de npm run dist; no va en git." -ForegroundColor Yellow
Write-Host ""