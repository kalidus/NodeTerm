import React, { forwardRef, useCallback } from 'react';
import { useSafeFocus, isElementBlocked, unblockElement } from '../utils/formUtils';

/**
 * Componente wrapper para inputs que previene bloqueos
 */
const SafeInput = forwardRef(({ 
  component: Component, 
  onFocus, 
  onBlur, 
  onChange, 
  ...props 
}, ref) => {
  const { safeFocus, safeBlur } = useSafeFocus();

  const handleFocus = useCallback((e) => {
    // Desbloquear elemento si está bloqueado
    if (isElementBlocked(e.target)) {
      unblockElement(e.target);
    }
    
    // Aplicar focus seguro
    safeFocus(e.target);
    
    // Llamar al callback original si existe
    if (onFocus) {
      onFocus(e);
    }
  }, [onFocus, safeFocus]);

  const handleBlur = useCallback((e) => {
    // Aplicar blur seguro
    safeBlur(e.target);
    
    // Llamar al callback original si existe
    if (onBlur) {
      onBlur(e);
    }
  }, [onBlur, safeBlur]);

  const handleChange = useCallback((e) => {
    // Llamar al callback original si existe
    if (onChange) {
      onChange(e);
    }
  }, [onChange]);

  return (
    <Component
      ref={ref}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      autoComplete="off"
      {...props}
    />
  );
});

SafeInput.displayName = 'SafeInput';

export default SafeInput; 