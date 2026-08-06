/**
 * I18nService - Sistema de internacionalización para NodeTerm
 * Singleton que maneja traducciones, cambio de idioma y persistencia
 */

// Imports estáticos de todos los archivos de traducción
import esCommon from './locales/es/common.json';
import esDialogs from './locales/es/dialogs.json';
import esSettings from './locales/es/settings.json';

import enCommon from './locales/en/common.json';
import enDialogs from './locales/en/dialogs.json';
import enSettings from './locales/en/settings.json';

// Objeto con todas las traducciones pre-cargadas
// Nota: Algunos bundlers pueden devolver { default: {...} }, otros directamente {...}
const allTranslations = {
  es: {
    common: esCommon?.default || esCommon,
    dialogs: esDialogs?.default || esDialogs,
    settings: esSettings?.default || esSettings
  },
  en: {
    common: enCommon?.default || enCommon,
    dialogs: enDialogs?.default || enDialogs,
    settings: enSettings?.default || enSettings
  }
};

// Debug: Verificar que las traducciones se cargaron (deshabilitado para reducir logs)
// console.log('[i18n] Traducciones cargadas:', {
//   es: Object.keys(allTranslations.es),
//   en: Object.keys(allTranslations.en),
//   esDialogsKeys: Object.keys(allTranslations.es.dialogs || {}),
//   esCommonKeys: Object.keys(allTranslations.es.common || {})
// });

class I18nService {
  constructor() {
    const savedLocale = localStorage.getItem('app_locale');
    const systemLocale = (typeof navigator !== 'undefined' && (navigator.language || navigator.userLanguage))
      ? navigator.language.toLowerCase().split('-')[0]
      : 'en';

    // Si el idioma del sistema es español ('es'), usar 'es'.
    // Para CUALQUIER OTRO IDIOMA (inglés, francés, alemán, etc.), la aplicación usará 'en' por defecto.
    const defaultLocale = savedLocale || (systemLocale === 'es' ? 'es' : 'en');
    
    this.currentLocale = defaultLocale;
    this.translations = allTranslations[defaultLocale] || allTranslations['en'];
    this.listeners = new Set();
    this.isInitialized = false;
  }

  /**
   * Inicializa el servicio cargando el idioma guardado
   */
  async init() {
    if (this.isInitialized) return;
    
    // Ya está inicializado en el constructor, solo marcar como inicializado
    this.isInitialized = true;
    // console.log(`[i18n] Inicializado con idioma: ${this.currentLocale}`);
  }

  /**
   * Verifica si un locale es válido (tiene traducciones)
   */
  isValidLocale(locale) {
    return ['es', 'en'].includes(locale);
  }

  /**
   * Obtiene los idiomas disponibles
   */
  getAvailableLocales() {
    return [
      { code: 'es', name: 'Español', flag: '🇪🇸' },
      { code: 'en', name: 'English', flag: '🇬🇧' }
    ];
  }

  /**
   * Cambia el idioma actual
   */
  async setLocale(locale) {
    if (!this.isValidLocale(locale)) {
      console.warn(`[i18n] Locale no válido: ${locale}, usando 'es'`);
      locale = 'es';
    }

    this.currentLocale = locale;
    
    // Cargar traducciones del locale seleccionado
    this.translations = allTranslations[locale] || allTranslations['es'];
    
    // Guardar preferencia
    localStorage.setItem('app_locale', locale);
    
    // Notificar a todos los suscriptores
    this.notifyListeners();
    
    // console.log(`[i18n] Idioma cambiado a: ${locale}`, Object.keys(this.translations));
  }

  /**
   * Obtiene una traducción por su clave
   * @param {string} key - Clave en formato "namespace.path.to.key" o "path.to.key"
   * @param {object} params - Parámetros para interpolación
   * @returns {string} - Texto traducido o la clave si no se encuentra
   */
  t(key, params = {}) {
    try {
      if (!key) return '';

      // Si no hay traducciones cargadas, intentar cargar por defecto
      if (!this.translations || Object.keys(this.translations).length === 0) {
        console.warn(`[i18n] No hay traducciones cargadas, usando español por defecto`);
        this.translations = allTranslations['es'] || {};
      }

      const parts = key.split('.');
      let namespace = 'common';
      let path = parts;

      // Si el primer elemento es un namespace conocido, usarlo
      if (this.translations && this.translations[parts[0]]) {
        namespace = parts[0];
        path = parts.slice(1);
      }

      // Navegar por el objeto de traducciones
      let value = this.translations[namespace];
      if (!value) {
        console.warn(`[i18n] Namespace '${namespace}' no encontrado. Traducciones disponibles:`, Object.keys(this.translations || {}));
        return key;
      }

      for (const part of path) {
        if (value === undefined || value === null) {
          break;
        }
        value = value[part];
      }

      // Si no se encontró en el idioma actual, intentar fallback en español
      if ((value === undefined || value === null) && this.currentLocale !== 'es') {
        let fallbackVal = allTranslations['es']?.[namespace];
        for (const part of path) {
          if (fallbackVal === undefined || fallbackVal === null) break;
          fallbackVal = fallbackVal[part];
        }
        if (fallbackVal !== undefined && fallbackVal !== null) {
          value = fallbackVal;
        }
      }

      if (value === undefined || value === null) {
        return key;
      }

      // Interpolación de parámetros: "Hola {name}" -> "Hola Juan"
      if (typeof value === 'string' && Object.keys(params).length > 0) {
        return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
          return params[paramKey] !== undefined ? params[paramKey] : match;
        });
      }

      return value;
    } catch (error) {
      console.error(`[i18n] Error en traducción para clave '${key}':`, error);
      return key;
    }
  }

  /**
   * Suscribe un callback para cambios de idioma
   * @returns {function} - Función para cancelar la suscripción
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notifica a todos los suscriptores de un cambio
   */
  notifyListeners() {
    // console.log(`[i18n] Notificando a ${this.listeners.size} listeners`);
    this.listeners.forEach(callback => {
      try {
        callback(this.currentLocale);
      } catch (error) {
        console.error('[i18n] Error en listener:', error);
      }
    });
  }

  /**
   * Obtiene el idioma actual
   */
  getLocale() {
    return this.currentLocale;
  }
}

// Singleton
const i18n = new I18nService();

export default i18n;
export { i18n };
