# Script para empaquetar Cygwin portable en un archivo comprimido
# Ejecutar DESPUES de crear Cygwin con create-cygwin-portable.ps1

param(
    [string]$SourceDir = ".\resources\cygwin64",
    [string]$OutputFile = ".\cygwin64-portable.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "  Empaquetando Cygwin Portable" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el directorio fuente existe
if (-not (Test-Path $SourceDir)) {
    Write-Host "ERROR: No se encontro el directorio $SourceDir" -ForegroundColor Red
    Write-Host "Ejecuta primero: .\scripts\create-cygwin-portable.ps1" -ForegroundColor Yellow
    exit 1
}

# Verificar que bash.exe existe
$bashPath = Join-Path $SourceDir "bin\bash.exe"
if (-not (Test-Path $bashPath)) {
    Write-Host "ERROR: No se encontro bash.exe en $SourceDir" -ForegroundColor Red
    exit 1
}

Write-Host "Directorio fuente: $SourceDir" -ForegroundColor Yellow
Write-Host "Archivo destino: $OutputFile" -ForegroundColor Yellow
Write-Host ""

# Calcular tamano antes de comprimir
Write-Host "Calculando tamano..." -ForegroundColor Cyan
$size = (Get-ChildItem $SourceDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "   Tamano sin comprimir: $([math]::Round($size, 2)) MB" -ForegroundColor White

# Eliminar archivo existente si existe
if (Test-Path $OutputFile) {
    Write-Host ""
    Write-Host "Eliminando archivo anterior..." -ForegroundColor Yellow
    Remove-Item $OutputFile -Force
}

# Comprimir usando PowerShell
Write-Host ""
Write-Host "Comprimiendo..." -ForegroundColor Cyan
Write-Host "   Esto puede tomar varios minutos..." -ForegroundColor Yellow

try {
    Compress-Archive -Path $SourceDir -DestinationPath $OutputFile -CompressionLevel Optimal -Force
    Write-Host "   Compresion completada" -ForegroundColor Green
} catch {
    Write-Host "   ERROR: No se pudo comprimir: $_" -ForegroundColor Red
    exit 1
}

# Calcular tamano del archivo comprimido
$compressedSize = (Get-Item $OutputFile).Length / 1MB
Write-Host ""
Write-Host "====================================================" -ForegroundColor Green
Write-Host "  Paquete Creado Exitosamente!" -ForegroundColor Green
Write-Host "====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Archivo: $OutputFile" -ForegroundColor White
Write-Host "Tamano original: $([math]::Round($size, 2)) MB" -ForegroundColor White
Write-Host "Tamano comprimido: $([math]::Round($compressedSize, 2)) MB" -ForegroundColor White
Write-Host "Compresion: $([math]::Round(($compressedSize / $size) * 100, 1))%" -ForegroundColor White
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Yellow
Write-Host "1. Sube este archivo a GitHub Releases" -ForegroundColor White
Write-Host "2. Actualiza la URL en CygwinDownloader.js" -ForegroundColor White
Write-Host ""
