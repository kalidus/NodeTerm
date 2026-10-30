/**
 * ForensicsService.js - Orquestador de análisis forense (triage / live response)
 *
 * Flujo de una ejecución:
 *   1. Construir ejecutor (sesión SSH abierta, SSH directo, local o shell de dispositivo)
 *   2. Detectar plataforma (auto) y privilegios
 *   3. Ejecutar colectores de solo lectura, guardando cada artefacto con SHA-256
 *   4. Analizar (reglas, IOCs, línea de tiempo) y generar manifiesto
 */

const { EvidenceStore } = require('./EvidenceStore');
const {
  createSshExecutor,
  createDirectSshExecutor,
  createLocalExecutor,
  createDeviceShellExecutor,
  describeLocalHost
} = require('./executors');
const { getCollectors, describeCollectors, listNetworkProfiles, getNetworkProfile } = require('./collectors');

const PROGRESS_CHANNEL = 'forensics:progress';

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/^\uFEFF/, '')
    // Ruido de PowerShell remoto (CLIXML) mezclado con 2>&1
    .replace(/^#< CLIXML\s*$/gm, '')
    .replace(/<Objs [^>]*>[\s\S]*?<\/Objs>/g, '');
}

class ForensicsService {
  constructor({ store, appVersion } = {}) {
    this.store = store || new EvidenceStore();
    this.appVersion = appVersion || null;
    this.runs = new Map();
  }

  // -------------------------------------------------------------------------
  // Catálogo / objetivos
  // -------------------------------------------------------------------------

  listSshSessions(sshConnections = {}) {
    const sessions = [];
    for (const [tabId, conn] of Object.entries(sshConnections || {})) {
      if (!conn || !conn.config) continue;
      const cfg = conn.config;
      sessions.push({
        tabId,
        host: cfg.host || null,
        port: cfg.port || 22,
        username: cfg.username || null,
        label: cfg.name || cfg.label || `${cfg.username || ''}@${cfg.host || ''}`,
        viaBastion: !!cfg.useBastionWallix,
        usable: !cfg.useBastionWallix && !!conn.ssh
      });
    }
    return sessions;
  }

  getCatalog({ platform, profile, vendor } = {}) {
    return {
      networkProfiles: listNetworkProfiles(),
      collectors: platform ? describeCollectors({ platform, profile, vendor }) : []
    };
  }

  // -------------------------------------------------------------------------
  // Construcción de ejecutores
  // -------------------------------------------------------------------------

  async _buildExecutor(target, { platform, vendor }, sshConnections) {
    const kind = target?.kind;
    if (kind === 'local') {
      if (platform === 'network') throw new Error('El equipo local no puede analizarse como equipo de red');
      return { executor: createLocalExecutor(), host: describeLocalHost().hostname, label: 'Equipo local', config: null };
    }

    if (kind === 'ssh-session') {
      const conn = sshConnections?.[target.tabId];
      if (!conn || !conn.config) throw new Error('La sesión SSH seleccionada ya no está activa');
      if (conn.config.useBastionWallix) {
        throw new Error('Las sesiones a través de bastión Wallix no están soportadas: usa una conexión directa');
      }
      const cfg = conn.config;
      const label = cfg.name || `${cfg.username}@${cfg.host}`;
      if (platform === 'network') {
        const executor = await createDeviceShellExecutor(
          {
            host: cfg.host,
            port: cfg.port,
            username: cfg.username,
            password: cfg.password || conn.manualPassword,
            privateKey: cfg.privateKey,
            passphrase: cfg.passphrase
          },
          getNetworkProfile(vendor)
        );
        return { executor, host: cfg.host, label, config: cfg };
      }
      if (!conn.ssh) throw new Error('La sesión SSH no tiene un cliente disponible');
      return { executor: createSshExecutor(conn.ssh, { kind: 'ssh-session' }), host: cfg.host, label, config: cfg };
    }

    if (kind === 'ssh-direct') {
      if (!target.host || !target.username) throw new Error('Host y usuario son obligatorios');
      if (!target.password && !target.privateKey) throw new Error('Indica contraseña o clave privada');
      const cfg = {
        host: String(target.host).trim(),
        port: Number(target.port) || 22,
        username: String(target.username).trim(),
        password: target.password,
        privateKey: target.privateKey,
        passphrase: target.passphrase
      };
      const label = `${cfg.username}@${cfg.host}`;
      if (platform === 'network') {
        const executor = await createDeviceShellExecutor(cfg, getNetworkProfile(vendor));
        return { executor, host: cfg.host, label, config: cfg };
      }
      const executor = await createDirectSshExecutor(cfg);
      return { executor, host: cfg.host, label, config: cfg };
    }

    throw new Error('Tipo de objetivo no válido');
  }

  async detectPlatform(executor) {
    try {
      const r = await executor.run({ shell: 'sh', script: 'uname -s' }, { timeoutMs: 15000 });
      if (/^(Linux|Darwin|FreeBSD|OpenBSD|NetBSD|SunOS|AIX)\b/m.test(r.output)) return 'linux';
    } catch (_) { /* seguir */ }
    try {
      const r = await executor.run({ shell: 'powershell', script: '$PSVersionTable.PSVersion.Major' }, { timeoutMs: 25000 });
      if (/^\s*\d+\s*$/m.test(normalizeText(r.output))) return 'windows';
    } catch (_) { /* seguir */ }
    return null;
  }

  async _detectLinuxPrivileges(executor, wantSudo) {
    const result = { uid: null, sudo: 'not-requested' };
    try {
      const r = await executor.run({ shell: 'sh', script: 'id -u' }, { timeoutMs: 15000 });
      const uid = parseInt(String(r.output).trim().split(/\s+/).pop(), 10);
      result.uid = Number.isFinite(uid) ? uid : null;
    } catch (_) { /* noop */ }
    if (result.uid === 0) {
      result.sudo = 'not-needed';
      return result;
    }
    if (wantSudo) {
      try {
        const r = await executor.run({ shell: 'sh', script: 'id -u' }, { timeoutMs: 15000, sudo: true });
        result.sudo = String(r.output).trim() === '0' ? 'ok' : 'unavailable';
      } catch (_) {
        result.sudo = 'unavailable';
      }
    }
    return result;
  }

  // -------------------------------------------------------------------------
  // Ejecución
  // -------------------------------------------------------------------------

  /**
   * Prepara la ejecución (conecta, detecta plataforma, crea el caso) y la lanza en segundo plano.
   * @returns {Promise<{caseId:string, platform:string, total:number}>}
   */
  async startRun(options = {}, { sshConnections, emit } = {}) {
    const notify = typeof emit === 'function' ? emit : () => {};
    const profile = options.profile === 'full' ? 'full' : 'quick';
    let platform = options.platform || 'auto';
    const vendor = options.vendor || 'generic';

    const built = await this._buildExecutor(options.target, { platform, vendor }, sshConnections);
    const { executor } = built;

    try {
      if (platform === 'auto') {
        platform = await this.detectPlatform(executor);
        if (!platform) {
          throw new Error('No se pudo detectar el sistema operativo del host. Elige la plataforma manualmente.');
        }
      }

      let collectors = getCollectors({ platform, profile, vendor });
      if (Array.isArray(options.collectorIds) && options.collectorIds.length) {
        const wanted = new Set(options.collectorIds);
        collectors = collectors.filter((c) => wanted.has(c.id));
      }
      if (!collectors.length) throw new Error('No hay colectores seleccionados');

      const { caseId } = await this.store.createCase({
        host: built.host,
        label: built.label,
        platform,
        vendor: platform === 'network' ? vendor : null,
        targetKind: options.target.kind,
        profile,
        notes: options.notes || '',
        appVersion: this.appVersion
      });

      const abort = new AbortController();
      const state = { caseId, abort, executor, startedAt: Date.now(), total: collectors.length };
      this.runs.set(caseId, state);

      // Ejecución en segundo plano
      this._execute({ caseId, platform, vendor, profile, collectors, options, state, notify, built }).catch(() => { /* ya notificado */ });

      return { caseId, platform, total: collectors.length };
    } catch (err) {
      try { await executor.close(); } catch (_) { /* noop */ }
      throw err;
    }
  }

  async _execute({ caseId, platform, vendor, profile, collectors, options, state, notify, built }) {
    const { executor } = built;
    const emit = (payload) => notify({ caseId, ...payload });
    let status = 'completed';
    let failure = null;

    try {
      await this.store.appendAudit(caseId, {
        event: 'run-start',
        platform,
        vendor: platform === 'network' ? vendor : undefined,
        profile,
        targetKind: options.target.kind,
        host: built.host,
        executor: executor.kind,
        collectors: collectors.map((c) => c.id)
      });
      emit({ type: 'start', total: collectors.length, platform, host: built.host });

      // Privilegios (Linux)
      let useSudo = false;
      if (platform === 'linux' && executor.kind !== 'ssh-shell') {
        const privileges = await this._detectLinuxPrivileges(executor, !!options.sudo);
        useSudo = privileges.sudo === 'ok';
        await this.store.updateCase(caseId, { privileges });
        await this.store.appendAudit(caseId, { event: 'privileges', ...privileges });
        emit({ type: 'phase', message: `Privilegios: uid=${privileges.uid ?? '?'} sudo=${privileges.sudo}` });
      }

      // Comandos previos de sesión en dispositivos (paginación)
      if (platform === 'network') {
        const profileDef = getNetworkProfile(vendor);
        for (const cmd of profileDef.pre || []) {
          try {
            await executor.run({ shell: 'device', script: cmd }, { timeoutMs: 15000, signal: state.abort.signal });
            await this.store.appendAudit(caseId, { event: 'session-setup', command: cmd });
          } catch (e) {
            if (e?.code === 'ABORTED') throw e;
          }
        }
      }

      let index = 0;
      for (const collector of collectors) {
        if (state.abort.signal.aborted) {
          status = 'cancelled';
          break;
        }
        index += 1;
        emit({ type: 'collector-start', index, total: collectors.length, collectorId: collector.id, title: collector.title });

        const startedAt = Date.now();
        const collectedAt = new Date(startedAt).toISOString();
        let artifact;
        try {
          const res = await executor.run(
            { shell: collector.shell, script: collector.script },
            { timeoutMs: collector.timeoutMs, sudo: useSudo && collector.needsRoot, signal: state.abort.signal }
          );
          const text = normalizeText(res.output);
          artifact = await this.store.writeArtifact(caseId, collector.id, text, {
            collectedAt,
            durationMs: Date.now() - startedAt,
            exitCode: res.code,
            ok: !res.timedOut,
            error: res.timedOut ? 'Tiempo de espera agotado (salida parcial)' : null,
            truncated: res.truncated,
            timedOut: res.timedOut,
            category: collector.category,
            title: collector.title,
            command: collector.script
          });
        } catch (err) {
          if (err?.code === 'ABORTED') {
            status = 'cancelled';
            break;
          }
          artifact = await this.store.writeArtifact(caseId, collector.id, '', {
            collectedAt,
            durationMs: Date.now() - startedAt,
            ok: false,
            error: err?.message || String(err),
            category: collector.category,
            title: collector.title,
            command: collector.script
          });
        }

        await this.store.appendAudit(caseId, {
          event: 'command',
          collectorId: collector.id,
          shell: collector.shell,
          command: collector.script,
          sudo: useSudo && collector.needsRoot,
          startedAt: collectedAt,
          durationMs: artifact.durationMs,
          ok: artifact.ok,
          error: artifact.error,
          size: artifact.size,
          sha256: artifact.sha256
        });
        emit({
          type: 'collector-done',
          index,
          total: collectors.length,
          collectorId: collector.id,
          title: collector.title,
          ok: artifact.ok,
          size: artifact.size,
          durationMs: artifact.durationMs,
          error: artifact.error
        });
      }

      emit({ type: 'phase', message: 'Analizando evidencias...' });
      await this.analyze(caseId, { platform });
    } catch (err) {
      status = err?.code === 'ABORTED' ? 'cancelled' : 'failed';
      failure = err?.message || String(err);
      try { await this.analyze(caseId, { platform }); } catch (_) { /* noop */ }
    } finally {
      try { await executor.close(); } catch (_) { /* noop */ }
      this.runs.delete(caseId);
      try {
        const findings = await this.store.loadDerived(caseId, 'findings.json');
        await this.store.updateCase(caseId, {
          status,
          finishedAt: new Date().toISOString(),
          error: failure,
          summary: findings?.summary || null
        });
        await this.store.appendAudit(caseId, { event: 'run-end', status, error: failure });
        await this.store.writeManifest(caseId);
      } catch (_) { /* noop */ }
      emit({ type: status === 'failed' ? 'error' : status === 'cancelled' ? 'cancelled' : 'done', status, error: failure });
    }
  }

  cancelRun(caseId) {
    const state = this.runs.get(caseId);
    if (!state) return false;
    state.abort.abort();
    return true;
  }

  isRunning(caseId) {
    return this.runs.has(caseId);
  }

  // -------------------------------------------------------------------------
  // Análisis, casos e informes
  // -------------------------------------------------------------------------

  async analyze(caseId, { platform } = {}) {
    const { analyzeCase } = require('./analysis');
    const caseData = (await this.store.getCase(caseId))?.case;
    if (!caseData) throw new Error('Caso no encontrado');
    const artifacts = await this.store.readAllArtifacts(caseId);
    const iocs = await this.loadIocs();
    const result = analyzeCase({
      platform: platform || caseData.target?.platform,
      artifacts,
      caseData,
      iocs
    });
    await this.store.saveDerived(caseId, 'findings.json', {
      generatedAt: new Date().toISOString(),
      summary: result.summary,
      findings: result.findings,
      facts: result.facts
    });
    await this.store.saveDerived(caseId, 'timeline.json', {
      generatedAt: new Date().toISOString(),
      events: result.timeline
    });
    return result;
  }

  async reanalyze(caseId) {
    const result = await this.analyze(caseId);
    await this.store.updateCase(caseId, { summary: result.summary });
    await this.store.appendAudit(caseId, { event: 'reanalyze' });
    await this.store.writeManifest(caseId);
    return result;
  }

  listCases() { return this.store.listCases(); }
  getCase(caseId) { return this.store.getCase(caseId); }
  verifyCase(caseId) { return this.store.verifyCase(caseId); }
  readAudit(caseId) { return this.store.readAudit(caseId); }

  async deleteCase(caseId) {
    if (this.runs.has(caseId)) throw new Error('El caso está en ejecución');
    return this.store.deleteCase(caseId);
  }

  async readArtifact(caseId, collectorId, { redact = true } = {}) {
    const text = await this.store.readArtifactText(caseId, collectorId);
    if (text == null) return null;
    if (redact) return require('./redaction').redactText(text);
    return text;
  }

  // IOCs importables ---------------------------------------------------------

  _iocPath() {
    const path = require('path');
    return path.join(path.dirname(this.store.baseDir), 'iocs.json');
  }

  async loadIocs() {
    const fs = require('fs');
    try {
      const data = JSON.parse(await fs.promises.readFile(this._iocPath(), 'utf8'));
      return normalizeIocs(data);
    } catch (_) {
      return normalizeIocs({});
    }
  }

  async saveIocs(input) {
    const fs = require('fs');
    const path = require('path');
    const iocs = normalizeIocs(input);
    await fs.promises.mkdir(path.dirname(this._iocPath()), { recursive: true });
    await fs.promises.writeFile(this._iocPath(), JSON.stringify(iocs, null, 2), 'utf8');
    return iocs;
  }

  // Informes -------------------------------------------------------------------

  async buildReport(caseId, format, { redact = true } = {}) {
    const report = require('./report');
    const data = await this._collectReportData(caseId);
    return report.build(format, data, { redact });
  }

  async _collectReportData(caseId) {
    const full = await this.store.getCase(caseId);
    if (!full) throw new Error('Caso no encontrado');
    return {
      ...full,
      audit: await this.store.readAudit(caseId)
    };
  }

  async exportEvidencePackage(caseId, destPath, { includeReport = true, redactReport = true } = {}) {
    const pkg = require('./report/evidencePackage');
    await this.store.writeManifest(caseId);
    const extra = [];
    if (includeReport) {
      const report = require('./report');
      const data = await this._collectReportData(caseId);
      extra.push({ name: 'report/informe.md', data: Buffer.from(report.build('markdown', data, { redact: redactReport }), 'utf8') });
      extra.push({ name: 'report/informe.html', data: Buffer.from(report.build('html', data, { redact: redactReport }), 'utf8') });
    }
    await pkg.createEvidenceZip(this.store.getCaseDir(caseId), destPath, extra);
    await this.store.appendAudit(caseId, { event: 'evidence-exported', destination: require('path').basename(destPath) });
    await this.store.writeManifest(caseId);
    return { path: destPath };
  }

  async compareCases(baseId, currentId) {
    const { compareCases } = require('./compare');
    const [base, current] = await Promise.all([
      this._loadForCompare(baseId),
      this._loadForCompare(currentId)
    ]);
    return compareCases(base, current);
  }

  async _loadForCompare(caseId) {
    const full = await this.store.getCase(caseId);
    if (!full) throw new Error(`Caso no encontrado: ${caseId}`);
    return { ...full, artifactsText: await this.store.readAllArtifacts(caseId) };
  }
}

function normalizeIocs(data) {
  const arr = (v) => Array.from(new Set((Array.isArray(v) ? v : []).map((x) => String(x).trim()).filter(Boolean)));
  return {
    ips: arr(data?.ips),
    domains: arr(data?.domains).map((d) => d.toLowerCase()),
    hashes: arr(data?.hashes).map((h) => h.toLowerCase()),
    strings: arr(data?.strings),
    updatedAt: new Date().toISOString()
  };
}

module.exports = { ForensicsService, PROGRESS_CHANNEL, normalizeText, normalizeIocs };
