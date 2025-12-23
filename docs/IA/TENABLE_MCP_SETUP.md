# 🔒 Tenable.io MCP - Guía Completa de Instalación y Uso

## 📌 Descripción General

El MCP de Tenable.io permite gestionar activos de seguridad y analizar vulnerabilidades directamente desde el chat de IA en NodeTerm. Se integra de forma automática con el sistema de MCPs existente.

**Estado**: ✅ Completamente implementado y listo para usar

---

## 🚀 Inicio Rápido (5 minutos)

### 1. Obtener Credenciales

1. Accede a [cloud.tenable.com](https://cloud.tenable.com)
2. Inicia sesión en tu cuenta
3. Ve a **Settings** → **My Account** → **API Keys**
4. Haz clic en **Generate** para crear nuevas claves
5. Copia y guarda:
   - **Access Key**
   - **Secret Key**

### 2. Instalar en NodeTerm

1. Abre **NodeTerm**
2. Ve a **Configuración** → **🔌 MCP Tools**
3. En el **Catálogo**, busca **"Tenable.io"**
4. Haz clic en **"Instalar"** (⬇️)
5. Espera a que se complete

### 3. Configurar Credenciales

1. En **🔌 MCP Tools** → **MCPs Instalados**
2. Busca **"Tenable.io"**
3. Haz clic en ⚙️ (Configurar)
4. Ingresa las credenciales:
   - `TENABLE_ACCESS_KEY`: Tu Access Key
   - `TENABLE_SECRET_KEY`: Tu Secret Key
5. Haz clic en **"Guardar"**

### 4. Habilitar

1. En **🔌 MCP Tools**, busca **"Tenable.io"**
2. Haz clic en el switch 🟢 para habilitar
3. (Opcional) Marca **"Autostart"** para iniciar automáticamente

### 5. Probar

1. Ve al **💬 Chat**
2. Escribe: `"Obtén la lista de activos de Tenable.io"`
3. La IA ejecutará automáticamente `get_assets`
4. ✅ Si ves resultados, ¡está funcionando!

---

## 🛠️ Herramientas Disponibles

### **1. get_assets** - Listar Activos
Obtiene la lista de activos configurados en Tenable.io.

**Parámetros:**
- `limit` (opcional): Número de resultados (1-1000, default: 50)
- `offset` (opcional): Para paginación (default: 0)

**Ejemplos:**
```
"Muestra los primeros 100 activos"
"¿Cuántos activos tengo? Muestra los primeros 50"
```

---

### **2. get_asset_details** - Detalles de un Activo
Obtiene información completa de un activo específico.

**Parámetros:**
- `asset_id` ⭐ (REQUERIDO): ID o UUID del activo

**Ejemplos:**
```
"Dame los detalles del activo 12345678-1234-1234-1234-123456789abc"
"¿Cuál es el estado del activo server-prod?"
```

---

### **3. search_assets** - Buscar Activos
Busca activos por hostname, IP u otros criterios.

**Parámetros:**
- `search_term` ⭐ (REQUERIDO): Lo que quieres buscar
- `limit` (opcional): Máximo de resultados (default: 50)

**Ejemplos:**
```
"Busca todos los activos que tengan 'web' en el hostname"
"¿Existe un activo llamado 'database-prod'?"
"Encuentra activos con IP 192.168.1.x"
```

---

### **4. get_asset_vulnerabilities** - Vulnerabilidades
Obtiene vulnerabilidades de un activo específico.

**Parámetros:**
- `asset_id` ⭐ (REQUERIDO): ID del activo
- `severity` (opcional): Filtrar por: critical, high, medium, low, info
- `limit` (opcional): Máximo de vulnerabilidades (default: 100)

**Ejemplos:**
```
"¿Qué vulnerabilidades críticas tiene el activo server-web?"
"Muestra todas las vulnerabilidades altas para el activo XYZ"
"¿Hay vulnerabilidades de severidad crítica o alta?"
```

---

## 💡 Casos de Uso Comunes

### Auditoría de Seguridad Rápida
```
"Necesito una auditoría rápida. Dame:
1. Número total de activos
2. Vulnerabilidades críticas encontradas
3. Activos más afectados"
```

### Búsqueda de Servidor Específico
```
"¿Cuál es el estado del servidor database-prod? 
Incluye detalles y vulnerabilidades."
```

### Análisis de Vulnerabilidades
```
"Lista todos los activos con vulnerabilidades críticas
y agrúpalos por severidad"
```

### Inventario Completo
```
"Dame un reporte completo:
- Número total de activos
- Listado de todos
- Resumen de vulnerabilidades por activo"
```

---

## 🔒 Seguridad

### Almacenamiento de Credenciales
- ✅ Credenciales **encriptadas** en `mcp-config.json`
- ✅ **NUNCA** en texto plano
- ✅ **NUNCA** compartidas en logs
- ✅ Solo transmitidas vía **HTTPS** a cloud.tenable.com

### Mejores Prácticas
1. Usa **credenciales específicas para NodeTerm** (no la cuenta principal)
2. Limita los **permisos** de la API Key si es posible
3. Revoca las credenciales si crees que están comprometidas
4. **No compartas** archivos de configuración
5. Mantén NodeTerm actualizado

---

## ⚙️ Configuración Avanzada

### Cambiar Credenciales
1. Ve a **Configuración** → **🔌 MCP Tools**
2. Busca **"Tenable.io"** → ⚙️
3. Reemplaza las credenciales
4. Haz clic en **"Guardar"**

### Desabilitar Temporalmente
1. **Configuración** → **🔌 MCP Tools**
2. Haz clic en el switch 🔴 junto a "Tenable.io"

### Desinstalar
1. **Configuración** → **🔌 MCP Tools**
2. Busca "Tenable.io" → 🗑️

---

## 🐛 Solución de Problemas

### "Error: No puede conectar a Tenable.io"

**Causa 1**: Credenciales incorrectas
- Verifica que hayas copiado correctamente en cloud.tenable.com
- Prueba con credenciales nuevas

**Causa 2**: Problema de red
- Verifica tu conexión a Internet
- Si usas VPN/proxy, puede estar bloqueando cloud.tenable.com

**Causa 3**: API Key expirada
- Accede a Tenable.io y verifica que la API Key sea válida

---

### "El MCP no aparece en el catálogo"
- Reinicia NodeTerm
- Limpia caché: Elimina `mcp-config.json` y reinicia

---

### "Las herramientas no se ejecutan"
- Verifica que el switch esté 🟢 (habilitado)
- Prueba en chat: `"Usa la herramienta get_assets de Tenable"`

---

### "Resultados vacíos"
- Verifica que tienes activos en Tenable.io
- Comprueba que las credenciales tienen permisos de lectura

---

## 📊 Limitaciones Técnicas

| Limitación | Valor |
|---|---|
| Rate limiting | ~100 requests/minuto (Tenable.io) |
| Resultados máximos | 1000 por request |
| Timeout de operación | 30 segundos |
| Requiere | Conexión a Internet |

---

## 📦 Archivos del Proyecto

### Estructura
```
src/mcp-servers/tenable/
├── package.json           # Dependencias
├── index.js              # Servidor MCP (650+ líneas)
├── README.md             # Documentación técnica
└── INSTALACION.md        # Guía técnica detallada
```

### Integración
- **Catálogo**: `src/data/mcp-catalog.json` (entrada tenable)
- **Categoría**: Nueva categoría "security" agregada
- **Configuración**: Manejo automático en `MCPManagerTab`

---

## 🔗 Referencias

- [Tenable.io API Docs](https://developer.tenable.com/reference/navigate)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [NodeTerm GitHub](https://github.com/kalidus/NodeTerm)

---

## ✨ Estado del Proyecto

**Versión**: 1.0  
**Última actualización**: 10 de Noviembre de 2025  
**Estado**: ✅ Producción  
**Licencia**: MIT

### Implementado ✅
- 4 herramientas completamente funcionales
- Integración automática con NodeTerm
- Almacenamiento encriptado de credenciales
- Manejo robusto de errores
- Documentación completa

### Próximas mejoras (opcional)
- Caché de resultados
- Exportación de reportes
- Historial de escaneos
- Actualización automática de propiedades

---

## 📝 Notas

- El MCP se ejecuta en el mismo proceso que NodeTerm
- Los datos se procesan localmente (sin almacenamiento intermediario)
- Las auditorías se registran en los logs de Tenable.io
- Compatible con todos los navegadores modernos que soportan Electron


