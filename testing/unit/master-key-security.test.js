const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { SYNC_KEYS } = require('../../src/main/utils/sync-keys');

describe('Master Key Security & Cryptographic Verifier Tests (Hallazgo 3.4)', () => {
  beforeEach(() => {
    // Configurar mock básico de SubtleCrypto
    global.window = {
      crypto: globalThis.crypto
    };
  });

  describe('SYNC_KEYS & Exclusion de app-data.json', () => {
    it('nodeterm_master_key NO debe estar presente en SYNC_KEYS', () => {
      assert.strictEqual(
        SYNC_KEYS.includes('nodeterm_master_key'),
        false,
        'nodeterm_master_key debe haber sido removido de SYNC_KEYS para evitar sincronización en texto plano'
      );
    });
  });

  describe('Criptografía de Verifier (PBKDF2 + AES-GCM)', () => {
    // Función de derivación idéntica a la implementada en SecureStorage
    async function deriveKey(password, salt, iterations = 100000) {
      const enc = new TextEncoder();
      const keyMaterial = await globalThis.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return await globalThis.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    async function createVaultVerifier(password) {
      const enc = new TextEncoder();
      const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));

      const key = await deriveKey(password, salt);
      const payload = JSON.stringify({ check: 'nodeterm-vault-ok', v: 2, timestamp: Date.now() });

      const encrypted = await globalThis.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        enc.encode(payload)
      );

      return {
        salt: Array.from(salt),
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
        timestamp: Date.now()
      };
    }

    async function verifyVaultVerifier(verifier, password) {
      if (!verifier || !verifier.salt || !verifier.iv || !verifier.data) {
        return false;
      }
      try {
        const dec = new TextDecoder();
        const salt = new Uint8Array(verifier.salt);
        const iv = new Uint8Array(verifier.iv);
        const data = new Uint8Array(verifier.data);

        const key = await deriveKey(password, salt);
        const decrypted = await globalThis.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          data
        );

        const parsed = JSON.parse(dec.decode(decrypted));
        return parsed && parsed.check === 'nodeterm-vault-ok';
      } catch (_) {
        return false;
      }
    }

    it('genera un verifier con salt aleatoria de 16 bytes y IV de 12 bytes', async () => {
      const verifier1 = await createVaultVerifier('MiSuperClaveSegura123!');
      const verifier2 = await createVaultVerifier('MiSuperClaveSegura123!');

      assert.strictEqual(verifier1.salt.length, 16);
      assert.strictEqual(verifier1.iv.length, 12);
      assert.ok(verifier1.data.length > 0);

      // Dos verifiers de la misma clave deben tener salts distintas (no deterministas)
      assert.notDeepStrictEqual(verifier1.salt, verifier2.salt);
      assert.notDeepStrictEqual(verifier1.iv, verifier2.iv);
    });

    it('valida exitosamente la contraseña correcta contra el verifier', async () => {
      const password = 'Password_Robusto_2026!';
      const verifier = await createVaultVerifier(password);

      const isValid = await verifyVaultVerifier(verifier, password);
      assert.strictEqual(isValid, true, 'La contraseña correcta debe validar como true');
    });

    it('rechaza contraseñas incorrectas sin filtrar información', async () => {
      const password = 'Password_Robusto_2026!';
      const verifier = await createVaultVerifier(password);

      const isValidWrong = await verifyVaultVerifier(verifier, 'Password_Incorrecto_999');
      assert.strictEqual(isValidWrong, false, 'Contraseña incorrecta debe retornar false');

      const isValidEmpty = await verifyVaultVerifier(verifier, '');
      assert.strictEqual(isValidEmpty, false, 'Contraseña vacía debe retornar false');
    });

    it('falla si los datos del verifier han sido manipulados o corruptos', async () => {
      const password = 'Password_Robusto_2026!';
      const verifier = await createVaultVerifier(password);

      // Corromper 1 byte de data
      verifier.data[0] ^= 0xff;
      const isValid = await verifyVaultVerifier(verifier, password);
      assert.strictEqual(isValid, false, 'Verifier con datos alterados debe fallar');
    });
  });

  describe('Permisos de Fichero 0o600 en Security y AppData', () => {
    it('comprueba que security-handlers.js y appdata-handlers.js especifican mode: 0o600', () => {
      const secHandlers = fs.readFileSync(
        path.join(__dirname, '../../src/main/handlers/security-handlers.js'),
        'utf8'
      );
      assert.ok(
        secHandlers.includes('0o600'),
        'security-handlers.js debe especificar modo de permisos 0o600'
      );

      const appDataHandlers = fs.readFileSync(
        path.join(__dirname, '../../src/main/handlers/appdata-handlers.js'),
        'utf8'
      );
      assert.ok(
        appDataHandlers.includes('0o600'),
        'appdata-handlers.js debe especificar modo de permisos 0o600'
      );
    });
  });
});
