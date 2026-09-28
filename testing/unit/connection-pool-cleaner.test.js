const { describe, it } = require('node:test');
const assert = require('node:assert');
const cleaner = require('../../src/main/services/ConnectionPoolCleaner');

describe('ConnectionPoolCleaner', () => {
  it('start deja un solo intervalo y stop lo para', () => {
    try {
      cleaner.startOrphanCleanup({}, {});
      assert.strictEqual(cleaner.isCleanupActive(), true);
      cleaner.startOrphanCleanup({}, {});
      assert.strictEqual(cleaner.isCleanupActive(), true);
      cleaner.stopOrphanCleanup();
      assert.strictEqual(cleaner.isCleanupActive(), false);
    } finally {
      cleaner.stopOrphanCleanup();
    }
  });
});
