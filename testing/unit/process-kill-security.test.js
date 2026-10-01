const { describe, it } = require('node:test');
const assert = require('node:assert');
const { validateKillPid } = require('../../src/main/handlers/ssh-handlers');

describe('H-16: Process Kill Security Tests', () => {
  describe('validateKillPid - General PID Validation', () => {
    it('debe rechazar PIDs no numéricos o vacíos', () => {
      const invalidPids = [null, undefined, '', 'abc', 'kill -9', '123; rm -rf /', NaN];
      for (const pid of invalidPids) {
        const result = validateKillPid(pid, false);
        assert.strictEqual(result.valid, false, `PID "${pid}" debió ser rechazado`);
        assert.ok(result.error.includes('PID inválido'));
      }
    });

    it('debe rechazar PIDs negativos o 0 (que matarían process group)', () => {
      const negativePids = [0, -1, -500, '-100', '0'];
      for (const pid of negativePids) {
        const result = validateKillPid(pid, false);
        assert.strictEqual(result.valid, false, `PID "${pid}" debió ser rechazado`);
        assert.ok(result.error.includes('mayor que 0'));
      }
    });

    it('debe aceptar PIDs enteros positivos válidos', () => {
      const validPids = [1024, '2048', 99999];
      for (const pid of validPids) {
        const result = validateKillPid(pid, false);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(typeof result.pid, 'number');
        assert.strictEqual(result.pid, parseInt(pid, 10));
      }
    });
  });

  describe('validateKillPid - Local Process Protection', () => {
    it('debe denegar matar el propio proceso de NodeTerm (process.pid)', () => {
      const result = validateKillPid(process.pid, true);
      assert.strictEqual(result.valid, false);
      assert.ok(result.error.includes('propio proceso'));
    });

    it('debe denegar matar el proceso padre de NodeTerm (process.ppid)', () => {
      if (process.ppid) {
        const result = validateKillPid(process.ppid, true);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('proceso padre'));
      }
    });

    it('debe denegar matar procesos protegidos del sistema en Windows (PID 4)', () => {
      if (process.platform === 'win32') {
        const result = validateKillPid(4, true);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error.includes('procesos protegidos'));
      }
    });

    it('debe permitir matar un proceso local regular con PID válido', () => {
      // Usar un PID que no coincida con process.pid ni process.ppid ni 4
      const safeTestPid = 999999;
      const result = validateKillPid(safeTestPid, true);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.pid, safeTestPid);
    });
  });
});
