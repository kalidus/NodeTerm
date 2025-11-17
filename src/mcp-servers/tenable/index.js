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
let API_KEY = process.env.TENABLE_ACCESS_KEY || "";
let API_SECRET = process.env.TENABLE_SECRET_KEY || "";

// Axios instance for Tenable API
const tenableClient = axios.create({
  baseURL: TENABLE_API_URL,
  headers: {
    "X-ApiKeys": `accessKey=${API_KEY};secretKey=${API_SECRET}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

/**
 * Tool: get_assets
 * Retrieve a list of assets from Tenable.io
 */
async function getAssets(params) {
  try {
    const limit = parseInt(params.limit) || 50;
    const offset = parseInt(params.offset) || 0;

    const response = await tenableClient.get("/assets", {
      params: {
        limit,
        offset,
      },
    });

    const assets = response.data.assets || [];
    const total = response.data.pagination?.total || assets.length;

    return {
      type: "text",
      text: `Found ${assets.length} assets (Total: ${total}):\n\n${JSON.stringify(
        assets,
        null,
        2
      )}`,
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error retrieving assets: ${error.message}`,
      isError: true,
    };
  }
}

/**
 * Tool: get_asset_details
 * Get detailed information for a specific asset
 */
async function getAssetDetails(params) {
  try {
    const assetId = params.asset_id;
    if (!assetId) {
      throw new Error("asset_id is required");
    }

    const response = await tenableClient.get(`/assets/${assetId}`);
    const asset = response.data;

    return {
      type: "text",
      text: `Asset Details for ${assetId}:\n\n${JSON.stringify(asset, null, 2)}`,
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error retrieving asset details: ${error.message}`,
      isError: true,
    };
  }
}

/**
 * Tool: search_assets
 * Search for assets by hostname, IP address, or other criteria
 */
async function searchAssets(params) {
  try {
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
      type: "text",
      text: `Search results for "${searchTerm}": Found ${assets.length} assets\n\n${JSON.stringify(
        assets,
        null,
        2
      )}`,
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error searching assets: ${error.message}`,
      isError: true,
    };
  }
}

/**
 * Tool: get_asset_vulnerabilities
 * Get vulnerabilities for a specific asset
 */
async function getAssetVulnerabilities(params) {
  try {
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
      type: "text",
      text: `Found ${vulnerabilities.length} vulnerabilities for asset ${assetId}:\n\n${JSON.stringify(
        vulnerabilities,
        null,
        2
      )}`,
    };
  } catch (error) {
    return {
      type: "text",
      text: `Error retrieving vulnerabilities: ${error.message}`,
      isError: true,
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
  const { name, arguments: args } = request;

  // 🔒 DEBUG: Log completo del request para debugging
  console.error(`[Tenable MCP] CallTool request completo:`, JSON.stringify(request, null, 2));
  console.error(`[Tenable MCP] Calling tool: name="${name}", args=`, args);

  if (!name) {
    console.error(`[Tenable MCP] ERROR: name es undefined o null`);
    return {
      type: "text",
      text: `Error: nombre de herramienta no proporcionado. Request recibido: ${JSON.stringify(request)}`,
      isError: true,
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
        type: "text",
        text: `Unknown tool: ${name}`,
        isError: true,
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


