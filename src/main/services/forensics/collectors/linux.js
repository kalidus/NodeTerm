/**
 * Colectores Linux / Unix (solo lectura, orden de volatilidad RFC 3227).
 *
 * Cada colector produce texto plano. La salida se guarda como artefacto y la
 * analizan las reglas (rules/). Todos los scripts pasan por assertReadOnly().
 */

const TS_FMT = "'%TY-%Tm-%TdT%TH:%TM:%.2TS\\t%u\\t%m\\t%p\\n'";
const TS_FMT_SIZE = "'%TY-%Tm-%TdT%TH:%TM:%.2TS\\t%u\\t%m\\t%s\\t%p\\n'";

function def(id, category, title, script, opts = {}) {
  return {
    id: `linux.${id}`,
    platform: 'linux',
    category,
    title,
    shell: 'sh',
    script,
    timeoutMs: opts.timeoutMs || 60000,
    profiles: opts.profiles || ['quick', 'full'],
    needsRoot: !!opts.needsRoot,
    volatility: opts.volatility ?? 5
  };
}

const LINUX_COLLECTORS = [
  // --- Volatilidad alta: estado del sistema, sesiones, procesos y red ---
  def(
    'meta.system', 'meta', 'Información del sistema',
    "date -u +%Y-%m-%dT%H:%M:%SZ; date +%z; echo; uptime; echo; hostname; uname -a; echo; id; echo; head -n 8 /etc/os-release 2>/dev/null",
    { volatility: 1 }
  ),
  def(
    'logins.current', 'logins', 'Sesiones activas',
    'w 2>/dev/null; echo; who -a 2>/dev/null',
    { volatility: 1 }
  ),
  def(
    'proc.list', 'processes', 'Procesos en ejecución',
    'ps -eo pid,ppid,user:20,lstart,args --sort=start_time 2>/dev/null || ps -ef 2>/dev/null || ps aux',
    { volatility: 1 }
  ),
  def(
    'proc.suspicious', 'processes', 'Procesos con binario eliminado o en rutas temporales',
    "ls -l /proc/[0-9]*/exe 2>/dev/null | grep -E '\\(deleted\\)|/tmp/|/dev/shm/|/var/tmp/'",
    { volatility: 1 }
  ),
  def(
    'net.listen', 'network', 'Puertos en escucha',
    'ss -tulpan 2>/dev/null || netstat -tulpan 2>/dev/null',
    { volatility: 1 }
  ),
  def(
    'net.established', 'network', 'Conexiones establecidas',
    'ss -tnp state established 2>/dev/null || netstat -tnp 2>/dev/null',
    { volatility: 1 }
  ),
  def(
    'net.config', 'network', 'Configuración de red',
    'ip -br addr 2>/dev/null; echo; ip route 2>/dev/null; echo; ip neigh 2>/dev/null; echo; cat /etc/resolv.conf 2>/dev/null; echo; cat /etc/hosts 2>/dev/null',
    { volatility: 2 }
  ),
  def(
    'net.firewall', 'network', 'Reglas de cortafuegos',
    'iptables -S 2>/dev/null; echo; nft list ruleset 2>/dev/null | head -n 150',
    { needsRoot: true, volatility: 2 }
  ),
  def(
    'net.promisc', 'network', 'Interfaces en modo promiscuo',
    "ip link 2>/dev/null | grep -i promisc",
    { volatility: 2 }
  ),

  // --- Kernel ---
  def(
    'kernel.modules', 'kernel', 'Módulos del kernel',
    'lsmod 2>/dev/null; echo; echo tainted=$(cat /proc/sys/kernel/tainted 2>/dev/null)',
    { volatility: 2 }
  ),
  def(
    'kernel.preload', 'kernel', 'LD_PRELOAD / ld.so.preload',
    "cat /etc/ld.so.preload 2>/dev/null; echo '---'; env | grep -E '^LD_'",
    { volatility: 2 }
  ),
  def(
    'misc.mounts', 'system', 'Sistemas de ficheros montados',
    'cat /proc/mounts 2>/dev/null',
    { volatility: 3 }
  ),

  // --- Usuarios y autenticación ---
  def(
    'users.passwd', 'users', '/etc/passwd',
    'cat /etc/passwd',
    { volatility: 4 }
  ),
  def(
    'users.groups', 'users', 'Grupos privilegiados',
    "grep -E '^(sudo|wheel|admin|root|adm|docker|lxd|shadow|disk):' /etc/group 2>/dev/null",
    { volatility: 4 }
  ),
  def(
    'users.sudoers', 'users', 'Configuración de sudoers',
    "cat /etc/sudoers /etc/sudoers.d/* 2>/dev/null | grep -Ev '^[[:space:]]*(#|$)'",
    { needsRoot: true, volatility: 4 }
  ),
  def(
    'users.emptypw', 'users', 'Cuentas sin contraseña',
    "awk -F: '($2==\"\"){print $1}' /etc/shadow 2>/dev/null",
    { needsRoot: true, volatility: 4 }
  ),
  def(
    'users.filestamps', 'users', 'Fechas de ficheros de cuentas',
    'ls -l --time-style=full-iso /etc/passwd /etc/shadow /etc/group /etc/gshadow /etc/sudoers 2>/dev/null',
    { volatility: 4 }
  ),
  def(
    'logins.last', 'logins', 'Historial de accesos (last)',
    'last -F -n 80 2>/dev/null || last -n 80 2>/dev/null',
    { volatility: 4 }
  ),
  def(
    'logins.lastb', 'logins', 'Accesos fallidos (lastb)',
    'lastb -F -n 60 2>/dev/null',
    { needsRoot: true, volatility: 4 }
  ),

  // --- Persistencia ---
  def(
    'persist.cron', 'persistence', 'Tareas cron',
    'for f in /etc/crontab /etc/cron.d/* /var/spool/cron/* /var/spool/cron/crontabs/* /etc/anacrontab; do [ -f "$f" ] && { echo "### $f"; grep -Ev \'^[[:space:]]*(#|$)\' "$f"; }; done',
    { needsRoot: true, volatility: 4 }
  ),
  def(
    'persist.cron_dirs', 'persistence', 'Scripts en directorios cron.*',
    'ls -l --time-style=full-iso /etc/cron.hourly /etc/cron.daily /etc/cron.weekly /etc/cron.monthly 2>/dev/null',
    { volatility: 4 }
  ),
  def(
    'persist.timers', 'persistence', 'Timers de systemd',
    'systemctl list-timers --all --no-pager 2>/dev/null',
    { volatility: 4 }
  ),
  def(
    'persist.services', 'persistence', 'Servicios habilitados',
    'systemctl list-unit-files --type=service --state=enabled --no-pager 2>/dev/null',
    { volatility: 4 }
  ),
  def(
    'persist.units_recent', 'persistence', 'Unidades systemd modificadas recientemente',
    `find /etc/systemd /usr/lib/systemd /lib/systemd -name '*.service' -mtime -30 -printf ${TS_FMT} 2>/dev/null; echo '---'; find /etc/systemd /usr/lib/systemd /lib/systemd -name '*.service' -mtime -30 -exec grep -H '^ExecStart' {} + 2>/dev/null`,
    { volatility: 4 }
  ),
  def(
    'persist.rc', 'persistence', 'rc.local e init.d',
    "grep -Ev '^[[:space:]]*(#|$)' /etc/rc.local 2>/dev/null; echo '---'; ls -l --time-style=full-iso /etc/init.d 2>/dev/null | tail -n 40",
    { volatility: 4 }
  ),
  def(
    'persist.ssh_keys', 'persistence', 'authorized_keys',
    'for d in /root /home/*; do for f in "$d"/.ssh/authorized_keys "$d"/.ssh/authorized_keys2; do [ -f "$f" ] && { echo "### $f"; ls -l --time-style=full-iso "$f"; cut -c1-220 "$f"; }; done; done',
    { needsRoot: true, volatility: 4 }
  ),
  def(
    'persist.sshd', 'persistence', 'Configuración de sshd',
    "grep -Ev '^[[:space:]]*(#|$)' /etc/ssh/sshd_config 2>/dev/null; cat /etc/ssh/sshd_config.d/*.conf 2>/dev/null | grep -Ev '^[[:space:]]*(#|$)'",
    { volatility: 4 }
  ),
  def(
    'persist.profiles', 'persistence', 'Perfiles de shell',
    'for f in /etc/profile /etc/bash.bashrc /etc/profile.d/* /root/.bashrc /root/.profile /root/.bash_profile /home/*/.bashrc /home/*/.profile /home/*/.bash_profile; do [ -f "$f" ] && { echo "### $f"; ls -l --time-style=full-iso "$f"; grep -Ev \'^[[:space:]]*(#|$)\' "$f" | tail -n 40; }; done',
    { needsRoot: true, volatility: 4 }
  ),

  // --- Sistema de ficheros ---
  def(
    'files.tmp_exec', 'files', 'Ejecutables en /tmp, /var/tmp y /dev/shm',
    `find /tmp /var/tmp /dev/shm -type f -perm /111 -printf ${TS_FMT_SIZE} 2>/dev/null | head -n 200`,
    { volatility: 5 }
  ),
  def(
    'files.tmp_list', 'files', 'Contenido de directorios temporales',
    'ls -laR --time-style=full-iso /tmp /var/tmp /dev/shm 2>/dev/null | head -n 400',
    { volatility: 5 }
  ),
  def(
    'files.bin_recent', 'files', 'Binarios del sistema modificados (14 días)',
    `find /bin /sbin /usr/bin /usr/sbin /usr/local/bin /usr/local/sbin /lib /usr/lib -xdev -type f -mtime -14 -printf ${TS_FMT} 2>/dev/null | head -n 200`,
    { timeoutMs: 120000, volatility: 5 }
  ),
  def(
    'files.recent', 'files', 'Ficheros modificados (3 días)',
    `find / -xdev -type f -mtime -3 -not -path '/proc/*' -not -path '/sys/*' -not -path '/var/log/*' -not -path '/var/lib/*' -not -path '/var/cache/*' -printf ${TS_FMT} 2>/dev/null | sort -r | head -n 300`,
    { profiles: ['full'], timeoutMs: 240000, volatility: 5 }
  ),
  def(
    'files.suid', 'files', 'Ficheros SUID/SGID',
    `find / -xdev -type f \\( -perm -4000 -o -perm -2000 \\) -printf ${TS_FMT} 2>/dev/null | head -n 300`,
    { profiles: ['full'], timeoutMs: 240000, volatility: 5 }
  ),
  def(
    'files.capabilities', 'files', 'Capabilities de ficheros',
    'getcap -r / 2>/dev/null | head -n 100',
    { profiles: ['full'], timeoutMs: 240000, volatility: 5 }
  ),

  // --- Logs ---
  def(
    'logs.auth', 'logs', 'Eventos de autenticación (auth.log / secure)',
    "f=/var/log/auth.log; [ -f \"$f\" ] || f=/var/log/secure; [ -f \"$f\" ] && grep -E 'Accepted|Failed password|Invalid user|sudo:|useradd|usermod|new user|new group|session opened for user root|authentication failure|COMMAND=' \"$f\" | tail -n 800",
    { needsRoot: true, volatility: 6 }
  ),
  def(
    'logs.sshd', 'logs', 'Registro de sshd (journal)',
    "journalctl -q --no-pager -u ssh -u sshd -n 400 2>/dev/null",
    { needsRoot: true, profiles: ['quick', 'full'], volatility: 6 }
  ),
  def(
    'logs.journal', 'logs', 'Journal (avisos y errores, 3 días)',
    "journalctl -q --no-pager --since '-3 days' -p warning -n 400 2>/dev/null",
    { needsRoot: true, profiles: ['full'], volatility: 6 }
  ),
  def(
    'logs.history', 'logs', 'Historiales de shell',
    'for f in /root/.bash_history /root/.zsh_history /home/*/.bash_history /home/*/.zsh_history; do [ -f "$f" ] && { echo "### $f"; ls -l --time-style=full-iso "$f"; tail -n 300 "$f"; }; done',
    { needsRoot: true, volatility: 6 }
  ),
  def(
    'logs.tamper', 'logs', 'Integridad de ficheros de log',
    "ls -l --time-style=full-iso /var/log/wtmp /var/log/btmp /var/log/lastlog /var/log/auth.log /var/log/secure /var/log/syslog /var/log/messages 2>/dev/null; echo '---'; find /var/log -maxdepth 2 \\( -type l -o -size 0 \\) -printf '%p\\t%y\\t%s\\t%l\\n' 2>/dev/null | head -n 60",
    { volatility: 6 }
  ),

  // --- Paquetes / contenedores ---
  def(
    'pkg.recent', 'packages', 'Paquetes instalados recientemente',
    "grep -h ' install ' /var/log/dpkg.log /var/log/dpkg.log.1 2>/dev/null | sort | tail -n 80; rpm -qa --last 2>/dev/null | head -n 80",
    { volatility: 7 }
  ),
  def(
    'pkg.verify', 'packages', 'Verificación de integridad de paquetes',
    "debsums -c 2>/dev/null | head -n 100; rpm -Va 2>/dev/null | grep -E '^..5' | head -n 100",
    { profiles: ['full'], timeoutMs: 300000, volatility: 7 }
  ),
  def(
    'container.docker', 'containers', 'Contenedores Docker',
    "docker ps -a --no-trunc --format '{{.ID}} {{.Image}} {{.Command}} {{.Status}} {{.Ports}}' 2>/dev/null | head -n 50",
    { volatility: 3 }
  )
];

module.exports = { LINUX_COLLECTORS };
