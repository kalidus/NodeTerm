class NextcloudService {
  constructor() {
    this.baseUrl = null;
    this.username = null;
    this.password = null;
    this.appFolder = 'NodeTerm';
    this.isConfigured = false;
    this.ignoreSSLErrors = false; // Nueva opción para ignorar errores SSL
  }

  /**
   * Configura la conexión con Nextcloud
   * ✅ SEGURIDAD: Usa encriptación real con SecureStorage en lugar de Base64
   */
  async configure(baseUrl, username, password, ignoreSSLErrors = false) {
    // Normalizar URL
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password; // Mantener en memoria para uso inmediato
    this.ignoreSSLErrors = ignoreSSLErrors;
    this.isConfigured = true;

    // ✅ SEGURIDAD: Usar SecureStorage si está disponible
    try {
      // Intentar cargar SecureStorage
      const SecureStorage = require('./SecureStorage').default || require('./SecureStorage');
      const secureStorage = new SecureStorage();
      
      // Verificar si hay master key disponible
      const masterKey = window.currentMasterKey || await secureStorage.getMasterKey();
      
      if (masterKey) {
        // Encriptar password con SecureStorage
        const encryptedPassword = await secureStorage.encryptData(password, masterKey);
        
        const config = {
          baseUrl: this.baseUrl,
          username: this.username,
          password: encryptedPassword, // ✅ Encriptado con AES-GCM
          encrypted: true, // Marca para indicar que está encriptado
          ignoreSSLErrors: this.ignoreSSLErrors
        };
        localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
        console.log('✅ [Nextcloud] Contraseña guardada de forma segura con encriptación');
      } else {
        // Sin master key, no guardar password (requerirá reingreso)
        console.warn('⚠️ [Nextcloud] No hay master key disponible. La contraseña no se guardará.');
        const config = {
          baseUrl: this.baseUrl,
          username: this.username,
          encrypted: false,
          ignoreSSLErrors: this.ignoreSSLErrors
        };
        localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
      }
    } catch (error) {
      // Fallback: Si SecureStorage no está disponible, no guardar password
      console.error('❌ [Nextcloud] Error usando SecureStorage:', error);
      console.warn('⚠️ [Nextcloud] La contraseña no se guardará por seguridad');
      const config = {
        baseUrl: this.baseUrl,
        username: this.username,
        encrypted: false,
        ignoreSSLErrors: this.ignoreSSLErrors
      };
      localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
    }
  }

  /**
   * Carga la configuración guardada
   * ✅ SEGURIDAD: Descifra password si está encriptado con SecureStorage
   */
  async loadConfig() {
    try {
      const config = localStorage.getItem('nodeterm_nextcloud_config');
      if (config) {
        const parsed = JSON.parse(config);
        this.baseUrl = parsed.baseUrl;
        this.username = parsed.username;
        this.ignoreSSLErrors = parsed.ignoreSSLErrors || false;
        
        // ✅ SEGURIDAD: Descifrar password si está encriptado
        if (parsed.password) {
          if (parsed.encrypted === true) {
            // Password encriptado con SecureStorage
            try {
              const SecureStorage = require('./SecureStorage').default || require('./SecureStorage');
              const secureStorage = new SecureStorage();
              const masterKey = window.currentMasterKey || await secureStorage.getMasterKey();
              
              if (masterKey) {
                this.password = await secureStorage.decryptData(parsed.password, masterKey);
                this.isConfigured = true;
                console.log('✅ [Nextcloud] Contraseña descifrada correctamente');
                return true;
              } else {
                console.warn('⚠️ [Nextcloud] No hay master key disponible para descifrar la contraseña');
                this.isConfigured = false;
                return false;
              }
            } catch (decryptError) {
              console.error('❌ [Nextcloud] Error descifrando contraseña:', decryptError);
              this.isConfigured = false;
              return false;
            }
          } else {
            // Migración: Si está en Base64 (formato antiguo), intentar decodificar
            // pero marcar como no seguro
            try {
              this.password = atob(parsed.password);
              console.warn('⚠️ [Nextcloud] Contraseña en formato antiguo (Base64). Se recomienda reconfigurar.');
              this.isConfigured = true;
              return true;
            } catch (base64Error) {
              console.error('❌ [Nextcloud] Error decodificando contraseña Base64:', base64Error);
              this.isConfigured = false;
              return false;
            }
          }
        } else {
          // No hay password guardado (requiere reingreso)
          this.password = null;
          this.isConfigured = false;
          return false;
        }
      }
    } catch (error) {
      console.error('❌ [Nextcloud] Error cargando configuración:', error);
    }
    return false;
  }

  /**
   * Elimina la configuración
   */
  clearConfig() {
    localStorage.removeItem('nodeterm_nextcloud_config');
    this.baseUrl = null;
    this.username = null;
    this.password = null;
    this.ignoreSSLErrors = false;
    this.isConfigured = false;
  }

  /**
   * Genera headers de autenticación
   */
  getAuthHeaders() {
    const auth = btoa(`${this.username}:${this.password}`);
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'OCS-APIRequest': 'true'
    };
  }

  /**
   * Configura opciones de fetch con manejo de SSL
   */
  getFetchOptions(method = 'GET', headers = {}, body = null) {
    const options = {
      method,
      headers: {
        ...this.getAuthHeaders(),
        ...headers
      }
    };

    if (body) {
      options.body = body;
    }

    return options;
  }

  /**
   * Realiza una petición HTTP con manejo de SSL personalizado
   */
  async makeHttpRequest(url, options) {
    // Si se debe ignorar errores SSL y estamos en Electron, usar el proceso principal
    if (this.ignoreSSLErrors && typeof window !== 'undefined' && window.electron && window.electron.ipcRenderer) {
      try {
        const response = await window.electron.ipcRenderer.invoke('nextcloud:http-request', {
          url,
          options,
          ignoreSSLErrors: true
        });
        
        // Convertir la respuesta al formato de fetch
        return {
          ok: response.status >= 200 && response.status < 300,
          status: response.status,
          statusText: response.statusText,
          headers: new Headers(response.headers),
          text: async () => response.data,
          json: async () => JSON.parse(response.data)
        };
      } catch (error) {
        throw new Error(`Error en petición HTTP: ${error.message}`);
      }
    } else {
      // Usar fetch normal
      return fetch(url, options);
    }
  }

  /**
   * Verifica la conectividad con Nextcloud
   */
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    try {
      const options = this.getFetchOptions('GET');
      const response = await this.makeHttpRequest(`${this.baseUrl}/ocs/v1.php/cloud/user`, options);

      if (response.ok) {
        return { success: true, message: 'Conexión exitosa' };
      } else if (response.status === 401) {
        throw new Error('Credenciales incorrectas');
      } else {
        throw new Error(`Error de conexión: ${response.status}`);
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('No se puede conectar al servidor Nextcloud');
      }
      throw error;
    }
  }

  /**
   * Crea la carpeta de la aplicación si no existe
   */
  async ensureAppFolder() {
    try {
      // Verificar si la carpeta existe
      const options = this.getFetchOptions('PROPFIND');
      const response = await this.makeHttpRequest(
        `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
        options
      );

      if (response.status === 404) {
        // Crear la carpeta
        const createOptions = this.getFetchOptions('MKCOL');
        const createResponse = await this.makeHttpRequest(
          `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
          createOptions
        );

        if (!createResponse.ok) {
          throw new Error('No se pudo crear la carpeta de la aplicación');
        }
      }
    } catch (error) {
      console.error('Error creando carpeta de aplicación:', error);
      throw error;
    }
  }

  /**
   * Sube un archivo a Nextcloud
   */
  async uploadFile(filename, content) {
    await this.ensureAppFolder();

    const options = this.getFetchOptions('PUT', {
      'Content-Type': 'application/octet-stream'
    }, content);

    const response = await this.makeHttpRequest(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      options
    );

    if (!response.ok) {
      throw new Error(`Error subiendo archivo: ${response.status}`);
    }

    return true;
  }

  /**
   * Descarga un archivo de Nextcloud
   */
  async downloadFile(filename) {
    const options = this.getFetchOptions('GET');
    const response = await this.makeHttpRequest(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      options
    );

    if (response.status === 404) {
      return null; // Archivo no existe
    }

    if (!response.ok) {
      throw new Error(`Error descargando archivo: ${response.status}`);
    }

    return await response.text();
  }

  /**
   * Lista archivos en la carpeta de la aplicación
   */
  async listFiles() {
    const options = this.getFetchOptions('PROPFIND', {
      'Depth': '1'
    });

    const response = await this.makeHttpRequest(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
      options
    );

    if (response.status === 404) {
      return []; // Carpeta no existe
    }

    if (!response.ok) {
      throw new Error(`Error listando archivos: ${response.status}`);
    }

    const xmlText = await response.text();
    // Parse simple del XML - en producción usar un parser XML real
    const files = [];
    const matches = xmlText.match(/<d:href>([^<]+)<\/d:href>/g);
    
    if (matches) {
      matches.forEach(match => {
        const path = match.replace(/<\/?d:href>/g, '');
        const filename = path.split('/').pop();
        if (filename && filename !== this.appFolder && filename.trim() !== '') {
          files.push(filename);
        }
      });
    }

    return files;
  }

  /**
   * Obtiene información de un archivo
   */
  async getFileInfo(filename) {
    const options = this.getFetchOptions('PROPFIND', {
      'Depth': '0'
    });

    const response = await this.makeHttpRequest(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      options
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Error obteniendo información del archivo: ${response.status}`);
    }

    const xmlText = await response.text();
    
    // Parse simple para obtener fecha de modificación
    const lastModifiedMatch = xmlText.match(/<d:getlastmodified>([^<]+)<\/d:getlastmodified>/);
    const sizeMatch = xmlText.match(/<d:getcontentlength>([^<]+)<\/d:getcontentlength>/);
    
    return {
      lastModified: lastModifiedMatch ? new Date(lastModifiedMatch[1]) : null,
      size: sizeMatch ? parseInt(sizeMatch[1]) : 0
    };
  }

  /**
   * Elimina un archivo
   */
  async deleteFile(filename) {
    const options = this.getFetchOptions('DELETE');
    const response = await this.makeHttpRequest(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      options
    );

    if (response.status === 404) {
      return true; // Ya no existe
    }

    if (!response.ok) {
      throw new Error(`Error eliminando archivo: ${response.status}`);
    }

    return true;
  }
}

export default NextcloudService;