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
  }, [size, getDialogElement]);

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

    const rect = dialogElement.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = rect.width;
    const startHeight = rect.height;
    const startLeft = rect.left;
    const startTop = rect.top;

    setIsResizing(true);
    resizeStateRef.current = {
      direction,
      startX,
      startY,
      startWidth,
      startHeight,
      startLeft,
      startTop
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = getCursor(direction);
    document.body.style.userSelect = 'none';
  }, [getDialogElement]);

  // Función para manejar el movimiento del mouse durante el redimensionamiento
  const handleMouseMove = useCallback((e) => {
    if (!resizeStateRef.current) return;

    const { direction, startX, startY, startWidth, startHeight, startLeft, startTop } = resizeStateRef.current;
    const dialogElement = getDialogElement();
    if (!dialogElement) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    // Aplicar restricciones
    const minWidth = constraints.minWidth || 400;
    const minHeight = constraints.minHeight || 300;
    const maxWidth = constraints.maxWidth || window.innerWidth * 0.98;
    const maxHeight = constraints.maxHeight || window.innerHeight * 0.98;

    // Determinar cómo redimensionar según la dirección
    // IMPORTANTE: Solo redimensionamos desde la derecha y abajo para evitar interferir
    // con el sistema de arrastre de PrimeReact. Redimensionar desde izquierda/arriba
    // requiere manipular la posición, lo cual interfiere con el drag.
    if (direction.includes('right')) {
      newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth + deltaX));
    }
    if (direction.includes('left')) {
      // Redimensionar desde la izquierda: solo ajustar ancho, no posición
      // Dejamos que PrimeReact maneje el reposicionamiento
      newWidth = Math.max(minWidth, Math.min(maxWidth, startWidth - deltaX));
    }
    if (direction.includes('bottom')) {
      newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
    }
    if (direction.includes('top')) {
      // Redimensionar desde arriba: solo ajustar altura, no posición
      // Dejamos que PrimeReact maneje el reposicionamiento
      newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight - deltaY));
    }

    // Actualizar tamaño
    setSize({ width: newWidth, height: newHeight });
    
    // NOTA: No manipulamos directamente left/top/transform aquí porque:
    // 1. PrimeReact maneja el posicionamiento de los diálogos
    // 2. Manipular estos valores interfiere con el sistema de arrastre
    // 3. Solo ajustamos el tamaño, dejando que PrimeReact mantenga el posicionamiento
    // Si el diálogo se sale de la pantalla, PrimeReact lo reposicionará automáticamente
  }, [getDialogElement, constraints]);

  // Función para finalizar el redimensionamiento
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
    resizeStateRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
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
    };
  }, [handleMouseMove, handleMouseUp]);

  return {
    dialogRef,
    size,
    setSize,
    startResize,
    isResizing
  };
};

