# Plan de Internacionalización (i18n) para NodeTerm

## 📋 Resumen Ejecutivo

Este plan describe la estrategia para hacer NodeTerm multilenguaje, empezando con **Inglés** y **Español**, con una arquitectura que facilite agregar más idiomas en el futuro.

---

## 🎯 Objetivos

1. ✅ Implementar soporte para Inglés (en) y Español (es)
2. ✅ Sistema fácilmente extensible a otros idiomas
3. ✅ Cambio de idioma en tiempo real sin reiniciar
4. ✅ Persistencia del idioma seleccionado
5. ✅ Migración gradual sin romper funcionalidad existente

---

## 🏗️ Arquitectura Propuesta

### Opción 1: Sistema i18n Custom (Recomendado)

**Ventajas:**
- ✅ Sin dependencias externas
- ✅ Control total sobre el sistema
- ✅ Ligero y rápido
- ✅ Fácil de mantener

**Estructura:**
```
src/
├── i18n/
│   ├── index.js                 # Servicio principal i18n
│   ├── localeLoader.js          # Cargador de traducciones
│   ├── hooks/
│   │   └── useTranslation.js    # Hook React para componentes
│   └── locales/
│       ├── en/
│       │   ├── common.json      # Textos comunes (botones, acciones)
│       │   ├── dialogs.json     # Diálogos
│       │   ├── settings.json    # Configuración
│       │   ├── sidebar.json     # Sidebar
│       │   ├── terminal.json    # Terminal
│       │   ├── connections.json # Conexiones SSH/RDP/VNC
│       │   ├── ai.json          # IA/Chat
│       │   └── errors.json      # Mensajes de error
│       └── es/
│           └── [misma estructura]
```

### Opción 2: Biblioteca i18next (Alternativa)

**Ventajas:**
- ✅ Estándar de la industria
- ✅ Funciones avanzadas (plurales, interpolación)
- ✅ Soporte de plugins

**Desventajas:**
- ❌ Dependencia externa (~15KB)
- ❌ Curva de aprendizaje
- ❌ Puede ser excesivo para este proyecto

**Recomendación:** Opción 1 (Custom) porque es más ligera y suficiente para las necesidades del proyecto.

---

## 📁 Estructura de Archivos Detallada

### 1. Servicio i18n Principal (`src/i18n/index.js`)

```javascript
class I18nService {
  constructor() {
    this.currentLocale = 'es'; // default
    this.translations = {};
    this.listeners = [];
  }

  // Cambiar idioma
  setLocale(locale) {
    this.currentLocale = locale;
    this.loadTranslations(locale);
    this.notifyListeners();
    this.saveLocale(locale);
  }

  // Obtener traducción
  t(key, params = {}) {
    const keys = key.split('.');
    let value = this.translations;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        console.warn(`Translation missing: ${key} (${this.currentLocale})`);
        return key; // Fallback a la clave
      }
    }
    
    // Interpolación de parámetros: "Hola {name}" -> "Hola Juan"
    if (typeof value === 'string' && Object.keys(params).length > 0) {
      return value.replace(/\{(\w+)\}/g, (match, key) => params[key] || match);
    }
    
    return value;
  }

  // Suscribirse a cambios
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  // Cargar desde localStorage
  loadSavedLocale() {
    const saved = localStorage.getItem('app_locale') || 
                  navigator.language.split('-')[0] || 
                  'es';
    this.setLocale(saved);
  }
}
```

### 2. Hook React (`src/i18n/hooks/useTranslation.js`)

```javascript
import { useState, useEffect } from 'react';
import { i18n } from '../index';

export function useTranslation(namespace = null) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const unsubscribe = i18n.subscribe(() => {
      forceUpdate({});
    });
    return unsubscribe;
  }, []);

  const t = (key, params) => {
    const fullKey = namespace ? `${namespace}.${key}` : key;
    return i18n.t(fullKey, params);
  };

  return { t, locale: i18n.currentLocale };
}
```

### 3. Archivos de Traducción

**Ejemplo: `src/i18n/locales/es/common.json`**
```json
{
  "buttons": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "edit": "Editar",
    "create": "Crear",
    "close": "Cerrar",
    "apply": "Aplicar",
    "accept": "Aceptar"
  },
  "actions": {
    "copy": "Copiar",
    "paste": "Pegar",
    "cut": "Cortar",
    "undo": "Deshacer",
    "redo": "Rehacer"
  },
  "messages": {
    "success": "Operación exitosa",
    "error": "Error",
    "warning": "Advertencia",
    "info": "Información"
  }
}
```

**Ejemplo: `src/i18n/locales/en/common.json`**
```json
{
  "buttons": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit",
    "create": "Create",
    "close": "Close",
    "apply": "Apply",
    "accept": "Accept"
  },
  "actions": {
    "copy": "Copy",
    "paste": "Paste",
    "cut": "Cut",
    "undo": "Undo",
    "redo": "Redo"
  },
  "messages": {
    "success": "Operation successful",
    "error": "Error",
    "warning": "Warning",
    "info": "Information"
  }
}
```

**Ejemplo: `src/i18n/locales/es/dialogs.json`**
```json
{
  "ssh": {
    "title": {
      "new": "Nueva conexión SSH",
      "edit": "Editar conexión SSH"
    },
    "sections": {
      "connection": "Conexión",
      "authentication": "Autenticación",
      "folders": "Carpetas"
    },
    "fields": {
      "name": "Nombre",
      "host": "Host",
      "port": "Puerto",
      "user": "Usuario",
      "password": "Contraseña",
      "remoteFolder": "Carpeta remota",
      "targetFolder": "Carpeta destino",
      "showPassword": "Mostrar contraseña",
      "hidePassword": "Ocultar contraseña"
    },
    "placeholders": {
      "name": "Servidor de producción",
      "host": "IP o nombre del servidor",
      "port": "22",
      "user": "root",
      "password": "Contraseña",
      "remoteFolder": "/home/usuario",
      "targetFolder": "Seleccionar carpeta local"
    },
    "required": "Campo obligatorio"
  }
}
```

---

## 🔄 Plan de Migración

### Fase 1: Infraestructura (2-3 horas)
1. ✅ Crear estructura de carpetas `src/i18n/`
2. ✅ Implementar `I18nService`
3. ✅ Crear hook `useTranslation`
4. ✅ Crear loader de archivos JSON
5. ✅ Integrar en `App.js` para inicialización
6. ✅ Agregar selector de idioma en Settings

### Fase 2: Traducciones Base (4-6 horas)
1. ✅ Identificar y catalogar todos los textos
2. ✅ Crear archivos de traducción base (common, dialogs, settings)
3. ✅ Traducir todos los textos a inglés
4. ✅ Organizar por namespace (common, dialogs, sidebar, etc.)

### Fase 3: Migración de Componentes (Prioridad)

**Prioridad Alta (más visibles):**
- ✅ `Dialogs.js` (SSH, RDP, VNC, Folders)
- ✅ `SettingsDialog.js`
- ✅ `Sidebar.js`
- ✅ `HomeTab.js`

**Prioridad Media:**
- ✅ `AIChatPanel.js`
- ✅ `AIConfigDialog.js`
- ✅ `PasswordManagerSidebar.js`
- ✅ `ImportDialog.js`

**Prioridad Baja:**
- ✅ Componentes menos usados
- ✅ Mensajes de error
- ✅ Tooltips y ayudas

### Fase 4: Testing y Refinamiento (2-3 horas)
1. ✅ Probar cambio de idioma en tiempo real
2. ✅ Verificar todas las pantallas
3. ✅ Corregir textos faltantes
4. ✅ Validar longitudes de texto (algunos idiomas son más largos)

---

## 💻 Ejemplo de Uso en Componentes

### Antes (hardcodeado):
```javascript
<Button label="Guardar" onClick={handleSave} />
<span>Nueva conexión SSH</span>
<label>Nombre <span>*</span></label>
```

### Después (con i18n):
```javascript
import { useTranslation } from '../i18n/hooks/useTranslation';

function SSHDialog() {
  const { t } = useTranslation('dialogs');
  
  return (
    <>
      <Button label={t('ssh.fields.name')} onClick={handleSave} />
      <span>{t('ssh.title.new')}</span>
      <label>{t('ssh.fields.name')} <span>*</span></label>
    </>
  );
}
```

### Con namespace específico:
```javascript
import { useTranslation } from '../i18n/hooks/useTranslation';

function MyComponent() {
  const { t: tCommon } = useTranslation('common');
  const { t: tDialogs } = useTranslation('dialogs');
  
  return (
    <>
      <Button label={tCommon('buttons.save')} />
      <span>{tDialogs('ssh.title.new')}</span>
    </>
  );
}
```

---

## ⚙️ Integración en Settings

### Agregar selector de idioma:

**En `SettingsDialog.js`:**
```javascript
// Sección: Idioma / Language
<div className="settings-section">
  <div className="section-header">
    <i className="pi pi-globe section-icon"></i>
    <h3 className="section-title">{t('settings.language.title')}</h3>
  </div>
  <div className="settings-options">
    <Dropdown
      value={currentLocale}
      options={[
        { label: 'Español', value: 'es' },
        { label: 'English', value: 'en' }
      ]}
      onChange={(e) => i18n.setLocale(e.value)}
    />
  </div>
</div>
```

---

## 📊 Namespaces Propuestos

| Namespace | Descripción | Archivos Afectados |
|-----------|-------------|-------------------|
| `common` | Botones, acciones, mensajes genéricos | Todos |
| `dialogs` | Diálogos (SSH, RDP, VNC, Folders) | Dialogs.js |
| `settings` | Configuración completa | SettingsDialog.js |
| `sidebar` | Sidebar y navegación | Sidebar.js |
| `terminal` | Terminal y comandos | TerminalComponent.js, etc. |
| `connections` | Conexiones SSH/RDP/VNC | Varios |
| `ai` | Chat IA, configuración IA | AIChatPanel.js, AIConfigDialog.js |
| `password` | Password Manager | PasswordManagerSidebar.js |
| `import` | Importación de datos | ImportDialog.js |
| `errors` | Mensajes de error | Todos |
| `home` | HomeTab | HomeTab.js |

---

## 🔍 Catálogo de Textos a Migrar

### Dialogs.js
- ✅ "Editar conexión SSH" / "Nueva conexión SSH"
- ✅ "Conexión", "Autenticación", "Carpetas"
- ✅ "Nombre", "Host", "Puerto", "Usuario", "Contraseña"
- ✅ "Guardar", "Cancelar"
- ✅ Placeholders y tooltips

### SettingsDialog.js
- ✅ Títulos de pestañas
- ✅ Labels de configuración
- ✅ Descripciones
- ✅ Mensajes de confirmación

### Sidebar.js
- ✅ Menús contextuales
- ✅ Acciones del árbol
- ✅ Mensajes de confirmación

### AIChatPanel.js
- ✅ Mensajes de estado
- ✅ Botones y acciones
- ✅ Placeholders de input

---

## 🚀 Pasos de Implementación

### Paso 1: Setup Inicial
```bash
# Crear estructura
mkdir -p src/i18n/locales/{en,es}
mkdir -p src/i18n/hooks
```

### Paso 2: Implementar Servicio
- Crear `src/i18n/index.js`
- Crear `src/i18n/localeLoader.js`
- Crear `src/i18n/hooks/useTranslation.js`

### Paso 3: Crear Traducciones Base
- `common.json` (es, en)
- `dialogs.json` (es, en)
- `settings.json` (es, en)

### Paso 4: Integrar en App.js
```javascript
import { i18n } from './i18n';

// En useEffect inicial
useEffect(() => {
  i18n.loadSavedLocale();
}, []);
```

### Paso 5: Migrar Componentes (uno por uno)
1. Empezar con `Dialogs.js`
2. Luego `SettingsDialog.js`
3. Continuar con el resto

---

## 📝 Checklist de Validación

- [ ] El idioma se detecta automáticamente del sistema
- [ ] El idioma se puede cambiar desde Settings
- [ ] El cambio es inmediato (sin reiniciar)
- [ ] El idioma se persiste en localStorage
- [ ] Todos los componentes muestran texto traducido
- [ ] No hay textos hardcodeados visibles
- [ ] Los textos faltantes muestran la clave (para debug)
- [ ] Funciona en modo desarrollo y producción

---

## 🎨 Consideraciones Especiales

### Longitud de Textos
- Español suele ser ~20-30% más largo que inglés
- Diseñar UI con espacio suficiente
- Considerar tooltips para textos largos

### Formato de Fechas/Números
- Usar `Intl.DateTimeFormat` y `Intl.NumberFormat`
- Configurar según locale

### Pluralización
- Implementar reglas básicas si es necesario
- Ejemplo: "1 archivo" vs "2 archivos"

### Textos Dinámicos
- Usar interpolación: `t('welcome', { name: userName })`
- Formato: `"Bienvenido {name}"`

---

## 🔮 Extensiones Futuras

### Fácil agregar nuevos idiomas:
1. Crear carpeta `src/i18n/locales/fr/` (ejemplo: francés)
2. Copiar estructura de `es/` o `en/`
3. Traducir todos los JSON
4. Agregar opción en el selector de Settings
5. ✅ Listo!

### Mejoras futuras:
- [ ] Pluralización avanzada
- [ ] Formato de fechas/números por locale
- [ ] Soporte RTL (Right-to-Left) para árabe/hebreo
- [ ] Editor visual de traducciones (futuro)
- [ ] Exportar/importar traducciones

---

## 📚 Referencias

- [MDN: Intl API](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [React i18n Patterns](https://react.i18next.com/)
- [Locale Codes (ISO 639-1)](https://www.loc.gov/standards/iso639-2/php/code_list.php)

---

## ⏱️ Estimación de Tiempo

| Fase | Horas | Descripción |
|------|-------|-------------|
| Fase 1: Infraestructura | 2-3h | Setup y servicio base |
| Fase 2: Traducciones Base | 4-6h | Crear y traducir JSONs |
| Fase 3: Migración Componentes | 8-12h | Reemplazar textos hardcodeados |
| Fase 4: Testing | 2-3h | Validación completa |
| **TOTAL** | **16-24h** | |

---

## ✅ Decisión Final

**Recomendación:** Implementar **Sistema i18n Custom** porque:
- Es ligero y sin dependencias
- Control total sobre el comportamiento
- Suficiente para las necesidades del proyecto
- Fácil de mantener y extender

¿Procedemos con la implementación? 🚀






