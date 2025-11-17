#!/usr/bin/env node

/**
 * Tenable.io MCP Server
 * Provides tools for interacting with Tenable.io API
 * - List and search assets
 * - Get asset details
 * - Retrieve asset vulnerabilities
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  InitializeRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Initialize MCP Server con capabilities declaradas
const server = new Server(
  {
    name: "tenable-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tenable API Configuration
const TENABLE_API_URL = "https://cloud.tenable.com/api/v2";

// 🔧 FIX: Leer credenciales dinámicamente desde process.env en cada llamada
function getCredentials() {
  const apiKey = process.env.TENABLE_ACCESS_KEY || "";
  const apiSecret = process.env.TENABLE_SECRET_KEY || "";
  
  // 🔒 DEBUG: Log de credenciales (sin mostrar valores completos por seguridad)
  console.error(`[Tenable MCP] Credenciales detectadas: ACCESS_KEY=${apiKey ? `${apiKey.substring(0, 4)}...${apiKey.length} chars` : 'VACÍO'}, SECRET_KEY=${apiSecret ? `${apiSecret.substring(0, 4)}...${apiSecret.length} chars` : 'VACÍO'}`);
  
  return { apiKey, apiSecret };
}

// Validar credenciales
function validateCredentials() {
  const { apiKey, apiSecret } = getCredentials();
  if (!apiKey || !apiSecret) {
    return {
      valid: false,
      message: "Las credenciales de Tenable no están configuradas. Por favor, configura las variables de entorno TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY."
    };
  }
  return { valid: true };
}

// Crear cliente axios con credenciales actuales
function createTenableClient() {
  const { apiKey, apiSecret } = getCredentials();
  
  // 🔧 FIX: Limpiar credenciales de espacios y caracteres especiales
  const cleanApiKey = (apiKey || "").trim();
  const cleanApiSecret = (apiSecret || "").trim();
  
  // Construir header de autenticación
  const apiKeysHeader = `accessKey=${cleanApiKey};secretKey=${cleanApiSecret}`;
  
  // 🔒 DEBUG: Log del header completo (sin mostrar valores completos)
  console.error(`[Tenable MCP] Header X-ApiKeys construido: accessKey=${cleanApiKey.substring(0, 4)}...${cleanApiKey.length} chars;secretKey=${cleanApiSecret.substring(0, 4)}...${cleanApiSecret.length} chars`);
  
  const client = axios.create({
    baseURL: TENABLE_API_URL,
    headers: {
      "X-ApiKeys": apiKeysHeader,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  
  // 🔒 DEBUG: Interceptor para ver exactamente qué se envía
  client.interceptors.request.use(
    (config) => {
      console.error(`[Tenable MCP] Request interceptor:`, {
        url: config.url,
        method: config.method,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        headers: {
          ...config.headers,
          // Mostrar solo primeros caracteres del header de autenticación
          "X-ApiKeys": config.headers["X-ApiKeys"] ? 
            config.headers["X-ApiKeys"].substring(0, 50) + "..." : 
            "NO DEFINIDO"
        },
        params: config.params
      });
      return config;
    },
    (error) => {
      console.error(`[Tenable MCP] Request interceptor error:`, error);
      return Promise.reject(error);
    }
  );
  
  // 🔒 DEBUG: Interceptor de respuesta para ver qué se recibe
  client.interceptors.response.use(
    (response) => {
      console.error(`[Tenable MCP] Response interceptor:`, {
        status: response.status,
        statusText: response.statusText,
        dataKeys: Object.keys(response.data || {}),
        headers: Object.keys(response.headers || {})
      });
      return response;
    },
    (error) => {
      console.error(`[Tenable MCP] Response interceptor error:`, {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        request: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers ? Object.keys(error.config.headers) : []
        }
      });
      return Promise.reject(error);
    }
  );
  
  return client;
}

// Cliente inicial (se actualizará dinámicamente)
let tenableClient = createTenableClient();

/**
 * Tool: get_assets
 * Retrieve a list of assets from Tenable.io
 */
async function getAssets(params) {
  try {
    // Validar credenciales antes de hacer la llamada
    const credCheck = validateCredentials();
    if (!credCheck.valid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${credCheck.message}`,
            isError: true,
          },
        ],
      };
    }

    // 🔧 FIX: Recrear cliente con credenciales actuales antes de cada llamada
    tenableClient = createTenableClient();

    const limit = parseInt(params.limit) || 50;
    const offset = parseInt(params.offset) || 0;

    // 🔒 DEBUG: Log de la petición completa
    console.error(`[Tenable MCP] Haciendo petición GET a /assets con limit=${limit}, offset=${offset}`);
    
    const response = await tenableClient.get("/assets", {
      params: {
        limit,
        offset,
      },
    });
    
    // 🔒 DEBUG: Log de respuesta exitosa
    console.error(`[Tenable MCP] Respuesta exitosa: status=${response.status}, data keys=${Object.keys(response.data || {}).join(', ')}`);

    const assets = response.data.assets || [];
    const total = response.data.pagination?.total || assets.length;

    return {
      content: [
        {
          type: "text",
          text: `Found ${assets.length} assets (Total: ${total}):\n\n${JSON.stringify(
            assets,
            null,
            2
          )}`,
        },
      ],
    };
  } catch (error) {
    // 🔒 DEBUG: Log detallado del error
    console.error(`[Tenable MCP] Error en getAssets:`, {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      headers: error.response?.headers,
      config: {
        url: error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers ? Object.keys(error.config.headers) : []
      }
    });
    
    let errorMessage = `Error retrieving assets: ${error.message}`;
    
    // Mensajes de error más descriptivos
    if (error.response) {
      const status = error.response.status;
      const responseData = error.response.data;
      
      if (status === 403) {
        // Intentar obtener más detalles del error
        const errorDetail = responseData?.error || responseData?.message || '';
        errorMessage = `❌ Error de autenticación (403): Las credenciales de Tenable son inválidas o no tienen permisos. ${errorDetail ? `Detalle: ${errorDetail}` : 'Verifica que TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY estén configuradas correctamente y que la cuenta tenga permisos suficientes.'}`;
      } else if (status === 401) {
        errorMessage = `❌ Error de autenticación (401): Las credenciales de Tenable son inválidas. Verifica que TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY estén configuradas correctamente.`;
      } else {
        errorMessage = `❌ Error ${status}: ${responseData?.error || responseData?.message || error.message}`;
      }
    }
    
    return {
      content: [
        {
          type: "text",
          text: errorMessage,
          isError: true,
        },
      ],
    };
  }
}

/**
 * Tool: get_asset_details
 * Get detailed information for a specific asset
 */
async function getAssetDetails(params) {
  try {
    const credCheck = validateCredentials();
    if (!credCheck.valid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${credCheck.message}`,
            isError: true,
          },
        ],
      };
    }

    // 🔧 FIX: Recrear cliente con credenciales actuales antes de cada llamada
    tenableClient = createTenableClient();

    const assetId = params.asset_id;
    if (!assetId) {
      throw new Error("asset_id is required");
    }

    const response = await tenableClient.get(`/assets/${assetId}`);
    const asset = response.data;

    return {
      content: [
        {
          type: "text",
          text: `Asset Details for ${assetId}:\n\n${JSON.stringify(asset, null, 2)}`,
        },
      ],
    };
  } catch (error) {
    let errorMessage = `Error retrieving asset details: ${error.message}`;
    if (error.response?.status === 403 || error.response?.status === 401) {
      errorMessage = `❌ Error de autenticación: Las credenciales de Tenable son inválidas. Verifica que TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY estén configuradas correctamente.`;
    }
    return {
      content: [
        {
          type: "text",
          text: errorMessage,
          isError: true,
        },
      ],
    };
  }
}

/**
 * Tool: search_assets
 * Search for assets by hostname, IP address, or other criteria
 */
async function searchAssets(params) {
  try {
    const credCheck = validateCredentials();
    if (!credCheck.valid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${credCheck.message}`,
            isError: true,
          },
        ],
      };
    }

    // 🔧 FIX: Recrear cliente con credenciales actuales antes de cada llamada
    tenableClient = createTenableClient();

    const searchTerm = params.search_term;
    if (!searchTerm) {
      throw new Error("search_term is required");
    }

    const limit = parseInt(params.limit) || 50;

    // Tenable uses filters for searches
    const filters = [
      {
        field: "hostname",
        operator: "contains",
        value: searchTerm,
      },
    ];

    const response = await tenableClient.post("/assets/find", {
      filters,
      limit,
    });

    const assets = response.data.assets || [];

    return {
      content: [
        {
          type: "text",
          text: `Search results for "${searchTerm}": Found ${assets.length} assets\n\n${JSON.stringify(
            assets,
            null,
            2
          )}`,
        },
      ],
    };
  } catch (error) {
    let errorMessage = `Error searching assets: ${error.message}`;
    if (error.response?.status === 403 || error.response?.status === 401) {
      errorMessage = `❌ Error de autenticación: Las credenciales de Tenable son inválidas. Verifica que TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY estén configuradas correctamente.`;
    }
    return {
      content: [
        {
          type: "text",
          text: errorMessage,
          isError: true,
        },
      ],
    };
  }
}

/**
 * Tool: get_asset_vulnerabilities
 * Get vulnerabilities for a specific asset
 */
async function getAssetVulnerabilities(params) {
  try {
    const credCheck = validateCredentials();
    if (!credCheck.valid) {
      return {
        content: [
          {
            type: "text",
            text: `❌ ${credCheck.message}`,
            isError: true,
          },
        ],
      };
    }

    // 🔧 FIX: Recrear cliente con credenciales actuales antes de cada llamada
    tenableClient = createTenableClient();

    const assetId = params.asset_id;
    if (!assetId) {
      throw new Error("asset_id is required");
    }

    const severity = params.severity || ""; // critical, high, medium, low, info
    const limit = parseInt(params.limit) || 100;

    const requestParams = {
      limit,
    };

    if (severity) {
      requestParams.severity = severity;
    }

    const response = await tenableClient.get(
      `/assets/${assetId}/vulnerabilities`,
      { params: requestParams }
    );

    const vulnerabilities = response.data.vulnerabilities || [];

    return {
      content: [
        {
          type: "text",
          text: `Found ${vulnerabilities.length} vulnerabilities for asset ${assetId}:\n\n${JSON.stringify(
            vulnerabilities,
            null,
            2
          )}`,
        },
      ],
    };
  } catch (error) {
    let errorMessage = `Error retrieving vulnerabilities: ${error.message}`;
    if (error.response?.status === 403 || error.response?.status === 401) {
      errorMessage = `❌ Error de autenticación: Las credenciales de Tenable son inválidas. Verifica que TENABLE_ACCESS_KEY y TENABLE_SECRET_KEY estén configuradas correctamente.`;
    }
    return {
      content: [
        {
          type: "text",
          text: errorMessage,
          isError: true,
        },
      ],
    };
  }
}

// Define available tools
const tools = [
  {
    name: "get_assets",
    description:
      "Retrieve a list of assets from Tenable.io with optional pagination",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "string",
          description: "Maximum number of assets to retrieve (1-1000, default: 50)",
        },
        offset: {
          type: "string",
          description: "Number of assets to skip for pagination (default: 0)",
        },
      },
    },
  },
  {
    name: "get_asset_details",
    description: "Get detailed information for a specific asset",
    inputSchema: {
      type: "object",
      properties: {
        asset_id: {
          type: "string",
          description: "The ID or UUID of the asset",
        },
      },
      required: ["asset_id"],
    },
  },
  {
    name: "search_assets",
    description: "Search for assets by hostname, IP address, or other criteria",
    inputSchema: {
      type: "object",
      properties: {
        search_term: {
          type: "string",
          description: "The search term (hostname, IP, etc.)",
        },
        limit: {
          type: "string",
          description: "Maximum number of results (1-1000, default: 50)",
        },
      },
      required: ["search_term"],
    },
  },
  {
    name: "get_asset_vulnerabilities",
    description: "Get vulnerabilities for a specific asset",
    inputSchema: {
      type: "object",
      properties: {
        asset_id: {
          type: "string",
          description: "The ID or UUID of the asset",
        },
        severity: {
          type: "string",
          description:
            'Filter by severity: critical, high, medium, low, info (optional)',
        },
        limit: {
          type: "string",
          description: "Maximum number of vulnerabilities (default: 100)",
        },
      },
      required: ["asset_id"],
    },
  },
];

// CRÍTICO: Registrar initialize ANTES de otros handlers para declarar capabilities
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      tools: {
        listChanged: true,
      },
    },
    serverInfo: {
      name: "tenable-mcp-server",
      version: "1.0.0",
    },
  };
});

// Handle list_tools request - Registrar DESPUÉS de initialize
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle call_tool request
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // 🔧 FIX: El SDK pasa el request completo, necesitamos acceder a request.params
  // El request tiene estructura: { method: "tools/call", params: { name, arguments } }
  const params = request.params || request;
  const { name, arguments: args } = params;

  // 🔒 DEBUG: Log completo del request para debugging
  console.error(`[Tenable MCP] CallTool request completo:`, JSON.stringify(request, null, 2));
  console.error(`[Tenable MCP] Params extraídos:`, JSON.stringify(params, null, 2));
  console.error(`[Tenable MCP] Calling tool: name="${name}", args=`, args);

  if (!name) {
    console.error(`[Tenable MCP] ERROR: name es undefined o null`);
    console.error(`[Tenable MCP] Request structure:`, JSON.stringify(request, null, 2));
    return {
      content: [
        {
          type: "text",
          text: `Error: nombre de herramienta no proporcionado. Request recibido: ${JSON.stringify(request)}`,
          isError: true,
        },
      ],
    };
  }

  switch (name) {
    case "get_assets":
      return await getAssets(args || {});
    case "get_asset_details":
      return await getAssetDetails(args || {});
    case "search_assets":
      return await searchAssets(args || {});
    case "get_asset_vulnerabilities":
      return await getAssetVulnerabilities(args || {});
    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}`,
            isError: true,
          },
        ],
      };
  }
});

// Start server
async function main() {
  const transport = new (await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  )).StdioServerTransport();

  await server.connect(transport);
  console.error("[Tenable MCP Server] Started successfully");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});


