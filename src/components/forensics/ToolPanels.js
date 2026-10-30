import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Checkbox } from 'primereact/checkbox';
import { Dropdown } from 'primereact/dropdown';
import { invoke, notify, formatDate, formatBytes, ipc } from './forensicsUtils';
import { SeverityBadge } from './CasePanels';

// ---------------------------------------------------------------------------
// IA: resumen asistido (siempre con datos redactados y confirmación)
// ---------------------------------------------------------------------------

export const AiPanel = ({ caseId, aiSummary, onSummary }) => {
  const [settings, setSettings] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [prompt, setPrompt] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    invoke('forensics:ai-get-settings').then((r) => setSettings(r.settings)).catch((e) => setError(e.message));
  }, []);

  const save = async () => {
    setError(null);
    try {
      const payload = { ...settings };
      if (apiKey) payload.apiKey = apiKey;
      const res = await invoke('forensics:ai-save-settings', { settings: payload });
      setSettings(res.settings);
      setApiKey('');
      notify('success', 'IA', 'Configuración guardada');
    } catch (e) { setError(e.message); }
  };

  const clearKey = async () => {
    try {
      const res = await invoke('forensics:ai-save-settings', { settings: { ...settings, apiKey: '' } });
      setSettings(res.settings);
    } catch (e) { setError(e.message); }
  };

  const loadPrompt = async () => {
    setError(null);
    try {
      const res = await invoke('forensics:ai-prompt', { caseId });
      setPrompt(res.prompt);
      setConfirm(false);
    } catch (e) { setError(e.message); }
  };

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await invoke('forensics:ai-summary', { caseId, confirmed: true });
      onSummary(res.summary);
      setConfirm(false);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      notify('success', 'IA', 'Prompt copiado al portapapeles');
    } catch (_) { notify('warn', 'IA', 'No se pudo copiar'); }
  };

  if (!settings) return <div className="fx-muted">Cargando...</div>;
  const set = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  return (
    <div>
      <div className="fx-card">
        <h4>Endpoint compatible con la API de OpenAI</h4>
        <p className="fx-muted" style={{ marginTop: 0 }}>
          Ollama, LM Studio, AnythingLLM, LiteLLM u OpenAI. Los datos se envían <b>siempre redactados</b> (sin contraseñas, tokens ni claves) y solo tras tu confirmación.
        </p>
        <div className="fx-grid">
          <div className="fx-field">
            <label>URL base</label>
            <InputText value={settings.baseUrl || ''} onChange={(e) => set('baseUrl', e.target.value)} placeholder="http://localhost:11434/v1" />
          </div>
          <div className="fx-field">
            <label>Modelo</label>
            <InputText value={settings.model || ''} onChange={(e) => set('model', e.target.value)} placeholder="llama3.1, gpt-4o-mini..." />
          </div>
          <div className="fx-field">
            <label>API key {settings.hasApiKey ? '(guardada, cifrada)' : '(opcional)'}</label>
            <InputText type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={settings.hasApiKey ? '••••••••' : ''} autoComplete="off" />
          </div>
          <div className="fx-field">
            <label>Máx. caracteres del prompt</label>
            <InputText type="number" value={settings.maxPromptChars || 24000} onChange={(e) => set('maxPromptChars', Number(e.target.value))} />
          </div>
        </div>
        <div className="fx-row" style={{ marginTop: 8 }}>
          <Button label="Guardar configuración" icon="pi pi-save" size="small" onClick={save} />
          {settings.hasApiKey && <Button label="Borrar API key" icon="pi pi-trash" size="small" severity="danger" outlined onClick={clearKey} />}
        </div>
      </div>

      {error && <div className="fx-error">{error}</div>}

      <div className="fx-card">
        <h4>Resumen del caso</h4>
        <div className="fx-row">
          <Button label="Previsualizar datos a enviar" icon="pi pi-eye" size="small" outlined onClick={loadPrompt} />
          {prompt && <Button label="Copiar prompt" icon="pi pi-copy" size="small" outlined onClick={copyPrompt} />}
        </div>
        {prompt && (
          <>
            <pre className="fx-pre" style={{ maxHeight: 280, marginTop: 8 }}>{prompt}</pre>
            <p className="fx-muted" style={{ margin: '4px 0' }}>
              Puedes copiar este prompt y usarlo con cualquier asistente (chat, MCP). {prompt.length} caracteres.
            </p>
            <label className="fx-row" style={{ gap: 6, cursor: 'pointer', margin: '6px 0' }}>
              <Checkbox checked={confirm} onChange={(e) => setConfirm(e.checked)} />
              He revisado los datos y autorizo enviarlos a <b>{settings.baseUrl}</b>
            </label>
            <Button label="Generar resumen con IA" icon="pi pi-bolt" size="small" disabled={!confirm || !settings.model} loading={busy} onClick={send} />
            {!settings.model && <span className="fx-muted" style={{ marginLeft: 8 }}>Indica un modelo.</span>}
          </>
        )}
      </div>

      {aiSummary && (
        <div className="fx-card">
          <h4>Resumen generado</h4>
          <div className="fx-muted" style={{ marginBottom: 6 }}>
            {formatDate(aiSummary.generatedAt)} · modelo {aiSummary.model} · {aiSummary.endpoint}
          </div>
          <div className="fx-warn">Contenido generado por IA: verifícalo antes de actuar. No sustituye al análisis forense.</div>
          <div className="fx-ai-text">{aiSummary.text}</div>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// IOCs
// ---------------------------------------------------------------------------

const IOC_FIELDS = [
  { key: 'ips', label: 'IPs / CIDR', placeholder: '203.0.113.7' },
  { key: 'domains', label: 'Dominios', placeholder: 'evil.example.com' },
  { key: 'hashes', label: 'Hashes (MD5/SHA1/SHA256)', placeholder: 'e3b0c442...' },
  { key: 'strings', label: 'Cadenas / rutas', placeholder: '/tmp/.x/miner' }
];

export const IocsPanel = ({ onChanged }) => {
  const [iocs, setIocs] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    invoke('forensics:get-iocs').then((r) => setIocs(r.iocs)).catch((e) => setError(e.message));
  }, []);

  const toText = (arr) => (arr || []).join('\n');
  const setField = (key, text) => setIocs((s) => ({ ...s, [key]: text.split('\n') }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await invoke('forensics:save-iocs', { iocs });
      setIocs(res.iocs);
      notify('success', 'IOCs', 'Lista guardada. Usa "Re-analizar" para aplicarla al caso actual.');
      onChanged && onChanged();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const importFile = async () => {
    setError(null);
    try {
      const res = await invoke('forensics:import-iocs');
      if (res.canceled) return;
      setIocs(res.iocs);
      notify('success', 'IOCs', `${res.imported} indicadores importados`);
    } catch (e) { setError(e.message); }
  };

  if (!iocs) return <div className="fx-muted">Cargando...</div>;
  return (
    <div>
      <p className="fx-muted" style={{ marginTop: 0 }}>
        Un indicador por línea. Se buscan en todos los artefactos recolectados. Puedes importar ficheros JSON, CSV o TXT.
      </p>
      {error && <div className="fx-error">{error}</div>}
      <div className="fx-grid">
        {IOC_FIELDS.map((f) => (
          <div className="fx-field" key={f.key}>
            <label>{f.label} ({(iocs[f.key] || []).filter((x) => String(x).trim()).length})</label>
            <InputTextarea className="fx-textarea" rows={6} value={toText(iocs[f.key])} placeholder={f.placeholder} onChange={(e) => setField(f.key, e.target.value)} />
          </div>
        ))}
      </div>
      <div className="fx-row" style={{ marginTop: 10 }}>
        <Button label="Guardar" icon="pi pi-save" size="small" loading={busy} onClick={save} />
        <Button label="Importar fichero..." icon="pi pi-upload" size="small" outlined onClick={importFile} />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Modo "subir herramientas de confianza"
// ---------------------------------------------------------------------------

export const UploadToolsPanel = ({ target, platform, caseId, onFinished, running, setRunning }) => {
  const [tools, setTools] = useState([]);
  const [toolId, setToolId] = useState(null);
  const [file, setFile] = useState(null);
  const [expected, setExpected] = useState('');
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  useEffect(() => {
    invoke('forensics:upload-tools-list').then((r) => setTools(r.tools || [])).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const api = ipc();
    if (!api) return undefined;
    const off = api.on('forensics:progress', (p) => {
      if (p?.upload && p.title) setProgress(p.title);
    });
    return () => { if (typeof off === 'function') off(); };
  }, []);

  const effPlatform = platform === 'windows' ? 'windows' : 'linux';
  const available = tools.filter((t) => t.platforms.includes(effPlatform));
  const tool = tools.find((t) => t.id === toolId);
  const sshOk = target && (target.kind === 'ssh-session' || target.kind === 'ssh-direct');
  const hashMatches = file && expected.trim().toLowerCase() === file.sha256;

  const pick = async () => {
    setError(null);
    try {
      const res = await invoke('forensics:upload-tools-pick');
      if (res.canceled) return;
      setFile(res);
    } catch (e) { setError(e.message); }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await invoke('forensics:upload-tools-run', {
        toolId,
        target,
        platform: effPlatform,
        caseId: caseId || null,
        localPath: file.path,
        expectedSha256: expected.trim().toLowerCase(),
        confirmModify: true
      });
      notify('success', 'Herramienta', 'Ejecución completada');
      setFile(null);
      setExpected('');
      setConfirm(false);
      onFinished && onFinished(res.caseId);
    } catch (e) { setError(e.message); } finally { setRunning(false); setProgress(''); }
  };

  return (
    <div>
      <div className="fx-warn">
        <b>Este modo modifica el host objetivo.</b> Copia un binario a un directorio temporal, lo ejecuta y lo elimina al terminar.
        Usa únicamente herramientas descargadas de su fuente oficial y verifica su hash. Quedará registrado en la cadena de custodia.
      </div>
      {!sshOk && <div className="fx-error">Selecciona un objetivo SSH (sesión abierta o conexión manual) en "Nuevo análisis" para usar este modo.</div>}
      {error && <div className="fx-error">{error}</div>}
      <div className="fx-grid">
        <div className="fx-field">
          <label>Herramienta ({effPlatform === 'windows' ? 'Windows' : 'Linux'})</label>
          <Dropdown value={toolId} options={available.map((t) => ({ label: t.label, value: t.id }))} onChange={(e) => setToolId(e.value)} placeholder="Elige una herramienta" />
        </div>
        <div className="fx-field">
          <label>Fichero local</label>
          <div className="fx-row">
            <Button label="Seleccionar..." icon="pi pi-folder-open" size="small" outlined onClick={pick} />
            {file && <span className="fx-mono">{file.path.split(/[\\/]/).pop()} · {formatBytes(file.size)}</span>}
          </div>
        </div>
      </div>
      {tool && (
        <p className="fx-muted">
          {tool.description} · Fichero esperado: <span className="fx-mono">{tool.fileHint}</span> ·{' '}
          <a href={tool.homepage} target="_blank" rel="noreferrer">sitio oficial</a>
        </p>
      )}
      {file && (
        <div className="fx-field" style={{ marginTop: 6 }}>
          <label>SHA-256 calculado del fichero</label>
          <div className="fx-mono" style={{ wordBreak: 'break-all' }}>{file.sha256}</div>
          <label style={{ marginTop: 6 }}>SHA-256 esperado (cópialo de la página oficial)</label>
          <InputText value={expected} onChange={(e) => setExpected(e.target.value)} className="fx-mono" placeholder="64 caracteres hexadecimales" />
          {expected.trim() && (
            <span style={{ color: hashMatches ? '#22c55e' : '#ef4444' }}>
              {hashMatches ? 'Coincide' : 'No coincide'}
            </span>
          )}
        </div>
      )}
      <label className="fx-row" style={{ gap: 6, cursor: 'pointer', margin: '10px 0' }}>
        <Checkbox checked={confirm} onChange={(e) => setConfirm(e.checked)} />
        Entiendo que se modificará el host y acepto ejecutar esta herramienta
      </label>
      <Button label="Subir y ejecutar" icon="pi pi-play" severity="warning" size="small" loading={running}
        disabled={!sshOk || !tool || !hashMatches || !confirm} onClick={run} />
      {running && progress && <span className="fx-muted" style={{ marginLeft: 8 }}>{progress}...</span>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Comparación entre dos casos
// ---------------------------------------------------------------------------

export const ComparePanel = ({ baseId, currentId }) => {
  const [diff, setDiff] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    setDiff(null);
    try {
      const res = await invoke('forensics:compare', { baseId, currentId });
      setDiff(res.diff);
    } catch (e) { setError(e.message); }
  }, [baseId, currentId]);

  useEffect(() => { load(); }, [load]);

  if (error) return <div className="fx-error">{error}</div>;
  if (!diff) return <div className="fx-muted">Comparando...</div>;
  return (
    <div>
      {!diff.sameHost && <div className="fx-warn">Los casos pertenecen a hosts distintos ({diff.base.host} / {diff.current.host}).</div>}
      <div className="fx-muted" style={{ marginBottom: 8 }}>
        Base: {diff.base.host} ({formatDate(diff.base.createdAt)}) → Actual: {diff.current.host} ({formatDate(diff.current.createdAt)})
      </div>
      <div className="fx-card">
        <h4>Hallazgos</h4>
        <div>{diff.findings.unchanged} sin cambios</div>
        {diff.findings.new.map((f, i) => (
          <div key={`n${i}`}><span className="fx-diff-add">+ nuevo</span> <SeverityBadge severity={f.severity} /> {f.title}</div>
        ))}
        {diff.findings.resolved.map((f, i) => (
          <div key={`r${i}`}><span className="fx-diff-del">− desaparecido</span> <SeverityBadge severity={f.severity} /> {f.title}</div>
        ))}
      </div>
      {diff.sections.length === 0 && <div className="fx-ok">Sin diferencias en las secciones comparables.</div>}
      {diff.sections.map((s) => (
        <div className="fx-card" key={s.collectorId}>
          <h4>{s.title} <span className="fx-diff-add">+{s.addedCount}</span> <span className="fx-diff-del">−{s.removedCount}</span></h4>
          <div className="fx-mono" style={{ maxHeight: 220, overflow: 'auto' }}>
            {s.added.map((k, i) => <div key={`a${i}`} className="fx-diff-add">+ {k}</div>)}
            {s.removed.map((k, i) => <div key={`d${i}`} className="fx-diff-del">− {k}</div>)}
          </div>
        </div>
      ))}
    </div>
  );
};
