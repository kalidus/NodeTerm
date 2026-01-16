# 📦 Sistema de Exportación/Importación de NodeTerm

## ✅ IMPLEMENTACIÓN COMPLETA

Sistema completo para exportar e importar **TODOS** los datos de NodeTerm en un archivo encriptado `.nodeterm`.

---

## 📋 CARACTERÍSTICAS IMPLEMENTADAS

### 🔒 **Seguridad**
- ✅ **Master Key NO se exporta** - Solo datos encriptados
- ✅ **Encriptación opcional AES-256-GCM** con contraseña personalizada
- ✅ **Validación de integridad** con checksums SHA-256
- ✅ **Backup automático** antes de importar en modo reemplazar
- ✅ **Todos los datos encriptados** se mantienen encriptados en el export

### 📦 **Datos Exportables**

#### 1. **Conexiones SSH/RDP/VNC**
- Árbol completo de conexiones (`basicapp2_tree_data`)
- Conexiones encriptadas (`connections_encrypted`)
- Fuentes de importación (`IMPORT_SOURCES`)
- Conexiones favoritas (`nodeterm_favorite_connections`)

#### 2. **Gestor de Contraseñas**
- Contraseñas encriptadas (`passwords_encrypted`)
- Contraseñas sin encriptar (fallback) (`passwordManagerNodes`)
- Estado de expansión del árbol
- Contador de contraseñas

#### 3. **Conversaciones de IA**
- Todas las conversaciones (`conversation_*`)
- Índice de conversaciones
- Backups automáticos

#### 4. **Configuraciones**
- Clientes de IA habilitados
- MCPs seleccionados
- Terminal por defecto
- Temas y fuentes
- Configuraciones de auditoría
- Idioma
- Y más...

#### 5. **Grabaciones (Metadata)**
- Solo información de grabaciones
- No incluye contenido completo (evita archivos enormes)

---

## 🎨 **Interfaz de Usuario**

### **ExportDialog.js** - Diálogo de Exportación
- ✅ Diseño minimalista y profesional
- ✅ Checkboxes para seleccionar categorías
- ✅ Campo para nombre del archivo
- ✅ Opción de encriptación con contraseña
- ✅ Estimación de tamaño del archivo
- ✅ Barra de progreso durante exportación
- ✅ Advertencia de seguridad (master key no exportada)

### **ImportExportDialog.js** - Diálogo de Importación
- ✅ Selector de archivo drag & drop
- ✅ **Preview del archivo** antes de importar:
  - Información del archivo (versión, fecha, tamaño)
  - Estadísticas de contenido (conexiones, contraseñas, etc.)
- ✅ Desencriptación si el archivo está protegido
- ✅ **Dos modos de importación**:
  - 🔀 **Fusionar**: Añade datos sin eliminar existentes
  - 🔄 **Reemplazar**: Elimina todo y reemplaza (con backup automático)
- ✅ Selección de categorías a importar
- ✅ Confirmación antes de aplicar cambios
- ✅ Recarga automática de la aplicación

---

## 📁 **Archivos Creados/Modificados**

### **Nuevos Archivos**
```
src/services/ExportImportService.js          (Servicio principal)
src/components/ExportDialog.js               (Diálogo de exportación)
src/components/ImportExportDialog.js         (Diálogo de importación)
src/styles/components/export-import-dialogs.css (Estilos)
docs/EXPORT_IMPORT_SYSTEM.md                 (Esta documentación)
```

### **Archivos Modificados**
```
src/utils/appMenuUtils.js                    (Menú actualizado)
src/components/App.js                        (Estados y diálogos)
src/components/TitleBar.js                   (Props para menú)
src/components/SidebarFooter.js              (Props para menú)
src/styles/main.css                          (Import CSS)
src/i18n/locales/es/common.json              (Traducciones ES)
src/i18n/locales/en/common.json              (Traducciones EN)
```

---

## 🔧 **Uso del Sistema**

### **Exportar Datos**
1. **Archivo → Exportar**
2. Seleccionar categorías a exportar
3. (Opcional) Proteger con contraseña adicional
4. Hacer clic en **Exportar**
5. Archivo `.nodeterm` se descarga automáticamente

### **Importar Datos**
1. **Archivo → Importar → Importar NodeTerm (.nodeterm)**
2. Seleccionar archivo `.nodeterm`
3. Si está encriptado, ingresar contraseña
4. Ver preview del contenido
5. Elegir modo (Fusionar o Reemplazar)
6. Seleccionar categorías a importar
7. Confirmar importación
8. Recargar aplicación para aplicar cambios

---

## 🔐 **Formato del Archivo .nodeterm**

```json
{
  "version": "1.0",
  "exportedAt": "2026-01-16T10:30:00.000Z",
  "appVersion": "1.3.1",
  "encrypted": true,
  "categories": {
    "connections": true,
    "passwords": true,
    "conversations": true,
    "config": true,
    "recordings": false
  },
  "data": {
    "encrypted": true,
    "salt": [...],
    "iv": [...],
    "data": [...]
  },
  "dataSize": 123456,
  "checksum": "abc123..."
}
```

---

## 🛡️ **Seguridad y Validación**

### **Validaciones Implementadas**
1. ✅ **Validación de estructura** del archivo
2. ✅ **Validación de versión** (compatibilidad)
3. ✅ **Validación de checksum** (integridad)
4. ✅ **Validación de contraseña** para desencriptación
5. ✅ **Backup automático** antes de reemplazar datos
6. ✅ **Confirmación explícita** para operaciones destructivas

### **Protecciones de Seguridad**
- 🔒 **Master key NUNCA se exporta**
- 🔒 **Datos encriptados permanecen encriptados**
- 🔒 **Encriptación adicional opcional AES-256-GCM**
- 🔒 **PBKDF2** con 100,000 iteraciones para derivación de claves
- 🔒 **Salt e IV aleatorios** por cada encriptación

---

## 🌐 **Internacionalización**

✅ **Español** (completo)
✅ **Inglés** (completo)

Todas las cadenas de texto están traducidas en:
- `src/i18n/locales/es/common.json`
- `src/i18n/locales/en/common.json`

---

## 📊 **Estructura del Menú**

```
Archivo
├── Exportar                           [NUEVO]
├── ──────────────
└── Importar
    ├── Importar NodeTerm (.nodeterm)  [NUEVO]
    └── Importar mRemoteNG/KeePass     [EXISTENTE]
```

---

## ✅ **Casos de Uso**

### 1. **Backup Regular**
- Exportar datos semanalmente
- Guardar en ubicación segura
- Proteger con contraseña

### 2. **Migración entre Dispositivos**
- Exportar desde dispositivo A
- Importar en dispositivo B
- Todos los datos se transfieren

### 3. **Sincronización Manual**
- Exportar desde máquina de trabajo
- Importar en máquina personal
- Fusionar datos existentes

### 4. **Recuperación ante Desastres**
- Sistema corrupto o perdido
- Restaurar desde backup .nodeterm
- Reemplazar con backup anterior

---

## 🔍 **Características Técnicas**

### **ExportImportService.js**
- Singleton pattern
- Métodos async/await
- Manejo robusto de errores
- Validación exhaustiva
- Encriptación Web Crypto API
- Fusión inteligente de datos

### **Componentes React**
- Hooks modernos (useState, useRef)
- PrimeReact UI components
- Traducciones con i18n
- Animaciones suaves
- Responsive design

### **Estilos CSS**
- Variables CSS personalizadas
- Tema oscuro automático
- Animaciones fluidas
- Responsive breakpoints
- Hover effects

---

## 🚀 **Testing**

### **Para probar la funcionalidad:**

1. **Exportar datos:**
   ```
   1. Crear algunas conexiones SSH/RDP
   2. Añadir contraseñas al gestor
   3. Tener conversaciones de IA
   4. Ir a Archivo → Exportar
   5. Seleccionar todas las categorías
   6. (Opcional) Proteger con contraseña
   7. Descargar archivo
   ```

2. **Importar datos:**
   ```
   1. Ir a Archivo → Importar → Importar NodeTerm
   2. Seleccionar archivo .nodeterm
   3. Desencriptar si es necesario
   4. Ver preview
   5. Elegir modo (Fusionar/Reemplazar)
   6. Importar y recargar
   ```

---

## 📝 **Notas Importantes**

- ✅ **NO se exporta la master key** por seguridad
- ✅ **Los datos encriptados se mantienen encriptados**
- ✅ **Se crea backup automático** antes de reemplazar
- ✅ **Recarga de aplicación requerida** después de importar
- ✅ **Validación de integridad** con checksums
- ✅ **Archivos .nodeterm** son portables entre sistemas

---

## 🎉 **Estado: COMPLETO**

✅ Todos los componentes implementados
✅ Todas las funcionalidades operativas
✅ Traducciones completas (ES/EN)
✅ Estilos y animaciones aplicados
✅ Documentación completa
✅ Listo para usar en producción

---

## 📞 **Soporte**

Para dudas o problemas:
1. Revisar esta documentación
2. Verificar console.log en DevTools
3. Comprobar archivos de backup en localStorage
4. Restaurar desde backup si es necesario

---

**Creado el:** 2026-01-16
**Versión:** 1.0
**Estado:** ✅ PRODUCCIÓN
