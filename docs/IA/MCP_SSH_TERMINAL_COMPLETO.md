# 🚀 MCP SSH/Terminal - Guía Completa

**Versión:** 2.0  
**Fecha:** 2025-11-11  
**Estado:** ✅ Producción

---

## 📋 Índice

1. [¿Qué es?](#qué-es)
2. [Características](#características)
3. [Instalación](#instalación)
4. [Configuración](#configuración)
5. [Uso Básico](#uso-básico)
6. [Cómo Funciona](#cómo-funciona)
7. [Ejemplos](#ejemplos)
8. [Troubleshooting](#troubleshooting)
9. [Changelog](#changelog)

---

## 🎯 ¿Qué es?

MCP **SSH/Terminal** es un servidor MCP nativo que permite a los modelos de IA (Ollama, OpenAI, Claude) ejecutar comandos:
- **Localmente:** WSL, Ubuntu, Kali Linux, Cygwin, PowerShell
- **Remotamente:** Servidores SSH

### **Ventajas:**
- ✅ **Auto-detección inteligente** - detecta si el comando es Linux o Windows
- ✅ **Integración con NodeTerm** - usa conexiones SSH existentes
- ✅ **Seguro** - whitelist de comandos y directorios
- ✅ **Pool de conexiones** - reutiliza conexiones SSH

---

## ⚡ Características

### **Ejecución Local:**
- Auto-detección de tipo de comando
- Priorización: Ubuntu → Kali → WSL genérico → Cygwin → PowerShell
- Soporte para distribuciones WSL específicas
- Captura de stdout + stderr

### **Ejecución SSH:**
- Pool de conexiones reutilizables
- Timeout configurable
- Autenticación por password o clave privada
- Integración automática con conexiones de NodeTerm

### **Seguridad:**
- Whitelist de comandos permitidos
- Restricción de directorio base
- Timeout por comando (default: 30s)

---

## 📦 Instalación

El MCP ssh-terminal viene **preinstalado** en NodeTerm como MCP nativo.

### **Activación:**

1. **Abrir Configuración:**
   - AI Chat → ⚙️ Configuración → Pestaña "MCP Tools"

2. **Activar ssh-terminal:**
   - Buscar "SSH/Terminal"
   - Toggle "Enabled" ✅

3. **Configurar (opcional):**
   - Click en ⚙️ junto a "SSH/Terminal"
   - Configurar terminal preferido, directorios, comandos

---

## ⚙️ Configuración

### **Opciones Disponibles:**

| Opción | Descripción | Default |
|--------|-------------|---------|
| `preferredTerminal` | Terminal por defecto para comandos locales | `wsl` |
| `allowedDir` | Directorio base permitido (vacío = sin restricción) | `""` |
| `allowedCommands` | Comandos permitidos separados por coma (o "all") | `all` |
| `commandTimeout` | Timeout en segundos | `30` |
| `sshConnections` | Lista de conexiones SSH configuradas | `[]` |

### **Ejemplo de Configuración:**

```json
{
  "preferredTerminal": "ubuntu",
  "allowedDir": "C:\\Users\\kalid\\Documents",
  "allowedCommands": "ls,cat,grep,pwd,cd,find,nc,curl,wget",
  "commandTimeout": 60,
  "sshConnections": []
}
```

### **Terminal Preferido:**

**UI Inteligente:**
- Al abrir la configuración de ssh-terminal, el sistema **detecta automáticamente** las terminales instaladas
- El dropdown muestra **solo terminales realmente disponibles** en tu sistema
- Iconos visuales: 🐧 WSL, 🔵 Cygwin, ⚡ PowerShell
- La terminal configurada como preferida se marca con ⭐

**Opciones típicas:**
- Distribuciones WSL detectadas: `ubuntu-24.04`, `kali-linux`, `debian`, etc.
- `wsl` - WSL genérico (usa la distribución por defecto)
- `cygwin` - Cygwin (si está instalado)
- `powershell` - PowerShell (siempre disponible en Windows)

⚠️ **Nota:** Si el terminal preferido no está disponible, el sistema hace fallback automático.

---

## 🚀 Uso Básico

### **En el AI Chat:**

```
Usuario: ejecuta ls -la
IA: [llama execute_local]
Resultado: ✅ Ejecutado en local:wsl:Ubuntu
          [archivos listados]
```

### **Flujo Automático:**

1. Usuario escribe comando en lenguaje natural
2. Modelo detecta necesidad de usar `execute_local`
3. Sistema auto-detecta tipo de comando (Linux/Windows)
4. Ejecuta en terminal apropiado
5. Devuelve resultado al modelo
6. Modelo genera respuesta natural

---

## 🔧 Cómo Funciona

### **Auto-detección de Comandos:**

```javascript
Comando: "ls -la"
→ Detectado como: Linux
→ Terminal usado: Ubuntu

Comando: "Get-Process"
→ Detectado como: Windows
→ Terminal usado: PowerShell
```

### **Prioridad de Terminales (Linux):**

1. Terminal preferido (si está disponible)
2. Ubuntu (si está instalado)
3. Primera distribución WSL disponible
4. Cygwin (solo si no hay WSL)

### **Integración con Modelos:**

El sistema inyecta las tools en el system prompt:

```
HERRAMIENTAS DISPONIBLES:

[ssh-terminal]
execute_local(command,workingDir?) - Ejecuta comandos en la terminal local. 
Comandos Linux (ls, cat, pwd) se ejecutan en WSL/Ubuntu. 
Comandos Windows (Get-Process, dir) se ejecutan en PowerShell. 
La detección es automática.
  {"tool":"ssh-terminal__execute_local","arguments":{"command":"ls"}}

list_terminals() - Lista las terminales locales disponibles
  {"tool":"ssh-terminal__list_terminals","arguments":{}}

execute_ssh(hostId,command) - Ejecuta un comando en un servidor remoto por SSH
  {"tool":"ssh-terminal__execute_ssh","arguments":{"hostId":"server1","command":"ls"}}

search_nodeterm(query?) - ✅ HERRAMIENTA PRINCIPAL - Búsqueda inteligente de SSH hosts y credenciales. Si query está vacío, lista TODOS los servidores SSH. Si tiene contenido, busca en SSH hosts y contraseñas.
  {"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"Kepler"}}
  {"tool":"ssh-terminal__search_nodeterm","arguments":{}}  // Lista todos los SSH hosts
```

---

## 💡 Ejemplos

### **Ejemplo 1: Comando Linux Simple**

```
Usuario: lista los archivos del directorio actual

IA llama: execute_local({command: "ls -la"})

Resultado:
✅ Ejecutado en local:wsl:Ubuntu

total 256
drwxr-xr-x  12 kalid  kalid   4096 Nov 11 10:30 .
drwxr-xr-x   5 kalid  kalid   4096 Nov 10 08:15 ..
-rw-r--r--   1 kalid  kalid    156 Nov 11 10:25 README.md
...
```

### **Ejemplo 2: Comando de Red**

```
Usuario: verifica si el puerto 443 está abierto en 192.168.10.10

IA llama: execute_local({command: "nc -vz 192.168.10.10 443"})

Resultado:
✅ Ejecutado en local:wsl:Ubuntu

Connection to 192.168.10.10 443 port [tcp/https] succeeded!
```

### **Ejemplo 3: Comando Windows**

```
Usuario: muéstrame los procesos de Windows

IA llama: execute_local({command: "Get-Process | Select-Object -First 5"})

Resultado:
✅ Ejecutado en local:powershell

Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName
-------  ------    -----      -----     ------     --  -- -----------
   1234      56   12345      23456      12.34   1234   1 chrome
...
```

### **Ejemplo 4: Terminal Específico**

```
Usuario: ejecuta ls en Kali Linux

IA llama: list_terminals() → detecta kali-linux
IA llama: execute_local({command: "ls"})  [con terminal=kali-linux inferido]

Resultado:
✅ Ejecutado en local:wsl:kali-linux

file1.txt
file2.sh
...
```

### **Ejemplo 5: SSH Remoto**

```
Usuario: ¿qué servidores SSH tengo?

IA llama: search_nodeterm({})  // Sin query lista todos

Resultado:
✅ 2 conexiones SSH disponibles

1. mi-servidor [🔗 NodeTerm]
   🔑 ID: `ssh:192.168.1.100:admin:22`
   📍 Host: 192.168.1.100:22
   👤 Usuario: admin
   ⚡ Estado: disconnected

2. servidor-test [⚙️ MCP]
   🔑 ID: `ssh:test.com:user:2222`
   📍 Host: test.com:2222
   👤 Usuario: user
   ⚡ Estado: disconnected

---

Usuario: ejecuta uptime en mi-servidor

IA llama: execute_ssh({hostId: "mi-servidor", command: "uptime"})

Resultado:
✅ Ejecutado en ssh:mi-servidor

10:30:45 up 15 days, 3:20, 2 users, load average: 0.15, 0.10, 0.05
```

---

## 🔍 Troubleshooting

### **Problema: "Terminal no disponible"**

**Error:**
```
❌ Terminal preferido "cygwin" no disponible
```

**Solución:**
1. Verificar qué terminales están instalados:
   ```
   ¿qué terminales tengo instaladas?
   ```
2. Cambiar `preferredTerminal` a uno disponible
3. O instalar el terminal faltante (WSL/Cygwin)

---

### **Problema: "Comando no permitido"**

**Error:**
```
❌ Comando no permitido: "rm -rf". Ver show_security_rules para comandos permitidos.
```

**Solución:**
1. Ver reglas actuales:
   ```
   ¿qué comandos están permitidos?
   ```
2. Modificar `allowedCommands` en configuración:
   - Cambiar a `all` para permitir todos
   - O agregar comando específico: `ls,cat,grep,rm`

---

### **Problema: "(sin output)" cuando debería haber resultado**

**Causa:** SOLUCIONADO ✅

El sistema ahora captura stdout + stderr. Comandos como `nc -vz`, `curl -v` funcionan correctamente.

---

### **Problema: Timeout**

**Error:**
```
❌ Timeout después de 30s
```

**Solución:**
1. Aumentar `commandTimeout` en configuración
2. O dividir el comando en pasos más pequeños

---

### **Problema: SSH no conecta**

**Error:**
```
❌ Host SSH no configurado: "servidor1"
```

**Solución:**
1. Verificar servidores disponibles:
   ```
   lista los servidores SSH
   ```
2. Agregar conexión SSH en:
   - Configuración → MCP Tools → SSH/Terminal → + Agregar Conexión SSH
3. O usar conexiones de NodeTerm (se detectan automáticamente)

---

## 📊 Changelog

### **v2.0 - 2025-11-11**

#### ✅ **Mejoras de Output:**
- **Fix:** Combinación de stdout + stderr
  - Comandos como `nc -vz`, `curl -v` ahora muestran output completo
- **Fix:** Exit Code solo se muestra en errores
  - Output más limpio: `✅ Ejecutado en local:wsl:Ubuntu`
- **Fix:** Labels descriptivos siempre muestran distro específica
  - Cuando `preferredTerminal = 'wsl'`, ahora elige Ubuntu automáticamente
  - Siempre muestra: `local:wsl:Ubuntu` en lugar de solo `local:wsl`

#### ✅ **Auto-detección Inteligente:**
- Eliminado parámetro `terminal` de `execute_local`
- Auto-detección SIEMPRE activa
- Fallback inteligente si terminal preferido no disponible
- Priorización correcta: Ubuntu → WSL → Cygwin
- **Mapeo automático de variantes:** Si eliges "ubuntu" pero solo tienes "ubuntu-24.04", lo mapea automáticamente
- Respeta EXACTAMENTE el `preferredTerminal` configurado en la UI
- Ejecuta comandos con `wsl -d <distro>` cuando se especifica una distribución
- Output limpio: sin logs de profile o archivos de configuración
- Soporta WSL, Cygwin (embebido o del sistema) y PowerShell

#### ✅ **UI de Configuración Mejorada:**
- Dropdown de terminales detecta automáticamente las instaladas
- Solo muestra terminales realmente disponibles
- Iconos visuales por tipo (🐧 WSL, 🔵 Cygwin, ⚡ PowerShell)
- Marca la terminal preferida con ⭐
- Si el MCP no está corriendo, se inicia temporalmente para detectar terminales y se detiene después
- Parsing correcto del JSON devuelto por `list_terminals` (desde `result.result.content[0].text`)

#### ✅ **Cygwin Embebido:**
- Detecta automáticamente Cygwin embebido en `resources/cygwin64/` (integrado en NodeTerm)
- Fallback a instalación del sistema en `C:\cygwin64\`
- No requiere instalación adicional si Cygwin está integrado en el proyecto
- Método `detectCygwinPath()` busca en ambas ubicaciones

**Para crear Cygwin embebido:**
```powershell
# En PowerShell (desde la raíz del proyecto)
.\scripts\create-cygwin-portable.ps1

# O con opciones específicas:
.\scripts\create-cygwin-portable.ps1 -NoUltraComplete   # Versión completa (~200MB)
.\scripts\create-cygwin-portable.ps1 -Minimal            # Versión mínima (~50MB)
```

Esto creará `resources/cygwin64/` con Cygwin integrado en el proyecto.

#### ✅ **Integración con NodeTerm:**
- Conexiones SSH detectadas automáticamente desde NodeTerm
- No necesita duplicar configuración
- UI muestra origen: `[🔗 NodeTerm]` vs `[⚙️ MCP]`

#### ✅ **Simplificación de Tools:**
- Descripciones más cortas y claras
- Sin parámetros confusos
- System prompt mejorado (sin truncamiento)

#### ✅ **Configuración Persistente:**
- Fix: Config se guarda correctamente para MCPs nativos
- Fix: `allowedDir`, `allowedCommands`, etc. persisten

---

### **v1.0 - 2025-11-10**

#### ✅ **Implementación Inicial:**
- MCP nativo para ejecución local y SSH
- Auto-detección de distribuciones WSL
- Pool de conexiones SSH
- Validación de seguridad
- UI de configuración en MCPManagerTab

---

## 📁 Archivos del Sistema

| Archivo | Propósito |
|---------|-----------|
| `src/main/services/native/SSHTerminalNativeServer.js` | Implementación del MCP |
| `src/main/services/MCPService.js` | Gestor de MCPs (registro de factory) |
| `src/data/mcp-catalog.json` | Catálogo de MCPs disponibles |
| `src/components/MCPManagerTab.js` | UI de gestión de MCPs |
| `docs/MCP_SSH_TERMINAL_COMPLETO.md` | Esta guía |

---

## 🎓 Para Desarrolladores

### **Estructura del Código:**

```javascript
class SSHTerminalNativeServer {
  // Constructor - inicializar config
  constructor(config) {
    this.allowedDir = config.allowedDir;
    this.allowedCommands = config.allowedCommands;
    this.preferredTerminal = config.preferredTerminal;
    // ...
  }

  // Handler principal
  async handleRequest(method, params) {
    switch (method) {
      case 'tools/list': return this.handleToolsList();
      case 'tools/call': return this.handleToolsCall(params);
      // ...
    }
  }

  // Ejecutar comando local
  async executeLocal(args) {
    const commandType = this.detectCommandType(command);
    const targetTerminal = this.selectTerminal(commandType);
    const result = await this.executeInWSL(command, workingDir, distroName);
    return this.formatCommandResult(result, `local:${displayLabel}`);
  }

  // Auto-detección de tipo de comando
  detectCommandType(command) {
    const baseCommand = command.trim().split(/\s+/)[0].toLowerCase();
    const linuxCommands = ['ls', 'cat', 'grep', ...];
    const windowsCommands = ['get-', 'set-', ...];
    return linuxCommands.includes(baseCommand) ? 'linux' : 'windows';
  }
}
```

### **Agregar Nuevo Comando Permitido:**

```javascript
// En configuración:
allowedCommands: "ls,cat,grep,pwd,find,MI_COMANDO_NUEVO"
```

### **Extender Detección de Comandos:**

```javascript
// En detectCommandType():
const linuxCommands = [
  'ls', 'cat', 'grep', 
  'mi_comando_personalizado'  // Agregar aquí
];
```

---

## 🔐 Seguridad

### **Mejores Prácticas:**

1. **Limitar Comandos:**
   ```json
   "allowedCommands": "ls,cat,grep,pwd,find"
   ```

2. **Restringir Directorios:**
   ```json
   "allowedDir": "C:\\Users\\usuario\\Proyectos"
   ```

3. **Timeout Razonable:**
   ```json
   "commandTimeout": 30
   ```

4. **SSH con Claves:**
   - Preferir autenticación por clave privada
   - No usar contraseñas débiles

---

## 📚 Referencias

- **MCP Specification:** https://modelcontextprotocol.io
- **NodeTerm Docs:** /docs
- **WSL Docs:** https://docs.microsoft.com/en-us/windows/wsl

---

## 🎉 Resumen

El MCP SSH/Terminal es la forma más fácil de dar a los modelos de IA acceso a la terminal:

1. ✅ **Auto-detección** - no necesitas especificar qué terminal usar
2. ✅ **Integrado** - usa conexiones SSH de NodeTerm
3. ✅ **Seguro** - controla qué comandos pueden ejecutarse
4. ✅ **Flexible** - soporta WSL, Cygwin, PowerShell y SSH

**Para empezar:**
1. Activar en: Configuración → MCP Tools → SSH/Terminal
2. En AI Chat: "ejecuta ls" o "verifica puerto 443 en 192.168.10.10"
3. ¡Listo! 🚀

---

**Autor:** Claude AI  
**Mantenedor:** NodeTerm Team  
**Última Actualización:** 2025-11-11

---

## Nota: inyeccion segura de secretos (NodeTerm MCP HTTP / nodeterm-mcp)

Esta guia describe el MCP nativo SSH/Terminal. El cliente externo **nodeterm-mcp** (API local de NodeTerm) añade desde v1.4.0:

- `list_passwords`: solo metadata (no secretos en claro).
- `inject_secret`: requiere `promptTicket` (un solo uso, TTL 60s) emitido por `wait_terminal_pattern` tras un comando allowlist (sudo/git/mysql/...).
- Gate de prompt + correlacion de comando + rate limit. El valor nunca vuelve al agente.
- Flujo: comando -> wait (leer `promptTicket`) -> `inject_secret(promptTicket,...)` -> continuar.


