import React, { useMemo, useState, useCallback, useRef } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputText } from 'primereact/inputtext';
import { Message } from 'primereact/message';
import { TabView, TabPanel } from 'primereact/tabview';
import { Accordion, AccordionTab } from 'primereact/accordion';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Tooltip } from 'primereact/tooltip';
import { Tag } from 'primereact/tag';
import { cvssV4Service } from '../../services/cvss/CvssV4Service';
import { cvssV31Service } from '../../services/cvss/CvssV31Service';
import { cvssStore } from '../../stores/cvssStore';
import { cvssReportService } from '../../services/reports/CvssReportService';
import { CvssAuditorService } from '../../services/cvss/CvssAuditorService';
import AppDialog from '../ui/AppDialog';
import { appConfirm } from '../ui/AppConfirm';

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

const CVE_PATTERN = /^CVE-\d{4}-\d{4,7}$/;

function detectVectorVersion(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;
  if (/^CVSS:3\.[01]\//i.test(text)) return '3.1';
  if (/^CVSS:4\.0\//i.test(text)) return '4.0';
  if (/(^|\/)(VC|VI|VA|AT|SC|SI|SA):/i.test(text)) return '4.0';
  if (/(^|\/)(AV|AC|PR|UI|C|I|A):/i.test(text)) return '3.1';
  return null;
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function normalizeSeverityLabel(value) {
  const key = String(value || '').trim().toLowerCase();
  const map = { none: 'None', low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical' };
  return map[key] || 'None';
}

function splitLead(text) {
  const value = String(text || '');
  const idx = value.indexOf(': ');
  if (idx > 0 && idx < 72) {
    return { lead: value.slice(0, idx), rest: value.slice(idx + 2) };
  }
  return { lead: '', rest: value };
}

function splitTags(value, separator) {
  return String(value || '')
    .split(separator)
    .map((part) => part.trim())
    .filter((part) => part && part !== 'N/A' && part !== 'Desconocido');
}

const IMPACT_META = {
  N: { label: 'Ninguno', width: '12%', color: '#6b7280' },
  L: { label: 'Limitado', width: '48%', color: '#f59e0b' },
  H: { label: 'Alto', width: '100%', color: '#ef4444' }
};

function impactIndicators(version, metrics) {
  const keys = version === '4.0'
    ? [['Confidencialidad', 'VC'], ['Integridad', 'VI'], ['Disponibilidad', 'VA']]
    : [['Confidencialidad', 'C'], ['Integridad', 'I'], ['Disponibilidad', 'A']];
  return keys.map(([name, key]) => {
    const value = metrics?.[key] || 'N';
    const meta = IMPACT_META[value] || { label: value, width: '28%', color: '#94a3b8' };
    return { name, level: meta.label, width: meta.width, color: meta.color };
  });
}

const panelCardStyle = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '0.9rem 1rem'
};

function FieldLabel({ children }) {
  return (
    <label style={{ fontSize: '0.78rem', color: '#e2e8f0', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
      {children}
    </label>
  );
}

function NumberedPoints({ items, accent }) {
  if (!items?.length) {
    return <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Sin datos para este vector.</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {items.map((text, index) => {
        const { lead, rest } = splitLead(text);
        return (
          <div key={`${index}-${lead}`} style={{ display: 'grid', gridTemplateColumns: '1.45rem 1fr', gap: '0.5rem', alignItems: 'flex-start' }}>
            <span style={{
              width: '1.45rem', height: '1.45rem', borderRadius: '999px',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: accent, color: '#0f172a', fontSize: '0.68rem', fontWeight: 800
            }}>{index + 1}</span>
            <div style={{ fontSize: '0.82rem', lineHeight: 1.45, color: '#e2e8f0' }}>
              {lead ? <strong style={{ fontWeight: 700 }}>{lead}. </strong> : null}
              <span style={{ color: '#cbd5e1' }}>{rest}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LookupBar({
  cveInput, cveError, loadingCve, onCveChange, onCveLookup,
  vectorInput, vectorError, onVectorChange, onImportVector
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '0.7rem' }}>
      <div style={panelCardStyle}>
        <FieldLabel>Buscar por CVE</FieldLabel>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <InputText
            value={cveInput}
            onChange={(e) => onCveChange(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onCveLookup();
              }
            }}
            placeholder="CVE-2021-44228"
            style={{ flex: 1, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.02em' }}
            aria-label="Identificador CVE"
          />
          <Button
            label="Consultar NVD"
            icon="pi pi-search"
            onClick={onCveLookup}
            loading={loadingCve}
            size="small"
          />
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', lineHeight: 1.4, color: cveError ? '#f87171' : '#94a3b8' }}>
          {cveError || 'Formato CVE-AAAA-NNNN. Pulsa Enter o Consultar NVD.'}
        </div>
      </div>
      <div style={panelCardStyle}>
        <FieldLabel>Importar vector</FieldLabel>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <InputText
            value={vectorInput}
            onChange={(e) => onVectorChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onImportVector();
              }
            }}
            placeholder="CVSS:3.1/AV:N/AC:L/…"
            style={{ flex: 1, fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}
            aria-label="Vector CVSS"
          />
          <Button
            label="Aplicar vector"
            icon="pi pi-check"
            onClick={onImportVector}
            disabled={!vectorInput.trim()}
            size="small"
            outlined
          />
        </div>
        <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', lineHeight: 1.4, color: vectorError ? '#f87171' : '#94a3b8' }}>
          {vectorError || 'Si el texto incluye CVSS:3.1 o CVSS:4.0, la versión cambia sola. El vector se queda visible.'}
        </div>
      </div>
    </div>
  );
}

function CveCard({ cveData }) {
  const [expanded, setExpanded] = useState(false);
  if (!cveData) return null;
  const severity = normalizeSeverityLabel(cveData.cvss?.baseSeverity);
  const cfg = getSeverityConfig(severity);
  const description = cveData.description || 'Sin descripción oficial.';
  const longDescription = description.length > 180;
  const platforms = cveData.affectedPlatforms || [];
  const references = cveData.references || [];

  return (
    <div style={{ ...panelCardStyle, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.68rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 700 }}>
            Ficha NVD
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.15rem' }}>{cveData.cveId}</div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {cveData.cvss?.version && (
            <Tag value={`CVSS ${cveData.cvss.version}`} style={{ background: 'rgba(99,102,241,0.2)', color: '#c7d2fe' }} />
          )}
          {cveData.cvss?.baseScore != null && (
            <Tag
              value={`${Number(cveData.cvss.baseScore).toFixed(1)} ${severity}`}
              style={{ background: cfg.bg, color: cfg.fg, border: `1px solid ${cfg.border}` }}
            />
          )}
        </div>
      </div>
      <div style={{ fontSize: '0.84rem', lineHeight: 1.5, color: '#cbd5e1' }}>
        <div style={expanded || !longDescription ? undefined : {
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {description}
        </div>
        {longDescription && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            style={{ marginTop: '0.35rem', background: 'none', border: 'none', color: '#a5b4fc', cursor: 'pointer', padding: 0, fontSize: '0.75rem', fontWeight: 700 }}
          >
            {expanded ? 'Ver menos' : 'Ver descripción completa'}
          </button>
        )}
      </div>
      {platforms.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Plataformas</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {platforms.slice(0, 12).map((platform, index) => (
              <span key={`${platform.part}-${platform.name}-${index}`} style={{
                fontSize: '0.72rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.2rem 0.55rem'
              }}>
                {platform.part ? `${platform.part}: ` : ''}{platform.name}
              </span>
            ))}
            {platforms.length > 12 && (
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', alignSelf: 'center' }}>+{platforms.length - 12}</span>
            )}
          </div>
        </div>
      )}
      {references.length > 0 && (
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Referencias</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {references.slice(0, 8).map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                title={url}
                style={{
                  fontSize: '0.75rem', color: '#c7d2fe', textDecoration: 'none',
                  background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.28)',
                  borderRadius: '8px', padding: '0.28rem 0.5rem'
                }}
              >
                {hostFromUrl(url)}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightScreens({
  screen, onScreenChange, version, metrics, insights, cveData,
  cveReady, onPocSearch, loadingPocs, pocSearchResults, onCopy
}) {
  const screens = [
    { id: 'resumen', label: 'Resumen', icon: 'pi pi-chart-bar' },
    { id: 'tecnico', label: 'Detalle técnico', icon: 'pi pi-cog' },
    { id: 'verificacion', label: 'Verificación', icon: 'pi pi-code' }
  ];
  const indicators = impactIndicators(version, metrics);
  const layers = splitTags(insights?.technicalDetails?.affectedLayers, /\s+y\s+/);
  const cwes = splitTags(insights?.technicalDetails?.cwe, /,\s*/);
  const platforms = cveData?.affectedPlatforms || [];
  const references = cveData?.references || [];
  const steps = insights?.technicalDetails?.verificationSteps || [];

  return (
    <div style={panelCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.85rem' }}>
        <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#94a3b8' }}>
          Lectura del vector
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: '9px', padding: '3px', flexWrap: 'wrap' }}>
          {screens.map((item) => {
            const active = screen === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onScreenChange(item.id)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  border: 'none', cursor: 'pointer', borderRadius: '7px',
                  padding: '0.38rem 0.7rem', fontSize: '0.78rem', fontWeight: 700,
                  background: active ? 'rgba(99,102,241,0.8)' : 'transparent',
                  color: active ? '#fff' : '#94a3b8'
                }}
              >
                <i className={item.icon} style={{ fontSize: '0.75rem' }} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {screen === 'resumen' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', lineHeight: 1.4 }}>
            {insights?.profile || 'Análisis del vector'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.55rem' }}>
            {indicators.map((item) => (
              <div key={item.name} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: '10px', padding: '0.65rem 0.75rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, marginBottom: '0.25rem' }}>{item.name}</div>
                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: item.color, marginBottom: '0.4rem' }}>{item.level}</div>
                <div style={{ height: '5px', borderRadius: '99px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: item.width, height: '100%', background: item.color, borderRadius: '99px' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.16)', borderRadius: '10px', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#fde68a', marginBottom: '0.7rem' }}>Cómo afecta</div>
              <NumberedPoints items={insights?.exposure} accent="#fbbf24" />
            </div>
            <div style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.16)', borderRadius: '10px', padding: '0.8rem' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#6ee7b7', marginBottom: '0.7rem' }}>Qué hacer</div>
              <NumberedPoints items={insights?.remediation} accent="#34d399" />
            </div>
          </div>
        </div>
      )}

      {screen === 'tecnico' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Capas</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {(layers.length ? layers : ['Sin capa determinada']).map((layer) => (
                <Tag key={layer} value={layer} style={{ background: 'rgba(99,102,241,0.16)', color: '#c7d2fe' }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>CWE relacionados</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {(cwes.length ? cwes : ['N/A']).map((cwe) => (
                <Tag key={cwe} value={cwe} style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0' }} />
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Plataformas y entornos</div>
            {platforms.length > 0 ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {platforms.slice(0, 12).map((platform, index) => (
                  <span key={`${platform.part}-${platform.name}-${index}`} style={{
                    fontSize: '0.75rem', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.22rem 0.55rem'
                  }}>
                    {platform.name}
                  </span>
                ))}
                {platforms.length > 12 && (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>+{platforms.length - 12}</span>
                )}
              </div>
            ) : (
              <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#cbd5e1' }}>{insights?.technicalDetails?.affectedOS}</div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.7rem' }}>
            <div style={{ background: 'rgba(0,0,0,0.16)', borderRadius: '10px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem' }}>Mitigación</div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#e2e8f0' }}>{insights?.technicalDetails?.possibleMitigations}</div>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.16)', borderRadius: '10px', padding: '0.75rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.3rem' }}>Impacto técnico</div>
              <div style={{ fontSize: '0.82rem', lineHeight: 1.5, color: '#e2e8f0' }}>
                {insights?.technicalDetails?.technicalImpact}
              </div>
            </div>
          </div>
          {references.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.35rem' }}>Referencias oficiales</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {references.slice(0, 6).map((url) => (
                  <a key={url} href={url} target="_blank" rel="noopener noreferrer" title={url} style={{ color: '#a5b4fc', fontSize: '0.8rem', textDecoration: 'none' }}>
                    {hostFromUrl(url)}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {screen === 'verificacion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {steps.length > 0 ? (
            steps.map((step) => (
              <div key={step.title} style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>{step.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', margin: '0.25rem 0 0.55rem', lineHeight: 1.4 }}>{step.desc}</div>
                <div style={{ position: 'relative', background: '#090d16', borderRadius: '8px', padding: '0.7rem 2.2rem 0.7rem 0.7rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.76rem', color: '#6ee7b7', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {step.cmd}
                  <button
                    type="button"
                    title="Copiar comando"
                    onClick={() => onCopy(step.cmd, 'Comando copiado.')}
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(255,255,255,0.08)', border: 'none', color: '#e2e8f0', borderRadius: '6px', cursor: 'pointer', padding: '0.25rem 0.4rem' }}
                  >
                    <i className="pi pi-copy" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>Ajusta las métricas base para obtener comandos de comprobación.</div>
          )}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.55rem' }}>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#e2e8f0' }}>Guías y asesorías</div>
                <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  {cveReady
                    ? 'Busca comprobaciones y avisos públicos para el CVE de la barra superior.'
                    : 'Escribe un CVE válido arriba, por ejemplo CVE-2021-44228, para buscar guías.'}
                </div>
              </div>
              <Button
                label={loadingPocs ? 'Buscando…' : 'Buscar en la web'}
                icon={loadingPocs ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
                onClick={onPocSearch}
                disabled={!cveReady || loadingPocs}
                size="small"
              />
            </div>
            {pocSearchResults?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {pocSearchResults.map((result) => (
                  <a
                    key={result.url}
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', textDecoration: 'none', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '0.7rem 0.8rem' }}
                  >
                    <div style={{ color: '#e0e7ff', fontWeight: 700, fontSize: '0.82rem' }}>{result.title}</div>
                    {result.snippet && <div style={{ color: '#94a3b8', fontSize: '0.76rem', lineHeight: 1.4, marginTop: '0.25rem' }}>{result.snippet}</div>}
                    <div style={{ color: '#818cf8', fontSize: '0.72rem', marginTop: '0.3rem' }}>{hostFromUrl(result.url)}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
  const [insightScreen, setInsightScreen] = useState('resumen');
  const [cveInput, setCveInput] = useState('');
  const [cveError, setCveError] = useState('');
  const [vectorError, setVectorError] = useState('');
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
  const [loadingCve, setLoadingCve] = useState(false);
  const [cveData, setCveData] = useState(null);

  const [pocSearchResults, setPocSearchResults] = useState([]);
  const [loadingPocs, setLoadingPocs] = useState(false);

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

  const copyText = useCallback(async (text, okMessage) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showFeedback('success', okMessage || 'Copiado.');
    } catch {
      showFeedback('error', 'No se pudo copiar.');
    }
  }, [showFeedback]);

  const applyVector = useCallback((raw, { quiet = false } = {}) => {
    const text = String(raw || '').trim();
    if (!text) {
      setVectorError('Pega un vector CVSS para aplicarlo.');
      return false;
    }
    const detected = detectVectorVersion(text);
    const ver = detected || version;
    const svc = ver === '3.1' ? cvssV31Service : cvssV4Service;
    try {
      const parsed = svc.parseVector(text);
      const result = svc.calculate(parsed);
      if (ver === '3.1') setMetrics31({ ...cvssV31Service.DEFAULT_METRICS, ...result.metrics });
      else setMetrics40({ ...cvssV4Service.DEFAULT_METRICS, ...result.metrics });
      if (detected && detected !== version) setVersion(detected);
      setVectorInput(text);
      setVectorError('');
      if (!quiet) showFeedback('success', `Vector CVSS ${ver} aplicado.`);
      return true;
    } catch (error) {
      setVectorError(error.message || 'Vector inválido.');
      return false;
    }
  }, [showFeedback, version]);

  const handleCveChange = (value) => {
    setCveInput(value);
    setCveError('');
    const next = value.trim();
    if (cveData && cveData.cveId !== next) setCveData(null);
    setPocSearchResults([]);
  };

  const handleCveLookup = async () => {
    const cveId = cveInput.trim().toUpperCase();
    if (!CVE_PATTERN.test(cveId)) {
      setCveError('El formato debe ser CVE-AAAA-NNNN, por ejemplo CVE-2021-44228.');
      return;
    }
    setCveError('');
    setCveInput(cveId);
    setLoadingCve(true);
    try {
      const res = await window?.electron?.ipcRenderer?.invoke('network-tools:get-cve-details', { cveId });
      if (res?.success) {
        setCveData(res);
        if (!title.trim()) setTitle(cveId);
        if (!notes.trim() && res.description) setNotes(res.description);
        if (!affectedVersions.trim() && res.affectedPlatforms?.length) {
          setAffectedVersions(res.affectedPlatforms.map((p) => p.name).slice(0, 5).join(', '));
        }
        if (res.cvss?.vectorString) {
          const applied = applyVector(res.cvss.vectorString, { quiet: true });
          showFeedback('success', applied
            ? `Datos de ${cveId} obtenidos de NVD. Vector aplicado.`
            : `Datos de ${cveId} obtenidos de NVD.`);
        } else {
          showFeedback('success', `Datos de ${cveId} obtenidos de NVD.`);
        }
      } else {
        setCveError(res?.error || 'No se pudieron obtener datos del CVE.');
      }
    } catch (error) {
      setCveError('Error al consultar NVD: ' + error.message);
    } finally {
      setLoadingCve(false);
    }
  };

  const handleReset = () => {
    setMetrics({ ...service.DEFAULT_METRICS });
    setTitle('');
    setNotes('');
    setAffectedVersions('');
    setVectorInput('');
    setVectorError('');
    setCveInput('');
    setCveError('');
    setCveData(null);
    setPocSearchResults([]);
    setInsightScreen('resumen');
  };

  const handlePocSearch = async () => {
    const cveId = cveInput.trim().toUpperCase();
    if (!CVE_PATTERN.test(cveId)) return;
    setInsightScreen('verificacion');
    setLoadingPocs(true);
    try {
      const res = await window?.electron?.ipcRenderer?.invoke('network-tools:search-cve-verification', { cveId });
      if (res?.success && res.results) {
        setPocSearchResults(res.results);
        showFeedback('success', `Búsqueda completada. Se encontraron ${res.results.length} resultados.`);
      } else {
        showFeedback('error', res?.error || 'No se pudieron encontrar guías o PoCs para este CVE.');
      }
    } catch (error) {
      showFeedback('error', 'Error al buscar en la web: ' + error.message);
    } finally {
      setLoadingPocs(false);
    }
  };

  const handleImportVector = () => {
    applyVector(vectorInput);
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
    appConfirm({
      message: '¿Eliminar este template?',
      header: 'Confirmar eliminación',
      severity: 'danger',
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
    appConfirm({
      message: '¿Eliminar este registro del historial?',
      header: 'Confirmar eliminación',
      severity: 'danger',
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
    appConfirm({
      message: '¿Limpiar todo el historial?',
      header: 'Confirmar',
      severity: 'danger',
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
      <LookupBar
        cveInput={cveInput}
        cveError={cveError}
        loadingCve={loadingCve}
        onCveChange={handleCveChange}
        onCveLookup={handleCveLookup}
        vectorInput={vectorInput}
        vectorError={vectorError}
        onVectorChange={(value) => {
          setVectorInput(value);
          if (vectorError) setVectorError('');
        }}
        onImportVector={handleImportVector}
      />
      {/* Score header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap',
        background: sevCfg.bg, border: `1px solid ${sevCfg.border}`,
        borderRadius: '12px', padding: '0.9rem 1.1rem'
      }}>
        <ScoreGauge score={computed.score || 0} severity={computed.severity || 'None'} />
        <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.8rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              CVSS {version} · {computed.scoringMode || 'Base'} Score
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px', gap: '2px' }}>
                {['3.1', '4.0'].map(v => (
                  <button
                    key={v}
                    onClick={() => setVersion(v)}
                    style={{
                      padding: '0.2rem 0.6rem', borderRadius: '4px', border: 'none', cursor: 'pointer',
                      fontSize: '0.75rem', fontWeight: 700, transition: 'all 0.2s',
                      background: version === v ? 'rgba(99,102,241,0.75)' : 'transparent',
                      color: version === v ? '#fff' : 'var(--text-color-secondary)',
                      boxShadow: version === v ? '0 1px 4px rgba(99,102,241,0.3)' : 'none'
                    }}
                  >
                    CVSS {v}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', opacity: 0.8 }}>
                {version === '3.1'
                  ? 'Base + Temp + Env'
                  : 'Base + Threat + Env + Supp'}
              </span>
            </div>
          </div>
          <ScoreBar score={computed.score || 0} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: 'var(--text-color-secondary)', wordBreak: 'break-all', flex: 1 }}>
              {computed.error ? <span style={{ color: '#f87171' }}>{computed.error}</span> : computed.vector}
            </div>
            {!computed.error && computed.vector && (
              <Button
                icon="pi pi-copy"
                text
                size="small"
                tooltip="Copiar vector"
                tooltipOptions={{ position: 'top' }}
                onClick={() => copyText(computed.vector, 'Vector copiado.')}
              />
            )}
          </div>
        </div>
      </div>

      <div style={panelCardStyle}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '0.55rem' }}>
          Datos del hallazgo
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.55rem' }}>
          <div>
            <FieldLabel>Título</FieldLabel>
            <InputText value={title} onChange={e => setTitle(e.target.value)} placeholder="Ej: Inyección SQL en el login" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Tecnologías y versiones</FieldLabel>
            <InputText value={affectedVersions} onChange={e => setAffectedVersions(e.target.value)} placeholder="Ej: Apache HTTP Server <= 2.4.49" style={{ width: '100%' }} />
          </div>
          <div>
            <FieldLabel>Notas</FieldLabel>
            <InputText value={notes} onChange={e => setNotes(e.target.value)} placeholder="Contexto y sistemas afectados" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <CveCard key={cveData?.cveId || 'empty'} cveData={cveData} />
      <InsightScreens
        screen={insightScreen}
        onScreenChange={setInsightScreen}
        version={version}
        metrics={metrics}
        insights={auditorInsights}
        cveData={cveData}
        cveReady={CVE_PATTERN.test(cveInput.trim())}
        onPocSearch={handlePocSearch}
        loadingPocs={loadingPocs}
        pocSearchResults={pocSearchResults}
        onCopy={copyText}
      />

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', height: '100%', minHeight: 0, overflowY: 'auto', padding: '0.75rem 0.9rem 1rem' }}>
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

      {feedback && (
        <Message severity={feedback.severity} text={feedback.text} style={{ borderRadius: '8px' }} />
      )}


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

      <AppDialog
        headerTitle="Guardar Template CVSS"
        headerIcon="pi pi-bookmark"
        visible={showTemplateDialog}
        onHide={() => setShowTemplateDialog(false)}
        size="sm"
        confirmLabel="Guardar"
        confirmIcon="pi pi-bookmark"
        onConfirm={handleSaveTemplate}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Nombre del template *</label>
            <InputText value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Ej: RCE remoto critico" style={{ width: '100%' }} autoFocus />
          </div>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Descripcion (opcional)</label>
            <InputText value={templateDesc} onChange={e => setTemplateDesc(e.target.value)} placeholder="Para que tipo de vulnerabilidad..." style={{ width: '100%' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>
            <Tag value={`CVSS ${version}`} style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc' }} />
            <Tag value={`Score: ${Number(computed.score || 0).toFixed(1)}`} style={{ background: getSeverityConfig(computed.severity || 'None').bg, color: getSeverityConfig(computed.severity || 'None').fg }} />
          </div>
        </div>
      </AppDialog>
    </div>
  );
};

export default CvssCalculatorPanel;
