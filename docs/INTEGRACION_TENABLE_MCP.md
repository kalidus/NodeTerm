# Integración del MCP de Tenable.io en NodeTerm

## 📋 Resumen

Se ha integrado exitosamente el MCP de Tenable.io en NodeTerm. Este servidor permite interactuar con Tenable.io para gestionar activos de seguridad y analizar vulnerabilidades directamente desde el chat de IA.

## 🚀 Guía de Instalación y Configuración

### Paso 1: Obtener Credenciales de Tenable.io

1. Accede a [https://cloud.tenable.com](https://cloud.tenable.com)
2. Inicia sesión con tu cuenta
3. Ve a **Settings** → **My Account** → **API Keys**
4. Haz clic en **Generate** para crear un nuevo par de claves
5. Copia:
   - **Access Key** (TENABLE_ACCESS_KEY)
   - **Secret Key** (TENABLE_SECRET_KEY)
6. Guarda estas credenciales en un lugar seguro

### Paso 2: Instalar el MCP en NodeTerm

#### **Opción A: Instalación Automática (Recomendada)**

1. Abre **NodeTerm**
2. Ve a **Configuración** → pestaña **🔌 MCP Tools**
3. En el **Catálogo**, busca **"Tenable.io"**
4. Haz clic en el botón **"Instalar"** (icono ⬇️)
5. Espera a que se complete la instalación

#### **Opción B: Instalación Manual**

Si necesitas instalar manualmente:

```powershell
# Navega al directorio del MCP
cd C:\Users\kalid\Documents\Cursor\NodeTerm\src\mcp-servers\tenable

# Instala las dependencias
npm install

# El MCP está listo para usar
```

### Paso 3: Configurar Credenciales

1. En **Configuración** → **🔌 MCP Tools**
2. En la sección **MCPs Instalados**, busca **"Tenable.io"**
3. Haz clic en el botón ⚙️ (Configurar)
4. Se abrirá un diálogo con dos campos:
   - **TENABLE_ACCESS_KEY**: Pega la Access Key que obtuviste
   - **TENABLE_SECRET_KEY**: Pega la Secret Key que obtuviste
5. Haz clic en **"Guardar"**

### Paso 4: Habilitar el MCP

1. En **Configuración** → **🔌 MCP Tools**
2. Busca **"Tenable.io"** en la lista
3. Haz clic en el switch 🟢 para **habilitarlo**
4. Opcionalmente, marca **"Autostart"** para iniciarlo automáticamente

### Paso 5: Validar la Conexión

1. Ve a la pestaña **💬 Chat**
2. En el campo de mensaje, escribe:
   ```
   Obtén la lista de activos de Tenable.io
   ```
3. La IA usará automáticamente el MCP para ejecutar `get_assets`
4. Si ves resultados de activos, ¡está funcionando! ✅

---

## 🛠️ Herramientas Disponibles

El MCP de Tenable.io proporciona 4 herramientas que la IA puede usar automáticamente:

### 1. **get_assets**
- **Descripción**: Listar activos del sistema
- **Parámetros**:
  - `limit`: Número máximo de activos (1-1000, default: 50)
  - `offset`: Número de activos a saltar para paginación (default: 0)
- **Ejemplo de uso**: "Muestra los primeros 100 activos de Tenable"

### 2. **get_asset_details**
- **Descripción**: Obtener detalles completos de un activo específico
- **Parámetros**:
  - `asset_id`: ID o UUID del activo (REQUERIDO)
- **Ejemplo de uso**: "Dame los detalles del activo 12345678-1234-1234-1234-123456789abc"

### 3. **search_assets**
- **Descripción**: Buscar activos por hostname, IP u otros criterios
- **Parámetros**:
  - `search_term`: El término de búsqueda (REQUERIDO)
  - `limit`: Resultados máximos (default: 50)
- **Ejemplo de uso**: "Busca todos los activos con hostname 'web-server'"

### 4. **get_asset_vulnerabilities**
- **Descripción**: Obtener vulnerabilidades de un activo específico
- **Parámetros**:
  - `asset_id`: ID del activo (REQUERIDO)
  - `severity`: Filtrar por severidad: critical, high, medium, low, info (opcional)
  - `limit`: Máximo de vulnerabilidades (default: 100)
- **Ejemplo de uso**: "Muestra todas las vulnerabilidades críticas del activo XYZ"

---

## 💡 Casos de Uso Comunes

### 1. Auditoría de Seguridad Rápida
```
"Necesito hacer una auditoría de seguridad. Obtén todos los activos 
con severidad crítica y resume los hallazgos principales."
```

### 2. Búsqueda de Activos Específicos
```
"¿Cuál es la dirección IP y el estado de seguridad del activo 'database-prod'?"
```

### 3. Análisis de Vulnerabilidades
```
"Lista todas las vulnerabilidades altas y críticas en los servidores web."
```

### 4. Generación de Reportes
```
"Crea un reporte detallado de todos los activos y sus vulnerabilidades asociadas."
```

---

## ⚙️ Configuración Avanzada

### Cambiar Credenciales

Si necesitas cambiar tus credenciales de Tenable.io:

1. Ve a **Configuración** → **🔌 MCP Tools**
2. Busca **"Tenable.io"** 
3. Haz clic en ⚙️ y reemplaza las credenciales
4. Haz clic en **"Guardar"**

### Desabilitar Temporalmente

Para desabilitar el MCP sin borrarlo:

1. En **Configuración** → **🔌 MCP Tools**
2. Haz clic en el switch 🔴 junto a "Tenable.io"

### Desinstalar

Para eliminar completamente el MCP:

1. En **Configuración** → **🔌 MCP Tools**
2. Busca "Tenable.io"
3. Haz clic en el botón 🗑️ (Eliminar)

---

## 🔒 Seguridad

### Almacenamiento de Credenciales

- Las credenciales se almacenan **encriptadas** en `mcp-config.json`
- **Nunca** se guardan en texto plano
- **Nunca** se transmiten a través de conexiones no seguras
- Solo se envían a `cloud.tenable.com` via HTTPS

### Mejores Prácticas

1. ✅ Usa **credenciales específicas** para NodeTerm (no tu cuenta principal)
2. ✅ **Limita los permisos** de la API Key en Tenable.io si es posible
3. ✅ **Revoca** las credenciales si crees que están comprometidas
4. ✅ **No compartas** tus archivos de configuración con terceros
5. ✅ **Mantén actualizado** NodeTerm para recibir parches de seguridad

---

## 🐛 Solución de Problemas

### Problema: "Error: No puede conectar a Tenable.io"

**Posible causa 1**: Credenciales incorrectas
- Verifica que hayas copiado correctamente Access Key y Secret Key
- Prueba con credenciales nuevas desde cloud.tenable.com

**Posible causa 2**: Red/Firewall
- Verifica que tu conexión a internet funciona
- Si usas VPN o proxy, puede estar bloqueando la conexión a cloud.tenable.com

**Posible causa 3**: API Key expirada o revocada
- Accede a Tenable.io y verifica que la API Key sigue siendo válida

### Problema: "El MCP no aparece en el catálogo"

- Reinicia NodeTerm
- Limpia la caché: elimina `mcp-config.json` y reinicia

### Problema: "Las herramientas no se ejecutan"

- Verifica que el MCP está **habilitado** (switch 🟢)
- En el chat, prueba manualmente: "Usa la herramienta get_assets de Tenable"

### Problema: "Resultados vacíos"

- Verifica que tienes activos configurados en Tenable.io
- Comprueba que las credenciales tienen permisos de lectura en Tenable.io

---

## 📊 Limitaciones Conocidas

1. **Rate Limiting**: Tenable.io tiene un límite de ~100 requests/minuto
2. **Resultados Máximos**: Cada request devuelve máximo 1000 resultados
3. **Timeout**: Las operaciones tienen un timeout de 30 segundos
4. **Requiere Internet**: Necesita conexión a cloud.tenable.com

---

## 🔗 Referencias

- [Tenable.io API Docs](https://developer.tenable.com/reference/navigate)
- [MCP Protocol Specification](https://modelcontextprotocol.io/)
- [NodeTerm GitHub](https://github.com/kalidus/NodeTerm)

---

## 📝 Notas

- El MCP se ejecuta en el mismo proceso que NodeTerm
- Los datos se procesan localmente (no se almacenan en servidores intermedios)
- Las auditorías se registran en los logs de Tenable.io

---

**Versión**: 1.0  
**Última actualización**: 10 de Noviembre de 2025  
**Estado**: ✅ En producción


