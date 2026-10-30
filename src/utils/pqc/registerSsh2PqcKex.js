'use strict';

/**
 * Registra los algoritmos de intercambio de claves (KEX) Híbridos Post-Cuánticos
 * en ssh2 en tiempo de ejecución:
 *   - mlkem768x25519-sha256 (NIST FIPS 203 ML-KEM-768 + X25519, OpenSSH 9.9+)
 *   - sntrup761x25519-sha512@openssh.com (Streamlined NTRU Prime + X25519, OpenSSH 8.5+)
 *   - sntrup761x25519-sha512 (Alias estándar RFC/OpenSSH 9.9+)
 */

const fs = require('fs');
const Module = require('module');
const {
  createHash,
  createPublicKey,
  diffieHellman,
  generateKeyPairSync
} = require('crypto');

const mlkem768 = require('./mlkem768');
const sntrup761 = require('./sntrup761');

const PQC_KEX_ALGORITHMS = [
  'mlkem768x25519-sha256',
  'sntrup761x25519-sha512@openssh.com',
  'sntrup761x25519-sha512'
];

// Cabecera DER SubjectPublicKeyInfo fija de 12 bytes para claves públicas X25519 (OID 1.3.101.110)
const X25519_SPKI_PREFIX = Buffer.from('302a300506032b656e032100', 'hex');

let isRegistered = false;

function createPqcKexInstance(Curve25519Exchange, kexType, args) {
  const isMlKem = kexType === 'mlkem768x25519-sha256';
  const kemModule = isMlKem ? mlkem768 : sntrup761;
  const hashName = isMlKem ? 'sha256' : 'sha512';

  class HybridPqcExchange extends Curve25519Exchange {
    constructor(...ctorArgs) {
      super(hashName, ...ctorArgs);
      this.type = kexType;
      this.hashName = hashName;
      this._kemModule = kemModule;
      this._kemKeys = null;
      this._x25519Keys = null;
      this._combinedPubKey = null;
    }

    generateKeys() {
      if (this._protocol && this._protocol._server) {
        if (!this._x25519Keys) {
          this._x25519Keys = generateKeyPairSync('x25519');
        }
        return;
      }
      if (!this._kemKeys) {
        this._kemKeys = this._kemModule.keygen();
        this._x25519Keys = generateKeyPairSync('x25519');
        const x25519Pub = this._x25519Keys.publicKey
          .export({ type: 'spki', format: 'der' })
          .slice(-32);
        this._combinedPubKey = Buffer.concat([
          Buffer.from(this._kemKeys.publicKey.buffer, this._kemKeys.publicKey.byteOffset, this._kemKeys.publicKey.byteLength),
          x25519Pub
        ]);
      }
    }

    getPublicKey() {
      this.generateKeys();
      return this._combinedPubKey;
    }

    convertPublicKey(key) {
      if (!key) return key;
      return Buffer.isBuffer(key) ? key : Buffer.from(key);
    }

    computeSecret(otherPublicKey) {
      this.generateKeys();
      try {
        if (this._protocol && this._protocol._server) {
          const kemPubBytes = this._kemModule.PUBLIC_KEY_BYTES;
          const expectedClientLen = kemPubBytes + 32;
          if (!otherPublicKey || otherPublicKey.length !== expectedClientLen) {
            return new Error(
              `Invalid ${this.type} client init length: ${otherPublicKey ? otherPublicKey.length : 0} (expected ${expectedClientLen})`
            );
          }
          const clientKemPub = otherPublicKey.subarray(0, kemPubBytes);
          const clientX25519Pub = otherPublicKey.subarray(kemPubBytes, expectedClientLen);
          const { cipherText, sharedSecret: kemSharedSecret } = this._kemModule.encapsulate(clientKemPub);
          const serverX25519Pub = this._x25519Keys.publicKey
            .export({ type: 'spki', format: 'der' })
            .slice(-32);
          this._combinedPubKey = Buffer.concat([
            Buffer.from(cipherText.buffer, cipherText.byteOffset, cipherText.byteLength),
            serverX25519Pub
          ]);
          const peerSpki = Buffer.concat([X25519_SPKI_PREFIX, clientX25519Pub]);
          const ecdhSharedSecret = diffieHellman({
            privateKey: this._x25519Keys.privateKey,
            publicKey: createPublicKey({
              key: peerSpki,
              type: 'spki',
              format: 'der'
            })
          });
          const combinedSecret = createHash(this.hashName)
            .update(kemSharedSecret)
            .update(ecdhSharedSecret)
            .digest();
          kemSharedSecret.fill(0);
          ecdhSharedSecret.fill(0);
          return combinedSecret;
        }

        const kemCtBytes = this._kemModule.CIPHERTEXT_BYTES;
        const expectedLen = kemCtBytes + 32;
        if (!otherPublicKey || otherPublicKey.length !== expectedLen) {
          return new Error(
            `Invalid ${this.type} server reply length: ${otherPublicKey ? otherPublicKey.length : 0} (expected ${expectedLen})`
          );
        }

        const cipherText = otherPublicKey.subarray(0, kemCtBytes);
        const serverX25519Pub = otherPublicKey.subarray(kemCtBytes, expectedLen);

        // 1. Desencapsular secreto compartido post-cuántico (K_PQ)
        const kemSharedSecret = this._kemModule.decapsulate(
          cipherText,
          this._kemKeys.secretKey
        );

        // 2. Calcular secreto compartido clásico X25519 de 32 bytes en crudo (K_CL)
        const peerSpki = Buffer.concat([X25519_SPKI_PREFIX, serverX25519Pub]);
        const ecdhSharedSecret = diffieHellman({
          privateKey: this._x25519Keys.privateKey,
          publicKey: createPublicKey({
            key: peerSpki,
            type: 'spki',
            format: 'der'
          })
        });

        let nonZero = 0;
        for (let i = 0; i < ecdhSharedSecret.length; i++) {
          nonZero |= ecdhSharedSecret[i];
        }
        if (nonZero === 0) {
          return new Error('Invalid X25519 shared secret (all zeros)');
        }

        // 3. Combinar secretos según especificación OpenSSH:
        // K = Hash(K_PQ || K_CL) codificado como SSH string (longitud uint32 + digest).
        // KeyExchange.prototype.finish() en ssh2 ya antepone uint32 length a este Buffer.
        const combinedSecret = createHash(this.hashName)
          .update(kemSharedSecret)
          .update(ecdhSharedSecret)
          .digest();

        // Limpiar material efímero sensible
        if (this._kemKeys && this._kemKeys.secretKey) {
          this._kemKeys.secretKey.fill(0);
        }
        kemSharedSecret.fill(0);
        ecdhSharedSecret.fill(0);

        return combinedSecret;
      } catch (err) {
        return err instanceof Error ? err : new Error(String(err));
      }
    }
  }

  return new HybridPqcExchange(...args);
}

function registerSsh2PqcKex() {
  if (isRegistered) {
    return true;
  }

  try {
    global.__nodetermCreatePqcKex = createPqcKexInstance;

    const constantsPath = require.resolve('ssh2/lib/protocol/constants.js');
    const kexPath = require.resolve('ssh2/lib/protocol/kex.js');
    const handlersPath = require.resolve('ssh2/lib/protocol/handlers.js');
    const protocolPath = require.resolve('ssh2/lib/protocol/Protocol.js');
    const clientPath = require.resolve('ssh2/lib/client.js');
    const serverPath = require.resolve('ssh2/lib/server.js');
    const indexPath = require.resolve('ssh2/lib/index.js');

    const constants = require(constantsPath);

    // 1. Añadir algoritmos KEX post-cuánticos al principio de DEFAULT_KEX y SUPPORTED_KEX
    for (let i = PQC_KEX_ALGORITHMS.length - 1; i >= 0; i--) {
      const alg = PQC_KEX_ALGORITHMS[i];
      if (Array.isArray(constants.DEFAULT_KEX) && !constants.DEFAULT_KEX.includes(alg)) {
        constants.DEFAULT_KEX.unshift(alg);
      }
      if (Array.isArray(constants.SUPPORTED_KEX) && !constants.SUPPORTED_KEX.includes(alg)) {
        constants.SUPPORTED_KEX.unshift(alg);
      }
    }

    // 2. Priorizar cifradores de 256 bits (resistentes a Grover) en DEFAULT_CIPHER
    if (Array.isArray(constants.DEFAULT_CIPHER)) {
      const preferredOrder = [
        'aes256-gcm@openssh.com',
        'chacha20-poly1305@openssh.com',
        'aes256-ctr',
        'aes192-ctr',
        'aes128-gcm@openssh.com',
        'aes128-ctr'
      ];
      constants.DEFAULT_CIPHER.sort((a, b) => {
        const ia = preferredOrder.indexOf(a);
        const ib = preferredOrder.indexOf(b);
        return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
      });
    }

    // 3. Parchear en memoria kex.js para soportar los 3 KEX post-cuánticos en createKeyExchange
    const kexSource = fs.readFileSync(kexPath, 'utf8');
    const targetSwitch = "case 'curve25519-sha256':";
    if (kexSource.includes(targetSwitch)) {
      const patchedKexSource = kexSource.replace(
        targetSwitch,
        `case 'mlkem768x25519-sha256':
        case 'sntrup761x25519-sha512@openssh.com':
        case 'sntrup761x25519-sha512':
          if (typeof global.__nodetermCreatePqcKex === 'function')
            return global.__nodetermCreatePqcKex(Curve25519Exchange, kexType, args);
          break;
        case 'curve25519-sha256':`
      );

      const oldClient = require.cache[clientPath] ? require.cache[clientPath].exports : null;

      const kexModule = new Module(kexPath, module);
      kexModule.filename = kexPath;
      kexModule.paths = Module._nodeModulePaths(require('path').dirname(kexPath));
      kexModule._compile(patchedKexSource, kexPath);
      kexModule.loaded = true;
      require.cache[kexPath] = kexModule;

      // Si handlers, Protocol, client, server o index ya estaban cacheados, actualizarlos
      delete require.cache[handlersPath];
      delete require.cache[protocolPath];
      delete require.cache[clientPath];
      delete require.cache[serverPath];
      delete require.cache[indexPath];

      const newClient = require(clientPath);
      const newServer = require(serverPath);
      if (oldClient && oldClient.prototype && newClient && newClient.prototype) {
        oldClient.prototype.connect = newClient.prototype.connect;
      }
      require(indexPath).Client = newClient;
      require(indexPath).Server = newServer;
    }

    isRegistered = true;
    return true;
  } catch (err) {
    console.warn('⚠️ [PQC-SSH] No se pudo registrar KEX post-cuántico en ssh2:', err.message);
    return false;
  }
}

module.exports = {
  PQC_KEX_ALGORITHMS,
  registerSsh2PqcKex,
  createPqcKexInstance
};
