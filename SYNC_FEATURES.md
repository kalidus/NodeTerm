# Funcionalidad de Sincronización con Nextcloud

## Nuevas características añadidas

### 📁 Archivos creados:

1. **`src/services/NextcloudService.js`** - Servicio principal para la comunicación con Nextcloud
2. **`src/utils/SyncManager.js`** - Gestor de sincronización que maneja la lógica de sincronización
3. **`src/components/SyncSettingsDialog.js`** - Interfaz de usuario para configurar la sincronización

### 🔧 Modificaciones realizadas:

- **`src/components/SettingsDialog.js`** - Añadida nueva pestaña "Sincronización" con integración del diálogo de configuración

## ✨ Funcionalidades implementadas

### 🔐 Configuración de Nextcloud
- Configuración de URL del servidor, usuario y contraseña
- Prueba de conexión en tiempo real
- Almacenamiento seguro de credenciales (cifrado básico)

### 🔄 Tipos de sincronización
- **Sincronización automática**: Cada 5 minutos
- **Subir a la nube**: Envía configuración local a Nextcloud
- **Descargar de la nube**: Obtiene configuración desde Nextcloud  
- **Sincronización inteligente**: Detecta automáticamente qué versión es más reciente

### 📊 Datos sincronizados
- Configuración de fuentes y temas de terminal
- Configuración de PowerShell y Linux
- Altura de barra de estado
- Temas de interfaz y iconos
- Configuración del explorador de archivos
- Historial de conexiones (sin contraseñas por seguridad)

### 📈 Monitoreo y estadísticas
- Estado de sincronización en tiempo real
- Estadísticas de archivos en la nube
- Información de última sincronización
- Tamaño de archivos y fechas de modificación

## 🚀 Cómo usar

1. **Abrir configuración**: Settings → Sincronización
2. **Configurar Nextcloud**: Introducir URL, usuario y contraseña
3. **Probar conexión**: Verificar que la configuración es correcta
4. **Guardar configuración**: Almacenar credenciales de forma segura
5. **Habilitar sincronización**: Activar sincronización automática o manual

## 🔒 Seguridad

- Las contraseñas SSH **no se sincronizan** por razones de seguridad
- Las credenciales de Nextcloud se almacenan con cifrado básico
- Se crea una carpeta específica `/NodeTerm` en Nextcloud
- Los datos se almacenan en formato JSON estructurado

## 🏗️ Arquitectura técnica

### NextcloudService
- Gestión de autenticación WebDAV
- Operaciones CRUD de archivos
- Verificación de conectividad
- Gestión de carpetas

### SyncManager  
- Recopilación de datos de localStorage
- Lógica de sincronización bidireccional
- Gestión de conflictos por fechas
- Programación de sincronización automática

### SyncSettingsDialog
- Interfaz intuitiva de configuración
- Monitoreo de estado en tiempo real
- Gestión de errores y notificaciones
- Visualización de estadísticas

## 🔮 Futuras mejoras

- Soporte para OneDrive y Google Drive
- Cifrado avanzado de datos
- Resolución de conflictos más sofisticada
- Sincronización selectiva de configuraciones
- Backup automático antes de aplicar cambios remotos

## 📝 Notas técnicas

- Compatible con instancias de Nextcloud estándar
- Utiliza WebDAV para comunicación
- Almacenamiento en `localStorage` para configuración local
- Sincronización no bloquea la UI principal
- Gestión automática de carpetas y archivos