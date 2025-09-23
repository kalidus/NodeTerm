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
    // Desbloquear propiedades básicas
    input.style.pointerEvents = 'auto';
    input.style.userSelect = 'auto';
    input.disabled = false;
    input.readOnly = false;
    
    // Limpiar estilos que puedan estar bloqueando
    input.style.opacity = '';
    input.style.visibility = '';
    input.style.display = '';
    
    // Remover atributos que puedan estar bloqueando
    input.removeAttribute('readonly');
    input.removeAttribute('disabled');
    
    // Forzar re-render del elemento
    if (input.style) {
      const originalDisplay = input.style.display;
      input.style.display = 'none';
      input.offsetHeight; // Trigger reflow
      input.style.display = originalDisplay || '';
    }
  });

  
  // Verificación adicional para inputs problemáticos
  setTimeout(() => {
    const stillBlocked = detectBlockedInputs();
    if (stillBlocked.length > 0) {
      console.warn(`⚠️ ${stillBlocked.length} inputs aún bloqueados después del desbloqueo`);
      // Segundo intento más agresivo
      stillBlocked.forEach(blocked => {
        const input = blocked.element;
        input.style.pointerEvents = 'auto !important';
        input.style.userSelect = 'auto !important';
        input.disabled = false;
        input.readOnly = false;
        input.removeAttribute('readonly');
        input.removeAttribute('disabled');
      });
    }
  }, 50);
};

/**
 * Función para limpiar eventos que puedan estar interfiriendo con los formularios
 */
export const clearFormInterference = () => {
  try {
    // Limpiar overlays o modales que puedan estar bloqueando
    const overlays = document.querySelectorAll('.p-dialog-mask, .p-overlaypanel, .p-contextmenu');
    overlays.forEach(overlay => {
      if (overlay.style) {
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'none';
      }
    });
    
    // Limpiar elementos con z-index alto que puedan estar bloqueando
    const highZElements = document.querySelectorAll('[style*="z-index"]');
    highZElements.forEach(element => {
      const zIndex = parseInt(element.style.zIndex);
      if (zIndex > 1000 && element.style.pointerEvents === 'auto') {
        element.style.pointerEvents = 'none';
        setTimeout(() => {
          element.style.pointerEvents = 'auto';
        }, 100);
      }
    });
    
    // Forzar focus/blur en el documento para reactivar eventos
    document.body.focus();
    document.body.blur();
    
    console.log('🧹 Limpieza de interferencias de formularios completada');
  } catch (error) {
    console.error('Error en clearFormInterference:', error);
  }
};

/**
 * Función completa para resolver problemas de formularios bloqueados
 */
export const resolveFormBlocking = (showToast = null) => {
  try {
    console.log('🔧 Iniciando resolución completa de bloqueo de formularios...');
    
    // Paso 1: Detectar inputs bloqueados
    const blockedInputs = detectBlockedInputs();
    console.log(`📊 Inputs bloqueados detectados: ${blockedInputs.length}`);
    
    // Paso 2: Limpiar interferencias
    clearFormInterference();
    
    // Paso 3: Desbloquear inputs
    unblockAllInputs();
    
    // Paso 4: Verificación final
    setTimeout(() => {
      const stillBlocked = detectBlockedInputs();
      if (stillBlocked.length === 0) {
        console.log('✅ Todos los formularios han sido desbloqueados exitosamente');
        if (showToast) {
          showToast({
            severity: 'success',
            summary: 'Formularios desbloqueados',
            detail: 'Los formularios y campos de entrada han sido reactivados',
            life: 2000
          });
        }
      } else {
        console.warn(`⚠️ ${stillBlocked.length} formularios aún bloqueados`);
        if (showToast) {
          showToast({
            severity: 'warn',
            summary: 'Algunos formularios bloqueados',
            detail: `${stillBlocked.length} campos aún están bloqueados. Intenta recargar la página.`,
            life: 3000
          });
        }
      }
    }, 200);
    
  } catch (error) {
    console.error('Error en resolveFormBlocking:', error);
    if (showToast) {
      showToast({
        severity: 'error',
        summary: 'Error al desbloquear formularios',
        detail: 'Ha ocurrido un error al intentar desbloquear los formularios',
        life: 3000
      });
    }
  }
};

/**
 * Función de emergencia ultra-agresiva para desbloquear formularios
 * Esta función hace todo lo posible para restaurar la interactividad
 */
export const emergencyUnblockForms = () => {
  try {
    console.log('🚨 EJECUTANDO DESBLOQUEO DE EMERGENCIA...');
    
    // 1. Forzar desbloqueo de TODOS los inputs
    const allInputs = document.querySelectorAll('input, textarea, select, [contenteditable], button');
    allInputs.forEach(input => {
      // Remover TODOS los atributos que puedan bloquear
      input.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.removeAttribute('tabindex');
      
      // Forzar estilos de desbloqueo
      input.style.pointerEvents = 'auto !important';
      input.style.userSelect = 'auto !important';
      input.style.opacity = '1 !important';
      input.style.visibility = 'visible !important';
      input.style.display = '';
      input.style.position = '';
      input.style.zIndex = '';
      
      // Remover clases que puedan estar bloqueando
      input.classList.remove('p-disabled', 'disabled', 'blocked', 'inactive');
      input.classList.add('form-unblock');
    });
    
    // 2. Limpiar TODOS los overlays y modales
    const overlays = document.querySelectorAll('.p-dialog-mask, .p-overlaypanel, .p-contextmenu, .p-menu-overlay, .p-sidebar-mask');
    overlays.forEach(overlay => {
      overlay.style.display = 'none';
      overlay.style.pointerEvents = 'none';
      overlay.style.zIndex = '-1';
      overlay.remove();
    });
    
    // 3. Forzar re-render de elementos problemáticos
    const problemElements = document.querySelectorAll('[style*="pointer-events: none"], [style*="user-select: none"]');
    problemElements.forEach(element => {
      element.style.pointerEvents = 'auto';
      element.style.userSelect = 'auto';
      element.offsetHeight; // Trigger reflow
    });
    
    // 4. Limpiar eventos globales problemáticos
    document.body.style.pointerEvents = 'auto';
    document.documentElement.style.pointerEvents = 'auto';
    
    // 5. Forzar focus en el documento
    document.body.focus();
    setTimeout(() => {
      document.body.blur();
      window.focus();
    }, 50);
    
    // 6. Disparar eventos de mouse para reactivar la interacción
    const mouseEvent = new MouseEvent('mousemove', {
      bubbles: true,
      cancelable: true,
      clientX: window.innerWidth / 2,
      clientY: window.innerHeight / 2
    });
    document.dispatchEvent(mouseEvent);
    
    console.log('🚨 DESBLOQUEO DE EMERGENCIA COMPLETADO');
    console.log(`✅ Procesados ${allInputs.length} elementos`);
    console.log(`✅ Eliminados ${overlays.length} overlays`);
    console.log(`✅ Corregidos ${problemElements.length} elementos problemáticos`);
    
  } catch (error) {
    console.error('❌ Error en desbloqueo de emergencia:', error);
  }
}; 