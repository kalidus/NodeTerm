import { useEffect, useRef } from 'react';

/**
 * Hook para detectar y resolver problemas de formularios
 */
export const useFormDebugger = (formRef, enabled = false) => {
  const debugIntervalRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    const checkFormHealth = () => {
      if (!formRef.current) return;

      const inputs = formRef.current.querySelectorAll('input, textarea, select, [contenteditable]');
      
      inputs.forEach(input => {
        const computedStyle = window.getComputedStyle(input);
        const isBlocked = 
          computedStyle.pointerEvents === 'none' ||
          computedStyle.userSelect === 'none' ||
          input.disabled ||
          input.readOnly ||
          input.style.display === 'none' ||
          input.style.visibility === 'hidden';

        if (isBlocked) {
          console.warn('Form input blocked detected:', input.id || input.name, {
            pointerEvents: computedStyle.pointerEvents,
            userSelect: computedStyle.userSelect,
            disabled: input.disabled,
            readOnly: input.readOnly,
            display: input.style.display,
            visibility: input.style.visibility
          });

          // Intentar desbloquear
          input.style.pointerEvents = 'auto';
          input.style.userSelect = 'auto';
          input.disabled = false;
          input.readOnly = false;
        }
      });
    };

    // Verificar cada 2 segundos
    debugIntervalRef.current = setInterval(checkFormHealth, 2000);

    return () => {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
      }
    };
  }, [enabled, formRef]);

  return {
    checkFormHealth: () => {
      if (debugIntervalRef.current) {
        clearInterval(debugIntervalRef.current);
      }
      debugIntervalRef.current = setInterval(() => {
        const inputs = document.querySelectorAll('input, textarea, select, [contenteditable]');
        inputs.forEach(input => {
          const computedStyle = window.getComputedStyle(input);
          if (computedStyle.pointerEvents === 'none') {
            input.style.pointerEvents = 'auto';
          }
        });
      }, 1000);
    }
  };
};

/**
 * Función para forzar el re-render de un formulario
 */
export const forceFormRerender = (formRef) => {
  if (formRef.current) {
    // Forzar re-render cambiando temporalmente el display
    const originalDisplay = formRef.current.style.display;
    formRef.current.style.display = 'none';
    
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.style.display = originalDisplay;
      }
    }, 10);
  }
};

/**
 * Función para limpiar todos los inputs de un formulario
 */
export const clearAllInputs = (formRef) => {
  if (!formRef.current) return;

  const inputs = formRef.current.querySelectorAll('input, textarea, select');
  inputs.forEach(input => {
    if (input.type === 'checkbox' || input.type === 'radio') {
      input.checked = false;
    } else {
      input.value = '';
    }
    
    // Limpiar estilos problemáticos
    input.style.pointerEvents = 'auto';
    input.style.userSelect = 'auto';
    input.disabled = false;
    input.readOnly = false;
  });
};

/**
 * Función para detectar inputs bloqueados en toda la página
 */
export const detectBlockedInputs = () => {
  const inputs = document.querySelectorAll('input, textarea, select, [contenteditable]');
  const blockedInputs = [];

  inputs.forEach(input => {
    const computedStyle = window.getComputedStyle(input);
    const isBlocked = 
      computedStyle.pointerEvents === 'none' ||
      computedStyle.userSelect === 'none' ||
      input.disabled ||
      input.readOnly;

    if (isBlocked) {
      blockedInputs.push({
        element: input,
        id: input.id,
        name: input.name,
        type: input.type,
        reason: {
          pointerEvents: computedStyle.pointerEvents,
          userSelect: computedStyle.userSelect,
          disabled: input.disabled,
          readOnly: input.readOnly
        }
      });
    }
  });

  return blockedInputs;
};

/**
 * Función para desbloquear todos los inputs de la página
 */
export const unblockAllInputs = () => {
  const inputs = document.querySelectorAll('input, textarea, select, [contenteditable]');
  
  inputs.forEach(input => {
    input.style.pointerEvents = 'auto';
    input.style.userSelect = 'auto';
    input.disabled = false;
    input.readOnly = false;
  });

  console.log(`Desbloqueados ${inputs.length} inputs`);
}; 