#Requires -Version 5.1
<#
.SYNOPSIS
  Construye IronRDP WASM (EGFX + WebCodecs passthrough) y lo copia a vendor/.
#>
param(
  [string]$IronRdpSrc = $env:IRONRDP_SRC,
  [string]$Commit = '38b074e4befeed6dd25a67decf3558bb9e7762f9'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $IronRdpSrc) {
  $IronRdpSrc = Join-Path (Split-Path -Parent $root) 'IronRDP'
}

Write-Host "[ironrdp-wasm] Fuente: $IronRdpSrc"

if (-not (Test-Path $IronRdpSrc)) {
  git clone --depth 1 https://github.com/Devolutions/IronRDP.git $IronRdpSrc
}

Push-Location $IronRdpSrc
try {
  git fetch --depth 1 origin $Commit 2>$null
  git checkout $Commit 2>$null
} catch {
  Write-Warning "No se pudo fijar commit $Commit; se usa HEAD actual"
}

$patchDir = Join-Path $root 'patches\ironrdp'
if (Test-Path $patchDir) {
  Get-ChildItem $patchDir -Filter '*.patch' | ForEach-Object {
    Write-Host "[ironrdp-wasm] Aplicando $($_.Name)"
    cmd /c "git apply --reject --whitespace=nowarn `"$($_.FullName)`""
    if ($LASTEXITCODE -ne 0) {
      throw "No se pudo aplicar $($_.Name)"
    }
  }
}

$env:CARGO_TARGET_WASM32_UNKNOWN_UNKNOWN_RUSTFLAGS = '--cfg getrandom_backend="wasm_js"'
$env:CARGO_BUILD_JOBS = '4'

Push-Location (Join-Path $IronRdpSrc 'crates\ironrdp-web')
try {
  wasm-pack build --release --target web --out-dir pkg
} finally {
  Pop-Location
}

Push-Location (Join-Path $IronRdpSrc 'web-client\iron-remote-desktop-rdp')
try {
  if (-not (Test-Path 'node_modules')) { npm install }
  npm run build-alone
} finally {
  Pop-Location
}

$dst = Join-Path $root 'vendor\iron-remote-desktop-rdp'
New-Item -ItemType Directory -Force -Path $dst | Out-Null
Copy-Item (Join-Path $IronRdpSrc 'web-client\iron-remote-desktop-rdp\dist\*') $dst -Force

$pkgPath = Join-Path $dst 'package.json'
$pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
$pkg.name = '@devolutions/iron-remote-desktop-rdp'
$pkg.version = '0.7.0-nodeterm-egfx.19'
$pkg.description = "NodeTerm vendor IronRDP $Commit + EGFX + WebCodecs + diag"
$json = ($pkg | ConvertTo-Json -Depth 8) -replace "`r`n", "`n"
if (-not $json.EndsWith("`n")) { $json += "`n" }
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($pkgPath, $json, $utf8)

Write-Host "[ironrdp-wasm] Listo en $dst"
Pop-Location
