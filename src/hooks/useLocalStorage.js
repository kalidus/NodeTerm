import { useState, useEffect } from 'react';

/**
 * Hook personalizado para manejar localStorage de forma reactiva
 * @param {string} key - La clave en localStorage
 * @param {any} defaultValue - Valor por defecto si no existe en localStorage
 * @param {boolean} isJSON - Si el valor debe ser serializado/deserializado como JSON (por defecto true)
 * @returns {[any, Function]} - [valor, setter] como useState normal
 */
export const useLocalStorage = (key, defaultValue, isJSON = true) => {
  // Estado inicializado con valor de localStorage o defaultValue
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      if (isJSON) {
        return JSON.parse(item);
      } else {
        return item;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Efecto para guardar en localStorage cuando el valor cambia
  useEffect(() => {
    try {
      if (isJSON) {
        localStorage.setItem(key, JSON.stringify(value));
      } else {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, value, isJSON]);

  return [value, setValue];
};

/**
 * Hook especializado para valores numéricos en localStorage
 * @param {string} key - La clave en localStorage
 * @param {number} defaultValue - Valor numérico por defecto
 * @returns {[number, Function]} - [valor numérico, setter]
 */
export const useLocalStorageNumber = (key, defaultValue) => {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      const parsed = parseInt(item, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    } catch (error) {
      console.warn(`Error reading localStorage number key "${key}":`, error);
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, value.toString());
    } catch (error) {
      console.warn(`Error setting localStorage number key "${key}":`, error);
    }
  }, [key, value]);

  return [value, setValue];
};

/**
 * Hook especializado para strings simples en localStorage
 * @param {string} key - La clave en localStorage
 * @param {string} defaultValue - Valor string por defecto
 * @returns {[string, Function]} - [valor string, setter]
 */
export const useLocalStorageString = (key, defaultValue) => {
  return useLocalStorage(key, defaultValue, false);
};
