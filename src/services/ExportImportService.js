/**
 * ExportImportService - Servicio para exportar/importar todos los datos de NodeTerm
 * Características:
 * - Exporta conexiones, contraseñas, conversaciones, configuraciones
 * - Encriptación AES-256-GCM opcional con contraseña
 * - Validación de integridad de datos
 * - NO exporta la master key por seguridad
 * - Formato de archivo: .nodeterm (JSON encriptado)
 */

class ExportImportService {
  constructor() {
    this.supportedVersion = '1.0';
    this.fileExtension = '.nodeterm';
  }

  /**
   * Obtiene todas las claves de localStorage con un prefijo específico
   */
  getKeysWithPrefix(prefix) {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Obtiene todas las claves de localStorage (para debugging)
   */
  getAllStorageKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Exporta todos los datos seleccionados
   * @param {Object} options - Opciones de exportación
   * @param {boolean} options.connections - Incluir conexiones
   * @param {boolean} options.passwords - Incluir contraseñas
   * @param {boolean} options.conversations - Incluir conversaciones IA
   * @param {boolean} options.config - Incluir configuraciones
   * @param {boolean} options.recordings - Incluir grabaciones (metadata)
   * @param {string} options.encryptPassword - Contraseña para encriptar (opcional)
   * @returns {Promise<Object>} Datos exportados
   */
  async exportAllData(options = {}) {
    const {
      connections = true,
      passwords = true,
      conversations = true,
      config = true,
      recordings = false,
      encryptPassword = null
    } = options;

    const exportData = {
      version: this.supportedVersion,
      exportedAt: new Date().toISOString(),
      appVersion: window.electronAPI?.getVersionInfo ? 
        (await window.electronAPI.getVersionInfo()).appVersion : '1.3.1',
      encrypted: !!encryptPassword,
      categories: {
        connections: connections,
        passwords: passwords,
        conversations: conversations,
        config: config,
        recordings: recordings
      },
      data: {}
    };

    try {
      // === 1. CONEXIONES ===
      if (connections) {
        const treeData = this.safeGetItem('basicapp2_tree_data');
        const encryptedConnections = this.safeGetItem('connections_encrypted');
        const importSources = this.safeGetItem('IMPORT_SOURCES');
        const favorites = this.safeGetItem('nodeterm_favorite_connections');
        
        console.log('[ExportImportService] Exportando conexiones:', {
          hasTreeData: !!treeData,
          treeDataLength: Array.isArray(treeData) ? treeData.length : 'N/A',
          hasEncrypted: !!encryptedConnections,
          hasImportSources: !!importSources,
          hasFavorites: !!favorites,
          allKeys: this.getAllStorageKeys().filter(k => k.includes('tree') || k.includes('connection') || k.includes('basicapp'))
        });
        
        exportData.data.connections = {
          tree: treeData,
          encrypted: encryptedConnections,
          importSources: importSources,
          favorites: favorites
        };
      }

      // === 2. CONTRASEÑAS ===
      if (passwords) {
        const encryptedPasswords = this.safeGetItem('passwords_encrypted');
        const passwordNodes = this.safeGetItem('passwordManagerNodes');
        
        console.log('[ExportImportService] Exportando contraseñas:', {
          hasEncrypted: !!encryptedPasswords,
          hasNodes: !!passwordNodes,
          nodesLength: Array.isArray(passwordNodes) ? passwordNodes.length : 'N/A',
          allKeys: this.getAllStorageKeys().filter(k => k.includes('password'))
        });
        
        exportData.data.passwords = {
          encrypted: encryptedPasswords,
          nodes: passwordNodes, // Fallback sin encriptar
          expandedKeys: this.safeGetItem('passwords_expanded_keys'),
          allExpanded: this.safeGetItem('passwords_all_expanded'),
          count: this.safeGetItem('passwords_count')
        };
      }

      // === 3. CONVERSACIONES DE IA ===
      if (conversations) {
        const conversationKeys = this.getKeysWithPrefix('conversation_');
        const conversationData = {};
        conversationKeys.forEach(key => {
          conversationData[key] = this.safeGetItem(key);
        });
        
        console.log('[ExportImportService] Exportando conversaciones:', {
          conversationKeysCount: conversationKeys.length,
          conversationKeys: conversationKeys,
          hasIndex: !!this.safeGetItem('ai_conversations_index'),
          allKeys: this.getAllStorageKeys().filter(k => k.includes('conversation') || k.includes('ai_'))
        });
        
        exportData.data.conversations = {
          conversations: conversationData,
          index: this.safeGetItem('ai_conversations_index'),
          // Incluir backups si existen
          backups: this.getBackups()
        };
      }

      // === 4. CONFIGURACIONES ===
      if (config) {
        exportData.data.config = {
          // Clientes de IA
          aiClientsEnabled: this.safeGetItem('ai_clients_enabled'),
          selectedMcpServers: this.safeGetItem('selectedMcpServers'),
          
          // Terminal
          defaultTerminal: this.safeGetItem('nodeterm_default_local_terminal'),
          scrollbackLines: this.safeGetItem('nodeterm_scrollback_lines'),
          
          // Fuentes y temas
          sidebarFont: this.safeGetItem('sidebarFont'),
          sidebarFontSize: this.safeGetItem('sidebarFontSize'),
          homeTabFont: this.safeGetItem('homeTabFont'),
          homeTabFontSize: this.safeGetItem('homeTabFontSize'),
          iconThemeSidebar: this.safeGetItem('iconThemeSidebar'),
          actionBarIconTheme: this.safeGetItem('actionBarIconTheme'),
          sessionActionIconTheme: this.safeGetItem('sessionActionIconTheme'),
          treeTheme: this.safeGetItem('treeTheme'),
          
          // Docker
          localDockerTerminalTheme: this.safeGetItem('localDockerTerminalTheme'),
          nodeterm_docker_font_family: this.safeGetItem('nodeterm_docker_font_family'),
          nodeterm_docker_font_size: this.safeGetItem('nodeterm_docker_font_size'),
          
          // Terminal local
          basicapp_local_terminal_font_family: this.safeGetItem('basicapp_local_terminal_font_family'),
          basicapp_local_terminal_font_size: this.safeGetItem('basicapp_local_terminal_font_size'),
          
          // UI
          connectionDetailsPanelHeight: this.safeGetItem('connectionDetailsPanelHeight'),
          lock_home_button: this.safeGetItem('lock_home_button'),
          nodeterm_fav_type: this.safeGetItem('nodeterm_fav_type'),
          
          // Auditoría
          audit_auto_recording: this.safeGetItem('audit_auto_recording'),
          audit_recording_quality: this.safeGetItem('audit_recording_quality'),
          audit_encrypt_recordings: this.safeGetItem('audit_encrypt_recordings'),
          
          // Idioma
          nodeterm_language: this.safeGetItem('nodeterm_language')
        };
      }

      // === 5. GRABACIONES (solo metadata) ===
      if (recordings) {
        const recordingKeys = this.getKeysWithPrefix('recording_');
        const recordingMetadata = {};
        recordingKeys.forEach(key => {
          if (key.includes('_metadata')) {
            recordingMetadata[key] = this.safeGetItem(key);
          }
        });
        exportData.data.recordings = recordingMetadata;
      }

      // === 6. ENCRIPTAR SI SE SOLICITA ===
      if (encryptPassword) {
        const encryptedData = await this.encryptData(exportData.data, encryptPassword);
        exportData.data = encryptedData;
        exportData.encrypted = true;
      }

      // === 7. METADATA FINAL ===
      exportData.dataSize = JSON.stringify(exportData.data).length;
      exportData.checksum = await this.generateChecksum(exportData.data);

      return exportData;

    } catch (error) {
      console.error('[ExportImportService] Error al exportar datos:', error);
      throw new Error(`Error al exportar: ${error.message}`);
    }
  }

  /**
   * Obtiene un item de localStorage de forma segura
   */
  safeGetItem(key) {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;
      
      // Intentar parsear como JSON
      try {
        return JSON.parse(value);
      } catch {
        // Si no es JSON válido, devolver como string
        return value;
      }
    } catch (error) {
      console.warn(`[ExportImportService] Error al obtener ${key}:`, error);
      return null;
    }
  }

  /**
   * Obtiene backups de conversaciones
   */
  getBackups() {
    const backupKeys = this.getKeysWithPrefix('ai_conversations_backup_');
    const backups = {};
    backupKeys.forEach(key => {
      backups[key] = this.safeGetItem(key);
    });
    return backups;
  }

  /**
   * Encripta datos con una contraseña usando AES-256-GCM
   */
  async encryptData(data, password) {
    try {
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);
      
      // Generar salt aleatorio
      const salt = crypto.getRandomValues(new Uint8Array(16));
      
      // Derivar clave usando PBKDF2
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
      );
      
      // Generar IV aleatorio
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encriptar
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encoder.encode(dataString)
      );
      
      // Convertir a base64 para almacenamiento
      const encryptedArray = new Uint8Array(encryptedBuffer);
      
      return {
        encrypted: true,
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(encryptedArray)
      };
    } catch (error) {
      console.error('[ExportImportService] Error al encriptar:', error);
      throw new Error('Error al encriptar los datos');
    }
  }

  /**
   * Desencripta datos con una contraseña
   */
  async decryptData(encryptedObj, password) {
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      
      // Restaurar arrays desde el formato serializado
      const salt = new Uint8Array(encryptedObj.salt);
      const iv = new Uint8Array(encryptedObj.iv);
      const data = new Uint8Array(encryptedObj.data);
      
      // Derivar clave
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveBits', 'deriveKey']
      );
      
      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
      );
      
      // Desencriptar
      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );
      
      const decryptedString = decoder.decode(decryptedBuffer);
      return JSON.parse(decryptedString);
    } catch (error) {
      console.error('[ExportImportService] Error al desencriptar:', error);
      throw new Error('Contraseña incorrecta o datos corruptos');
    }
  }

  /**
   * Genera checksum de los datos para validación de integridad
   */
  async generateChecksum(data) {
    try {
      const dataString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(dataString);
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.warn('[ExportImportService] Error al generar checksum:', error);
      return null;
    }
  }

  /**
   * Valida la integridad de un archivo de exportación
   */
  async validateExportFile(exportData) {
    try {
      // Validar estructura básica
      if (!exportData.version || !exportData.data || !exportData.exportedAt) {
        return { valid: false, error: 'Estructura de archivo inválida' };
      }

      // Validar versión
      if (exportData.version !== this.supportedVersion) {
        return { 
          valid: false, 
          error: `Versión no compatible. Esperada: ${this.supportedVersion}, Recibida: ${exportData.version}` 
        };
      }

      // Validar checksum si existe
      if (exportData.checksum) {
        const calculatedChecksum = await this.generateChecksum(exportData.data);
        if (calculatedChecksum !== exportData.checksum) {
          return { valid: false, error: 'Checksum inválido - Archivo corrupto' };
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Importa datos desde un archivo
   * @param {Object} exportData - Datos del archivo de exportación
   * @param {Object} options - Opciones de importación
   * @param {boolean} options.merge - Fusionar con datos existentes
   * @param {boolean} options.replace - Reemplazar datos existentes
   * @param {Array} options.categories - Categorías a importar
   * @param {string} options.decryptPassword - Contraseña para desencriptar
   */
  async importAllData(exportData, options = {}) {
    const {
      merge = false,
      replace = false,
      categories = ['connections', 'passwords', 'conversations', 'config'],
      decryptPassword = null
    } = options;

    try {
      // 1. Validar archivo
      const validation = await this.validateExportFile(exportData);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      let dataToImport = exportData.data;

      // 2. Desencriptar si es necesario
      if (exportData.encrypted) {
        if (!decryptPassword) {
          throw new Error('Se requiere contraseña para desencriptar el archivo');
        }
        dataToImport = await this.decryptData(exportData.data, decryptPassword);
      }

      // 3. Crear backup antes de importar
      const backupKey = `nodeterm_backup_${Date.now()}`;
      await this.createBackup(backupKey);

      const importStats = {
        connections: 0,
        passwords: 0,
        conversations: 0,
        config: 0,
        recordings: 0
      };

      // 4. Importar por categorías
      if (categories.includes('connections') && dataToImport.connections) {
        await this.importConnections(dataToImport.connections, { merge, replace });
        importStats.connections = this.countImportedConnections(dataToImport.connections);
      }

      if (categories.includes('passwords') && dataToImport.passwords) {
        await this.importPasswords(dataToImport.passwords, { merge, replace });
        importStats.passwords = this.countImportedPasswords(dataToImport.passwords);
      }

      if (categories.includes('conversations') && dataToImport.conversations) {
        await this.importConversations(dataToImport.conversations, { merge, replace });
        importStats.conversations = Object.keys(dataToImport.conversations.conversations || {}).length;
      }

      if (categories.includes('config') && dataToImport.config) {
        await this.importConfig(dataToImport.config, { merge, replace });
        importStats.config = Object.keys(dataToImport.config).filter(k => dataToImport.config[k] !== null).length;
      }

      if (categories.includes('recordings') && dataToImport.recordings) {
        await this.importRecordings(dataToImport.recordings, { merge, replace });
        importStats.recordings = Object.keys(dataToImport.recordings || {}).length;
      }

      return {
        success: true,
        stats: importStats,
        backupKey: backupKey,
        message: 'Datos importados correctamente'
      };

    } catch (error) {
      console.error('[ExportImportService] Error al importar:', error);
      throw error;
    }
  }

  /**
   * Crea un backup selectivo del localStorage (solo claves relevantes para evitar QuotaExceededError)
   */
  async createBackup(backupKey) {
    // Solo hacer backup de las claves relevantes de NodeTerm, no todo el localStorage
    const relevantKeys = [
      'basicapp2_tree_data',
      'connections_encrypted',
      'passwords_encrypted',
      'passwordManagerNodes',
      'IMPORT_SOURCES',
      'nodeterm_favorite_connections',
      'ai_clients_enabled',
      'selectedMcpServers',
      'nodeterm_default_local_terminal',
      'ai_conversations_index',
      // Añadir todas las claves de conversaciones
      ...this.getKeysWithPrefix('conversation_'),
      // Añadir todas las claves de configuraciones relevantes
      'sidebarFont',
      'sidebarFontSize',
      'homeTabFont',
      'homeTabFontSize',
      'iconThemeSidebar',
      'actionBarIconTheme',
      'sessionActionIconTheme',
      'treeTheme'
    ];
    
    const backup = {};
    let totalSize = 0;
    const maxSize = 4 * 1024 * 1024; // 4MB máximo para evitar QuotaExceededError
    
    for (const key of relevantKeys) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const size = value.length;
          if (totalSize + size > maxSize) {
            console.warn(`[ExportImportService] Backup excedería límite, omitiendo clave: ${key}`);
            break;
          }
          backup[key] = value;
          totalSize += size;
        }
      } catch (error) {
        console.warn(`[ExportImportService] Error al obtener ${key} para backup:`, error);
      }
    }
    
    try {
      const backupString = JSON.stringify(backup);
      if (backupString.length > maxSize) {
        console.warn('[ExportImportService] Backup demasiado grande, creando backup mínimo');
        // Backup mínimo solo con las claves más críticas
        const minimalBackup = {
          'basicapp2_tree_data': backup['basicapp2_tree_data'],
          'passwords_encrypted': backup['passwords_encrypted'],
          'passwordManagerNodes': backup['passwordManagerNodes']
        };
        localStorage.setItem(backupKey, JSON.stringify(minimalBackup));
      } else {
        localStorage.setItem(backupKey, JSON.stringify(backup));
      }
      console.log(`[ExportImportService] Backup creado: ${backupKey} (${(totalSize / 1024).toFixed(1)} KB)`);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('[ExportImportService] Error: localStorage lleno, no se puede crear backup');
        throw new Error('El almacenamiento local está lleno. Por favor, limpia algunos datos antes de importar.');
      }
      throw error;
    }
  }

  /**
   * Restaura desde un backup
   */
  async restoreFromBackup(backupKey) {
    try {
      const backupData = localStorage.getItem(backupKey);
      if (!backupData) {
        throw new Error('Backup no encontrado');
      }
      
      const backup = JSON.parse(backupData);
      Object.keys(backup).forEach(key => {
        localStorage.setItem(key, backup[key]);
      });
      
      return { success: true, message: 'Backup restaurado correctamente' };
    } catch (error) {
      throw new Error(`Error al restaurar backup: ${error.message}`);
    }
  }

  /**
   * Importa conexiones
   */
  async importConnections(connectionsData, options) {
    if (options.replace) {
      // Reemplazar: eliminar datos existentes
      localStorage.removeItem('basicapp2_tree_data');
      localStorage.removeItem('connections_encrypted');
      localStorage.removeItem('IMPORT_SOURCES');
      localStorage.removeItem('nodeterm_favorite_connections');
    }

    // Importar (fusionar o reemplazar según options)
    if (connectionsData.tree) {
      if (options.merge && localStorage.getItem('basicapp2_tree_data')) {
        const existing = JSON.parse(localStorage.getItem('basicapp2_tree_data'));
        const merged = this.mergeTreeData(existing, connectionsData.tree);
        localStorage.setItem('basicapp2_tree_data', JSON.stringify(merged));
      } else {
        localStorage.setItem('basicapp2_tree_data', JSON.stringify(connectionsData.tree));
      }
    }

    if (connectionsData.encrypted) {
      localStorage.setItem('connections_encrypted', JSON.stringify(connectionsData.encrypted));
    }

    if (connectionsData.importSources) {
      localStorage.setItem('IMPORT_SOURCES', JSON.stringify(connectionsData.importSources));
    }

    if (connectionsData.favorites) {
      localStorage.setItem('nodeterm_favorite_connections', JSON.stringify(connectionsData.favorites));
    }
  }

  /**
   * Importa contraseñas
   */
  async importPasswords(passwordsData, options) {
    if (options.replace) {
      localStorage.removeItem('passwords_encrypted');
      localStorage.removeItem('passwordManagerNodes');
    }

    if (passwordsData.encrypted) {
      localStorage.setItem('passwords_encrypted', JSON.stringify(passwordsData.encrypted));
    }

    if (passwordsData.nodes) {
      localStorage.setItem('passwordManagerNodes', JSON.stringify(passwordsData.nodes));
    }

    if (passwordsData.expandedKeys) {
      localStorage.setItem('passwords_expanded_keys', JSON.stringify(passwordsData.expandedKeys));
    }

    if (passwordsData.allExpanded !== null) {
      localStorage.setItem('passwords_all_expanded', JSON.stringify(passwordsData.allExpanded));
    }

    if (passwordsData.count) {
      localStorage.setItem('passwords_count', passwordsData.count);
    }
  }

  /**
   * Importa conversaciones de IA
   */
  async importConversations(conversationsData, options) {
    if (options.replace) {
      // Eliminar todas las conversaciones existentes
      const keys = this.getKeysWithPrefix('conversation_');
      keys.forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('ai_conversations_index');
    }

    // Importar conversaciones
    if (conversationsData.conversations) {
      Object.keys(conversationsData.conversations).forEach(key => {
        const value = conversationsData.conversations[key];
        if (value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
    }

    if (conversationsData.index) {
      localStorage.setItem('ai_conversations_index', JSON.stringify(conversationsData.index));
    }

    // Importar backups si existen
    if (conversationsData.backups) {
      Object.keys(conversationsData.backups).forEach(key => {
        const value = conversationsData.backups[key];
        if (value !== null) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      });
    }
  }

  /**
   * Importa configuraciones
   */
  async importConfig(configData, options) {
    Object.keys(configData).forEach(key => {
      const value = configData[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'object') {
          localStorage.setItem(key, JSON.stringify(value));
        } else {
          localStorage.setItem(key, value);
        }
      }
    });
  }

  /**
   * Importa grabaciones (metadata)
   */
  async importRecordings(recordingsData, options) {
    Object.keys(recordingsData).forEach(key => {
      const value = recordingsData[key];
      if (value !== null) {
        localStorage.setItem(key, JSON.stringify(value));
      }
    });
  }

  /**
   * Fusiona árboles de conexiones
   */
  mergeTreeData(existing, imported) {
    // Implementación simple: concatenar y eliminar duplicados por key
    const merged = [...existing];
    
    imported.forEach(importedNode => {
      const existingIndex = merged.findIndex(n => n.key === importedNode.key);
      if (existingIndex === -1) {
        merged.push(importedNode);
      } else {
        // Si existe, fusionar hijos si es folder
        if (importedNode.children && merged[existingIndex].children) {
          merged[existingIndex].children = this.mergeTreeData(
            merged[existingIndex].children,
            importedNode.children
          );
        }
      }
    });
    
    return merged;
  }

  /**
   * Cuenta conexiones importadas
   */
  countImportedConnections(connectionsData) {
    if (!connectionsData || typeof connectionsData !== 'object') {
      return 0;
    }
    
    let count = 0;
    
    // Intentar contar desde tree (datos sin encriptar)
    if (connectionsData.tree && Array.isArray(connectionsData.tree)) {
      const countNodes = (nodes) => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach(node => {
          if (node && node.data && (node.data.type === 'ssh' || node.data.type === 'rdp' || node.data.type === 'rdp-guacamole' || node.data.type === 'vnc' || node.data.type === 'sftp' || node.data.type === 'ftp' || node.data.type === 'scp')) {
            count++;
          }
          if (node.children && Array.isArray(node.children)) {
            countNodes(node.children);
          }
        });
      };
      countNodes(connectionsData.tree);
    }
    
    // Si no hay tree pero hay datos encriptados, indicar que hay datos pero no podemos contarlos
    if (count === 0 && connectionsData.encrypted) {
      // No podemos contar sin desencriptar, pero sabemos que hay datos
      return -1; // -1 indica "hay datos encriptados pero no podemos contar"
    }
    
    return count;
  }

  /**
   * Cuenta contraseñas importadas
   */
  countImportedPasswords(passwordsData) {
    if (!passwordsData || typeof passwordsData !== 'object') {
      return 0;
    }
    
    let count = 0;
    
    // Intentar contar desde nodes (datos sin encriptar)
    if (passwordsData.nodes && Array.isArray(passwordsData.nodes)) {
      const countNodes = (nodes) => {
        if (!Array.isArray(nodes)) return;
        nodes.forEach(node => {
          if (node && node.data && node.data.type === 'password') {
            count++;
          }
          if (node.children && Array.isArray(node.children)) {
            countNodes(node.children);
          }
        });
      };
      countNodes(passwordsData.nodes);
    }
    
    // Si no hay nodes pero hay datos encriptados, indicar que hay datos pero no podemos contarlos
    if (count === 0 && passwordsData.encrypted) {
      // No podemos contar sin desencriptar, pero sabemos que hay datos
      return -1; // -1 indica "hay datos encriptados pero no podemos contar"
    }
    
    return count;
  }

  /**
   * Obtiene preview de los datos del archivo
   */
  async getExportPreview(exportData) {
    try {
      let dataToAnalyze = exportData.data;

      // Si está encriptado, no podemos hacer preview sin contraseña
      if (exportData.encrypted) {
        return {
          encrypted: true,
          version: exportData.version,
          exportedAt: exportData.exportedAt,
          appVersion: exportData.appVersion,
          dataSize: exportData.dataSize,
          categories: exportData.categories
        };
      }

      // Analizar datos
      const connectionsCount = this.countImportedConnections(dataToAnalyze.connections || {});
      const passwordsCount = this.countImportedPasswords(dataToAnalyze.passwords || {});
      
      console.log('[ExportImportService] Preview stats:', {
        connectionsCount,
        passwordsCount,
        hasConnectionsData: !!dataToAnalyze.connections,
        hasPasswordsData: !!dataToAnalyze.passwords,
        connectionsTree: dataToAnalyze.connections?.tree ? 'existe' : 'null',
        passwordsNodes: dataToAnalyze.passwords?.nodes ? 'existe' : 'null',
        passwordsEncrypted: !!dataToAnalyze.passwords?.encrypted,
        connectionsEncrypted: !!dataToAnalyze.connections?.encrypted
      });
      
      const preview = {
        encrypted: false,
        version: exportData.version,
        exportedAt: exportData.exportedAt,
        appVersion: exportData.appVersion,
        dataSize: exportData.dataSize,
        stats: {
          connections: connectionsCount >= 0 ? connectionsCount : 0, // Si es -1, mostrar 0 pero con nota
          passwords: passwordsCount >= 0 ? passwordsCount : 0,
          conversations: Object.keys(dataToAnalyze.conversations?.conversations || {}).length,
          configItems: Object.keys(dataToAnalyze.config || {}).filter(k => dataToAnalyze.config[k] !== null).length,
          recordings: Object.keys(dataToAnalyze.recordings || {}).length,
          // Flags para indicar si hay datos encriptados
          hasEncryptedConnections: connectionsCount === -1,
          hasEncryptedPasswords: passwordsCount === -1
        }
      };

      return preview;
    } catch (error) {
      console.error('[ExportImportService] Error al obtener preview:', error);
      throw error;
    }
  }
}

// Exportar como singleton
const exportImportService = new ExportImportService();
export default exportImportService;
