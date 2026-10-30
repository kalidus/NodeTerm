import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Checkbox } from 'primereact/checkbox';
import {
  SEVERITIES, SEVERITY_LABEL, SEVERITY_COLOR, RISK_LABEL, CATEGORY_LABEL,
  invoke, formatBytes, formatDate, tryParseJsonRows, cellText
} from './forensicsUtils';

export const SeverityBadge = ({ severity }) => (
  <span className="fx-badge" style={{ background: SEVERITY_COLOR[severity] || SEVERITY_COLOR.info }}>
    {SEVERITY_LABEL[severity] || severity}
  </span>
);

// ---------------------------------------------------------------------------
// Resumen + hallazgos
// ---------------------------------------------------------------------------

const FACT_LABELS = {
  hostname: 'Host', os: 'Sistema', kernel: 'Kernel', arch: 'Arquitectura', uptime: 'Uptime',
  listeningCount: 'Puertos en escucha', establishedCount: 'Conexiones establecidas', processCount: 'Procesos'
};

const FindingItem = ({ finding, onOpenArtifact }) => {
  const [open, setOpen] = useState(finding.severity === 'critical' || finding.severity === 'high');
  const color = SEVERITY_COLOR[finding.severity] || SEVERITY_COLOR.info;
  return (
    <div className="fx-finding" style={{ borderLeftColor: color }}>
      <div className="fx-finding-head" onClick={() => setOpen((v) => !v)}>
        <i className={`pi ${open ? 'pi-chevron-down' : 'pi-chevron-right'}`} />
        <SeverityBadge severity={finding.severity} />
        <span className="fx-finding-title">{finding.title}</span>
        <span className="fx-muted">{finding.id}{finding.count > 1 ? ` · ${finding.count} coincidencias` : ''}</span>
      </div>
      {open && (
        <div className="fx-finding-body">
          {finding.description && <p style={{ margin: '0 0 6px' }}>{finding.description}</p>}
          {(finding.mitre || []).length > 0 && (
            <div style={{ marginBottom: 6 }}>
              {finding.mitre.map((m) => (
                <span key={m.id} className="fx-chip" title={m.tactic}>{m.id} · {m.name}</span>
              ))}
            </div>
          )}
          {(finding.evidence || []).map((e, i) => (
            <div key={i} className="fx-evidence">
              <span className="fx-muted" style={{ cursor: 'pointer' }} onClick={() => onOpenArtifact && onOpenArtifact(e.collectorId)}>
                [{e.collectorId}]
              </span>{' '}
              {e.excerpt}
            </div>
          ))}
          {finding.recommendation && (
            <p style={{ margin: '8px 0 0' }}><b>Recomendación:</b> {finding.recommendation}</p>
          )}
        </div>
      )}
    </div>
  );
};

export const SummaryPanel = ({ caseData, findings, onOpenArtifact }) => {
  const [filter, setFilter] = useState(() => new Set(SEVERITIES));
  const summary = findings?.summary;
  const list = (findings?.findings || []).filter((f) => filter.has(f.severity));
  const facts = findings?.facts || {};
  const failed = (caseData?.artifacts || []).filter((a) => a.ok === false);

  const toggle = (s) => setFilter((prev) => {
    const next = new Set(prev);
    if (next.has(s)) next.delete(s); else next.add(s);
    return next;
  });

  return (
    <div>
      {summary && (
        <div className="fx-card">
          <div className="fx-risk">
            <div className="fx-risk-score" style={{ borderColor: SEVERITY_COLOR[summary.risk] || SEVERITY_COLOR.none, color: SEVERITY_COLOR[summary.risk] || SEVERITY_COLOR.none }}>
              {summary.score}
              <small>/100</small>
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600 }}>Riesgo: {RISK_LABEL[summary.risk] || summary.risk}</div>
              <div className="fx-muted">{summary.total} hallazgos{summary.tactics?.length ? ` · tácticas: ${summary.tactics.join(', ')}` : ''}</div>
            </div>
            <div className="fx-spacer" />
            <div className="fx-counts">
              {SEVERITIES.map((s) => (
                <div key={s} className="fx-count" style={{ borderColor: SEVERITY_COLOR[s] }}>
                  <b>{summary.counts?.[s] || 0}</b>
                  <span className="fx-muted">{SEVERITY_LABEL[s]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {Object.keys(facts).some((k) => FACT_LABELS[k] && facts[k] != null) && (
        <div className="fx-card">
          <h4>Datos del host</h4>
          <div className="fx-grid">
            {Object.keys(FACT_LABELS).filter((k) => facts[k] != null && facts[k] !== '').map((k) => (
              <div key={k}><span className="fx-muted">{FACT_LABELS[k]}: </span>{String(facts[k])}</div>
            ))}
          </div>
        </div>
      )}

      {failed.length > 0 && (
        <div className="fx-warn">
          <b>{failed.length} colector(es) con problemas</b> (el análisis puede estar incompleto):{' '}
          {failed.slice(0, 6).map((a) => `${a.collectorId}${a.error ? ` (${a.error})` : ''}`).join('; ')}
          {failed.length > 6 ? '…' : ''}
        </div>
      )}

      <div className="fx-row" style={{ marginBottom: 8 }}>
        <b>Hallazgos</b>
        <div className="fx-spacer" />
        {SEVERITIES.map((s) => (
          <label key={s} className="fx-row" style={{ gap: 4, cursor: 'pointer' }}>
            <Checkbox checked={filter.has(s)} onChange={() => toggle(s)} />
            <span style={{ color: SEVERITY_COLOR[s] }}>{SEVERITY_LABEL[s]}</span>
          </label>
        ))}
      </div>

      {list.length === 0 && (
        <div className="fx-ok">
          {(findings?.findings || []).length === 0
            ? 'No se han detectado indicadores con las reglas actuales. Esto no garantiza que el host esté limpio: revisa también los artefactos.'
            : 'No hay hallazgos con los filtros seleccionados.'}
        </div>
      )}
      {list.map((f) => <FindingItem key={f.id} finding={f} onOpenArtifact={onOpenArtifact} />)}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Visor de artefactos (texto o tabla JSON)
// ---------------------------------------------------------------------------

const MAX_ROWS = 800;
const MAX_LINES = 4000;

const JsonTable = ({ rows, filter }) => {
  const { columns, shown, total } = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const filtered = f ? rows.filter((r) => Object.values(r).some((v) => cellText(v).toLowerCase().includes(f))) : rows;
    const cols = [];
    filtered.slice(0, 200).forEach((r) => Object.keys(r).forEach((k) => { if (!cols.includes(k)) cols.push(k); }));
    return { columns: cols.slice(0, 14), shown: filtered.slice(0, MAX_ROWS), total: filtered.length };
  }, [rows, filter]);
  return (
    <>
      <div className="fx-table-wrap">
        <table className="fx-table">
          <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>{columns.map((c) => <td key={c} className="fx-mono">{cellText(r[c])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="fx-muted">{total} filas{total > MAX_ROWS ? ` (mostrando ${MAX_ROWS})` : ''}</div>
    </>
  );
};

export const ArtifactViewer = ({ caseId, artifacts, initialId, onSelect }) => {
  const [selected, setSelected] = useState(initialId || artifacts[0]?.collectorId || null);
  const [redact, setRedact] = useState(true);
  const [filter, setFilter] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialId) setSelected(initialId);
  }, [initialId]);

  useEffect(() => {
    if (!selected || !artifacts.some((a) => a.collectorId === selected)) {
      setSelected(artifacts[0]?.collectorId || null);
    }
  }, [artifacts, selected]);

  useEffect(() => {
    let cancelled = false;
    if (!selected) { setText(''); return undefined; }
    setLoading(true);
    setError(null);
    invoke('forensics:read-artifact', { caseId, collectorId: selected, redact })
      .then((res) => { if (!cancelled) setText(res.text || ''); })
      .catch((err) => { if (!cancelled) { setText(''); setError(err.message); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [caseId, selected, redact]);

  const current = artifacts.find((a) => a.collectorId === selected);
  const rows = useMemo(() => tryParseJsonRows(text), [text]);
  const lines = useMemo(() => {
    if (rows) return null;
    const f = filter.trim().toLowerCase();
    const all = text.split('\n');
    const filtered = f ? all.filter((l) => l.toLowerCase().includes(f)) : all;
    return { shown: filtered.slice(0, MAX_LINES), total: filtered.length };
  }, [text, filter, rows]);

  if (!artifacts.length) return <div className="fx-muted">No hay artefactos en esta categoría.</div>;

  return (
    <div className="fx-viewer">
      <div className="fx-viewer-list">
        {artifacts.map((a) => (
          <div
            key={a.collectorId}
            className={`fx-viewer-item ${a.collectorId === selected ? 'active' : ''}`}
            onClick={() => { setSelected(a.collectorId); onSelect && onSelect(a.collectorId); }}
          >
            <div>
              {a.ok === false && <i className="pi pi-exclamation-triangle" style={{ color: '#eab308', marginRight: 4 }} />}
              {a.title || a.collectorId}
            </div>
            <div className="fx-muted fx-mono">{a.collectorId} · {formatBytes(a.size)}</div>
          </div>
        ))}
      </div>
      <div className="fx-viewer-body">
        <div className="fx-row">
          <InputText value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filtrar..." style={{ flex: 1, minWidth: 160 }} />
          <label className="fx-row" style={{ gap: 4, cursor: 'pointer' }}>
            <Checkbox checked={redact} onChange={(e) => setRedact(e.checked)} />
            Ocultar secretos
          </label>
        </div>
        {current && (
          <div className="fx-muted fx-mono" style={{ wordBreak: 'break-all' }}>
            $ {current.command}
          </div>
        )}
        {current?.error && <div className="fx-warn">{current.error}</div>}
        {current?.truncated && <div className="fx-warn">La salida se truncó por tamaño.</div>}
        {error && <div className="fx-error">{error}</div>}
        {loading ? <div className="fx-muted">Cargando...</div> : rows
          ? <JsonTable rows={rows} filter={filter} />
          : (
            <>
              <pre className="fx-pre">{lines.shown.join('\n') || '(sin salida)'}</pre>
              <div className="fx-muted">{lines.total} líneas{lines.total > MAX_LINES ? ` (mostrando ${MAX_LINES})` : ''}</div>
            </>
          )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Línea de tiempo
// ---------------------------------------------------------------------------

export const TimelinePanel = ({ timeline }) => {
  const events = timeline?.events || [];
  const [filter, setFilter] = useState('');
  const [type, setType] = useState('');
  const types = useMemo(() => Array.from(new Set(events.map((e) => e.type))).sort(), [events]);
  const shown = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return events.filter((e) => (!type || e.type === type) && (!f || `${e.text} ${e.source}`.toLowerCase().includes(f)));
  }, [events, filter, type]);

  if (!events.length) return <div className="fx-muted">No hay eventos con marca de tiempo en esta recolección.</div>;
  return (
    <div>
      <div className="fx-row" style={{ marginBottom: 8 }}>
        <InputText value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Buscar en la línea de tiempo..." style={{ flex: 1, minWidth: 200 }} />
        <select value={type} onChange={(e) => setType(e.target.value)} className="p-inputtext" style={{ minWidth: 160 }}>
          <option value="">Todos los tipos</option>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="fx-muted">{shown.length} / {events.length} eventos (UTC)</span>
      </div>
      <div className="fx-table-wrap">
        <table className="fx-table">
          <thead><tr><th>Fecha (UTC)</th><th>Tipo</th><th>Evento</th></tr></thead>
          <tbody>
            {shown.slice(0, 1500).map((e, i) => (
              <tr key={i}>
                <td className="fx-mono" style={{ whiteSpace: 'nowrap' }}>{String(e.ts).replace('T', ' ').replace(/\.\d+Z$|Z$/, '')}</td>
                <td><span className="fx-chip">{e.type}</span></td>
                <td className="fx-mono">{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > 1500 && <div className="fx-muted">Mostrando los primeros 1500 eventos; usa el filtro para acotar.</div>}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Tabla de artefactos + integridad + auditoría
// ---------------------------------------------------------------------------

export const ArtifactsPanel = ({ caseId, artifacts, onOpenArtifact }) => {
  const [verification, setVerification] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [audit, setAudit] = useState(null);
  const [error, setError] = useState(null);

  const verify = async () => {
    setVerifying(true);
    setError(null);
    try {
      const res = await invoke('forensics:verify-case', { caseId });
      setVerification(res.verification);
    } catch (err) { setError(err.message); } finally { setVerifying(false); }
  };

  const loadAudit = async () => {
    try {
      const res = await invoke('forensics:read-audit', { caseId });
      setAudit(res.audit);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <div className="fx-row" style={{ marginBottom: 8 }}>
        <Button label="Verificar integridad" icon="pi pi-shield" size="small" loading={verifying} onClick={verify} />
        <Button label={audit ? 'Recargar auditoría' : 'Ver registro de auditoría'} icon="pi pi-list" size="small" outlined onClick={loadAudit} />
      </div>
      {error && <div className="fx-error">{error}</div>}
      {verification && (
        <div className={verification.ok ? 'fx-ok' : 'fx-error'}>
          {verification.ok
            ? `Integridad correcta: ${verification.checked} artefactos verificados, manifiesto y auditoría coinciden.`
            : `Integridad COMPROMETIDA. Alterados: ${verification.mismatches.join(', ') || '-'} · Faltan: ${verification.missing.join(', ') || '-'} · Manifiesto: ${verification.manifestOk ? 'ok' : 'no coincide'}`}
        </div>
      )}
      <div className="fx-table-wrap">
        <table className="fx-table">
          <thead><tr><th>Colector</th><th>Categoría</th><th>Tamaño</th><th>SHA-256</th><th>Recogido</th><th /></tr></thead>
          <tbody>
            {artifacts.map((a) => (
              <tr key={a.collectorId}>
                <td>{a.ok === false && <i className="pi pi-exclamation-triangle" style={{ color: '#eab308' }} />} {a.title || a.collectorId}<div className="fx-muted fx-mono">{a.collectorId}</div></td>
                <td>{CATEGORY_LABEL[a.category] || a.category}</td>
                <td>{formatBytes(a.size)}</td>
                <td className="fx-mono" title={a.sha256}>{String(a.sha256 || '').slice(0, 16)}…</td>
                <td>{formatDate(a.collectedAt)}</td>
                <td>{!a.binary && <Button icon="pi pi-eye" text size="small" tooltip="Ver" onClick={() => onOpenArtifact(a.collectorId)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {audit && (
        <div style={{ marginTop: 12 }}>
          <b>Registro de auditoría ({audit.length} entradas)</b>
          <pre className="fx-pre" style={{ maxHeight: 320 }}>
            {audit.map((e) => JSON.stringify(e)).join('\n')}
          </pre>
        </div>
      )}
    </div>
  );
};
