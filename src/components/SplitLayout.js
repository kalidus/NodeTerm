import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Splitter, SplitterPanel } from 'primereact/splitter';
import TerminalComponent from './TerminalComponent';

// Utilidad para ajustar brillo de un color hex
function adjustColorBrightness(hex, percent) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex;
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.min(255, Math.max(0, Math.round(r + (percent / 100) * 255)));
    g = Math.min(255, Math.max(0, Math.round(g + (percent / 100) * 255)));
    b = Math.min(255, Math.max(0, Math.round(b + (percent / 100) * 255)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Devuelve un color totalmente opaco a partir de posibles valores con alfa
function toSolidColor(color) {
    if (!color || typeof color !== 'string') return color;

    // rgba(r, g, b, a) -> rgb(r, g, b)
    if (color.startsWith('rgba')) {
        try {
            const parts = color
                .replace('rgba(', '')
                .replace(')', '')
                .split(',')
                .map((p) => p.trim());
            const r = parseInt(parts[0], 10);
            const g = parseInt(parts[1], 10);
            const b = parseInt(parts[2], 10);
            if (Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)) {
                return `rgb(${r}, ${g}, ${b})`;
            }
        } catch (_) {
            return color;
        }
    }

    // #RRGGBBAA -> #RRGGBB
    if (/^#([0-9a-fA-F]{8})$/.test(color)) {
        return `#${color.slice(1, 7)}`;
    }

    // #RGBA -> #RRGGBB (expansión simple)
    if (/^#([0-9a-fA-F]{4})$/.test(color)) {
        const r = color[1];
        const g = color[2];
        const b = color[3];
        return `#${r}${r}${g}${g}${b}${b}`;
    }

    return color;
}

// Helpers para calcular contraste
function parseColorToRgb(color) {
    if (!color || typeof color !== 'string') return null;
    if (color.startsWith('#')) {
        const hex = color.slice(1);
        if (hex.length === 3 || hex.length === 4) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return { r, g, b };
        }
        if (hex.length === 6 || hex.length === 8) {
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return { r, g, b };
        }
        return null;
    }
    if (color.startsWith('rgb')) {
        try {
            const parts = color.replace(/rgba?\(/, '').replace(')', '').split(',');
            const r = parseInt(parts[0].trim(), 10);
            const g = parseInt(parts[1].trim(), 10);
            const b = parseInt(parts[2].trim(), 10);
            if ([r, g, b].every(n => Number.isFinite(n))) return { r, g, b };
        } catch (_) { return null; }
    }
    return null;
}

function perceivedBrightness(rgb) {
    if (!rgb) return 0;
    const { r, g, b } = rgb;
    return 0.299 * r + 0.587 * g + 0.114 * b;
}

function adjustRgbBrightness(rgb, factor) {
    // factor in [-1, 1]; >0 lighten towards white, <0 darken towards black
    const amt = Math.max(-1, Math.min(1, factor));
    const lighten = amt > 0;
    const mix = Math.abs(amt);
    const mixChannel = (v) => {
        if (lighten) return Math.round(v + (255 - v) * mix);
        return Math.round(v * (1 - mix));
    };
    const r = mixChannel(rgb.r);
    const g = mixChannel(rgb.g);
    const b = mixChannel(rgb.b);
    return `rgb(${r}, ${g}, ${b})`;
}

// Obtiene un color sólido a partir del tema o del prop splitterColor
function getSolidSplitterColor(theme, splitterColor) {
    if (splitterColor) return toSolidColor(splitterColor);
    const bg = theme?.background || '#2d2d2d';
    const isDark = bg.startsWith('#') && parseInt(bg.slice(1, 3), 16) < 128;
    const rgbBg = parseColorToRgb(bg);
    const prefer = theme?.splitter || theme?.cursor || theme?.cursorAccent || theme?.selection || theme?.selectionBackground || theme?.foreground;
    if (prefer) {
        const solid = toSolidColor(prefer);
        const rgb = parseColorToRgb(solid);
        if (rgb && rgbBg) {
            const diff = Math.abs(perceivedBrightness(rgb) - perceivedBrightness(rgbBg));
            if (diff >= 40) return solid; // contraste aceptable
        } else {
            return solid;
        }
    }
    return isDark ? '#FFFFFF' : '#000000';
}

const SplitLayout = ({ 
  // Nuevo sistema: árbol de splits anidados
  first, // Primer nodo (puede ser terminal o split)
  second, // Segundo nodo (puede ser terminal o split)
  orientation = 'vertical',
  
  // Legacy: compatibilidad con sistema anterior
  terminals = [],
  leftTerminal,
  rightTerminal,
  
  // Props comunes
  fontFamily,
  fontSize, 
  theme, 
  onContextMenu, 
  sshStatsByTabId,
  terminalRefs,
  statusBarIconTheme = 'classic',
  externalPaneSize = null,
  onManualResize = null,
  onPaneSizeChange = null,
  splitterColor,
  onCloseLeft = null,
  onCloseRight = null,
  onClosePanel = null,
  path = [] // Path en el árbol para identificar este nodo
}) => {
  const leftTerminalRef = useRef(null);
  const rightTerminalRef = useRef(null);
  
  // Determinar qué sistema usar
  const isNestedSystem = first || second;
  const isArraySystem = terminals && terminals.length > 0;
  const isLegacySystem = leftTerminal && rightTerminal;
  
  // Asegurar que siempre haya un color de separador válido desde el inicio
  // Usar transparencia para que el separador sea visible sobre cualquier fondo
  const effectiveSplitterColor = React.useMemo(() => {
    // Intentar determinar si el tema es oscuro o claro
    const bgColor = splitterColor || theme?.background || '#2d2d2d';
    
    // Si el color de fondo es muy oscuro, usar blanco semi-transparente
    // Si es claro, usar negro semi-transparente
    const isLikelyDark = bgColor.includes('#') && 
      parseInt(bgColor.slice(1, 3), 16) < 128;
    
    return isLikelyDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.15)';
  }, [splitterColor, theme?.background]);
  
  // Estado para funcionalidad de colapso (solo para vertical)
  const [isCollapsed, setIsCollapsed] = useState(false);
  const enableCollapse = orientation === 'vertical'; // Solo colapso en vertical
  
  // Configuración del splitter basado en el sidebar que funciona perfecto
  const collapsedSize = 4; // Porcentaje cuando está colapsado (como el sidebar: 44px de ~1000px = ~4%)
  const defaultSize = orientation === 'vertical' ? 30 : 30; // Tamaño por defecto (30% para horizontal - 40% más pequeño)
  
  // Función para manejar resize del splitter
  const handleResize = useCallback((e) => {
    if (onManualResize) {
      onManualResize();
    }
  }, [onManualResize]);
  
  // Función para toggle del colapso (mantener funcionalidad)
  const handleToggleCollapse = useCallback(() => {
    setIsCollapsed(prev => !prev);
  }, []);

  // Aplicar optimizaciones del sidebar que funciona perfecto
  useEffect(() => {
    const splitterElement = document.querySelector('.terminal-splitter');
    if (!splitterElement) return;

    const handleResizeStart = (e) => {
      // Solo aplicar optimizaciones si el click es en el gutter (igual que el sidebar)
      if (e.target.classList.contains('p-splitter-gutter')) {
        splitterElement.classList.add('p-splitter-resizing');
        // Deshabilitar transiciones durante el redimensionamiento para fluidez
        document.documentElement.style.setProperty('--split-transition', 'none');
      }
    };

    const handleResizeEnd = () => {
      splitterElement.classList.remove('p-splitter-resizing');
      // Reactivar transiciones después del redimensionamiento
      document.documentElement.style.removeProperty('--split-transition');
    };

    // Eventos para detectar inicio y fin del redimensionamiento (igual que el sidebar)
    splitterElement.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mouseup', handleResizeEnd);
    
    return () => {
      splitterElement.removeEventListener('mousedown', handleResizeStart);
      document.removeEventListener('mouseup', handleResizeEnd);
    };
  }, []);

  // Forzar fit de los terminales después de que se monten
  useEffect(() => {
    const timer = setTimeout(() => {
      // Fit todos los terminales en terminalRefs
      if (terminalRefs && terminalRefs.current) {
        Object.values(terminalRefs.current).forEach(ref => {
          if (ref?.fit) ref.fit();
        });
      }
      // Sistema legacy
      if (leftTerminalRef.current?.fit) {
        leftTerminalRef.current.fit();
      }
      if (rightTerminalRef.current?.fit) {
        rightTerminalRef.current.fit();
      }
    }, 200);
    
    return () => clearTimeout(timer);
  }, [first, second, leftTerminal, rightTerminal, terminalRefs]);

  // Asegurar que los terminales se inicialicen correctamente
  useEffect(() => {
    const timer = setTimeout(() => {
      // Focus en el primer terminal disponible
      if (terminalRefs && terminalRefs.current) {
        const firstRef = Object.values(terminalRefs.current)[0];
        if (firstRef?.focus) {
          firstRef.focus();
        }
      }
      // Sistema legacy
      else if (leftTerminalRef.current?.focus) {
        leftTerminalRef.current.focus();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [first, second, leftTerminal, terminalRefs]);

  // Función recursiva para renderizar un nodo del árbol (terminal o split)
  const renderNode = useCallback((node, nodePath, nodeOrientation = 'vertical') => {
    if (!node) return null;
    
    // Si es un terminal, renderizarlo
    if (node.type === 'terminal') {
      if (node.content) {
        return node.content;
      }
      
      return (
        <div style={{ 
          width: '100%', 
          height: '100%', 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Botón para cerrar este terminal (solo si onClosePanel existe) */}
          {onClosePanel && (
            <button
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(220, 53, 69, 0.8)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 1000,
                transition: 'all 0.2s ease',
                opacity: 0.7
              }}
              onClick={() => onClosePanel(nodePath)}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Cerrar terminal"
            >
              ×
            </button>
          )}
          
          <TerminalComponent
            ref={el => {
              if (terminalRefs) {
                terminalRefs.current[node.key] = el;
              }
            }}
            key={node.key}
            tabId={node.key}
            sshConfig={node.sshConfig || {}}
            fontFamily={fontFamily}
            fontSize={fontSize}
            theme={theme}
            onContextMenu={onContextMenu}
            active={true}
            stats={sshStatsByTabId?.[node.key] || {}}
            hideStatusBar={true}
            statusBarIconTheme={statusBarIconTheme}
          />
        </div>
      );
    }
    
    // Si es un split, renderizarlo recursivamente
    if (node.type === 'split') {
      return (
        <SplitLayout
          first={node.first}
          second={node.second}
          orientation={node.orientation || 'vertical'}
          fontFamily={fontFamily}
          fontSize={fontSize}
          theme={theme}
          onContextMenu={onContextMenu}
          sshStatsByTabId={sshStatsByTabId}
          terminalRefs={terminalRefs}
          statusBarIconTheme={statusBarIconTheme}
          splitterColor={splitterColor}
          onClosePanel={onClosePanel}
          path={nodePath}
        />
      );
    }
    
    return null;
  }, [fontFamily, fontSize, theme, onContextMenu, sshStatsByTabId, statusBarIconTheme, terminalRefs, splitterColor, onClosePanel]);

  // Convertir árbol anidado a array plano para grid 2x2
  const terminalsArray = React.useMemo(() => {
    if (isNestedSystem) {
      const extractTerminals = (node, result = []) => {
        if (!node) return result;
        if (node.type === 'terminal') {
          result.push(node);
        } else if (node.type === 'split') {
          extractTerminals(node.first, result);
          extractTerminals(node.second, result);
        }
        return result;
      };
      return extractTerminals({ type: 'split', first, second });
    }
    if (isArraySystem) {
      return terminals;
    }
    if (isLegacySystem) {
      return [leftTerminal, rightTerminal];
    }
    return [];
  }, [isNestedSystem, first, second, isArraySystem, terminals, isLegacySystem, leftTerminal, rightTerminal]);

  // NUEVO SISTEMA: Grid 2x2 inteligente con splitters redimensionables
  if (terminalsArray.length > 0 && terminalsArray.length <= 4) {
    const terminalCount = terminalsArray.length;
    const visibleLineColor = getSolidSplitterColor(theme, splitterColor);
    
    const [verticalSplit, setVerticalSplit] = useState(50); // % para división vertical (T1/T2)
    const [horizontalSplit, setHorizontalSplit] = useState(50); // % para división horizontal (arriba/abajo)
    const [verticalSplitBottom, setVerticalSplitBottom] = useState(50); // % para división vertical inferior (T3/T4)
    const [isDragging, setIsDragging] = useState(null); // 'v-top', 'h', 'v-bottom'
    
    const handleMouseDown = (splitterType) => (e) => {
      e.preventDefault();
      setIsDragging(splitterType);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = splitterType === 'h' ? 'row-resize' : 'col-resize';
    };
    
    const handleMouseMove = useCallback((e) => {
      if (!isDragging) return;
      
      const container = document.querySelector('[data-grid-container]');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      
      if (isDragging === 'h') {
        const newSplit = ((e.clientY - rect.top) / rect.height) * 100;
        setHorizontalSplit(Math.max(20, Math.min(80, newSplit)));
      } else if (isDragging === 'v-top') {
        const newSplit = ((e.clientX - rect.left) / rect.width) * 100;
        setVerticalSplit(Math.max(20, Math.min(80, newSplit)));
      } else if (isDragging === 'v-bottom') {
        const newSplit = ((e.clientX - rect.left) / rect.width) * 100;
        setVerticalSplitBottom(Math.max(20, Math.min(80, newSplit)));
      }
    }, [isDragging]);
    
    const handleMouseUp = useCallback(() => {
      setIsDragging(null);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }, []);
    
    useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);
    
    const splitterStyle = (isVertical) => ({
      position: 'absolute',
      background: 'transparent',
      backgroundImage: isVertical
        ? `linear-gradient(to right, transparent calc(50% - 1px), ${visibleLineColor} calc(50% - 1px), ${visibleLineColor} calc(50% + 1px), transparent calc(50% + 1px))`
        : `linear-gradient(to bottom, transparent calc(50% - 1px), ${visibleLineColor} calc(50% - 1px), ${visibleLineColor} calc(50% + 1px), transparent calc(50% + 1px))`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      cursor: isVertical ? 'col-resize' : 'row-resize',
      zIndex: 10,
      transition: 'filter 0.15s ease'
    });

    const renderTerminal = (terminal, index) => {
      if (!terminal) return null;
      
      if (terminal.content) {
        return terminal.content;
      }
      
      return (
        <>
          {/* Botón para cerrar este terminal (solo si hay más de 1) */}
          {terminalCount > 1 && onClosePanel && (
            <button
              style={{
                position: 'absolute',
                top: '4px',
                right: '4px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                background: 'rgba(220, 53, 69, 0.8)',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold',
                zIndex: 1000,
                transition: 'all 0.2s ease',
                opacity: 0.7
              }}
              onClick={() => {
                if (isNestedSystem) {
                  onClosePanel([...path, index]);
                } else {
                  onClosePanel(index);
                }
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.7';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              title="Cerrar terminal"
            >
              ×
            </button>
          )}
          
          <TerminalComponent
            ref={el => {
              if (terminalRefs) {
                terminalRefs.current[terminal.key] = el;
              }
            }}
            key={terminal.key}
            tabId={terminal.key}
            sshConfig={terminal.sshConfig || {}}
            fontFamily={fontFamily}
            fontSize={fontSize}
            theme={theme}
            onContextMenu={onContextMenu}
            active={true}
            stats={sshStatsByTabId?.[terminal.key] || {}}
            hideStatusBar={true}
            statusBarIconTheme={statusBarIconTheme}
          />
        </>
      );
    };

    // Renderizado con splitters redimensionables
    if (terminalCount === 1) {
      // 1 terminal: ocupa todo
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {renderTerminal(terminalsArray[0], 0)}
        </div>
      );
    }
    
    if (terminalCount === 2) {
      // 2 terminales: respetar orientación (vertical u horizontal)
      const isHorizontal = orientation === 'horizontal';
      
      if (isHorizontal) {
        // Split horizontal: uno arriba, otro abajo
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }} data-grid-container>
            <div style={{ width: '100%', height: `${horizontalSplit}%`, position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[0], 0)}
            </div>
            <div
              style={{ ...splitterStyle(false), width: '100%', height: '8px', top: `${horizontalSplit}%`, marginTop: '-4px' }}
              onMouseDown={handleMouseDown('h')}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            />
            <div style={{ width: '100%', height: `${100 - horizontalSplit}%`, position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[1], 1)}
            </div>
          </div>
        );
      } else {
        // Split vertical: uno a la izquierda, otro a la derecha
        return (
          <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex' }} data-grid-container>
            <div style={{ width: `${verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[0], 0)}
            </div>
            <div
              style={{ ...splitterStyle(true), width: '8px', height: '100%', left: `${verticalSplit}%`, marginLeft: '-4px' }}
              onMouseDown={handleMouseDown('v-top')}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            />
            <div style={{ width: `${100 - verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[1], 1)}
            </div>
          </div>
        );
      }
    }
    
    if (terminalCount === 3) {
      // 3 terminales: 2 arriba (split vertical) + 1 abajo (toda la fila)
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }} data-grid-container>
          {/* Fila superior: T1 y T2 */}
          <div style={{ width: '100%', height: `${horizontalSplit}%`, position: 'relative', display: 'flex' }}>
            <div style={{ width: `${verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[0], 0)}
            </div>
            <div
              style={{ ...splitterStyle(true), width: '8px', height: '100%', left: `${verticalSplit}%`, marginLeft: '-4px' }}
              onMouseDown={handleMouseDown('v-top')}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            />
            <div style={{ width: `${100 - verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[1], 1)}
            </div>
          </div>
          {/* Splitter horizontal */}
          <div
            style={{ ...splitterStyle(false), width: '100%', height: '8px', top: `${horizontalSplit}%`, marginTop: '-4px' }}
            onMouseDown={handleMouseDown('h')}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          />
          {/* Fila inferior: T3 */}
          <div style={{ width: '100%', height: `${100 - horizontalSplit}%`, position: 'relative', overflow: 'hidden' }}>
            {renderTerminal(terminalsArray[2], 2)}
          </div>
        </div>
      );
    }
    
    if (terminalCount === 4) {
      // 4 terminales: Grid 2x2 completo redimensionable
      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }} data-grid-container>
          {/* Fila superior: T1 y T2 */}
          <div style={{ width: '100%', height: `${horizontalSplit}%`, position: 'relative', display: 'flex' }}>
            <div style={{ width: `${verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[0], 0)}
            </div>
            <div
              style={{ ...splitterStyle(true), width: '8px', height: '100%', left: `${verticalSplit}%`, marginLeft: '-4px' }}
              onMouseDown={handleMouseDown('v-top')}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            />
            <div style={{ width: `${100 - verticalSplit}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[1], 1)}
            </div>
          </div>
          {/* Splitter horizontal */}
          <div
            style={{ ...splitterStyle(false), width: '100%', height: '8px', top: `${horizontalSplit}%`, marginTop: '-4px' }}
            onMouseDown={handleMouseDown('h')}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          />
          {/* Fila inferior: T3 y T4 */}
          <div style={{ width: '100%', height: `${100 - horizontalSplit}%`, position: 'relative', display: 'flex' }}>
            <div style={{ width: `${verticalSplitBottom}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[2], 2)}
            </div>
            <div
              style={{ ...splitterStyle(true), width: '8px', height: '100%', left: `${verticalSplitBottom}%`, marginLeft: '-4px' }}
              onMouseDown={handleMouseDown('v-bottom')}
              onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            />
            <div style={{ width: `${100 - verticalSplitBottom}%`, height: '100%', position: 'relative', overflow: 'hidden' }}>
              {renderTerminal(terminalsArray[3], 3)}
            </div>
          </div>
        </div>
      );
    }
  }

  // Sistema antiguo de splits anidados (para casos edge o legacy que no se convirtieron)
  if (isNestedSystem) {
    const [leftSize, setLeftSize] = useState(50);
    const [isDragging, setIsDragging] = useState(false);
    const isVertical = orientation === 'vertical';
    
    const containerStyle = {
      display: 'flex',
      flexDirection: isVertical ? 'row' : 'column',
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      background: theme?.background || '#2d2d2d'
    };
    
    const firstPaneStyle = {
      width: isVertical ? `${leftSize}%` : '100%',
      height: isVertical ? '100%' : `${leftSize}%`,
      overflow: 'hidden',
      minWidth: isVertical ? '100px' : 'auto',
      minHeight: isVertical ? 'auto' : '100px',
      display: 'flex',
      flexDirection: 'column'
    };
    
    const secondPaneStyle = {
      width: isVertical ? `${100 - leftSize}%` : '100%',
      height: isVertical ? '100%' : `${100 - leftSize}%`,
      overflow: 'hidden',
      minWidth: isVertical ? '100px' : 'auto',
      minHeight: isVertical ? 'auto' : '100px',
      display: 'flex',
      flexDirection: 'column'
    };
    
    const visibleLineColor = getSolidSplitterColor(theme, splitterColor);
    
    const gutterStyle = {
      width: isVertical ? '8px' : '100%',
      height: isVertical ? '100%' : '8px',
      cursor: isVertical ? 'col-resize' : 'row-resize',
      flexShrink: 0,
      position: 'relative',
      zIndex: 10,
      transition: 'filter 0.15s ease',
      userSelect: 'none',
      background: 'transparent',
      backgroundImage: isVertical 
        ? `linear-gradient(to right, transparent calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% + 1px), transparent calc(50% + 1px))`
        : `linear-gradient(to bottom, transparent calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% + 1px), transparent calc(50% + 1px))`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%'
    };
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = isVertical ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    };
    
    const handleMouseMove = useCallback((e) => {
      if (!isDragging) return;
      
      const container = e.currentTarget.closest('[data-split-container]');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newSize = isVertical
        ? ((e.clientX - rect.left) / rect.width) * 100
        : ((e.clientY - rect.top) / rect.height) * 100;
      
      setLeftSize(Math.max(10, Math.min(90, newSize)));
    }, [isDragging, isVertical]);
    
    const handleMouseUp = useCallback(() => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }, []);
    
    useEffect(() => {
      if (isDragging) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);
    
    return (
      <div style={containerStyle} data-split-container="true">
        <div style={firstPaneStyle}>
          {renderNode(first, [...path, 'first'], orientation)}
        </div>
        
        <div 
          style={gutterStyle}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Arrastra para redimensionar"
        />
        
        <div style={secondPaneStyle}>
          {renderNode(second, [...path, 'second'], orientation)}
        </div>
      </div>
    );
  }

  // CÓDIGO LEGACY: Sistema original de 2 paneles con leftTerminal/rightTerminal
  // Se mantiene para compatibilidad durante la transición
  const gutterStyle = {
    transition: 'none',
    background: 'transparent',
    borderColor: 'transparent',
    width: orientation === 'vertical' ? '6px' : '100%',
    height: orientation === 'horizontal' ? '8px' : '100%',
    cursor: orientation === 'vertical' ? 'col-resize' : 'row-resize',
    margin: orientation === 'vertical' ? '0 -4px' : '0',
    position: 'relative',
    zIndex: 10
  };

  // Usar PrimeReact solo para vertical, sistema original para horizontal
  if (orientation === 'horizontal') {
    // Mantener sistema original para HomeTab
    const isVertical = orientation === 'vertical';
    const containerStyle = {
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: isVertical ? 'row' : 'column',
      overflow: 'hidden'
    };

    const primaryPaneSize = externalPaneSize !== null ? externalPaneSize : 400;

    const primaryPaneStyle = {
      width: isVertical ? `${primaryPaneSize}px` : '100%',
      height: isVertical ? '100%' : `${primaryPaneSize}px`,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      // La transición se aplica SOLO cuando no se está arrastrando (ver estilos finales).
      transition: 'none'
    };

    const secondaryPaneStyle = {
      width: isVertical ? `calc(100% - ${primaryPaneSize}px)` : '100%',
      height: isVertical ? '100%' : `calc(100% - ${primaryPaneSize}px)`,
      minHeight: isVertical ? 'auto' : '40px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      // La transición se aplica SOLO cuando no se está arrastrando (ver estilos finales).
      transition: 'none',
      background: theme?.background || undefined
    };

    // Necesitamos agregar el handle de resize horizontal
    const [internalPaneSize, setInternalPaneSize] = useState(() => {
      // Si hay un externalPaneSize, usarlo como inicial, sino calcular 70% de la altura
      return externalPaneSize !== null ? externalPaneSize : Math.max(window.innerHeight * 0.7, 200);
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, size: 0 });
    const dragRafRef = useRef(0);
    const latestDragSizeRef = useRef(internalPaneSize);
    
    // Durante el redimensionamiento, usar internalPaneSize, sino usar externalPaneSize si está disponible
    const finalPrimaryPaneSize = isDragging ? internalPaneSize : (externalPaneSize !== null ? externalPaneSize : internalPaneSize);
    
    // Actualizar los estilos con el tamaño final
    const finalPrimaryPaneStyle = {
      ...primaryPaneStyle,
      height: `${finalPrimaryPaneSize}px`,
      position: 'relative',
      // Desactivar transiciones durante el drag para evitar "lag" visual
      transition: isDragging ? 'none' : (externalPaneSize !== null ? 'all 0.1s ease' : 'none')
    };
    
    const finalSecondaryPaneStyle = {
      ...secondaryPaneStyle,
      height: `calc(100% - ${finalPrimaryPaneSize}px)`,
      transition: isDragging ? 'none' : (externalPaneSize !== null ? 'all 0.1s ease' : 'none')
    };

    // Handlers de resize horizontal
    const handleMouseDown = useCallback((e) => {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        size: finalPrimaryPaneSize
      });
      latestDragSizeRef.current = finalPrimaryPaneSize;
      
      if (externalPaneSize !== null && onManualResize) {
        onManualResize();
      }
    }, [finalPrimaryPaneSize, externalPaneSize, onManualResize]);

    const handleMouseMove = useCallback((e) => {
      if (!isDragging) return;
      
      const delta = e.clientY - dragStart.y;
      const newSize = Math.round(dragStart.size + delta);
      
      const minSize = 100;
      const maxSize = window.innerHeight - 100;
      
      const clampedSize = Math.max(minSize, Math.min(maxSize, newSize));
      // Guardar y aplicar el tamaño a 1 update por frame (más suave)
      latestDragSizeRef.current = clampedSize;
      if (dragRafRef.current) return;
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = 0;
        setInternalPaneSize(latestDragSizeRef.current);
      });
    }, [isDragging, dragStart, onPaneSizeChange]);

    const handleMouseUp = useCallback(() => {
      if (isDragging) {
        setIsDragging(false);
        // Cancelar RAF pendiente si lo hay
        if (dragRafRef.current) {
          cancelAnimationFrame(dragRafRef.current);
          dragRafRef.current = 0;
        }
        // Notificar al padre SOLO al soltar, evitando rerenders pesados durante el drag
        if (onPaneSizeChange) {
          onPaneSizeChange(latestDragSizeRef.current);
        }
      }
    }, [isDragging, onPaneSizeChange]);

    // Event listeners para el drag horizontal
    React.useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
        };
      }
    }, [isDragging, handleMouseMove, handleMouseUp]);

    // Calcular color del separador horizontal con buen contraste
    const horizontalBaseColor = getSolidSplitterColor(theme, splitterColor);
    const bgForHorizontal = theme?.background || '#2d2d2d';
    const bgH = parseColorToRgb(bgForHorizontal);
    const lineH = parseColorToRgb(horizontalBaseColor);
    let visibleHorizontalColor = horizontalBaseColor;
    if (bgH && lineH) {
      const diff = Math.abs(perceivedBrightness(bgH) - perceivedBrightness(lineH));
      if (diff < 40) {
        const isBgDark = perceivedBrightness(bgH) < 128;
        visibleHorizontalColor = adjustRgbBrightness(lineH, isBgDark ? 0.6 : -0.6);
      }
    }

    // Estilo del handle horizontal (área de 8px con línea central de 2px)
    const horizontalHandleStyle = {
      position: 'absolute',
      bottom: '-4px',
      left: 0,
      width: '100%',
      height: '8px',
      background: 'transparent',
      backgroundImage: `linear-gradient(to bottom, transparent calc(50% - 1px), var(--ui-tab-border, ${visibleHorizontalColor}) calc(50% - 1px), var(--ui-tab-border, ${visibleHorizontalColor}) calc(50% + 1px), transparent calc(50% + 1px))`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: '100% 100%',
      cursor: 'row-resize',
      zIndex: 1000,
      userSelect: 'none',
      transition: 'filter 0.2s ease'
    };

    return (
      <div style={containerStyle}>
        <div style={finalPrimaryPaneStyle}>
          {leftTerminal.content ? (
            leftTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
              }}
              key={leftTerminal.key}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
          
          {/* Handle de resize horizontal */}
          <div 
            style={horizontalHandleStyle}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            title="Arrastra para redimensionar"
          />
        </div>
        
        <div style={finalSecondaryPaneStyle}>
          {rightTerminal.content ? (
            rightTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
              }}
              key={rightTerminal.key}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </div>
    );
  }

  // Implementación simple sin PrimeReact para vertical
  if (orientation === 'vertical') {
    const [leftSize, setLeftSize] = useState(30); // 30% más pequeño
    const [isDragging, setIsDragging] = useState(false);
    const verticalSplitterColor = getSolidSplitterColor(theme, splitterColor);
    const bgForContrast = theme?.background || '#2d2d2d';
    const bgRgb = parseColorToRgb(bgForContrast);
    const lineRgb = parseColorToRgb(verticalSplitterColor);
    let visibleLineColor = verticalSplitterColor;
    if (bgRgb && lineRgb) {
      const diff = Math.abs(perceivedBrightness(bgRgb) - perceivedBrightness(lineRgb));
      if (diff < 40) {
        // Mantener tono del tema pero ajustar brillo para buen contraste
        const isBgDark = perceivedBrightness(bgRgb) < 128;
        visibleLineColor = adjustRgbBrightness(lineRgb, isBgDark ? 0.6 : -0.6);
      }
    }
    const gutterRef = useRef(null);
    const lineRef = useRef(null);

    // Alinear la línea al pixel para evitar artefactos (doble línea por subpíxeles)
    useEffect(() => {
      const updateLineLeft = () => {
        const gutter = gutterRef.current;
        const line = lineRef.current;
        if (!gutter || !line) return;
        const gutterWidth = gutter.clientWidth; // entero en CSS px
        const lineWidth = 2; // px
        const left = Math.max(0, Math.round((gutterWidth - lineWidth) / 2));
        line.style.left = `${left}px`;
      };
      updateLineLeft();
      const ro = new ResizeObserver(updateLineLeft);
      if (gutterRef.current) ro.observe(gutterRef.current);
      window.addEventListener('resize', updateLineLeft);
      return () => {
        window.removeEventListener('resize', updateLineLeft);
        ro.disconnect();
      };
    }, []);
    
    const handleMouseDown = (e) => {
      e.preventDefault();
      setIsDragging(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      // Buscar el contenedor split
      const container = document.querySelector('.split-container');
      if (!container) return;
      
      const rect = container.getBoundingClientRect();
      const newLeftSize = ((e.clientX - rect.left) / rect.width) * 100;
      setLeftSize(Math.max(20, Math.min(80, newLeftSize)));
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    
    useEffect(() => {
      if (isDragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [isDragging]);
    
    return (
      <div className="split-container" style={{ 
        height: '100%', 
        width: '100%', 
        display: 'flex',
        flexDirection: 'row',
        overflow: 'hidden',
        background: theme?.background || 'transparent'
      }}>
        {/* Panel izquierdo */}
        <div style={{
          width: `${leftSize}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: '200px',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          background: theme?.background || 'transparent'
        }}>
          {leftTerminal.content ? (
            leftTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
              }}
              key={leftTerminal.key}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
        
        {/* Gutter (vertical) - área de agarre 8px con línea central dibujada por gradiente */}
        <div 
          style={{
            width: '8px',
            height: '100%',
            cursor: 'col-resize',
            flexShrink: 0,
            position: 'relative',
            zIndex: 10,
            transition: 'filter 0.15s ease',
            userSelect: 'none',
            background: 'transparent',
            backgroundImage: `linear-gradient(to right, transparent calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% - 1px), var(--ui-tab-border, ${visibleLineColor}) calc(50% + 1px), transparent calc(50% + 1px))`,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%'
          }}
          ref={gutterRef}
          onMouseDown={handleMouseDown}
          onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
          title="Arrastra para redimensionar"
        >
          {/* línea se dibuja con backgroundImage */}
        </div>
        
        {/* Panel derecho */}
        <div style={{
          width: `${100 - leftSize}%`,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: '200px',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          background: theme?.background || 'transparent'
        }}>
          {rightTerminal.content ? (
            rightTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
              }}
              key={rightTerminal.key}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </div>
    );
  }

  // PrimeReact Splitter para horizontal (mantener como estaba)
  return (
    <Splitter
      style={{ height: '100%', width: '100%', border: 'none' }}
      layout={orientation}
      onResize={handleResize}
      className="terminal-splitter"
      pt={{
        gutter: {
          style: gutterStyle
        },
        root: {
          style: {
            border: 'none',
            height: '100%',
            width: '100%'
          }
        }
      }}
    >
      <SplitterPanel
        size={(enableCollapse && isCollapsed) ? collapsedSize : defaultSize}
        minSize={(enableCollapse && isCollapsed) ? collapsedSize : 200}
        maxSize={(enableCollapse && isCollapsed) ? collapsedSize : 90}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          transition: 'all 0.2s ease',
          minWidth: '200px',
          overflow: 'hidden'
        }}
        pt={{
          root: {
            style: {
              height: '100%',
              minWidth: '200px',
              overflow: 'hidden'
            }
          }
        }}
      >
        {/* Contenido del panel izquierdo para horizontal */}
        <div style={{ 
          flex: 1, 
          minHeight: 0, 
          display: 'flex', 
          flexDirection: 'column',
          height: '100%',
          width: '100%',
          overflow: 'hidden'
        }}>
          {leftTerminal.content ? (
            leftTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                leftTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[leftTerminal.key] = el;
              }}
              key={leftTerminal.key}
              tabId={leftTerminal.key}
              sshConfig={leftTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[leftTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </SplitterPanel>
      
      <SplitterPanel 
        minSize={200}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          background: theme?.background || undefined,
          minWidth: '200px',
          overflow: 'hidden'
        }}
        pt={{
          root: {
            style: {
              height: '100%',
              minWidth: '200px',
              overflow: 'hidden'
            }
          }
        }}
      >
        {/* Contenido del panel derecho para horizontal */}
        <div style={{ 
          flex: 1, 
          minHeight: 0,
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {rightTerminal.content ? (
            rightTerminal.content
          ) : (
            <TerminalComponent
              ref={el => {
                rightTerminalRef.current = el;
                if (terminalRefs) terminalRefs.current[rightTerminal.key] = el;
              }}
              key={rightTerminal.key}
              tabId={rightTerminal.key}
              sshConfig={rightTerminal.sshConfig || {}}
              fontFamily={fontFamily}
              fontSize={fontSize}
              theme={theme}
              onContextMenu={onContextMenu}
              active={true}
              stats={sshStatsByTabId?.[rightTerminal.key] || {}}
              hideStatusBar={true}
              statusBarIconTheme={statusBarIconTheme}
            />
          )}
        </div>
      </SplitterPanel>
    </Splitter>
  );
};

export default SplitLayout; 