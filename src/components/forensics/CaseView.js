import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { Menu } from 'primereact/menu';
import { TabView, TabPanel } from 'primereact/tabview';
import { confirmDialog, ConfirmDialog } from 'primereact/confirmdialog';
import {
  ARTIFACT_TABS, SEVERITY_COLOR, RISK_LABEL, invoke, notify, formatDate, platformLabel
} from './forensicsUtils';
import { SummaryPanel, ArtifactViewer, TimelinePanel, ArtifactsPanel } from './CasePanels';
import { AiPanel, IocsPanel, UploadToolsPanel } from './ToolPanels';

const STATUS_LABEL = {
  running: 'En curso', completed: 'Completado', failed: 'Con errores', cancelled: 'Cancelado'
};

export const CaseView = ({ caseId, refreshKey, onDeleted, onChanged, uploadTarget }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusArtifact, setFocusArtifact] = useState(null);
  const [redactReport, setRedactReport] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadRunning, setUploadRunning] = useState(false);
  const exportMenu = useRef(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await invoke('forensics:get-case', { caseId });
      setData(res);
    } catch (e) { setError(e.message); setData(null); }
  }, [caseId]);

  useEffect(() => { setData(null); setActiveIndex(0); setFocusArtifact(null); load(); }, [load, refreshKey]);

  const artifacts = useMemo(() => (data?.artifacts || []).filter((a) => !a.binary), [data]);
  const binaryArtifacts = useMemo(() => (data?.artifacts || []).filter((a) => a.binary), [data]);

  const tabs = useMemo(() => {
    if (!data) return [];
    const list = [{ key: 'summary', label: 'Resumen', icon: 'pi pi-shield' }];
    ARTIFACT_TABS.forEach((t) => {
      if (artifacts.some((a) => t.categories.includes(a.category))) list.push(t);
    });
    list.push({ key: 'timeline', label: 'Línea de tiempo', icon: 'pi pi-clock' });
    list.push({ key: 'artifacts', label: 'Artefactos e integridad', icon: 'pi pi-verified' });
    list.push({ key: 'ai', label: 'IA', icon: 'pi pi-bolt' });
    list.push({ key: 'iocs', label: 'IOCs', icon: 'pi pi-flag' });
    list.push({ key: 'tools', label: 'Herramientas', icon: 'pi pi-wrench' });
    return list;
  }, [data, artifacts]);

  const openArtifact = (collectorId) => {
    const art = artifacts.find((a) => a.collectorId === collectorId);
    if (!art) return;
    const tab = ARTIFACT_TABS.find((t) => t.categories.includes(art.category));
    const idx = tabs.findIndex((t) => t.key === (tab ? tab.key : 'artifacts'));
    setFocusArtifact(collectorId);
    if (idx >= 0) setActiveIndex(idx);
  };

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      if (okMsg && !res?.canceled) notify('success', 'Forense', typeof okMsg === 'function' ? okMsg(res) : okMsg);
      return res;
    } catch (e) {
      notify('error', 'Forense', e.message);
      return null;
    } finally { setBusy(false); }
  };

  const reanalyze = async () => {
    await run(() => invoke('forensics:reanalyze', { caseId }), 'Análisis actualizado');
    load();
    onChanged && onChanged();
  };

  const exportReport = (format) => run(
    () => invoke('forensics:export-report', { caseId, format, redact: redactReport }),
    (r) => `Informe guardado en ${r.path}`
  ).then(() => load());

  const exportEvidence = () => run(
    () => invoke('forensics:export-evidence', { caseId, redactReport }),
    (r) => `Paquete de evidencias guardado en ${r.path}`
  ).then(() => load());

  const remove = () => confirmDialog({
    message: 'Se eliminarán todas las evidencias de este caso de forma permanente. ¿Continuar?',
    header: 'Eliminar caso',
    icon: 'pi pi-exclamation-triangle',
    acceptLabel: 'Eliminar',
    rejectLabel: 'Cancelar',
    acceptClassName: 'p-button-danger',
    accept: async () => {
      const res = await run(() => invoke('forensics:delete-case', { caseId }), 'Caso eliminado');
      if (res) onDeleted && onDeleted(caseId);
    }
  });

  const exportItems = [
    { label: 'Informe PDF', icon: 'pi pi-file-pdf', command: () => exportReport('pdf') },
    { label: 'Informe HTML', icon: 'pi pi-globe', command: () => exportReport('html') },
    { label: 'Informe Markdown', icon: 'pi pi-file', command: () => exportReport('markdown') },
    { label: 'Datos JSON', icon: 'pi pi-code', command: () => exportReport('json') },
    { separator: true },
    { label: 'Paquete de evidencias (ZIP)', icon: 'pi pi-box', command: exportEvidence }
  ];

  if (error) return <div className="fx-scroll"><div className="fx-error">{error}</div></div>;
  if (!data) return <div className="fx-scroll fx-muted">Cargando caso...</div>;

  const c = data.case;
  const summary = data.findings?.summary;
  const risk = summary?.risk || 'none';
  const platform = c.target?.platform;

  const renderTab = (tab) => {
    if (tab.key === 'summary') return <SummaryPanel caseData={data} findings={data.findings} onOpenArtifact={openArtifact} />;
    if (tab.key === 'timeline') return <TimelinePanel timeline={data.timeline} />;
    if (tab.key === 'artifacts') {
      return (
        <>
          <ArtifactsPanel caseId={caseId} artifacts={data.artifacts} onOpenArtifact={openArtifact} />
          {binaryArtifacts.length > 0 && (
            <div className="fx-muted" style={{ marginTop: 8 }}>
              {binaryArtifacts.length} artefacto(s) binario(s) (resultados de herramientas) disponibles en la carpeta del caso.
            </div>
          )}
        </>
      );
    }
    if (tab.key === 'ai') return <AiPanel caseId={caseId} aiSummary={data.aiSummary} onSummary={(s) => { setData((d) => ({ ...d, aiSummary: s })); }} />;
    if (tab.key === 'iocs') return <IocsPanel />;
    if (tab.key === 'tools') {
      return (
        <UploadToolsPanel
          target={uploadTarget}
          platform={platform}
          caseId={caseId}
          running={uploadRunning}
          setRunning={setUploadRunning}
          onFinished={() => { load(); onChanged && onChanged(); }}
        />
      );
    }
    const def = ARTIFACT_TABS.find((t) => t.key === tab.key);
    const list = artifacts.filter((a) => def.categories.includes(a.category));
    return (
      <ArtifactViewer
        caseId={caseId}
        artifacts={list}
        initialId={list.some((a) => a.collectorId === focusArtifact) ? focusArtifact : undefined}
      />
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <ConfirmDialog />
      <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--fx-border)' }}>
        <div className="fx-row">
          <h3 className="fx-title" style={{ margin: 0 }}>
            <i className="pi pi-search" /> {c.target?.label || c.target?.host}
          </h3>
          <span className="fx-badge" style={{ background: SEVERITY_COLOR[risk] || SEVERITY_COLOR.none }}>
            {RISK_LABEL[risk] || risk}
          </span>
          <span className="fx-chip">{STATUS_LABEL[c.status] || c.status}</span>
          <span className="fx-chip">{platformLabel(platform)}</span>
          <span className="fx-chip">{c.profile === 'full' ? 'Completo' : c.profile === 'upload-tool' ? 'Herramienta' : 'Rápido'}</span>
          <div className="fx-spacer" />
          <label className="fx-row" style={{ gap: 4, cursor: 'pointer' }} title="Oculta contraseñas, tokens y claves en informes y paquetes">
            <input type="checkbox" checked={redactReport} onChange={(e) => setRedactReport(e.target.checked)} />
            Redactar secretos en exportaciones
          </label>
          <Button icon="pi pi-refresh" size="small" outlined tooltip="Re-analizar (reglas e IOCs actuales)" onClick={reanalyze} disabled={busy} />
          <Menu model={exportItems} popup ref={exportMenu} />
          <Button label="Exportar" icon="pi pi-download" size="small" onClick={(e) => exportMenu.current.toggle(e)} disabled={busy} />
          <Button icon="pi pi-folder-open" size="small" outlined tooltip="Abrir carpeta del caso" onClick={() => run(() => invoke('forensics:open-case-folder', { caseId }))} />
          <Button icon="pi pi-trash" size="small" severity="danger" outlined tooltip="Eliminar caso" onClick={remove} disabled={busy} />
        </div>
        <div className="fx-muted" style={{ marginTop: 4 }}>
          {c.caseId} · {formatDate(c.createdAt)} · operador {c.operator || '-'}
          {c.error ? <span style={{ color: '#ef4444' }}> · {c.error}</span> : null}
        </div>
        {c.notes ? <div className="fx-muted">Notas: {c.notes}</div> : null}
      </div>

      <div className="fx-scroll">
        <TabView activeIndex={Math.min(activeIndex, tabs.length - 1)} onTabChange={(e) => setActiveIndex(e.index)} scrollable>
          {tabs.map((t) => (
            <TabPanel key={t.key} header={t.label} leftIcon={`${t.icon} fx-tab-icon`}>
              {renderTab(t)}
            </TabPanel>
          ))}
        </TabView>
      </div>
    </div>
  );
};

export default CaseView;
