# 🚨 ANÁLISIS DE PROBLEMAS GRAVES - NodeTerm

**Fecha de análisis:** $(date)  
**Versión analizada:** 1.6.1  
**Prioridad:** CRÍTICA

---

## 📋 RESUMEN EJECUTIVO

Se han identificado **7 problemas graves** que requieren atención inmediata:

1. ⚠️ **CRÍTICO**: Clave secreta hardcodeada para Guacamole
2. ⚠️ **CRÍTICO**: Almacenamiento inseguro de contraseñas (Base64)
3. ⚠️ **ALTO**: Memory leaks por timers no limpiados
4. ⚠️ **ALTO**: Riesgo de race conditions en pool de conexiones SSH
5. ⚠️ **MEDIO**: Manejo agresivo de errores (process.exit)
6. ⚠️ **MEDIO**: Uso de dangerouslySetInnerHTML (mitigado con DOMPurify)
7. ⚠️ **MEDIO**: Múltiples setInterval sin cleanup en cierre de app

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Clave Secreta Hardcodeada para Guacamole

**Ubicación:** `main.js:385`

```javascript
const SECRET_KEY_RAW = 'NodeTermGuacamoleSecretKey2024!';
const SECRET_KEY = crypto.createHash('sha256').update(SECRET_KEY_RAW).digest();
```

**Problema:**
- La clave de encriptación está hardcodeada en el código fuente
- Cualquier persona con acceso al código puede descifrar las conexiones Guacamole
- No hay rotación de claves
- Vulnerable a ingeniería inversa

**Impacto:**
- 🔴 **CRÍTICO**: Compromiso de seguridad de conexiones RDP
- Exposición de credenciales y sesiones remotas
- Violación de confidencialidad

**Solución recomendada:**
```javascript
// Generar clave única por instalación
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

async function getOrCreateSecretKey() {
  const keyPath = path.join(app.getPath('userData'), 'guacamole-secret.key');
  
  try {
    const existingKey = await fs.readFile(keyPath);
    return existingKey;
  } catch {
    // Generar nueva clave aleatoria de 32 bytes
    const newKey = crypto.randomBytes(32);
    await fs.writeFile(keyPath, newKey, { mode: 0o600 }); // Solo lectura para el usuario
    return newKey;
  }
}

// Uso:
const SECRET_KEY = await getOrCreateSecretKey();
```

**Prioridad:** 🔴 **INMEDIATA**

---

### 2. Almacenamiento Inseguro de Contraseñas (Base64)

**Ubicación:** `src/services/NextcloudService.js:26`

```javascript
password: btoa(password), // Base64 básico - en producción usar cifrado real
```

**Problema:**
- Base64 **NO es encriptación**, es codificación reversible
- Las contraseñas se pueden decodificar fácilmente
- Comentario indica que es temporal pero sigue en producción
- Almacenado en localStorage sin protección adicional

**Impacto:**
- 🔴 **CRÍTICO**: Exposición de credenciales de Nextcloud
- Acceso no autorizado a servicios en la nube
- Violación de datos personales

**Solución recomendada:**
```javascript
// Usar SecureStorage existente en la aplicación
const SecureStorage = require('./SecureStorage').default;
const secureStorage = new SecureStorage();

async function configure(baseUrl, username, password, ignoreSSLErrors = false) {
  this.baseUrl = baseUrl.replace(/\/$/, '');
  this.username = username;
  this.password = password; // Mantener en memoria, no guardar directamente
  this.ignoreSSLErrors = ignoreSSLErrors;
  this.isConfigured = true;

  // Si hay master key, encriptar
  if (window.currentMasterKey) {
    const config = {
      baseUrl: this.baseUrl,
      username: this.username,
      password: await secureStorage.encryptData(password, window.currentMasterKey),
      ignoreSSLErrors: this.ignoreSSLErrors
    };
    localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
  } else {
    // Sin master key, no guardar password
    console.warn('⚠️ No se puede guardar password de Nextcloud sin master key');
    const config = {
      baseUrl: this.baseUrl,
      username: this.username,
      ignoreSSLErrors: this.ignoreSSLErrors
    };
    localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
  }
}
```

**Prioridad:** 🔴 **INMEDIATA**

---

## 🟠 PROBLEMAS DE ALTA PRIORIDAD

### 3. Memory Leaks: Timers No Limpiados

**Ubicaciones:**
- `main.js:315` - `setInterval` para limpiar conexiones SSH (nunca se limpia)
- `main.js:441` - `setInterval` para watchdog de guacd (múltiples instancias)
- `main.js:2794` - Otro `setInterval` para cleanup (nunca se limpia)

**Problema:**
```javascript
// main.js:315 - NUNCA se limpia
setInterval(() => {
  // Limpiar conexiones SSH huérfanas
}, 60000);

// main.js:2794 - NUNCA se limpia
setInterval(() => cleanupOrphanedConnections(...), 10 * 60 * 1000);
```

**Impacto:**
- 🟠 **ALTO**: Acumulación de timers en ejecuciones largas
- Consumo creciente de memoria
- Degradación del rendimiento
- Posible crash en sesiones prolongadas

**Solución recomendada:**
```javascript
// Guardar referencias a los intervalos
const cleanupIntervals = [];

// Al crear los intervalos:
cleanupIntervals.push(
  setInterval(() => {
    // Limpiar conexiones SSH huérfanas
  }, 60000)
);

// Al cerrar la aplicación:
app.on('before-quit', () => {
  cleanupIntervals.forEach(interval => clearInterval(interval));
  cleanupIntervals.length = 0;
});
```

**Prioridad:** 🟠 **ALTA** (afecta estabilidad a largo plazo)

---

### 4. Race Conditions en Pool de Conexiones SSH

**Ubicación:** `main.js:314-340` y múltiples lugares donde se accede a `sshConnectionPool`

**Problema:**
- El pool de conexiones SSH (`sshConnectionPool`) se accede desde múltiples lugares sin sincronización
- Múltiples handlers IPC pueden intentar crear/cerrar conexiones simultáneamente
- No hay locks o mutex para proteger el acceso concurrente
- El cleanup en `setInterval` puede cerrar conexiones que están siendo usadas

**Ejemplo de problema:**
```javascript
// Handler 1: Creando conexión
const ssh = await createConnection(config);
sshConnectionPool[key] = ssh;

// Mientras tanto, Handler 2: Cleanup cierra la conexión
if (!activeKeys.has(key)) {
  poolConnection.close(); // ❌ Cierra conexión que se está creando
  delete sshConnectionPool[key];
}
```

**Impacto:**
- 🟠 **ALTO**: Conexiones cerradas inesperadamente
- Errores intermitentes difíciles de reproducir
- Pérdida de sesiones activas
- Comportamiento impredecible

**Solución recomendada:**
```javascript
// Usar Map con locks
const sshConnectionPool = new Map();
const poolLocks = new Map();

async function getOrCreateConnection(key, factory) {
  // Adquirir lock
  while (poolLocks.has(key)) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  poolLocks.set(key, true);
  
  try {
    if (sshConnectionPool.has(key)) {
      return sshConnectionPool.get(key);
    }
    
    const connection = await factory();
    sshConnectionPool.set(key, connection);
    return connection;
  } finally {
    poolLocks.delete(key);
  }
}
```

**Prioridad:** 🟠 **ALTA**

---

## 🟡 PROBLEMAS DE MEDIA PRIORIDAD

### 5. Manejo Agresivo de Errores (process.exit)

**Ubicación:** `main.js:110`

```javascript
} catch (err) {
  console.error('[MAIN] ERROR EN IMPORTACIONES:', err);
  console.error('[MAIN] Stack trace:', err.stack);
  process.exit(1); // ❌ Cierra la app inmediatamente
}
```

**Problema:**
- Cierra la aplicación sin dar oportunidad de recuperación
- No permite guardar datos pendientes
- Puede perder información del usuario
- No muestra mensaje de error al usuario

**Impacto:**
- 🟡 **MEDIO**: Pérdida de datos en caso de error de importación
- Mala experiencia de usuario
- Imposibilidad de diagnosticar problemas

**Solución recomendada:**
```javascript
} catch (err) {
  console.error('[MAIN] ERROR EN IMPORTACIONES:', err);
  console.error('[MAIN] Stack trace:', err.stack);
  
  // Mostrar diálogo de error al usuario
  dialog.showErrorBox(
    'Error de Inicialización',
    `No se pudieron cargar los módulos necesarios:\n\n${err.message}\n\nLa aplicación se cerrará.`
  );
  
  // Dar tiempo para que el usuario vea el error
  setTimeout(() => {
    app.quit();
  }, 2000);
}
```

**Prioridad:** 🟡 **MEDIA**

---

### 6. Uso de dangerouslySetInnerHTML

**Ubicaciones:**
- `src/components/AIChatPanel.js:3097, 3502, 3583, 3759, 3880`
- Múltiples usos en otros componentes

**Problema:**
Aunque se usa `DOMPurify` para sanitizar, hay riesgos:
- Configuración de DOMPurify permite `onclick` (línea 2791)
- `ALLOW_DATA_ATTR: true` puede permitir atributos peligrosos
- `SANITIZE_DOM: false` desactiva sanitización DOM adicional

**Ejemplo:**
```javascript
const cleanHtml = DOMPurify.sanitize(processedHtml, {
  ALLOWED_TAGS: [...],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'onclick', ...], // ⚠️ onclick permitido
  ALLOW_DATA_ATTR: true, // ⚠️ Permite data-* attributes
  SANITIZE_DOM: false // ⚠️ Desactiva sanitización DOM
});
```

**Impacto:**
- 🟡 **MEDIO**: Riesgo de XSS si DOMPurify tiene vulnerabilidades
- Dependencia de una biblioteca externa para seguridad
- Configuración permisiva

**Solución recomendada:**
```javascript
const cleanHtml = DOMPurify.sanitize(processedHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'hr', 'span', 'div', 'i'],
  ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'data-language', 'data-code-id', 'data-code'], // ❌ Remover 'onclick'
  ALLOW_DATA_ATTR: false, // ✅ Solo permitir data-* específicos
  SANITIZE_DOM: true, // ✅ Activar sanitización DOM
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], // ✅ Bloquear explícitamente
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'] // ✅ Bloquear eventos
});
```

**Prioridad:** 🟡 **MEDIA**

---

### 7. Múltiples setInterval sin Cleanup

**Problema:**
Además de los mencionados en el punto 3, hay múltiples `setTimeout` y `setInterval` que no se limpian:
- `main.js:441` - Watchdog de guacd (creado por cada conexión)
- `main.js:1149, 1337, 1364, 2201, 2346, 2369` - Stats loops para SSH
- Múltiples timers en componentes React sin cleanup en `useEffect`

**Impacto:**
- 🟡 **MEDIO**: Acumulación de timers
- Consumo de recursos
- Posibles memory leaks en componentes React

**Solución recomendada:**
- Implementar cleanup en todos los `useEffect` de React
- Guardar referencias a todos los timers del main process
- Limpiar todos los timers en `app.on('before-quit')`

**Prioridad:** 🟡 **MEDIA**

---

## 📊 RESUMEN DE PRIORIDADES

| Prioridad | Problema | Impacto | Esfuerzo |
|-----------|-----------|---------|----------|
| 🔴 CRÍTICO | Clave secreta hardcodeada | Seguridad comprometida | Bajo |
| 🔴 CRÍTICO | Passwords en Base64 | Credenciales expuestas | Bajo |
| 🟠 ALTO | Memory leaks (timers) | Estabilidad a largo plazo | Medio |
| 🟠 ALTO | Race conditions SSH | Errores intermitentes | Alto |
| 🟡 MEDIO | process.exit agresivo | Pérdida de datos | Bajo |
| 🟡 MEDIO | dangerouslySetInnerHTML | Riesgo XSS | Bajo |
| 🟡 MEDIO | Timers sin cleanup | Memory leaks | Medio |

---

## ✅ PLAN DE ACCIÓN RECOMENDADO

### Fase 1: Seguridad Crítica (Inmediata)
1. ✅ Reemplazar clave hardcodeada de Guacamole
2. ✅ Migrar NextcloudService a encriptación real

### Fase 2: Estabilidad (Esta semana)
3. ✅ Implementar cleanup de timers
4. ✅ Agregar locks al pool de conexiones SSH

### Fase 3: Mejoras (Próximas semanas)
5. ✅ Mejorar manejo de errores
6. ✅ Ajustar configuración de DOMPurify
7. ✅ Audit completo de timers en componentes React

---

## 🔍 ÁREAS ADICIONALES A REVISAR

1. **Validación de entrada:** Revisar todos los handlers IPC para validación de parámetros
2. **Logging de credenciales:** Verificar que no se logueen passwords en consola
3. **Gestión de errores:** Implementar error boundaries en React
4. **Testing:** Agregar tests para casos de error y race conditions
5. **Documentación:** Documentar el sistema de seguridad y manejo de errores

---

**Nota:** Este análisis se basa en una revisión estática del código. Se recomienda realizar pruebas de penetración y auditoría de seguridad profesional para validar estos hallazgos.

