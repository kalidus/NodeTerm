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
   * Genera una huella digital del dispositivo/navegador
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
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 'unknown'
    ].join('|');
    
    this.deviceFingerprint = btoa(fingerprint).slice(0, 32);
    return this.deviceFingerprint;
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
   * Guarda la clave maestra cifrada en localStorage
   */
  async saveMasterKey(masterKey, sessionPassword = null) {
    const protectionKey = sessionPassword || this.generateDeviceFingerprint();
    const encrypted = await this.encryptData(
      { masterKey, savedAt: Date.now() },
      protectionKey
    );
    
    localStorage.setItem('nodeterm_master_key', JSON.stringify(encrypted));
    this.masterKeyCache = masterKey;
    this.resetTimeout();
  }

  /**
   * Carga la clave maestra desde localStorage
   */
  async loadMasterKey(sessionPassword = null) {
    try {
      const stored = localStorage.getItem('nodeterm_master_key');
      if (!stored) return null;

      const encrypted = JSON.parse(stored);
      const protectionKey = sessionPassword || this.generateDeviceFingerprint();
      
      const decrypted = await this.decryptData(encrypted, protectionKey);
      this.masterKeyCache = decrypted.masterKey;
      this.resetTimeout();
      
      return decrypted.masterKey;
    } catch (error) {
      console.error('Error cargando clave maestra:', error);
      return null;
    }
  }

  /**
   * Verifica si existe una clave maestra guardada
   */
  hasSavedMasterKey() {
    return localStorage.getItem('nodeterm_master_key') !== null;
  }

  /**
   * Elimina la clave maestra guardada
   */
  clearMasterKey() {
    localStorage.removeItem('nodeterm_master_key');
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
    this.timeoutId = setTimeout(() => {
      this.masterKeyCache = null;
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