# Script para instalar componentes faltantes de Visual Studio Build Tools
# Ejecutar como administrador

Write-Host "🔧 Instalando componentes faltantes de Visual Studio Build Tools..." -ForegroundColor Green

# Verificar si Visual Studio Installer está disponible
$vsInstallerPath = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vs_installer.exe"
if (-not (Test-Path $vsInstallerPath)) {
    Write-Error "Visual Studio Installer no encontrado. Por favor instala Visual Studio Build Tools primero."
    exit 1
}

Write-Host "✅ Visual Studio Installer encontrado" -ForegroundColor Green

# Listar instalaciones actuales
Write-Host "📋 Instalaciones actuales:" -ForegroundColor Yellow
& $vsInstallerPath list

Write-Host ""
Write-Host "🔧 Instalando componentes faltantes..." -ForegroundColor Yellow
Write-Host "   - ATL (Active Template Library)" -ForegroundColor White
Write-Host "   - Windows 10 SDK" -ForegroundColor White
Write-Host "   - C++ CMake tools" -ForegroundColor White

# Comando para modificar la instalación existente
$modifyCommand = @"
& $vsInstallerPath modify `
    --installPath "C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools" `
    --add Microsoft.VisualStudio.Workload.VCTools `
    --add Microsoft.VisualStudio.Component.VC.ATL `
    --add Microsoft.VisualStudio.Component.VC.ATLMFC `
    --add Microsoft.VisualStudio.Component.Windows10SDK.19041 `
    --add Microsoft.VisualStudio.Component.CMake.Project `
    --includeRecommended
"@

Write-Host "🚀 Ejecutando comando de instalación..." -ForegroundColor Yellow
Write-Host "   (Esto puede tomar varios minutos)" -ForegroundColor Gray

# Ejecutar el comando
Invoke-Expression $modifyCommand

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Componentes instalados exitosamente" -ForegroundColor Green
} else {
    Write-Error "❌ Error instalando componentes"
    exit 1
}

Write-Host ""
Write-Host "🎉 ¡Instalación completada!" -ForegroundColor Green
Write-Host "📋 Ahora puedes intentar compilar el módulo ActiveX nuevamente" -ForegroundColor Cyan
Write-Host "   cd native/rdp-activex" -ForegroundColor White
Write-Host "   npm install" -ForegroundColor White 