/**
 * Colectores Windows (PowerShell, solo lectura).
 *
 * Los scripts deben ser compactos: viajan como -EncodedCommand y cmd.exe limita
 * la línea de comandos (~8191 caracteres). Los tests comprueban este límite.
 */

function def(id, category, title, script, opts = {}) {
  return {
    id: `windows.${id}`,
    platform: 'windows',
    category,
    title,
    shell: 'powershell',
    script,
    timeoutMs: opts.timeoutMs || 90000,
    profiles: opts.profiles || ['quick', 'full'],
    needsRoot: !!opts.needsRoot,
    volatility: opts.volatility ?? 5
  };
}

/**
 * Genera un script que lee eventos de un log de Windows y emite JSON compacto.
 * fields: pares [clave, campoEventData]
 */
function eventScript({ log, ids, max = 300, days = 7, fields = [], msgChars = 0, filter = '' }) {
  const idList = ids.join(',');
  const fieldExpr = fields.map(([k, f]) => `${k}=$d['${f}']`).join(';');
  const msg = msgChars > 0
    ? `;msg=$(if($_.Message){$_.Message.Substring(0,[Math]::Min(${msgChars},$_.Message.Length))})`
    : '';
  const filt = filter ? `|?{${filter}}` : '';
  return (
    `$f=@{LogName='${log}';Id=${idList};StartTime=(Get-Date).AddDays(-${days})};` +
    `Get-WinEvent -FilterHashtable $f -MaxEvents ${max}|%{$d=@{};([xml]$_.ToXml()).Event.EventData.Data|%{if($_.Name){$d[$_.Name]=$_.'#text'}};` +
    `[pscustomobject]@{t=$_.TimeCreated.ToUniversalTime().ToString('o');id=$_.Id${fieldExpr ? ';' + fieldExpr : ''}${msg}}}${filt}|ConvertTo-Json -Compress`
  );
}

const WINDOWS_COLLECTORS = [
  def(
    'meta.system', 'meta', 'Información del sistema',
    "$o=Get-CimInstance Win32_OperatingSystem;[pscustomobject]@{host=$env:COMPUTERNAME;user=(whoami);time=(Get-Date).ToUniversalTime().ToString('o');os=$o.Caption;ver=$o.Version;boot=$o.LastBootUpTime.ToUniversalTime().ToString('o');admin=([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}|ConvertTo-Json -Compress",
    { volatility: 1 }
  ),
  def(
    'proc.list', 'processes', 'Procesos en ejecución',
    "Get-CimInstance Win32_Process|%{[pscustomobject]@{pid=$_.ProcessId;ppid=$_.ParentProcessId;name=$_.Name;path=$_.ExecutablePath;cmd=$_.CommandLine;created=$(if($_.CreationDate){$_.CreationDate.ToUniversalTime().ToString('o')})}}|ConvertTo-Json -Compress",
    { volatility: 1 }
  ),
  def(
    'proc.hashes', 'processes', 'Hashes y firmas de ejecutables en uso',
    "Get-CimInstance Win32_Process|?{$_.ExecutablePath}|select -Unique ExecutablePath|%{$p=$_.ExecutablePath;[pscustomobject]@{path=$p;sha256=(Get-FileHash -Algorithm SHA256 $p).Hash;sig=(Get-AuthenticodeSignature $p).Status.ToString()}}|ConvertTo-Json -Compress",
    { profiles: ['full'], timeoutMs: 240000, volatility: 1 }
  ),
  def(
    'logins.sessions', 'logins', 'Sesiones de usuario',
    'quser 2>&1',
    { volatility: 1 }
  ),
  def(
    'net.conns', 'network', 'Conexiones TCP (escucha y establecidas)',
    "$p=@{};Get-Process|%{$p[$_.Id]=$_.ProcessName};Get-NetTCPConnection|?{$_.State -in 'Listen','Established'}|%{[pscustomobject]@{state=[string]$_.State;la=$_.LocalAddress;lp=$_.LocalPort;ra=$_.RemoteAddress;rp=$_.RemotePort;pid=$_.OwningProcess;proc=$p[[int]$_.OwningProcess]}}|ConvertTo-Json -Compress",
    { volatility: 1 }
  ),
  def(
    'net.udp', 'network', 'Endpoints UDP',
    "$p=@{};Get-Process|%{$p[$_.Id]=$_.ProcessName};Get-NetUDPEndpoint|select -First 150|%{[pscustomobject]@{la=$_.LocalAddress;lp=$_.LocalPort;pid=$_.OwningProcess;proc=$p[[int]$_.OwningProcess]}}|ConvertTo-Json -Compress",
    { profiles: ['full'], volatility: 1 }
  ),
  def(
    'net.config', 'network', 'Configuración de red, rutas, ARP y portproxy',
    'ipconfig /all; route print; arp -a; netsh interface portproxy show all',
    { volatility: 2 }
  ),
  def(
    'net.dns', 'network', 'Caché DNS y fichero hosts',
    "Get-DnsClientCache|select -First 300 Entry,Data|ConvertTo-Json -Compress;'### hosts';Get-Content \"$env:windir\\System32\\drivers\\etc\\hosts\"|?{$_ -notmatch '^\\s*#' -and $_.Trim()}",
    { volatility: 2 }
  ),
  def(
    'users.local', 'users', 'Usuarios locales y administradores',
    "[pscustomobject]@{users=@(Get-LocalUser|select Name,Enabled,SID,@{n='LastLogon';e={\"$($_.LastLogon)\"}},@{n='PwdSet';e={\"$($_.PasswordLastSet)\"}});admins=@(Get-LocalGroupMember -Group 'Administrators'|select Name,ObjectClass,PrincipalSource)}|ConvertTo-Json -Compress -Depth 4",
    { volatility: 4 }
  ),
  def(
    'persist.tasks', 'persistence', 'Tareas programadas',
    "Get-ScheduledTask|?{$_.State -ne 'Disabled'}|%{[pscustomobject]@{name=$_.TaskName;path=$_.TaskPath;state=[string]$_.State;user=$_.Principal.UserId;actions=(($_.Actions|%{\"$($_.Execute) $($_.Arguments)\"}) -join ' ; ')}}|ConvertTo-Json -Compress",
    { volatility: 4 }
  ),
  def(
    'persist.services', 'persistence', 'Servicios (en ejecución o automáticos)',
    "Get-CimInstance Win32_Service|?{$_.State -eq 'Running' -or $_.StartMode -eq 'Auto'}|select Name,DisplayName,State,StartMode,StartName,PathName|ConvertTo-Json -Compress",
    { volatility: 4 }
  ),
  def(
    'persist.run', 'persistence', 'Claves Run, Winlogon, IFEO y carpetas Startup',
    "$k='HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce','HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run','HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\RunOnce','HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon';foreach($x in $k){if(Test-Path $x){\"### $x\";(Get-ItemProperty $x).PSObject.Properties|?{$_.Name -notlike 'PS*'}|%{\"$($_.Name)=$($_.Value)\"}}};'### IFEO';Get-ChildItem 'HKLM:\\Software\\Microsoft\\Windows NT\\CurrentVersion\\Image File Execution Options'|%{$d=(Get-ItemProperty $_.PSPath).Debugger;if($d){\"$($_.PSChildName) Debugger=$d\"}};'### Startup';Get-ChildItem \"$env:ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\",\"$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\" -Force|%{\"$($_.FullName)`t$($_.LastWriteTime.ToUniversalTime().ToString('o'))\"}",
    { volatility: 4 }
  ),
  def(
    'persist.wmi', 'persistence', 'Suscripciones WMI',
    "$n='root\\subscription';[pscustomobject]@{filters=@(Get-CimInstance -Namespace $n -ClassName __EventFilter|select Name,Query);consumers=@(Get-CimInstance -Namespace $n -ClassName __EventConsumer|select Name,CommandLineTemplate,ScriptText);bindings=@(Get-CimInstance -Namespace $n -ClassName __FilterToConsumerBinding|select Filter,Consumer)}|ConvertTo-Json -Compress -Depth 4",
    { volatility: 4 }
  ),
  def(
    'persist.bits', 'persistence', 'Transferencias BITS',
    "Get-BitsTransfer -AllUsers|select DisplayName,JobState,@{n='files';e={($_.FileList|%{$_.RemoteName}) -join ','}}|ConvertTo-Json -Compress",
    { profiles: ['full'], volatility: 4 }
  ),
  def(
    'ev.logon_fail', 'logs', 'Inicios de sesión fallidos (4625)',
    eventScript({
      log: 'Security', ids: [4625], max: 300,
      fields: [['user', 'TargetUserName'], ['dom', 'TargetDomainName'], ['type', 'LogonType'], ['ip', 'IpAddress'], ['wks', 'WorkstationName']]
    }),
    { needsRoot: true, volatility: 6 }
  ),
  def(
    'ev.logon_ok', 'logs', 'Inicios de sesión remotos correctos (4624 tipos 3/10)',
    eventScript({
      log: 'Security', ids: [4624], max: 1500,
      fields: [['user', 'TargetUserName'], ['dom', 'TargetDomainName'], ['type', 'LogonType'], ['ip', 'IpAddress'], ['proc', 'ProcessName']],
      filter: "$_.type -in '3','10','9'"
    }),
    { needsRoot: true, timeoutMs: 180000, volatility: 6 }
  ),
  def(
    'ev.accounts', 'logs', 'Cambios de cuentas, servicios y auditoría (Security)',
    eventScript({
      log: 'Security', ids: [4720, 4722, 4724, 4728, 4732, 4738, 4756, 4697, 4698, 4702, 4719, 1102], max: 300, days: 30,
      fields: [['user', 'TargetUserName'], ['by', 'SubjectUserName'], ['svc', 'ServiceName'], ['image', 'ServiceFileName']], msgChars: 120
    }),
    { needsRoot: true, volatility: 6 }
  ),
  def(
    'ev.services', 'logs', 'Servicios instalados (System 7045)',
    eventScript({
      log: 'System', ids: [7045], max: 100, days: 60,
      fields: [['svc', 'ServiceName'], ['image', 'ImagePath'], ['acct', 'AccountName']]
    }),
    { volatility: 6 }
  ),
  def(
    'ev.process', 'logs', 'Creación de procesos (4688)',
    eventScript({
      log: 'Security', ids: [4688], max: 300, days: 3,
      fields: [['proc', 'NewProcessName'], ['cmd', 'CommandLine'], ['by', 'SubjectUserName'], ['parent', 'ParentProcessName']]
    }),
    { needsRoot: true, profiles: ['full'], volatility: 6 }
  ),
  def(
    'ev.powershell', 'logs', 'Script blocks de PowerShell (4104)',
    eventScript({ log: 'Microsoft-Windows-PowerShell/Operational', ids: [4104], max: 80, days: 7, msgChars: 400 }),
    { volatility: 6 }
  ),
  def(
    'ev.defender', 'logs', 'Detecciones de Defender',
    eventScript({ log: 'Microsoft-Windows-Windows Defender/Operational', ids: [1116, 1117, 5001, 5007], max: 100, days: 30, msgChars: 300 }),
    { volatility: 6 }
  ),
  def(
    'ev.rdp', 'logs', 'Conexiones RDP entrantes (1149)',
    eventScript({ log: 'Microsoft-Windows-TerminalServices-RemoteConnectionManager/Operational', ids: [1149], max: 100, days: 30, msgChars: 200 }),
    { volatility: 6 }
  ),
  def(
    'sec.defender', 'security', 'Estado y exclusiones de Defender',
    "[pscustomobject]@{prefs=(Get-MpPreference|select DisableRealtimeMonitoring,DisableBehaviorMonitoring,ExclusionPath,ExclusionProcess,ExclusionExtension);threats=@(Get-MpThreatDetection|select -First 30 @{n='t';e={\"$($_.InitialDetectionTime)\"}},ProcessName,Resources,ThreatID)}|ConvertTo-Json -Compress -Depth 4",
    { volatility: 4 }
  ),
  def(
    'sec.firewall', 'security', 'Cortafuegos de Windows',
    "[pscustomobject]@{profiles=@(Get-NetFirewallProfile|select Name,Enabled);inbound=@(Get-NetFirewallRule -Enabled True -Direction Inbound -Action Allow|select -First 150 DisplayName,Profile)}|ConvertTo-Json -Compress -Depth 4",
    { volatility: 4 }
  ),
  def(
    'misc.shares', 'security', 'Recursos compartidos y sesiones SMB',
    "[pscustomobject]@{shares=@(Get-SmbShare|select Name,Path,Description);sessions=@(Get-SmbSession|select ClientComputerName,ClientUserName)}|ConvertTo-Json -Compress -Depth 4",
    { volatility: 4 }
  ),
  def(
    'files.dropped', 'files', 'Ejecutables y scripts recientes en rutas habituales de malware',
    "$d=\"$env:SystemRoot\\Temp\",$env:ProgramData,$env:PUBLIC,\"$env:SystemDrive\\Users\\*\\AppData\\Local\\Temp\",\"$env:SystemDrive\\Users\\*\\AppData\\Roaming\",\"$env:SystemDrive\\Users\\*\\Downloads\";Get-ChildItem $d -Recurse -Force -File -Include *.exe,*.dll,*.ps1,*.bat,*.cmd,*.vbs,*.js,*.hta,*.scr|?{$_.LastWriteTime -gt (Get-Date).AddDays(-7)}|sort LastWriteTime -Descending|select -First 250 FullName,Length,@{n='t';e={$_.LastWriteTime.ToUniversalTime().ToString('o')}}|ConvertTo-Json -Compress",
    { timeoutMs: 240000, volatility: 5 }
  ),
  def(
    'files.prefetch', 'files', 'Prefetch reciente',
    "Get-ChildItem \"$env:SystemRoot\\Prefetch\" -Filter *.pf|sort LastWriteTime -Descending|select -First 150 Name,@{n='t';e={$_.LastWriteTime.ToUniversalTime().ToString('o')}}|ConvertTo-Json -Compress",
    { profiles: ['full'], volatility: 5 }
  ),
  def(
    'pkg.hotfix', 'packages', 'Actualizaciones instaladas',
    "Get-HotFix|select -First 40 HotFixID,Description,@{n='t';e={\"$($_.InstalledOn)\"}}|ConvertTo-Json -Compress",
    { profiles: ['full'], volatility: 7 }
  )
];

module.exports = { WINDOWS_COLLECTORS, eventScript };
