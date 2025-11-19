/**
 * ToolProcessor - Procesamiento de herramientas MCP
 * 
 * Este módulo centraliza:
 * - Conversión de tools MCP a formatos de proveedores
 * - Detección y normalización de tool calls
 * - Generación de prompts y ejemplos
 * - Filtrado de tools por contexto
 */

import debugLogger from '../../utils/debugLogger';

class ToolProcessor {
  constructor() {
    // Este módulo necesita acceso a mcpClient, se pasará como dependencia
  }

  /**
   * Convertir tools MCP a formato function calling del proveedor
   * @param {Array} tools - Array de tools MCP
   * @param {string} provider - Proveedor ('openai', 'anthropic', 'google')
   * @param {Object} options - Opciones (namespace, etc.)
   * @returns {Array} Tools en formato del proveedor
   */
  convertMCPToolsToProviderFormat(tools, provider, options = {}) {
    if (!tools || tools.length === 0) return [];

    return tools.map(tool => {
      // Enriquecer descripción automáticamente
      let enrichedDescription = tool.description || `Herramienta ${tool.name}`;
      
      // Agregar contexto de parámetros importantes a la descripción
      if (tool.inputSchema && tool.inputSchema.properties) {
        const params = tool.inputSchema.properties;
        const required = tool.inputSchema.required || [];
        
        // Si hay parámetros requeridos, mencionarlos en la descripción
        if (required.length > 0) {
          const requiredParams = required.map(r => `'${r}'`).join(', ');
          enrichedDescription += `. Requiere: ${requiredParams}`;
        }
        
        // Agregar hints específicos por tipo de tool
        if (tool.name.includes('read') || tool.name.includes('list')) {
          enrichedDescription += '. Use esta herramienta cuando necesite OBTENER o VER información';
        } else if (tool.name.includes('write') || tool.name.includes('create')) {
          enrichedDescription += '. Use esta herramienta cuando necesite CREAR o GUARDAR contenido';
        } else if (tool.name.includes('edit') || tool.name.includes('update') || tool.name.includes('modify')) {
          enrichedDescription += '. Use esta herramienta cuando necesite MODIFICAR contenido existente';
        } else if (tool.name.includes('delete') || tool.name.includes('remove')) {
          enrichedDescription += '. Use esta herramienta cuando necesite ELIMINAR algo';
        } else if (tool.name.includes('search') || tool.name.includes('find')) {
          enrichedDescription += '. Use esta herramienta cuando necesite BUSCAR o ENCONTRAR algo';
        } else if (tool.name.includes('move') || tool.name.includes('rename')) {
          enrichedDescription += '. Use esta herramienta cuando necesite MOVER o RENOMBRAR';
        }
      }

      // Formato común para function calling
      const toolDef = {
        name: (options.namespace ? `${tool.serverId}__${tool.name}` : tool.name),
        description: enrichedDescription,
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      };

      // Adaptar según el proveedor
      if (provider === 'openai') {
        return {
          type: 'function',
          function: toolDef
        };
      } else if (provider === 'anthropic') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          input_schema: toolDef.parameters
        };
      } else if (provider === 'google') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          parameters: toolDef.parameters
        };
      }

      return toolDef;
    });
  }

  /**
   * Normalizar function call a formato estándar
   * @param {string} fullName - Nombre completo (puede incluir serverId__toolName)
   * @param {Object} rawArgs - Argumentos crudos
   * @param {Object} mcpClient - Cliente MCP (para obtener tools disponibles)
   * @param {Function} getMcpDefaultDirFn - Función para obtener directorio por defecto
   * @param {Function} resolveToolInfoFn - Función para resolver información de tool
   * @returns {Object} { serverId, toolName, arguments }
   */
  normalizeFunctionCall(fullName, rawArgs, mcpClient, getMcpDefaultDirFn = null, resolveToolInfoFn = null) {
    debugLogger.debug('ToolProcessor', 'normalizeFunctionCall entrada', { fullName, rawArgs });
    
    let argsObj;
    if (!rawArgs) {
      argsObj = {};
    } else if (typeof rawArgs === 'string') {
      argsObj = { tool: rawArgs };
    } else {
      argsObj = { ...rawArgs };
    }

    let toolName = argsObj.tool || argsObj.name || fullName;
    let serverId = argsObj.server || argsObj.serverId || null;

    // Manejar nombres namespaced con doble guión bajo (__) O un solo guión bajo (_)
    if (!serverId && typeof fullName === 'string') {
      // Intentar con doble guión bajo primero (formato correcto)
      if (fullName.includes('__')) {
        const idx = fullName.indexOf('__');
        if (idx >= 0) {
          serverId = fullName.slice(0, idx);
          toolName = fullName.slice(idx + 2);
        }
      }
      // Si no se encontró, intentar con un solo guión bajo (formato incorrecto del modelo)
      else if (fullName.includes('_') && !fullName.includes('__')) {
        const parts = fullName.split('_');
        if (parts.length >= 2) {
          const possibleServerId = parts[0];
          const possibleBaseName = parts.slice(1).join('_');
          
          // Verificar si existe un servidor con ese ID
          const tools = mcpClient?.getAvailableTools() || [];
          const serverExists = tools.some(t => t.serverId === possibleServerId);
          if (serverExists) {
            serverId = possibleServerId;
            toolName = possibleBaseName;
          }
        }
      }
    }

    if (!serverId && mcpClient) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      } else if (matches.length > 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!serverId && getMcpDefaultDirFn) {
      const fallbackDir = getMcpDefaultDirFn('filesystem');
      if (fallbackDir) {
        serverId = 'filesystem';
      }
    }

    if (!serverId && mcpClient) {
      const tools = mcpClient.getAvailableTools() || [];
      const fsMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
      if (fsMatch) {
        serverId = 'filesystem';
      }
    }

    if (!serverId) {
      debugLogger.warn('ToolProcessor', 'normalizeFunctionCall sin serverId resuelto', {
        fullName,
        rawArgs,
        toolName,
        argsObj
      });
    }

    // Construir argumentos limpios
    let finalArgs = argsObj.arguments || argsObj.args || argsObj.parameters;
    if (typeof finalArgs === 'string') {
      finalArgs = { tool: finalArgs };
    }

    if (!finalArgs || typeof finalArgs !== 'object' || Array.isArray(finalArgs)) {
      const copy = { ...argsObj };
      delete copy.tool;
      delete copy.name;
      delete copy.server;
      delete copy.serverId;
      delete copy.arguments;
      delete copy.args;
      delete copy.parameters;
      finalArgs = copy;
    } else {
      finalArgs = { ...finalArgs };
    }

    if (finalArgs.arguments && typeof finalArgs.arguments === 'object' && !Array.isArray(finalArgs.arguments)) {
      finalArgs = { ...finalArgs, ...finalArgs.arguments };
      delete finalArgs.arguments;
    }

    if (finalArgs.server || finalArgs.serverId) {
      serverId = serverId || finalArgs.server || finalArgs.serverId;
      delete finalArgs.server;
      delete finalArgs.serverId;
    }

    const nestedTool = finalArgs.tool || finalArgs.toolName;
    if (nestedTool) {
      toolName = nestedTool;
      delete finalArgs.tool;
      delete finalArgs.toolName;
    }

    if (!serverId && mcpClient) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!finalArgs || typeof finalArgs !== 'object') {
      finalArgs = {};
    }

    // Agregar directorio por defecto si está disponible
    if (getMcpDefaultDirFn) {
      const defaultInfo = serverId ? getMcpDefaultDirFn(serverId) : getMcpDefaultDirFn('filesystem');
      const defaultPath = defaultInfo?.raw || defaultInfo?.normalized || null;
      if (defaultPath) {
        if (['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(toolName) && !finalArgs.path) {
          finalArgs.path = defaultPath;
        }
        if (toolName === 'read_text_file' && !finalArgs.path) {
          finalArgs.path = defaultPath;
        }
      }
    }

    // Resolver información de tool usando función externa si está disponible
    let resolved = { serverId, toolName };
    if (resolveToolInfoFn && typeof resolveToolInfoFn === 'function') {
      resolved = resolveToolInfoFn(toolName, serverId);
    }

    const normalized = { 
      serverId: resolved.serverId || serverId, 
      toolName: resolved.toolName || toolName, 
      arguments: finalArgs 
    };
    
    debugLogger.debug('ToolProcessor', 'normalizeFunctionCall salida', normalized);
    return normalized;
  }

  /**
   * Detectar tool call en respuesta del modelo
   * @param {string} response - Respuesta del modelo
   * @returns {Object|null} Tool call detectado o null
   */
  detectToolCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    
    debugLogger.debug('ToolProcessor', 'detectToolCallInResponse entrada', {
      tipo: typeof response,
      length: response?.length,
      muestra: response?.substring(0, 200),
      incluyeTool: response?.includes('"tool"'),
      incluyeLlave: response?.includes('{')
    });
    
    try {
      // Estrategia 1: Bloques explícitos con backticks (```json...```)
      const toolCall = this.extractToolCallFromCodeBlock(response);
      if (toolCall) {
        return toolCall;
      }
      
      // Estrategia 2: JSON flexible en cualquier posición (con preámbulo/epilogo)
      const jsonToolCall = this.extractToolCallFromJSON(response);
      return jsonToolCall;
      
    } catch (error) {
      // Error inesperado en detección
      if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
        debugLogger.debug('ToolProcessor', 'JSON inválido detectado al buscar tool call', {
          error: error.message.substring(0, 100)
        });
      }
      console.error('❌ [ToolProcessor] Error detectando tool call:', error.message);
      return null;
    }
  }

  /**
   * Extraer tool call de bloque de código (```json...```)
   */
  extractToolCallFromCodeBlock(response) {
    const jsonBlockRegex = /```(?:json|tool|tool_call)?\s*([\s\S]*?)```/gi;
    let match = jsonBlockRegex.exec(response);
    
    while (match) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        const toolCall = this.normalizeToolCall(data);
        if (toolCall) return toolCall;
      } catch (e) {
        // Este bloque no es válido, intentar siguiente
      }
      match = jsonBlockRegex.exec(response);
    }
    
    return null;
  }

  /**
   * Extraer tool call de JSON flexible (en cualquier posición con preámbulo/epilogo)
   */
  extractToolCallFromJSON(response) {
    debugLogger.debug('ToolProcessor', 'Buscando JSON en respuesta', { length: response.length });
    
    // Buscar JSON que contenga "tool" o "use_tool"
    const jsonPattern = /\{[\s\S]*?"(?:tool|use_tool)"[\s\S]*\}/g;
    const matches = response.match(jsonPattern);
    
    if (!matches) {
      debugLogger.debug('ToolProcessor', 'No se encontró JSON con tool/use_tool');
      return null;
    }
    
    // Intentar cada JSON encontrado (puede haber múltiples)
    for (let i = 0; i < matches.length; i++) {
      const jsonStr = matches[i];
      debugLogger.debug('ToolProcessor', 'Intentando candidato para tool call', {
        indice: i + 1,
        preview: jsonStr.substring(0, 50).replace(/\n/g, '\\n')
      });
      
      try {
        const data = JSON.parse(jsonStr);
        const toolCall = this.normalizeToolCall(data);
        if (toolCall) {
          debugLogger.debug('ToolProcessor', 'Tool call detectado', { tool: toolCall.toolName });
          return toolCall;
        }
      } catch (e) {
        debugLogger.debug('ToolProcessor', 'JSON inválido durante parseo de tool call', { error: e.message });
        continue;
      }
    }
    
    debugLogger.debug('ToolProcessor', 'Ningún candidato fue un tool call válido');
    return null;
  }

  /**
   * Validar si data es un tool call válido
   */
  isValidToolCall(data) {
    if (!data || typeof data !== 'object') return false;
    
    const hasToolField = (data.tool && typeof data.tool === 'string') ||
                         (data.use_tool && typeof data.use_tool === 'string');
    
    return hasToolField;
  }

  /**
   * Normalizar tool call a formato estándar
   */
  normalizeToolCall(data) {
    if (!this.isValidToolCall(data)) return null;
    
    return {
      toolName: data.tool || data.use_tool,
      arguments: data.arguments || {},
      serverId: data.serverId || data.server || null
    };
  }

  /**
   * Detectar solicitud de PROMPT MCP en respuesta del modelo
   * @param {string} response - Respuesta del modelo
   * @returns {Object|null} Prompt call detectado o null
   */
  detectPromptCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    try {
      // Buscar bloque JSON que contenga "prompt": { ... }
      const re = /\{[\s\S]*?"prompt"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g;
      const matches = response.match(re);
      if (!matches) return null;
      for (const jsonStr of matches) {
        try {
          const data = JSON.parse(jsonStr);
          const pr = data.prompt;
          if (pr && typeof pr === 'object' && pr.name) {
            return { serverId: pr.server || pr.serverId, promptName: pr.name, arguments: pr.arguments || {} };
          }
        } catch (_) { /* ignore */ }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Convertir JSON Schema a el formato de parámetros de Gemini (tipos en MAYÚSCULAS)
   */
  toGeminiSchema(schema) {
    if (!schema || typeof schema !== 'object') return { type: 'OBJECT' };

    const upper = (t) => {
      if (!t) return undefined;
      const map = {
        object: 'OBJECT',
        array: 'ARRAY',
        string: 'STRING',
        number: 'NUMBER',
        integer: 'INTEGER',
        boolean: 'BOOLEAN'
      };
      return map[String(t).toLowerCase()] || String(t).toUpperCase();
    };

    const convert = (node) => {
      if (!node || typeof node !== 'object') return node;
      const t = upper(node.type);
      if (t === 'OBJECT') {
        const props = node.properties || {};
        const outProps = {};
        Object.keys(props).forEach((k) => {
          outProps[k] = convert(props[k]);
        });
        return {
          type: 'OBJECT',
          properties: outProps,
          required: Array.isArray(node.required) ? node.required : undefined
        };
      }
      if (t === 'ARRAY') {
        return {
          type: 'ARRAY',
          items: convert(node.items || {})
        };
      }
      // Primitivos
      return { type: t };
    };

    return convert(schema);
  }

  /**
   * Generar few-shot examples para mejorar comprensión de tools
   * @param {Array} tools - Array de tools
   * @param {string} provider - Proveedor (no usado actualmente, pero se mantiene para compatibilidad)
   * @returns {string} Ejemplos formateados
   */
  generateToolExamples(tools, provider) {
    // Seleccionar hasta 3 ejemplos representativos
    const exampleTools = tools.slice(0, 3);
    
    if (exampleTools.length === 0) return '';
    
    let examples = '\n🎯 EJEMPLOS DE USO:\n\n';
    
    exampleTools.forEach((tool, idx) => {
      const params = tool.inputSchema?.properties || {};
      const required = tool.inputSchema?.required || [];
      
      // Generar ejemplo de parámetros
      const exampleArgs = {};
      Object.keys(params).forEach(key => {
        if (required.includes(key)) {
          const param = params[key];
          // Generar valor de ejemplo según el tipo
          if (param.type === 'string') {
            if (key === 'path' || key === 'file' || key === 'source' || key === 'destination') {
              exampleArgs[key] = '/ruta/archivo.txt';
            } else if (key === 'content' || key === 'text') {
              exampleArgs[key] = 'contenido del texto';
            } else if (key === 'pattern') {
              exampleArgs[key] = '*.txt';
            } else {
              exampleArgs[key] = 'valor';
            }
          } else if (param.type === 'number' || param.type === 'integer') {
            exampleArgs[key] = 100;
          } else if (param.type === 'boolean') {
            exampleArgs[key] = true;
          } else if (param.type === 'array') {
            exampleArgs[key] = [];
          } else {
            exampleArgs[key] = param.example || 'valor';
          }
        }
      });
      
      const toolName = tool.serverId ? `${tool.serverId}__${tool.name}` : tool.name;
      
      examples += `Ejemplo ${idx + 1}:\n`;
      examples += `Usuario: "${this.generateUserExampleForTool(tool)}"\n`;
      examples += `Tool llamada: ${toolName}\n`;
      examples += `Argumentos: ${JSON.stringify(exampleArgs, null, 2)}\n\n`;
    });
    
    return examples;
  }

  /**
   * Generar ejemplo de petición del usuario para una tool
   */
  generateUserExampleForTool(tool) {
    const name = tool.name;
    
    if (name.includes('list') && name.includes('directory')) {
      return 'Lista los archivos del directorio actual';
    } else if (name.includes('read') && name.includes('file')) {
      return 'Lee el contenido del archivo config.json';
    } else if (name.includes('write') && name.includes('file')) {
      return 'Crea un archivo llamado notas.txt con el texto "Hola mundo"';
    } else if (name.includes('edit') && name.includes('file')) {
      return 'Cambia la línea que dice "version: 1.0" por "version: 2.0"';
    } else if (name.includes('search')) {
      return 'Busca todos los archivos .txt en el directorio';
    } else if (name.includes('create') && name.includes('directory')) {
      return 'Crea una carpeta llamada "proyectos"';
    } else if (name.includes('move')) {
      return 'Mueve el archivo documento.txt a la carpeta backup';
    } else if (name.includes('delete')) {
      return 'Elimina el archivo temporal.tmp';
    } else if (name.includes('get') && name.includes('info')) {
      return 'Dame información del archivo imagen.png';
    }
    
    return `Usa la herramienta ${name}`;
  }

  /**
   * Filtrar tools por contexto del mensaje
   * @param {Array} tools - Array de tools disponibles
   * @param {string} message - Mensaje del usuario
   * @returns {Array} Tools filtrados y ordenados por relevancia
   */
  filterToolsByContext(tools, message = '') {
    const MAX_TOOLS = 6; // Límite máximo de tools para no abrumar al modelo
    const lowerMsg = message.toLowerCase();
    
    // Calcular score de relevancia para cada tool
    const toolsWithScore = tools.map(tool => {
      let score = 0;
      const toolName = tool.name.toLowerCase();
      const toolDesc = (tool.description || '').toLowerCase();
      
      // Búsquedas en web/internet
      if (lowerMsg.match(/busca|search|google|web|internet|sitio|página|url|http|\.com/)) {
        if (toolName.includes('search') || toolName.includes('web') || toolName.includes('fetch')) score += 10;
        if (toolName.includes('goto') || toolName.includes('screenshot')) score += 5;
      }
      
      // Archivos: LEER
      if (lowerMsg.match(/lee|leer|muestra|abre|ver|contenido|archivo|file/)) {
        if (toolName.includes('read_file') || toolName.includes('read_text')) score += 10;
        if (toolName.includes('get_file_info')) score += 5;
      }
      
      // Archivos: CREAR/ESCRIBIR
      if (lowerMsg.match(/crea|crear|escribe|guarda|guardar|genera|nuevo archivo|write/)) {
        if (toolName.includes('write_file') || toolName.includes('create')) score += 10;
        if (toolName.includes('append')) score += 5;
      }
      
      // Archivos: EDITAR/MODIFICAR
      if (lowerMsg.match(/edita|editar|modifica|cambia|actualiza|reemplaza|edit/)) {
        if (toolName.includes('edit_file') || toolName.includes('update')) score += 10;
        if (toolName.includes('write_file')) score += 3; // Fallback
      }
      
      // SSH/Terminal: HOSTS y CONEXIONES (ALTA PRIORIDAD)
      if (lowerMsg.match(/ssh|host|conexión|remota|servidor|terminal remota|red|conecta|conectar|ejecuta en|comando remoto|archivo en el servidor/i)) {
        if (toolName.includes('execute_ssh')) score += 20; // MÁS ALTO que read_text_file
        if (toolName.includes('search_nodeterm')) score += 18; // Búsqueda inteligente de SSH hosts y credenciales
        if (toolName.includes('test_ssh')) score += 12;
        // PENALIZAR herramientas de filesystem cuando estamos en contexto SSH
        if (toolName.includes('read_text_file')) score -= 10;
        if (toolName.includes('list_directory')) score -= 10;
      }
      
      // Terminal/Comandos LOCALES
      if (lowerMsg.match(/local|máquina local|powershell|wsl|terminal local/i)) {
        if (toolName.includes('execute_local')) score += 12;
      }
      
      // Directorios: LISTAR (pero SIN interferir con SSH)
      if (lowerMsg.match(/lista|listar/) && !lowerMsg.match(/ssh|host|conexión|remota|servidor|conecta|ejecuta/i)) {
        if (lowerMsg.match(/directorio|carpeta|folder|contenido|archivos en/)) {
          if (toolName.includes('list_directory')) score += 10;
          if (toolName.includes('directory_tree')) score += 7;
          if (toolName.includes('list_directory_with_sizes')) score += 8;
        }
      }
      
      // PENALIZAR read_text_file si hay contexto de SSH
      if (lowerMsg.match(/ssh|remoto|servidor|conecta/i) && toolName.includes('read_text_file')) {
        score -= 15; // Castigar fuertemente
      }
      
      // Archivos: BUSCAR
      if (lowerMsg.match(/busca archivo|encuentra archivo|search.*file|find.*file|patrón/)) {
        if (toolName.includes('search_files') || toolName.includes('find')) score += 10;
      }
      
      // Archivos: MOVER/RENOMBRAR
      if (lowerMsg.match(/mueve|mover|renombra|rename|move/)) {
        if (toolName.includes('move_file') || toolName.includes('rename')) score += 10;
      }
      
      // Archivos: ELIMINAR
      if (lowerMsg.match(/elimina|borrar|delete|remove/)) {
        if (toolName.includes('delete') || toolName.includes('remove')) score += 10;
      }
      
      // Comandos/CLI - SOLO si hay palabras explícitas de ejecución
      // "crea un script" NO debe activar execute_local, solo "ejecuta el script" o "run script"
      if (lowerMsg.match(/ejecuta|comando|command|run|terminal|shell/) && 
          !lowerMsg.match(/crea|crear|create|genera|generar|generate|escribe|escribir|write|guarda|guardar|save/)) {
        if (toolName.includes('run_command') || toolName.includes('execute')) score += 10;
      }
      // Si dice "script" PERO también dice "ejecuta/run", entonces sí activar execute
      if (lowerMsg.match(/script/) && lowerMsg.match(/ejecuta|ejecutar|run|corre|correr|lanza|lanzar/)) {
        if (toolName.includes('run_command') || toolName.includes('execute')) score += 10;
      }
      
      // Base de datos
      if (lowerMsg.match(/query|sql|database|tabla|consulta/)) {
        if (toolName.includes('query') || toolName.includes('sql')) score += 10;
      }
      
      // 🔒 TENABLE.IO - Detección de intenciones relacionadas con seguridad/vulnerabilidades/activos
      const tenableKeywords = /tenable|vulnerabilidad|vulnerabilidades|activo|activos|asset|assets|seguridad|security|scanner|scan|escaneo|escaneado|cve|exploit|parche|patch|riesgo|risk|severidad|severity|crítico|critical|alto|high|medio|medium|bajo|low|hostname|ip address|dirección ip/i;
      const isTenableTool = tool.serverId === 'tenable' || toolName.includes('asset') || toolName.includes('vulnerability');
      
      if (lowerMsg.match(tenableKeywords) || isTenableTool) {
        // Alta prioridad para herramientas de Tenable cuando se menciona
        if (isTenableTool) {
          if (lowerMsg.match(/lista|listar|muestra|mostrar|obtén|obtener|get|busca|buscar|search|find/i)) {
            if (toolName.includes('get_assets') || toolName.includes('list')) score += 25;
            if (toolName.includes('search_assets')) score += 23;
            if (toolName.includes('get_asset_details')) score += 22;
          }
          if (lowerMsg.match(/vulnerabilidad|vulnerabilidades|vulnerability|cve|exploit|riesgo|risk|severidad|severity/i)) {
            if (toolName.includes('vulnerability') || toolName.includes('vulnerabilities')) score += 25;
            if (toolName.includes('get_asset_details')) score += 20; // Los detalles pueden incluir vulnerabilidades
          }
          if (lowerMsg.match(/detalle|detalles|detail|información|info|específico|specific/i)) {
            if (toolName.includes('get_asset_details')) score += 24;
          }
          // Si es herramienta de Tenable pero no hay keywords específicos, dar score base
          if (isTenableTool && score === 0) {
            score += 15; // Score base para herramientas de Tenable
          }
        }
      }
      
      // Penalizar tools genéricas si hay específicas
      if (toolName === 'write_file' && lowerMsg.includes('edit')) score -= 3;
      if (toolName === 'read_file' && lowerMsg.includes('list')) score -= 3;
      
      return { tool, score };
    });
    
    // Ordenar por score descendente
    toolsWithScore.sort((a, b) => b.score - a.score);
    
    // Tomar las top N más relevantes
    const topTools = toolsWithScore
      .filter(t => t.score > 0) // Solo las que tienen score positivo
      .slice(0, MAX_TOOLS)
      .map(t => t.tool);
    
    // Si no hay tools con score, usar un conjunto mínimo por defecto
    if (topTools.length === 0) {
      const defaultNames = ['read_file', 'list_directory', 'write_file'];
      topTools.push(...tools.filter(t => defaultNames.some(dn => t.name.includes(dn))).slice(0, 3));
    }
    
    // 🔒 CRÍTICO: SIEMPRE incluir herramientas de Tenable si están disponibles
    // Esto asegura que el modelo las conozca y pueda usarlas cuando sea necesario
    const tenableTools = tools.filter(t => t.serverId === 'tenable');
    const hasTenableInTop = topTools.some(t => t.serverId === 'tenable');
    
    if (tenableTools.length > 0 && !hasTenableInTop) {
      // Agregar TODAS las herramientas de Tenable (son solo 4, no afecta mucho el límite)
      // Priorizar get_assets primero, luego las demás
      const sortedTenable = [
        tenableTools.find(t => t.name === 'get_assets'),
        tenableTools.find(t => t.name === 'search_assets'),
        tenableTools.find(t => t.name === 'get_asset_details'),
        tenableTools.find(t => t.name === 'get_asset_vulnerabilities')
      ].filter(Boolean);
      
      // Agregar las que no están ya en topTools
      sortedTenable.forEach(tool => {
        if (!topTools.some(t => t.serverId === tool.serverId && t.name === tool.name)) {
          topTools.unshift(tool); // Agregar al inicio para máxima prioridad
        }
      });
      
      debugLogger.debug('ToolProcessor', 'Herramientas de Tenable agregadas forzosamente', {
        cantidad: sortedTenable.length,
        herramientas: sortedTenable.map(t => t.name)
      });
    }

    debugLogger.debug('ToolProcessor', 'Tools filtrados con scoring', {
      disponibles: tools.length,
      relevantes: topTools.length,
      topScores: toolsWithScore.slice(0, 3).map(t => ({ name: t.tool.name, score: t.score }))
    });
    
    return topTools;
  }

  /**
   * Resolver información de tool (serverId y toolName)
   * @param {string} toolName - Nombre de la tool
   * @param {string} serverIdHint - Hint del serverId (opcional)
   * @param {Object} mcpClient - Cliente MCP para obtener tools disponibles
   * @returns {Object} { serverId, toolName }
   */
  resolveToolInfo(toolName, serverIdHint = null, mcpClient = null) {
    // 🔒 DEBUG: Validar entrada
    if (!toolName) {
      debugLogger.warn('ToolProcessor', 'resolveToolInfo recibió toolName vacío', { toolName, serverIdHint });
      return { serverId: null, toolName: toolName || '' };
    }
    
    const tools = mcpClient?.getAvailableTools() || [];
    
    // 🔒 ESPECIAL: Si serverIdHint es 'tenable', buscar específicamente en Tenable primero
    if (serverIdHint === 'tenable') {
      const tenableMatch = tools.find(t => t.serverId === 'tenable' && t.name === toolName);
      if (tenableMatch) {
        debugLogger.debug('ToolProcessor', 'Herramienta de Tenable encontrada', { toolName, serverId: 'tenable' });
        return { serverId: 'tenable', toolName: tenableMatch.name };
      }
    }
    
    if (serverIdHint) {
      const match = tools.find(t => t.serverId === serverIdHint && t.name === toolName);
      if (match) {
        return { serverId: match.serverId, toolName: match.name };
      }
    }

    const exactMatches = tools.filter(t => t.name === toolName);
    if (exactMatches.length === 1) {
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    if (exactMatches.length > 1) {
      // 🔒 MEJORADO: Priorizar Tenable si hay múltiples matches
      const tenableMatch = exactMatches.find(t => t.serverId === 'tenable');
      if (tenableMatch) {
        return { serverId: tenableMatch.serverId, toolName: tenableMatch.name };
      }
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    const namespacedMatch = tools.find(t => `${t.serverId}__${t.name}` === toolName);
    if (namespacedMatch) {
      return { serverId: namespacedMatch.serverId, toolName: namespacedMatch.name };
    }

    const filesystemMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
    if (filesystemMatch) {
      return { serverId: filesystemMatch.serverId, toolName: filesystemMatch.name };
    }
    
    // 🔒 ESPECIAL: Buscar en Tenable si el nombre contiene palabras relacionadas
    if (toolName.includes('asset') || toolName.includes('vulnerability') || toolName.includes('tenable')) {
      const tenableTools = tools.filter(t => t.serverId === 'tenable');
      const tenableMatch = tenableTools.find(t => 
        t.name.includes(toolName) || toolName.includes(t.name)
      );
      if (tenableMatch) {
        debugLogger.debug('ToolProcessor', 'Herramienta de Tenable encontrada por nombre relacionado', { 
          toolName, 
          encontrada: tenableMatch.name 
        });
        return { serverId: 'tenable', toolName: tenableMatch.name };
      }
    }

    // 🔧 NUEVO: Fuzzy matching para nombres similares (corrección automática)
    // Buscar herramientas con nombres similares (útil cuando el modelo genera nombres incorrectos)
    const similarTools = this.findSimilarToolName(toolName, tools);
    if (similarTools.length > 0) {
      const bestMatch = similarTools[0];
      console.warn(`⚠️ [ToolProcessor] Tool "${toolName}" no encontrada, usando similar: "${bestMatch.name}"`);
      return { serverId: bestMatch.serverId, toolName: bestMatch.name };
    }

    return { serverId: serverIdHint, toolName };
  }

  /**
   * Encontrar herramientas con nombres similares usando distancia de Levenshtein
   */
  findSimilarToolName(targetName, tools, maxDistance = 3) {
    if (!targetName || typeof targetName !== 'string' || !tools || tools.length === 0) {
      return [];
    }

    const targetLower = targetName.toLowerCase();
    const candidates = [];

    for (const tool of tools) {
      const toolNameLower = tool.name.toLowerCase();
      
      // Calcular distancia de Levenshtein simple
      const distance = this.levenshteinDistance(targetLower, toolNameLower);
      
      // También verificar si el nombre contiene el target o viceversa
      const containsMatch = toolNameLower.includes(targetLower) || targetLower.includes(toolNameLower);
      
      if (distance <= maxDistance || containsMatch) {
        candidates.push({
          ...tool,
          distance: containsMatch ? Math.min(distance, 1) : distance
        });
      }
    }

    // Ordenar por distancia (menor es mejor)
    candidates.sort((a, b) => a.distance - b.distance);
    
    return candidates;
  }

  /**
   * Calcular distancia de Levenshtein entre dos strings
   */
  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,     // eliminación
            dp[i][j - 1] + 1,     // inserción
            dp[i - 1][j - 1] + 1  // sustitución
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Detectar PLAN de herramientas (modo ReAct) en la respuesta
   * @param {string} response - Respuesta del modelo
   * @returns {Object|null} Plan detectado o null
   */
  detectToolPlan(response) {
    if (!response || typeof response !== 'string') return null;
    
    // Buscar JSON con estructura de plan: {"plan": [...]}
    // Mejorado: buscar también variantes como "tools", "steps", "actions"
    const jsonPatterns = [
      /\{[\s\S]*?"plan"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g,
      /\{[\s\S]*?"tools"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g,
      /\{[\s\S]*?"steps"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g
    ];
    
    let matches = [];
    for (const pattern of jsonPatterns) {
      const found = response.match(pattern);
      if (found) matches = matches.concat(found);
    }
    
    if (!matches || matches.length === 0) return null;
    
    for (const jsonStr of matches) {
      try {
        const data = JSON.parse(jsonStr);
        // Buscar plan, tools, steps, o actions
        const planArray = data.plan || data.tools || data.steps || data.actions;
        
        if (planArray && Array.isArray(planArray) && planArray.length > 0) {
          // Validar que cada elemento del plan tenga tool
          const validTools = planArray.filter(t => {
            if (!t) return false;
            // Aceptar tool, toolName, name, o function
            return !!(t.tool || t.toolName || t.name || t.function);
          });
          
          if (validTools.length > 0) {
            debugLogger.debug('ToolProcessor', 'Plan detectado con herramientas válidas', {
              herramientas: validTools.length,
              formato: data.plan ? 'plan' : (data.tools ? 'tools' : (data.steps ? 'steps' : 'actions'))
            });
            return {
              isPlan: true,
              tools: validTools.map(t => ({
                tool: t.tool || t.toolName || t.name || t.function,
                toolName: t.tool || t.toolName || t.name || t.function,
                arguments: t.arguments || t.args || t.params || {},
                serverId: t.serverId || t.server || null
              }))
            };
          }
        }
      } catch (e) {
        // Intentar extraer JSON más específico si falla el parse completo
        try {
          // Buscar solo el array del plan
          const arrayMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (arrayMatch) {
            const arrayData = JSON.parse(arrayMatch[0]);
            if (Array.isArray(arrayData) && arrayData.length > 0) {
              const validTools = arrayData.filter(t => t && (t.tool || t.toolName || t.name));
              if (validTools.length > 0) {
                debugLogger.debug('ToolProcessor', 'Plan detectado (array directo)', {
                  herramientas: validTools.length
                });
                return {
                  isPlan: true,
                  tools: validTools.map(t => ({
                    tool: t.tool || t.toolName || t.name,
                    toolName: t.tool || t.toolName || t.name,
                    arguments: t.arguments || t.args || {},
                    serverId: t.serverId || t.server || null
                  }))
                };
              }
            }
          }
        } catch (e2) {
          continue;
        }
      }
    }
    
    return null;
  }

  /**
   * Generar system prompt UNIVERSAL para MCP (modelos sin function calling)
   * @param {Array} tools - Array de tools
   * @param {Object} options - Opciones (maxPerServer, serverHints)
   * @returns {string} System prompt formateado
   */
  generateUniversalMCPSystemPrompt(tools, options = {}) {
    if (!tools || tools.length === 0) return '';

    const maxPerServer = typeof options.maxPerServer === 'number' ? options.maxPerServer : 6;
    const serverHints = options.serverHints || {};

    // Agrupar tools por servidor
    const serverIdToTools = tools.reduce((acc, t) => {
      const sid = t.serverId || 'unknown';
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(t);
      return acc;
    }, {});

    let out = '';
    out += 'HERRAMIENTAS DISPONIBLES:\n\n';
    out += 'Formato JSON: {"tool":"<server>__<name>","arguments":{...}}\n';
    out += 'Usa estas herramientas cuando el usuario pida ejecutar comandos, listar archivos, o trabajar con servidores.\n\n';

    const serverIds = Object.keys(serverIdToTools).sort();
    serverIds.forEach((serverId, sidx) => {
      const list = serverIdToTools[serverId] || [];
      const selected = list.slice(0, Math.max(1, maxPerServer));

      out += `[${serverId}]\n`;

      // Hints específicos del servidor (p.ej., filesystem)
      const hints = serverHints[serverId] || {};
      if (hints.allowedDirsText) {
        const lines = String(hints.allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 2);
        out += `Dirs: ${lines.join(', ')}${lines.length < 2 ? '' : '...'}\n`;
      }
      if (hints.defaultRaw) {
        out += `⚠️ DEFAULT PATH: ${hints.defaultRaw}\n`;
        out += `CRÍTICO: SIEMPRE usa rutas ABSOLUTAS comenzando con este directorio.\n`;
        out += `Ejemplo correcto: "${hints.defaultRaw}\\archivo.txt"\n`;
        out += `Ejemplo INCORRECTO: "archivo.txt" (ruta relativa - NO usar)\n`;
      }

      // Acciones comunes (sólo si es filesystem) - OPTIMIZADO
      if (serverId === 'filesystem') {
        const names = list.map(t => t.name);
        const has = (n) => names.includes(n);
        const actions = [];
        if (has('list_directory')) actions.push('listar→list_directory');
        if (has('read_text_file')) actions.push('leer→read_text_file');
        if (has('write_file')) actions.push('crear→write_file');
        if (has('edit_file')) actions.push('editar→edit_file');
        if (has('move_file')) actions.push('mover→move_file(source,destination con nombre completo)');
        if (has('search_files')) actions.push('buscar→search_files(pattern,path)');
        if (actions.length > 0) {
          out += `Acciones: ${actions.join(', ')}\n`;
        }
      }

      selected.forEach((tool, tidx) => {
        const schema = tool.inputSchema || {};
        const properties = schema.properties || {};
        const required = schema.required || [];
        const keys = Object.keys(properties);

        // Formato compacto: nombre(params) - descripción COMPLETA (sin truncar)
        const reqParams = keys.filter(k => required.includes(k));
        const optParams = keys.filter(k => !required.includes(k));
        const paramsList = [...reqParams, ...optParams.map(p => `${p}?`)];
        
        out += `${tool.name}(${paramsList.join(',')})`;
        if (tool.description) {
          // ✅ Mostrar descripción completa (era 60 caracteres, muy corto)
          out += ` - ${tool.description}`;
        }
        // 🔧 CRÍTICO: Reforzar nombre correcto para search_nodeterm
        if (tool.name === 'search_nodeterm') {
          out += ' ⚠️ NOMBRE CORRECTO: "search_nodeterm" (NO "search_noderm", NO "search_nodeterms")';
        }
        out += '\n';

        // Ejemplo compacto
        const exampleArgs = {};
        reqParams.forEach((p) => {
          const prop = properties[p] || {};
          if (prop.type === 'string') {
            const isPathLike = /path|file|dir|directory/i.test(p);
            if (isPathLike && hints.defaultRaw) {
              const baseRaw = hints.defaultRaw;
              const needsSep = !baseRaw.endsWith('\\') && !baseRaw.endsWith('/');
              if (/dir|directory/i.test(p)) {
                exampleArgs[p] = baseRaw;
              } else {
                const sep = needsSep ? (baseRaw.includes('\\') ? '\\' : '/') : '';
                exampleArgs[p] = `${baseRaw}${sep}file.txt`;
              }
            } else {
              exampleArgs[p] = 'value';
            }
          }
          else if (prop.type === 'array') exampleArgs[p] = [];
          else if (prop.type === 'object') exampleArgs[p] = {};
          else exampleArgs[p] = prop.type === 'number' ? 0 : true;
        });

        if (keys.length > 0) {
          out += `  {"tool":"${serverId}__${tool.name}","arguments":${JSON.stringify(exampleArgs)}}\n`;
        }
      });

      if (sidx < serverIds.length - 1) {
        out += '\n';
      }
    });

    // Ejemplos compactos con rutas absolutas
    out += '\nEJEMPLOS:\n';
    // Usar el defaultRaw si está disponible para filesystem
    const fsHints = serverHints['filesystem'] || {};
    const basePath = fsHints.defaultRaw || 'C:\\path\\to\\dir';
    const sep = basePath.includes('\\') ? '\\' : '/';
    out += `Listar: {"tool":"filesystem__list_directory","arguments":{"path":"${basePath}"}}\n`;
    out += `Leer: {"tool":"filesystem__read_file","arguments":{"path":"${basePath}${sep}config.json"}}\n`;
    out += `Crear: {"tool":"filesystem__write_file","arguments":{"path":"${basePath}${sep}file.txt","content":"texto"}}\n`;
    
    // 🔧 CRÍTICO: Ejemplo explícito para search_nodeterm (NO search_noderm)
    const hasSearchNodeterm = tools.some(t => t.name === 'search_nodeterm');
    if (hasSearchNodeterm) {
      out += `Buscar SSH: {"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"AC68U"}}\n`;
      out += `Listar todos SSH: {"tool":"ssh-terminal__search_nodeterm","arguments":{}}\n`;
      out += '⚠️ IMPORTANTE: El nombre correcto es "search_nodeterm" (NO "search_noderm", NO "search_nodeterms").\n';
      out += '🚫 CRÍTICO: search_nodeterm SOLO debe usarse cuando el usuario EXPLÍCITAMENTE pide buscar, listar o conectar a una conexión SSH. NO lo uses proactivamente ni para sugerencias.\n';
    }
    
    // 🔒 Ejemplos específicos para Tenable.io
    const hasTenableTools = tools.some(t => t.serverId === 'tenable');
    if (hasTenableTools) {
      out += '\n🔒 EJEMPLOS TENABLE.IO:\n';
      out += `Listar activos: {"tool":"tenable__get_assets","arguments":{"limit":"50","offset":"0"}}\n`;
      out += `Buscar activo: {"tool":"tenable__search_assets","arguments":{"search_term":"servidor01","limit":"50"}}\n`;
      out += `Detalles de activo: {"tool":"tenable__get_asset_details","arguments":{"asset_id":"uuid-del-activo"}}\n`;
      out += `Vulnerabilidades: {"tool":"tenable__get_asset_vulnerabilities","arguments":{"asset_id":"uuid-del-activo","severity":"critical","limit":"100"}}\n`;
      out += '⚠️ IMPORTANTE: Cuando el usuario mencione Tenable, vulnerabilidades, activos o seguridad, usa estas herramientas automáticamente.\n';
    }
    
    out += '\nCRÍTICO: USA SIEMPRE RUTAS ABSOLUTAS. NO uses rutas relativas.\n';
    out += '\n🔴 FORMATO DE RESPUESTA - CRÍTICO:\n';
    out += '• Si el objetivo requiere MÚLTIPLES herramientas → Usa formato PLAN: {"plan":[{"tool":"...","arguments":{...}},{"tool":"...","arguments":{...}}]}\n';
    out += '• Si solo necesitas UNA herramienta → {"tool":"<server>__<name>","arguments":{...}}\n';
    out += '• NO preguntes, NO expliques, NO uses campos como "messages" o "response"\n';
    out += '• Solo responde en texto natural cuando hayas completado TODAS las acciones\n';
    out += '• Ejemplo PLAN: {"plan":[{"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"Kepler"}},{"tool":"ssh-terminal__execute_ssh","arguments":{"hostId":"Kepler","command":"free -h"}}]}\n';
    out += '• Ejemplo correcto: {"tool":"ssh-terminal__search_nodeterm","arguments":{"query":"Kepler"}}\n';
    out += '• Ejemplo INCORRECTO: {"messages":["¿Puedo usar search_nodeterm?"]}\n';
    out += '\n⚠️ NOMBRES DE HERRAMIENTAS: Usa EXACTAMENTE los nombres mostrados arriba. NO inventes nombres similares.\n';
    out += '🚫 NO USES HERRAMIENTAS PROACTIVAMENTE: Solo ejecuta herramientas cuando el usuario lo pida explícitamente.\n';
    out += '\n🔴 REGLA CRÍTICA - CREAR vs EJECUTAR:\n';
    out += '• "crea un script" / "crea un archivo" → SOLO usa write_file (NO execute_local)\n';
    out += '• "ejecuta el script" / "run script" / "corre el comando" → USA execute_local\n';
    out += '• "crea y ejecuta" → PRIMERO write_file, LUEGO execute_local\n';
    out += '• Si el usuario SOLO pide CREAR/GENERAR/ESCRIBIR → NO ejecutes comandos automáticamente\n\n';

    return out;
  }
}

// Exportar instancia singleton
export const toolProcessor = new ToolProcessor();
export default toolProcessor;

