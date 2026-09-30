const escapeHtml = (value = '') =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

function formatDate(value) {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return String(value);
  }
}

function scoreColor(present, total) {
  if (!total) return '#64748b';
  const ratio = present / total;
  if (ratio >= 0.85) return '#16a34a';
  if (ratio >= 0.6) return '#d97706';
  return '#dc2626';
}

function scoreBg(present, total) {
  if (!total) return '#f8fafc';
  const ratio = present / total;
  if (ratio >= 0.85) return '#f0fdf4';
  if (ratio >= 0.6) return '#fffbeb';
  return '#fef2f2';
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname || url || 'N/A';
  } catch {
    return url || 'N/A';
  }
}

export const httpHeadersReportService = {
  createHtml(report) {
    const url = report?.url || 'N/A';
    const finalUrl = report?.finalUrl || url;
    const host = hostFromUrl(finalUrl);
    const statusCode = report?.statusCode != null ? String(report.statusCode) : 'N/A';
    const statusMessage = report?.statusMessage || '';
    const method = report?.method || 'N/A';
    const timing = report?.timing?.responseTime != null
      ? `${report.timing.responseTime} ms`
      : 'N/A';
    const generatedAt = formatDate(report?.generatedAt || new Date().toISOString());
    const securityHeaders = report?.securityHeaders || {};
    const headers = report?.headers || {};
    const securityEntries = Object.entries(securityHeaders);
    const presentCount = securityEntries.filter(([, value]) => Boolean(value)).length;
    const totalCount = securityEntries.length;
    const color = scoreColor(presentCount, totalCount);
    const bg = scoreBg(presentCount, totalCount);
    const redirected = finalUrl && url && finalUrl !== url;

    const securityRows = securityEntries.length
      ? securityEntries.map(([key, value]) => {
        const present = Boolean(value);
        return `<tr>
          <td>${escapeHtml(key)}</td>
          <td><span class="chip ${present ? 'chip-ok' : 'chip-miss'}">${present ? 'Presente' : 'Ausente'}</span></td>
          <td class="mono">${present ? escapeHtml(String(value)) : '<span class="muted">-</span>'}</td>
        </tr>`;
      }).join('')
      : '<tr><td colspan="3" class="muted">No hay cabeceras de seguridad para mostrar.</td></tr>';

    const headerRows = Object.entries(headers).length
      ? Object.entries(headers).map(([key, value]) => `
          <tr>
            <td class="hdr">${escapeHtml(key)}</td>
            <td class="mono">${escapeHtml(String(value ?? ''))}</td>
          </tr>
        `).join('')
      : '<tr><td colspan="2" class="muted">No se recibieron cabeceras HTTP.</td></tr>';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Informe HTTP Headers - ${escapeHtml(host)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      background: #f8fafc;
      color: #0f172a;
    }
    .page { max-width: 860px; margin: 0 auto; padding: 1.6rem 1.4rem 2.4rem; }
    .report-header {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #f1f5f9;
      border-radius: 14px;
      padding: 1.5rem 1.7rem;
      margin-bottom: 1.2rem;
    }
    .report-header h1 { font-size: 1.35rem; margin-bottom: 0.3rem; }
    .report-meta { font-size: 0.82rem; color: #94a3b8; line-height: 1.7; }
    .report-meta strong { color: #cbd5e1; }
    .score-card {
      background: ${bg};
      border: 2px solid ${color};
      border-radius: 12px;
      padding: 1.1rem 1.3rem;
      margin-bottom: 1.1rem;
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .badge {
      display: inline-block;
      background: ${color};
      color: #fff;
      font-weight: 700;
      font-size: 0.75rem;
      letter-spacing: 0.04em;
      border-radius: 999px;
      padding: 0.2rem 0.7rem;
      margin-bottom: 0.4rem;
    }
    .score-num { font-size: 2rem; font-weight: 800; color: ${color}; line-height: 1; }
    .score-num span { font-size: 0.9rem; opacity: 0.7; font-weight: 600; }
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 1rem 1.15rem;
      margin-bottom: 1rem;
    }
    .card h2 {
      font-size: 0.95rem;
      margin-bottom: 0.7rem;
      color: #1e293b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 0.4rem;
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.8rem; }
    th, td { text-align: left; padding: 0.38rem 0.3rem; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
    th { color: #64748b; font-weight: 600; }
    .hdr { width: 200px; color: #2563eb; font-weight: 600; word-break: break-all; }
    .mono { font-family: Consolas, 'Courier New', monospace; font-size: 0.72rem; word-break: break-all; }
    .muted { color: #64748b; font-size: 0.82rem; }
    .chip {
      display: inline-block;
      font-weight: 700;
      font-size: 0.7rem;
      border-radius: 999px;
      padding: 0.12rem 0.5rem;
    }
    .chip-ok { background: #dcfce7; color: #166534; }
    .chip-miss { background: #ffedd5; color: #9a3412; }
    .report-footer { text-align: center; color: #64748b; font-size: 0.75rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="page">
    <div class="report-header">
      <div>
        <h1>Informe HTTP Headers</h1>
        <div class="report-meta">
          <strong>URL:</strong> ${escapeHtml(url)}<br>
          ${redirected ? `<strong>URL final:</strong> ${escapeHtml(finalUrl)}<br>` : ''}
          <strong>Generado:</strong> ${escapeHtml(generatedAt)}<br>
          <strong>Herramienta:</strong> NodeTerm HTTP Headers
        </div>
      </div>
    </div>

    <div class="score-card">
      <div>
        <div class="badge">HTTP ${escapeHtml(statusCode)}${statusMessage ? ` ${escapeHtml(statusMessage)}` : ''}</div>
        <div style="font-size:0.9rem;font-weight:700;margin-bottom:0.25rem;">${escapeHtml(host)}</div>
        <div style="font-size:0.82rem;color:#334155;line-height:1.45;">
          Metodo ${escapeHtml(method)} · Tiempo ${escapeHtml(timing)}
        </div>
      </div>
      <div style="text-align:right;">
        <div class="score-num">${escapeHtml(String(presentCount))}<span>/${escapeHtml(String(totalCount || 7))}</span></div>
        <div style="font-size:0.78rem;color:#475569;font-weight:600;margin-top:0.2rem;">Cabeceras de seguridad</div>
      </div>
    </div>

    ${report?.error ? `
    <div class="card">
      <h2>Aviso</h2>
      <p class="muted">${escapeHtml(report.error)}</p>
    </div>` : ''}

    <div class="card">
      <h2>Cabeceras de seguridad</h2>
      <table>
        <thead>
          <tr><th>Cabecera</th><th>Estado</th><th>Valor</th></tr>
        </thead>
        <tbody>
          ${securityRows}
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>Todas las cabeceras HTTP</h2>
      <table>
        <thead>
          <tr><th>Nombre</th><th>Valor</th></tr>
        </thead>
        <tbody>
          ${headerRows}
        </tbody>
      </table>
    </div>

    <div class="report-footer">
      Generado por NodeTerm · HTTP Headers · ${escapeHtml(generatedAt)}
    </div>
  </div>
</body>
</html>`;
  }
};
