# NodeTerm - Terminal SSH y Explorador de Archivos

Una aplicación de escritorio multiplataforma para gestión de conexiones SSH con terminal integrado y explorador de archivos remoto.

## Características

- **Terminal SSH integrado**: Conecta y gestiona múltiples sesiones SSH simultáneamente
- **Explorador de archivos SSH**: Navega y gestiona archivos remotos con interfaz gráfica
- **Sistema de pestañas**: Organiza terminales y exploradores en pestañas separadas
- **Configuración personalizable**: Temas, fuentes y tamaños de terminal ajustables
- **Interfaz moderna**: UI responsiva con PrimeReact
- **Gestión de conexiones**: Guarda y organiza tus conexiones SSH en un árbol de carpetas
- **Soporte multiplataforma**: Windows, macOS, Linux

## Requisitos previos

- Node.js (versión 14 o superior)
- npm (viene con Node.js)

## Instalación

1. Clona o descarga este repositorio
2. Navega al directorio del proyecto
3. Instala las dependencias:

```bash
npm install
```

## Desarrollo

Para iniciar la aplicación en modo desarrollo:

1. En una terminal, ejecuta el compilador de webpack en modo watch:

```bash
npm run dev
```

Esto iniciará tanto el compilador webpack como la aplicación Electron automáticamente.

## Uso

### Conexiones SSH

1. **Crear nueva conexión SSH**:
   - Haz clic en el botón "Server" (🖥️) en la barra lateral
   - O ve a Archivo > Nuevo > Nueva sesión SSH
   - Completa los datos: nombre, host, usuario, contraseña y carpeta remota (opcional)
   - Selecciona una carpeta de destino en el árbol lateral (opcional)

2. **Abrir terminal SSH**:
   - Haz doble clic en cualquier conexión SSH del árbol lateral
   - Esto abrirá una nueva pestaña con el terminal conectado al servidor

3. **Abrir explorador de archivos**:
   - Haz clic en el icono de carpeta (📁) junto a cualquier conexión SSH
   - Esto abrirá una nueva pestaña con el explorador de archivos remoto

### Explorador de Archivos SSH

El explorador de archivos te permite navegar y gestionar archivos del servidor remoto con una interfaz gráfica completa:

#### Navegación
- **Navegación**: Haz doble clic en carpetas para entrar, o usa el breadcrumb para navegar
- **Botones de navegación**: 
  - Atrás: Volver al directorio anterior
  - Actualizar: Recargar el contenido del directorio actual
  - Inicio: Ir al directorio raíz

#### Gestión de Archivos
- **Subir archivos**: Botón "Subir" - Selecciona y sube uno o múltiples archivos al servidor
- **Descargar archivos**: Botón de descarga en cada archivo - Guarda archivos localmente
- **Crear carpetas**: Botón "Nueva Carpeta" - Crea directorios en el servidor
- **Eliminar archivos**: Selecciona archivos/carpetas y usa el botón "Eliminar" (confirmación requerida)

#### Características Adicionales
- **Progreso de transferencia**: Barra de progreso visual para subidas, descargas y eliminaciones
- **Notificaciones**: Mensajes de éxito/error para todas las operaciones
- **Información detallada**: Muestra nombre, tamaño, permisos, propietario y fecha de modificación
- **Selección múltiple**: Selecciona varios archivos manteniendo Ctrl/Cmd
- **Iconos por tipo**: Diferentes iconos para carpetas, archivos de texto, scripts, imágenes, etc.
- **Soporte para enlaces simbólicos**: Identifica y muestra enlaces simbólicos con iconos especiales

### Gestión de Pestañas

- **Pestañas múltiples**: Puedes tener varias pestañas de terminal y explorador abiertas simultáneamente
- **Una pestaña por sesión**: El explorador de archivos evita crear pestañas duplicadas para la misma conexión SSH
- **Cerrar pestañas**: Haz clic en la X de cada pestaña para cerrarla
- **Cambiar entre pestañas**: Haz clic en las pestañas para cambiar entre terminal y explorador

### Configuración

Accede a la configuración haciendo clic en el engranaje (⚙️) para personalizar:
- Fuente del terminal
- Tamaño de fuente
- Tema del terminal

## Compilación

Para compilar la aplicación para producción:

```bash
npm run build
npm run package
```

Esto generará los archivos de instalación en el directorio `build`.

## Estructura del proyecto

- `main.js` - Punto de entrada de Electron
- `src/` - Código fuente de React
  - `components/` - Componentes de React
  - `assets/` - Recursos estáticos (CSS, imágenes, etc.)
- `dist/` - Archivos compilados por webpack
- `build/` - Archivos de instalación generados 