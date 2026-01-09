# 🔄 Sistema de Actualización de NodeTerm

## Descripción General

NodeTerm incluye un **sistema de actualización automática** integrado que utiliza `electron-updater` para mantener la aplicación actualizada desde GitHub Releases.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│  Proceso Principal (main.js)            │
│  ┌─────────────────────────────────┐   │
│  │   UpdateService                  │   │
│  │   - Comprobación periódica       │   │
│  │   - Descarga de actualizaciones  │   │
│  │   - Gestión de configuración     │   │
│  └─────────────┬───────────────────┘   │
└────────────────┼───────────────────────┘
                 │ IPC
                 │
┌────────────────┴───────────────────────┐
│  Renderer (React)                       │
│  ┌─────────────────────────────────┐   │
│  │   UpdatePanel.js                 │   │
│  │   - UI de configuración          │   │
│  │   - Estado de actualización      │   │
│  │   - Botón "Buscar actualizaciones"│  │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📁 Estructura de Archivos

```
NodeTerm/
├── src/
│   ├── main/
│   │   └── services/
│   │       └── UpdateService.js          # Servicio de actualización (proceso principal)
│   └── components/
│       ├── UpdatePanel.js                # Componente UI de actualización
│       └── SettingsDialog.js             # Diálogo de configuración (integra UpdatePanel)
├── main.js                               # Handlers IPC y inicialización
├── preload.js                            # APIs expuestas al renderer
└── package.json                          # Configuración de electron-builder
```

## ⚙️ Configuración

### Opciones Disponibles

El sistema de actualización ofrece las siguientes opciones configurables:

| Opción | Descripción | Valor por defecto | Rango |
|--------|-------------|-------------------|-------|
| **autoCheck** | Comprobación automática de actualizaciones | `true` | boolean |
| **checkIntervalHours** | Intervalo de comprobación en horas | `24` | 1-168 |
| **autoDownload** | Descarga automática de actualizaciones | `true` | boolean |
| **autoInstall** | Instalación automática al salir de la app | `false` | boolean |
| **channel** | Canal de actualizaciones | `'latest'` | 'latest', 'beta' |

### Acceso a la Configuración

1. Abre la aplicación NodeTerm
2. Haz clic en el icono de engranaje (⚙️) o `Menú → Configuración`
3. Selecciona la pestaña **"Actualizaciones"**
4. Ajusta las opciones según tus preferencias

## 🔄 Flujo de Actualización

### 1. Comprobación Automática

```
App inicia → Espera 60s → Comprueba GitHub Releases
     ↓
¿Actualización disponible?
     ├─ SÍ → Notifica al usuario → Descarga automática (si activado)
     └─ NO → Programa siguiente comprobación (según intervalo)
```

### 2. Comprobación Manual

```
Usuario hace clic en "Buscar Actualizaciones"
     ↓
Comprueba GitHub Releases
     ↓
¿Actualización disponible?
     ├─ SÍ → Muestra versión disponible → Usuario descarga
     └─ NO → "Ya tienes la última versión"
```

### 3. Instalación

```
Actualización descargada
     ↓
Usuario hace clic en "Instalar y Reiniciar"
     ↓
App se cierra y se instala la actualización
     ↓
App se reinicia automáticamente con la nueva versión
```

## 🔐 Seguridad

### Verificación de Actualizaciones

- **Origen**: Solo desde GitHub Releases oficial (`github.com/kalidus/NodeTerm`)
- **Firma digital**: Todas las actualizaciones están firmadas con certificado
- **HTTPS**: Todas las descargas usan conexiones seguras
- **Verificación automática**: `electron-updater` verifica la firma antes de instalar

### Permisos

- **Sin permisos de administrador**: La actualización se instala sin necesidad de elevar privilegios
- **Sin acceso a red**: Solo se requiere acceso a internet para descargar actualizaciones

## 🎯 Estados de Actualización

| Estado | Descripción | UI |
|--------|-------------|-----|
| `idle` | Sin actualización en proceso | - |
| `checking` | Comprobando si hay actualizaciones | Spinner + "Comprobando..." |
| `available` | Actualización disponible | Badge con nueva versión |
| `downloading` | Descargando actualización | Barra de progreso |
| `downloaded` | Actualización descargada y lista | Botón "Instalar y Reiniciar" |
| `error` | Error en el proceso | Mensaje de error |

## 📡 Eventos IPC

### Del Renderer al Main

| Canal | Descripción | Parámetros |
|-------|-------------|-----------|
| `updater:check` | Comprueba actualizaciones manualmente | - |
| `updater:download` | Descarga la actualización | - |
| `updater:quit-and-install` | Instala y reinicia | - |
| `updater:get-config` | Obtiene configuración actual | - |
| `updater:update-config` | Actualiza configuración | `config: Object` |
| `updater:get-info` | Obtiene info de actualización | - |

### Del Main al Renderer

| Canal | Evento | Datos |
|-------|--------|-------|
| `updater-event` | `checking-for-update` | - |
| `updater-event` | `update-available` | `{ version, releaseDate, releaseNotes }` |
| `updater-event` | `update-not-available` | `{ version }` |
| `updater-event` | `download-progress` | `{ percent, bytesPerSecond, transferred, total }` |
| `updater-event` | `update-downloaded` | `{ version, releaseNotes }` |
| `updater-event` | `error` | `{ message }` |

## 🧪 Pruebas

### Probar en Desarrollo

Para probar el sistema de actualización en desarrollo:

1. **Compilar la aplicación**:
   ```bash
   npm run build
   npm run dist
   ```

2. **Crear una release en GitHub** con una versión superior (ej: v1.6.0)

3. **Ejecutar la aplicación compilada** (no en modo dev):
   ```bash
   ./dist/NodeTerm.exe
   ```

4. **Verificar que la comprobación funciona**:
   - Ir a `Configuración → Actualizaciones`
   - Hacer clic en "Buscar Actualizaciones"

### Probar Descarga

1. Crear una release real en GitHub
2. Subir los binarios compilados a la release
3. La aplicación detectará la actualización automáticamente

## 🚀 Publicación de Nuevas Versiones

### 1. Actualizar Versión

```bash
# Incrementar versión (patch: 1.5.4 → 1.5.5)
npm run version:patch

# O minor (1.5.4 → 1.6.0)
npm run version:minor

# O major (1.5.4 → 2.0.0)
npm run version:major
```

### 2. Compilar

```bash
npm run dist
```

### 3. Crear Release en GitHub

1. Ir a `github.com/kalidus/NodeTerm/releases`
2. Hacer clic en "Draft a new release"
3. Tag: `v1.6.1` (debe coincidir con package.json)
4. Título: `NodeTerm v1.6.1`
5. Descripción: Changelog de la versión
6. Subir los binarios generados en `dist/`:
   - `NodeTerm-Setup-1.6.1.exe` (Windows)
   - `NodeTerm-1.6.1.AppImage` (Linux)
   - `NodeTerm-1.6.1.dmg` (macOS)
7. Publicar release

### 4. Verificar

- La aplicación detectará automáticamente la nueva versión
- Los usuarios recibirán una notificación de actualización disponible

## 🔧 Resolución de Problemas

### Error: "No se puede comprobar actualizaciones"

**Causa**: Sin conexión a internet o GitHub no accesible

**Solución**: 
- Verificar conexión a internet
- Comprobar que `github.com` es accesible
- Verificar firewall/proxy

### Error: "Error descargando actualización"

**Causa**: Fallo en la descarga o interrupción

**Solución**:
- Intentar de nuevo
- Verificar espacio en disco
- Comprobar permisos de escritura en carpeta temporal

### La aplicación no detecta actualizaciones

**Causa**: Configuración incorrecta o release no publicada

**Solución**:
- Verificar que `autoCheck` está activado
- Comprobar que la release está publicada en GitHub
- Verificar que la versión en GitHub es superior a la local

## 📚 Referencias

- [electron-updater Documentation](https://www.electron.build/auto-update)
- [electron-builder Documentation](https://www.electron.build/)
- [GitHub Releases API](https://docs.github.com/en/rest/releases)

## 🤝 Contribuir

Si encuentras algún problema o quieres mejorar el sistema de actualización:

1. Crea un issue en GitHub describiendo el problema
2. Propón mejoras mediante Pull Requests
3. Reporta bugs específicos del sistema de actualización

---

**Última actualización**: 2 de octubre de 2025
**Versión del documento**: 1.0.0

