/**
 * Manejadores IPC para peticiones HTTP de Nextcloud
 * Gestiona peticiones con configuración SSL personalizada
 */

const { ipcMain } = require('electron');
const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Registra manejadores IPC para Nextcloud
 */
function registerNextcloudHandlers() {
  // Manejador para peticiones HTTP de Nextcloud con configuración SSL personalizada
  ipcMain.handle('nextcloud:http-request', async (event, { url, options, ignoreSSLErrors }) => {
    try {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      
      // Configurar opciones para la petición
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {},
        ...(ignoreSSLErrors && isHttps && {
          rejectUnauthorized: false,
          requestCert: false,
          agent: false
        })
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
        
        // Si hay body, enviarlo
        if (options.body) {
          req.write(options.body);
        }
        
        req.end();
      });
    } catch (error) {
      throw error;
    }
  });

  console.log('✅ [Nextcloud Handlers] Registrados');
}

module.exports = { registerNextcloudHandlers };
