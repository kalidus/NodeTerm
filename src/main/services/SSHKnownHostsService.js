const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class SSHKnownHostsService {
  constructor() {
    this.filePath = null;
    this.entries = new Map();
    this.loaded = false;
  }

  setUserDataPath(userDataPath) {
    this.filePath = path.join(userDataPath, 'ssh', 'known_hosts');
    this.loaded = false;
    this.entries.clear();
  }

  ensureFilePath() {
    if (!this.filePath) {
      throw new Error('SSHKnownHostsService no inicializado con userData');
    }
  }

  async ensureLoaded() {
    this.ensureFilePath();
    if (this.loaded) {
      return;
    }

    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const content = await fs.promises.readFile(this.filePath, 'utf8');
      const before = content;
      this.parseContent(content);
      const after = this.serializeKnownHostsContent();
      if (after !== before.replace(/\r\n/g, '\n')) {
        await fs.promises.writeFile(this.filePath, after, 'utf8');
      }
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    this.loaded = true;
  }

  getHostAliases(host, port = 22) {
    const normalizedPort = Number(port) || 22;
    const aliases = new Set([
      `${host}:${normalizedPort}`,
      `[${host}]:${normalizedPort}`,
      host
    ]);

    if (host === '127.0.0.1') {
      aliases.add('localhost');
      aliases.add(`localhost:${normalizedPort}`);
      aliases.add(`[localhost]:${normalizedPort}`);
    }

    return aliases;
  }

  parseContent(content) {
    this.entries.clear();

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) {
        continue;
      }

      const parts = line.split(/\s+/);
      if (parts.length < 3) {
        continue;
      }

      const [hostsPart, keyType, keyData] = parts;
      if (!this.isValidStoredKeyData(keyType, keyData)) {
        continue;
      }

      const fingerprint = this.fingerprintFromStored(keyType, keyData);
      if (!fingerprint) {
        continue;
      }

      for (const alias of hostsPart.split(',')) {
        const hostAlias = alias.trim();
        if (!hostAlias) {
          continue;
        }

        const canonical = this.toCanonicalHostLabel(hostAlias);
        const match = canonical && canonical.match(/^\[([^\]]+)\]:(\d+)$/);
        if (match) {
          this.rememberHostEntry(match[1], match[2], keyType, keyData, fingerprint);
        } else {
          this.entries.set(hostAlias, { keyType, keyData, fingerprint });
        }
      }
    }
  }

  decodeStoredKeyData(keyData) {
    try {
      return Buffer.from(keyData, 'base64');
    } catch (error) {
      return null;
    }
  }

  isValidHostKeyBlob(keyBuffer) {
    if (!keyBuffer || keyBuffer.length < 40) {
      return false;
    }

    try {
      const typeLen = keyBuffer.readUInt32BE(0);
      if (typeLen < 4 || typeLen > 64 || 4 + typeLen > keyBuffer.length) {
        return false;
      }

      const keyType = keyBuffer.toString('utf8', 4, 4 + typeLen);
      const validTypes = new Set([
        'ssh-rsa',
        'ssh-dss',
        'ssh-ed25519',
        'ecdsa-sha2-nistp256',
        'ecdsa-sha2-nistp384',
        'ecdsa-sha2-nistp521',
        'rsa-sha2-256',
        'rsa-sha2-512'
      ]);

      return validTypes.has(keyType);
    } catch (error) {
      return false;
    }
  }

  isValidStoredKeyData(keyType, keyData) {
    if (!keyType || !keyData) {
      return false;
    }

    // Entradas corruptas del bug hostHash: huella SHA256 hex guardada como clave
    if (/^[0-9a-f]{64}$/i.test(keyData)) {
      return false;
    }

    const keyBuffer = this.decodeStoredKeyData(keyData);
    return this.isValidHostKeyBlob(keyBuffer);
  }

  isValidStoredEntry(entry) {
    return !!(entry && this.isValidStoredKeyData(entry.keyType, entry.keyData));
  }

  serializeKnownHostsContent() {
    const lines = [];
    const seen = new Set();

    for (const [hostAlias, entry] of this.entries.entries()) {
      if (!this.isValidStoredEntry(entry)) {
        continue;
      }

      const hostLabel = this.toCanonicalHostLabel(hostAlias);
      if (!hostLabel) {
        continue;
      }

      const lineKey = `${hostLabel}\t${entry.keyType}\t${entry.keyData}`;
      if (seen.has(lineKey)) {
        continue;
      }
      seen.add(lineKey);
      lines.push(`${hostLabel} ${entry.keyType} ${entry.keyData}`);
    }

    return lines.length ? `${lines.join('\n')}\n` : '';
  }

  toCanonicalHostLabel(alias) {
    if (!alias) {
      return null;
    }

    const bracketed = alias.match(/^\[([^\]]+)\]:(\d+)$/);
    if (bracketed) {
      return `[${bracketed[1]}]:${bracketed[2]}`;
    }

    const plain = alias.match(/^([^:]+):(\d+)$/);
    if (plain) {
      return `[${plain[1]}]:${plain[2]}`;
    }

    return `[${alias}]:22`;
  }

  rememberHostEntry(host, port, keyType, keyData, fingerprint) {
    const entry = { keyType, keyData, fingerprint };
    for (const alias of this.getHostAliases(host, port)) {
      this.entries.set(alias, entry);
    }
  }

  async rewriteKnownHostsFile() {
    await fs.promises.writeFile(this.filePath, this.serializeKnownHostsContent(), 'utf8');
  }

  async removeHost(host, port = 22) {
    await this.ensureLoaded();

    const aliases = this.getHostAliases(host, port);
    let removed = false;

    for (const alias of aliases) {
      if (this.entries.delete(alias)) {
        removed = true;
      }
    }

    if (!removed) {
      return false;
    }

    await this.rewriteKnownHostsFile();
    return true;
  }

  fingerprintFromStored(keyType, keyData) {
    try {
      const keyBuffer = this.decodeStoredKeyData(keyData);
      if (!this.isValidHostKeyBlob(keyBuffer)) {
        return null;
      }
      return this.fingerprint(keyBuffer);
    } catch (error) {
      return null;
    }
  }

  fingerprint(keyBuffer) {
    if (!keyBuffer) {
      return null;
    }

    if (typeof keyBuffer === 'string') {
      return this.canonicalFingerprint(keyBuffer);
    }

    return crypto.createHash('sha256').update(keyBuffer).digest('base64');
  }

  canonicalFingerprint(value) {
    if (!value) {
      return null;
    }

    const raw = String(value).replace(/^sha256:/i, '');
    const hexCandidate = raw.toLowerCase();
    if (/^[0-9a-f]{64}$/.test(hexCandidate)) {
      return Buffer.from(hexCandidate, 'hex').toString('base64');
    }

    // Huellas base64 (OpenSSH / known_hosts): conservar mayusculas/minusculas
    return raw;
  }

  fingerprintsMatch(stored, incoming) {
    const left = this.canonicalFingerprint(stored);
    const right = this.canonicalFingerprint(incoming);
    return !!(left && right && left === right);
  }

  normalizeIncomingKey(key) {
    if (Buffer.isBuffer(key)) {
      return {
        buffer: key,
        fingerprint: this.fingerprint(key)
      };
    }

    if (typeof key === 'string') {
      return {
        buffer: null,
        fingerprint: this.canonicalFingerprint(key)
      };
    }

    return {
      buffer: null,
      fingerprint: null
    };
  }

  lookup(host, port = 22) {
    const aliases = this.getHostAliases(host, port);
    for (const alias of aliases) {
      const entry = this.entries.get(alias);
      if (entry) {
        return entry;
      }
    }
    return null;
  }

  matches(host, port, key) {
    const existing = this.lookup(host, port);
    if (!existing) {
      return false;
    }

    const incoming = this.normalizeIncomingKey(key);
    return this.fingerprintsMatch(existing.fingerprint, incoming.fingerprint);
  }

  getKeyType(keyBuffer) {
    try {
      if (!this.isValidHostKeyBlob(keyBuffer)) {
        return null;
      }

      const typeLen = keyBuffer.readUInt32BE(0);
      return keyBuffer.toString('utf8', 4, 4 + typeLen);
    } catch (error) {
      return null;
    }
  }

  async append(host, port = 22, key) {
    await this.ensureLoaded();

    const incoming = this.normalizeIncomingKey(key);
    if (!incoming.fingerprint) {
      return false;
    }

    if (this.matches(host, port, key)) {
      return true;
    }

    if (!incoming.buffer) {
      return false;
    }

    const keyBuffer = incoming.buffer;
    const keyType = this.getKeyType(keyBuffer);
    if (!keyType) {
      return false;
    }

    const keyData = keyBuffer.toString('base64');
    this.rememberHostEntry(host, port, keyType, keyData, incoming.fingerprint);
    await this.rewriteKnownHostsFile();
    return true;
  }

  async verifyHostKey(host, port, key, policy, notify = () => {}) {
    await this.ensureLoaded();

    const incoming = this.normalizeIncomingKey(key);
    if (!incoming.fingerprint) {
      notify('[SSH] No se pudo verificar la clave del host.\r\n');
      return false;
    }

    let existing = this.lookup(host, port);
    const label = `${host}:${Number(port) || 22}`;

    if (existing && !this.isValidStoredEntry(existing)) {
      await this.removeHost(host, port);
      existing = null;
    }

    if (existing) {
      if (this.fingerprintsMatch(existing.fingerprint, incoming.fingerprint)) {
        return true;
      }

      notify(`[SSH] Clave de host distinta para ${label}. Conexion rechazada.\r\n`);
      return false;
    }

    if (policy === 'warn_new') {
      await this.append(host, port, key);
      return true;
    }

    notify(`[SSH] Host ${label} no esta en known_hosts. Conexion rechazada.\r\n`);
    return false;
  }

  createHostVerifier(host, port, policy, notify) {
    return (key, callback) => {
      const finish = (accepted) => {
        if (typeof callback === 'function') {
          callback(accepted);
          return;
        }
        return accepted;
      };

      this.verifyHostKey(host, port, key, policy, notify)
        .then((accepted) => finish(accepted))
        .catch((error) => {
          notify(`[SSH] Error verificando clave de host: ${error.message || error}\r\n`);
          finish(false);
        });
    };
  }
}

module.exports = new SSHKnownHostsService();
