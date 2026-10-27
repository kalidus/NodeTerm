/**
 * Manejadores IPC para peticiones HTTP de Nextcloud
 * Gestiona peticiones con configuración SSL personalizada y anti-SSRF.
 */

const { ipcMain } = require('electron');
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { assertSafeOutboundUrl, isLoopbackHost, isPrivateHost } = require('../utils/ssrf-guard');
const { assertTrustedIpcSender } = require('../utils/ipc-trust');

/**
 * En Electron, rejectUnauthorized en la petición no basta: el agente global
 * sigue verificando el certificado. Solo se usa si Ignorar SSL está activo.
 */
let insecureAgent = null;
function getInsecureAgent() {
  if (!insecureAgent) {
    insecureAgent = new https.Agent({
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined
    });
  }
  return insecureAgent;
}

/**
 * Registra manejadores IPC para Nextcloud
 */
function registerNextcloudHandlers() {
  // Manejador para peticiones HTTP de Nextcloud con configuración SSL personalizada
  ipcMain.handle('nextcloud:http-request', async (event, { url, options = {}, ignoreSSLErrors, baseUrl } = {}) => {
    const trust = assertTrustedIpcSender(event);
    if (!trust.ok) {
      throw new Error(`IPC no autorizado: ${trust.error}`);
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      throw new Error('baseUrl de Nextcloud requerido para peticiones HTTP');
    }

    let allowedOrigin;
    try {
      allowedOrigin = new URL(baseUrl.trim()).origin;
    } catch {
      throw new Error('baseUrl de Nextcloud inválido');
    }

    // Permitir privadas/loopback solo si el propio Nextcloud configurado está ahí
    // (instalaciones self-hosted en LAN / localhost).
    let allowedHost;
    try {
      allowedHost = new URL(baseUrl.trim()).hostname;
    } catch {
      allowedHost = null;
    }
    const allowLoopback = allowedHost ? isLoopbackHost(allowedHost) : false;
    const allowPrivate = allowedHost ? (isPrivateHost(allowedHost) || allowLoopback) : false;

    const safe = assertSafeOutboundUrl(url, {
      allowedOrigin,
      allowPrivate,
      allowLoopback
    });
    if (!safe.ok) {
      throw new Error(`SSRF bloqueado: ${safe.error}`);
    }

    const urlObj = safe.parsed;
    const isHttps = urlObj.protocol === 'https:';

    // ignoreSSLErrors solo para el origen Nextcloud ya validado
    const relaxTls = Boolean(ignoreSSLErrors) && isHttps;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: (options && options.method) || 'GET',
      headers: (options && options.headers) || {},
      servername: urlObj.hostname,
      ...(relaxTls && { agent: getInsecureAgent() })
    };

    return new Promise((resolve, reject) => {
      const client = isHttps ? https : http;

      const req = client.request(requestOptions, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            data: data
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options && options.body) {
        req.write(options.body);
      }

      req.end();
    });
  });
}

module.exports = { registerNextcloudHandlers };
