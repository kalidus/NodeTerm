# 💡 Ejemplos Prácticos - MCP SSH/Terminal

## 📚 Índice
1. [Comandos Locales WSL](#comandos-locales-wsl)
2. [Comandos PowerShell](#comandos-powershell)
3. [Comandos SSH Remotos](#comandos-ssh-remotos)
4. [Casos de Uso Reales](#casos-de-uso-reales)

---

## 🐧 Comandos Locales WSL

### Ejemplo 1: Listar archivos
**Pregunta al chat:**
```
Lista los archivos en mi directorio home usando WSL
```

**Lo que hace la IA:**
```javascript
// Tool: execute_local
{
  "command": "ls -la ~",
  "terminal": "wsl"
}
```

**Resultado esperado:**
```
🖥️ Comando ejecutado en: local:wsl
📊 Exit Code: 0

✅ Resultado:
drwxr-xr-x 1 kalid kalid  512 Nov 11 10:00 .
drwxr-xr-x 1 root  root   512 Oct  1 12:00 ..
-rw-r--r-- 1 kalid kalid 3771 Nov  5 14:30 .bashrc
drwxr-xr-x 1 kalid kalid  512 Nov 10 09:15 Documents
drwxr-xr-x 1 kalid kalid  512 Nov  9 16:20 Downloads
```

### Ejemplo 2: Espacio en disco
**Pregunta:**
```
¿Cuánto espacio libre tengo en el disco? (usa WSL)
```

**Tool call:**
```javascript
{
  "command": "df -h",
  "terminal": "wsl"
}
```

**Resultado:**
```
🖥️ Comando ejecutado en: local:wsl
📊 Exit Code: 0

✅ Resultado:
Filesystem      Size  Used Avail Use% Mounted on
/dev/sdc       251G   45G  194G  19% /
tmpfs          7.8G     0  7.8G   0% /mnt/wsl
C:\            476G  220G  256G  47% /mnt/c
```

### Ejemplo 3: Procesos activos
**Pregunta:**
```
Muéstrame los procesos que están consumiendo más memoria en WSL
```

**Tool call:**
```javascript
{
  "command": "ps aux --sort=-%mem | head -10",
  "terminal": "wsl"
}
```

---

## ⚡ Comandos PowerShell

### Ejemplo 1: Información del sistema
**Pregunta:**
```
Dame información del sistema Windows con PowerShell
```

**Tool call:**
```javascript
{
  "command": "Get-ComputerInfo | Select-Object CsName, OsArchitecture, OsTotalVisibleMemorySize",
  "terminal": "powershell"
}
```

**Resultado:**
```
🖥️ Comando ejecutado en: local:powershell
📊 Exit Code: 0

✅ Resultado:
CsName              : DESKTOP-ABC123
OsArchitecture      : 64-bit
OsTotalVisibleMemorySize : 16384000
```

### Ejemplo 2: Listar servicios
**Pregunta:**
```
Lista los servicios de Windows que están corriendo
```

**Tool call:**
```javascript
{
  "command": "Get-Service | Where-Object {$_.Status -eq 'Running'} | Select-Object Name, DisplayName",
  "terminal": "powershell"
}
```

### Ejemplo 3: Archivos recientes
**Pregunta:**
```
Muéstrame los últimos 5 archivos modificados en mis Documentos
```

**Tool call:**
```javascript
{
  "command": "Get-ChildItem C:\\Users\\kalid\\Documents -File | Sort-Object LastWriteTime -Descending | Select-Object -First 5 Name, LastWriteTime",
  "terminal": "powershell"
}
```

---

## 🌐 Comandos SSH Remotos

### Prerequisito: Configurar servidor SSH
1. Ir a MCPManagerTab
2. Agregar conexión SSH:
   - **Nombre:** "Ubuntu Server"
   - **Host:** 192.168.1.100
   - **Usuario:** admin
   - **Password:** ********

### Ejemplo 1: Ver uptime del servidor
**Pregunta:**
```
¿Cuánto tiempo lleva encendido el servidor Ubuntu?
```

**Tool call:**
```javascript
{
  "hostId": "ubuntu-server",
  "command": "uptime"
}
```

**Resultado:**
```
🖥️ Comando ejecutado en: ssh:Ubuntu Server
📊 Exit Code: 0

✅ Resultado:
 14:23:45 up 15 days,  3:15,  2 users,  load average: 0.15, 0.10, 0.08
```

### Ejemplo 2: Ver espacio en disco del servidor
**Pregunta:**
```
Muestra el espacio en disco del servidor Ubuntu
```

**Tool call:**
```javascript
{
  "hostId": "ubuntu-server",
  "command": "df -h"
}
```

### Ejemplo 3: Ver logs recientes
**Pregunta:**
```
Muéstrame las últimas 20 líneas del syslog del servidor
```

**Tool call:**
```javascript
{
  "hostId": "ubuntu-server",
  "command": "tail -20 /var/log/syslog"
}
```

### Ejemplo 4: Monitoreo de CPU
**Pregunta:**
```
¿Cuál es el uso de CPU en el servidor Ubuntu ahora?
```

**Tool call:**
```javascript
{
  "hostId": "ubuntu-server",
  "command": "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'"
}
```

---

## 🎯 Casos de Uso Reales

### Caso 1: Backup de archivos
**Pregunta:**
```
Crea un backup de mi directorio Documents en WSL
```

**Flujo:**
1. IA usa `execute_local` para crear tar.gz
2. Comando: `tar -czf backup_$(date +%Y%m%d).tar.gz ~/Documents`
3. Resultado: Backup creado exitosamente

### Caso 2: Monitoreo de servidor
**Pregunta:**
```
Necesito ver el estado de mi servidor Ubuntu: uptime, espacio en disco y memoria
```

**Flujo:**
1. IA ejecuta 3 comandos SSH secuencialmente:
   - `uptime`
   - `df -h`
   - `free -h`
2. Presenta resultados organizados

### Caso 3: Búsqueda de archivos
**Pregunta:**
```
Busca todos los archivos .log en mi home de WSL
```

**Tool call:**
```javascript
{
  "command": "find ~ -type f -name '*.log' 2>/dev/null",
  "terminal": "wsl"
}
```

### Caso 4: Verificar conectividad
**Pregunta:**
```
¿Puedo conectarme al servidor Ubuntu?
```

**Flujo:**
1. IA usa `test_ssh_connection`
2. Verifica conexión
3. Retorna estado (✅ o ❌)

### Caso 5: Análisis de logs
**Pregunta:**
```
Analiza los errores en el syslog del servidor de las últimas 24 horas
```

**Tool call:**
```javascript
{
  "hostId": "ubuntu-server",
  "command": "grep -i 'error' /var/log/syslog | tail -50"
}
```

---

## 🔒 Ejemplos de Validación de Seguridad

### Ejemplo 1: Comando NO permitido
**Pregunta:**
```
Borra todos los archivos en /tmp usando rm -rf
```

**Resultado:**
```
❌ Error: Comando no permitido: "rm". Ver show_security_rules para comandos permitidos.
```

### Ejemplo 2: Ver reglas activas
**Pregunta:**
```
¿Qué comandos puedo ejecutar?
```

**Tool:** `show_security_rules`

**Resultado:**
```json
{
  "allowedCommands": "ls, cat, grep, find, cd, pwd, echo, mkdir, cp, mv",
  "allowedDirectory": "C:/Users/kalid",
  "commandTimeout": "30 segundos"
}
```

### Ejemplo 3: Directorio NO permitido
**Pregunta:**
```
Lista archivos en C:\Windows\System32
```

**Resultado:**
```
❌ Error: Directorio no permitido: "C:\Windows\System32". 
Debe estar en: C:/Users/kalid
```

---

## 🧪 Preguntas para Testing

### Testing Básico
```
1. "¿Qué terminales tengo disponibles?"
   → Usa: list_terminals

2. "Lista archivos en mi directorio actual con WSL"
   → Usa: execute_local (wsl)

3. "Muéstrame la fecha y hora actual en PowerShell"
   → Usa: execute_local (powershell)
```

### Testing SSH
```
1. "¿Qué servidores SSH tengo configurados?"
   → Usa: list_ssh_hosts

2. "Prueba la conexión al servidor ubuntu-server"
   → Usa: test_ssh_connection

3. "Ejecuta 'hostname' en el servidor ubuntu-server"
   → Usa: execute_ssh
```

### Testing de Seguridad
```
1. "¿Qué reglas de seguridad tengo activas?"
   → Usa: show_security_rules

2. "Ejecuta 'rm -rf /' en WSL"
   → Debe fallar con error de seguridad

3. "Lista archivos en /etc/shadow"
   → Puede fallar por permisos (pero comando permitido)
```

---

## 💡 Tips y Trucos

### Tip 1: Usar "auto" para el terminal
```
"Lista archivos usando el terminal preferido"
→ La IA usará terminal: "auto" (configurado en settings)
```

### Tip 2: Combinar comandos
```
"En WSL, ve a /tmp y muestra los archivos más grandes"
→ command: "cd /tmp && du -sh * | sort -rh | head -10"
```

### Tip 3: Pipes y redirección
```
"Busca procesos de node y guarda en archivo"
→ command: "ps aux | grep node > /tmp/node_processes.txt && cat /tmp/node_processes.txt"
```

### Tip 4: Múltiples servidores SSH
Puedes tener varios servidores configurados:
- ubuntu-server (producción)
- test-server (testing)
- backup-server (backups)

La IA elegirá según el contexto de tu pregunta.

---

## 🎓 Ejercicios Prácticos

### Ejercicio 1: Información del sistema
**Objetivo:** Obtener información completa del sistema

**Pregunta sugerida:**
```
Dame un reporte completo del sistema: OS, memoria, CPU y disco (usa WSL)
```

**Comandos esperados:**
- `uname -a` (OS)
- `free -h` (Memoria)
- `lscpu | grep 'Model name'` (CPU)
- `df -h` (Disco)

### Ejercicio 2: Análisis de logs
**Objetivo:** Buscar errores en logs

**Pregunta sugerida:**
```
Busca los últimos errores en los logs del servidor ubuntu-server
```

### Ejercicio 3: Backup automatizado
**Objetivo:** Crear script de backup

**Pregunta sugerida:**
```
Crea un backup comprimido de mi directorio proyectos con fecha actual
```

---

## 📞 Preguntas Frecuentes

### ¿Puedo ejecutar comandos interactivos?
**No.** El MCP está diseñado para comandos no interactivos. 
Comandos como `vim`, `nano`, `top` (sin -b) NO funcionarán.

### ¿Puedo usar sudo?
**Sí**, si está en `allowedCommands` y el usuario tiene permisos.
Ejemplo: `sudo systemctl status nginx`

### ¿Cuánto tiempo puedo esperar?
Por defecto **30 segundos**. Si necesitas más, aumenta `commandTimeout`.

### ¿Las contraseñas SSH están seguras?
**Sí**, se guardan encriptadas con AES-256 usando el sistema de NodeTerm.

### ¿Puedo usar múltiples comandos?
**Sí**, con `&&` o `;`:
```
"cd /tmp && ls -la && pwd"
```

---

**🎉 ¡Ahora ya sabes cómo usar el MCP SSH/Terminal!**

**Próximo paso:** Abre NodeTerm y empieza a probar los ejemplos 🚀

