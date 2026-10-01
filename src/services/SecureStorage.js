/**
 * SecureStorage - Servicio de cifrado seguro para NodeTerm
 * Características:
 * - AES-GCM 256-bit para cifrado
 * - PBKDF2 para derivación de claves
 * - Protección de clave maestra en localStorage
 * - Soporte para portabilidad entre dispositivos
 */

class SecureStorage {
  constructor() {
    this.iterations = 100000; // PBKDF2 iterations
    this.deviceFingerprint = null;
    this.masterKeyCache = null;
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutos
    this.timeoutId = null;
  }

  /**
   * Genera una huella digital estable del dispositivo
   * No depende de resolución de pantalla ni zona horaria para evitar bloqueos por monitores externos o DST
   */
  generateDeviceFingerprint() {
    if (this.deviceFingerprint) return this.deviceFingerprint;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('NodeTerm Security', 2, 2);

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.platform || '',
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');

    this.deviceFingerprint = btoa(fingerprint).slice(0, 32);
    return this.deviceFingerprint;
  }

  /**
   * Genera la huella legacy para migración automática de claves antiguas
   */
  generateLegacyDeviceFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('NodeTerm Security', 2, 2);

      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL(),
        navigator.hardwareConcurrency || 'unknown'
      ].join('|');

      return btoa(fingerprint).slice(0, 32);
    } catch (_) {
      return null;
    }
  }

  /**
   * Deriva una clave criptográfica usando PBKDF2
   */
  async deriveKey(password, salt, iterations = this.iterations) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Cifra datos usando AES-GCM
   */
  async encryptData(data, password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(password, salt);
    const jsonData = JSON.stringify(data);

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(jsonData)
    );

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
      timestamp: Date.now()
    };
  }

  /**
   * Descifra datos usando AES-GCM
   */
  async decryptData(encryptedObj, password) {
    const dec = new TextDecoder();
    const salt = new Uint8Array(encryptedObj.salt);
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.data);

    const key = await this.deriveKey(password, salt);

    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      data
    );

    const jsonData = dec.decode(decrypted);
    return JSON.parse(jsonData);
  }

  /**
   * Crea un verificador criptográfico (PBKDF2 + AES-GCM) sin persistir la clave en texto plano
   */
  async createVaultVerifier(password) {
    const enc = new TextEncoder();
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const key = await this.deriveKey(password, salt);
    const payload = JSON.stringify({ check: 'nodeterm-vault-ok', v: 2, timestamp: Date.now() });

    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      enc.encode(payload)
    );

    return {
      salt: Array.from(salt),
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encrypted)),
      timestamp: Date.now()
    };
  }

  /**
   * Valida una contraseña contra el verificador sin exponer secretos
   */
  async verifyVaultVerifier(verifier, password) {
    if (!verifier || !verifier.salt || !verifier.iv || !verifier.data) {
      return false;
    }
    try {
      const dec = new TextDecoder();
      const salt = new Uint8Array(verifier.salt);
      const iv = new Uint8Array(verifier.iv);
      const data = new Uint8Array(verifier.data);

      const key = await this.deriveKey(password, salt);
      const decrypted = await window.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

      const parsed = JSON.parse(dec.decode(decrypted));
      return parsed && parsed.check === 'nodeterm-vault-ok';
    } catch (_) {
      return false;
    }
  }

  /**
   * Guarda la clave maestra de forma segura
   * Si rememberPassword es true: se cifra con safeStorage del SO (DPAPI en Windows, Keychain en macOS, Secret Service en Linux).
   * Si rememberPassword es false: NO se almacena clave en disco, solo se guarda el verifier criptográfico.
   * NUNCA se persiste en localStorage.
   */
  async saveMasterKey(masterKey, sessionPassword = null, rememberPassword = null) {
    if (!masterKey || typeof masterKey !== 'string') {
      throw new Error('Clave maestra inválida');
    }

    let remember = null;
    if (typeof sessionPassword === 'boolean') {
      remember = sessionPassword;
    } else if (typeof rememberPassword === 'boolean') {
      remember = rememberPassword;
    }
    if (remember === null) {
      remember = await this.isRememberPasswordEnabled();
    }

    // 1. Generar token de verificación criptográfica
    const verifier = await this.createVaultVerifier(masterKey);

    // 2. Persistir en el proceso principal usando safeStorage nativo
    if (window.electron && window.electron.security) {
      try {
        await window.electron.security.saveMasterKey({
          masterKey,
          verifier,
          rememberPassword: remember
        });
      } catch (e) {
        console.error('❌ [SecureStorage] Error guardando clave maestra en proceso seguro:', e);
      }
    }

    // 3. 🛡️ SEGURIDAD CRÍTICA: Purgar clave maestra de localStorage (nunca más se guarda ahí)
    localStorage.removeItem('nodeterm_master_key');

    // 4. Guardar preferencia de recordar
    if (remember) {
      localStorage.setItem('nodeterm_remember_password', 'true');
    } else {
      localStorage.removeItem('nodeterm_remember_password');
    }

    this.masterKeyCache = masterKey;
    this.resetTimeout();
  }

  async isRememberPasswordEnabled() {
    if (window.electron?.security?.getRememberPassword) {
      try {
        const val = await window.electron.security.getRememberPassword();
        if (typeof val === 'boolean') return val;
      } catch (e) { /* fallback localStorage */ }
    }
    return localStorage.getItem('nodeterm_remember_password') === 'true';
  }

  async setRememberPassword(remember) {
    if (remember) {
      localStorage.setItem('nodeterm_remember_password', 'true');
      if (this.masterKeyCache) {
        await this.saveMasterKey(this.masterKeyCache, true);
      }
    } else {
      localStorage.removeItem('nodeterm_remember_password');
      localStorage.removeItem('nodeterm_master_key');
    }
    if (window.electron?.security?.setRememberPassword) {
      try {
        await window.electron.security.setRememberPassword(remember);
      } catch (e) {
        console.warn('Error guardando rememberPassword en security.json:', e);
      }
    }
  }

  /**
   * Carga la clave maestra desde safeStorage nativo o migra formatos legacy
   */
  async loadMasterKey(sessionPassword = null) {
    try {
      if (this.masterKeyCache) {
        this.resetTimeout();
        return this.masterKeyCache;
      }

      let masterKey = null;

      // Prioridad 1: Obtener desde safeStorage nativo del SO vía IPC
      if (window.electron && window.electron.security) {
        try {
          const fromSecurity = await window.electron.security.getMasterKey();
          if (fromSecurity) {
            if (typeof fromSecurity === 'string') {
              masterKey = fromSecurity;
            } else if (typeof fromSecurity === 'object') {
              if (fromSecurity.masterKey && !fromSecurity.salt) {
                masterKey = fromSecurity.masterKey;
              } else if (fromSecurity.salt && fromSecurity.iv && fromSecurity.data) {
                // Formato legacy almacenado previamente en safeStorage
                try {
                  const legacyDec = await this.decryptData(fromSecurity, sessionPassword || this.generateDeviceFingerprint());
                  masterKey = legacyDec.masterKey || legacyDec;
                } catch (_) {
                  const legacyKey = this.generateLegacyDeviceFingerprint();
                  if (legacyKey) {
                    const legacyDec = await this.decryptData(fromSecurity, legacyKey);
                    masterKey = legacyDec.masterKey || legacyDec;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.warn('⚠️ [SecureStorage] Error leyendo clave de security handlers:', e);
        }
      }

      // Prioridad 2: Migración retrocompatible desde localStorage legacy
      if (!masterKey) {
        const stored = localStorage.getItem('nodeterm_master_key');
        if (stored) {
          try {
            const encrypted = JSON.parse(stored);
            if (encrypted && encrypted.salt && encrypted.data) {
              const protectionKey = sessionPassword || this.generateDeviceFingerprint();
              try {
                const dec = await this.decryptData(encrypted, protectionKey);
                masterKey = dec.masterKey || dec;
              } catch (_) {
                const legacyKey = this.generateLegacyDeviceFingerprint();
                if (legacyKey) {
                  const dec = await this.decryptData(encrypted, legacyKey);
                  masterKey = dec.masterKey || dec;
                }
              }
            }
          } catch (e) {
            console.warn('⚠️ [SecureStorage] Falló lectura de clave legacy en localStorage:', e);
          }
        }
      }

      // Si se recuperó una clave legacy, migrar inmediatamente al nuevo estándar safeStorage
      if (masterKey) {
        const remember = await this.isRememberPasswordEnabled();
        await this.saveMasterKey(masterKey, remember);
        localStorage.removeItem('nodeterm_master_key');
        console.log('✅ [SecureStorage] Bóveda migrada exitosamente a safeStorage nativo del SO');

        this.masterKeyCache = masterKey;
        this.resetTimeout();
        return masterKey;
      }

      return null;
    } catch (error) {
      console.error('❌ [SecureStorage] Error cargando clave maestra:', error);
      return null;
    }
  }

  /**
   * Valida criptográficamente una contraseña ingresada por el usuario (en UnlockDialog)
   */
  async verifyMasterPassword(password) {
    if (!password || typeof password !== 'string') return false;

    // 1. Obtener verifier si existe en el proceso principal
    let verifier = null;
    if (window.electron && window.electron.security && window.electron.security.getVaultVerifier) {
      try {
        verifier = await window.electron.security.getVaultVerifier();
      } catch (_) {}
    }

    if (verifier) {
      const isValid = await this.verifyVaultVerifier(verifier, password);
      if (isValid) {
        this.masterKeyCache = password;
        this.resetTimeout();
        return true;
      }
      return false;
    }

    // 2. Si no hay verifier (bóveda previa a la actualización), verificar contra datos reales:
    const connectionsData = localStorage.getItem('connections_encrypted');
    if (connectionsData) {
      try {
        await this.decryptData(JSON.parse(connectionsData), password);
        this.masterKeyCache = password;
        this.resetTimeout();
        const remember = await this.isRememberPasswordEnabled();
        await this.saveMasterKey(password, remember);
        return true;
      } catch (_) {}
    }

    const passwordsData = localStorage.getItem('passwords_encrypted');
    if (passwordsData) {
      try {
        await this.decryptData(JSON.parse(passwordsData), password);
        this.masterKeyCache = password;
        this.resetTimeout();
        const remember = await this.isRememberPasswordEnabled();
        await this.saveMasterKey(password, remember);
        return true;
      } catch (_) {}
    }

    try {
      const legacyKey = await this.loadMasterKey();
      if (legacyKey && legacyKey === password) {
        this.masterKeyCache = password;
        this.resetTimeout();
        const remember = await this.isRememberPasswordEnabled();
        await this.saveMasterKey(password, remember);
        return true;
      }
    } catch (_) {}

    return false;
  }

  /**
   * Verifica si existe una clave maestra guardada (Sync version supports only localStorage)
   * @deprecated Use checkHasSavedMasterKey() for full support
   */
  hasSavedMasterKey() {
    return localStorage.getItem('nodeterm_master_key') !== null;
  }

  /**
   * Verifica asíncronamente si existe master key o bóveda configurada
   */
  async checkHasSavedMasterKey() {
    if (window.electron && window.electron.security) {
      const hasFile = await window.electron.security.hasMasterKey();
      if (hasFile) return true;
    }
    if (this.hasSavedMasterKey()) return true;
    if (localStorage.getItem('connections_encrypted') || localStorage.getItem('passwords_encrypted')) {
      return true;
    }
    return false;
  }

  /**
   * Elimina la clave maestra guardada
   */
  async clearMasterKey() {
    localStorage.removeItem('nodeterm_master_key');
    localStorage.removeItem('nodeterm_remember_password');
    if (window.electron && window.electron.security) {
      await window.electron.security.clearMasterKey();
    }
    this.masterKeyCache = null;
    this.clearTimeout();
  }

  /**
   * Obtiene la clave maestra desde caché o localStorage
   */
  async getMasterKey(sessionPassword = null) {
    if (this.masterKeyCache) {
      this.resetTimeout();
      return this.masterKeyCache;
    }
    return await this.loadMasterKey(sessionPassword);
  }

  /**
   * Cifra y guarda sesiones
   */
  async saveSecureSessions(sessions, masterKey = null) {
    const key = masterKey || this.masterKeyCache;
    if (!key) throw new Error('No hay clave maestra disponible');

    const sessionData = {
      version: '1.0',
      sessions: sessions,
      exportedAt: new Date().toISOString()
    };

    const encrypted = await this.encryptData(sessionData, key);
    localStorage.setItem('nodeterm_secure_sessions', JSON.stringify(encrypted));
    localStorage.setItem('nodeterm_sessions_timestamp', Date.now().toString());
  }

  /**
   * Descifra y carga sesiones
   */
  async loadSecureSessions(masterKey = null) {
    try {
      const key = masterKey || this.masterKeyCache;
      if (!key) throw new Error('No hay clave maestra disponible');

      const stored = localStorage.getItem('nodeterm_secure_sessions');
      if (!stored) return [];

      const encrypted = JSON.parse(stored);
      const decrypted = await this.decryptData(encrypted, key);

      return decrypted.sessions || [];
    } catch (error) {
      console.error('Error cargando sesiones:', error);
      throw new Error('Error descifrando sesiones. Verifica la clave maestra.');
    }
  }

  /**
   * Verifica si existen sesiones cifradas
   */
  hasSecureSessions() {
    return localStorage.getItem('nodeterm_secure_sessions') !== null;
  }

  /**
   * Resetea el timeout de la clave en memoria
   */
  resetTimeout() {
    this.clearTimeout();
    // ✅ BUG FIX: Guardar referencia a 'this' para evitar problemas de contexto
    const self = this;
    this.timeoutId = setTimeout(() => {
      if (self) {
        self.masterKeyCache = null;
      }
    }, this.sessionTimeout);
  }

  /**
   * Limpia el timeout
   */
  clearTimeout() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Cambia la clave maestra
   */
  async changeMasterKey(oldKey, newKey, sessionPassword = null) {
    // Verificar clave antigua - intentar descifrar cualquier dato existente
    let validKey = false;
    let validationSuccess = [];

    // Intentar verificar con conexiones (más común)
    const connectionsData = localStorage.getItem('connections_encrypted');
    if (connectionsData) {
      try {
        await this.decryptData(JSON.parse(connectionsData), oldKey);
        validKey = true;
        validationSuccess.push('connections');
      } catch (error) {
        console.log('No se pudo validar con conexiones:', error.name);
      }
    }

    // Si conexiones no funcionaron, intentar con passwords
    if (!validKey) {
      const passwordsData = localStorage.getItem('passwords_encrypted');
      if (passwordsData) {
        try {
          await this.decryptData(JSON.parse(passwordsData), oldKey);
          validKey = true;
          validationSuccess.push('passwords');
        } catch (error) {
          console.log('No se pudo validar con passwords:', error.name);
        }
      }
    }

    // Si aún no funciona, intentar con sesiones
    if (!validKey) {
      try {
        await this.loadSecureSessions(oldKey);
        validKey = true;
        validationSuccess.push('sessions');
      } catch (error) {
        console.log('No se pudo validar con sesiones:', error.name);
      }
    }

    // Si no hay datos encriptados pero hay master key guardada, asumir que es válida
    if (!validKey && this.hasSavedMasterKey() &&
      !connectionsData &&
      !localStorage.getItem('passwords_encrypted') &&
      !localStorage.getItem('nodeterm_secure_sessions')) {
      console.log('No hay datos encriptados, pero hay master key guardada');
      validKey = true;
    }

    if (!validKey) {
      throw new Error('La clave maestra actual es incorrecta. No se pudo validar con ningún dato existente.');
    }

    console.log('Validación exitosa con:', validationSuccess.join(', '));

    // Re-encriptar conexiones con clave nueva (si existen y se pudieron validar)
    let reencryptedConnections = false;
    if (connectionsData) {
      try {
        const decrypted = await this.decryptData(JSON.parse(connectionsData), oldKey);
        const encrypted = await this.encryptData(decrypted, newKey);
        localStorage.setItem('connections_encrypted', JSON.stringify(encrypted));
        reencryptedConnections = true;
        console.log('✅ Conexiones re-encriptadas correctamente');
      } catch (error) {
        console.error('❌ Error re-encriptando conexiones:', error);
        // No fallar si las conexiones no se pueden re-encriptar, pero avisar
        if (validationSuccess.includes('connections')) {
          throw new Error(`Error al re-encriptar las conexiones: ${error.message}`);
        }
      }
    }

    // Re-encriptar passwords con clave nueva (si existen y se pudieron validar)
    let reencryptedPasswords = false;
    const passwordsData = localStorage.getItem('passwords_encrypted');
    if (passwordsData) {
      try {
        const decrypted = await this.decryptData(JSON.parse(passwordsData), oldKey);
        const encrypted = await this.encryptData(decrypted, newKey);
        localStorage.setItem('passwords_encrypted', JSON.stringify(encrypted));
        reencryptedPasswords = true;
        console.log('✅ Passwords re-encriptados correctamente');
      } catch (error) {
        console.error('❌ Error re-encriptando passwords:', error);
        // No fallar si los passwords no se pueden re-encriptar, pero avisar
        if (validationSuccess.includes('passwords')) {
          throw new Error(`Error al re-encriptar los passwords: ${error.message}`);
        }
      }
    }

    // Re-encriptar sesiones con clave nueva (si existen)
    let reencryptedSessions = false;
    try {
      const sessions = await this.loadSecureSessions(oldKey);
      await this.saveSecureSessions(sessions, newKey);
      reencryptedSessions = true;
      console.log('✅ Sesiones re-encriptadas correctamente');
    } catch (error) {
      // Si no hay sesiones o falla, no es un error crítico
      if (error.message.includes('No hay clave maestra disponible')) {
        console.log('ℹ️ No hay sesiones seguras para re-encriptar');
      } else {
        console.log('ℹ️ No se pudieron re-encriptar sesiones:', error.name);
      }
    }

    // Verificar que al menos algo se re-encriptó o no había nada que re-encriptar
    if (!reencryptedConnections && !reencryptedPasswords && !reencryptedSessions) {
      console.log('ℹ️ No había datos para re-encriptar');
    }

    // Guardar la nueva clave maestra
    await this.saveMasterKey(newKey, sessionPassword);
    console.log('✅ Clave maestra actualizada correctamente');
  }
}

export default SecureStorage; 