const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { utils } = require('ssh2');

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
      this.parseContent(content);
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
      const fingerprint = this.fingerprintFromStored(keyType, keyData);
      if (!fingerprint) {
        continue;
      }

      for (const alias of hostsPart.split(',')) {
        const hostAlias = alias.trim();
        if (!hostAlias) {
          continue;
        }
        this.entries.set(hostAlias, {
          keyType,
          keyData,
          fingerprint
        });
      }
    }
  }

  fingerprintFromStored(keyType, keyData) {
    try {
      const keyBuffer = Buffer.from(keyData, 'base64');
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
      return keyBuffer.toLowerCase();
    }

    return crypto.createHash('sha256').update(keyBuffer).digest('base64');
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
        fingerprint: key.toLowerCase()
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
    return !!(incoming.fingerprint && existing.fingerprint === incoming.fingerprint);
  }

  getKeyType(keyBuffer) {
    try {
      const parsed = utils.parseKey(keyBuffer);
      if (!parsed) {
        return 'ssh-rsa';
      }
      return parsed.type || 'ssh-rsa';
    } catch (error) {
      return 'ssh-rsa';
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

    const keyBuffer = incoming.buffer || Buffer.from(String(key), 'base64');
    const keyType = this.getKeyType(keyBuffer);
    const keyData = keyBuffer.toString('base64');
    const hostLabel = `[${host}]:${Number(port) || 22}`;
    const line = `${hostLabel} ${keyType} ${keyData}\n`;

    await fs.promises.appendFile(this.filePath, line, 'utf8');
    this.entries.set(hostLabel, {
      keyType,
      keyData,
      fingerprint: incoming.fingerprint
    });
  }

  async verifyHostKey(host, port, key, policy, notify = () => {}) {
    await this.ensureLoaded();

    const incoming = this.normalizeIncomingKey(key);
    if (!incoming.fingerprint) {
      notify('[SSH] No se pudo verificar la clave del host.\r\n');
      return false;
    }

    const existing = this.lookup(host, port);
    const label = `${host}:${Number(port) || 22}`;

    if (existing) {
      if (existing.fingerprint === incoming.fingerprint) {
        return true;
      }

      notify(`[SSH] Clave de host distinta para ${label}. Conexion rechazada.\r\n`);
      return false;
    }

    if (policy === 'warn_new') {
      notify(`[WARN] Host nuevo ${label}. Huella SHA256:${incoming.fingerprint}\r\n`);
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
