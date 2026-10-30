/**
 * EvidenceStore.js - Almacén de casos y evidencias forenses
 *
 * Estructura en disco (por caso):
 *   <base>/<caseId>/
 *     case.json         metadatos del caso (host, operador, plataforma, estado...)
 *     artifacts/        un fichero de texto por colector (inmutable tras escribirse)
 *     artifacts.json    índice de artefactos con SHA-256 calculado al escribir
 *     audit.log         JSONL con todos los comandos lanzados al host
 *     findings.json     hallazgos (derivado)
 *     timeline.json     línea de tiempo (derivado)
 *     ai-summary.json   resumen IA (derivado, opcional)
 *     manifest.json     manifiesto con hashes de todo lo anterior
 *     manifest.sha256   hash del manifiesto
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const CASE_ID_RE = /^[A-Za-z0-9._-]{3,120}$/;
const DERIVED_FILES = ['findings.json', 'timeline.json', 'ai-summary.json'];

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function sanitizeName(text) {
  return String(text || 'host').toLowerCase().replace(/[^a-z0-9.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'host';
}

function sanitizeFileName(id) {
  return String(id).replace(/[^A-Za-z0-9._-]/g, '_');
}

function formatStamp(date) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}-${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}

function defaultBaseDir() {
  const { getNodeTermDataDir } = require('../../utils/file-utils');
  return path.join(getNodeTermDataDir(), 'forensics', 'cases');
}

class EvidenceStore {
  constructor(baseDir) {
    this.baseDir = baseDir || defaultBaseDir();
  }

  _assertId(caseId) {
    if (typeof caseId !== 'string' || !CASE_ID_RE.test(caseId)) {
      throw new Error('Identificador de caso no válido');
    }
  }

  getCaseDir(caseId) {
    this._assertId(caseId);
    return path.join(this.baseDir, caseId);
  }

  async _readJson(file, fallback = null) {
    try {
      return JSON.parse(await fs.promises.readFile(file, 'utf8'));
    } catch (_) {
      return fallback;
    }
  }

  async _writeJson(file, data) {
    await fs.promises.writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Crea un caso nuevo. meta: { host, platform, profile, mode, targetKind, operatorNotes, ... }
   */
  async createCase(meta = {}) {
    const now = new Date();
    const rand = crypto.randomBytes(2).toString('hex');
    const caseId = `${formatStamp(now)}-${sanitizeName(meta.host)}-${rand}`;
    const dir = this.getCaseDir(caseId);
    await fs.promises.mkdir(path.join(dir, 'artifacts'), { recursive: true });

    let operator = 'unknown';
    try { operator = os.userInfo().username; } catch (_) { /* noop */ }

    const caseData = {
      caseId,
      createdAt: now.toISOString(),
      status: 'running',
      operator,
      analystHost: os.hostname(),
      tool: { name: 'NodeTerm Forensics', version: meta.appVersion || null, schema: 1 },
      target: {
        host: meta.host || null,
        label: meta.label || null,
        platform: meta.platform || null,
        vendor: meta.vendor || null,
        kind: meta.targetKind || null
      },
      profile: meta.profile || 'quick',
      notes: meta.notes || '',
      privileges: null,
      finishedAt: null,
      summary: null
    };
    await this._writeJson(path.join(dir, 'case.json'), caseData);
    await this._writeJson(path.join(dir, 'artifacts.json'), []);
    await fs.promises.writeFile(path.join(dir, 'audit.log'), '', 'utf8');
    await this.appendAudit(caseId, { event: 'case-created', operator, analystHost: os.hostname() });
    return { caseId, dir, caseData };
  }

  async updateCase(caseId, patch) {
    const file = path.join(this.getCaseDir(caseId), 'case.json');
    const current = (await this._readJson(file)) || {};
    const next = { ...current, ...patch };
    await this._writeJson(file, next);
    return next;
  }

  async appendAudit(caseId, entry) {
    const file = path.join(this.getCaseDir(caseId), 'audit.log');
    const line = JSON.stringify({ ts: new Date().toISOString(), ...entry });
    await fs.promises.appendFile(file, `${line}\n`, 'utf8');
  }

  /**
   * Guarda un artefacto y registra su hash. Devuelve la entrada del índice.
   */
  async writeArtifact(caseId, collectorId, text, info = {}) {
    const dir = this.getCaseDir(caseId);
    const fileName = `${sanitizeFileName(collectorId)}.txt`;
    const content = String(text ?? '');
    const buf = Buffer.from(content, 'utf8');
    await fs.promises.writeFile(path.join(dir, 'artifacts', fileName), buf);

    const entry = {
      collectorId,
      file: `artifacts/${fileName}`,
      sha256: sha256(buf),
      size: buf.length,
      collectedAt: info.collectedAt || new Date().toISOString(),
      durationMs: info.durationMs ?? null,
      exitCode: info.exitCode ?? null,
      ok: info.ok !== false,
      error: info.error || null,
      truncated: !!info.truncated,
      timedOut: !!info.timedOut,
      category: info.category || null,
      title: info.title || null,
      command: info.command || null
    };

    const indexFile = path.join(dir, 'artifacts.json');
    const index = (await this._readJson(indexFile, [])) || [];
    const pos = index.findIndex((e) => e.collectorId === collectorId);
    if (pos >= 0) index[pos] = entry;
    else index.push(entry);
    await this._writeJson(indexFile, index);
    return entry;
  }

  /** Guarda un artefacto binario (p. ej. el ZIP/tar.gz generado por UAC o Velociraptor). */
  async writeBinaryArtifact(caseId, artifactId, buffer, info = {}) {
    const dir = this.getCaseDir(caseId);
    const fileName = sanitizeFileName(artifactId);
    await fs.promises.writeFile(path.join(dir, 'artifacts', fileName), buffer);
    const entry = {
      collectorId: artifactId,
      file: `artifacts/${fileName}`,
      sha256: sha256(buffer),
      size: buffer.length,
      collectedAt: info.collectedAt || new Date().toISOString(),
      durationMs: info.durationMs ?? null,
      exitCode: null,
      ok: true,
      error: null,
      truncated: false,
      timedOut: false,
      binary: true,
      category: info.category || 'upload-tool',
      title: info.title || artifactId,
      command: info.command || null
    };
    const indexFile = path.join(dir, 'artifacts.json');
    const index = (await this._readJson(indexFile, [])) || [];
    const pos = index.findIndex((e) => e.collectorId === artifactId);
    if (pos >= 0) index[pos] = entry;
    else index.push(entry);
    await this._writeJson(indexFile, index);
    return entry;
  }

  async saveDerived(caseId, name, data) {
    if (!DERIVED_FILES.includes(name)) throw new Error('Fichero derivado no permitido');
    await this._writeJson(path.join(this.getCaseDir(caseId), name), data);
  }

  async loadDerived(caseId, name) {
    if (!DERIVED_FILES.includes(name)) throw new Error('Fichero derivado no permitido');
    return this._readJson(path.join(this.getCaseDir(caseId), name), null);
  }

  async readArtifactIndex(caseId) {
    return (await this._readJson(path.join(this.getCaseDir(caseId), 'artifacts.json'), [])) || [];
  }

  async readArtifactText(caseId, collectorId) {
    const index = await this.readArtifactIndex(caseId);
    const entry = index.find((e) => e.collectorId === collectorId);
    if (!entry) return null;
    try {
      return await fs.promises.readFile(path.join(this.getCaseDir(caseId), entry.file), 'utf8');
    } catch (_) {
      return null;
    }
  }

  /** Devuelve { collectorId: texto } para todos los artefactos del caso. */
  async readAllArtifacts(caseId) {
    const index = await this.readArtifactIndex(caseId);
    const out = {};
    for (const e of index) {
      if (e.binary) continue;
      try {
        out[e.collectorId] = await fs.promises.readFile(path.join(this.getCaseDir(caseId), e.file), 'utf8');
      } catch (_) {
        out[e.collectorId] = '';
      }
    }
    return out;
  }

  /**
   * Escribe manifest.json (+ manifest.sha256) con los hashes de artefactos y derivados.
   */
  async writeManifest(caseId) {
    const dir = this.getCaseDir(caseId);
    const caseData = (await this._readJson(path.join(dir, 'case.json'))) || {};
    const index = await this.readArtifactIndex(caseId);

    const files = index.map((e) => ({
      name: e.file,
      type: 'artifact',
      sha256: e.sha256,
      size: e.size,
      collectedAt: e.collectedAt,
      collectorId: e.collectorId,
      command: e.command
    }));

    for (const name of ['audit.log', 'case.json', 'artifacts.json', ...DERIVED_FILES]) {
      // case.json cambia al finalizar; se incluye el hash del estado actual
      try {
        const buf = await fs.promises.readFile(path.join(dir, name));
        files.push({ name, type: name === 'audit.log' ? 'audit' : name.endsWith('.json') && DERIVED_FILES.includes(name) ? 'derived' : 'meta', sha256: sha256(buf), size: buf.length });
      } catch (_) { /* no existe */ }
    }

    const manifest = {
      caseId,
      generatedAt: new Date().toISOString(),
      algorithm: 'SHA-256',
      operator: caseData.operator || null,
      target: caseData.target || null,
      files
    };
    const manifestText = JSON.stringify(manifest, null, 2);
    await fs.promises.writeFile(path.join(dir, 'manifest.json'), manifestText, 'utf8');
    const manifestHash = sha256(Buffer.from(manifestText, 'utf8'));
    await fs.promises.writeFile(path.join(dir, 'manifest.sha256'), `${manifestHash}  manifest.json\n`, 'utf8');
    return { manifest, manifestHash };
  }

  /**
   * Verifica la integridad de un caso: artefactos contra su hash original y el manifiesto.
   * Los ficheros derivados/meta se comparan con el manifiesto solo informativamente.
   */
  async verifyCase(caseId) {
    const dir = this.getCaseDir(caseId);
    const result = { caseId, ok: true, manifestOk: null, checked: 0, mismatches: [], missing: [] };

    const index = await this.readArtifactIndex(caseId);
    for (const e of index) {
      try {
        const buf = await fs.promises.readFile(path.join(dir, e.file));
        result.checked += 1;
        if (sha256(buf) !== e.sha256) {
          result.mismatches.push(e.file);
          result.ok = false;
        }
      } catch (_) {
        result.missing.push(e.file);
        result.ok = false;
      }
    }

    try {
      const manifestText = await fs.promises.readFile(path.join(dir, 'manifest.json'), 'utf8');
      const stored = (await fs.promises.readFile(path.join(dir, 'manifest.sha256'), 'utf8')).trim().split(/\s+/)[0];
      result.manifestOk = sha256(Buffer.from(manifestText, 'utf8')) === stored;
      if (!result.manifestOk) result.ok = false;
      const manifest = JSON.parse(manifestText);
      const audit = manifest.files.find((f) => f.name === 'audit.log');
      if (audit) {
        const buf = await fs.promises.readFile(path.join(dir, 'audit.log')).catch(() => null);
        result.auditOk = buf ? sha256(buf) === audit.sha256 : false;
        if (!result.auditOk) result.ok = false;
      }
    } catch (_) {
      result.manifestOk = false;
      result.ok = false;
    }
    return result;
  }

  async listCases() {
    let names = [];
    try {
      names = await fs.promises.readdir(this.baseDir);
    } catch (_) {
      return [];
    }
    const cases = [];
    for (const name of names) {
      if (!CASE_ID_RE.test(name)) continue;
      const data = await this._readJson(path.join(this.baseDir, name, 'case.json'));
      if (!data) continue;
      const findings = await this._readJson(path.join(this.baseDir, name, 'findings.json'), null);
      cases.push({
        caseId: data.caseId,
        createdAt: data.createdAt,
        finishedAt: data.finishedAt,
        status: data.status,
        target: data.target,
        profile: data.profile,
        operator: data.operator,
        summary: data.summary,
        findingsCount: Array.isArray(findings?.findings) ? findings.findings.length : null
      });
    }
    cases.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    return cases;
  }

  async getCase(caseId) {
    const dir = this.getCaseDir(caseId);
    const caseData = await this._readJson(path.join(dir, 'case.json'));
    if (!caseData) return null;
    return {
      case: caseData,
      artifacts: await this.readArtifactIndex(caseId),
      findings: await this.loadDerived(caseId, 'findings.json'),
      timeline: await this.loadDerived(caseId, 'timeline.json'),
      aiSummary: await this.loadDerived(caseId, 'ai-summary.json')
    };
  }

  async readAudit(caseId) {
    try {
      const text = await fs.promises.readFile(path.join(this.getCaseDir(caseId), 'audit.log'), 'utf8');
      return text.split('\n').filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch (_) { return { raw: l }; }
      });
    } catch (_) {
      return [];
    }
  }

  async deleteCase(caseId) {
    const dir = this.getCaseDir(caseId);
    await fs.promises.rm(dir, { recursive: true, force: true });
    return true;
  }
}

module.exports = { EvidenceStore, sha256, CASE_ID_RE, DERIVED_FILES };
