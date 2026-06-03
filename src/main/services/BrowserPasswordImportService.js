/**
 * Importación directa de contraseñas desde perfiles de navegador (Windows).
 * Chromium: Login Data + Local State (DPAPI + AES-GCM v10/v11).
 * Firefox: key4.db + logins.json (sin NSS; lógica inspirada en firepwd).
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const IS_WIN = process.platform === 'win32';

let Database = null;
let Dpapi = null;
let isDpapiSupported = false;
let forge = null;

function loadNativeDeps() {
  if (!IS_WIN) return;
  try {
    Database = require('better-sqlite3');
  } catch (e) {
    console.warn('[BrowserPasswordImport] better-sqlite3 no disponible:', e.message);
  }
  try {
    const dpapiMod = require('@primno/dpapi');
    Dpapi = dpapiMod.Dpapi || dpapiMod.default;
    isDpapiSupported =
      dpapiMod.isPlatformSupported === true &&
      Dpapi &&
      typeof Dpapi.unprotectData === 'function';
    if (!isDpapiSupported) {
      console.warn('[BrowserPasswordImport] @primno/dpapi: plataforma o binario no soportado en este runtime');
    }
  } catch (e) {
    console.warn('[BrowserPasswordImport] @primno/dpapi no disponible:', e.message);
  }
  try {
    forge = require('node-forge');
  } catch (e) {
    console.warn('[BrowserPasswordImport] node-forge no disponible:', e.message);
  }
}

loadNativeDeps();

const CHROMIUM_BROWSERS = [
  { id: 'chrome', label: 'Google Chrome', folder: ['Google', 'Chrome', 'User Data'] },
  { id: 'edge', label: 'Microsoft Edge', folder: ['Microsoft', 'Edge', 'User Data'] },
  { id: 'brave', label: 'Brave', folder: ['BraveSoftware', 'Brave-Browser', 'User Data'] }
];

const SKIP_ABE = 'app_bound_encryption';
const SKIP_EMPTY = 'empty_or_unknown';
const SKIP_DECRYPT = 'decrypt_failed';

function getLocalAppData() {
  return process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
}

function getAppDataRoaming() {
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

function safeExists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function copyToTemp(srcPath, prefix) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const dest = path.join(tmpDir, path.basename(srcPath));
  fs.copyFileSync(srcPath, dest);
  return { tmpDir, dest };
}

function cleanupTemp(tmpDir) {
  if (!tmpDir) return;
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

function dpapiUnprotect(buffer) {
  if (!isDpapiSupported || !Dpapi) {
    throw new Error('DPAPI no disponible en este sistema (requiere Windows y módulo nativo)');
  }
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  const out = Dpapi.unprotectData(input, null, 'CurrentUser');
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}

function getChromiumMasterKey(localStatePath) {
  const raw = fs.readFileSync(localStatePath, 'utf8');
  const state = JSON.parse(raw);
  const encKeyB64 = state?.os_crypt?.encrypted_key;
  if (!encKeyB64) {
    throw new Error('No se encontró os_crypt.encrypted_key en Local State');
  }
  let encKey = Buffer.from(encKeyB64, 'base64');
  const prefix = encKey.slice(0, 5).toString('utf8');
  if (prefix === 'DPAPI') {
    encKey = encKey.slice(5);
  }
  const decrypted = dpapiUnprotect(encKey);
  return decrypted;
}

function decryptChromiumValue(encrypted, masterKey) {
  if (!encrypted || encrypted.length === 0) return { value: '', skipped: null };
  const buf = Buffer.isBuffer(encrypted) ? encrypted : Buffer.from(encrypted);
  const version = buf.slice(0, 3).toString('utf8');

  if (version === 'v20') {
    return { value: null, skipped: SKIP_ABE };
  }

  if (version === 'v10' || version === 'v11') {
    if (!masterKey || masterKey.length === 0) {
      return { value: null, skipped: SKIP_DECRYPT };
    }
    try {
      const iv = buf.slice(3, 15);
      const payload = buf.slice(15);
      const tag = payload.slice(-16);
      const ciphertext = payload.slice(0, -16);
      const decipher = crypto.createDecipheriv('aes-256-gcm', masterKey, iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return { value: plain.toString('utf8'), skipped: null };
    } catch {
      return { value: null, skipped: SKIP_DECRYPT };
    }
  }

  // Legacy: DPAPI directo sobre el blob
  if (IS_WIN && isDpapiSupported) {
    try {
      const plain = dpapiUnprotect(buf);
      return { value: plain.toString('utf8'), skipped: null };
    } catch {
      return { value: null, skipped: SKIP_DECRYPT };
    }
  }

  return { value: null, skipped: SKIP_EMPTY };
}

function listChromiumProfiles(userDataPath, browserId, browserLabel) {
  const profiles = [];
  if (!safeExists(userDataPath)) return profiles;

  const localStatePath = path.join(userDataPath, 'Local State');
  let profileNames = {};

  if (safeExists(localStatePath)) {
    try {
      const state = JSON.parse(fs.readFileSync(localStatePath, 'utf8'));
      profileNames = state?.profile?.info_cache || {};
    } catch {
      /* ignore */
    }
  }

  const entries = fs.readdirSync(userDataPath, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    if (name === 'System Profile' || name === 'Guest Profile' || name === 'Crashpad') continue;
    const loginData = path.join(userDataPath, name, 'Login Data');
    if (!safeExists(loginData)) continue;
    const displayName = profileNames[name]?.name || name;
    profiles.push({
      type: 'chromium',
      browserId,
      browserLabel,
      profileDir: name,
      profileLabel: displayName,
      userDataPath,
      profilePath: path.join(userDataPath, name),
      id: `${browserId}:${name}`
    });
  }

  return profiles;
}

function parseFirefoxProfilesIni(firefoxDir) {
  const iniPath = path.join(firefoxDir, 'profiles.ini');
  if (!safeExists(iniPath)) return [];

  const content = fs.readFileSync(iniPath, 'utf8');
  const profiles = [];
  let current = null;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;
    const section = trimmed.match(/^\[(.+)\]$/);
    if (section) {
      if (current?.Path) profiles.push(current);
      current = { section: section[1] };
      continue;
    }
    const kv = trimmed.match(/^([^=]+)=(.*)$/);
    if (kv && current) {
      current[kv[1]] = kv[2];
    }
  }
  if (current?.Path) profiles.push(current);

  return profiles
    .filter((p) => p.Path)
    .map((p) => {
      const rel = String(p.IsRelative) === '1';
      const profilePath = rel ? path.join(firefoxDir, p.Path) : p.Path;
      return {
        type: 'firefox',
        browserId: 'firefox',
        browserLabel: 'Mozilla Firefox',
        profileDir: path.basename(profilePath),
        profileLabel: p.Name || path.basename(profilePath),
        profilePath,
        id: `firefox:${p.Path}`
      };
    })
    .filter((p) => safeExists(path.join(p.profilePath, 'logins.json')));
}

function assertPathUnderAllowed(resolved, allowedRoots) {
  const norm = path.resolve(resolved);
  for (const root of allowedRoots) {
    const rootNorm = path.resolve(root);
    if (norm === rootNorm || norm.startsWith(rootNorm + path.sep)) {
      return norm;
    }
  }
  throw new Error('Ruta de perfil no permitida');
}

function getAllowedRoots() {
  const local = getLocalAppData();
  const roaming = getAppDataRoaming();
  return [
    path.join(local, 'Google', 'Chrome', 'User Data'),
    path.join(local, 'Microsoft', 'Edge', 'User Data'),
    path.join(local, 'BraveSoftware', 'Brave-Browser', 'User Data'),
    path.join(roaming, 'Mozilla', 'Firefox')
  ];
}

// --- Firefox ASN.1 / crypto (node-forge) ---

function forgeBufferToBytes(buf) {
  if (Buffer.isBuffer(buf)) return buf.toString('binary');
  if (typeof buf === 'string') return buf;
  return Buffer.from(buf).toString('binary');
}


function getAsn1Octet(asn1, path) {
  let node = asn1;
  for (const idx of path) {
    if (!node?.value || !node.value[idx]) return null;
    node = node.value[idx];
  }
  if (node.type === forge.asn1.Type.OCTETSTRING) {
    return Buffer.from(node.value, 'binary');
  }
  return null;
}

function decryptFirefoxPbe(globalSalt, masterPassword, entrySalt, encrypted, oid) {
  if (!forge) throw new Error('node-forge no disponible');
  const mp = masterPassword ? String(masterPassword) : '';
  const hp = forge.md.sha1.create();
  hp.update(globalSalt);
  hp.update(mp);
  const hpBytes = hp.digest().getBytes();

  const pes = entrySalt + '\x00\x00\x00\x01';
  const chp = forge.md.sha1.create();
  chp.update(hpBytes);
  chp.update(entrySalt);
  const k1 = chp.digest().getBytes();

  const tk = forge.md.sha1.create();
  tk.update(k1);
  tk.update(pes);
  const k2 = tk.digest().getBytes();

  const k = k1 + k2;
  const key = k.substring(0, 24);
  const iv = k.substring(24, 32);

  const encBytes = forgeBufferToBytes(encrypted);
  const isAes = oid && String(oid).includes('2.16.840.1.101.3.4.1.42');

  if (isAes) {
    const decipher = forge.cipher.createDecipher('AES-CBC', key.substring(0, 32));
    decipher.start({ iv });
    decipher.update(forge.util.createBuffer(encBytes));
    if (!decipher.finish()) throw new Error('AES decrypt failed');
    return Buffer.from(decipher.output.getBytes(), 'binary');
  }

  const decipher = forge.cipher.createDecipher('3DES-CBC', key);
  decipher.start({ iv });
  decipher.update(forge.util.createBuffer(encBytes));
  if (!decipher.finish()) throw new Error('3DES decrypt failed');
  return Buffer.from(decipher.output.getBytes(), 'binary');
}

function getFirefoxMasterKey(key4Path, masterPassword) {
  if (!Database) throw new Error('better-sqlite3 no disponible');
  const db = new Database(key4Path, { readonly: true, fileMustExist: true });
  try {
    const meta = db.prepare("SELECT item1, item2 FROM metadata WHERE id = 'password'").get();
    if (!meta) throw new Error('metadata password no encontrada en key4.db');

    const globalSalt = meta.item1;
    const item2 = meta.item2;

    const mp = masterPassword ? String(masterPassword) : '';

    if (mp) {
      const hp = forge.md.sha1.create();
      hp.update(globalSalt);
      hp.update(mp);
      const hpBytes = hp.digest().getBytes();
      const pes = Buffer.alloc(1);
      pes.writeUInt8(1, 0);
      const chp = forge.md.sha1.create();
      chp.update(hpBytes);
      chp.update(globalSalt);
      const k1 = chp.digest().getBytes();
      const tk = forge.md.sha1.create();
      tk.update(k1);
      tk.update(forge.util.createBuffer(pes.toString('binary')).getBytes());
      const k2 = tk.digest().getBytes();
      const k = k1 + k2;
      const key = k.substring(0, 24);
      const iv = k.substring(24, 32);
      const item2Buf = Buffer.isBuffer(item2) ? item2 : Buffer.from(item2);
      const asn1Check = forge.asn1.fromDer(item2Buf.toString('binary'));
      const entrySalt = getAsn1Octet(asn1Check, [0, 1, 0]);
      const cipherT = getAsn1Octet(asn1Check, [0, 2]);
      if (!entrySalt || !cipherT) throw new Error('password-check ASN.1 inválido');
      decryptFirefoxPbe(globalSalt, mp, entrySalt.toString('binary'), cipherT, '3DES');
    } else {
      const item2Buf = Buffer.isBuffer(item2) ? item2 : Buffer.from(item2);
      try {
        const asn1Check = forge.asn1.fromDer(item2Buf.toString('binary'));
        const entrySalt = getAsn1Octet(asn1Check, [0, 1, 0]);
        const cipherT = getAsn1Octet(asn1Check, [0, 2]);
        if (entrySalt && cipherT) {
          decryptFirefoxPbe(globalSalt, '', entrySalt.toString('binary'), cipherT, '3DES');
        }
      } catch {
        throw new Error('Este perfil de Firefox requiere contraseña maestra');
      }
    }

    const row = db.prepare('SELECT a11 FROM nssPrivate LIMIT 1').get();
    if (!row?.a11) throw new Error('nssPrivate vacío en key4.db');

    const a11 = Buffer.isBuffer(row.a11) ? row.a11 : Buffer.from(row.a11);
    const asn1 = forge.asn1.fromDer(a11.toString('binary'));
    const entrySalt = getAsn1Octet(asn1, [0, 0, 1, 0]);
    const cipherT = getAsn1Octet(asn1, [0, 1]);
    let oid = null;
    try {
      oid = asn1.value[0].value[0].value[0].value;
    } catch {
      oid = '3DES';
    }
    if (!entrySalt || !cipherT) throw new Error('Clave privada ASN.1 inválida');

    const clearKey = decryptFirefoxPbe(
      globalSalt,
      mp,
      entrySalt.toString('binary'),
      cipherT,
      oid
    );
    return clearKey;
  } finally {
    db.close();
  }
}

function decryptFirefoxLoginField(masterKey, encryptedB64) {
  if (!encryptedB64) return '';
  try {
    const decoded = Buffer.from(encryptedB64, 'base64');
    const asn1 = forge.asn1.fromDer(decoded.toString('binary'));
    if (!asn1?.value || asn1.value.length < 3) return '';

    const iv = Buffer.from(asn1.value[1].value, 'binary');
    const ciphertext = Buffer.from(asn1.value[2].value, 'binary');
    const key24 = masterKey.slice(0, 24);

    const decipher = forge.cipher.createDecipher('3DES-CBC', key24);
    decipher.start({ iv: iv.toString('binary') });
    decipher.update(forge.util.createBuffer(ciphertext.toString('binary')));
    if (!decipher.finish()) return '';

    let out = Buffer.from(decipher.output.getBytes(), 'binary');
    const pad = out[out.length - 1];
    if (pad > 0 && pad <= 8) out = out.slice(0, out.length - pad);
    return out.toString('utf8');
  } catch {
    return '';
  }
}

class BrowserPasswordImportService {
  static listProfiles() {
    if (!IS_WIN) {
      return { ok: true, profiles: [], platformUnsupported: true };
    }

    const profiles = [];
    const local = getLocalAppData();

    for (const browser of CHROMIUM_BROWSERS) {
      const userDataPath = path.join(local, ...browser.folder);
      profiles.push(...listChromiumProfiles(userDataPath, browser.id, browser.label));
    }

    const firefoxDir = path.join(getAppDataRoaming(), 'Mozilla', 'Firefox');
    profiles.push(...parseFirefoxProfilesIni(firefoxDir));

    return { ok: true, profiles };
  }

  static importChromiumProfile({ browserId, userDataPath, profileDir }) {
    if (!IS_WIN) {
      return { ok: false, error: 'La importación directa solo está disponible en Windows' };
    }
    if (!Database || !isDpapiSupported) {
      return {
        ok: false,
        error: 'better-sqlite3 no está compilado para Electron. Cierra la app y ejecuta: npm run rebuild:native'
      };
    }

    const allowed = getAllowedRoots();
    const profilePath = assertPathUnderAllowed(path.join(userDataPath, profileDir), allowed);
    const userDataResolved = path.dirname(profilePath);
    assertPathUnderAllowed(userDataResolved, allowed);

    const loginDataPath = path.join(profilePath, 'Login Data');
    const localStatePath = path.join(userDataResolved, 'Local State');

    if (!safeExists(loginDataPath)) {
      return { ok: false, error: 'No se encontró Login Data en el perfil' };
    }
    if (!safeExists(localStatePath)) {
      return { ok: false, error: 'No se encontró Local State' };
    }

    let tmpDir = null;
    try {
      let masterKey;
      try {
        masterKey = getChromiumMasterKey(localStatePath);
      } catch (e) {
        return { ok: false, error: `No se pudo obtener la clave maestra: ${e.message}` };
      }

      const copied = copyToTemp(loginDataPath, 'nodeterm-chrome-');
      tmpDir = copied.tmpDir;

      const db = new Database(copied.dest, { readonly: true, fileMustExist: true });
      const rows = db.prepare(
        'SELECT origin_url, username_value, password_value, date_created FROM logins WHERE password_value IS NOT NULL'
      ).all();
      db.close();

      const entries = [];
      const stats = { imported: 0, skipped: 0, skippedAbe: 0, skippedDecrypt: 0, skippedEmpty: 0 };

      for (const row of rows) {
        const url = row.origin_url || '';
        const username = row.username_value || '';
        const pwdBuf = row.password_value;
        const { value: password, skipped } = decryptChromiumValue(pwdBuf, masterKey);

        if (skipped === SKIP_ABE) {
          stats.skipped++;
          stats.skippedAbe++;
          continue;
        }
        if (skipped || password === null) {
          stats.skipped++;
          if (skipped === SKIP_DECRYPT) stats.skippedDecrypt++;
          else stats.skippedEmpty++;
          continue;
        }

        let title = url;
        try {
          if (url) title = new URL(url).hostname || url;
        } catch {
          title = url || username || '(Sin título)';
        }

        entries.push({ url, username, password, title, notes: '' });
        stats.imported++;
      }

      return {
        ok: true,
        entries,
        stats: {
          imported: stats.imported,
          skipped: stats.skipped,
          skippedAbe: stats.skippedAbe,
          skippedDecrypt: stats.skippedDecrypt,
          skippedEmpty: stats.skippedEmpty
        }
      };
    } catch (e) {
      const msg = e?.message || String(e);
      if (/EBUSY|EPERM|locked|database is locked/i.test(msg)) {
        return {
          ok: false,
          error: 'No se pudo leer Login Data. Cierra el navegador e inténtalo de nuevo.'
        };
      }
      return { ok: false, error: msg };
    } finally {
      cleanupTemp(tmpDir);
    }
  }

  static importFirefoxProfile({ profilePath, masterPassword }) {
    if (!IS_WIN) {
      return { ok: false, error: 'La importación directa solo está disponible en Windows' };
    }
    if (!Database || !forge) {
      return { ok: false, error: 'Dependencias no instaladas (better-sqlite3, node-forge)' };
    }

    const allowed = [path.join(getAppDataRoaming(), 'Mozilla', 'Firefox')];
    const profileResolved = assertPathUnderAllowed(profilePath, allowed);

    const key4Path = path.join(profileResolved, 'key4.db');
    const loginsPath = path.join(profileResolved, 'logins.json');

    if (!safeExists(loginsPath)) {
      return { ok: false, error: 'No se encontró logins.json' };
    }
    if (!safeExists(key4Path)) {
      return { ok: false, error: 'No se encontró key4.db (Firefox 58+ requerido)' };
    }

    let tmpDir = null;
    try {
      const copied = copyToTemp(key4Path, 'nodeterm-ff-');
      tmpDir = copied.tmpDir;

      let masterKey;
      try {
        masterKey = getFirefoxMasterKey(copied.dest, masterPassword || '');
      } catch (e) {
        const msg = e?.message || String(e);
        if (/contraseña maestra|master/i.test(msg)) {
          return { ok: false, error: msg, needsMasterPassword: true };
        }
        return { ok: false, error: `No se pudo descifrar key4.db: ${msg}` };
      }

      const loginsJson = JSON.parse(fs.readFileSync(loginsPath, 'utf8'));
      const logins = loginsJson.logins || [];

      const entries = [];
      const stats = { imported: 0, skipped: 0 };

      for (const login of logins) {
        try {
          const url = login.hostname || '';
          let username = '';
          let password = '';

          if (login.encryptedUsername) {
            username = decryptFirefoxLoginField(masterKey, login.encryptedUsername);
          } else if (login.username) {
            username = login.username;
          }

          if (login.encryptedPassword) {
            password = decryptFirefoxLoginField(masterKey, login.encryptedPassword);
          } else if (login.password) {
            password = login.password;
          }

          if (!password && !username && !url) {
            stats.skipped++;
            continue;
          }

          let title = url;
          try {
            if (url) title = new URL(`https://${url.replace(/^https?:\/\//, '')}`).hostname || url;
          } catch {
            title = url || username;
          }

          entries.push({
            url: url.startsWith('http') ? url : (url ? `https://${url}` : ''),
            username,
            password,
            title,
            notes: ''
          });
          stats.imported++;
        } catch {
          stats.skipped++;
        }
      }

      return {
        ok: true,
        entries,
        stats: { imported: stats.imported, skipped: stats.skipped, skippedAbe: 0 }
      };
    } catch (e) {
      return { ok: false, error: e?.message || String(e) };
    } finally {
      cleanupTemp(tmpDir);
    }
  }
}

module.exports = BrowserPasswordImportService;
