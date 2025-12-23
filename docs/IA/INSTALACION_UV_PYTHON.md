# Instalación de UV para Servidores MCP Python

Este documento explica cómo instalar y configurar `uv` para ejecutar servidores MCP escritos en Python.

## ¿Qué es UV?

**UV** es un gestor de paquetes y entorno Python ultra-rápido, escrito en Rust. Es el equivalente a `npm` pero para Python.

- `uv` = gestor de paquetes (como `npm`)
- `uvx` = ejecutor de paquetes (como `npx`)

## Instalación en Windows

### Método 1: Descarga Directa (Recomendado)

1. **Descarga el instalador** desde [GitHub - Astral UV Releases](https://github.com/astral-sh/uv/releases)
   - Busca `uv-x86_64-pc-windows-msvc.msi`
   - O descarga el archivo `.exe` para tu arquitectura

2. **Ejecuta el instalador**
   - Haz doble clic en el archivo `.msi`
   - Sigue los pasos del instalador
   - Marca "Add to PATH" si te lo pregunta

3. **Verifica la instalación**
   ```powershell
   uv --version
   ```
   Deberías ver algo como: `uv 0.x.x`

### Método 2: Usando Scoop (Si tienes Scoop instalado)

```powershell
scoop install uv
```

### Método 3: Usando Chocolatey

```powershell
choco install uv
```

### Método 4: Descarga Manual desde GitHub

1. Ve a [GitHub Releases](https://github.com/astral-sh/uv/releases)
2. Descarga `uv-x86_64-pc-windows-msvc.zip`
3. Extrae el archivo a una carpeta (ej: `C:\tools\uv`)
4. Añade la carpeta al PATH:
   - Abre "Variables de entorno" (Search → "environment variables")
   - Haz clic en "Path"
   - Añade la ruta de tu carpeta de uv
   - Reinicia PowerShell

## Verificar que Funciona

```powershell
# Verifica que uv está instalado
uv --version

# Verifica que uvx funciona
uvx --version

# Prueba instalando un servidor MCP
uvx cli-mcp-server --help
```

## Configuración en NodeTerm

Una vez instalado `uv`:

1. **Desinstala** el cli-mcp-server actual (si está mal configurado)
2. **Reinstala** cli-mcp-server desde la interfaz
3. Ahora usará `uvx` automáticamente

## Servidores MCP Python Disponibles

Algunos servidores MCP populares en Python:

- **cli-mcp-server** - Ejecutar comandos CLI de forma segura
- **@modelcontextprotocol/server-*** - Servidores oficiales de Anthropic

## Solución de Problemas

### Error: "uvx no se reconoce"

**Problema**: `uv` no está en el PATH

**Solución**:
1. Reinicia PowerShell/CMD después de instalar
2. Verifica la instalación: `uv --version`
3. Si aún no funciona, añade manualmente al PATH:
   ```powershell
   $env:PATH += ";C:\Users\tu_usuario\AppData\Local\uv\bin"
   ```

### Error: "Comando no encontrado"

**Problema**: `uvx` necesita actualizar el índice

**Solución**:
```powershell
# Limpia el caché
uv cache clean

# Intenta de nuevo
uvx cli-mcp-server
```

## Próximos Pasos

Una vez tengas `uv` instalado, podrás:
- ✅ Instalar servidores MCP en Python
- ✅ Ejecutar comandos CLI de forma segura
- ✅ Acceder a más herramientas MCP

Para más información sobre UV, visita [uv.astral.sh](https://uv.astral.sh)

