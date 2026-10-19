const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');

if (typeof global.localStorage === 'undefined') {
  let store = {};
  global.localStorage = {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; }
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
  recordRecent,
  getRecents,
  recordRecentPassword,
  getRecentPasswords,
  toggleFavorite,
  getFavorites,
  updateFavoriteFields,
  reorderFavorites,
  invalidateConnectionStoreCache,
  helpers
} = connectionStore;

describe('Historial/favoritos sin secretos en claro', () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateConnectionStoreCache();
  });

  it('toSerializable no persiste password ni privateKey de conexiones SSH', () => {
    const serial = helpers.toSerializable({
      type: 'ssh',
      host: '10.0.0.1',
      username: 'admin',
      port: 22,
      password: 'super-secret',
      privateKey: '-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----'
    });
    assert.strictEqual(serial.password, '');
    assert.strictEqual(serial.privateKey, '');
    assert.strictEqual(serial.host, '10.0.0.1');
    assert.strictEqual(serial.username, 'admin');
  });

  it('recordRecent no guarda credenciales en localStorage', () => {
    recordRecent({
      type: 'ssh',
      host: 'srv.local',
      username: 'ubuntu',
      port: 22,
      password: 'p@ss',
      privateKey: 'KEYDATA'
    });
    const stored = JSON.parse(localStorage.getItem('nodeterm_connection_history'));
    assert.ok(Array.isArray(stored) && stored.length === 1);
    assert.strictEqual(stored[0].password, '');
    assert.strictEqual(stored[0].privateKey, '');
    assert.strictEqual(getRecents(1)[0].password, '');
  });

  it('recordRecentPassword solo guarda metadatos del secreto', () => {
    recordRecentPassword({
      id: 'pwd_1',
      name: 'GitHub',
      username: 'user',
      password: 'token-secret',
      notes: 'do not store',
      type: 'password'
    });
    const recentPw = getRecentPasswords(1)[0];
    assert.strictEqual(recentPw.password, '');
    assert.strictEqual(recentPw.notes, '');
    assert.strictEqual(recentPw.name, 'GitHub');
    assert.strictEqual(recentPw.id, 'pwd_1');
  });

  it('migra listas antiguas borrando secretos ya persistidos', () => {
    localStorage.setItem('nodeterm_connection_history', JSON.stringify([{
      id: 'ssh:old:root:22',
      type: 'ssh',
      host: 'old',
      username: 'root',
      port: 22,
      password: 'legacy-secret',
      privateKey: 'LEGACYKEY'
    }]));
    invalidateConnectionStoreCache();
    const recents = getRecents();
    assert.strictEqual(recents[0].password, '');
    assert.strictEqual(recents[0].privateKey, '');
    const persisted = JSON.parse(localStorage.getItem('nodeterm_connection_history'));
    assert.strictEqual(persisted[0].password, '');
  });

  it('toggleFavorite no guarda password en favoritos', () => {
    toggleFavorite({
      type: 'ssh',
      host: 'fav.local',
      username: 'me',
      port: 22,
      password: 'fav-secret'
    });
    const fav = getFavorites()[0];
    assert.strictEqual(fav.password, '');
  });

  it('updateFavoriteFields no persiste password/notes/content', () => {
    toggleFavorite({
      type: 'password',
      id: 'pwd_fav_1',
      name: 'Bank',
      username: 'alice',
      password: ''
    });
    updateFavoriteFields('pwd_fav_1', {
      name: 'Bank updated',
      username: 'alice',
      password: 'should-not-persist',
      notes: 'secret-note',
      content: 'secret-content',
      jumpPassword: 'jump-secret'
    });
    const fav = getFavorites().find((f) => f.id === 'pwd_fav_1');
    assert.ok(fav);
    assert.strictEqual(fav.name, 'Bank updated');
    assert.strictEqual(fav.password, '');
    assert.strictEqual(fav.notes, '');
    assert.strictEqual(fav.content, '');
    assert.strictEqual(fav.jumpPassword, '');
    const persisted = JSON.parse(localStorage.getItem('nodeterm_favorite_connections'));
    const stored = persisted.find((f) => f.id === 'pwd_fav_1');
    assert.strictEqual(stored.password, '');
    assert.strictEqual(stored.notes, '');
  });

  it('reorderFavorites redacta secretos al guardar', () => {
    reorderFavorites([{
      id: 'ssh:reorder:me:22',
      type: 'ssh',
      host: 'reorder.local',
      username: 'me',
      port: 22,
      password: 'leak',
      jumpPrivateKey: 'JUMPKEY'
    }]);
    const fav = getFavorites()[0];
    assert.strictEqual(fav.password, '');
    assert.strictEqual(fav.jumpPrivateKey, '');
  });
});
