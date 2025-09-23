/**
 * Servicio para importar sesiones desde diferentes formatos
 * Inicialmente soporta mRemoteNG XML
 */

class ImportService {
  // Contador para claves únicas durante la sesión
  static _idCounter = 0;

  static generateKey(prefix) {
    const randomPart = Math.floor(Math.random() * 1e6);
    return `${prefix}_${Date.now()}_${randomPart}_${ImportService._idCounter++}`;
  }
  /**
   * Importa sesiones desde un archivo XML de mRemoteNG
   * @param {File} file - Archivo XML seleccionado
   * @returns {Promise<Array>} - Array de conexiones convertidas
   */
  static async importFromMRemoteNG(file) {
    try {
      // Leer contenido del archivo
      const fileContent = await this.readFileAsText(file);
      // Calcular hash del contenido (SHA-256) si es posible
      const contentHash = await this.computeContentHash(fileContent);
      
      // Parsear XML
      const xmlDoc = this.parseXML(fileContent);
      
      // Validar estructura
      this.validateMRemoteNGStructure(xmlDoc);
      
      // Extraer estructura jerárquica (carpetas y conexiones)
      const treeStructure = this.extractMRemoteNGStructure(xmlDoc);

      // Analizar usuarios más frecuentes
      const topUsers = this.analyzeUsersInXML(xmlDoc);

      // Convertir estructura al formato interno (árbol de nodos)
      const { nodes, flatConnections, connectionCount, folderCount } = this.convertStructureToInternalFormat(treeStructure);

      return {
        success: true,
        structure: {
          nodes,
          flatConnections,
          connectionCount,
          folderCount
        },
        // Compatibilidad hacia atrás (lista plana)
        connections: flatConnections,
        count: connectionCount,
        // Información de usuarios para sustitución
        topUsers,
        metadata: {
          source: 'mRemoteNG',
          importDate: new Date().toISOString(),
          originalFile: file.name,
          contentHash: contentHash || null
        }
      };
    } catch (error) {
      console.error('Error en ImportService.importFromMRemoteNG:', error);
      throw new Error(`Error al importar archivo: ${error.message}`);
    }
  }

  /**
   * Lee un archivo como texto
   * @param {File} file 
   * @returns {Promise<string>}
   */
  static readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.readAsText(file, 'utf-8');
    });
  }

  /**
   * Calcula SHA-256 de un string en el renderer. Fallback a null si no hay WebCrypto.
   * @param {string} text
   * @returns {Promise<string|null>} hex string
   */
  static async computeContentHash(text) {
    try {
      const enc = new TextEncoder();
      const data = enc.encode(text);
      const cryptoObj = (typeof window !== 'undefined' ? window.crypto : null) || (globalThis.crypto || null);
      if (!cryptoObj || !cryptoObj.subtle) return null;
      const hashBuf = await cryptoObj.subtle.digest('SHA-256', data);
      const bytes = Array.from(new Uint8Array(hashBuf));
      return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return null;
    }
  }

  /**
   * Parsea contenido XML
   * @param {string} xmlContent 
   * @returns {Document}
   */
  static parseXML(xmlContent) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    
    // Verificar errores de parsing
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      throw new Error('El archivo XML no es válido o está corrupto');
    }
    
    return xmlDoc;
  }

  /**
   * Valida que el XML tenga la estructura esperada de mRemoteNG
   * @param {Document} xmlDoc 
   */
  static validateMRemoteNGStructure(xmlDoc) {
    // Buscar elementos típicos de mRemoteNG
    const rootElement = xmlDoc.documentElement;
    
    // Verificar que existan nodos
    const nodes = xmlDoc.getElementsByTagName('Node');
    if (nodes.length === 0) {
      // Intentar buscar elementos de conexión alternativos
      const connections = xmlDoc.getElementsByTagName('Connection');
      if (connections.length === 0) {
        throw new Error('No se encontraron conexiones en el archivo XML. Verifique que sea un archivo válido de mRemoteNG.');
      }
    }
  }

  /**
   * Extrae conexiones del XML de mRemoteNG
   * @param {Document} xmlDoc 
   * @returns {Array}
   */
  static extractMRemoteNGConnections(xmlDoc) {
    const connections = [];
    
    // Buscar nodos de tipo Connection
    const nodeElements = xmlDoc.getElementsByTagName('Node');
    
    for (let i = 0; i < nodeElements.length; i++) {
      const node = nodeElements[i];
      const connection = this.parseConnectionNode(node);
      
      if (connection) {
        connections.push(connection);
      }
    }
    
    // Si no se encontraron nodos, intentar buscar elementos Connection directos
    if (connections.length === 0) {
      const connectionElements = xmlDoc.getElementsByTagName('Connection');
      for (let i = 0; i < connectionElements.length; i++) {
        const connection = this.parseConnectionNode(connectionElements[i]);
        if (connection) {
          connections.push(connection);
        }
      }
    }
    
    return connections;
  }

  /**
   * Extrae estructura jerárquica (carpetas y conexiones) del XML
   * @param {Document} xmlDoc
   * @returns {Array} Árbol intermedio con tipos 'folder' y 'connection'
   */
  static extractMRemoteNGStructure(xmlDoc) {
    const allNodeElements = Array.from(xmlDoc.getElementsByTagName('Node'));
    if (allNodeElements.length === 0) {
      // Fallback: algunos XML usan mayúsculas/min/min mezcladas
      const anyNodes = Array.from(xmlDoc.querySelectorAll('Node, node'));
      if (anyNodes.length > 0) {
        allNodeElements.push(...anyNodes);
      }
    }

    // Detectar nodos raíz: aquellos cuyo ancestro no es un <Node>
    const isRootNode = (el) => {
      // Un nodo es raíz si su padre no es <Node> y además su atributo ParentId/Parent puede estar vacío
      const parentEl = el.parentElement;
      if (parentEl && parentEl.tagName && parentEl.tagName.toLowerCase() === 'node') return false;
      const parentId = this.getNodeAttribute(el, ['ParentId', 'Parent']);
      if (parentId && parentId.trim() !== '') return false;
      return true;
    };

    const rootNodeElements = allNodeElements.filter(isRootNode);

    const processNode = (el) => {
      const typeAttr = this.getNodeAttribute(el, ['Type', 'NodeType']);
      const name = this.getNodeAttribute(el, ['Name']) || 'Sin nombre';
      const childNodes = Array.from(el.children || []).filter(c => c.tagName && c.tagName.toLowerCase() === 'node');

      const isContainer = typeAttr === 'Container' || childNodes.length > 0;
      const isConnection = typeAttr === 'Connection' || (!!this.getNodeAttribute(el, ['Hostname', 'Host', 'Server']));

      if (isContainer && !isConnection) {
        return {
          type: 'folder',
          name,
          children: childNodes.map(processNode).filter(Boolean)
        };
      }

      // Tratar como conexión
      const parsed = this.parseConnectionNode(el);
      if (!parsed) return null;
      return { type: 'connection', connection: parsed };
    };

    const tree = rootNodeElements.map(processNode).filter(Boolean);
    return tree;
  }

  /**
   * Parsea un nodo de conexión individual
   * @param {Element} node 
   * @returns {Object|null}
   */
  static parseConnectionNode(node) {
    // Determinar el tipo de nodo
    const nodeType = this.getNodeAttribute(node, ['Type', 'NodeType']);
    const hasHostLike = !!this.getNodeAttribute(node, ['Hostname', 'Host', 'Server']);
    
    // Aceptar tanto Type="Connection" como nodos con atributos de host
    if (nodeType !== 'Connection' && !hasHostLike) {
      return null;
    }
    
    const connection = {
      // Campos básicos
      name: this.getNodeAttribute(node, ['Name']) || 'Conexión sin nombre',
      hostname: this.getNodeAttribute(node, ['Hostname', 'Host', 'Server']) || '',
      protocol: this.getNodeAttribute(node, ['Protocol']) || 'SSH2',
      port: this.getNodeAttribute(node, ['Port']) || '',
      username: this.getNodeAttribute(node, ['Username', 'User']) || '',
      password: this.getNodeAttribute(node, ['Password', 'Pass']) || '',
      description: this.getNodeAttribute(node, ['Description', 'Comment']) || '',
      
      // Campos específicos de RDP
      domain: this.getNodeAttribute(node, ['Domain']) || '',
      resolution: this.getNodeAttribute(node, ['Resolution']) || '1024x768',
      colors: this.getNodeAttribute(node, ['Colors', 'ColorDepth']) || '32',
      redirectKeys: this.getNodeAttribute(node, ['RedirectKeys']) || 'false',
      redirectSound: this.getNodeAttribute(node, ['RedirectSound']) || 'DoNotPlay',
      redirectDrives: this.getNodeAttribute(node, ['RedirectDrives']) || 'false',
      redirectPorts: this.getNodeAttribute(node, ['RedirectPorts']) || 'false',
      redirectPrinters: this.getNodeAttribute(node, ['RedirectPrinters']) || 'false',
      redirectSmartCards: this.getNodeAttribute(node, ['RedirectSmartCards']) || 'false',
      
      // Campos específicos de SSH
      sshOptions: this.getNodeAttribute(node, ['SSHOptions']) || '',
      privateKey: this.getNodeAttribute(node, ['PrivateKey']) || '',
      
      // Campos adicionales
      icon: this.getNodeAttribute(node, ['Icon']) || '',
      panel: this.getNodeAttribute(node, ['Panel']) || '',
      
      // Metadatos
      originalXmlNode: node.outerHTML // Guardamos el XML original para debugging
    };
    
    // Asignar puerto por defecto si no está especificado
    if (!connection.port) {
      connection.port = this.getDefaultPort(connection.protocol);
    }
    
    return connection;
  }

  /**
   * Obtiene un atributo de un nodo, probando múltiples nombres posibles
   * @param {Element} node 
   * @param {Array<string>} attributeNames 
   * @returns {string}
   */
  static getNodeAttribute(node, attributeNames) {
    for (const attrName of attributeNames) {
      // Intentar obtener como atributo XML
      const attrValue = node.getAttribute(attrName);
      if (attrValue) {
        return attrValue;
      }
      
      // Intentar obtener como elemento hijo
      const element = node.getElementsByTagName(attrName)[0];
      if (element) {
        return element.textContent || '';
      }
    }
    return '';
  }

  /**
   * Obtiene el puerto por defecto según el protocolo
   * @param {string} protocol 
   * @returns {string}
   */
  static getDefaultPort(protocol) {
    const protocolUpper = protocol?.toUpperCase();
    const portMap = {
      'SSH2': '22',
      'SSH1': '22',
      'SSH': '22',
      'RDP': '3389',
      'VNC': '5900',
      'TELNET': '23',
      'HTTP': '80',
      'HTTPS': '443',
      'FTP': '21',
      'SFTP': '22'
    };
    
    return portMap[protocolUpper] || '22';
  }

  /**
   * Convierte conexiones mRemoteNG al formato interno de la aplicación
   * @param {Array} mRemoteConnections 
   * @returns {Array}
   */
  static convertToInternalFormat(mRemoteConnections) {
    return mRemoteConnections.map((conn) => {
      const key = this.generateKey('imported_mremoteng');
      const protocol = conn.protocol?.toUpperCase();
      
      // Crear nodo base
      const baseNode = {
        key,
        label: conn.name,
        uid: key,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        imported: true,
        importedFrom: 'mRemoteNG',
        originalProtocol: conn.protocol
      };

      // Convertir según el protocolo
      if (this.isSSHProtocol(protocol)) {
        return this.createSSHNode(baseNode, conn);
      } else if (protocol === 'RDP') {
        return this.createRDPNode(baseNode, conn);
      } else {
        // Para protocolos no soportados, convertir a SSH con nota
        return this.createSSHNodeFromOther(baseNode, conn);
      }
    });
  }

  /**
   * Convierte estructura intermedia (folders + connections) al formato de árbol interno
   * @param {Array} tree
   * @returns {{nodes: Array, flatConnections: Array, connectionCount: number, folderCount: number}}
   */
  static convertStructureToInternalFormat(tree) {
    const resultNodes = [];
    const flatConnections = [];
    let folderCount = 0;
    let connectionCount = 0;

    const convertNode = (node) => {
      if (node.type === 'folder') {
        folderCount += 1;
        const folderKey = this.generateKey('folder');
        return {
          key: folderKey,
          uid: folderKey,
          label: node.name,
          droppable: true,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG',
          data: { type: 'folder', name: node.name },
          children: (node.children || []).map(convertNode).filter(Boolean)
        };
      }
      if (node.type === 'connection') {
        connectionCount += 1;
        // Crear nodo de conexión con clave única basada en protocolo
        const key = this.generateKey('imported_mremoteng');
        const protocol = node.connection.protocol?.toUpperCase();
        const baseNode = {
          key,
          label: node.connection.name,
          uid: key,
          createdAt: new Date().toISOString(),
          isUserCreated: true,
          imported: true,
          importedFrom: 'mRemoteNG',
          originalProtocol: node.connection.protocol
        };
        let converted;
        if (this.isSSHProtocol(protocol)) {
          converted = this.createSSHNode(baseNode, node.connection);
        } else if (protocol === 'RDP') {
          converted = this.createRDPNode(baseNode, node.connection);
        } else {
          converted = this.createSSHNodeFromOther(baseNode, node.connection);
        }
        flatConnections.push(converted);
        return converted;
      }
      return null;
    };

    for (const root of tree) {
      const conv = convertNode(root);
      if (conv) resultNodes.push(conv);
    }

    return { nodes: resultNodes, flatConnections, connectionCount, folderCount };
  }

  /**
   * Verifica si un protocolo es SSH
   * @param {string} protocol 
   * @returns {boolean}
   */
  static isSSHProtocol(protocol) {
    const sshProtocols = ['SSH2', 'SSH1', 'SSH', 'SFTP'];
    return sshProtocols.includes(protocol);
  }

  /**
   * Crea un nodo SSH
   * @param {Object} baseNode 
   * @param {Object} conn 
   * @returns {Object}
   */
  static createSSHNode(baseNode, conn) {
    return {
      ...baseNode,
      data: {
        type: 'ssh',
        name: conn.name,
        host: conn.hostname,
        user: conn.username,
        password: conn.password,
        port: parseInt(conn.port) || 22,
        remoteFolder: '~',
        description: conn.description,
        privateKey: conn.privateKey,
        sshOptions: conn.sshOptions
      },
      droppable: false
    };
  }

  /**
   * Crea un nodo RDP
   * @param {Object} baseNode 
   * @param {Object} conn 
   * @returns {Object}
   */
  static createRDPNode(baseNode, conn) {
    return {
      ...baseNode,
      data: {
        type: 'rdp',
        name: conn.name,
        server: conn.hostname,
        username: conn.username,
        password: conn.password,
        port: parseInt(conn.port) || 3389,
        domain: conn.domain,
        resolution: conn.resolution || '1024x768',
        colors: conn.colors || '32',
        redirectKeys: conn.redirectKeys === 'true',
        redirectSound: conn.redirectSound || 'DoNotPlay',
        redirectDrives: conn.redirectDrives === 'true',
        redirectPorts: conn.redirectPorts === 'true',
        redirectPrinters: conn.redirectPrinters === 'true',
        redirectSmartCards: conn.redirectSmartCards === 'true',
        description: conn.description,
        clientType: 'guacamole',
        // Activar ajuste automático por defecto para evitar reconexiones
        autoResize: true,
        // Activar mostrar fondo por defecto
        guacEnableWallpaper: true,
        // Desactivar audio por defecto
        redirectAudio: false
      },
      droppable: false
    };
  }

  /**
   * Crea un nodo SSH desde un protocolo no soportado
   * @param {Object} baseNode 
   * @param {Object} conn 
   * @returns {Object}
   */
  static createSSHNodeFromOther(baseNode, conn) {
    return {
      ...baseNode,
      label: `${conn.name} (${conn.protocol})`,
      data: {
        type: 'ssh',
        name: conn.name,
        host: conn.hostname,
        user: conn.username,
        password: conn.password,
        port: parseInt(conn.port) || 22,
        remoteFolder: '~',
        description: `${conn.description}\n\nNota: Conexión original era ${conn.protocol}, convertida a SSH.`
      },
      droppable: false
    };
  }

  /**
   * Extrae nombres de usuario de una cadena compleja
   * @param {string} text - Texto que puede contener usuarios en diferentes formatos
   * @returns {Array} Array de usuarios encontrados
   */
  static extractUsersFromString(text) {
    if (!text || typeof text !== 'string') return [];
    
    const users = new Set();
    const cleanText = text.trim();
    
    // Lista más selectiva de palabras que NO son nombres de usuario
    const excludedWords = new Set([
      // Protocolos y servicios comunes
      'ssh', 'rdp', 'tcp', 'udp', 'http', 'https', 'ftp', 'sftp', 'ldap', 'kerberos', 'ntlm', 'ssl', 'tls', 'tacacs', 'radius',
      // Aplicaciones y servicios específicos que aparecen en tu caso
      'app', 'vmware', 'docker', 'kubernetes', 'jenkins', 'mysql', 'postgres', 'nginx', 'apache',
      // Palabras muy comunes en sistemas que no son usuarios
      'default', 'host', 'protocol', 'system', 'service', 'daemon', 'nobody', 'guest',
      // Sistemas operativos principales
      'windows', 'linux', 'unix', 'macos', 'ubuntu', 'centos', 'redhat'
    ]);
    
    // Función más equilibrada para validar nombres de usuario
    const isValidUsername = (word) => {
      // Debe tener al menos 2 caracteres
      if (word.length < 2) return false;
      
      // No debe ser solo números
      if (/^\d+$/.test(word)) return false;
      
      // No debe estar en la lista de palabras excluidas
      if (excludedWords.has(word.toLowerCase())) return false;
      
      // No debe ser una palabra muy larga (sospechosa)
      if (word.length > 25) return false;
      
      // Debe contener al menos una letra
      if (!/[a-zA-Z]/.test(word)) return false;
      
      // No debe ser una palabra que parezca un protocolo (patrón más específico)
      if (/^(ssh|rdp|tcp|udp|http|https|ftp|sftp|ldap|kerberos|ntlm|ssl|tls|tacacs|radius)_/i.test(word)) {
        return false;
      }
      
      // No debe ser una palabra que parezca un servicio (patrón más específico)
      if (/^(app|vmware|docker|kubernetes|jenkins|mysql|postgres|nginx|apache)_/i.test(word)) {
        return false;
      }
      
      return true;
    };
    
    // Patrón 1: Usuario@dominio (extraer solo la parte del usuario) - PRIORIDAD ALTA
    const userAtDomainPattern = /([a-zA-Z0-9._-]+)@[a-zA-Z0-9._-]+/g;
    let match;
    while ((match = userAtDomainPattern.exec(cleanText)) !== null) {
      const user = match[1];
      if (isValidUsername(user)) {
        users.add(user);
      }
    }
    
    // Patrón 2: Usuario en cadenas complejas como "user@default@host:protocol:user" - PRIORIDAD ALTA
    const complexPattern = /([a-zA-Z0-9._-]+)@[^:]+:[^:]+:([a-zA-Z0-9._-]+)/g;
    while ((match = complexPattern.exec(cleanText)) !== null) {
      const user1 = match[1];
      const user2 = match[2];
      if (isValidUsername(user1)) users.add(user1);
      if (isValidUsername(user2)) users.add(user2);
    }
    
    // Patrón 3: Usuario simple (solo letras, números, guiones bajos, puntos) - PRIORIDAD MEDIA
    // Solo si no se encontraron usuarios con los patrones anteriores O si la cadena es muy simple
    if (users.size === 0 || cleanText.length < 20) {
      const simpleUserPattern = /\b([a-zA-Z0-9._-]+)\b/g;
      while ((match = simpleUserPattern.exec(cleanText)) !== null) {
        const potentialUser = match[1];
        if (isValidUsername(potentialUser)) {
          users.add(potentialUser);
        }
      }
    }
    
    return Array.from(users);
  }

  /**
   * Analiza el XML y extrae los usuarios más frecuentes
   * @param {Document} xmlDoc 
   * @returns {Array} Array de objetos con {username, count, connections}
   */
  static analyzeUsersInXML(xmlDoc) {
    const userCounts = new Map();
    const userConnections = new Map();
    const userContexts = new Map(); // Para guardar el contexto donde aparece cada usuario
    
    // Buscar todos los nodos de conexión
    const nodeElements = xmlDoc.getElementsByTagName('Node');
    
    for (let i = 0; i < nodeElements.length; i++) {
      const node = nodeElements[i];
      const username = this.getNodeAttribute(node, ['Username', 'User']);
      const connectionName = this.getNodeAttribute(node, ['Name']) || 'Conexión sin nombre';
      
      if (username && username.trim() !== '') {
        // Extraer usuarios de la cadena (puede ser simple o compleja)
        const extractedUsers = this.extractUsersFromString(username);
        
        extractedUsers.forEach(extractedUser => {
          const cleanUsername = extractedUser.trim();
          
          if (cleanUsername) {
            // Contar frecuencia
            if (userCounts.has(cleanUsername)) {
              userCounts.set(cleanUsername, userCounts.get(cleanUsername) + 1);
              userConnections.get(cleanUsername).push(connectionName);
              userContexts.get(cleanUsername).push(username); // Guardar el contexto original
            } else {
              userCounts.set(cleanUsername, 1);
              userConnections.set(cleanUsername, [connectionName]);
              userContexts.set(cleanUsername, [username]);
            }
          }
        });
      }
    }
    
    // Si no se encontraron nodos, intentar buscar elementos Connection directos
    if (userCounts.size === 0) {
      const connectionElements = xmlDoc.getElementsByTagName('Connection');
      for (let i = 0; i < connectionElements.length; i++) {
        const connection = connectionElements[i];
        const username = this.getNodeAttribute(connection, ['Username', 'User']);
        const connectionName = this.getNodeAttribute(connection, ['Name']) || 'Conexión sin nombre';
        
        if (username && username.trim() !== '') {
          const extractedUsers = this.extractUsersFromString(username);
          
          extractedUsers.forEach(extractedUser => {
            const cleanUsername = extractedUser.trim();
            
            if (cleanUsername) {
              if (userCounts.has(cleanUsername)) {
                userCounts.set(cleanUsername, userCounts.get(cleanUsername) + 1);
                userConnections.get(cleanUsername).push(connectionName);
                userContexts.get(cleanUsername).push(username);
              } else {
                userCounts.set(cleanUsername, 1);
                userConnections.set(cleanUsername, [connectionName]);
                userContexts.set(cleanUsername, [username]);
              }
            }
          });
        }
      }
    }
    
    // Convertir a array y ordenar por frecuencia (descendente)
    const userStats = Array.from(userCounts.entries()).map(([username, count]) => ({
      username,
      count,
      connections: userConnections.get(username) || [],
      contexts: userContexts.get(username) || [] // Incluir contextos donde aparece
    }));
    
    // Ordenar por frecuencia descendente y tomar los 10 primeros
    userStats.sort((a, b) => b.count - a.count);
    
    return userStats.slice(0, 10);
  }

  /**
   * Aplica sustituciones de usuarios en una cadena compleja
   * @param {string} text - Texto que puede contener usuarios en diferentes formatos
   * @param {Map} substitutionMap - Mapa de sustituciones
   * @returns {string} Texto con usuarios sustituidos
   */
  static applySubstitutionsToString(text, substitutionMap) {
    if (!text || typeof text !== 'string' || substitutionMap.size === 0) {
      return text;
    }
    
    let result = text;
    
    // Aplicar sustituciones para cada usuario en el mapa
    substitutionMap.forEach((newUsername, originalUsername) => {
      // Crear patrones para reemplazar todas las ocurrencias del usuario
      const patterns = [
        // Patrón 1: Usuario simple (palabra completa)
        new RegExp(`\\b${this.escapeRegExp(originalUsername)}\\b`, 'g'),
        // Patrón 2: Usuario@dominio
        new RegExp(`\\b${this.escapeRegExp(originalUsername)}(@[a-zA-Z0-9._-]+)`, 'g'),
        // Patrón 3: Usuario en cadenas complejas como "user@default@host:protocol:user"
        new RegExp(`\\b${this.escapeRegExp(originalUsername)}(@[^:]+:[^:]+:)${this.escapeRegExp(originalUsername)}\\b`, 'g'),
        // Patrón 4: Usuario al final de cadena compleja
        new RegExp(`([^:]+:)${this.escapeRegExp(originalUsername)}\\b`, 'g')
      ];
      
      patterns.forEach((pattern, index) => {
        switch (index) {
          case 0: // Usuario simple
            result = result.replace(pattern, newUsername);
            break;
          case 1: // Usuario@dominio
            result = result.replace(pattern, `${newUsername}$1`);
            break;
          case 2: // Usuario en cadena compleja (ambas ocurrencias)
            result = result.replace(pattern, `${newUsername}$1${newUsername}`);
            break;
          case 3: // Usuario al final de cadena compleja
            result = result.replace(pattern, `$1${newUsername}`);
            break;
        }
      });
    });
    
    return result;
  }

  /**
   * Escapa caracteres especiales para expresiones regulares
   * @param {string} string 
   * @returns {string}
   */
  static escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Aplica sustituciones de usuarios y passwords a las conexiones antes de la importación
   * @param {Array} nodes - Array de nodos (estructura de árbol)
   * @param {Array} substitutions - Array de {originalUsername, newUsername, newPassword}
   * @returns {Array} Nodos con usuarios y passwords sustituidos
   */
  static applyUserSubstitutions(nodes, substitutions) {
    if (!substitutions || substitutions.length === 0) {
      return nodes;
    }
    
    
    // Crear mapas de sustituciones para acceso rápido
    const usernameSubstitutionMap = new Map();
    const passwordSubstitutionMap = new Map();
    
    substitutions.forEach(sub => {
      if (sub.originalUsername && sub.originalUsername.trim() !== '') {
        const originalUsername = sub.originalUsername.trim();
        
        // Mapa de sustituciones de nombres de usuario
        if (sub.newUsername && sub.newUsername.trim() !== '') {
          usernameSubstitutionMap.set(originalUsername, sub.newUsername.trim());
        }
        
        // Mapa de sustituciones de passwords
        if (sub.newPassword && sub.newPassword.trim() !== '') {
          passwordSubstitutionMap.set(originalUsername, sub.newPassword.trim());
        }
      }
    });
    
    
    if (usernameSubstitutionMap.size === 0 && passwordSubstitutionMap.size === 0) {
      return nodes;
    }
    
    // Función helper para reemplazar usuarios en una cadena compleja
    const replaceUserInString = (originalString, originalUser, newUser) => {
      if (!originalString || !originalUser || !newUser) return originalString;
      
      // Reemplazar todas las instancias del usuario original por el nuevo
      // Usar una expresión regular con word boundaries para evitar reemplazos parciales incorrectos
      const regex = new RegExp(`\\b${originalUser.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      return originalString.replace(regex, newUser);
    };

    // Función helper para encontrar coincidencias flexibles de usuario
    const findMatchingOriginalUser = (currentUser, substitutionMap) => {
      if (!currentUser) return null;
      
      // 1. Coincidencia exacta
      if (substitutionMap.has(currentUser)) {
        return currentUser;
      }
      
      // 2. Coincidencia flexible: extraer usuarios del string actual y buscar coincidencias
      const extractedUsers = this.extractUsersFromString(currentUser);
      for (const extractedUser of extractedUsers) {
        if (substitutionMap.has(extractedUser)) {
          return extractedUser;
        }
      }
      
      // 3. Coincidencia parcial: buscar si el usuario actual contiene alguno de los usuarios originales
      for (const [originalUser] of substitutionMap) {
        if (currentUser.includes(originalUser)) {
          return originalUser;
        }
      }
      
      return null;
    };

    // Contador para estadísticas
    let substitutionsApplied = 0;
    let connectionsProcessed = 0;

    // Aplicar sustituciones recursivamente a la estructura de nodos
    const applySubstitutionsToNode = (node) => {
      // Si es un nodo de conexión SSH
      if (node.data && node.data.type === 'ssh') {
        connectionsProcessed++;
        const currentUser = node.data.user;
        const connectionName = node.label || node.data.name || 'SSH Connection';
        
        // PRIMERO: Aplicar sustitución de password basándose en el usuario ORIGINAL
        const matchingUserForPassword = findMatchingOriginalUser(currentUser, passwordSubstitutionMap);
        if (matchingUserForPassword) {
          node.data.password = passwordSubstitutionMap.get(matchingUserForPassword);
          substitutionsApplied++;
        }
        
        // SEGUNDO: Aplicar sustitución de username
        const matchingUserForUsername = findMatchingOriginalUser(currentUser, usernameSubstitutionMap);
        if (matchingUserForUsername) {
          const oldUser = node.data.user;
          const newUsername = usernameSubstitutionMap.get(matchingUserForUsername);
          node.data.user = replaceUserInString(oldUser, matchingUserForUsername, newUsername);
          substitutionsApplied++;
        }
      }
      // Si es un nodo de conexión RDP (tanto rdp como rdp-guacamole)
      else if (node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole')) {
        connectionsProcessed++;
        const currentUsername = node.data.username;
        const connectionName = node.label || node.data.name || 'RDP Connection';
        
        // PRIMERO: Aplicar sustitución de password basándose en el usuario ORIGINAL
        const matchingUserForPassword = findMatchingOriginalUser(currentUsername, passwordSubstitutionMap);
        if (matchingUserForPassword) {
          node.data.password = passwordSubstitutionMap.get(matchingUserForPassword);
          substitutionsApplied++;
        }
        
        // SEGUNDO: Aplicar sustitución de username
        const matchingUserForUsername = findMatchingOriginalUser(currentUsername, usernameSubstitutionMap);
        if (matchingUserForUsername) {
          const oldUsername = node.data.username;
          const newUsername = usernameSubstitutionMap.get(matchingUserForUsername);
          node.data.username = replaceUserInString(oldUsername, matchingUserForUsername, newUsername);
          substitutionsApplied++;
        }
      }
      
      // Procesar nodos hijos recursivamente
      if (node.children && Array.isArray(node.children)) {
        node.children = node.children.map(applySubstitutionsToNode);
      }
      
      return node;
    };
    
    const result = nodes.map(applySubstitutionsToNode);
    
    
    
    return result;
  }


  /**
   * Agrupa conexiones por carpetas si el XML incluye estructura de carpetas
   * @param {Document} xmlDoc 
   * @returns {Object}
   */
  static extractFolderStructure(xmlDoc) {
    const structure = {
      folders: [],
      connections: []
    };
    
    // Esta función se puede expandir para manejar la estructura de carpetas de mRemoteNG
    // Por ahora retornamos una estructura plana
    
    return structure;
  }
}

export default ImportService;
