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

function statusColor(status) {
  switch (status) {
    case 'trusted': return '#16a34a';
    case 'self_signed':
    case 'untrusted_ca':
    case 'incomplete_chain': return '#d97706';
    case 'hostname_mismatch':
    case 'expired':
    case 'not_yet_valid': return '#dc2626';
    default: return '#64748b';
  }
}

function statusBg(status) {
  switch (status) {
    case 'trusted': return '#f0fdf4';
    case 'self_signed':
    case 'untrusted_ca':
    case 'incomplete_chain': return '#fffbeb';
    case 'hostname_mismatch':
    case 'expired':
    case 'not_yet_valid': return '#fef2f2';
    default: return '#f8fafc';
  }
}

function riskColor(level) {
  switch (level) {
    case 'CRITICO': return '#dc2626';
    case 'ALTO': return '#ea580c';
    case 'MEDIO': return '#d97706';
    default: return '#16a34a';
  }
}

function formatDn(value) {
  if (!value) return 'N/A';
  if (typeof value === 'string') return value;
  const order = ['CN', 'O', 'OU', 'L', 'ST', 'C', 'emailAddress'];
  const parts = [];
  const seen = new Set();
  for (const key of order) {
    if (value[key]) {
      parts.push(`${key}=${value[key]}`);
      seen.add(key);
    }
  }
  for (const key of Object.keys(value)) {
    if (!seen.has(key) && value[key]) parts.push(`${key}=${value[key]}`);
  }
  return parts.join(', ') || 'N/A';
}

function kvRow(label, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(String(value))}</td></tr>`;
}

function listItems(items) {
  if (!items || !items.length) return '<p class="muted">Ninguno.</p>';
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

export const sslReportService = {
  createHtml(report) {
    const host = report?.host || 'N/A';
    const port = report?.port || 443;
    const trust = report?.trust || {};
    const cert = report?.certificate || {};
    const security = report?.security || {};
    const status = trust.status || (cert.isValid ? 'trusted' : 'unknown');
    const statusLabel = trust.statusLabel || (cert.isValid ? 'Valido' : 'No confiable');
    const color = statusColor(status);
    const bg = statusBg(status);
    const score = Number(security.score ?? 0);
    const risk = security.riskLevel || 'ALTO';
    const generatedAt = formatDate(report?.generatedAt || new Date().toISOString());
    const days = cert.daysUntilExpiry;
    const expiryText = typeof days === 'number'
      ? (days < 0 ? `Expirado hace ${Math.abs(days)} dia(s)` : `${days} dias`)
      : 'N/A';

    const issuesHtml = (trust.issues || []).length
      ? (trust.issues || []).map((issue) => `
          <div class="issue issue-${escapeHtml(issue.severity || 'high')}">
            <div class="issue-title">${escapeHtml(issue.title || issue.code)}</div>
            <div class="issue-detail">${escapeHtml(issue.detail || '')}</div>
          </div>
        `).join('')
      : '<p class="muted">Sin problemas de confianza detectados.</p>';

    const sans = cert.sans && cert.sans.length
      ? cert.sans
      : (cert.subjectAltNames || []).map((raw) => ({ raw, value: raw }));
    const matchedSan = trust.hostnameMatch?.matchedSan;
    const sansHtml = sans.length
      ? sans.map((san) => {
        const label = san.raw || san.value || '';
        const matched = matchedSan && String(san.value || label).toLowerCase() === String(matchedSan).toLowerCase();
        return `<span class="san ${matched ? 'san-match' : ''}">${escapeHtml(label)}</span>`;
      }).join('')
      : '<span class="muted">Sin SAN</span>';

    const protocols = report?.supportedProtocols || [];
    const protocolsHtml = protocols.length
      ? `<table>
          <thead><tr><th>Protocolo</th><th>Estado</th><th>Cipher</th></tr></thead>
          <tbody>
            ${protocols.map((p) => `
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${p.deprecated ? 'Obsoleto' : 'Seguro'}</td>
                <td class="mono">${escapeHtml(p.cipher?.name || 'N/A')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>`
      : '<p class="muted">No se detectaron protocolos.</p>';

    const chain = report?.chain || [];
    const chainHtml = chain.length
      ? chain.map((item, idx) => `
          <div class="chain-item">
            <div class="chain-title">${escapeHtml(item.role || `Certificado ${idx + 1}`)}</div>
            <table>
              ${kvRow('Sujeto', item.subjectDn || formatDn(item.subject))}
              ${kvRow('Emisor', item.issuerDn || formatDn(item.issuer))}
              ${kvRow('Valido desde', item.validFrom)}
              ${kvRow('Valido hasta', item.validTo)}
              ${kvRow('Fingerprint SHA-256', item.fingerprint256)}
            </table>
          </div>
        `).join('')
      : '<p class="muted">Cadena no disponible.</p>';

    const recs = security.recommendations || [];
    const pem = cert.pem || '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8"/>
  <title>Informe SSL Checker — ${escapeHtml(host)}:${escapeHtml(port)}</title>
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
    .risk { font-weight: 800; color: ${riskColor(risk)}; margin-top: 0.25rem; }
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
    table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    th, td { text-align: left; padding: 0.4rem 0.3rem; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
    th { width: 180px; color: #64748b; font-weight: 600; }
    .mono { font-family: Consolas, 'Courier New', monospace; font-size: 0.75rem; word-break: break-all; }
    .muted { color: #64748b; font-size: 0.82rem; }
    .issue { border-left: 4px solid #d97706; background: #fffbeb; padding: 0.55rem 0.7rem; border-radius: 0 8px 8px 0; margin-bottom: 0.5rem; }
    .issue-critical { border-left-color: #dc2626; background: #fef2f2; }
    .issue-high { border-left-color: #ea580c; background: #fff7ed; }
    .issue-title { font-weight: 700; font-size: 0.84rem; margin-bottom: 0.15rem; }
    .issue-detail { font-size: 0.8rem; color: #334155; line-height: 1.45; }
    .san {
      display: inline-block;
      background: #f1f5f9;
      border-radius: 999px;
      padding: 0.15rem 0.55rem;
      margin: 0.15rem 0.2rem 0.15rem 0;
      font-size: 0.75rem;
      font-family: Consolas, 'Courier New', monospace;
    }
    .san-match { background: #dcfce7; color: #166534; font-weight: 700; }
    .chain-item { margin-bottom: 0.8rem; }
    .chain-title { font-weight: 700; color: #0369a1; margin-bottom: 0.3rem; }
    ul { padding-left: 1.15rem; font-size: 0.82rem; line-height: 1.5; color: #334155; }
    .pem {
      white-space: pre-wrap;
      font-family: Consolas, 'Courier New', monospace;
      font-size: 0.65rem;
      background: #0f172a;
      color: #e2e8f0;
      padding: 0.8rem;
      border-radius: 8px;
      word-break: break-all;
    }
    .report-footer { text-align: center; color: #64748b; font-size: 0.75rem; margin-top: 0.5rem; }
  </style>
</head>
<body>
  <div class="page">
    <div class="report-header">
      <div>
        <h1>Informe SSL/TLS Checker</h1>
        <div class="report-meta">
          <strong>Objetivo:</strong> ${escapeHtml(host)}:${escapeHtml(port)}<br>
          <strong>Generado:</strong> ${escapeHtml(generatedAt)}<br>
          <strong>Herramienta:</strong> NodeTerm SSL Checker
        </div>
      </div>
    </div>

    <div class="score-card">
      <div>
        <div class="badge">${escapeHtml(String(statusLabel).toUpperCase())}</div>
        <div style="font-size:0.9rem;font-weight:700;margin-bottom:0.25rem;">${escapeHtml(host)}:${escapeHtml(port)}</div>
        <div style="font-size:0.82rem;color:#334155;max-width:540px;line-height:1.45;">${escapeHtml(trust.summary || '')}</div>
      </div>
      <div style="text-align:right;">
        <div class="score-num">${escapeHtml(score)}<span>/100</span></div>
        <div class="risk">${escapeHtml(risk)}</div>
      </div>
    </div>

    <div class="card">
      <h2>Diagnostico de confianza</h2>
      ${issuesHtml}
    </div>

    <div class="card">
      <h2>Identidad del certificado</h2>
      <table>
        ${kvRow('Sujeto', cert.subjectDn || formatDn(cert.subject))}
        ${kvRow('Emisor', cert.issuerDn || formatDn(cert.issuer))}
        ${kvRow('Valido desde', cert.validFrom)}
        ${kvRow('Valido hasta', cert.validTo)}
        ${kvRow('Expiracion', expiryText)}
        ${kvRow('Algoritmo de firma', cert.signatureAlgorithm)}
        ${kvRow('Clave publica', cert.publicKey ? `${cert.publicKey.type || 'N/A'} ${cert.publicKey.bits ? `(${cert.publicKey.bits} bits)` : ''}` : '')}
        ${kvRow('Numero de serie', cert.serialNumber)}
        ${kvRow('Fingerprint SHA-1', cert.fingerprint)}
        ${kvRow('Fingerprint SHA-256', cert.fingerprint256)}
      </table>
      <div style="margin-top:0.7rem;">
        <div class="muted" style="margin-bottom:0.3rem;">Nombres alternativos (SAN)</div>
        ${sansHtml}
      </div>
    </div>

    <div class="card">
      <h2>Protocolos soportados</h2>
      ${protocolsHtml}
    </div>

    <div class="card">
      <h2>Cadena de certificados</h2>
      ${chainHtml}
    </div>

    <div class="card">
      <h2>Recomendaciones</h2>
      ${listItems(recs)}
    </div>

    ${pem ? `
    <div class="card">
      <h2>Anexo: PEM del certificado de servidor</h2>
      <pre class="pem">${escapeHtml(pem)}</pre>
    </div>` : ''}

    <div class="report-footer">
      Generado por NodeTerm · SSL Checker · ${escapeHtml(generatedAt)}
    </div>
  </div>
</body>
</html>`;
  }
};
