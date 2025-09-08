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
      
      // Parsear XML
      const xmlDoc = this.parseXML(fileContent);
      
      // Validar estructura
      this.validateMRemoteNGStructure(xmlDoc);
      
      // Extraer estructura jerárquica (carpetas y conexiones)
      const treeStructure = this.extractMRemoteNGStructure(xmlDoc);

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
        metadata: {
          source: 'mRemoteNG',
          importDate: new Date().toISOString(),
          originalFile: file.name
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
        description: conn.description
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
