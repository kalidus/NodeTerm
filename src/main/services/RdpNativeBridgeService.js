/**
 * RdpNativeBridgeService.js
 * Servicio proxy TCP-a-WebSocket nativo en Node.js para conexiones RDP Web HTML5 (IronRDP WASM).
 * 
 * 🚀 Característica Clave: 100% independiente de guacd, WSL (ubuntu.exe) y Docker.
 * Funciona de forma totalmente nativa en Windows, macOS y Linux.
 */

const net = require('net');
const tls = require('tls');
const http = require('http');
const crypto = require('crypto');
const EventEmitter = require('events');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const { parseX224ConnectionConfirm, protocolName, describeRdpPdu } = require('./rdp-protocol-helpers');
const { prepareMcsConnectInitial, findClientCoreData, patchInfoPacket, patchInfoAutoLogon } = require('./rdp-mcs-helpers');
const { patchFontSequenceFlags } = require('./rdp-font-helpers');
const { fixWallixBitmapStrideCrop } = require('./rdp-fastpath-helpers');
const {
  createChannelFilterState,
  processServerFrame,
  learnClientInitiator,
  buildMcsSendDataRequest
} = require('./rdp-channel-filter');

function debugLog(...args) {
  if (process.env.NODETERM_RDP_DEBUG === '1') {
    console.log(...args);
  }
}

class RdpNativeBridgeService extends EventEmitter {
  constructor() {
    super();
    this.server = null;
    this.wss = null;
    this.port = 0;
    this.activeConnections = new Map();
    this.sessionTokens = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicializa el servidor HTTP/WebSocket local para RDP nativo
   */
  async initialize() {
    if (this.isInitialized && this.server) {
      return { port: this.port };
    }

    return new Promise((resolve, reject) => {
      try {
        // Crear servidor HTTP ligero en localhost (puerto efímero 0 para asignación automática segura)
        this.server = http.createServer((req, res) => {
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('NodeTerm RDP Native Bridge Active');
        });

        this.wss = new WebSocketServer({ noServer: true });

        // Manejador de actualización de protocolo WebSocket (HTTP Upgrade)
        this.server.on('upgrade', (request, socket, head) => {
          const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
          const token = url.searchParams.get('token');
          debugLog(`🌐 [RdpNativeBridgeService] Solicitud WebSocket Upgrade recibida para URL: ${request.url}`);

          if (!token || !this.sessionTokens.has(token)) {
            console.warn(`⚠️ [RdpNativeBridgeService] Token inválido o ausente: token="${token}". Conexiones activas:`, Array.from(this.sessionTokens.keys()));
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
          }

          const session = this.sessionTokens.get(token);
          this.sessionTokens.delete(token); // Token de un solo uso

          this.wss.handleUpgrade(request, socket, head, (ws) => {
            debugLog(`✅ [RdpNativeBridgeService] Handshake WebSocket completado exitosamente para la sesión.`);
            this.handleConnection(ws, session);
          });
        });

        this.server.listen(0, '127.0.0.1', () => {
          const address = this.server.address();
          this.port = address.port;
          this.isInitialized = true;
          console.log(`✅ [RdpNativeBridgeService] Servidor RDP Nativo iniciado en 127.0.0.1:${this.port} (Sin guacd/WSL/Docker)`);
          resolve({ port: this.port });
        });

        this.server.on('error', (err) => {
          console.error('❌ [RdpNativeBridgeService] Error iniciando servidor:', err);
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Genera un token de sesión seguro para conectar una pestaña RDP nativa
   */
  createSessionToken(config) {
    const tokenId = crypto.randomBytes(16).toString('hex');
    const sessionData = {
      id: tokenId,
      host: config.hostname || config.server || config.host,
      port: parseInt(config.port, 10) || 3389,
      username: config.username || '',
      password: config.password || '',
      width: config.width || 1920,
      height: config.height || 1080,
      colorDepth: config.colorDepth || 32,
      enableWallpaper: config.guacEnableWallpaper !== undefined ? config.guacEnableWallpaper : (config.enableWallpaper !== undefined ? config.enableWallpaper : true),
      enableFontSmoothing: config.enableFontSmoothing === true || config.guacEnableFontSmoothing === true,
      enableDesktopComposition: config.enableDesktopComposition === true || config.guacEnableDesktopComposition === true,
      enableTheming: config.enableTheming !== false && config.guacEnableTheming !== false,
      enableFullWindowDrag: config.enableFullWindowDrag === true || config.guacEnableFullWindowDrag === true,
      enableMenuAnimations: config.enableMenuAnimations === true || config.guacEnableMenuAnimations === true,
      createdAt: Date.now()
    };

    this.sessionTokens.set(tokenId, sessionData);

    // Auto-expirar token en 60 segundos si no se usa
    setTimeout(() => {
      this.sessionTokens.delete(tokenId);
    }, 60000);

    return {
      tokenId,
      port: this.port,
      wsUrl: `ws://127.0.0.1:${this.port}/rdp-bridge?token=${tokenId}`
    };
  }

  /**
   * Establece la conexión bidireccional entre el WebSocket cliente y el puerto RDP TCP remoto.
   * 
   * Implementa la arquitectura RDCleanPath + TLS Nativo:
   * 1. Recibe RDCleanPath Request PDU de WASM (contiene X.224 Connection Request en tag [6])
   * 2. Conecta TCP con el servidor RDP y envía el X.224 CR
   * 3. Recibe la respuesta X.224 Connection Confirm del servidor RDP
   * 4. Actualiza a TLS en el proceso nativo gestionando certificados autofirmados RDP
   * 5. Obtiene el certificado X.509 real del servidor RDP
   * 6. Construye RDCleanPath Response PDU con version + x224_connection_pdu(CC) + cert_chain + server_addr
   * 7. Envía el Response a WASM. Desencripta y canaliza los datos de sesión bidireccionales.
   */
  handleConnection(ws, session) {
    console.log(`🔌 [RdpNativeBridgeService] Conectando a ${session.host}:${session.port}`);

    const connectionId = `native_rdp_${Date.now()}`;
    let targetSocket = null;
    let tlsSocket = null;

    this.activeConnections.set(connectionId, { ws, session });

    let rdCleanPathPhase = 'waiting_request';
    let savedX224Cc = null;
    let savedSelectedProtocol = null;
    let bytesToRdp = 0;
    let bytesFromRdp = 0;
    let framesFromRdp = 0;
    let framesToRdp = 0;
    let lastRdpFrameAt = 0;
    let lastWsFrameAt = 0;
    const channelFilter = createChannelFilterState();
    const framesDir = path.join(__dirname, '../../../testing/rdp/frames');
    if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
      try { fs.mkdirSync(framesDir, { recursive: true }); } catch (_) { /* noop */ }
    }

    let isCleanedUp = false;

    const formatCloseReason = (reason) => {
      if (!reason) return 'Cerrado por el usuario';
      const r = String(reason);
      if (r.includes('WebSocket') || r.includes('WASM') || r.includes('usuario') || r.includes('user') || r.includes('tab')) {
        return 'Cerrado por el usuario';
      }
      if (r.includes('inactividad') || r.includes('idle') || r.includes('ETIMEDOUT') || r.includes('timeout')) {
        return 'Conexión cortada por inactividad o timeout';
      }
      if (r.includes('ECONNRESET') || r.includes('EPIPE') || r.includes('reiniciada')) {
        return 'Conexión cortada por el servidor remoto o la red (posible inactividad)';
      }
      if (r.includes('CLOSED') || r.includes('TLS socket closed') || r.includes('servidor remoto') || r.includes('FIN')) {
        return 'Cerrado por el servidor remoto';
      }
      if (r.includes('ECONNREFUSED')) {
        return 'Conexión rechazada por el servidor remoto';
      }
      return r;
    };

    const cleanup = (reason = 'Cerrado por el usuario', closeCode = 1000) => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      const formattedReason = formatCloseReason(reason);
      console.log(`🧹 [RdpNativeBridgeService] Sesión RDP finalizada (${formattedReason})`);
      this.activeConnections.delete(connectionId);

      this.emit('session-closed', {
        connectionId,
        tokenId: session.id,
        reason: formattedReason,
        rawReason: String(reason || ''),
        closeCode,
        host: session.host,
        port: session.port
      });

      try {
        if (ws.readyState === ws.OPEN) {
          const safeReason = String(formattedReason).slice(0, 120);
          ws.close(closeCode >= 1000 && closeCode < 5000 ? closeCode : 1000, safeReason);
        } else {
          ws.close();
        }
      } catch (e) {}
      try { if (tlsSocket) tlsSocket.destroy(); } catch (e) {}
      try { if (targetSocket) targetSocket.destroy(); } catch (e) {}
    };

    ws.on('message', (message) => {
      try {
        const payload = Buffer.isBuffer(message) ? message : Buffer.from(message);
        const isDebug = process.env.NODETERM_RDP_DEBUG === '1';

        if (rdCleanPathPhase === 'waiting_request' && payload.length > 0 && payload[0] === 0x30) {
          debugLog(`📥 [Bridge] Recibido RDCleanPath Request PDU (${payload.length} bytes). Extrayendo X.224 CR del tag [6]...`);

          let x224Cr = this.extractX224FromRdCleanPath(payload);
          if (!x224Cr || x224Cr.length === 0) {
            let samUser = session.username || 'nodeterm';
            if (samUser.includes('\\')) samUser = samUser.split('\\')[1];
            const cookieStr = `Cookie: mstshash=${samUser}\r\n`;
            const cookieBytes = Buffer.from(cookieStr, 'utf8');
            const tpktLen = 11 + cookieBytes.length + 8;
            x224Cr = Buffer.concat([
              Buffer.from([
                0x03, 0x00, 0x00, tpktLen,
                tpktLen - 5, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00
              ]),
              cookieBytes,
              Buffer.from([0x01, 0x00, 0x08, 0x00, 0x0b, 0x00, 0x00, 0x00])
            ]);
          }

          rdCleanPathPhase = 'waiting_x224_cc';
          debugLog(`📤 [Bridge] Conectando TCP a ${session.host}:${session.port}...`);

          targetSocket = net.connect({ host: session.host, port: session.port }, () => {
            targetSocket.setNoDelay(true);
            targetSocket.setKeepAlive(true, 15000);
            targetSocket.write(x224Cr);
          });

          targetSocket.once('data', (x224CcChunk) => {
            savedX224Cc = x224CcChunk;
            debugLog(`✅ [Bridge] Recibida X.224 Connection Confirm (${x224CcChunk.length} bytes). Iniciando TLS...`);

            // Upgrade TCP socket to TLS.
            // Para evadir el chequeo estricto de KEY_USAGE_BIT_INCORRECT en certificados
            // autofirmados de Windows RDP bajo BoringSSL/Electron, se usan ciphers RSA en TLS 1.2
            const tlsOptions = {
              socket: targetSocket,
              rejectUnauthorized: false,
              checkServerIdentity: () => undefined,
              minVersion: 'TLSv1',
              maxVersion: 'TLSv1.2',
              ciphers: 'ALL:DEFAULT:!ECDHE:!DHE:RSA'
            };

            let tlsEstablished = false;
            const onTlsHandshakeError = (err) => {
              if (tlsEstablished || isCleanedUp) return;
              console.error('❌ [RdpNativeBridgeService] Error en handshake TLS:', err.message);
              cleanup(`Error TLS Handshake: ${err.message}`, 4001);
            };

            tlsSocket = tls.connect(tlsOptions, () => {
              tlsEstablished = true;
              tlsSocket.removeListener('error', onTlsHandshakeError);
              tlsSocket.setNoDelay(true);
              tlsSocket.setKeepAlive(true, 15000);
              console.log(`🔒 [RdpNativeBridgeService] Conexión RDP TLS establecida con ${session.host}:${session.port}`);

              let peerCertChain = [];
              try {
                const cert = tlsSocket.getPeerCertificate(true);
                if (cert && cert.raw) {
                  peerCertChain.push(cert.raw);
                  debugLog(`📜 [Bridge] Certificado X.509 real obtenido (${cert.raw.length} bytes)`);
                }
              } catch (e) {
                console.warn('[Bridge] Error leyendo certificado peer:', e);
              }

              const nego = parseX224ConnectionConfirm(savedX224Cc);
              if (nego && nego.ok) {
                savedSelectedProtocol = nego.selectedProtocol;
                debugLog(`[Bridge] X.224 CC selectedProtocol=0x${nego.selectedProtocol.toString(16)} (${protocolName(nego.selectedProtocol)})`);
              } else if (nego && !nego.ok) {
                console.warn(`[Bridge] X.224 NEG_FAILURE code=${nego.failureCode}`);
              }

              const responsePdu = this.createRdCleanPathResponsePdu(session.host, savedX224Cc, peerCertChain);
              debugLog(`[Bridge] Enviando RDCleanPath Response PDU (${responsePdu.length} bytes) a WASM...`);

              if (ws.readyState === ws.OPEN) {
                try {
                  ws.send(responsePdu, { binary: true });
                } catch (sendErr) {
                  console.warn('[Bridge] Error enviando RDCleanPath Response:', sendErr.message);
                }
              }

              rdCleanPathPhase = 'transparent';

              tlsSocket.on('data', (chunk) => {
                const now = Date.now();
                const gapFromLastRdp = lastRdpFrameAt > 0 ? now - lastRdpFrameAt : 0;
                lastRdpFrameAt = now;

                const n = chunk.length;
                framesFromRdp += 1;
                const pduDesc = describeRdpPdu(chunk);

                if (framesFromRdp <= 24 && isDebug) {
                  console.log(`[Bridge] RDP->WASM frame#${framesFromRdp}: ${n}B | ${pduDesc}`);
                  if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                    try {
                      fs.writeFileSync(path.join(framesDir, `from-${String(framesFromRdp).padStart(2, '0')}-${n}b.hex`), chunk.toString('hex'), 'utf8');
                    } catch (_) { /* noop */ }
                  }
                } else if (gapFromLastRdp >= 400 && isDebug) {
                  console.log(`⏱️ [Bridge Trace GAP ${gapFromLastRdp}ms] Pausa RDP -> Frame #${framesFromRdp} (${n}B): ${pduDesc}`);
                  if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                    try {
                      fs.writeFileSync(path.join(framesDir, `gap-${gapFromLastRdp}ms-from-f${framesFromRdp}-${n}b.hex`), chunk.toString('hex'), 'utf8');
                    } catch (_) { /* noop */ }
                  }
                } else if (
                  isDebug && (
                    pduDesc.includes('DEMAND_ACTIVE') ||
                    pduDesc.includes('DEACTIVATE_ALL') ||
                    pduDesc.includes('AUTODETECT') ||
                    pduDesc.includes('HEARTBEAT') ||
                    pduDesc.includes('CONTROL') ||
                    pduDesc.includes('SAVE_SESSION_INFO') ||
                    pduDesc.includes('SET_ERROR_INFO') ||
                    pduDesc.includes('FRAME_ACK') ||
                    pduDesc.includes('SURFACE_CMDS')
                  )
                ) {
                  console.log(`📡 [Bridge Trace PDU #${framesFromRdp}] ${pduDesc}`);
                }

                // Wallix FontMap a veces trae mapFlags invalidos para IronRDP (from_bits).
                // Solo forzar FIRST|LAST; NO reclasificar a UPDATE (rompe FontMap con glifos).
                const fontPatch = patchFontSequenceFlags(chunk);
                if (fontPatch.candidates.length && isDebug) {
                  console.log(`[Bridge] FontPdu frame#${framesFromRdp}:`, fontPatch.candidates.map((c) => `len=${c.totalLength} type2=0x${c.type2.toString(16)} flags=0x${c.flags.toString(16)} entry=${c.entrySize}`).join('; '));
                }
                if (fontPatch.patchedCount) {
                  chunk = fontPatch.buf;
                  if (isDebug) {
                    console.log(`[Bridge] FontPdu adjust flags=${fontPatch.patchedCount}`, fontPatch.details.map((d) => `len=${d.totalLength} 0x${d.previous.toString(16)}->0x${d.next.toString(16)}`).join(', '));
                  }
                }

                // IronRDP 0.7: message channel (1001) no soportado -> no reenviar a WASM,
                // pero responder Auto-Detect RTT/BW para que Wallix no espere (pantalla negra).
                const wasReady = channelFilter.ready;
                const processed = processServerFrame(channelFilter, chunk);
                if (!wasReady && channelFilter.ready && isDebug) {
                  console.log(
                    `[Bridge] Canales MCS configurados: io=${channelFilter.ioChannelId}` +
                      ` permitidos=[${[...channelFilter.allowed].join(',')}]` +
                      (channelFilter.cliprdrChannelId != null ? ` cliprdr=${channelFilter.cliprdrChannelId}` : '') +
                      (channelFilter.drdynvcChannelId != null ? ` drdynvc=${channelFilter.drdynvcChannelId}` : '') +
                      (channelFilter.messageChannelId != null ? ` msg=${channelFilter.messageChannelId}` : '')
                  );
                }
                if (processed.dropped) {
                  if (isDebug) {
                    console.log(
                      `🚫 [Bridge Trace DROPPED #${framesFromRdp}] MCS ch=${processed.channelId}: ${processed.note}` +
                        (processed.replies.length ? ` (replies=${processed.replies.length})` : '') +
                        ` | PDU: ${pduDesc}`
                    );
                  }
                  if (processed.replies.length && tlsSocket && tlsSocket.writable) {
                    for (const reply of processed.replies) {
                      bytesToRdp += reply.length;
                      tlsSocket.write(reply);
                    }
                  }
                  bytesFromRdp += n;
                  return;
                }
                chunk = processed.forward;

                // Normalizar todas las teselas 16bpp a estándar 0xf3/0xf4 y <=64x64
                const stridePatch = fixWallixBitmapStrideCrop(chunk);
                const outChunks = stridePatch.patchedCount
                  ? (stridePatch.buffers || [stridePatch.buf])
                  : [chunk];
                if (stridePatch.patchedCount && isDebug) {
                  console.log(
                    `[Bridge] FastPath BITMAP normalizado frame#${framesFromRdp}: rects=${stridePatch.numberRectangles} patched=${stridePatch.patchedCount}` +
                      (stridePatch.solidCount != null ? ` solid=${stridePatch.solidCount} crop=${stridePatch.cropCount}` : '') +
                      (stridePatch.pduCount > 1 ? ` pdus=${stridePatch.pduCount}` : '')
                  );
                }

                bytesFromRdp += n;
                if (ws.readyState === ws.OPEN) {
                  try {
                    for (const out of outChunks) {
                      ws.send(out, { binary: true });
                    }
                  } catch (sendErr) {
                    console.warn('[Bridge] Error enviando frames a WebSocket:', sendErr.message);
                  }
                }
              });

              tlsSocket.on('end', () => {
                if (!isCleanedUp) {
                  cleanup('Cerrado por el servidor remoto (FIN)', 1000);
                }
              });

              tlsSocket.on('close', () => {
                if (!isCleanedUp) {
                  cleanup('Cerrado por el servidor remoto', 1000);
                }
              });

              tlsSocket.on('error', (err) => {
                if (!isCleanedUp) {
                  const isReset = err.message && (err.message.includes('ECONNRESET') || err.message.includes('EPIPE'));
                  if (isReset) {
                    console.log('ℹ️ [RdpNativeBridgeService] Conexión TLS restablecida por el host remoto o corte de red (ECONNRESET/EPIPE)');
                    cleanup('Conexión cortada por el servidor remoto o la red (posible inactividad)', 4002);
                  } else {
                    console.error('❌ [RdpNativeBridgeService] Error de conexión TLS:', err.message);
                    cleanup(`Error TLS: ${err.message}`, 4003);
                  }
                }
              });
            });

            tlsSocket.once('error', onTlsHandshakeError);
          });

          targetSocket.on('end', () => {
            if (!isCleanedUp && rdCleanPathPhase !== 'transparent') {
              cleanup('Conexión TCP finalizada por el servidor (FIN)', 1000);
            }
          });

          targetSocket.on('error', (err) => {
            if (!isCleanedUp) {
              const isBenign = err.message && (err.message.includes('ECONNRESET') || err.message.includes('EPIPE'));
              if (!isBenign) {
                console.error('❌ [RdpNativeBridgeService] Error TCP:', err.message);
              }
              cleanup(isBenign ? 'Conexión cortada por el servidor remoto o la red' : `Error TCP: ${err.message}`, 4004);
            }
          });

          targetSocket.on('close', () => {
            if (rdCleanPathPhase !== 'transparent' && !isCleanedUp) {
              cleanup('Conexión TCP cerrada antes de TLS', 4005);
            }
          });

          return;
        }

        // Primer frame post-TLS: MCS Connect Initial. Parches CS_CORE para bastiones TLS Direct.
        let forward = payload;
        if (rdCleanPathPhase === 'transparent') {
          const now = Date.now();
          const gapFromLastWs = lastWsFrameAt > 0 ? now - lastWsFrameAt : 0;
          lastWsFrameAt = now;

          framesToRdp += 1;
          learnClientInitiator(channelFilter, payload);
          const pduDesc = describeRdpPdu(payload);

          if (isDebug) {
            if (framesToRdp <= 24) {
              console.log(`[Bridge] WASM->RDP frame#${framesToRdp}: ${payload.length}B | ${pduDesc}`);
              if (process.env.NODETERM_RDP_RECORD_FRAMES === '1') {
                try {
                  fs.writeFileSync(path.join(framesDir, `to-${String(framesToRdp).padStart(2, '0')}-${payload.length}b.hex`), payload.toString('hex'), 'utf8');
                } catch (_) { /* noop */ }
              }
            } else if (gapFromLastWs >= 400) {
              console.log(`📤 [Bridge Trace WASM GAP ${gapFromLastWs}ms] WASM->RDP #${framesToRdp} (${payload.length}B): ${pduDesc}`);
            } else if (
              pduDesc.includes('CONFIRM_ACTIVE') ||
              pduDesc.includes('AUTODETECT') ||
              pduDesc.includes('CONTROL') ||
              pduDesc.includes('FONTLIST') ||
              pduDesc.includes('SYNCHRONIZE') ||
              pduDesc.includes('FRAME_ACK')
            ) {
              console.log(`📤 [Bridge Trace WASM PDU #${framesToRdp}] ${pduDesc}`);
            }
          }
        }
        if (bytesToRdp === 0 && rdCleanPathPhase === 'transparent') {
          const core = findClientCoreData(payload);
          if (isDebug) {
            console.log(`[Bridge] Primer frame WASM->RDP: ${payload.length} bytes; CS_CORE=${core ? `len=${core.length} serverSelectedProtocol=0x${(core.serverSelectedProtocol ?? -1).toString(16)}` : 'no'}`);
            try {
              const dumpPath = path.join(__dirname, '../../../testing/rdp/last-mcs-connect-initial.hex');
              fs.mkdirSync(path.dirname(dumpPath), { recursive: true });
              fs.writeFileSync(dumpPath, payload.toString('hex'), 'utf8');
              console.log(`[Bridge] Dump MCS en ${dumpPath}`);
            } catch (dumpErr) {
              console.warn('[Bridge] No se pudo escribir dump MCS:', dumpErr.message);
            }
          }

          const prepared = prepareMcsConnectInitial(payload, savedSelectedProtocol);
          forward = prepared.buf;
          if (isDebug) {
            console.log(`[Bridge] MCS prepare: ${prepared.notes.join('; ') || 'sin cambios'}`);
          }
        } else if (framesToRdp <= 10) {
          const infoResult = patchInfoPacket(forward, session);
          if (infoResult.patched) {
            forward = infoResult.buf;
            if (isDebug) {
              console.log(`[Bridge] TS_INFO_PACKET ajustado: ${infoResult.changes.join(', ')}`);
            }
          }
        }
        bytesToRdp += forward.length;
        if (tlsSocket && tlsSocket.writable) {
          tlsSocket.write(forward);
        } else if (targetSocket && targetSocket.writable) {
          targetSocket.write(forward);
        }
      } catch (e) {
        console.error('Error enviando datos a RDP:', e);
      }
    });

    ws.on('close', (code, reasonBuf) => {
      const reasonStr = reasonBuf ? reasonBuf.toString() : '';
      cleanup(reasonStr || 'Cerrado por el usuario', code || 1000);
    });
    ws.on('error', (e) => {
      const isBenign = e.message && (e.message.includes('ECONNRESET') || e.message.includes('closed'));
      cleanup(isBenign ? 'Cerrado por el usuario' : `Error WebSocket: ${e.message}`, 1006);
    });
  }

  /**
   * Extrae el campo x224_connection_pdu (tag context-specific EXPLICIT 6 = 0xa6) 
   * del RDCleanPath Request PDU codificado en ASN.1 DER.
   */
  extractX224FromRdCleanPath(pdu) {
    try {
      // Saltar la cabecera SEQUENCE (0x30 + longitud)
      let offset = 0;
      if (pdu[offset] !== 0x30) return null;
      offset++;

      // Leer longitud de la secuencia
      let seqLen;
      if (pdu[offset] & 0x80) {
        const numBytes = pdu[offset] & 0x7f;
        offset++;
        seqLen = 0;
        for (let i = 0; i < numBytes; i++) {
          seqLen = (seqLen << 8) | pdu[offset++];
        }
      } else {
        seqLen = pdu[offset++];
      }

      const seqEnd = offset + seqLen;

      // Iterar por los campos del SEQUENCE buscando tag 0xa6 (context-specific EXPLICIT 6)
      while (offset < seqEnd) {
        const tag = pdu[offset++];
        let fieldLen;
        if (pdu[offset] & 0x80) {
          const numBytes = pdu[offset] & 0x7f;
          offset++;
          fieldLen = 0;
          for (let i = 0; i < numBytes; i++) {
            fieldLen = (fieldLen << 8) | pdu[offset++];
          }
        } else {
          fieldLen = pdu[offset++];
        }

        if (tag === 0xa6) {
          // EXPLICIT tag: el contenido es un OctetString (0x04 + len + data)
          const innerTag = pdu[offset];
          if (innerTag === 0x04) {
            let innerOffset = offset + 1;
            let innerLen;
            if (pdu[innerOffset] & 0x80) {
              const numBytes = pdu[innerOffset] & 0x7f;
              innerOffset++;
              innerLen = 0;
              for (let i = 0; i < numBytes; i++) {
                innerLen = (innerLen << 8) | pdu[innerOffset++];
              }
            } else {
              innerLen = pdu[innerOffset++];
            }
            return pdu.subarray(innerOffset, innerOffset + innerLen);
          }
        }

        offset += fieldLen;
      }
      return null;
    } catch (e) {
      console.error('Error parseando RDCleanPath ASN.1:', e);
      return null;
    }
  }

  /**
   * Genera el RDCleanPath Response PDU en ASN.1 DER.
   * 
   * Estructura según ironrdp-rdcleanpath (EXPLICIT tag mode):
   *   SEQUENCE {
   *     [0] EXPLICIT INTEGER version (1),
   *     [6] EXPLICIT OCTET STRING x224_connection_pdu (X.224 CC del servidor),
   *     [7] EXPLICIT SEQUENCE OF OCTET STRING server_cert_chain (vacío),
   *     [9] EXPLICIT UTF8String server_addr ("host:port")
   *   }
   */
  createRdCleanPathResponsePdu(serverHost, x224ConnectionConfirm, peerCertChain = []) {
    const VERSION_1 = 3390; // BASE_VERSION(3389) + 1, como en ironrdp-rdcleanpath
    const serverAddrStr = `${serverHost}`;

    // [0] EXPLICIT: version = 3390
    const versionField = this.derExplicitTag(0, this.derInteger(VERSION_1));

    // [6] EXPLICIT: x224_connection_pdu = OctetString(X.224 CC)
    const x224Field = this.derExplicitTag(6, this.derOctetString(x224ConnectionConfirm));

    // [7] EXPLICIT: server_cert_chain = SEQUENCE OF OCTET STRING (con los certificados X.509 reales obtenidos del servidor RDP)
    let certChainSeqContent;
    if (Array.isArray(peerCertChain) && peerCertChain.length > 0) {
      certChainSeqContent = Buffer.concat(peerCertChain.map(cert => this.derOctetString(cert)));
    } else {
      const x509DerCert = this.getSelfSignedDerCert();
      certChainSeqContent = this.derOctetString(x509DerCert);
    }
    const certChainSeq = this.derSequence(certChainSeqContent);
    const certChainField = this.derExplicitTag(7, certChainSeq);

    // [9] EXPLICIT: server_addr
    const serverAddrField = this.derExplicitTag(9, this.derUtf8String(serverAddrStr));

    const seqContent = Buffer.concat([versionField, x224Field, certChainField, serverAddrField]);
    return this.derSequence(seqContent);
  }

  /**
   * Genera o retorna un certificado X.509 autofirmado codificado en ASN.1 DER válido usando node-forge
   */
  getSelfSignedDerCert() {
    if (this.cachedDerCert) {
      return this.cachedDerCert;
    }

    try {
      const forge = require('node-forge');
      const pki = forge.pki;
      const keys = pki.rsa.generateKeyPair(1024);
      const cert = pki.createCertificate();
      cert.publicKey = keys.publicKey;
      cert.serialNumber = '01';
      cert.validity.notBefore = new Date();
      cert.validity.notAfter = new Date();
      cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5);

      const attrs = [
        { name: 'commonName', value: 'NodeTerm RDP Proxy' },
        { name: 'organizationName', value: 'NodeTerm' }
      ];
      cert.setSubject(attrs);
      cert.setIssuer(attrs);
      cert.sign(keys.privateKey, forge.md.sha256.create());

      const derBytes = Buffer.from(forge.asn1.toDer(pki.certificateToAsn1(cert)).getBytes(), 'binary');
      this.cachedDerCert = derBytes;
      debugLog(`📜 [RdpNativeBridgeService] Certificado X.509 DER autofirmado generado (${derBytes.length} bytes)`);
      return derBytes;
    } catch (e) {
      console.error('❌ Error generando certificado X.509 DER autofirmado:', e);
      return Buffer.from([0x30, 0x82, 0x01, 0x00]);
    }
  }

  // === Helpers ASN.1 DER ===

  derSequence(content) {
    return Buffer.concat([Buffer.from([0x30]), this.derLength(content.length), content]);
  }

  derExplicitTag(tagNumber, content) {
    const tag = 0xa0 | tagNumber;
    return Buffer.concat([Buffer.from([tag]), this.derLength(content.length), content]);
  }

  derInteger(value) {
    if (value <= 0x7f) {
      return Buffer.from([0x02, 0x01, value]);
    } else if (value <= 0x7fff) {
      return Buffer.from([0x02, 0x02, (value >> 8) & 0xff, value & 0xff]);
    }
    // Para valores más grandes
    const bytes = [];
    let v = value;
    while (v > 0) { bytes.unshift(v & 0xff); v >>= 8; }
    if (bytes[0] & 0x80) bytes.unshift(0x00); // signo positivo
    return Buffer.from([0x02, bytes.length, ...bytes]);
  }

  derOctetString(data) {
    return Buffer.concat([Buffer.from([0x04]), this.derLength(data.length), data]);
  }

  derUtf8String(str) {
    const bytes = Buffer.from(str, 'utf8');
    return Buffer.concat([Buffer.from([0x0c]), this.derLength(bytes.length), bytes]);
  }

  derLength(len) {
    if (len < 0x80) {
      return Buffer.from([len]);
    } else if (len < 0x100) {
      return Buffer.from([0x81, len]);
    } else {
      return Buffer.from([0x82, (len >> 8) & 0xff, len & 0xff]);
    }
  }

  /**
   * Detiene el servicio y cierra conexiones
   */
  async stop() {
    for (const [id, conn] of this.activeConnections) {
      try { conn.ws?.close(); } catch (e) {}
      try { if (conn.tlsSocket) conn.tlsSocket.destroy(); } catch (e) {}
      try { if (conn.targetSocket) conn.targetSocket.destroy(); } catch (e) {}
    }
    this.activeConnections.clear();

    if (this.wss) {
      try { this.wss.close(); } catch (e) {}
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.isInitialized = false;
          console.log('🛑 [RdpNativeBridgeService] Servidor RDP Nativo detenido');
          resolve();
        });
      });
    }
  }
}

module.exports = new RdpNativeBridgeService();
