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
    // Verificar clave antigua
    try {
      await this.loadSecureSessions(oldKey);
    } catch (error) {
      throw new Error('La clave maestra actual es incorrecta');
    }

    // Cargar sesiones con clave antigua y reencriptar con nueva
    const sessions = await this.loadSecureSessions(oldKey);
    await this.saveSecureSessions(sessions, newKey);
    await this.saveMasterKey(newKey, sessionPassword);
  }
}

export default SecureStorage; 