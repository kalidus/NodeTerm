<div align="center">

# 🚀 NodeTerm

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](https://github.com/kalidus/NodeTerm)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-28+-purple.svg)](https://electronjs.org/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)

**Terminal SSH multiplataforma con gestión avanzada de pestañas y explorador de archivos integrado**

*Construido con ❤️ usando Electron, React y tecnologías modernas*

![NodeTerm Preview](https://via.placeholder.com/800x400?text=NodeTerm+Preview)

</div>

---

## ✨ **Características Principales**

<table>
<tr>
<td width="50%">

### 🖥️ **Terminal Avanzado**
- 🔗 **Conexiones SSH múltiples** con pestañas independientes
- 🐧 **Detección automática** de distribuciones Linux
- 🎨 **Iconos personalizados** por distribución
- ⚙️ **Configuración completa** de fuentes y temas

</td>
<td width="50%">

### 📁 **Explorador de Archivos**
- 🗂️ **Navegación remota** integrada
- ⬆️⬇️ **Transferencia de archivos** drag & drop
- 🔍 **Búsqueda avanzada** en directorios
- 📋 **Gestión completa** de permisos

</td>
</tr>
<tr>
<td width="50%">

### 🎯 **Gestión Inteligente**
- 📑 **Sistema de pestañas** con overflow automático
- 🔄 **Drag & drop** para reorganización
- 🎮 **Menús contextuales** intuitivos
- 📊 **Barra de estado** con métricas en tiempo real

</td>
<td width="50%">

### 🛠️ **Tecnología Moderna**
- ⚡ **Hot reload** en desarrollo
- 🔒 **Almacenamiento seguro** de credenciales
- 📝 **Versionado automático** de la aplicación
- 🎨 **Interfaz responsiva** y moderna

</td>
</tr>
</table>

---

## 🆕 **Novedades v1.3.0**

### 🎉 **Menús Contextuales Mejorados**
- **✨ Menú contextual en nodos**: Click derecho en sesiones y carpetas
  - 🖥️ Abrir Terminal / 📁 Explorador de Archivos
  - ✏️ Editar Sesión/Carpeta / 🗑️ Eliminar
- **🆕 Menú contextual en área vacía**: Click derecho en espacio libre
  - 📁 Nueva Carpeta / 🔗 Nueva Conexión SSH
- **🐛 Correcciones**: Eliminado duplicado de confirmaciones

### 🏗️ **Mejoras de Interfaz**
- Interface más limpia sin botones inline
- Indicador visual "⋮" para menús contextuales
- Tooltips informativos mejorados

---

## 🚀 **Instalación Rápida**

### **Prerrequisitos**
```bash
Node.js 16+ | npm/yarn | Git
```

### **1️⃣ Clonar & Instalar**
```bash
git clone https://github.com/kalidus/NodeTerm.git
cd NodeTerm
npm install
```

### **2️⃣ Desarrollo**
```bash
# 🔥 Hot reload (recomendado)
npm run dev

# 🔨 Solo compilar
npm run build

# ▶️ Ejecutar compilado
npm start
```

### **3️⃣ Distribución**
```bash
# 📦 Paquete instalador
npm run dist

# 📁 Solo archivos
npm run pack
```

---

## 📊 **Gestión de Versiones**

| Comando | Acción | Ejemplo |
|---------|--------|---------|
| `npm run version:patch` | 🔧 Bug fixes | `1.3.0` → `1.3.1` |
| `npm run version:minor` | ✨ Nuevas características | `1.3.0` → `1.4.0` |
| `npm run version:major` | 💥 Cambios importantes | `1.3.0` → `2.0.0` |
| `npm run version:build` | 🏗️ Compilar después de versionar | - |

---

## 🎨 **Interfaz de Usuario**

<details>
<summary>📋 <strong>Diálogo "Acerca de"</strong></summary>

- ℹ️ Información completa de la aplicación
- 🔧 Versiones técnicas (Electron, Node.js, Chromium)
- 📋 Lista de características principales
- 📅 Fecha de compilación
</details>

<details>
<summary>📊 <strong>Barra de Estado</strong></summary>

- 📈 **Métricas del servidor**: CPU, RAM, Disco, Red
- 🐧 **Iconos automáticos** por distribución
- 📍 **Información de red**: IP, hostname
- ⏱️ **Uptime** del sistema
- 🏷️ **Versión** de la aplicación
</details>

<details>
<summary>🎯 <strong>Sistema de Pestañas</strong></summary>

- 🏷️ **Iconos automáticos** según distribución
- 📑 **Overflow inteligente** para muchas pestañas
- 🔝 **Move-to-front** para acceso rápido
- 🔄 **Drag & drop** para reorganización
- ❌ **Cierre individual** de pestañas
</details>

---

## ⚙️ **Configuración**

### 🖥️ **Terminal**
```
Fuentes: FiraCode, Cascadia Code, JetBrains Mono, etc.
Tamaños: 8px - 24px configurables
Temas: Múltiples temas predefinidos
```

### 🔐 **SSH**
```
✅ Almacenamiento seguro de credenciales
📁 Organización en carpetas jerárquicas
🎯 Configuración de directorios remotos por defecto
```

---

## 🏗️ **Arquitectura Técnica**

### **Stack Tecnológico**
```
Frontend:  React 18 + PrimeReact + React Icons
Backend:   Electron 28 + Node.js
SSH:       node-ssh + ssh2-promise  
Terminal:  xterm.js + addons
Build:     Webpack 5 + Babel
```

### **Estructura del Proyecto**
```
NodeTerm/
├── 📁 src/
│   ├── 📁 components/     # Componentes React
│   ├── 📁 assets/         # Estilos CSS
│   └── 📄 themes.js       # Temas del terminal
├── 📄 main.js             # Proceso principal Electron
├── 📄 preload.js          # Script de preload
└── 📄 webpack.config.js   # Configuración Webpack
```

---

## 🐛 **Solución de Problemas**

<details>
<summary><strong>🧠 Memory Leaks</strong></summary>

- ✅ Sistema de limpieza automática de event listeners
- 📊 Tracking de listeners activos por pestaña
- 🗑️ Remoción automática al cerrar pestañas
</details>

<details>
<summary><strong>⚡ Rendimiento</strong></summary>

- 🔄 Lazy loading de componentes
- 📑 Gestión eficiente de pestañas
- 🎯 Optimización de re-renders
</details>

<details>
<summary><strong>🔗 Conexiones SSH</strong></summary>

- 🔄 Pool de conexiones reutilizables
- ⏱️ Timeout configurables
- 🛡️ Manejo robusto de errores de red
</details>

---

## 🗓️ **Roadmap**

| Versión | Características | Estado |
|---------|----------------|--------|
| **v1.3.0** | 🎨 Configuración de temas personalizados | 🔄 Desarrollo |
| **v1.4.0** | 📤 Exportación/importación de configuraciones | 📋 Planificado |
| **v1.5.0** | 🔑 Soporte para llaves SSH | 📋 Planificado |
| **v1.6.0** | 🖥️ Terminal integrado con múltiples shells | 💭 Concepto |

---

## 📝 **Changelog**

### **v1.3.0** *(Actual)*
- ✨ Menús contextuales para explorador de sesiones
- 🆕 Menú contextual en área vacía del árbol
- 🐛 Corrección de confirmaciones duplicadas
- 🧹 Interface más limpia sin botones inline

### **v1.1.0**
- 🎉 Sistema de versionado implementado
- 📋 Diálogo "Acerca de" con información completa
- 📍 Versión mostrada en barra de estado
- 🎨 Interfaz mejorada con diseño profesional

<details>
<summary><strong>Ver más versiones...</strong></summary>

### **v1.0.0**
- 📏 Panel lateral optimizado
- 🐧 Iconos automáticos por distribución Linux
- 🔄 Sistema de overflow inteligente
- 📋 Funcionalidad move-to-front
- 🐛 Corrección de memory leaks
</details>

---

## 🤝 **Contribuir**

<table>
<tr>
<td width="50%">

### 🚀 **Pasos Rápidos**
1. 🍴 Fork el proyecto
2. 🌿 Crea tu rama (`git checkout -b feature/AmazingFeature`)
3. 💾 Commit tus cambios (`git commit -m 'Add: AmazingFeature'`)
4. 📤 Push a la rama (`git push origin feature/AmazingFeature`)
5. 🔀 Abre un Pull Request

</td>
<td width="50%">

### 📋 **Convenciones**
- **feat:** Nueva característica
- **fix:** Corrección de bug
- **docs:** Documentación
- **style:** Formato de código
- **refactor:** Refactorización
- **test:** Pruebas

</td>
</tr>
</table>

---

## 📄 **Licencia**

Este proyecto está bajo la **Licencia ISC** - ver [LICENSE](LICENSE) para detalles.

---

## 🙏 **Reconocimientos**

<div align="center">

| Tecnología | Uso | Link |
|------------|-----|------|
| ![Electron](https://img.shields.io/badge/Electron-2B2E3A?style=for-the-badge&logo=electron&logoColor=9FEAF9) | Framework de aplicaciones | [electronjs.org](https://electronjs.org/) |
| ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) | Biblioteca UI | [reactjs.org](https://reactjs.org/) |
| ![PrimeReact](https://img.shields.io/badge/PrimeReact-007ACC?style=for-the-badge) | Componentes UI | [primefaces.org](https://primefaces.org/primereact/) |

</div>

---

<div align="center">

### 🚀 **NodeTerm v1.3.0**
*Desarrollado con ❤️ usando tecnologías modernas*

[![GitHub](https://img.shields.io/badge/GitHub-kalidus/NodeTerm-black?style=for-the-badge&logo=github)](https://github.com/kalidus/NodeTerm)

**[⬆️ Volver arriba](#-nodeterm)**

</div> 