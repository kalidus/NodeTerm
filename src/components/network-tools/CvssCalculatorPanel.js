import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabView, TabPanel } from 'primereact/tabview';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { Tooltip } from 'primereact/tooltip';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';
import { cvssV4Service } from '../../services/cvss/CvssV4Service';
import { cvssV31Service } from '../../services/cvss/CvssV31Service';
import { cvssStore } from '../../stores/cvssStore';
import { cvssReportService } from '../../services/reports/CvssReportService';
import { CvssAuditorService } from '../../services/cvss/CvssAuditorService';

// ─── Paleta de severidad ─────────────────────────────────────────────────────
const SEVERITY_CONFIG = {
  None:     { bg: 'rgba(107,114,128,0.18)', border: '#6b7280', fg: '#d1d5db', gauge: '#6b7280', glow: 'rgba(107,114,128,0.3)' },
  Low:      { bg: 'rgba(37,99,235,0.18)',   border: '#3b82f6', fg: '#bfdbfe', gauge: '#3b82f6', glow: 'rgba(59,130,246,0.3)' },
  Medium:   { bg: 'rgba(217,119,6,0.18)',   border: '#f59e0b', fg: '#fde68a', gauge: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  High:     { bg: 'rgba(234,88,12,0.18)',   border: '#f97316', fg: '#fed7aa', gauge: '#f97316', glow: 'rgba(249,115,22,0.3)' },
  Critical: { bg: 'rgba(220,38,38,0.18)',   border: '#ef4444', fg: '#fecaca', gauge: '#ef4444', glow: 'rgba(239,68,68,0.4)' }
};

function getSeverityConfig(severity) {
  return SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.None;
}

// ─── Gauge SVG circular ───────────────────────────────────────────────────────
function ScoreGauge({ score, severity }) {
  const cfg = getSeverityConfig(severity);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(Number(score) / 10, 0), 1);
  const dashOffset = circumference * (1 - pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
      <svg width="130" height="130" viewBox="0 0 130 130">
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle
          cx="65" cy="65" r={radius}
          fill="none"
          stroke={cfg.gauge}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          transform="rotate(-90 65 65)"
          style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${cfg.glow})` }}
        />
        <text x="65" y="60" textAnchor="middle" fill={cfg.gauge} fontSize="26" fontWeight="700" fontFamily="Inter, system-ui">
          {Number(score).toFixed(1)}
        </text>
        <text x="65" y="79" textAnchor="middle" fill={cfg.fg} fontSize="11" fontFamily="Inter, system-ui" opacity="0.85">
          {severity}
        </text>
      </svg>
    </div>
  );
}

// ─── Barra de escala 0-10 ──────────────────────────────────────────────────
function ScoreBar({ score }) {
  const segments = [
    { label: 'None', from: 0.0, to: 0.1,  color: '#6b7280' },
    { label: 'Low',  from: 0.1, to: 4.0,  color: '#3b82f6' },
    { label: 'Med',  from: 4.0, to: 7.0,  color: '#f59e0b' },
    { label: 'High', from: 7.0, to: 9.0,  color: '#f97316' },
    { label: 'Crit', from: 9.0, to: 10.0, color: '#ef4444' }
  ];
  const pct = Math.min(Math.max(Number(score) / 10, 0), 1) * 100;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ position: 'relative', height: '8px', borderRadius: '99px', background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, #3b82f6 0%, #f59e0b 40%, #f97316 70%, #ef4444 100%)`,
          borderRadius: '99px',
          transition: 'width 0.5s ease'
        }} />
        <div style={{
          position: 'absolute', top: '-1px', left: `calc(${pct}% - 5px)`,
          width: '10px', height: '10px',
          background: '#fff', borderRadius: '50%',
          boxShadow: '0 0 6px rgba(255,255,255,0.6)',
          transition: 'left 0.5s ease'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.68rem', color: 'var(--text-color-secondary)' }}>
        {segments.map(s => (
          <span key={s.label} style={{ color: s.color, fontWeight: 600 }}>{s.label}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Tooltip de métrica ───────────────────────────────────────────────────────
function MetricTooltipContent({ metricKey, currentValue, service }) {
  const desc = service.METRIC_DESCRIPTIONS?.[metricKey];
  if (!desc) return null;
  const valueDesc = currentValue ? desc.values?.[currentValue] : null;
  return (
    <div style={{ maxWidth: '320px', padding: '0.5rem 0.2rem' }}>
      <div style={{ fontWeight: 700, marginBottom: '0.25rem', color: '#f0f0f0' }}>
        {desc.label} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({desc.labelEs})</span>
      </div>
      <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginBottom: '0.5rem', lineHeight: '1.45' }}>
        {desc.description}
      </div>
      {valueDesc && (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '0.4rem 0.5rem', fontSize: '0.79rem', color: '#e2e8f0', lineHeight: '1.5' }}>
          <strong style={{ color: '#7dd3fc' }}>Valor actual:</strong> {valueDesc}
        </div>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
const CvssCalculatorPanel = () => {
  const [version, setVersion] = useState('4.0');
  const [activeTab, setActiveTab] = useState(0);

  const service = version === '3.1' ? cvssV31Service : cvssV4Service;

  const [metrics31, setMetrics31] = useState({ ...cvssV31Service.DEFAULT_METRICS });
  const [metrics40, setMetrics40] = useState({ ...cvssV4Service.DEFAULT_METRICS });
  const metrics = version === '3.1' ? metrics31 : metrics40;
  const setMetrics = version === '3.1' ? setMetrics31 : setMetrics40;

  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [affectedVersions, setAffectedVersions] = useState('');
  const [techDetailsExpanded, setTechDetailsExpanded] = useState(false);
  const [auditorPanelExpanded, setAuditorPanelExpanded] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templates, setTemplates] = useState(() => cvssStore.getTemplates());
  const [history, setHistory] = useState(() => cvssStore.getHistory());
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [vectorInput, setVectorInput] = useState('');
  const [expandedMetricGroups, setExpandedMetricGroups] = useState([0]);

  const feedbackTimer = useRef(null);

  const showFeedback = useCallback((severity, text) => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    setFeedback({ severity, text });
    feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
  }, []);

  const computed = useMemo(() => {
    try {
      return service.calculate(metrics);
    } catch (error) {
      return { error: error.message, score: 0, severity: 'None', vector: '' };
    }
  }, [metrics, service]);

  const auditorInsights = useMemo(() => {
    return CvssAuditorService.getAuditorInsights(version, metrics);
  }, [version, metrics]);

  const selectedHistory = useMemo(
    () => history.find((item) => item.id === selectedHistoryId) || null,
    [history, selectedHistoryId]
  );

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const handleMetricChange = useCallback((key, val) => {
    setMetrics(prev => ({ ...prev, [key]: val }));
  }, [setMetrics]);

  const handleReset = () => {
    setMetrics({ ...service.DEFAULT_METRICS });
    setTitle('');
    setNotes('');
    setAffectedVersions('');
    setVectorInput('');
  };


  const handleImportVector = () => {
    try {
      const parsed = service.parseVector(vectorInput);
      const res = service.calculate(parsed);
      setMetrics({ ...service.DEFAULT_METRICS, ...res.metrics });
      showFeedback('success', 'Vector importado correctamente.');
      setVectorInput('');
    } catch (e) {
      showFeedback('error', `Vector inválido: ${e.message}`);
    }
  };

  const handleSaveToHistory = () => {
    if (computed.error) {
      showFeedback('error', computed.error);
      return;
    }
    const entry = cvssStore.addHistoryEntry({
      title: title.trim() || 'Vulnerabilidad sin título',
      notes,
      affectedVersions,
      version,
      ...computed
    });

    setHistory(cvssStore.getHistory());
    setSelectedHistoryId(entry.id);
    showFeedback('success', 'Evaluación guardada en historial.');
    setActiveTab(2);
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      showFeedback('warn', 'Escribe un nombre para el template.');
      return;
    }
    const saved = cvssStore.saveTemplate({
      name: templateName,
      description: templateDesc,
      metrics,
      tags: [version === '3.1' ? 'CVSS 3.1' : 'CVSS 4.0']
    });
    setTemplates(cvssStore.getTemplates());
    setSelectedTemplateId(saved.id);
    setTemplateName('');
    setTemplateDesc('');
    setShowTemplateDialog(false);
    showFeedback('success', 'Template guardado correctamente.');
  };

  const handleApplyTemplate = (tpl) => {
    const template = tpl || selectedTemplate;
    if (!template) return;
    const ver = template.tags?.includes('CVSS 3.1') ? '3.1' : '4.0';
    setVersion(ver);
    if (ver === '3.1') {
      setMetrics31({ ...cvssV31Service.DEFAULT_METRICS, ...template.metrics });
    } else {
      setMetrics40({ ...cvssV4Service.DEFAULT_METRICS, ...template.metrics });
    }
    showFeedback('info', `Template aplicado: ${template.name}`);
    setActiveTab(0);
  };

  const handleDeleteTemplate = (id) => {
    confirmDialog({
      message: '¿Eliminar este template?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        cvssStore.deleteTemplate(id);
        setTemplates(cvssStore.getTemplates());
        if (selectedTemplateId === id) setSelectedTemplateId(null);
        showFeedback('success', 'Template eliminado.');
      }
    });
  };

  const handleDeleteHistory = (id) => {
    confirmDialog({
      message: '¿Eliminar este registro del historial?',
      header: 'Confirmar eliminación',
      icon: 'pi pi-trash',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: () => {
        cvssStore.removeHistoryEntry(id);
        setHistory(cvssStore.getHistory());
        if (selectedHistoryId === id) setSelectedHistoryId(null);
        showFeedback('success', 'Registro eliminado.');
      }
    });
  };

  const handleClearHistory = () => {
    confirmDialog({
      message: '¿Limpiar todo el historial?',
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Limpiar todo',
      rejectLabel: 'Cancelar',
      accept: () => {
        cvssStore.clearHistory();
        setHistory([]);
        setSelectedHistoryId(null);
        showFeedback('success', 'Historial limpiado.');
      }
    });
  };

  const handleExportHtml = async () => {
    const report = selectedHistory || (computed.score !== undefined && !computed.error ? {
      title: title || 'Vulnerabilidad sin título',
      notes,
      affectedVersions,
      version,
      ...computed,
      createdAt: new Date().toISOString()
    } : null);
    if (!report) {
      showFeedback('warn', 'Configura las métricas o selecciona un reporte del historial.');
      return;
    }
    const html = cvssReportService.createHtml(report);
    const name = `cvss-${(report.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.html`;
    const res = await window?.electron?.ipcRenderer?.invoke('network-tools:save-cvss-report-html', { html, suggestedName: name });
    if (res?.success) showFeedback('success', 'Reporte HTML exportado.');
    else showFeedback('error', res?.error || 'No se pudo exportar HTML.');
  };

  const handleExportPdf = async () => {
    const report = selectedHistory || (computed.score !== undefined && !computed.error ? {
      title: title || 'Vulnerabilidad sin título',
      notes,
      affectedVersions,
      version,
      ...computed,
      createdAt: new Date().toISOString()
    } : null);
    if (!report) {
      showFeedback('warn', 'Configura las métricas o selecciona un reporte del historial.');
      return;
    }
    const html = cvssReportService.createHtml(report);
    const name = `cvss-${(report.title || 'report').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
    const res = await window?.electron?.ipcRenderer?.invoke('network-tools:save-cvss-report-pdf', { html, suggestedName: name });
    if (res?.success) showFeedback('success', 'Reporte PDF exportado.');
    else showFeedback('error', res?.error || 'No se pudo exportar PDF.');
  };

  const sevCfg = getSeverityConfig(computed.severity || 'None');

  const metricSections = useMemo(() => {
    if (version === '3.1') {
      return [
        { key: 'base', title: 'Base (obligatorias)', metrics: service.BASE_METRICS || [] },
        { key: 'temporal', title: 'Temporal (opcionales)', metrics: service.TEMPORAL_METRICS || [] },
        { key: 'environmental', title: 'Environmental (opcionales)', metrics: service.ENVIRONMENTAL_METRICS || [] }
      ];
    }
    return [
      { key: 'base', title: 'Base (obligatorias)', metrics: service.BASE_METRICS || [] },
      { key: 'threat', title: 'Threat (opcionales)', metrics: service.THREAT_METRICS || [] },
      { key: 'environmental', title: 'Environmental (opcionales)', metrics: service.ENVIRONMENTAL_METRICS || [] },
      { key: 'supplemental', title: 'Supplemental (opcionales)', metrics: service.SUPPLEMENTAL_METRICS || [] }
    ];
  }, [version, service]);

  // ─── Render métricas ──────────────────────────────────────────────────────
  const renderMetricsGrid = (metricList = []) => {
    const half = Math.ceil(metricList.length / 2);
    const cols = [metricList.slice(0, half), metricList.slice(half)];

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '0.55rem' }}>
        {cols.map((col, ci) => (
          <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {col.map((metricKey) => {
              const desc = service.METRIC_DESCRIPTIONS?.[metricKey];
              const tooltipId = `cvss-tip-${metricKey}`;
              return (
                <div key={metricKey} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: '0.4rem', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span
                      id={tooltipId}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.4)',
                        fontSize: '0.6rem', fontWeight: 700, color: '#a5b4fc',
                        cursor: 'help', flexShrink: 0
                      }}
                    >
                      ?
                    </span>
                    <Tooltip target={`#${tooltipId}`} position="right" showDelay={200}>
                      <MetricTooltipContent metricKey={metricKey} currentValue={metrics[metricKey]} service={service} />
                    </Tooltip>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.35rem', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '0.66rem', color: 'var(--text-color-secondary)', marginBottom: '2px', fontWeight: 600, letterSpacing: '0.02em' }}>
                        {desc?.labelEs || metricKey} <span style={{ color: '#6366f1', opacity: 0.7, fontSize: '0.65rem' }}>({metricKey})</span>
                      </div>
                      <Dropdown
                        value={metrics[metricKey]}
                        options={service.METRIC_OPTIONS[metricKey]}
                        optionLabel="label"
                        optionValue="value"
                        onChange={(e) => handleMetricChange(metricKey, e.value)}
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // ─── Tab: Métricas ────────────────────────────────────────────────────────
  const renderMetricsTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {/* Score header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap',
        background: sevCfg.bg, border: `1px solid ${sevCfg.border}`,
        borderRadius: '12px', padding: '0.9rem 1.1rem'
      }}>
        <ScoreGauge score={computed.score || 0} severity={computed.severity || 'None'} />
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            CVSS {version} · {computed.scoringMode || 'Base'} Score
          </div>
          <ScoreBar score={computed.score || 0} />
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: 'var(--text-color-secondary)', wordBreak: 'break-all', marginTop: '0.1rem' }}>
            {computed.error ? <span style={{ color: '#f87171' }}>{computed.error}</span> : computed.vector}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.1rem' }}>
            <InputText
              value={vectorInput}
              onChange={e => setVectorInput(e.target.value)}
              placeholder="Pegar vector CVSS para importar…"
              style={{ flex: 1, fontSize: '0.78rem' }}
            />
            <Button icon="pi pi-download" tooltip="Importar vector" tooltipOptions={{ position: 'top' }} onClick={handleImportVector} disabled={!vectorInput.trim()} outlined size="small" />
          </div>
        </div>
      </div>

      {/* Título y notas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Título del hallazgo</label>
          <InputText value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: SQL Injection en login" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tecnologías y Versiones Afectadas</label>
          <InputText value={affectedVersions} onChange={e => setAffectedVersions(e.target.value)} placeholder="Ej: Apache HTTP Server <= 2.4.49" style={{ width: '100%' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.72rem', color: 'var(--text-color-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Notas del análisis</label>
          <InputText value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto, CVE, sistemas afectados…" style={{ width: '100%' }} />
        </div>
      </div>

      {/* Información para el Auditor */}
      <div style={{
        background: 'rgba(99, 102, 241, 0.04)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.7rem'
      }}>
        <div 
          onClick={() => setAuditorPanelExpanded(!auditorPanelExpanded)}
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            flexWrap: 'wrap', 
            gap: '0.5rem',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <i className="pi pi-shield" style={{ color: '#a5b4fc', fontSize: '1.1rem' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em' }}>
              Diagnóstico del Auditor e Insights de Remediación
            </span>
            <i className={`pi pi-chevron-${auditorPanelExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '0.2rem' }} />
          </div>
          <span style={{
            fontSize: '0.72rem',
            background: 'rgba(99, 102, 241, 0.18)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#c7d2fe',
            padding: '3px 8px',
            borderRadius: '6px',
            fontWeight: 600
          }}>
            {auditorInsights.profile}
          </span>
        </div>

        {auditorPanelExpanded && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.2rem' }}>
              {/* Columna Exposición */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="pi pi-exclamation-triangle" style={{ color: '#fbbf24', fontSize: '0.8rem' }} />
                  CÓMO AFECTA (EXPOSICIÓN & IMPACTO)
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {auditorInsights.exposure.map((exp, idx) => (
                    <li key={idx} style={{ lineHeight: '1.4' }}>{exp}</li>
                  ))}
                </ul>
              </div>

              {/* Columna Remediación */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <i className="pi pi-check-circle" style={{ color: '#34d399', fontSize: '0.8rem' }} />
                  RECOMENDACIONES DE MITIGACIÓN
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {auditorInsights.remediation.map((rem, idx) => (
                    <li key={idx} style={{ lineHeight: '1.4' }}>{rem}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Toggle para detalles técnicos avanzados */}
            <div 
              onClick={() => setTechDetailsExpanded(!techDetailsExpanded)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
                padding: '0.6rem 0.8rem',
                cursor: 'pointer',
                marginTop: '0.3rem',
                transition: 'background 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <i className="pi pi-cog" style={{ color: '#818cf8', fontSize: '0.85rem' }} />
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#d1d5db' }}>
                  Detalles Técnicos Avanzados (CWE, Capas e Impacto Técnico)
                </span>
              </div>
              <i className={`pi pi-chevron-${techDetailsExpanded ? 'up' : 'down'}`} style={{ fontSize: '0.7rem', color: '#94a3b8' }} />
            </div>

            {techDetailsExpanded && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '8px',
                padding: '0.8rem',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.8rem'
              }}>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '3px' }}>Capas Afectadas:</strong>
                  <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{auditorInsights.technicalDetails.affectedLayers}</span>
                </div>
                <div>
                  <strong style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '3px' }}>CWEs Relacionados:</strong>
                  <span style={{ fontSize: '0.75rem', color: '#e2e8f0' }}>{auditorInsights.technicalDetails.cwe}</span>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <strong style={{ display: 'block', fontSize: '0.72rem', color: '#94a3b8', marginBottom: '3px' }}>Impacto Técnico Profundo:</strong>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#cbd5e1', lineHeight: '1.4' }}>{auditorInsights.technicalDetails.technicalImpact}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Métricas */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.9rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.7rem' }}>
          Métricas CVSS Completas — <span style={{ color: '#818cf8' }}>CVSS {version}</span>
          <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: 400, color: '#64748b' }}>
            Haz clic en <span style={{ color: '#a5b4fc' }}>?</span> para ver la descripción de cada métrica
          </span>
        </div>
        <Accordion
          className="cvss-accordion"
          multiple
          activeIndex={expandedMetricGroups}
          onTabChange={(e) => setExpandedMetricGroups(Array.isArray(e.index) ? e.index : [e.index])}
        >
          {metricSections.map((section, idx) => (
            <AccordionTab
              key={section.key}
              header={
                <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                  {section.title} <span style={{ opacity: 0.7 }}>({section.metrics.length})</span>
                </span>
              }
            >
              {renderMetricsGrid(section.metrics)}
            </AccordionTab>
          ))}
        </Accordion>
        {computed.score === 0 && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.73rem', color: '#94a3b8' }}>
            Nota: el score puede ser 0.0 si en Base dejas impactos en <strong>None</strong>. Ajusta métricas Base para obtener una puntuación representativa.
          </div>
        )}
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <Button label="Guardar en historial" icon="pi pi-save" onClick={handleSaveToHistory} disabled={!!computed.error} />
        <Button label="Guardar template" icon="pi pi-bookmark" severity="secondary" outlined onClick={() => setShowTemplateDialog(true)} disabled={!!computed.error} />
        <Button label="Reset" icon="pi pi-refresh" severity="secondary" outlined onClick={handleReset} />
        <Button label="Exportar HTML" icon="pi pi-file" severity="info" outlined onClick={handleExportHtml} />
        <Button label="Exportar PDF" icon="pi pi-file-pdf" severity="danger" outlined onClick={handleExportPdf} />
      </div>
    </div>
  );

  // ─── Tab: Templates ───────────────────────────────────────────────────────
  const renderTemplatesTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)', fontSize: '0.87rem' }}>
          <i className="pi pi-bookmark" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} />
          No hay templates guardados. Configura métricas y haz clic en <strong>"Guardar template"</strong> en la pestaña Calculadora.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.65rem' }}>
          {templates.map(tpl => {
            const tplVersion = tpl.tags?.find(t => t.startsWith('CVSS')) || 'CVSS 4.0';
            const tplResult = (() => {
              try {
                const svc = tplVersion === 'CVSS 3.1' ? cvssV31Service : cvssV4Service;
                return svc.calculate({ ...svc.DEFAULT_METRICS, ...tpl.metrics });
              } catch { return null; }
            })();
            const tplSev = tplResult?.severity || 'None';
            const tplCfg = getSeverityConfig(tplSev);
            return (
              <div key={tpl.id} style={{
                background: 'rgba(255,255,255,0.03)', border: `1px solid ${selectedTemplateId === tpl.id ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: '10px', padding: '0.8rem', cursor: 'pointer',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                boxShadow: selectedTemplateId === tpl.id ? '0 0 0 2px rgba(99,102,241,0.35)' : 'none'
              }} onClick={() => setSelectedTemplateId(tpl.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.4rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{tpl.name}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
                    <Tag value={tplVersion} style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.68rem' }} />
                    <Tag value={tplSev} style={{ background: tplCfg.bg, color: tplCfg.fg, border: `1px solid ${tplCfg.border}`, fontSize: '0.68rem' }} />
                  </div>
                </div>
                {tpl.description && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)', marginTop: '0.3rem' }}>{tpl.description}</div>
                )}
                {tplResult && (
                  <div style={{ marginTop: '0.4rem', fontFamily: 'monospace', fontSize: '0.68rem', color: tplCfg.fg, wordBreak: 'break-all' }}>
                    Score: {Number(tplResult.score).toFixed(1)} · {tplResult.vector}
                  </div>
                )}
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#64748b' }}>
                  {new Date(tpl.createdAt || tpl.updatedAt).toLocaleDateString('es-ES')}
                </div>
                <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.55rem' }}>
                  <Button size="small" label="Aplicar" icon="pi pi-check" severity="success" onClick={(e) => { e.stopPropagation(); handleApplyTemplate(tpl); }} style={{ flex: 1 }} />
                  <Button size="small" icon="pi pi-trash" severity="danger" outlined onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─── Tab: Historial ───────────────────────────────────────────────────────
  const renderHistoryTab = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
      {history.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button label="Exportar HTML" icon="pi pi-file" severity="info" outlined size="small" onClick={handleExportHtml} disabled={!selectedHistoryId} />
          <Button label="Exportar PDF" icon="pi pi-file-pdf" severity="danger" outlined size="small" onClick={handleExportPdf} disabled={!selectedHistoryId} />
          <Button label="Limpiar historial" icon="pi pi-trash" severity="danger" outlined size="small" onClick={handleClearHistory} />
        </div>
      )}
      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-color-secondary)', fontSize: '0.87rem' }}>
          <i className="pi pi-history" style={{ fontSize: '2rem', display: 'block', marginBottom: '0.5rem', opacity: 0.4 }} />
          No hay registros en el historial. Guarda evaluaciones desde la pestaña Calculadora.
        </div>
      ) : (
        <DataTable
          value={history}
          selection={selectedHistory ? [selectedHistory] : []}
          onSelectionChange={(e) => setSelectedHistoryId(e.value?.[0]?.id || null)}
          selectionMode="single"
          dataKey="id"
          paginator rows={10}
          size="small"
          style={{ fontSize: '0.82rem' }}
          emptyMessage="Sin registros"
        >
          <Column
            field="title"
            header="Hallazgo"
            style={{ maxWidth: '200px' }}
            body={(row) => <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.title}</div>}
          />
          <Column
            field="version"
            header="Ver."
            style={{ width: '65px' }}
            body={(row) => <Tag value={row.version || '4.0'} style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', fontSize: '0.7rem' }} />}
          />
          <Column
            field="score"
            header="Score"
            style={{ width: '70px', textAlign: 'center' }}
            body={(row) => {
              const cfg = getSeverityConfig(row.severity);
              return <span style={{ fontWeight: 700, color: cfg.gauge }}>{Number(row.score).toFixed(1)}</span>;
            }}
          />
          <Column
            field="severity"
            header="Severidad"
            style={{ width: '90px' }}
            body={(row) => {
              const cfg = getSeverityConfig(row.severity);
              return <Tag value={row.severity} style={{ background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.border}`, fontSize: '0.7rem' }} />;
            }}
          />
          <Column
            field="createdAt"
            header="Fecha"
            style={{ width: '130px', fontSize: '0.75rem' }}
            body={(row) => new Date(row.createdAt).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
          />
          <Column
            header=""
            style={{ width: '50px' }}
            body={(row) => (
              <Button icon="pi pi-trash" size="small" text severity="danger" onClick={(e) => { e.stopPropagation(); handleDeleteHistory(row.id); }} />
            )}
          />
        </DataTable>
      )}
      {selectedHistory && (
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '0.9rem' }}>
          <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{selectedHistory.title}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
            {new Date(selectedHistory.createdAt).toLocaleString('es-ES')} · CVSS {selectedHistory.version || '4.0'}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#7dd3fc', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
            {selectedHistory.vector}
          </div>
          {selectedHistory.affectedVersions && (
            <div style={{ fontSize: '0.8rem', color: '#e2e8f0', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem', marginBottom: '0.4rem' }}>
              <strong>Versiones Afectadas:</strong> {selectedHistory.affectedVersions}
            </div>
          )}
          {selectedHistory.notes && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.4rem' }}>
              <strong>Notas:</strong> {selectedHistory.notes}
            </div>
          )}

        </div>
      )}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
      <style>{`
        .cvss-accordion.p-accordion .p-accordion-header .p-accordion-header-link {
          background: rgba(255,255,255,0.04) !important;
          color: #cbd5e1 !important;
          border: 1px solid rgba(255,255,255,0.09) !important;
          padding: 0.62rem 0.8rem !important;
          border-radius: 8px !important;
          box-shadow: none !important;
        }
        .cvss-accordion.p-accordion .p-accordion-header .p-accordion-header-link .p-accordion-header-text,
        .cvss-accordion.p-accordion .p-accordion-header .p-accordion-header-link span {
          color: #cbd5e1 !important;
          opacity: 1 !important;
        }
        .cvss-accordion.p-accordion .p-accordion-header .p-accordion-header-link .p-accordion-toggle-icon {
          color: #94a3b8 !important;
        }
        .cvss-accordion.p-accordion .p-accordion-header:not(.p-disabled).p-highlight .p-accordion-header-link {
          background: rgba(99,102,241,0.15) !important;
          border-color: rgba(99,102,241,0.42) !important;
          color: #dbeafe !important;
        }
        .cvss-accordion.p-accordion .p-accordion-header:not(.p-disabled).p-highlight .p-accordion-header-link .p-accordion-header-text,
        .cvss-accordion.p-accordion .p-accordion-header:not(.p-disabled).p-highlight .p-accordion-header-link span {
          color: #dbeafe !important;
          opacity: 1 !important;
        }
        .cvss-accordion.p-accordion .p-accordion-header:not(.p-disabled) .p-accordion-header-link:focus {
          box-shadow: 0 0 0 2px rgba(99,102,241,0.28) !important;
        }
        .cvss-accordion.p-accordion .p-accordion-content {
          background: rgba(255,255,255,0.015) !important;
          color: #d1d5db !important;
          border: 1px solid rgba(255,255,255,0.06) !important;
          border-top: none !important;
          border-radius: 0 0 8px 8px !important;
          padding: 0.7rem 0.75rem 0.6rem !important;
        }
      `}</style>
      <ConfirmDialog />

      {feedback && (
        <Message severity={feedback.severity} text={feedback.text} style={{ borderRadius: '8px' }} />
      )}

      {/* Selector de versión */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-color-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Versión CVSS:
        </span>
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '3px', gap: '3px' }}>
          {['3.1', '4.0'].map(v => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              style={{
                padding: '0.3rem 0.9rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.2s',
                background: version === v ? 'rgba(99,102,241,0.7)' : 'transparent',
                color: version === v ? '#fff' : 'var(--text-color-secondary)',
                boxShadow: version === v ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
              }}
            >
              CVSS {v}
            </button>
          ))}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
          {version === '3.1'
            ? 'Base + Temporal + Environmental (22 métricas)'
            : 'Base + Threat + Environmental + Supplemental (32 métricas)'}
        </span>
      </div>

      {/* Tabs principales */}
      <TabView activeIndex={activeTab} onTabChange={(e) => setActiveTab(e.index)} style={{ background: 'transparent' }}>
        <TabPanel
          header={
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="pi pi-calculator" style={{ fontSize: '0.85rem' }} />
              Calculadora
            </span>
          }
        >
          {renderMetricsTab()}
        </TabPanel>
        <TabPanel
          header={
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="pi pi-bookmark" style={{ fontSize: '0.85rem' }} />
              Templates
              {templates.length > 0 && (
                <Tag value={templates.length} style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '0.65rem', marginLeft: '2px' }} />
              )}
            </span>
          }
        >
          {renderTemplatesTab()}
        </TabPanel>
        <TabPanel
          header={
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <i className="pi pi-history" style={{ fontSize: '0.85rem' }} />
              Historial & Reportes
              {history.length > 0 && (
                <Tag value={history.length} style={{ background: 'rgba(99,102,241,0.3)', color: '#a5b4fc', fontSize: '0.65rem', marginLeft: '2px' }} />
              )}
            </span>
          }
        >
          {renderHistoryTab()}
        </TabPanel>
      </TabView>

      {/* Dialog guardar template */}
      <Dialog
        header="Guardar Template CVSS"
        visible={showTemplateDialog}
        onHide={() => setShowTemplateDialog(false)}
        style={{ width: '400px' }}
        modal
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nombre del template *</label>
            <InputText value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ej: RCE remoto crítico" style={{ width: '100%' }} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Descripción (opcional)</label>
            <InputText value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="Para qué tipo de vulnerabilidad…" style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>
            <Tag value={`CVSS ${version}`} style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }} />
            <Tag value={`Score: ${Number(computed.score || 0).toFixed(1)}`} style={{ background: getSeverityConfig(computed.severity || 'None').bg, color: getSeverityConfig(computed.severity || 'None').fg }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <Button label="Cancelar" severity="secondary" outlined onClick={() => setShowTemplateDialog(false)} />
            <Button label="Guardar" icon="pi pi-bookmark" onClick={handleSaveTemplate} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default CvssCalculatorPanel;
