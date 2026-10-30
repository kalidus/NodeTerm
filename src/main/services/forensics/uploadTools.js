/**
 * uploadTools.js - Modo opcional "subir herramientas de confianza"
 *
 * ATENCIÓN: este modo MODIFICA el host objetivo (crea un directorio temporal, copia
 * un binario y lo ejecuta). Es siempre opt-in y requiere:
 *   - confirmación explícita del usuario (confirmModify === true)
 *   - fichero local cuyo SHA-256 coincida con el hash esperado que introduce el usuario
 *     (obtenido de la página oficial de la herramienta)
 *   - plantillas de comando fijas (el renderer no puede enviar comandos)
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sha256 } = require('./EvidenceStore');
const { shQuote } = require('./commandBuilder');

const DIR_RE_LINUX = /^\/tmp\/\.nt-[a-f0-9]{12}$/;
const DIR_RE_WINDOWS = /^C:\\Windows\\Temp\\nt-[a-f0-9]{12}$/;

/**
 * Cada herramienta define cómo se ejecuta y qué se recupera.
 *  linux:   { remoteName, steps: [(dir)=>script], output: (dir)=>ruta|null, timeoutMs }
 *  windows: idem con PowerShell
 */
const UPLOAD_TOOLS = {
  uac: {
    label: 'UAC (Unix-like Artifacts Collector)',
    platforms: ['linux'],
    description: 'Paquete tar.gz oficial de UAC. Ejecuta el perfil ir_triage y recupera el archivo resultante.',
    homepage: 'https://github.com/tclahr/uac',
    fileHint: 'uac-X.Y.Z.tar.gz',
    linux: {
      remoteName: 'uac.tar.gz',
      steps: [
        (dir) => `cd ${shQuote(dir)} && tar xzf uac.tar.gz`,
        (dir) => `cd ${shQuote(dir)}/uac-* && ./uac -p ir_triage ${shQuote(`${dir}/out`)} 2>&1`
      ],
      prepare: (dir) => `mkdir -p ${shQuote(`${dir}/out`)}`,
      output: (dir) => `${dir}/out`,
      outputPattern: /^uac-.*\.(tar\.gz|zip)$/,
      timeoutMs: 30 * 60 * 1000
    }
  },
  velociraptor: {
    label: 'Velociraptor (colección offline)',
    platforms: ['linux', 'windows'],
    description: 'Binario oficial de Velociraptor. Recolecta artefactos de triage en un ZIP.',
    homepage: 'https://github.com/Velocidex/velociraptor',
    fileHint: 'velociraptor-vX.Y.Z-linux-amd64 / velociraptor-vX.Y.Z-windows-amd64.exe',
    linux: {
      remoteName: 'velociraptor',
      steps: [
        (dir) => `cd ${shQuote(dir)} && chmod 700 ./velociraptor && ./velociraptor artifacts collect Linux.Sys.Pslist Linux.Network.Netstat Linux.Sys.Crontab Linux.Sys.Users --output ${shQuote(`${dir}/vr-triage.zip`)} 2>&1`
      ],
      output: (dir) => `${dir}/vr-triage.zip`,
      timeoutMs: 20 * 60 * 1000
    },
    windows: {
      remoteName: 'velociraptor.exe',
      steps: [
        (dir) => `Set-Location '${dir}'; & .\\velociraptor.exe artifacts collect Windows.System.Pslist Windows.Network.Netstat Windows.System.TaskScheduler --output '${dir}\\vr-triage.zip' 2>&1`
      ],
      output: (dir) => `${dir}\\vr-triage.zip`,
      timeoutMs: 20 * 60 * 1000
    }
  },
  chkrootkit: {
    label: 'chkrootkit (script)',
    platforms: ['linux'],
    description: 'Detector de rootkits. Se sube el script y se ejecuta en modo silencioso.',
    homepage: 'https://www.chkrootkit.org',
    fileHint: 'chkrootkit',
    linux: {
      remoteName: 'chkrootkit',
      steps: [(dir) => `cd ${shQuote(dir)} && sh ./chkrootkit -q 2>&1`],
      output: null,
      timeoutMs: 15 * 60 * 1000
    }
  },
  autorunsc: {
    label: 'Sysinternals Autoruns (autorunsc)',
    platforms: ['windows'],
    description: 'autorunsc64.exe de Sysinternals: enumera todos los puntos de autoarranque con firmas y hashes (CSV).',
    homepage: 'https://learn.microsoft.com/sysinternals/downloads/autoruns',
    fileHint: 'autorunsc64.exe',
    windows: {
      remoteName: 'autorunsc64.exe',
      steps: [
        (dir) => `Set-Location '${dir}'; & .\\autorunsc64.exe -accepteula -a * -c -h -s -nobanner 2>&1`
      ],
      output: null,
      timeoutMs: 10 * 60 * 1000
    }
  }
};

function listUploadTools() {
  return Object.entries(UPLOAD_TOOLS).map(([id, t]) => ({
    id,
    label: t.label,
    platforms: t.platforms,
    description: t.description,
    homepage: t.homepage,
    fileHint: t.fileHint
  }));
}

function randomDir(platform) {
  const rnd = crypto.randomBytes(6).toString('hex');
  return platform === 'windows' ? `C:\\Windows\\Temp\\nt-${rnd}` : `/tmp/.nt-${rnd}`;
}

function assertSafeDir(dir, platform) {
  const re = platform === 'windows' ? DIR_RE_WINDOWS : DIR_RE_LINUX;
  if (!re.test(dir)) throw new Error('Directorio temporal remoto no válido');
}

function toSftpPath(dir, name, platform) {
  if (platform === 'windows') return `/${dir.replace(/\\/g, '/')}/${name}`;
  return `${dir}/${name}`;
}

async function runUploadTool({ service, sshConnections, payload = {}, emit = () => {} }) {
  const tool = UPLOAD_TOOLS[payload.toolId];
  if (!tool) throw new Error('Herramienta no soportada');
  if (payload.confirmModify !== true) {
    throw new Error('Debes confirmar explícitamente que aceptas modificar el host (se copia y ejecuta un binario)');
  }
  if (!payload.localPath || typeof payload.localPath !== 'string') throw new Error('Selecciona el fichero local de la herramienta');
  const expected = String(payload.expectedSha256 || '').trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error('Introduce el SHA-256 esperado (64 caracteres hexadecimales) de la página oficial');

  const kind = payload.target?.kind;
  if (kind !== 'ssh-session' && kind !== 'ssh-direct') {
    throw new Error('El modo de subida solo está disponible para conexiones SSH');
  }
  const platform = payload.platform === 'windows' ? 'windows' : 'linux';
  const spec = tool[platform];
  if (!spec) throw new Error(`${tool.label} no soporta la plataforma ${platform}`);

  const buffer = await fs.promises.readFile(payload.localPath);
  const actual = sha256(buffer);
  if (actual !== expected) {
    throw new Error(`El SHA-256 del fichero (${actual}) no coincide con el esperado. Operación cancelada.`);
  }

  const built = await service._buildExecutor(payload.target, { platform, vendor: null }, sshConnections);
  const { executor } = built;
  const store = service.store;
  let caseId = payload.caseId || null;
  const dir = randomDir(platform);
  assertSafeDir(dir, platform);
  const startedAt = Date.now();
  const sh = (script) => ({ shell: 'sh', script });
  const ps = (script) => ({ shell: 'powershell', script });
  const wrap = platform === 'windows' ? ps : sh;
  const notify = (p) => emit({ caseId, upload: true, ...p });

  try {
    if (!caseId) {
      const created = await store.createCase({
        host: built.host, label: built.label, platform, targetKind: kind, profile: 'upload-tool',
        notes: `Modo subir herramientas: ${tool.label}`, appVersion: service.appVersion
      });
      caseId = created.caseId;
    } else if (service.isRunning(caseId)) {
      throw new Error('El caso indicado sigue en ejecución');
    }
    await store.appendAudit(caseId, {
      event: 'upload-tool-start',
      tool: payload.toolId,
      toolSha256: actual,
      toolFileName: path.basename(payload.localPath),
      remoteDir: dir,
      modifiesHost: true
    });
    notify({ type: 'start', total: spec.steps.length + 3, platform, host: built.host });

    // 1. Directorio temporal
    const mk = platform === 'windows'
      ? `New-Item -ItemType Directory -Path '${dir}' -Force | Out-Null; 'ok'`
      : `umask 077; mkdir -p ${shQuote(dir)} && echo ok`;
    const mkRes = await executor.run(wrap(mk), { timeoutMs: 30000, allowModify: true });
    if (!/ok/.test(mkRes.output)) throw new Error(`No se pudo crear el directorio temporal: ${mkRes.output.slice(0, 200)}`);
    await store.appendAudit(caseId, { event: 'upload-tool-mkdir', dir });

    // 2. Subida + verificación de hash remoto
    notify({ type: 'collector-start', index: 1, total: spec.steps.length + 3, collectorId: `upload.${payload.toolId}.copy`, title: 'Subiendo herramienta' });
    await executor.putFile(buffer, toSftpPath(dir, spec.remoteName, platform), 0o700);
    const hashCmd = platform === 'windows'
      ? `(Get-FileHash -Algorithm SHA256 '${dir}\\${spec.remoteName}').Hash.ToLower()`
      : `(sha256sum ${shQuote(`${dir}/${spec.remoteName}`)} 2>/dev/null || shasum -a 256 ${shQuote(`${dir}/${spec.remoteName}`)}) | cut -d' ' -f1`;
    const hashRes = await executor.run(wrap(hashCmd), { timeoutMs: 60000, allowModify: true });
    const remoteHash = (hashRes.output.match(/[a-f0-9]{64}/i) || [''])[0].toLowerCase();
    await store.appendAudit(caseId, { event: 'upload-tool-copied', remoteSha256: remoteHash, ok: remoteHash === actual });
    if (remoteHash !== actual) throw new Error('El hash del fichero subido no coincide: transferencia corrupta o alterada');

    if (platform === 'linux' && spec.prepare) {
      await executor.run(sh(spec.prepare(dir)), { timeoutMs: 30000, allowModify: true });
    }

    // 3. Ejecución
    let outputText = '';
    let idx = 1;
    for (const buildStep of spec.steps) {
      idx += 1;
      const script = buildStep(dir);
      notify({ type: 'collector-start', index: idx, total: spec.steps.length + 3, collectorId: `upload.${payload.toolId}.run`, title: `Ejecutando ${tool.label}` });
      const res = await executor.run(wrap(script), { timeoutMs: spec.timeoutMs, allowModify: true });
      outputText += `${res.output}\n`;
      await store.appendAudit(caseId, { event: 'upload-tool-exec', command: script, exitCode: res.code, timedOut: res.timedOut, size: res.output.length });
    }
    const outEntry = await store.writeArtifact(caseId, `upload.${payload.toolId}.output`, outputText, {
      collectedAt: new Date(startedAt).toISOString(),
      durationMs: Date.now() - startedAt,
      category: 'upload-tool',
      title: `Salida de ${tool.label}`,
      command: `(plantilla fija ${payload.toolId})`
    });

    // 4. Recuperar fichero resultante
    let fetched = null;
    if (spec.output) {
      let remoteOut = spec.output(dir);
      if (platform === 'linux' && spec.outputPattern) {
        const ls = await executor.run(sh(`ls -1 ${shQuote(remoteOut)}`), { timeoutMs: 30000, allowModify: true });
        const found = ls.output.split('\n').map((l) => l.trim()).find((l) => spec.outputPattern.test(l));
        remoteOut = found ? `${remoteOut}/${found}` : null;
      }
      if (remoteOut) {
        try {
          const data = await executor.getFile(platform === 'windows' ? `/${remoteOut.replace(/\\/g, '/')}` : remoteOut);
          const name = `upload.${payload.toolId}.${remoteOut.split(/[\\/]/).pop()}`;
          fetched = await store.writeBinaryArtifact(caseId, name, data, { title: `Resultado de ${tool.label}`, command: `(plantilla fija ${payload.toolId})` });
          await store.appendAudit(caseId, { event: 'upload-tool-fetched', file: name, size: data.length, sha256: fetched.sha256 });
        } catch (err) {
          await store.appendAudit(caseId, { event: 'upload-tool-fetch-failed', error: err?.message || String(err) });
        }
      }
    }

    return { caseId, artifact: outEntry, fetched };
  } finally {
    // 5. Limpieza (siempre)
    if (caseId) {
      try {
        assertSafeDir(dir, platform);
        const rm = platform === 'windows'
          ? `Remove-Item -Recurse -Force '${dir}'; if(Test-Path '${dir}'){'still-exists'}else{'removed'}`
          : `rm -rf ${shQuote(dir)}; [ -e ${shQuote(dir)} ] && echo still-exists || echo removed`;
        const res = await executor.run(wrap(rm), { timeoutMs: 60000, allowModify: true });
        await store.appendAudit(caseId, { event: 'upload-tool-cleanup', dir, removed: /removed/.test(res.output) });
      } catch (err) {
        await store.appendAudit(caseId, { event: 'upload-tool-cleanup-failed', error: err?.message || String(err) });
      }
      try {
        await service.analyze(caseId, { platform });
        await store.updateCase(caseId, { status: 'completed', finishedAt: new Date().toISOString() });
        await store.writeManifest(caseId);
      } catch (_) { /* noop */ }
      emit({ caseId, upload: true, type: 'done', status: 'completed' });
    }
    try { await executor.close(); } catch (_) { /* noop */ }
  }
}

module.exports = { listUploadTools, runUploadTool, UPLOAD_TOOLS, assertSafeDir, randomDir };
