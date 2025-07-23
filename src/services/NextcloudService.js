class NextcloudService {
  constructor() {
    this.baseUrl = null;
    this.username = null;
    this.password = null;
    this.appFolder = 'NodeTerm';
    this.isConfigured = false;
  }

  /**
   * Configura la conexión con Nextcloud
   */
  configure(baseUrl, username, password) {
    // Normalizar URL
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.username = username;
    this.password = password;
    this.isConfigured = true;

    // Guardar configuración (cifrada)
    const config = {
      baseUrl: this.baseUrl,
      username: this.username,
      password: btoa(password), // Base64 básico - en producción usar cifrado real
    };
    localStorage.setItem('nodeterm_nextcloud_config', JSON.stringify(config));
  }

  /**
   * Carga la configuración guardada
   */
  loadConfig() {
    try {
      const config = localStorage.getItem('nodeterm_nextcloud_config');
      if (config) {
        const parsed = JSON.parse(config);
        this.baseUrl = parsed.baseUrl;
        this.username = parsed.username;
        this.password = atob(parsed.password); // Decodificar Base64
        this.isConfigured = true;
        return true;
      }
    } catch (error) {
      console.error('Error cargando configuración Nextcloud:', error);
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
   * Verifica la conectividad con Nextcloud
   */
  async testConnection() {
    if (!this.isConfigured) {
      throw new Error('Nextcloud no está configurado');
    }

    try {
      const response = await fetch(`${this.baseUrl}/ocs/v1.php/cloud/user`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

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
      const response = await fetch(
        `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
        {
          method: 'PROPFIND',
          headers: this.getAuthHeaders()
        }
      );

      if (response.status === 404) {
        // Crear la carpeta
        const createResponse = await fetch(
          `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
          {
            method: 'MKCOL',
            headers: this.getAuthHeaders()
          }
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

    const response = await fetch(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      {
        method: 'PUT',
        headers: {
          ...this.getAuthHeaders(),
          'Content-Type': 'application/octet-stream'
        },
        body: content
      }
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
    const response = await fetch(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders()
      }
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
    const response = await fetch(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/`,
      {
        method: 'PROPFIND',
        headers: {
          ...this.getAuthHeaders(),
          'Depth': '1'
        }
      }
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
    const response = await fetch(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      {
        method: 'PROPFIND',
        headers: {
          ...this.getAuthHeaders(),
          'Depth': '0'
        }
      }
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
    const response = await fetch(
      `${this.baseUrl}/remote.php/dav/files/${this.username}/${this.appFolder}/${filename}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      }
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