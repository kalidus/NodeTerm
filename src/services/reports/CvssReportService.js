const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function severityColor(severity) {
  switch (severity) {
    case 'Critical': return '#dc2626';
    case 'High':     return '#ea580c';
    case 'Medium':   return '#d97706';
    case 'Low':      return '#2563eb';
    default:         return '#6b7280';
  }
}

function severityBg(severity) {
  switch (severity) {
    case 'Critical': return '#fef2f2';
    case 'High':     return '#fff7ed';
    case 'Medium':   return '#fffbeb';
    case 'Low':      return '#eff6ff';
    default:         return '#f9fafb';
  }
}

function severityText(severity, score) {
  const s = Number(score).toFixed(1);
  switch (severity) {
    case 'Critical':
      return `Esta vulnerabilidad tiene una puntuación CVSS de ${s} (Crítica). Requiere atención inmediata. Un atacante puede explotarla con alto impacto sobre los sistemas afectados, potencialmente comprometiendo su confidencialidad, integridad y disponibilidad de forma total o casi total. Se recomienda aplicar el parche o mitigación en el plazo más breve posible.`;
    case 'High':
      return `Esta vulnerabilidad tiene una puntuación CVSS de ${s} (Alta). Representa un riesgo significativo. La explotación exitosa puede comprometer gravemente uno o varios pilares de seguridad (CIA). Se recomienda priorizar su remediación dentro del ciclo de parcheo urgente.`;
    case 'Medium':
      return `Esta vulnerabilidad tiene una puntuación CVSS de ${s} (Media). Aunque no es inmediatamente crítica, puede ser explotada bajo ciertas condiciones. Se recomienda planificar su mitigación en el próximo ciclo de parcheo regular.`;
    case 'Low':
      return `Esta vulnerabilidad tiene una puntuación CVSS de ${s} (Baja). El riesgo es limitado y generalmente requiere condiciones específicas o privilegios elevados para su explotación. Debe incluirse en el plan de mitigación a largo plazo.`;
    default:
      return `Esta vulnerabilidad tiene una puntuación CVSS de ${s}. El riesgo evaluado es mínimo o nulo según las métricas proporcionadas.`;
  }
}

const METRIC_LABELS_V4 = {
  AV:  { label: 'Attack Vector',                    labelEs: 'Vector de Ataque' },
  AC:  { label: 'Attack Complexity',                labelEs: 'Complejidad del Ataque' },
  AT:  { label: 'Attack Requirements',              labelEs: 'Requisitos de Ataque' },
  PR:  { label: 'Privileges Required',              labelEs: 'Privilegios Requeridos' },
  UI:  { label: 'User Interaction',                 labelEs: 'Interacción de Usuario' },
  VC:  { label: 'Vuln. System Confidentiality',     labelEs: 'Confidencialidad (Sistema Vulnerable)' },
  VI:  { label: 'Vuln. System Integrity',           labelEs: 'Integridad (Sistema Vulnerable)' },
  VA:  { label: 'Vuln. System Availability',        labelEs: 'Disponibilidad (Sistema Vulnerable)' },
  SC:  { label: 'Subsequent System Confidentiality',labelEs: 'Confidencialidad (Sistemas Posteriores)' },
  SI:  { label: 'Subsequent System Integrity',      labelEs: 'Integridad (Sistemas Posteriores)' },
  SA:  { label: 'Subsequent System Availability',   labelEs: 'Disponibilidad (Sistemas Posteriores)' }
};

const METRIC_LABELS_V31 = {
  AV:  { label: 'Attack Vector',         labelEs: 'Vector de Ataque' },
  AC:  { label: 'Attack Complexity',     labelEs: 'Complejidad del Ataque' },
  PR:  { label: 'Privileges Required',   labelEs: 'Privilegios Requeridos' },
  UI:  { label: 'User Interaction',      labelEs: 'Interacción de Usuario' },
  S:   { label: 'Scope',                 labelEs: 'Alcance' },
  C:   { label: 'Confidentiality',       labelEs: 'Confidencialidad' },
  I:   { label: 'Integrity',             labelEs: 'Integridad' },
  A:   { label: 'Availability',          labelEs: 'Disponibilidad' }
};

const VALUE_LABELS = {
  N:  'None',
  L:  'Low',
  H:  'High',
  A:  'Adjacent / Active',
  P:  'Physical / Passive / Present',
  R:  'Required',
  U:  'Unchanged',
  C:  'Changed / Critical',
  M:  'Medium'
};

function getValueLabel(v) {
  return VALUE_LABELS[v] || v;
}

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  } catch { return value; }
}

function buildMetricRows(metrics = {}, version = '4.0') {
  const labels = version === '3.1' ? METRIC_LABELS_V31 : METRIC_LABELS_V4;
  return Object.entries(metrics)
    .map(([key, val]) => {
      const info = labels[key] || { label: key, labelEs: key };
      return `
        <tr>
          <td class="metric-key">${escapeHtml(key)}</td>
          <td>${escapeHtml(info.labelEs)}<br><span class="muted">${escapeHtml(info.label)}</span></td>
          <td><span class="metric-value">${escapeHtml(getValueLabel(val))}</span> <span class="metric-code">(${escapeHtml(val)})</span></td>
        </tr>`;
    })
    .join('');
}

function buildGaugeSvg(score, severity) {
  const color = severityColor(severity);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(Number(score) / 10, 0), 1);
  const dashOffset = circumference * (1 - pct);
  return `
    <svg width="130" height="130" viewBox="0 0 130 130">
      <circle cx="65" cy="65" r="${radius}" fill="none" stroke="#f3f4f6" stroke-width="10"/>
      <circle cx="65" cy="65" r="${radius}" fill="none" stroke="${color}" stroke-width="10"
        stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
        stroke-linecap="round" transform="rotate(-90 65 65)"/>
      <text x="65" y="60" text-anchor="middle" fill="${color}" font-size="26" font-weight="700" font-family="Inter, Arial, sans-serif">${Number(score).toFixed(1)}</text>
      <text x="65" y="79" text-anchor="middle" fill="${color}" font-size="11" font-family="Inter, Arial, sans-serif">${escapeHtml(severity)}</text>
    </svg>`;
}

export const cvssReportService = {
  createHtml(report) {
    const score = Number(report?.score ?? 0).toFixed(1);
    const severity = report?.severity || 'None';
    const version = report?.version || '4.0';
    const color = severityColor(severity);
    const bg = severityBg(severity);
    const metrics = report?.metrics || {};
    const metricRows = buildMetricRows(metrics, version);
    const gaugeSvg = buildGaugeSvg(score, severity);
    const explanation = severityText(severity, score);
    const generatedAt = formatDate(report?.createdAt || new Date().toISOString());

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>CVSS ${escapeHtml(version)} Report — ${escapeHtml(report?.title || 'Sin título')}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
      padding: 0;
      min-height: 100vh;
    }

    .page {
      max-width: 860px;
      margin: 0 auto;
      padding: 2rem 1.5rem 3rem;
    }

    /* ── Header ── */
    .report-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #f1f5f9;
      border-radius: 16px;
      padding: 1.8rem 2rem;
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .report-header h1 {
      font-size: 1.45rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
      color: #f8fafc;
    }

    .report-meta {
      font-size: 0.82rem;
      color: #94a3b8;
      line-height: 1.7;
    }

    .report-meta strong { color: #cbd5e1; }

    .version-badge {
      display: inline-block;
      background: rgba(99,102,241,0.25);
      color: #a5b4fc;
      border: 1px solid rgba(99,102,241,0.4);
      border-radius: 999px;
      padding: 0.2rem 0.7rem;
      font-size: 0.75rem;
      font-weight: 700;
      margin-top: 0.35rem;
    }

    /* ── Score card ── */
    .score-card {
      background: ${bg};
      border: 2px solid ${color};
      border-radius: 14px;
      padding: 1.4rem 1.8rem;
      margin-bottom: 1.4rem;
      display: flex;
      align-items: center;
      gap: 1.8rem;
      flex-wrap: wrap;
    }

    .score-text-block { flex: 1; min-width: 200px; }

    .score-title {
      font-size: 1rem;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 0.3rem;
    }

    .score-explanation {
      font-size: 0.85rem;
      color: #374151;
      line-height: 1.6;
      max-width: 560px;
    }

    /* ── Escala visual ── */
    .score-scale {
      height: 8px;
      border-radius: 99px;
      background: linear-gradient(90deg, #2563eb 0%, #f59e0b 40%, #ea580c 70%, #dc2626 100%);
      position: relative;
      margin-top: 0.8rem;
      margin-bottom: 0.2rem;
    }

    .score-indicator {
      position: absolute;
      top: -4px;
      width: 16px;
      height: 16px;
      background: #fff;
      border: 3px solid ${color};
      border-radius: 50%;
      transform: translateX(-50%);
      left: ${Math.min(Math.max(Number(score) / 10, 0), 1) * 100}%;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
    }

    .scale-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.7rem;
      color: #6b7280;
      margin-top: 6px;
    }

    /* ── Cards ── */
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 1.4rem 1.6rem;
      margin-bottom: 1.2rem;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }

    .card h2 {
      font-size: 0.95rem;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid #f1f5f9;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .card h2 .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 0.8rem;
    }

    /* ── Vector ── */
    .vector-box {
      font-family: 'Consolas', 'Courier New', monospace;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 0.8rem 1rem;
      border-radius: 8px;
      word-break: break-all;
      font-size: 0.82rem;
      color: #1d4ed8;
      line-height: 1.6;
    }

    /* ── Tabla métricas ── */
    table { width: 100%; border-collapse: collapse; }

    thead th {
      background: #f8fafc;
      color: #475569;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      padding: 0.6rem 0.8rem;
      text-align: left;
      border-bottom: 2px solid #e2e8f0;
    }

    tbody tr { transition: background 0.15s; }
    tbody tr:hover { background: #f8fafc; }

    tbody td {
      padding: 0.65rem 0.8rem;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.83rem;
      color: #1e293b;
      vertical-align: top;
    }

    .metric-key {
      font-family: 'Consolas', monospace;
      font-weight: 700;
      color: #6366f1;
      width: 50px;
    }

    .muted { color: #94a3b8; font-size: 0.75rem; }

    .metric-value {
      font-weight: 600;
      color: #0f172a;
    }

    .metric-code {
      color: #6b7280;
      font-size: 0.78rem;
      font-family: 'Consolas', monospace;
    }

    /* ── Notas ── */
    .notes-box {
      background: #fafafa;
      border-left: 3px solid #e2e8f0;
      padding: 0.7rem 1rem;
      border-radius: 0 8px 8px 0;
      font-size: 0.85rem;
      color: #374151;
      line-height: 1.6;
      white-space: pre-wrap;
    }

    /* ── Footer ── */
    .report-footer {
      margin-top: 2rem;
      text-align: center;
      font-size: 0.75rem;
      color: #94a3b8;
      border-top: 1px solid #e2e8f0;
      padding-top: 1rem;
    }

    /* ── Print ── */
    @media print {
      body { background: #fff; }
      .page { padding: 1rem; }
      .report-header { background: #1e293b !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .score-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div class="report-header">
      <div>
        <h1>Reporte de Vulnerabilidad CVSS</h1>
        <div class="report-meta">
          <strong>Hallazgo:</strong> ${escapeHtml(report?.title || 'Sin título')}<br>
          <strong>Generado:</strong> ${escapeHtml(generatedAt)}<br>
          <span class="version-badge">CVSS ${escapeHtml(version)}</span>
        </div>
      </div>
      <div>
        ${gaugeSvg}
      </div>
    </div>

    <!-- Score Card -->
    <div class="score-card">
      <div>
        ${gaugeSvg.replace('width="130" height="130"', 'width="90" height="90"').replace(/font-size="26"/g, 'font-size="20"').replace(/font-size="11"/g, 'font-size="9"')}
      </div>
      <div class="score-text-block">
        <div class="score-title">Puntuación Base: ${escapeHtml(score)} / 10.0 — ${escapeHtml(severity)}</div>
        <p class="score-explanation">${escapeHtml(explanation)}</p>
        <div class="score-scale">
          <div class="score-indicator"></div>
        </div>
        <div class="scale-labels">
          <span style="color:#6b7280">0.0 · None</span>
          <span style="color:#2563eb">Low</span>
          <span style="color:#d97706">Medium</span>
          <span style="color:#ea580c">High</span>
          <span style="color:#dc2626">Critical · 10.0</span>
        </div>
      </div>
    </div>

    <!-- Vector -->
    <div class="card">
      <h2><span class="icon">🔗</span> Vector CVSS</h2>
      <div class="vector-box">${escapeHtml(report?.vector || 'No disponible')}</div>
    </div>

    <!-- Métricas -->
    <div class="card">
      <h2><span class="icon">📊</span> Métricas Base</h2>
      <table>
        <thead>
          <tr>
            <th style="width:50px">Clave</th>
            <th>Métrica</th>
            <th>Valor</th>
          </tr>
        </thead>
        <tbody>
          ${metricRows}
        </tbody>
      </table>
    </div>

    <!-- Notas -->
    ${report?.notes ? `
    <div class="card">
      <h2><span class="icon">📝</span> Notas del Análisis</h2>
      <div class="notes-box">${escapeHtml(report.notes)}</div>
    </div>
    ` : ''}

    <!-- Guía de severidad -->
    <div class="card">
      <h2><span class="icon">ℹ️</span> Guía de Clasificación CVSS</h2>
      <table>
        <thead>
          <tr><th>Rango</th><th>Severidad</th><th>Recomendación</th></tr>
        </thead>
        <tbody>
          <tr><td style="font-weight:700;color:#6b7280">0.0</td><td>None</td><td>Sin riesgo apreciable.</td></tr>
          <tr><td style="font-weight:700;color:#2563eb">0.1 – 3.9</td><td>Low</td><td>Parchear en el próximo ciclo planificado.</td></tr>
          <tr><td style="font-weight:700;color:#d97706">4.0 – 6.9</td><td>Medium</td><td>Mitigar en el plazo de 30-90 días.</td></tr>
          <tr><td style="font-weight:700;color:#ea580c">7.0 – 8.9</td><td>High</td><td>Parchear de forma urgente (< 30 días).</td></tr>
          <tr><td style="font-weight:700;color:#dc2626">9.0 – 10.0</td><td>Critical</td><td>Acción inmediata requerida (< 7 días).</td></tr>
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      Generado por NodeTerm · CVSS ${escapeHtml(version)} Calculator · ${escapeHtml(generatedAt)}
    </div>

  </div>
</body>
</html>`;
  }
};
