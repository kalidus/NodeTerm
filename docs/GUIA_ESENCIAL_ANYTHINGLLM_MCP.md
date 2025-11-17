# 📚 Guía Esencial: MCP Filesystem en AnythingLLM

## ⚠️ REGLA CRÍTICA: Siempre usar rutas ABSOLUTAS

El modelo **DEBE** usar siempre rutas absolutas comenzando con `/mnt/host/documents`.

### ✅ Ejemplos CORRECTOS

```
Crea un archivo en /mnt/host/documents/test.txt con el contenido "Hola mundo"
Lista los archivos en /mnt/host/documents
Lee el contenido de /mnt/host/documents/mi-archivo.txt
```

### ❌ Ejemplos INCORRECTOS (NO funcionarán)

```
Crea un archivo test.txt  ❌ (ruta relativa - NO funciona)
Lista archivos en .  ❌ (ruta relativa - NO funciona)
Lee ./mi-archivo.txt  ❌ (ruta relativa - NO funciona)
```

**REGLAS:**
1. SIEMPRE comienza la ruta con `/mnt/host/documents`
2. NUNCA uses rutas relativas
3. Si el usuario dice "crea test.txt", usa `/mnt/host/documents/test.txt`
4. Si el usuario dice "lista archivos", usa `/mnt/host/documents` como path

---

## ⚙️ Activación en AnythingLLM

1. Ve a **AnythingLLM** → Tu workspace
2. Ve a **"Agent Skills"** → **"MCP Servers"**
3. Haz clic en **"Refresh"** para recargar la configuración
4. Verifica que **"Filesystem"** aparezca como **"Running"** (🟢)

---

## 🔍 Solución de Problemas

### Error "Access denied - path outside allowed directories"

**Causa**: El modelo está usando una ruta relativa.

**Solución**: Usa siempre rutas absolutas: `/mnt/host/documents/archivo.txt` (NO `archivo.txt`)

### El servidor MCP no aparece

1. En AnythingLLM: "Agent Skills" → "MCP Servers" → "Refresh"
2. Reinicia el contenedor: `docker restart nodeterm-anythingllm`

### El modelo no sigue las instrucciones

Añade al System Prompt del workspace:
```
IMPORTANTE: Para todas las operaciones de archivos, usa SIEMPRE rutas absolutas 
comenzando con /mnt/host/documents. Ejemplo: /mnt/host/documents/archivo.txt
```

---

## 📝 Configuración Técnica

**Mapeo Docker:**
```
Host: C:\Users\kalid\Documents → Container: /mnt/host/documents
```

**Archivo de configuración:** `/app/server/storage/plugins/anythingllm_mcp_servers.json`




