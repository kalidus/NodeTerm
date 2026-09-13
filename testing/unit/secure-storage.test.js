const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

// Simular entorno de navegador mínimo para testear la lógica de huella de SecureStorage
function setupBrowserMock(overrides = {}) {
  const defaultScreen = {
    width: 1920,
    height: 1080,
    ...overrides.screen
  };

  const defaultNavigator = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    language: 'es-ES',
    platform: 'Win32',
    hardwareConcurrency: 16,
    ...overrides.navigator
  };

  // Mock básico de canvas
  const canvasMock = {
    getContext: () => ({
      textBaseline: 'top',
      font: '14px Arial',
      fillText: () => {}
    }),
    toDataURL: () => 'data:image/png;base64,NodeTermCanvasFingerprintSimulation12345'
  };

  global.document = {
    createElement: (tag) => {
      if (tag === 'canvas') return canvasMock;
      return {};
    }
  };

  global.window = {
    crypto: globalThis.crypto
  };

  global.navigator = defaultNavigator;
  global.screen = defaultScreen;
  global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
  global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
}

// Algoritmo de huella estable implementado en SecureStorage
function generateStableFingerprint() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('NodeTerm Security', 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    navigator.platform || '',
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown'
  ].join('|');

  return btoa(fingerprint).slice(0, 32);
}

// Algoritmo legacy antiguo (dependiente de pantalla y zona horaria)
function generateLegacyFingerprint(tzOffset = 0) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.textBaseline = 'top';
  ctx.font = '14px Arial';
  ctx.fillText('NodeTerm Security', 2, 2);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    tzOffset,
    canvas.toDataURL(),
    navigator.hardwareConcurrency || 'unknown'
  ].join('|');

  return btoa(fingerprint).slice(0, 32);
}

describe('SecureStorage Fingerprint & Cryptography Unit Tests', () => {
  beforeEach(() => {
    setupBrowserMock();
  });

  describe('Estabilidad de la Huella Digital (Fix Fase 3)', () => {
    it('genera una huella de exactamente 32 caracteres', () => {
      const fp = generateStableFingerprint();
      assert.strictEqual(typeof fp, 'string');
      assert.strictEqual(fp.length, 32);
    });

    it('es invariante ante cambios de resolución o monitor externo conectado', () => {
      // Monitor 1: 1080p
      setupBrowserMock({ screen: { width: 1920, height: 1080 } });
      const fp1 = generateStableFingerprint();

      // Monitor 2: 4K (ej. monitor externo conectado en caliente)
      setupBrowserMock({ screen: { width: 3840, height: 2160 } });
      const fp2 = generateStableFingerprint();

      // Monitor 3: Pantalla vertical (rotada)
      setupBrowserMock({ screen: { width: 1080, height: 1920 } });
      const fp3 = generateStableFingerprint();

      // La huella estable NUNCA debe variar al cambiar el monitor
      assert.strictEqual(fp1, fp2);
      assert.strictEqual(fp2, fp3);
    });

    it('demuestra que la huella legacy sí fallaba ante cambios de monitor o zona horaria', () => {
      setupBrowserMock({ screen: { width: 1920, height: 1080 } });
      const legacy1080p = generateLegacyFingerprint(-120);

      setupBrowserMock({ screen: { width: 3840, height: 2160 } });
      const legacy4k = generateLegacyFingerprint(-120);

      // En la versión legacy, cambiar de pantalla bloqueaba al usuario
      assert.notStrictEqual(legacy1080p, legacy4k);

      // Cambiar de zona horaria (viaje o horario de verano) también rompía la clave legacy
      const legacyDst = generateLegacyFingerprint(-60);
      assert.notStrictEqual(legacy1080p, legacyDst);
    });
  });

  describe('Cifrado y Descifrado AES-GCM con PBKDF2', () => {
    async function deriveKey(password, salt) {
      const enc = new TextEncoder();
      const keyMaterial = await globalThis.crypto.subtle.importKey(
        'raw',
        enc.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
      );

      return globalThis.crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(salt),
          iterations: 10000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    }

    it('deriva claves AES-GCM de 256 bits y realiza ciclo completo cifrar/descifrar', async () => {
      const password = 'MasterPassword_2024_Sec!';
      const salt = 'nodeterm_salt_123';
      const plaintext = 'SecretServerPassword_#987';

      const key = await deriveKey(password, salt);
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();

      // Cifrar
      const ciphertext = await globalThis.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        enc.encode(plaintext)
      );

      // Descifrar
      const decrypted = await globalThis.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
      );

      const dec = new TextDecoder();
      assert.strictEqual(dec.decode(decrypted), plaintext);
    });

    it('falla el descifrado si la clave o el texto cifrado es alterado (integridad GCM)', async () => {
      const password = 'CorrectPassword';
      const wrongPassword = 'WrongPassword';
      const salt = 'salt_abc';
      const plaintext = 'SensitiveData';

      const correctKey = await deriveKey(password, salt);
      const wrongKey = await deriveKey(wrongPassword, salt);
      const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
      const enc = new TextEncoder();

      const ciphertext = await globalThis.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        correctKey,
        enc.encode(plaintext)
      );

      // Intentar descifrar con clave incorrecta debe rechazar con OperationError
      await assert.rejects(async () => {
        await globalThis.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          wrongKey,
          ciphertext
        );
      });
    });
  });
});
