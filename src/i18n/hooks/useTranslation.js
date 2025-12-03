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
  // Inicializar con un valor seguro
  const getInitialLocale = () => {
    try {
      return i18n?.getLocale?.() || 'es';
    } catch (error) {
      console.warn('[useTranslation] Error obteniendo locale inicial:', error);
      return 'es';
    }
  };
  
  const [locale, setLocaleState] = useState(getInitialLocale);
  const [, forceUpdate] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Suscribirse a cambios de idioma
    try {
      const unsubscribe = i18n.subscribe((newLocale) => {
        if (mountedRef.current) {
          console.log(`[useTranslation] Locale cambió a: ${newLocale}`);
          setLocaleState(newLocale);
          forceUpdate(n => n + 1); // Forzar re-render
        }
      });

      return () => {
        mountedRef.current = false;
        if (unsubscribe) unsubscribe();
      };
    } catch (error) {
      console.error('[useTranslation] Error suscribiéndose a cambios:', error);
      return () => {
        mountedRef.current = false;
      };
    }
  }, []);

  /**
   * Función de traducción
   * @param {string} key - Clave de traducción
   * @param {object} params - Parámetros para interpolación
   */
  const t = useCallback((key, params = {}) => {
    try {
      // Si hay namespace, prefijarlo a la clave
      const fullKey = namespace ? `${namespace}.${key}` : key;
      if (!i18n || typeof i18n.t !== 'function') {
        console.warn('[useTranslation] i18n no está disponible, devolviendo clave');
        return key;
      }
      return i18n.t(fullKey, params);
    } catch (error) {
      console.error('[useTranslation] Error en traducción:', error, 'key:', key);
      return key;
    }
  }, [namespace, locale]); // locale en deps para recalcular t cuando cambie

  /**
   * Cambiar idioma
   */
  const setLocale = useCallback(async (newLocale) => {
    try {
      if (i18n && typeof i18n.setLocale === 'function') {
        await i18n.setLocale(newLocale);
      }
    } catch (error) {
      console.error('[useTranslation] Error cambiando locale:', error);
    }
  }, []);

  // Obtener locales disponibles de forma segura
  const getAvailableLocales = () => {
    try {
      return i18n?.getAvailableLocales?.() || [];
    } catch (error) {
      console.warn('[useTranslation] Error obteniendo locales disponibles:', error);
      return [];
    }
  };

  return {
    t,
    locale,
    setLocale,
    availableLocales: getAvailableLocales()
  };
}

export default useTranslation;
