# ActiveX RDP Control Integration

Este módulo nativo permite integrar el control ActiveX de RDP de Windows directamente en la aplicación Electron, proporcionando verdadero embedding de sesiones RDP con soporte completo de NLA.

## 🎯 Características

- ✅ **Verdadero embedding** - La sesión RDP se incrusta directamente en la ventana de la aplicación
- ✅ **Soporte completo de NLA** - Network Level Authentication nativo
- ✅ **Alto rendimiento** - Acceso directo al hardware de gráficos
- ✅ **Todas las características RDP** - Clipboard, audio, impresoras, etc.
- ✅ **Configuración nativa** - Mismas opciones que el cliente RDP estándar
- ✅ **Gestión de múltiples instancias** - Soporte para múltiples conexiones simultáneas

## 🏗️ Arquitectura

```
Electron App (React)
    ↓ IPC
main.js (Node.js)
    ↓ Native Module
RdpActiveXWrapper (C++)
    ↓ COM/ActiveX
MsRdpClient7 Control
    ↓
Remote Desktop Session
```

## 📋 Requisitos

### Sistema
- Windows 10/11 (x64)
- Visual Studio Build Tools 2019 o superior
- Node.js 16+ con node-gyp

### Dependencias
- `node-addon-api` - Para crear módulos nativos
- `bindings` - Para cargar el módulo nativo
- `mstscax.dll` - Control ActiveX de RDP (incluido en Windows)

## 🛠️ Instalación

### 1. Instalar dependencias de desarrollo
```bash
npm install -g node-gyp
npm install --save-dev node-addon-api
```

### 2. Compilar el módulo nativo
```bash
cd native/rdp-activex
npm install
npm run build
```

### 3. Verificar la instalación
```bash
node -e "console.log(require('./native/rdp-activex'))"
```

## 🔧 Uso

### En el componente React
```javascript
import ActiveXRdpSession from './components/ActiveXRdpSession';

// En tu componente
<ActiveXRdpSession 
  rdpConfig={{
    server: '192.168.1.100',
    username: 'usuario',
    width: 1024,
    height: 768
  }}
  tabId="rdp-tab-1"
  onClose={() => handleClose()}
/>
```

### API del Native Module
```javascript
const RdpActiveXManager = require('./native/rdp-activex');
const manager = new RdpActiveXManager();

// Crear instancia
const instanceId = manager.createInstance(parentWindowHandle);

// Configurar conexión
manager.setServer(instanceId, '192.168.1.100');
manager.setCredentials(instanceId, 'usuario', 'password');
manager.setDisplaySettings(instanceId, 1024, 768);

// Conectar
manager.connect(instanceId);

// Eventos
manager.onEvent(instanceId, 'connected', () => {
  console.log('RDP conectado');
});

// Desconectar
manager.disconnect(instanceId);
```

## 🔌 IPC Handlers

### Crear instancia
```javascript
const instanceId = await window.electronAPI.rdp.createActiveXInstance(parentWindowHandle);
```

### Configurar servidor
```javascript
await window.electronAPI.rdp.setActiveXServer(instanceId, '192.168.1.100');
```

### Configurar credenciales
```javascript
await window.electronAPI.rdp.setActiveXCredentials(instanceId, 'usuario', 'password');
```

### Configurar resolución
```javascript
await window.electronAPI.rdp.setActiveXDisplaySettings(instanceId, 1024, 768);
```

### Configurar eventos
```javascript
await window.electronAPI.rdp.setActiveXEventHandlers(instanceId, {
  onConnected: () => console.log('Conectado'),
  onDisconnected: () => console.log('Desconectado'),
  onError: (error) => console.error('Error:', error)
});
```

### Conectar/Desconectar
```javascript
await window.electronAPI.rdp.connectActiveX(instanceId);
await window.electronAPI.rdp.disconnectActiveX(instanceId);
```

### Redimensionar
```javascript
await window.electronAPI.rdp.resizeActiveX(instanceId, x, y, width, height);
```

## 🚨 Consideraciones Importantes

### Seguridad
- Las credenciales se manejan en memoria y se limpian automáticamente
- El control ActiveX usa la misma seguridad que `mstsc.exe`
- NLA proporciona autenticación antes de establecer la conexión

### Rendimiento
- El control ActiveX tiene acceso directo al hardware
- No hay overhead de red adicional (como en WebRDP)
- Soporte nativo para aceleración de hardware

### Compatibilidad
- Solo funciona en Windows
- Requiere permisos de administrador para algunas configuraciones
- Compatible con todas las versiones de Windows Server

## 🔍 Troubleshooting

### Error: "Failed to create RDP client instance"
- Verificar que `mstscax.dll` esté disponible
- Comprobar permisos de administrador
- Revisar que COM esté inicializado correctamente

### Error: "RDP ActiveX manager not available"
- Verificar que el módulo nativo se compiló correctamente
- Comprobar que `node-addon-api` esté instalado
- Revisar logs de Electron para errores de carga

### Error: "Failed to set credentials"
- Verificar que el usuario y contraseña sean válidos
- Comprobar que el servidor soporte NLA
- Revisar configuración de firewall

## 📚 Referencias

- [Microsoft RDP ActiveX Control](https://docs.microsoft.com/en-us/windows/win32/termserv/remote-desktop-activex-control)
- [Node-Addon-API Documentation](https://github.com/nodejs/node-addon-api)
- [Electron Native Modules](https://www.electronjs.org/docs/tutorial/using-native-node-modules)

## 🤝 Contribución

Para contribuir a este módulo:

1. Fork el repositorio
2. Crear una rama para tu feature
3. Implementar los cambios
4. Agregar tests
5. Crear Pull Request

## 📄 Licencia

MIT License - ver LICENSE para detalles. 