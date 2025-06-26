# NodeTerm v1.1.0

Terminal SSH multiplataforma con gestión avanzada de pestañas, construido con Electron y React.

## 🚀 Características Principales

- **Conexiones SSH múltiples**: Maneja múltiples sesiones SSH con pestañas independientes
- **Explorador de archivos remoto**: Navegación y transferencia de archivos integrada
- **Iconos automáticos por distribución**: Detecta automáticamente la distribución Linux y muestra iconos específicos
- **Gestión inteligente de pestañas**: Sistema de overflow con funcionalidad move-to-front
- **Drag & drop**: Reorganización de pestañas mediante arrastrar y soltar
- **Configuración personalizable**: Fuentes, tamaños y temas del terminal
- **Sistema de versionado**: Información completa de la aplicación y seguimiento de versiones

## 📋 Información de Versión

**Versión actual**: v1.1.0

### Nuevas características v1.1.0:
- 🎉 Sistema de versionado implementado
- 📋 Diálogo "Acerca de" con información completa
- 📍 Versión mostrada en barra de estado
- 🔧 Scripts npm para manejo de versiones
- 📝 Información técnica detallada
- 🎨 Interfaz mejorada con diseño profesional

### Funcionalidades v1.0.0:
- 📏 Panel lateral optimizado (133x47px mínimo)
- 🐧 Iconos automáticos por distribución Linux
- 🔄 Sistema de overflow inteligente para pestañas
- 📋 Funcionalidad move-to-front
- 🐛 Corrección de memory leaks
- 🎯 Menú de overflow con posicionamiento correcto

## 🛠️ Instalación y Desarrollo

### Requisitos
- Node.js 16+
- npm o yarn

### Instalación
```bash
git clone https://github.com/kalidus/NodeTerm.git
cd NodeTerm
npm install
```

### Desarrollo
```bash
# Modo desarrollo (con hot reload)
npm run dev

# Solo compilar
npm run build

# Iniciar aplicación compilada
npm start
```

### Gestión de Versiones
```bash
# Incrementar versión patch (1.1.0 → 1.1.1)
npm run version:patch

# Incrementar versión minor (1.1.0 → 1.2.0)
npm run version:minor

# Incrementar versión major (1.1.0 → 2.0.0)
npm run version:major

# Compilar y empaquetar después de cambio de versión
npm run version:build
```

### Empaquetado para Distribución
```bash
# Crear paquete de instalación
npm run dist

# Solo crear directorio con archivos
npm run pack
```

## 🎨 Interfaz de Usuario

### Diálogo "Acerca de"
- Información completa de la aplicación
- Versiones técnicas (Electron, Node.js, Chromium)
- Lista de características principales
- Fecha de compilación

### Barra de Estado
- Estadísticas del servidor (CPU, RAM, disco, red)
- Iconos de distribución automáticos
- Información de versión en tiempo real
- Uptime y dirección IP del servidor

### Pestañas Inteligentes
- Iconos automáticos según distribución detectada
- Sistema de overflow para muchas pestañas
- Move-to-front para acceso rápido
- Drag & drop para reorganización

## 🔧 Configuración

### Terminal
- **Fuentes**: FiraCode, Cascadia Code, JetBrains Mono, etc.
- **Tamaños**: Configurables desde 8px hasta 24px
- **Temas**: Múltiples temas predefinidos

### SSH
- Almacenamiento seguro de credenciales
- Organización en carpetas
- Configuración de carpetas remotas por defecto

## 📖 Arquitectura Técnica

### Stack Tecnológico
- **Frontend**: React 18, PrimeReact, React Icons
- **Backend**: Electron 28, Node.js
- **SSH**: node-ssh, ssh2-promise
- **Terminal**: xterm.js con addons
- **Build**: Webpack 5, Babel

### Estructura del Proyecto
```
NodeTerm/
├── src/
│   ├── components/         # Componentes React
│   │   ├── App.js         # Componente principal
│   │   ├── AboutDialog.js # Diálogo de información
│   │   ├── StatusBar.js   # Barra de estado
│   │   └── ...
│   ├── assets/            # Estilos CSS
│   └── themes.js          # Temas del terminal
├── main.js                # Proceso principal Electron
├── preload.js             # Script de preload
├── webpack.config.js      # Configuración Webpack
└── .version              # Tracking de versiones
```

## 🐛 Resolución de Problemas

### Memory Leaks
- Sistema de limpieza automática de event listeners
- Tracking de listeners activos por pestaña
- Remoción automática al cerrar pestañas

### Rendimiento
- Lazy loading de componentes
- Gestión eficiente de pestañas
- Optimización de re-renders

## 🚀 Próximas Versiones

- **v1.2.0**: Configuración de temas personalizados
- **v1.3.0**: Exportación/importación de configuraciones SSH
- **v1.4.0**: Soporte para llaves SSH
- **v1.5.0**: Terminal integrado con múltiples shells

## 📝 Changelog

Ver archivo [`.version`](./.version) para changelog detallado.

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia ISC - ver el archivo [LICENSE](LICENSE) para detalles.

## 🙏 Reconocimientos

- [Electron](https://electronjs.org/) - Framework de aplicaciones de escritorio
- [React](https://reactjs.org/) - Biblioteca de interfaz de usuario
- [PrimeReact](https://primefaces.org/primereact/) - Componentes UI
- [xterm.js](https://xtermjs.org/) - Terminal en el navegador
- [node-ssh](https://github.com/steelbrain/node-ssh) - Cliente SSH para Node.js

---

**NodeTerm** - Desarrollado con ❤️ usando Electron y React 