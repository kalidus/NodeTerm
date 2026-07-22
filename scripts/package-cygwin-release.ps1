# Empaqueta Cygwin LITE como ZIP para GitHub Releases (tag cygwin-vX.Y.Z)
# Uso:
#   .\scripts\package-cygwin-release.ps1
#   .\scripts\package-cygwin-release.ps1 -Version 1.0.0 -Publish
#   .\scripts\package-cygwin-release.ps1 -SkipBuild   # usa resources\cygwin64 existente

param(
    [string]$Version = "1.0.0",
    [switch]$SkipBuild,
    [switch]$Publish,
    [string]$Repo = "kalidus/NodeTerm"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$CygwinDir = Join-Path $ProjectRoot "resources\cygwin64"
$DistDir = Join-Path $ProjectRoot "dist"
$ZipName = "cygwin64-portable.zip"
$ZipPath = Join-Path $DistDir $ZipName
$Tag = "cygwin-v$Version"

Write-Host "=== NodeTerm Cygwin Release Packager ==="
Write-Host "Version: $Version"
Write-Host "Tag:     $Tag"
Write-Host "Output:  $ZipPath"

if (-not $SkipBuild) {
    Write-Host "Generando Cygwin LITE con create-cygwin-portable.ps1 ..."
    & (Join-Path $PSScriptRoot "create-cygwin-portable.ps1")
    if ($LASTEXITCODE -ne 0) {
        throw "create-cygwin-portable.ps1 fallo con codigo $LASTEXITCODE"
    }
}

$BashPath = Join-Path $CygwinDir "bin\bash.exe"
if (-not (Test-Path $BashPath)) {
    throw "No se encontro $BashPath. Ejecuta create-cygwin-portable.ps1 o quita -SkipBuild."
}

if (-not (Test-Path $DistDir)) {
    New-Item -ItemType Directory -Path $DistDir | Out-Null
}

if (Test-Path $ZipPath) {
    Remove-Item -Force $ZipPath
}

Write-Host "Comprimiendo carpeta cygwin64 ..."
# El ZIP debe contener la carpeta raiz cygwin64/ (bin/bash.exe relativo a ella)
Push-Location (Join-Path $ProjectRoot "resources")
try {
    Compress-Archive -Path "cygwin64" -DestinationPath $ZipPath -Force
} finally {
    Pop-Location
}

$SizeMB = [math]::Round((Get-Item $ZipPath).Length / 1MB, 2)
Write-Host "ZIP creado: $ZipPath ($SizeMB MB)"

if ($Publish) {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) no esta instalado o no esta en PATH."
    }

    $notes = @"
Cygwin portable LITE para NodeTerm (instalacion desde Apps).

- Contiene bash, coreutils, git, openssh, curl, wget, vim, nano, tar, zip, rsync, etc.
- Destino en el cliente: %APPDATA%\nodeterm\cygwin64
- Asset: $ZipName
"@

    gh release view $Tag --repo $Repo 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Release $Tag ya existe. Subiendo/actualizando asset ..."
        gh release upload $Tag $ZipPath --repo $Repo --clobber
    } else {
        Write-Host "Creando release $Tag ..."
        gh release create $Tag $ZipPath --repo $Repo --title "Cygwin portable v$Version" --notes $notes
    }

    Write-Host "Publicado: https://github.com/$Repo/releases/tag/$Tag"
} else {
    Write-Host ""
    Write-Host "Para publicar:"
    Write-Host "  .\scripts\package-cygwin-release.ps1 -Version $Version -SkipBuild -Publish"
    Write-Host "URL esperada por la app:"
    Write-Host "  https://github.com/$Repo/releases/download/$Tag/$ZipName"
}
