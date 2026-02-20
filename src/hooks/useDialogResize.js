import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook personalizado para redimensionar diálogos desde cualquier esquina o borde
 * @param {string} storageKey - Clave para guardar el tamaño en localStorage
 * @param {Object} defaultSize - Tamaño por defecto { width, height }
 * @param {Object} constraints - Restricciones { minWidth, minHeight, maxWidth, maxHeight }
 * @returns {Object} - { dialogRef, size, setSize, startResize, isResizing }
 */
export const useDialogResize = (storageKey, defaultSize = { width: 1000, height: 800 }, constraints = {}) => {
  const dialogRef = useRef(null);
  const [size, setSize] = useState(() => {
    // Intentar cargar desde localStorage
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return {
            width: parsed.width || defaultSize.width,
            height: parsed.height || defaultSize.height
          };
        } catch (e) {
          console.warn(`Error parsing saved size for ${storageKey}:`, e);
        }
      }
    }
    return defaultSize;
  });

  const [isResizing, setIsResizing] = useState(false);
  const resizeStateRef = useRef(null);

  // Guardar tamaño en localStorage cuando cambie
  useEffect(() => {
    if (storageKey && size) {
      localStorage.setItem(storageKey, JSON.stringify(size));
    }
  }, [size, storageKey]);

  // Actualizar el tamaño del diálogo cuando cambie el tamaño
  useEffect(() => {
    const dialogElement = getDialogElement();
    if (dialogElement && size) {
      dialogElement.style.width = `${size.width}px`;
      dialogElement.style.height = `${size.height}px`;
    }
  }, [size]); // getDialogElement is stable

  // Función para obtener el elemento del diálogo
  const getDialogElement = useCallback(() => {
    // Primero intentar usar el ref si es un elemento DOM válido
    if (dialogRef.current) {
      // Verificar que sea un elemento DOM y tenga el método closest
      if (dialogRef.current instanceof Element || dialogRef.current instanceof HTMLElement) {
        if (typeof dialogRef.current.closest === 'function') {
          try {
            const found = dialogRef.current.closest('.p-dialog');
            if (found) return found;
          } catch (e) {
            // Si closest falla, continuar con el fallback
            console.warn('Error using closest:', e);
          }
        }
      }
    }
    
    // Fallback: buscar en el DOM el diálogo más reciente
    try {
      const dialogs = document.querySelectorAll('.p-dialog');
      if (dialogs.length > 0) {
        // Retornar el último diálogo (el más reciente)
        return dialogs[dialogs.length - 1];
      }
    } catch (e) {
      console.warn('Error querying dialogs:', e);
    }
    
    return null;
  }, []);

  // Función para iniciar el redimensionamiento
  const startResize = useCallback((e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dialogElement = getDialogElement();
    if (!dialogElement) return;

    // Obtener rectángulo para coordenadas absolutas actuales
    const rect = dialogElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const startTop = rect.top;

    // Detectar si hay transform (centrado)
    const computedStyle = window.getComputedStyle(dialogElement);
    const transform = computedStyle.transform;
    const hasTransform = transform !== 'none';

    setIsResizing(true);
    resizeStateRef.current = {
      direction,
      startX,
      startY,
      startWidth,
      startHeight,
      startLeft,
      startTop,
      hasTransform
    };

    // Agregar listeners globales
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Estilos globales durante resize
    document.body.style.cursor = getCursor(direction);
    document.body.style.userSelect = 'none';
    document.body.classList.add('is-resizing-dialog');
  }, [getDialogElement]);

  // Función para manejar el movimiento del mouse durante el redimensionamiento
  const handleMouseMove = useCallback((e) => {
    if (!resizeStateRef.current) return;

    const { direction, startX, startY, startWidth, startHeight, startLeft, startTop, hasTransform } = resizeStateRef.current;
    const dialogElement = getDialogElement();
    if (!dialogElement) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    // Restricciones
    const minWidth = constraints.minWidth || 400;
    const minHeight = constraints.minHeight || 300;
    const maxWidth = constraints.maxWidth || window.innerWidth * 0.98;
    const maxHeight = constraints.maxHeight || window.innerHeight * 0.98;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;
    let changePosition = false;

    // --- Lógica Horizontal (Width / Left) ---
    if (direction.includes('right')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
    } else if (direction.includes('left')) {
      // Calcular nuevo ancho
      const proposedWidth = startWidth - deltaX;
      newWidth = Math.max(minWidth, Math.min(maxWidth, proposedWidth));
      
      // Ajustar posición left compensando el cambio de ancho
      // Solo movemos el left si el ancho cambió
      const widthChange = newWidth - startWidth;
      newLeft = startLeft - widthChange; 
      changePosition = true;
    }

    // --- Lógica Vertical (Height / Top) ---
    if (direction.includes('bottom')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
    } else if (direction.includes('top')) {
      const proposedHeight = startHeight - deltaY;
      newHeight = Math.max(minHeight, Math.min(maxHeight, proposedHeight));
      
      const heightChange = newHeight - startHeight;
      newTop = startTop - heightChange;
      changePosition = true;
    }

    // Aplicar cambios al DOM
    // Si cambiamos left/top, debemos desactivar transform para evitar conflictos y doble-offsets
    if (changePosition || hasTransform) {
      if (changePosition) {
        // Convertimos a posicionamiento absoluto fijo en píxeles
        dialogElement.style.position = 'fixed'; // Asegurar fixed
        dialogElement.style.margin = '0';      // Quitar márgenes automáticos
        dialogElement.style.transform = 'none'; // Quitar centrado automático

        // Si solo cambiamos uno (e.g. left), aseguramos que el otro (top) también quede fijo
        // en su posición actual para que no salte.
        if (direction.includes('left') || direction.includes('right')) {
             // Si estamos moviendo horizontalmente, aseguramos top fijo
             dialogElement.style.top = `${startTop}px`; // O usar newTop si cambió
        }
        if (direction.includes('top') || direction.includes('bottom')) {
             // Si estamos moviendo verticalmente, aseguramos left fijo
             dialogElement.style.left = `${startLeft}px`; // O usar newLeft
        }

        // Aplicar nuevas coordenadas calculadas
        if (direction.includes('left')) dialogElement.style.left = `${newLeft}px`;
        if (direction.includes('top')) dialogElement.style.top = `${newTop}px`;
        
        // Si no se incluyó 'left' en la dirección pero teníamos transform,
        // necesitamos fijar el left actual porque quitamos el transform.
        if (!direction.includes('left') && hasTransform) {
             dialogElement.style.left = `${startLeft}px`;
        }
        if (!direction.includes('top') && hasTransform) {
             dialogElement.style.top = `${startTop}px`;
        }
      } 
      // Si no cambiamos posición pero teniamos transform y ahora resizing right/bottom...
      // PrimeReact centrado: left: 50%, top: 50%, transform: -50%,-50%.
      // Si cambiamos width, crece desde el centro.
      // Si queremos comportamiento estándar (crecer a la derecha), también necesitamos
      // fijar left/top y quitar transform.
      else if (hasTransform) {
          // Estamos redimensionando Right o Bottom y tenía transform.
          // Para que no crezca desde el centro, sino desde Top-Left:
          dialogElement.style.transform = 'none';
          dialogElement.style.margin = '0';
          dialogElement.style.left = `${startLeft}px`;
          dialogElement.style.top = `${startTop}px`;
          
          // Marcar que ya no tiene transform "efectivo" para siguientes movimientos
          resizeStateRef.current.hasTransform = false; 
          // Actualizar startLeft/Top para futuros cálculos en este mismo drag
          resizeStateRef.current.startLeft = startLeft;
          resizeStateRef.current.startTop = startTop;
      }
    }

    // Actualizar tamaño
    setSize({ width: newWidth, height: newHeight });

  }, [getDialogElement, constraints]);

  // Función para finalizar el redimensionamiento
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeStateRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.body.classList.remove('is-resizing-dialog');
  }, [handleMouseMove]);

  // Función para obtener el cursor según la dirección
  const getCursor = (direction) => {
    if (direction.includes('top') && direction.includes('left')) return 'nw-resize';
    if (direction.includes('top') && direction.includes('right')) return 'ne-resize';
    if (direction.includes('bottom') && direction.includes('left')) return 'sw-resize';
    if (direction.includes('bottom') && direction.includes('right')) return 'se-resize';
    if (direction.includes('top') || direction.includes('bottom')) return 'ns-resize';
    if (direction.includes('left') || direction.includes('right')) return 'ew-resize';
    return 'default';
  };

  // Limpiar event listeners al desmontar
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.body.classList.remove('is-resizing-dialog');
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    dialogRef,
    size,
    setSize,
    startResize, // Retornamos startResize para usarlo en los handlers
    isResizing
  };
};
