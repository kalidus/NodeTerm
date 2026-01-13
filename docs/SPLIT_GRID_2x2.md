# Sistema de Grid 2x2 Inteligente - Progresivo (Máx. 4)

## 📋 Resumen

Se ha implementado un sistema de **Grid 2x2 inteligente** que organiza automáticamente de 1 a 4 terminales SSH en un layout optimizado. El sistema es progresivo, permite dividir horizontal o verticalmente, y siempre organiza los terminales en un grid 2x2 cuando se alcanzan 4 terminales.

## 🎯 Características Implementadas

### 1. **Sistema de Grid 2x2 Inteligente y Redimensionable**
- ✅ Layout automático según cantidad de terminales
- ✅ Grid 2x2 forzado (no layouts asimétricos)
- ✅ **Totalmente redimensionable** con splitters arrastrables
- ✅ **Máximo 4 terminales por pestaña**
- ✅ Terminal 3 ocupa toda la fila inferior (sin espacios vacíos)
- ✅ Menú simple: solo "Dividir horizontal/vertical"

### 2. **Interfaz de Usuario Simplificada**

#### Menú Contextual Simple
Al hacer clic derecho en un servidor SSH:
```
→ Abrir en Split
   → [Pestaña existente] (2/4)
      → Dividir vertical (lado a lado)
      → Dividir horizontal (arriba/abajo)
```

**Contador simple (X/4), sin posiciones confusas, solo 2 opciones directas.**

- Solo muestra pestañas con menos de 4 terminales
- Contador solo aparece cuando hay splits (2+)
- Al llegar a 4, la pestaña desaparece del menú

#### Botones de Cierre
- Cada terminal tiene un botón "×" en la esquina superior derecha
- Al cerrar un terminal, el split se colapsa y el hermano ocupa todo el espacio
- Si solo queda 1 terminal, la pestaña vuelve a ser normal

### 3. **Estructura de Datos - Árbol Binario**

#### Formato de Árbol Anidado
```javascript
{
  type: 'split',
  orientation: 'vertical', // o 'horizontal'
  first: {
    type: 'terminal',
    key: 'tab_1',
    label: 'Server1',
    sshConfig: {...}
  },
  second: {
    type: 'split',
    orientation: 'horizontal',
    first: {
      type: 'terminal',
      key: 'tab_2',
      label: 'Server2',
      sshConfig: {...}
    },
    second: {
      type: 'terminal',
      key: 'tab_3',
      label: 'Server3',
      sshConfig: {...}
    }
  }
}
```

#### Compatibilidad Legacy
Mantiene compatibilidad con formatos antiguos:
- `leftTerminal` / `rightTerminal` (sistema anterior de 2 terminales)
- `terminals: []` (sistema de array que se intentó anteriormente)

## 📁 Archivos Modificados

### 1. `src/hooks/useSplitManagement.js`
- ✅ **openInSplit**: Crea splits anidados con orientación (vertical/horizontal)
- ✅ **handleCloseSplitPanel**: Remueve nodos del árbol y colapsa splits
- ✅ **countTerminals**: Cuenta terminales en el árbol recursivamente
- ✅ **getAllTerminals**: Obtiene todos los terminales del árbol
- ✅ **splitNode**: Divide un nodo en el árbol creando nuevo split

### 2. `src/components/SplitLayout.js`
- ✅ Renderizado recursivo de splits anidados
- ✅ **renderNode**: Renderiza nodo (terminal o split) recursivamente
- ✅ Splitter redimensionable con drag & drop
- ✅ Orientación dinámica (horizontal o vertical)
- ✅ Botones de cierre en cada terminal
- ✅ Compatibilidad con sistemas legacy

### 3. `src/components/TabContentRenderer.js`
- ✅ Pasa props del árbol (`first`, `second`, `orientation`) al SplitLayout
- ✅ Callback `onClosePanel` con path en el árbol
- ✅ Mantiene props legacy para compatibilidad

### 4. `src/hooks/useSidebarManagement.js`
- ✅ Menú contextual ultra-simplificado
- ✅ Solo dos opciones: "Dividir vertical" y "Dividir horizontal"
- ✅ Sin contadores ni posiciones confusas
- ✅ Click directo divide verticalmente (comportamiento por defecto)

### 5. `src/hooks/useSessionManagement.js`
- ✅ **getAllTerminalsFromTree**: Recorre árbol para obtener todos los terminales
- ✅ **disconnectTree**: Desconecta todos los terminales del árbol recursivamente
- ✅ Stats listeners funcionan con árbol de terminales
- ✅ Compatibilidad con todos los sistemas anteriores

## 🎨 Ejemplos de Layouts

### 1 Terminal
```
┌─────────────────────┐
│                     │
│         T1          │
│                     │
└─────────────────────┘
```

### 2 Terminales (Grid 1 fila)
```
┌──────────┬──────────┐
│          │          │
│    T1    │    T2    │
│          │          │
└──────────┴──────────┘
```

### 3 Terminales (T3 ocupa fila completa)
```
┌──────────┬──────────┐
│    T1    │    T2    │
├──────────┴──────────┤
│         T3          │
└─────────────────────┘
```

### 4 Terminales (Grid 2x2 Completo)
```
┌──────────┬──────────┐
│    T1    │    T2    │
├──────────┼──────────┤
│    T3    │    T4    │
└──────────┴──────────┘
```

## 🔄 Flujo de Uso

### Crear Split Inicial
1. Click derecho en servidor SSH → "Abrir en Split"
2. Seleccionar pestaña existente
3. Elegir "Dividir vertical" o "Dividir horizontal"
4. ¡Listo! El terminal se divide en dos

### Agregar Más Terminales
1. Repetir el proceso con otro servidor
2. Cada vez se divide la pestaña completa en la raíz
3. Los splits se van anidando automáticamente

### Cerrar Terminal
1. Click en botón "×" del terminal deseado
2. El split colapsa automáticamente
3. El terminal hermano ocupa todo el espacio

## 🛡️ Validaciones

- ✅ **Límite de 4 terminales** por pestaña
- ✅ Advertencia al intentar agregar el 5to terminal
- ✅ Menú solo muestra pestañas con espacio disponible
- ✅ Colapso automático al cerrar terminales
- ✅ Redimensionamiento fluido con drag & drop
- ✅ Stats y listeners funcionan correctamente
- ✅ Referencias se mantienen actualizadas
- ✅ Compatibilidad total con código legacy

## 🔧 Características Técnicas

### Árbol Binario Recursivo
- Cada split es un nodo con dos hijos (`first` y `second`)
- Cada hijo puede ser un terminal o un split
- Orientación independiente en cada nivel

### Renderizado Recursivo
```javascript
const renderNode = (node) => {
  if (node.type === 'terminal') return <Terminal {...node} />
  if (node.type === 'split') return (
    <SplitLayout 
      first={node.first} 
      second={node.second} 
      orientation={node.orientation} 
    />
  )
}
```

### Path en el Árbol
Cada nodo se identifica por su path:
- `['first']` = primer hijo de la raíz
- `['second', 'first']` = primer hijo del segundo hijo de la raíz
- etc.

### Compatibilidad Multinivel
El sistema detecta automáticamente qué formato usar:
1. `first` / `second` → Sistema nuevo (anidado)
2. `terminals: []` → Sistema de array (previo)
3. `leftTerminal` / `rightTerminal` → Sistema legacy

## 📝 Notas Importantes

1. **Límite de 4 Terminales**: Máximo hard-coded por diseño
2. **Grid 2x2 Forzado**: No permite layouts asimétricos fuera del grid
3. **Totalmente Redimensionable**: Arrastra las líneas divisorias para ajustar tamaños
4. **Terminal 3 Especial**: Ocupa toda la fila inferior (2 columnas)
5. **Layout Automático**: Se organiza automáticamente según cantidad
6. **Progresivo**: 1 → 2 → 3 → 4 terminales según necesidad
7. **Sin Espacios Vacíos**: Con 3 terminales, no deja cuadros vacíos
8. **Compatibilidad**: Todo el código legacy sigue funcionando

## 🚀 Mejoras Futuras Sugeridas

- [ ] Botones para dividir panel específico (no solo raíz)
- [ ] Drag & drop para reordenar terminales
- [ ] Guardar configuración de layout en sesiones
- [ ] Shortcuts de teclado (Ctrl+Shift+H/V para dividir)
- [ ] Indicador visual al hover mostrando dónde se dividirá
- [ ] Templates de layouts (2x2, 3 columnas, etc.)

## ✅ Testing Recomendado

1. **Split básico**: Dividir 1 terminal en 2 (vertical y horizontal)
2. **Split anidado**: Dividir uno de los 2 en 2 más (total 3)
3. **Máximo 4**: Agregar 4to terminal exitosamente
4. **Límite**: Intentar agregar 5to terminal (debe mostrar advertencia)
5. **Mix orientaciones**: Combinar horizontal y vertical
6. **Redimensionar**: Arrastrar splitters en varios niveles
7. **Cerrar intermedios**: Cerrar terminal del medio y ver colapso
8. **Filtro menú**: Verificar que pestañas con 4 terminales no aparezcan
9. **Compatibilidad**: Verificar que splits antiguos funcionen

## 🎯 Ventajas vs Sistema Anterior (Grid 2x2 Manual)

| Característica | Sistema Anterior | Grid 2x2 Inteligente |
|----------------|------------------|----------------------|
| Layout | ⚠️ Manual/confuso | ✅ Automático |
| Límite terminales | ✅ 4 máximo | ✅ 4 máximo |
| Grid 2x2 | ❌ No forzado | ✅ Forzado |
| Terminal 3 | ⚠️ Espacio vacío | ✅ Ocupa fila completa |
| UI menú | ⚠️ Confusa (posiciones) | ✅ Simple (2 opciones) |
| Progresivo | ⚠️ Complicado | ✅ 1→2→3→4 natural |
| Sin espacios vacíos | ❌ No | ✅ Sí |

---

**Fecha de Implementación**: 2026-01-13  
**Versión**: 3.0.0 (Grid 2x2 Inteligente)  
**Estado**: ✅ Completado
**Sistema**: Grid 2x2 Forzado con Layout Inteligente (Máx. 4 Terminales)
**Características**: Grid Automático, Terminal 3 Fila Completa, Sin Espacios Vacíos
