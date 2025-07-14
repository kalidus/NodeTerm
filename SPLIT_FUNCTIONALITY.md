# Funcionalidad de Split Terminal

## ¿Qué es?

El sistema de split terminal permite dividir horizontalmente una pestaña de terminal existente con una nueva sesión SSH, mostrando ambas sesiones lado a lado en la misma pestaña.

## ¿Cómo usar?

### 1. Prerequisitos
- Tener al menos una pestaña de terminal SSH abierta
- Tener sesiones SSH configuradas en el explorador de sesiones

### 2. Crear un split
1. Haz **clic derecho** en cualquier sesión SSH del explorador de sesiones (sidebar izquierdo)
2. En el menú contextual, aparecerá la opción **"Abrir en Split →"** 
3. Se desplegará un submenu mostrando todas las pestañas de terminal abiertas actualmente
4. Selecciona la pestaña con la que quieres hacer split
5. ¡La pestaña se convertirá automáticamente en un split horizontal!

### 3. Características del split

#### Apariencia visual:
- La pestaña se renombra automáticamente a: `Split: [Terminal Izquierdo] | [Terminal Derecho]`
- Aparece un icono especial (□) en azul para identificar pestañas con split
- División horizontal 50/50 que se puede redimensionar arrastrando el divisor central

#### Funcionalidad completa:
- **Sesiones independientes**: Cada terminal mantiene su propia conexión SSH
- **Stats separadas**: Cada terminal muestra sus propias estadísticas en la barra inferior
- **Persistencia**: Las sesiones se mantienen activas al cambiar de pestañas
- **Redimensionamiento**: Ambos terminales se redimensionan correctamente
- **Menú contextual**: Ambos terminales soportan clic derecho (copiar, pegar, etc.)

#### Gestión del split:
- **Cerrar**: Al cerrar una pestaña con split, ambas sesiones SSH se desconectan automáticamente
- **Cambio de pestañas**: Las sesiones se mantienen activas en segundo plano
- **Grupos**: Los splits funcionan normalmente con el sistema de grupos de pestañas

## Casos de uso

### Comparación de archivos
```bash
# Terminal izquierdo
cat archivo1.txt

# Terminal derecho  
cat archivo2.txt
```

### Monitoreo simultáneo
```bash
# Terminal izquierdo
htop

# Terminal derecho
tail -f /var/log/syslog
```

### Desarrollo y testing
```bash
# Terminal izquierdo
npm run dev

# Terminal derecho
npm test -- --watch
```

### Servidores múltiples
- Terminal izquierdo: Servidor de desarrollo
- Terminal derecho: Servidor de producción

## Limitaciones actuales

- Solo split horizontal (no vertical)
- Solo 2 terminales por split (no múltiples divisiones)
- La funcionalidad está disponible solo desde el menú contextual del explorador de sesiones

## Implementación técnica

### Componentes involucrados:
- `SplitLayout.js`: Componente que maneja la división horizontal
- `App.js`: Lógica de gestión de pestañas con split
- Reutiliza completamente `TerminalComponent.js` existente

### Estructura de datos:
```javascript
// Pestaña normal
{
  key: "terminal_id",
  type: "terminal", 
  sshConfig: { ... }
}

// Pestaña con split
{
  key: "split_id",
  type: "split",
  leftTerminal: { key: "left_id", type: "terminal", sshConfig: {...} },
  rightTerminal: { key: "right_id", type: "terminal", sshConfig: {...} },
  label: "Split: Server1 | Server2"
}
```

El sistema reutiliza toda la infraestructura existente de SSH, stats, temas, fuentes y gestión de sesiones. 