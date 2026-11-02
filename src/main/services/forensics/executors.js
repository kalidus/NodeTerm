/**
 * executors.js - Ejecutores de comandos forenses
 *
 * Interfaz común:
 *   executor.kind                       -> 'ssh-session' | 'ssh-direct' | 'local' | 'ssh-shell'
 *   executor.run(spec, { timeoutMs, sudo, signal }) -> { output, code, truncated, timedOut }
 *   executor.putFile(buffer, remotePath, mode)      -> opcional (modo subir herramientas)
 *   executor.close()
 *
 * spec: { shell: 'sh' | 'powershell' | 'device', script }
 */

const { spawn } = require('child_process');
const os = require('os');
const {
  assertReadOnly,
  buildShCommand,
  buildPowerShellCommand,
  buildPowerShellArgs
} = require('./commandBuilder');

const MAX_OUTPUT_BYTES = 8 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 60 * 1000;

function createAbortError() {
  const err = new Error('Operación cancelada');
  err.code = 'ABORTED';
  return err;
}

/**
 * Lee un stream de ssh2 hasta que se cierra. Devuelve texto stdout+stderr combinado.
 */
function collectSshStream(stream, { timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let truncated = false;
    let finished = false;
    let timedOut = false;

    const finish = (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve({
        output: Buffer.concat(chunks).toString('utf8'),
        code: typeof code === 'number' ? code : null,
        truncated,
        timedOut
      });
    };

    const onData = (data) => {
      if (truncated) return;
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
      if (size + buf.length > MAX_OUTPUT_BYTES) {
        chunks.push(buf.subarray(0, MAX_OUTPUT_BYTES - size));
        size = MAX_OUTPUT_BYTES;
        truncated = true;
        return;
      }
      chunks.push(buf);
      size += buf.length;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try { stream.close(); } catch (_) { /* noop */ }
      try { stream.destroy(); } catch (_) { /* noop */ }
      finish(null);
    }, timeoutMs);

    const onAbort = () => {
      try { stream.close(); } catch (_) { /* noop */ }
      try { stream.destroy(); } catch (_) { /* noop */ }
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(createAbortError());
      }
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    stream.on('data', onData);
    if (stream.stderr) stream.stderr.on('data', onData);
    stream.on('error', (err) => {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(err);
      }
    });
    stream.on('close', (code) => finish(code));
  });
}

function toRemoteCommand(spec, { sudo }) {
  if (spec.shell === 'sh') return buildShCommand(spec.script, { sudo });
  if (spec.shell === 'powershell') return buildPowerShellCommand(spec.script);
  throw new Error(`Shell no soportado por SSH exec: ${spec.shell}`);
}

// ---------------------------------------------------------------------------
// SSH (conexión existente o directa)
// ---------------------------------------------------------------------------

/**
 * @param {object} client  Instancia ssh2-promise o ssh2.Client
 */
function createSshExecutor(client, { kind = 'ssh-session', onClose } = {}) {
  let Ssh2Client = null;
  try {
    Ssh2Client = require('ssh2').Client;
  } catch (_) { /* noop */ }
  const isRaw = !!(Ssh2Client && client instanceof Ssh2Client);

  const openStream = (command) => {
    if (isRaw) {
      return new Promise((resolve, reject) => {
        client.exec(command, (err, stream) => (err ? reject(err) : resolve(stream)));
      });
    }
    // ssh2-promise: spawn devuelve el stream sin rechazar por stderr
    return client.spawn(command);
  };

  return {
    kind,
    /**
     * allowModify: SOLO para uploadTools.js (modo "subir herramientas"), que construye
     * los comandos a partir de plantillas fijas. Nunca se expone al renderer.
     */
    async run(spec, { timeoutMs = DEFAULT_TIMEOUT_MS, sudo = false, signal, allowModify = false } = {}) {
      if (!allowModify) assertReadOnly(spec);
      if (signal?.aborted) throw createAbortError();
      const command = toRemoteCommand(spec, { sudo });
      const stream = await openStream(command);
      return collectSshStream(stream, { timeoutMs, signal });
    },
    async getFile(remotePath, { maxBytes = 200 * 1024 * 1024 } = {}) {
      const readFrom = (sftp) => new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        const rs = sftp.createReadStream(remotePath);
        rs.on('data', (d) => {
          size += d.length;
          if (size > maxBytes) {
            rs.destroy(new Error('El fichero remoto supera el tamaño máximo permitido'));
            return;
          }
          chunks.push(d);
        });
        rs.on('error', reject);
        rs.on('close', () => resolve(Buffer.concat(chunks)));
      });
      if (isRaw) {
        return new Promise((resolve, reject) => {
          client.sftp((err, sftp) => {
            if (err) return reject(err);
            readFrom(sftp).then((b) => { try { sftp.end(); } catch (_) { /* noop */ } resolve(b); }, reject);
          });
        });
      }
      const sftp = await client.sftp().createReadStream(remotePath);
      return new Promise((resolve, reject) => {
        const chunks = [];
        let size = 0;
        sftp.on('data', (d) => {
          size += d.length;
          if (size > maxBytes) { sftp.destroy(new Error('El fichero remoto supera el tamaño máximo permitido')); return; }
          chunks.push(d);
        });
        sftp.on('error', reject);
        sftp.on('close', () => resolve(Buffer.concat(chunks)));
      });
    },
    async putFile(buffer, remotePath, mode = 0o700) {
      if (isRaw) {
        await new Promise((resolve, reject) => {
          client.sftp((err, sftp) => {
            if (err) return reject(err);
            const ws = sftp.createWriteStream(remotePath, { mode });
            ws.on('error', reject);
            ws.on('close', () => {
              try { sftp.end(); } catch (_) { /* noop */ }
              resolve();
            });
            ws.end(buffer);
          });
        });
        return;
      }
      const sftp = client.sftp();
      await sftp.writeFile(remotePath, buffer, { mode });
    },
    async close() {
      if (typeof onClose === 'function') {
        try { await onClose(); } catch (_) { /* noop */ }
      }
    }
  };
}

/**
 * Conexión SSH directa y efímera (credenciales aportadas).
 * Soporta password o clave privada (contenido).
 */
async function connectDirectSsh(config, { readyTimeout = 20000 } = {}) {
  const { buildSshAlgorithms, isHandshakeOrKexError } = require('../../../utils/sshConnectOptions');
  const { Client } = require('ssh2');

  const tryConnect = (forceLegacy = false) => new Promise((resolve, reject) => {
    const client = new Client();
    const connectConfig = {
      host: config.host,
      port: Number(config.port) || 22,
      username: config.username,
      readyTimeout,
      keepaliveInterval: 10000,
      algorithms: buildSshAlgorithms({
        ...config,
        legacyCompatibility: forceLegacy || !!config.legacyCompatibility
      })
    };
    if (config.password) connectConfig.password = config.password;
    if (config.privateKey) {
      connectConfig.privateKey = config.privateKey;
      if (config.passphrase) connectConfig.passphrase = config.passphrase;
    }
    if (config.tryKeyboard) {
      connectConfig.tryKeyboard = true;
      client.on('keyboard-interactive', (_n, _i, _l, _p, finish) => finish([config.password || '']));
    }
    client.once('ready', () => resolve(client));
    client.once('error', (err) => {
      try { client.end(); } catch (_) { /* noop */ }
      reject(err);
    });
    client.connect(connectConfig);
  });

  try {
    return await tryConnect(false);
  } catch (err) {
    if (!config?.legacyCompatibility && isHandshakeOrKexError(err)) {
      return tryConnect(true);
    }
    throw err;
  }
}

async function createDirectSshExecutor(config) {
  const client = await connectDirectSsh(config);
  return createSshExecutor(client, {
    kind: 'ssh-direct',
    onClose: () => {
      try { client.end(); } catch (_) { /* noop */ }
    }
  });
}

// ---------------------------------------------------------------------------
// Local
// ---------------------------------------------------------------------------

function runLocalProcess(file, args, { timeoutMs, signal }) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn(file, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      return reject(err);
    }
    const chunks = [];
    let size = 0;
    let truncated = false;
    let timedOut = false;
    let done = false;

    const onData = (data) => {
      if (truncated) return;
      if (size + data.length > MAX_OUTPUT_BYTES) {
        chunks.push(data.subarray(0, MAX_OUTPUT_BYTES - size));
        size = MAX_OUTPUT_BYTES;
        truncated = true;
        return;
      }
      chunks.push(data);
      size += data.length;
    };

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill(); } catch (_) { /* noop */ }
    }, timeoutMs);

    const onAbort = () => {
      try { child.kill(); } catch (_) { /* noop */ }
      if (!done) {
        done = true;
        clearTimeout(timer);
        reject(createAbortError());
      }
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }

    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (err) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', onAbort);
      resolve({ output: Buffer.concat(chunks).toString('utf8'), code, truncated, timedOut });
    });
  });
}

function createLocalExecutor() {
  return {
    kind: 'local',
    async run(spec, { timeoutMs = DEFAULT_TIMEOUT_MS, sudo = false, signal } = {}) {
      assertReadOnly(spec);
      if (spec.shell === 'powershell') {
        const exe = process.platform === 'win32' ? 'powershell.exe' : 'pwsh';
        return runLocalProcess(exe, buildPowerShellArgs(spec.script), { timeoutMs, signal });
      }
      if (spec.shell === 'sh') {
        if (process.platform === 'win32') {
          throw new Error('Los colectores sh no están disponibles en un equipo local Windows');
        }
        if (sudo && typeof process.getuid === 'function' && process.getuid() !== 0) {
          return runLocalProcess('sudo', ['-n', 'env', 'LC_ALL=C', 'sh', '-c', spec.script], { timeoutMs, signal });
        }
        return runLocalProcess('env', ['LC_ALL=C', 'sh', '-c', spec.script], { timeoutMs, signal });
      }
      throw new Error(`Shell no soportado en local: ${spec.shell}`);
    },
    async close() { /* noop */ }
  };
}

// ---------------------------------------------------------------------------
// Dispositivos de red (shell interactivo)
// ---------------------------------------------------------------------------

const DEFAULT_PROMPT_RE = /[\r\n][^\r\n]{1,80}[>#$%]\s?$/;
const PAGER_RE = /(--More--|-- MORE --|---\(more[^)]*\)---|<--- More --->|\(more\))\s*$/i;

/**
 * Ejecutor sobre un shell interactivo (routers, switches, firewalls).
 * Los comandos se envían de uno en uno; la salida se delimita por prompt/inactividad.
 */
async function createDeviceShellExecutor(config, profile = {}) {
  const { Client } = require('ssh2');
  const client = new Client();
  const username = profile.userSuffix && !String(config.username).includes('+')
    ? `${config.username}${profile.userSuffix}`
    : config.username;

  const connectConfig = {
    host: config.host,
    port: Number(config.port) || 22,
    username,
    readyTimeout: 20000,
    keepaliveInterval: 10000,
    tryKeyboard: true
  };
  if (config.password) connectConfig.password = config.password;
  if (config.privateKey) {
    connectConfig.privateKey = config.privateKey;
    if (config.passphrase) connectConfig.passphrase = config.passphrase;
  }
  client.on('keyboard-interactive', (_n, _i, _l, _p, finish) => finish([config.password || '']));

  await new Promise((resolve, reject) => {
    client.once('ready', resolve);
    client.once('error', reject);
    client.connect(connectConfig);
  });

  const stream = await new Promise((resolve, reject) => {
    client.shell({ term: 'vt100', cols: 220, rows: 50 }, (err, s) => (err ? reject(err) : resolve(s)));
  });

  const promptRe = profile.promptRegex ? new RegExp(profile.promptRegex) : DEFAULT_PROMPT_RE;
  let buffer = '';
  let waiter = null;

  stream.on('data', (d) => {
    buffer += d.toString('utf8');
    if (buffer.length > MAX_OUTPUT_BYTES) buffer = buffer.slice(-MAX_OUTPUT_BYTES);
    if (waiter) waiter.check();
  });
  stream.stderr?.on('data', (d) => { buffer += d.toString('utf8'); });

  const stripAnsi = (s) => s.replace(/\x1B\[[0-9;?]*[ -/]*[@-~]/g, '').replace(/\x1B[=>]/g, '');

  const waitForPrompt = ({ timeoutMs, idleMs = 1500, signal }) => new Promise((resolve, reject) => {
    let idleTimer = null;
    let lastLen = -1;
    const cleanup = () => {
      clearTimeout(idleTimer);
      clearTimeout(hardTimer);
      if (signal) signal.removeEventListener('abort', onAbort);
      waiter = null;
    };
    const done = (timedOut) => {
      cleanup();
      resolve({ text: buffer, timedOut });
    };
    const onAbort = () => { cleanup(); reject(createAbortError()); };
    const hardTimer = setTimeout(() => done(true), timeoutMs);
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener('abort', onAbort, { once: true });
    }
    const check = () => {
      const clean = stripAnsi(buffer);
      if (PAGER_RE.test(clean)) {
        try { stream.write(' '); } catch (_) { /* noop */ }
        return;
      }
      clearTimeout(idleTimer);
      if (promptRe.test(clean)) {
        idleTimer = setTimeout(() => done(false), 250);
      } else {
        lastLen = clean.length;
        idleTimer = setTimeout(() => {
          if (stripAnsi(buffer).length === lastLen) done(false);
        }, idleMs * 4);
      }
    };
    waiter = { check };
    check();
  });

  // Consumir banner inicial
  await waitForPrompt({ timeoutMs: 15000, idleMs: 1200 });

  const cleanOutput = (raw, command) => {
    let text = stripAnsi(raw).replace(/\r/g, '').replace(/--More--|-- MORE --|---\(more[^)]*\)---/gi, '');
    text = text.replace(/ {2,}\x08+ {2,}/g, '').replace(/\x08/g, '');
    const lines = text.split('\n');
    // Quitar eco del comando (primera línea) y el prompt final
    if (lines.length && lines[0].includes(command.slice(0, 20))) lines.shift();
    if (lines.length && promptRe.test(`\n${lines[lines.length - 1]}`)) lines.pop();
    return lines.join('\n').trim();
  };

  return {
    kind: 'ssh-shell',
    async run(spec, { timeoutMs = DEFAULT_TIMEOUT_MS, signal } = {}) {
      assertReadOnly(spec);
      buffer = '';
      stream.write(`${spec.script}\n`);
      const { text, timedOut } = await waitForPrompt({ timeoutMs, signal });
      return { output: cleanOutput(text, spec.script), code: 0, truncated: false, timedOut };
    },
    async close() {
      try { stream.end('exit\n'); } catch (_) { /* noop */ }
      try { client.end(); } catch (_) { /* noop */ }
    }
  };
}

function describeLocalHost() {
  return {
    hostname: os.hostname(),
    platform: process.platform,
    arch: os.arch(),
    release: os.release()
  };
}

module.exports = {
  MAX_OUTPUT_BYTES,
  DEFAULT_TIMEOUT_MS,
  createAbortError,
  createSshExecutor,
  createDirectSshExecutor,
  createLocalExecutor,
  createDeviceShellExecutor,
  connectDirectSsh,
  describeLocalHost
};
