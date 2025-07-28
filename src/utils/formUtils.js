// Utilidades para manejar formularios y prevenir bloqueos
import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * Hook personalizado para manejar inputs de forma segura
 * Previene bloqueos y problemas de focus
 */
export const useSafeInput = (initialValue = '') => {
  const inputRef = useRef(null);
  const [value, setValue] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setValue(newValue);
  }, []);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Prevenir comportamientos problemáticos
    if (e.key === 'Tab') {
      // Permitir navegación normal con Tab
      return;
    }
    
    // Prevenir shortcuts que puedan causar problemas
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (['c', 'v', 'x', 'a', 'z', 'y'].includes(key)) {
        // Permitir shortcuts estándar
        return;
      }
    }
  }, []);

  return {
    value,
    setValue,
    isFocused,
    inputRef,
    handlers: {
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown
    }
  };
};

/**
 * Función para limpiar y resetear un formulario
 */
export const resetForm = (formRef) => {
  if (formRef && formRef.current) {
    formRef.current.reset();
  }
};

/**
 * Función para prevenir múltiples submits
 */
export const usePreventDoubleSubmit = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (submitFunction) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await submitFunction();
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting]);

  return { isSubmitting, handleSubmit };
};

/**
 * Hook para manejar focus de forma segura
 */
export const useSafeFocus = () => {
  const focusTimeoutRef = useRef(null);

  const safeFocus = useCallback((element) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      if (element && typeof element.focus === 'function') {
        try {
          element.focus();
        } catch (error) {
          console.warn('Error focusing element:', error);
        }
      }
    }, 100);
  }, []);

  const safeBlur = useCallback((element) => {
    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    if (element && typeof element.blur === 'function') {
      try {
        element.blur();
      } catch (error) {
        console.warn('Error blurring element:', error);
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  return { safeFocus, safeBlur };
};

/**
 * Función para detectar si un elemento está bloqueado
 */
export const isElementBlocked = (element) => {
  if (!element) return false;
  
  const computedStyle = window.getComputedStyle(element);
  return (
    computedStyle.pointerEvents === 'none' ||
    computedStyle.userSelect === 'none' ||
    element.disabled ||
    element.readOnly
  );
};

/**
 * Función para desbloquear un elemento
 */
export const unblockElement = (element) => {
  if (!element) return;
  
  element.style.pointerEvents = 'auto';
  element.style.userSelect = 'auto';
  element.disabled = false;
  element.readOnly = false;
};

/**
 * Hook para manejar formularios con validación y prevención de bloqueos
 */
export const useFormWithValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const formRef = useRef(null);

  const handleChange = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Limpiar error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  }, [errors]);

  const handleBlur = useCallback((name) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validar al perder focus
    if (validationRules[name]) {
      const error = validationRules[name](values[name], values);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [values, validationRules]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    Object.keys(validationRules).forEach(field => {
      const error = validationRules[field](values[field], values);
      if (error) {
        newErrors[field] = error;
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validationRules]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    formRef,
    handleChange,
    handleBlur,
    validateForm,
    resetForm,
    setValues
  };
}; 