/**
 * report/index.js - Generación de informes forenses (Markdown / HTML / JSON)
 * El PDF se genera desde el HTML con printToPDF de Electron (ver forensics-handlers.js).
 */
const { redactDeep, redactText } = require('../redaction');

const SEVERITY_LABEL = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
  info: 'Informativa'
};
const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low', 'info'];
const SEVERITY_COLOR = { critical: '#b91c1c', high: '#ea580c', medium: '#ca8a04', low: '#2563eb', info: '#6b7280' };
const RISK_LABEL = {
  critical: 'CRÍTICO — indicios claros de compromiso',
  high: 'ALTO — hallazgos graves que requieren actuación inmediata',
  medium: 'MEDIO — hallazgos que requieren revisión',
  low: 'BAJO — hallazgos menores',
  none: 'SIN HALLAZGOS — no se detectaron indicadores con las reglas actuales'
};

function esc(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mdEsc(text) {
  return String(text ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
}

function fmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? String(iso) : `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC`;
}

function prepare(data, { redact }) {
  const base = {
    case: data.case || {},
    artifacts: data.artifacts || [],
    findings: data.findings?.findings || [],
    summary: data.findings?.summary || { counts: {}, score: 0, risk: 'none', tactics: [] },
    facts: data.findings?.facts || {},
    timeline: data.timeline?.events || [],
    aiSummary: data.aiSummary || null,
    audit: data.audit || []
  };
  return redact ? redactDeep(base) : base;
}

function relevantTimeline(events, max = 120) {
  const important = new Set([
    'login-ok', 'login', 'account-change', 'group-change', 'task-created', 'service-installed', 'log-cleared',
    'audit-policy', 'persist-unit', 'file-tmp-exec', 'file-system-binary', 'file-suid', 'file-dropped', 'boot', 'reboot', 'rdp', 'defender', 'powershell'
  ]);
  const picked = events.filter((e) => important.has(e.type));
  return picked.slice(-max);
}

function mitreTable(findings) {
  const map = new Map();
  findings.forEach((f) => (f.mitre || []).forEach((m) => {
    const key = m.id;
    const entry = map.get(key) || { ...m, rules: new Set() };
    entry.rules.add(f.ruleId);
    map.set(key, entry);
  }));
  return [...map.values()].map((m) => ({ ...m, rules: [...m.rules] })).sort((a, b) => a.tactic.localeCompare(b.tactic) || a.id.localeCompare(b.id));
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

function toMarkdown(d) {
  const c = d.case;
  const t = c.target || {};
  const counts = d.summary.counts || {};
  const L = [];
  L.push(`# Informe de análisis forense — ${t.host || 'host'}`);
  L.push('');
  L.push(`**Caso:** \`${c.caseId}\`  `);
  L.push(`**Fecha de recolección:** ${fmtDate(c.createdAt)}  `);
  L.push(`**Finalizado:** ${fmtDate(c.finishedAt)} (${c.status || '-'})  `);
  L.push(`**Operador:** ${c.operator || '-'} (equipo analista: ${c.analystHost || '-'})  `);
  L.push(`**Herramienta:** ${c.tool?.name || 'NodeTerm Forensics'} ${c.tool?.version || ''}  `);
  L.push(`**Objetivo:** ${t.label || t.host || '-'} · plataforma ${t.platform || '-'}${t.vendor ? ` (${t.vendor})` : ''} · perfil ${c.profile || '-'}`);
  L.push('');
  L.push('## 1. Resumen ejecutivo');
  L.push('');
  L.push(`**Nivel de riesgo:** ${RISK_LABEL[d.summary.risk] || d.summary.risk} (puntuación ${d.summary.score}/100)`);
  L.push('');
  L.push('| Severidad | Hallazgos |');
  L.push('|---|---|');
  SEVERITY_ORDER.forEach((s) => L.push(`| ${SEVERITY_LABEL[s]} | ${counts[s] || 0} |`));
  L.push('');
  if (d.summary.tactics?.length) L.push(`**Tácticas MITRE ATT&CK observadas:** ${d.summary.tactics.join(', ')}`);
  L.push('');
  if (d.aiSummary?.text) {
    L.push('### Resumen asistido por IA');
    L.push('');
    L.push(`> Generado por IA (${d.aiSummary.model || 'modelo desconocido'}) el ${fmtDate(d.aiSummary.generatedAt)}. Debe ser validado por un analista.`);
    L.push('');
    L.push(d.aiSummary.text);
    L.push('');
  }

  L.push('## 2. Datos del sistema');
  L.push('');
  const f = d.facts;
  const factRows = [
    ['Hostname', f.hostname], ['Sistema operativo', f.os], ['Kernel', f.kernel], ['Uptime', f.uptime],
    ['Hora del host (UTC)', f.collectedAt], ['Identidad de recolección', f.identity],
    ['Procesos', f.processCount], ['Puertos en escucha', f.listeningCount], ['Conexiones establecidas', f.establishedCount]
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');
  L.push('| Dato | Valor |');
  L.push('|---|---|');
  factRows.forEach(([k, v]) => L.push(`| ${k} | ${mdEsc(v)} |`));
  if (c.privileges) L.push(`| Privilegios | uid=${c.privileges.uid ?? '?'}, sudo=${c.privileges.sudo} |`);
  L.push('');

  L.push('## 3. Hallazgos');
  L.push('');
  if (!d.findings.length) L.push('_No se han detectado hallazgos con las reglas actuales. Esto no garantiza la ausencia de compromiso._');
  d.findings.forEach((fi) => {
    L.push(`### ${fi.id} · ${fi.title}  [${SEVERITY_LABEL[fi.severity] || fi.severity}]`);
    L.push('');
    L.push(fi.description);
    if (fi.mitre?.length) L.push(`\n**MITRE ATT&CK:** ${fi.mitre.map((m) => `${m.id} ${m.name}`).join('; ')}`);
    L.push(`\n**Regla:** \`${fi.ruleId}\` · **Coincidencias:** ${fi.count}`);
    if (fi.evidence?.length) {
      L.push('\n**Evidencias:**\n');
      fi.evidence.forEach((e) => L.push(`- \`${e.collectorId}\`: \`${String(e.excerpt).replace(/`/g, "'")}\``));
    }
    if (fi.recommendation) L.push(`\n**Recomendación:** ${fi.recommendation}`);
    L.push('');
  });

  const mt = mitreTable(d.findings);
  if (mt.length) {
    L.push('## 4. Mapeo MITRE ATT&CK');
    L.push('');
    L.push('| Táctica | Técnica | Reglas |');
    L.push('|---|---|---|');
    mt.forEach((m) => L.push(`| ${m.tactic} | ${m.id} ${mdEsc(m.name)} | ${m.rules.join(', ')} |`));
    L.push('');
  }

  const tl = relevantTimeline(d.timeline);
  L.push('## 5. Línea de tiempo (eventos relevantes)');
  L.push('');
  if (!tl.length) L.push('_Sin eventos relevantes._');
  else {
    L.push('| Fecha (UTC) | Tipo | Evento |');
    L.push('|---|---|---|');
    tl.forEach((e) => L.push(`| ${fmtDate(e.ts).replace(' UTC', '')} | ${e.type} | ${mdEsc(e.text)} |`));
  }
  L.push('');

  L.push('## 6. Cadena de custodia y evidencias');
  L.push('');
  L.push('Todos los artefactos se han recolectado con comandos de solo lectura y su hash SHA-256 se calculó en el momento de la escritura.');
  L.push('');
  L.push('| Artefacto | Colector | SHA-256 | Tamaño | Estado |');
  L.push('|---|---|---|---|---|');
  d.artifacts.forEach((a) => L.push(`| ${a.file} | ${a.collectorId} | \`${a.sha256}\` | ${a.size} | ${a.ok ? 'OK' : `Error: ${mdEsc(a.error)}`} |`));
  L.push('');
  const cmds = d.audit.filter((a) => a.event === 'command');
  L.push(`Comandos ejecutados en el host: **${cmds.length}** (registro completo en \`audit.log\`).`);
  L.push('');

  L.push('## 7. Limitaciones');
  L.push('');
  L.push('- Se trata de un *triage* en caliente (live response): la salida de un host comprometido puede haber sido manipulada por el atacante (rootkits, hooks).');
  L.push('- No incluye imagen de memoria ni de disco. Si se confirma el compromiso, preserva ambos con herramientas de adquisición forense.');
  L.push('- Las reglas son heurísticas y pueden generar falsos positivos o negativos; los hallazgos deben validarse manualmente.');
  if (d.case.notes) {
    L.push('');
    L.push('## Notas del operador');
    L.push('');
    L.push(d.case.notes);
  }
  L.push('');
  return L.join('\n');
}

// ---------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------

function toHtml(d) {
  const c = d.case;
  const t = c.target || {};
  const counts = d.summary.counts || {};
  const f = d.facts;
  const riskColor = SEVERITY_COLOR[d.summary.risk] || '#16a34a';

  const factRows = [
    ['Hostname', f.hostname], ['Sistema operativo', f.os], ['Kernel', f.kernel], ['Uptime', f.uptime],
    ['Hora del host (UTC)', f.collectedAt], ['Identidad de recolección', f.identity],
    ['Procesos', f.processCount], ['Puertos en escucha', f.listeningCount], ['Conexiones establecidas', f.establishedCount]
  ].filter(([, v]) => v !== undefined && v !== null && v !== '');

  const findingsHtml = d.findings.length
    ? d.findings.map((fi) => `
      <section class="finding" style="border-left:5px solid ${SEVERITY_COLOR[fi.severity] || '#666'}">
        <h3>${esc(fi.id)} · ${esc(fi.title)} <span class="badge" style="background:${SEVERITY_COLOR[fi.severity] || '#666'}">${esc(SEVERITY_LABEL[fi.severity] || fi.severity)}</span></h3>
        <p>${esc(fi.description)}</p>
        ${fi.mitre?.length ? `<p class="meta"><b>MITRE ATT&amp;CK:</b> ${fi.mitre.map((m) => `${esc(m.id)} ${esc(m.name)}`).join('; ')}</p>` : ''}
        <p class="meta"><b>Regla:</b> <code>${esc(fi.ruleId)}</code> · <b>Coincidencias:</b> ${esc(fi.count)}</p>
        ${fi.evidence?.length ? `<ul class="evidence">${fi.evidence.map((e) => `<li><code>${esc(e.collectorId)}</code>: <pre>${esc(e.excerpt)}</pre></li>`).join('')}</ul>` : ''}
        ${fi.recommendation ? `<p><b>Recomendación:</b> ${esc(fi.recommendation)}</p>` : ''}
      </section>`).join('')
    : '<p><i>No se han detectado hallazgos con las reglas actuales. Esto no garantiza la ausencia de compromiso.</i></p>';

  const mt = mitreTable(d.findings);
  const tl = relevantTimeline(d.timeline);

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
<title>Informe forense ${esc(c.caseId)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;color:#111827;max-width:960px;margin:24px auto;padding:0 16px;font-size:13px;line-height:1.45}
  h1{font-size:22px;border-bottom:3px solid #111827;padding-bottom:6px} h2{font-size:17px;margin-top:28px;border-bottom:1px solid #d1d5db;padding-bottom:4px}
  h3{font-size:14px;margin:0 0 6px} table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}
  th,td{border:1px solid #d1d5db;padding:4px 6px;text-align:left;vertical-align:top} th{background:#f3f4f6}
  code,pre{font-family:Consolas,monospace;font-size:11.5px} pre{white-space:pre-wrap;word-break:break-all;margin:2px 0;background:#f9fafb;padding:4px 6px;border-radius:4px}
  .risk{display:inline-block;padding:6px 12px;border-radius:6px;color:#fff;font-weight:600}
  .finding{margin:12px 0;padding:8px 12px;background:#fafafa;page-break-inside:avoid}
  .badge{color:#fff;font-size:11px;padding:2px 7px;border-radius:10px;margin-left:6px;font-weight:600}
  .meta{color:#4b5563;margin:4px 0} .evidence{padding-left:18px;margin:6px 0}
  .ai{background:#eff6ff;border:1px solid #bfdbfe;padding:8px 12px;border-radius:6px;white-space:pre-wrap}
  .small{font-size:11px;color:#6b7280}
  @media print{body{margin:0;max-width:none}}
</style></head><body>
<h1>Informe de análisis forense — ${esc(t.host || 'host')}</h1>
<table>
  <tr><th>Caso</th><td><code>${esc(c.caseId)}</code></td><th>Operador</th><td>${esc(c.operator || '-')} (${esc(c.analystHost || '-')})</td></tr>
  <tr><th>Recolección</th><td>${esc(fmtDate(c.createdAt))}</td><th>Finalizado</th><td>${esc(fmtDate(c.finishedAt))} (${esc(c.status || '-')})</td></tr>
  <tr><th>Objetivo</th><td>${esc(t.label || t.host || '-')}</td><th>Plataforma / perfil</th><td>${esc(t.platform || '-')}${t.vendor ? ` (${esc(t.vendor)})` : ''} · ${esc(c.profile || '-')}</td></tr>
</table>

<h2>1. Resumen ejecutivo</h2>
<p><span class="risk" style="background:${riskColor}">${esc(RISK_LABEL[d.summary.risk] || d.summary.risk)}</span> &nbsp; Puntuación ${esc(d.summary.score)}/100</p>
<table><tr>${SEVERITY_ORDER.map((s) => `<th style="color:${SEVERITY_COLOR[s]}">${SEVERITY_LABEL[s]}</th>`).join('')}</tr>
<tr>${SEVERITY_ORDER.map((s) => `<td>${counts[s] || 0}</td>`).join('')}</tr></table>
${d.summary.tactics?.length ? `<p><b>Tácticas MITRE ATT&amp;CK observadas:</b> ${esc(d.summary.tactics.join(', '))}</p>` : ''}
${d.aiSummary?.text ? `<h3>Resumen asistido por IA</h3><p class="small">Generado por IA (${esc(d.aiSummary.model || 'modelo desconocido')}) el ${esc(fmtDate(d.aiSummary.generatedAt))}. Debe ser validado por un analista.</p><div class="ai">${esc(d.aiSummary.text)}</div>` : ''}

<h2>2. Datos del sistema</h2>
<table>${factRows.map(([k, v]) => `<tr><th style="width:30%">${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
${c.privileges ? `<tr><th>Privilegios</th><td>uid=${esc(c.privileges.uid ?? '?')}, sudo=${esc(c.privileges.sudo)}</td></tr>` : ''}</table>

<h2>3. Hallazgos</h2>
${findingsHtml}

${mt.length ? `<h2>4. Mapeo MITRE ATT&amp;CK</h2><table><tr><th>Táctica</th><th>Técnica</th><th>Reglas</th></tr>${mt.map((m) => `<tr><td>${esc(m.tactic)}</td><td>${esc(m.id)} ${esc(m.name)}</td><td>${esc(m.rules.join(', '))}</td></tr>`).join('')}</table>` : ''}

<h2>5. Línea de tiempo (eventos relevantes)</h2>
${tl.length ? `<table><tr><th>Fecha (UTC)</th><th>Tipo</th><th>Evento</th></tr>${tl.map((e) => `<tr><td>${esc(fmtDate(e.ts).replace(' UTC', ''))}</td><td>${esc(e.type)}</td><td>${esc(e.text)}</td></tr>`).join('')}</table>` : '<p><i>Sin eventos relevantes.</i></p>'}

<h2>6. Cadena de custodia y evidencias</h2>
<p>Todos los artefactos se han recolectado con comandos de solo lectura y su hash SHA-256 se calculó en el momento de la escritura. Comandos ejecutados en el host: <b>${d.audit.filter((a) => a.event === 'command').length}</b>.</p>
<table><tr><th>Artefacto</th><th>SHA-256</th><th>Tamaño</th><th>Estado</th></tr>
${d.artifacts.map((a) => `<tr><td>${esc(a.file)}</td><td><code>${esc(a.sha256)}</code></td><td>${esc(a.size)}</td><td>${a.ok ? 'OK' : `Error: ${esc(a.error)}`}</td></tr>`).join('')}</table>

<h2>7. Limitaciones</h2>
<ul>
  <li>Se trata de un <i>triage</i> en caliente (live response): la salida de un host comprometido puede haber sido manipulada por el atacante (rootkits, hooks).</li>
  <li>No incluye imagen de memoria ni de disco. Si se confirma el compromiso, preserva ambos con herramientas de adquisición forense.</li>
  <li>Las reglas son heurísticas y pueden generar falsos positivos o negativos; los hallazgos deben validarse manualmente.</li>
</ul>
${c.notes ? `<h2>Notas del operador</h2><p>${esc(c.notes)}</p>` : ''}
<p class="small">Informe generado por NodeTerm Forensics el ${esc(fmtDate(new Date().toISOString()))}.</p>
</body></html>`;
}

function build(format, data, { redact = true } = {}) {
  const d = prepare(data, { redact });
  switch (format) {
    case 'markdown':
    case 'md':
      return toMarkdown(d);
    case 'html':
      return toHtml(d);
    case 'json':
      return JSON.stringify({
        case: d.case, summary: d.summary, facts: d.facts, findings: d.findings, timeline: d.timeline,
        artifacts: d.artifacts.map(({ command, ...a }) => a), aiSummary: d.aiSummary, redacted: !!redact
      }, null, 2);
    default:
      throw new Error(`Formato de informe no soportado: ${format}`);
  }
}

module.exports = { build, redactText };
