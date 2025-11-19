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
}

// Exportar instancia singleton
export const toolProcessor = new ToolProcessor();
export default toolProcessor;

