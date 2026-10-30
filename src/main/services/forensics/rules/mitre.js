/**
 * Subconjunto de MITRE ATT&CK (Enterprise) usado por las reglas.
 */
const MITRE = {
  'T1003': { name: 'OS Credential Dumping', tactic: 'Credential Access' },
  'T1003.001': { name: 'LSASS Memory', tactic: 'Credential Access' },
  'T1014': { name: 'Rootkit', tactic: 'Defense Evasion' },
  'T1027': { name: 'Obfuscated Files or Information', tactic: 'Defense Evasion' },
  'T1036': { name: 'Masquerading', tactic: 'Defense Evasion' },
  'T1036.005': { name: 'Match Legitimate Name or Location', tactic: 'Defense Evasion' },
  'T1040': { name: 'Network Sniffing', tactic: 'Credential Access' },
  'T1053.003': { name: 'Scheduled Task/Job: Cron', tactic: 'Persistence' },
  'T1053.005': { name: 'Scheduled Task/Job: Scheduled Task', tactic: 'Persistence' },
  'T1059': { name: 'Command and Scripting Interpreter', tactic: 'Execution' },
  'T1059.001': { name: 'PowerShell', tactic: 'Execution' },
  'T1059.004': { name: 'Unix Shell', tactic: 'Execution' },
  'T1070.001': { name: 'Clear Windows Event Logs', tactic: 'Defense Evasion' },
  'T1070.002': { name: 'Clear Linux or Mac System Logs', tactic: 'Defense Evasion' },
  'T1070.003': { name: 'Clear Command History', tactic: 'Defense Evasion' },
  'T1070.004': { name: 'File Deletion', tactic: 'Defense Evasion' },
  'T1071': { name: 'Application Layer Protocol', tactic: 'Command and Control' },
  'T1078': { name: 'Valid Accounts', tactic: 'Initial Access' },
  'T1090': { name: 'Proxy', tactic: 'Command and Control' },
  'T1098': { name: 'Account Manipulation', tactic: 'Persistence' },
  'T1098.004': { name: 'SSH Authorized Keys', tactic: 'Persistence' },
  'T1105': { name: 'Ingress Tool Transfer', tactic: 'Command and Control' },
  'T1110': { name: 'Brute Force', tactic: 'Credential Access' },
  'T1110.001': { name: 'Password Guessing', tactic: 'Credential Access' },
  'T1136.001': { name: 'Create Account: Local Account', tactic: 'Persistence' },
  'T1197': { name: 'BITS Jobs', tactic: 'Persistence' },
  'T1204': { name: 'User Execution', tactic: 'Execution' },
  'T1218': { name: 'System Binary Proxy Execution', tactic: 'Defense Evasion' },
  'T1219': { name: 'Remote Access Software', tactic: 'Command and Control' },
  'T1021.001': { name: 'Remote Desktop Protocol', tactic: 'Lateral Movement' },
  'T1021.002': { name: 'SMB/Windows Admin Shares', tactic: 'Lateral Movement' },
  'T1021.004': { name: 'SSH', tactic: 'Lateral Movement' },
  'T1496': { name: 'Resource Hijacking', tactic: 'Impact' },
  'T1543.002': { name: 'Systemd Service', tactic: 'Persistence' },
  'T1543.003': { name: 'Windows Service', tactic: 'Persistence' },
  'T1546.003': { name: 'WMI Event Subscription', tactic: 'Persistence' },
  'T1546.004': { name: 'Unix Shell Configuration Modification', tactic: 'Persistence' },
  'T1546.012': { name: 'Image File Execution Options Injection', tactic: 'Persistence' },
  'T1547.001': { name: 'Registry Run Keys / Startup Folder', tactic: 'Persistence' },
  'T1548.001': { name: 'Setuid and Setgid', tactic: 'Privilege Escalation' },
  'T1548.003': { name: 'Sudo and Sudo Caching', tactic: 'Privilege Escalation' },
  'T1552': { name: 'Unsecured Credentials', tactic: 'Credential Access' },
  'T1554': { name: 'Compromise Host Software Binary', tactic: 'Persistence' },
  'T1562.001': { name: 'Disable or Modify Tools', tactic: 'Defense Evasion' },
  'T1562.002': { name: 'Disable Windows Event Logging', tactic: 'Defense Evasion' },
  'T1562.004': { name: 'Disable or Modify System Firewall', tactic: 'Defense Evasion' },
  'T1565.001': { name: 'Stored Data Manipulation', tactic: 'Impact' },
  'T1571': { name: 'Non-Standard Port', tactic: 'Command and Control' },
  'T1572': { name: 'Protocol Tunneling', tactic: 'Command and Control' },
  'T1574.006': { name: 'Dynamic Linker Hijacking', tactic: 'Persistence' },
  'T1602.001': { name: 'SNMP (MIB Dump)', tactic: 'Collection' }
};

function mitreRefs(ids = []) {
  return ids.map((id) => ({
    id,
    name: MITRE[id]?.name || id,
    tactic: MITRE[id]?.tactic || ''
  }));
}

module.exports = { MITRE, mitreRefs };
