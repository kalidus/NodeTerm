/**
 * Hook React para usar traducciones en componentes
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import i18n from '../index';

/**
 * Hook para obtener función de traducción y locale actual
 * @param {string} namespace - Namespace opcional para prefijar las claves
 * @returns {{ t: function, locale: string, setLocale: function }}
 */
export function useTranslation(namespace = null) {
  const [locale, setLocaleState] = useState(i18n.getLocale());
  const [, forceUpdate] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Suscribirse a cambios de idioma
    const unsubscribe = i18n.subscribe((newLocale) => {
      if (mountedRef.current) {
        console.log(`[useTranslation] Locale cambió a: ${newLocale}`);
        setLocaleState(newLocale);
        forceUpdate(n => n + 1); // Forzar re-render
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  /**
   * Función de traducción
   * @param {string} key - Clave de traducción
   * @param {object} params - Parámetros para interpolación
   */
  const t = useCallback((key, params = {}) => {
    // Si hay namespace, prefijarlo a la clave
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return i18n.t(fullKey, params);
  }, [namespace, locale]); // locale en deps para recalcular t cuando cambie

  /**
   * Cambiar idioma
   */
  const setLocale = useCallback(async (newLocale) => {
    await i18n.setLocale(newLocale);
  }, []);

  return {
    t,
    locale,
    setLocale,
    availableLocales: i18n.getAvailableLocales()
  };
}

export default useTranslation;
