const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

// Mock localStorage and window in node environment if not present
if (typeof global.localStorage === 'undefined') {
  let store = {};
  global.localStorage = {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
}

if (typeof global.window === 'undefined') {
  global.window = {
    dispatchEvent() {},
    addEventListener() {},
    removeEventListener() {}
  };
}

const connectionStore = require('../../src/utils/connectionStore');
const {
  getFavorites,
  isFavorite,
  toggleFavorite,
  removeFavorite,
  addGroupToFavorites,
  invalidateConnectionStoreCache
} = connectionStore;

describe('connectionStore In-Memory O(1) Cache & Performance', () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateConnectionStoreCache();
  });

  it('isFavorite resuelve O(1) con Set en memoria tras cargar favoritos', () => {
    const conn1 = { type: 'ssh', host: '192.168.1.100', username: 'admin', port: 22 };
    const conn2 = { type: 'ssh', host: '10.0.0.50', username: 'root', port: 22 };

    toggleFavorite(conn1);

    // Debe detectar conn1 como favorito tanto pasando objeto como string ID
    assert.strictEqual(isFavorite(conn1), true);
    assert.strictEqual(isFavorite('ssh:192.168.1.100:admin:22'), true);

    // conn2 no debe ser favorito
    assert.strictEqual(isFavorite(conn2), false);
    assert.strictEqual(isFavorite('ssh:10.0.0.50:root:22'), false);
  });

  it('no invoca JSON.parse en cada consulta una vez que la cache esta poblada', () => {
    const conn = { type: 'ssh', host: 'srv1.local', username: 'ubuntu', port: 22 };
    toggleFavorite(conn);

    let getItemCount = 0;
    const originalGetItem = localStorage.getItem;
    localStorage.getItem = function (key) {
      getItemCount++;
      return originalGetItem.call(localStorage, key);
    };

    try {
      // Realizamos 100 comprobaciones consecutivas de favoritos
      for (let i = 0; i < 100; i++) {
        isFavorite('ssh:srv1.local:ubuntu:22');
      }

      // No debe haber tocado localStorage 100 veces
      assert.strictEqual(getItemCount, 0, 'La cache en memoria debio responder sin consultar localStorage');
    } finally {
      localStorage.getItem = originalGetItem;
    }
  });

  it('sincroniza la cache en mutaciones (toggleFavorite, removeFavorite, addGroupToFavorites)', () => {
    const conn = { type: 'ssh', host: 'srv2.local', username: 'kalid', port: 22 };
    toggleFavorite(conn);
    assert.strictEqual(isFavorite(conn), true);

    // Toggle para quitar
    toggleFavorite(conn);
    assert.strictEqual(isFavorite(conn), false);

    // Añadir grupo
    const group = { id: 'grp_prod', name: 'Producción', color: '#ff0000', sessions: [] };
    addGroupToFavorites(group);
    assert.strictEqual(isFavorite({ type: 'group', id: 'grp_prod' }), true);
  });

  it('invalidateConnectionStoreCache refresca desde localStorage si cambia externamente', () => {
    const conn = { type: 'ssh', host: 'srv3.local', username: 'root', port: 22 };
    toggleFavorite(conn);
    assert.strictEqual(isFavorite(conn), true);

    // Simulamos cambio externo en localStorage
    localStorage.setItem('nodeterm_favorite_connections', JSON.stringify([]));
    invalidateConnectionStoreCache();

    // Debe reflejar la eliminación
    assert.strictEqual(isFavorite(conn), false);
  });
});
