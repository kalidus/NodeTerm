Add-Type -AssemblyName System.Windows.Forms
$forms = [System.Windows.Forms.Screen]::AllScreens | ForEach-Object {
  [PSCustomObject]@{
    DeviceName = $_.DeviceName
    X = $_.Bounds.X
    Y = $_.Bounds.Y
    Width = $_.Bounds.Width
    Height = $_.Bounds.Height
    Primary = $_.Primary
  }
}

# Obtener resoluciones físicas reales por Win32_VideoController
$wmi = Get-WmiObject -Class Win32_VideoController | Select-Object CurrentHorizontalResolution,CurrentVerticalResolution

# Mapear por índice (puede no coincidir exactamente, pero suele ser correcto en la mayoría de setups)
for ($i = 0; $i -lt $forms.Count; $i++) {
  $forms[$i] | Add-Member -NotePropertyName 'PhysicalWidth' -NotePropertyValue ($wmi[$i].CurrentHorizontalResolution)
  $forms[$i] | Add-Member -NotePropertyName 'PhysicalHeight' -NotePropertyValue ($wmi[$i].CurrentVerticalResolution)
}

$forms | ConvertTo-Json -Compress 