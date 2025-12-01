# Script PowerShell para subir ejecutables a VirusTotal
# Uso: .\scripts\virustotal-scan.ps1 [ruta-al-archivo]
#
# Requiere API key de VirusTotal (opcional)
# Configurar: $env:VIRUSTOTAL_API_KEY = "tu-api-key"

param(
    [string]$FilePath = "",
    [string]$ApiKey = $env:VIRUSTOTAL_API_KEY
)

$ErrorActionPreference = "Stop"

function Write-ColorOutput($ForegroundColor) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    if ($args) {
        Write-Output $args
    }
    $host.UI.RawUI.ForegroundColor = $fc
}

function Find-Executable {
    $distDir = Join-Path $PSScriptRoot "..\dist"
    $releaseDir = Join-Path $PSScriptRoot "..\release"
    
    $searchDirs = @($distDir, $releaseDir)
    $extensions = @('.exe', '.msi', '.dmg', '.AppImage')
    
    $latestFile = $null
    $latestTime = [DateTime]::MinValue
    
    foreach ($dir in $searchDirs) {
        if (-not (Test-Path $dir)) { continue }
        
        $files = Get-ChildItem -Path $dir -Recurse -File | Where-Object {
            $extensions -contains $_.Extension.ToLower()
        }
        
        foreach ($file in $files) {
            if ($file.LastWriteTime -gt $latestTime) {
                $latestTime = $file.LastWriteTime
                $latestFile = $file.FullName
            }
        }
    }
    
    return $latestFile
}

function Upload-ToVirusTotal {
    param(
        [string]$FilePath,
        [string]$ApiKey
    )
    
    if (-not (Test-Path $FilePath)) {
        throw "Archivo no encontrado: $FilePath"
    }
    
    $fileSize = (Get-Item $FilePath).Length
    $maxSize = 32MB
    
    if ($fileSize -gt $maxSize) {
        Write-ColorOutput Yellow "⚠️  El archivo es muy grande ($([math]::Round($fileSize / 1MB, 2))MB)."
        Write-ColorOutput Yellow "   VirusTotal tiene un límite de 32MB."
        throw "Archivo demasiado grande"
    }
    
    if ([string]::IsNullOrEmpty($ApiKey)) {
        Write-ColorOutput Yellow "⚠️  No se encontró API key de VirusTotal."
        Write-ColorOutput Yellow "   Usando método web (sin API)."
        Write-ColorOutput Cyan "   Para usar la API, configura: `$env:VIRUSTOTAL_API_KEY = 'tu-api-key'"
        Write-ColorOutput Cyan "   Obtén tu API key en: https://www.virustotal.com/gui/join-us"
        Write-Output ""
        Write-ColorOutput Blue "📤 Para subir manualmente:"
        Write-ColorOutput Cyan "   1. Ve a: https://www.virustotal.com/gui/home/upload"
        Write-ColorOutput Cyan "   2. Sube el archivo: $FilePath"
        Write-ColorOutput Cyan "   3. Espera el análisis y revisa los resultados"
        return @{ Method = 'manual'; Url = 'https://www.virustotal.com/gui/home/upload' }
    }
    
    Write-ColorOutput Cyan "📤 Subiendo archivo a VirusTotal..."
    
    try {
        $boundary = [System.Guid]::NewGuid().ToString()
        $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
        $fileName = Split-Path -Leaf $FilePath
        
        $bodyLines = @(
            "--$boundary",
            "Content-Disposition: form-data; name=`"apikey`"",
            "",
            $ApiKey,
            "--$boundary",
            "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
            "Content-Type: application/octet-stream",
            "",
            ""
        )
        
        $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($bodyLines -join "`r`n")
        $bodyBytes += $fileBytes
        $bodyBytes += [System.Text.Encoding]::UTF8.GetBytes("`r`n--$boundary--`r`n")
        
        $request = [System.Net.HttpWebRequest]::Create("https://www.virustotal.com/vtapi/v2/file/scan")
        $request.Method = "POST"
        $request.ContentType = "multipart/form-data; boundary=$boundary"
        $request.Headers.Add("apikey", $ApiKey)
        $request.ContentLength = $bodyBytes.Length
        
        $requestStream = $request.GetRequestStream()
        $requestStream.Write($bodyBytes, 0, $bodyBytes.Length)
        $requestStream.Close()
        
        $response = $request.GetResponse()
        $responseStream = $response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($responseStream)
        $responseText = $reader.ReadToEnd()
        $reader.Close()
        $responseStream.Close()
        $response.Close()
        
        $result = $responseText | ConvertFrom-Json
        
        if ($result.response_code -eq 1) {
            Write-ColorOutput Green "✅ Archivo subido exitosamente"
            Write-ColorOutput Cyan "   Resource ID: $($result.resource)"
            Write-ColorOutput Cyan "   Scan ID: $($result.scan_id)"
            Write-Output ""
            Write-ColorOutput Yellow "⏳ Esperando análisis... (esto puede tomar 1-2 minutos)"
            Write-ColorOutput Cyan "   URL: https://www.virustotal.com/gui/file/$($result.resource)"
            
            Start-Sleep -Seconds 60
            return Check-VirusTotalResults -ResourceId $result.resource -ApiKey $ApiKey
        } else {
            throw "Error de VirusTotal: $($result.verbose_msg)"
        }
    } catch {
        throw "Error subiendo archivo: $_"
    }
}

function Check-VirusTotalResults {
    param(
        [string]$ResourceId,
        [string]$ApiKey
    )
    
    Write-ColorOutput Cyan "🔍 Verificando resultados del análisis..."
    
    try {
        $url = "https://www.virustotal.com/vtapi/v2/file/report?apikey=$ApiKey&resource=$ResourceId"
        $response = Invoke-RestMethod -Uri $url -Method Get
        
        if ($response.response_code -eq 1) {
            $total = $response.total
            $positives = $response.positives
            $scans = $response.scans
            
            Write-Output ""
            Write-ColorOutput Cyan "═══════════════════════════════════════════════════"
            Write-ColorOutput Cyan "📊 RESULTADOS DE VIRUSTOTAL"
            Write-ColorOutput Cyan "═══════════════════════════════════════════════════"
            Write-ColorOutput Blue "   Total de motores: $total"
            
            if ($positives -gt 0) {
                Write-ColorOutput Red "   Detecciones: $positives"
            } else {
                Write-ColorOutput Green "   Detecciones: $positives"
            }
            
            $cleanPercent = [math]::Round(($total - $positives) / $total * 100, 1)
            Write-ColorOutput Blue "   Porcentaje limpio: $cleanPercent%"
            Write-Output ""
            
            if ($positives -eq 0) {
                Write-ColorOutput Green "✅ ¡Archivo limpio! No se detectaron amenazas."
            } else {
                Write-ColorOutput Yellow "⚠️  Se detectaron falsos positivos:"
                Write-Output ""
                
                foreach ($engine in $scans.PSObject.Properties.Name) {
                    $result = $scans.$engine
                    if ($result.detected) {
                        Write-ColorOutput Red "   🔴 $engine : $($result.result)"
                    }
                }
                
                Write-Output ""
                Write-ColorOutput Yellow "💡 Recomendaciones:"
                Write-ColorOutput Yellow "   1. Si es un falso positivo, contacta a los proveedores"
                Write-ColorOutput Yellow "   2. Considera obtener un certificado de código"
                Write-ColorOutput Yellow "   3. Envía a Microsoft Defender para análisis"
            }
            
            Write-Output ""
            Write-ColorOutput Cyan "🔗 URL completa: https://www.virustotal.com/gui/file/$ResourceId"
            Write-ColorOutput Cyan "═══════════════════════════════════════════════════"
            
            return @{
                Resource = $ResourceId
                Total = $total
                Positives = $positives
                Scans = $scans
                Url = "https://www.virustotal.com/gui/file/$ResourceId"
            }
        } elseif ($response.response_code -eq -2) {
            Write-ColorOutput Yellow "⏳ El análisis aún está en proceso. Espera unos minutos más."
            Write-ColorOutput Cyan "   URL: https://www.virustotal.com/gui/file/$ResourceId"
            return @{ Resource = $ResourceId; Status = 'queued' }
        } else {
            throw "Error: $($response.verbose_msg)"
        }
    } catch {
        throw "Error verificando resultados: $_"
    }
}

# Función principal
Write-Output ""
Write-ColorOutput Cyan "═══════════════════════════════════════════════════"
Write-ColorOutput Cyan "🛡️  VIRUSTOTAL SCANNER"
Write-ColorOutput Cyan "═══════════════════════════════════════════════════"
Write-Output ""

if ([string]::IsNullOrEmpty($FilePath)) {
    $FilePath = Find-Executable
}

if ([string]::IsNullOrEmpty($FilePath)) {
    Write-ColorOutput Red "❌ No se encontró ningún ejecutable para escanear."
    Write-Output ""
    Write-ColorOutput Yellow "Uso:"
    Write-ColorOutput Cyan "   .\scripts\virustotal-scan.ps1 [ruta-al-archivo]"
    Write-Output ""
    Write-ColorOutput Yellow "O ejecuta después de build:"
    Write-ColorOutput Cyan "   npm run dist && npm run scan:virustotal"
    exit 1
}

if (-not (Test-Path $FilePath)) {
    Write-ColorOutput Red "❌ Archivo no encontrado: $FilePath"
    exit 1
}

$fileSize = (Get-Item $FilePath).Length
Write-ColorOutput Blue "📁 Archivo: $FilePath"
Write-ColorOutput Blue "📦 Tamaño: $([math]::Round($fileSize / 1MB, 2)) MB"
Write-Output ""

try {
    $result = Upload-ToVirusTotal -FilePath $FilePath -ApiKey $ApiKey
    
    if ($result.Method -eq 'manual') {
        Write-ColorOutput Green "✅ Instrucciones mostradas arriba."
        exit 0
    }
    
    Write-Output ""
    Write-ColorOutput Green "✅ Proceso completado"
    
} catch {
    Write-ColorOutput Red "❌ Error: $_"
    exit 1
}

