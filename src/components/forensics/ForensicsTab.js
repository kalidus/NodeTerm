import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Checkbox } from 'primereact/checkbox';
import { ProgressBar } from 'primereact/progressbar';
import {
  SEVERITY_COLOR, RISK_LABEL, invoke, ipc, notify, formatDate, platformLabel
} from './forensicsUtils';
import { NewAnalysisForm, DEFAULT_FORM, buildTarget } from './NewAnalysisForm';
import { CaseView } from './CaseView';
import { ComparePanel } from './ToolPanels';
import '../../styles/components/forensics.css';

// ---------------------------------------------------------------------------
// Estado de progreso por caso
// ---------------------------------------------------------------------------

function reduceProgress(prev, evt) {
  if (!evt || !evt.caseId || evt.upload) return prev;
  const cur = prev[evt.caseId] || { caseId: evt.caseId, total: 0, index: 0, items: [], phase: '', status: 'running' };
  const next = { ...cur };
  switch (evt.type) {
    case 'start':
      next.total = evt.total || 0;
      next.platform = evt.platform;
      next.host = evt.host;
      break;
    case 'phase':
      next.phase = evt.message || '';
      break;
    case 'collector-start':
      next.index = evt.index;
      next.total = evt.total || next.total;
      next.phase = evt.title;
      next.items = [...cur.items, { id: evt.collectorId, title: evt.title, status: 'running' }];
      break;
    case 'collector-done':
      next.items = cur.items.map((it) => (it.id === evt.collectorId
        ? { ...it, status: evt.ok ? 'ok' : 'warn', error: evt.error, durationMs: evt.durationMs }
        : it));
      break;
    case 'done':
    case 'error':
    case 'cancelled':
      next.status = evt.status || evt.type;
      next.error = evt.error || null;
      break;
    default:
      return prev;
  }
  return { ...prev, [evt.caseId]: next };
}

const RunProgress = ({ run, onCancel, cancelling }) => {
  if (!run) {
    return <div className="fx-scroll fx-muted">Iniciando recolección...</div>;
  }
  const pct = run.total ? Math.round(((run.items.filter((i) => i.status !== 'running').length) / run.total) * 100) : 0;
  return (
    <div className="fx-scroll">
      <h3 className="fx-title"><i className="pi pi-spin pi-spinner" /> Recolectando evidencias{run.host ? ` de ${run.host}` : ''}</h3>
      <p className="fx-sub">Plataforma: {platformLabel(run.platform)} · {run.phase}</p>
      <ProgressBar value={pct} />
      <div className="fx-row" style={{ margin: '10px 0' }}>
        <span className="fx-muted">{run.items.filter((i) => i.status !== 'running').length} / {run.total} colectores</span>
        <div className="fx-spacer" />
        <Button label="Cancelar" icon="pi pi-times" severity="danger" outlined size="small" loading={cancelling} onClick={onCancel} />
      </div>
      <div className="fx-card fx-progress-list">
        {run.items.map((it) => (
          <div key={it.id} className="fx-progress-item">
            {it.status === 'running' && <i className="pi pi-spin pi-spinner" />}
            {it.status === 'ok' && <i className="pi pi-check" style={{ color: '#22c55e' }} />}
            {it.status === 'warn' && <i className="pi pi-exclamation-triangle" style={{ color: '#eab308' }} />}
            <span>{it.title}</span>
            {it.error && <span className="fx-muted">({it.error})</span>}
            {it.durationMs != null && <span className="fx-muted">{(it.durationMs / 1000).toFixed(1)}s</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

const ForensicsTab = ({ tab }) => {
  const [view, setView] = useState('new'); // new | run | case | compare
  const [form, setForm] = useState(DEFAULT_FORM);
  const [sessions, setSessions] = useState([]);
  const [networkProfiles, setNetworkProfiles] = useState([{ id: 'generic', label: 'Genérico' }]);
  const [localPlatform, setLocalPlatform] = useState('win32');
  const [cases, setCases] = useState([]);
  const [activeCaseId, setActiveCaseId] = useState(null);
  const [runs, setRuns] = useState({});
  const [starting, setStarting] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSel, setCompareSel] = useState([]);
  const activeRef = useRef(null);
  activeRef.current = activeCaseId;

  const refreshCases = useCallback(async () => {
    try {
      const res = await invoke('forensics:list-cases');
      setCases(res.cases || []);
    } catch (_) { /* noop */ }
  }, []);

  const refreshTargets = useCallback(async () => {
    try {
      const res = await invoke('forensics:list-targets');
      setSessions(res.sessions || []);
      setNetworkProfiles(res.networkProfiles?.length ? res.networkProfiles : [{ id: 'generic', label: 'Genérico' }]);
      setLocalPlatform(res.localPlatform || 'win32');
    } catch (_) { /* noop */ }
  }, []);

  useEffect(() => { refreshCases(); refreshTargets(); }, [refreshCases, refreshTargets]);

  // Eventos de progreso
  useEffect(() => {
    const api = ipc();
    if (!api) return undefined;
    const handler = (evt) => {
      setRuns((prev) => reduceProgress(prev, evt));
      if (evt && !evt.upload && ['done', 'error', 'cancelled'].includes(evt.type)) {
        refreshCases();
        if (activeRef.current === evt.caseId) {
          setView('case');
          setRefreshKey((k) => k + 1);
          setCancelling(false);
        }
      }
    };
    const off = api.on('forensics:progress', handler);
    return () => { if (typeof off === 'function') off(); else api.removeListener('forensics:progress', handler); };
  }, [refreshCases]);

  // Objetivo inicial (desde el menú contextual o la barra de herramientas)
  useEffect(() => {
    const t = tab?.initialTarget;
    if (!t) return;
    refreshTargets();
    setView('new');
    if (t.tabId || t.kind === 'ssh-session') {
      setForm((f) => ({ ...f, targetKind: 'ssh-session', tabId: t.tabId || t.id || f.tabId }));
    } else if (t.kind === 'local') {
      setForm((f) => ({ ...f, targetKind: 'local' }));
    } else if (t.host) {
      setForm((f) => ({ ...f, targetKind: 'ssh-direct', host: t.host, port: t.port || 22, username: t.username || '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab?.targetNonce]);

  // Selección automática de la primera sesión usable
  useEffect(() => {
    if (form.targetKind === 'ssh-session' && !form.tabId) {
      const first = sessions.find((s) => s.usable);
      if (first) setForm((f) => ({ ...f, tabId: first.tabId }));
    }
  }, [sessions, form.targetKind, form.tabId]);

  const startRun = async () => {
    setError(null);
    setStarting(true);
    try {
      const collectorIds = form.excluded.length
        ? (await invoke('forensics:catalog', {
          platform: form.platform === 'auto' ? (form.targetKind === 'local' ? (localPlatform === 'win32' ? 'windows' : 'linux') : null) : form.platform,
          profile: form.profile,
          vendor: form.vendor
        })).collectors.map((c) => c.id).filter((id) => !form.excluded.includes(id))
        : undefined;
      const res = await invoke('forensics:start', {
        target: buildTarget(form),
        platform: form.platform,
        vendor: form.vendor,
        profile: form.profile,
        sudo: form.sudo,
        notes: form.notes,
        collectorIds
      });
      // Limpiar credenciales del formulario en memoria
      setForm((f) => ({ ...f, password: '', privateKey: '', passphrase: '' }));
      setActiveCaseId(res.caseId);
      setView('run');
      setRuns((prev) => (prev[res.caseId] ? prev : { ...prev, [res.caseId]: { caseId: res.caseId, total: res.total, index: 0, items: [], phase: '', status: 'running', platform: res.platform } }));
      refreshCases();
    } catch (e) {
      setError(e.message);
    } finally { setStarting(false); }
  };

  const cancelRun = async () => {
    if (!activeCaseId) return;
    setCancelling(true);
    try { await invoke('forensics:cancel', { caseId: activeCaseId }); } catch (e) { notify('error', 'Forense', e.message); setCancelling(false); }
  };

  const openCase = (caseId) => {
    if (compareMode) {
      setCompareSel((prev) => {
        if (prev.includes(caseId)) return prev.filter((x) => x !== caseId);
        return prev.length >= 2 ? [prev[1], caseId] : [...prev, caseId];
      });
      return;
    }
    setActiveCaseId(caseId);
    const running = runs[caseId]?.status === 'running';
    setView(running ? 'run' : 'case');
  };

  const onDeleted = (caseId) => {
    setActiveCaseId(null);
    setView('new');
    setRuns((prev) => { const n = { ...prev }; delete n[caseId]; return n; });
    refreshCases();
  };

  const compareOrdered = useMemo(() => {
    if (compareSel.length !== 2) return null;
    const [a, b] = compareSel.map((id) => cases.find((c) => c.caseId === id));
    if (!a || !b) return null;
    return String(a.createdAt) <= String(b.createdAt) ? { base: a, current: b } : { base: b, current: a };
  }, [compareSel, cases]);

  const toggleCompare = () => {
    setCompareMode((v) => !v);
    setCompareSel([]);
    if (compareMode && view === 'compare') setView(activeCaseId ? 'case' : 'new');
  };

  const uploadTarget = useMemo(() => {
    try {
      const t = buildTarget(form);
      if (t.kind === 'ssh-session' && !t.tabId) return null;
      return t;
    } catch (_) { return null; }
  }, [form]);

  const goNew = () => { refreshTargets(); setView('new'); setCompareMode(false); setCompareSel([]); };

  return (
    <div className="fx-root">
      <div className="fx-sidebar">
        <div className="fx-sidebar-head">
          <div className="fx-sidebar-title"><i className="pi pi-search" /> Análisis forense</div>
          <div className="fx-row">
            <Button label="Nuevo análisis" icon="pi pi-plus" size="small" onClick={goNew} style={{ flex: 1 }} />
            <Button icon="pi pi-arrows-h" size="small" outlined={!compareMode} tooltip="Comparar dos casos" onClick={toggleCompare} disabled={cases.length < 2} />
          </div>
          {compareMode && (
            <div className="fx-muted">
              Selecciona dos casos ({compareSel.length}/2)
              <Button label="Comparar" size="small" className="p-button-sm" style={{ marginLeft: 8 }} disabled={!compareOrdered} onClick={() => setView('compare')} />
            </div>
          )}
        </div>
        <div className="fx-cases">
          {cases.length === 0 && <div className="fx-muted" style={{ padding: 8 }}>Aún no hay casos. Inicia un análisis.</div>}
          {cases.map((c) => {
            const risk = c.summary?.risk || (c.status === 'running' ? null : 'none');
            const running = runs[c.caseId]?.status === 'running' || c.status === 'running';
            return (
              <div key={c.caseId} className={`fx-case-item ${activeCaseId === c.caseId && !compareMode ? 'active' : ''}`} onClick={() => openCase(c.caseId)}>
                {compareMode && <Checkbox checked={compareSel.includes(c.caseId)} onChange={() => openCase(c.caseId)} />}
                <div className="fx-case-main">
                  <div className="fx-case-host">{c.target?.label || c.target?.host}</div>
                  <div className="fx-case-meta">{platformLabel(c.target?.platform)} · {formatDate(c.createdAt)}</div>
                  <div className="fx-case-meta">
                    {running ? <><i className="pi pi-spin pi-spinner" /> en curso</> : (
                      <>
                        {c.status !== 'completed' && <span>{c.status} · </span>}
                        {c.findingsCount != null ? `${c.findingsCount} hallazgos` : ''}
                      </>
                    )}
                  </div>
                </div>
                {risk && (
                  <span className="fx-badge" style={{ background: SEVERITY_COLOR[risk] || SEVERITY_COLOR.none }}>{RISK_LABEL[risk] || risk}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="fx-main">
        {view === 'new' && (
          <div className="fx-scroll">
            <div style={{ maxWidth: 860 }}>
              <NewAnalysisForm
                form={form}
                setForm={setForm}
                sessions={sessions}
                networkProfiles={networkProfiles}
                localPlatform={localPlatform}
                starting={starting}
                onStart={startRun}
                error={error}
              />
            </div>
          </div>
        )}
        {view === 'run' && <RunProgress run={runs[activeCaseId]} onCancel={cancelRun} cancelling={cancelling} />}
        {view === 'case' && activeCaseId && (
          <CaseView
            key={activeCaseId}
            caseId={activeCaseId}
            refreshKey={refreshKey}
            onDeleted={onDeleted}
            onChanged={refreshCases}
            uploadTarget={uploadTarget}
          />
        )}
        {view === 'compare' && compareOrdered && (
          <div className="fx-scroll">
            <h3 className="fx-title"><i className="pi pi-arrows-h" /> Comparación de casos</h3>
            <ComparePanel baseId={compareOrdered.base.caseId} currentId={compareOrdered.current.caseId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ForensicsTab;
