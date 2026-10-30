/**
 * Forensics Handlers - IPC del módulo de análisis forense (DFIR)
 *
 * Canales: forensics:*  (progreso en 'forensics:progress')
 * El renderer solo envía identificadores (colectores, casos); los comandos se
 * construyen y validan siempre en el proceso principal.
 */

const { ipcMain, dialog, BrowserWindow, shell } = require('electron');
const fs = require('fs');
const os = require('os');
const path = require('path');

let service = null;
let registered = false;

function getService(dependencies) {
  if (!service) {
    const { ForensicsService } = require('../services/forensics/ForensicsService');
    let appVersion = null;
    try { appVersion = dependencies?.packageJson?.version || null; } catch (_) { /* noop */ }
    service = new ForensicsService({ appVersion });
  }
  return service;
}

function ok(data = {}) {
  return { success: true, ...data };
}

function fail(err) {
  return { success: false, error: err?.message || String(err) };
}

function getParentWindow(event, dependencies) {
  try {
    return BrowserWindow.fromWebContents(event.sender) || dependencies?.mainWindow || undefined;
  } catch (_) {
    return undefined;
  }
}

async function renderPdf(html) {
  const tmpFile = path.join(os.tmpdir(), `nodeterm-forensics-${Date.now()}.html`);
  await fs.promises.writeFile(tmpFile, html, 'utf8');
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, contextIsolation: true, javascript: false }
  });
  try {
    await win.loadFile(tmpFile);
    return await win.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' }
    });
  } finally {
    try { win.destroy(); } catch (_) { /* noop */ }
    fs.promises.unlink(tmpFile).catch(() => {});
  }
}

const FORMAT_INFO = {
  markdown: { ext: 'md', name: 'Markdown' },
  html: { ext: 'html', name: 'HTML' },
  pdf: { ext: 'pdf', name: 'PDF' },
  json: { ext: 'json', name: 'JSON' }
};

function registerForensicsHandlers(dependencies = {}) {
  if (registered) return;
  registered = true;
  const svc = () => getService(dependencies);

  // --- Objetivos y catálogo ---------------------------------------------------
  ipcMain.handle('forensics:list-targets', async () => {
    try {
      return ok({
        sessions: svc().listSshSessions(dependencies.sshConnections),
        networkProfiles: svc().getCatalog().networkProfiles,
        localPlatform: process.platform
      });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:catalog', async (_e, { platform, profile, vendor } = {}) => {
    try {
      return ok(svc().getCatalog({ platform, profile, vendor }));
    } catch (err) { return fail(err); }
  });

  // --- Ejecución ----------------------------------------------------------------
  ipcMain.handle('forensics:start', async (event, options = {}) => {
    try {
      const sender = event.sender;
      const emit = (payload) => {
        if (sender && !sender.isDestroyed()) sender.send('forensics:progress', payload);
      };
      const result = await svc().startRun(options, {
        sshConnections: dependencies.sshConnections,
        emit
      });
      return ok(result);
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:cancel', async (_e, { caseId } = {}) => {
    try { return ok({ cancelled: svc().cancelRun(caseId) }); } catch (err) { return fail(err); }
  });

  // --- Casos --------------------------------------------------------------------
  ipcMain.handle('forensics:list-cases', async () => {
    try { return ok({ cases: await svc().listCases() }); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:get-case', async (_e, { caseId } = {}) => {
    try {
      const data = await svc().getCase(caseId);
      if (!data) return { success: false, error: 'Caso no encontrado' };
      return ok({ ...data, running: svc().isRunning(caseId) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:delete-case', async (_e, { caseId } = {}) => {
    try { await svc().deleteCase(caseId); return ok(); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:verify-case', async (_e, { caseId } = {}) => {
    try { return ok({ verification: await svc().verifyCase(caseId) }); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:read-artifact', async (_e, { caseId, collectorId, redact = true } = {}) => {
    try {
      const text = await svc().readArtifact(caseId, collectorId, { redact: redact !== false });
      if (text == null) return { success: false, error: 'Artefacto no encontrado' };
      return ok({ text });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:read-audit', async (_e, { caseId } = {}) => {
    try { return ok({ audit: await svc().readAudit(caseId) }); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:reanalyze', async (_e, { caseId } = {}) => {
    try {
      await svc().reanalyze(caseId);
      return ok({ case: await svc().getCase(caseId) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:open-case-folder', async (_e, { caseId } = {}) => {
    try {
      const dir = svc().store.getCaseDir(caseId);
      const error = await shell.openPath(dir);
      return error ? { success: false, error } : ok();
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:compare', async (_e, { baseId, currentId } = {}) => {
    try { return ok({ diff: await svc().compareCases(baseId, currentId) }); } catch (err) { return fail(err); }
  });

  // --- IOCs ---------------------------------------------------------------------
  ipcMain.handle('forensics:get-iocs', async () => {
    try { return ok({ iocs: await svc().loadIocs() }); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:save-iocs', async (_e, { iocs } = {}) => {
    try { return ok({ iocs: await svc().saveIocs(iocs) }); } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:import-iocs', async (event) => {
    try {
      const res = await dialog.showOpenDialog(getParentWindow(event, dependencies), {
        title: 'Importar IOCs (JSON, CSV o TXT)',
        properties: ['openFile'],
        filters: [{ name: 'IOCs', extensions: ['json', 'csv', 'txt'] }]
      });
      if (res.canceled || !res.filePaths[0]) return ok({ canceled: true });
      const raw = await fs.promises.readFile(res.filePaths[0], 'utf8');
      const { parseIocFile } = require('../services/forensics/rules/iocs');
      const imported = parseIocFile(raw, path.extname(res.filePaths[0]));
      const current = await svc().loadIocs();
      const merged = await svc().saveIocs({
        ips: [...current.ips, ...imported.ips],
        domains: [...current.domains, ...imported.domains],
        hashes: [...current.hashes, ...imported.hashes],
        strings: [...current.strings, ...imported.strings]
      });
      return ok({ iocs: merged, imported: imported.ips.length + imported.domains.length + imported.hashes.length + imported.strings.length });
    } catch (err) { return fail(err); }
  });

  // --- Informes y evidencias -------------------------------------------------------
  ipcMain.handle('forensics:export-report', async (event, { caseId, format = 'html', redact = true } = {}) => {
    try {
      const info = FORMAT_INFO[format];
      if (!info) return { success: false, error: 'Formato no soportado' };
      const data = await svc().getCase(caseId);
      if (!data) return { success: false, error: 'Caso no encontrado' };
      const host = (data.case?.target?.host || 'host').replace(/[^A-Za-z0-9.-]/g, '_');
      const res = await dialog.showSaveDialog(getParentWindow(event, dependencies), {
        title: 'Guardar informe forense',
        defaultPath: `informe-forense-${host}-${caseId.slice(0, 15)}.${info.ext}`,
        filters: [{ name: info.name, extensions: [info.ext] }]
      });
      if (res.canceled || !res.filePath) return ok({ canceled: true });

      if (format === 'pdf') {
        const html = await svc().buildReport(caseId, 'html', { redact });
        const pdf = await renderPdf(html);
        await fs.promises.writeFile(res.filePath, pdf);
      } else {
        const content = await svc().buildReport(caseId, format, { redact });
        await fs.promises.writeFile(res.filePath, content, 'utf8');
      }
      await svc().store.appendAudit(caseId, { event: 'report-exported', format, redacted: !!redact, file: path.basename(res.filePath) });
      await svc().store.writeManifest(caseId);
      return ok({ path: res.filePath });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:export-evidence', async (event, { caseId, redactReport = true } = {}) => {
    try {
      const res = await dialog.showSaveDialog(getParentWindow(event, dependencies), {
        title: 'Exportar paquete de evidencias',
        defaultPath: `evidencias-${caseId}.zip`,
        filters: [{ name: 'ZIP', extensions: ['zip'] }]
      });
      if (res.canceled || !res.filePath) return ok({ canceled: true });
      const out = await svc().exportEvidencePackage(caseId, res.filePath, { includeReport: true, redactReport });
      return ok({ path: out.path });
    } catch (err) { return fail(err); }
  });

  // --- IA ---------------------------------------------------------------------------
  ipcMain.handle('forensics:ai-get-settings', async () => {
    try {
      const ai = require('../services/forensics/ai');
      return ok({ settings: await ai.loadSettings(svc().store.baseDir) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:ai-save-settings', async (_e, { settings } = {}) => {
    try {
      const ai = require('../services/forensics/ai');
      return ok({ settings: await ai.saveSettings(svc().store.baseDir, settings || {}) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:ai-prompt', async (_e, { caseId } = {}) => {
    try {
      const ai = require('../services/forensics/ai');
      const data = await svc().getCase(caseId);
      if (!data) return { success: false, error: 'Caso no encontrado' };
      const settings = await ai.loadSettings(svc().store.baseDir);
      return ok({ prompt: ai.buildPrompt(data, { maxChars: settings.maxPromptChars }) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:ai-summary', async (_e, { caseId, confirmed } = {}) => {
    try {
      if (confirmed !== true) {
        return { success: false, error: 'Se requiere confirmación explícita del usuario para enviar datos a la IA' };
      }
      const ai = require('../services/forensics/ai');
      const data = await svc().getCase(caseId);
      if (!data) return { success: false, error: 'Caso no encontrado' };
      const settings = await ai.loadSettings(svc().store.baseDir, { withSecret: true });
      const prompt = ai.buildPrompt(data, { maxChars: settings.maxPromptChars });
      const summary = await ai.requestSummary(settings, prompt);
      const record = {
        generatedAt: new Date().toISOString(),
        model: settings.model,
        endpoint: settings.baseUrl,
        text: summary
      };
      await svc().store.saveDerived(caseId, 'ai-summary.json', record);
      await svc().store.appendAudit(caseId, { event: 'ai-summary', model: settings.model, endpoint: settings.baseUrl, promptChars: prompt.length });
      await svc().store.writeManifest(caseId);
      return ok({ summary: record });
    } catch (err) { return fail(err); }
  });

  // --- Modo "subir herramientas" -------------------------------------------------------
  ipcMain.handle('forensics:upload-tools-list', async () => {
    try {
      const upload = require('../services/forensics/uploadTools');
      return ok({ tools: upload.listUploadTools() });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:upload-tools-pick', async (event) => {
    try {
      const res = await dialog.showOpenDialog(getParentWindow(event, dependencies), {
        title: 'Seleccionar binario/script de la herramienta',
        properties: ['openFile']
      });
      if (res.canceled || !res.filePaths[0]) return ok({ canceled: true });
      const buf = await fs.promises.readFile(res.filePaths[0]);
      const { sha256 } = require('../services/forensics/EvidenceStore');
      return ok({ path: res.filePaths[0], size: buf.length, sha256: sha256(buf) });
    } catch (err) { return fail(err); }
  });

  ipcMain.handle('forensics:upload-tools-run', async (event, payload = {}) => {
    try {
      const upload = require('../services/forensics/uploadTools');
      const sender = event.sender;
      const emit = (p) => {
        if (sender && !sender.isDestroyed()) sender.send('forensics:progress', p);
      };
      const result = await upload.runUploadTool({
        service: svc(),
        sshConnections: dependencies.sshConnections,
        payload,
        emit
      });
      return ok(result);
    } catch (err) { return fail(err); }
  });
}

module.exports = { registerForensicsHandlers, getService };
