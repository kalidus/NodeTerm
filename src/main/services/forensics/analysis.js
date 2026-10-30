/**
 * analysis.js - Análisis de los artefactos de un caso
 *
 *  - Reglas declarativas + reglas con lógica
 *  - Coincidencias de IOCs
 *  - Línea de tiempo
 *  - Resumen y "facts" (datos clave del host)
 */
const { ALL_DECLARATIVE_RULES } = require('./rules/definitions');
const { runDeclarativeRules, sortFindings, SEVERITY_ORDER } = require('./rules/engine');
const { runCustomRules } = require('./rules/custom');
const { matchIocs } = require('./rules/iocs');
const { mitreRefs } = require('./rules/mitre');
const { buildTimeline } = require('./timeline');
const { parseJsonLoose, parseLinuxMeta, isSelfNoise, nonEmptyLines, truncate } = require('./parsers');

function buildContext({ platform, artifacts }) {
  const jsonCache = new Map();
  const ctx = {
    platform,
    artifacts: artifacts || {},
    facts: {},
    collectedAt: null,
    tzOffsetMin: 0,
    text(id) {
      return typeof this.artifacts[id] === 'string' ? this.artifacts[id] : '';
    },
    json(id, { asArray = true } = {}) {
      const key = `${id}|${asArray}`;
      if (!jsonCache.has(key)) {
        const parsed = parseJsonLoose(this.text(id), { asArray });
        jsonCache.set(key, parsed == null ? (asArray ? [] : null) : parsed);
      }
      return jsonCache.get(key);
    }
  };
  return ctx;
}

function collectFacts(ctx, caseData) {
  const facts = ctx.facts;
  facts.platform = ctx.platform;
  if (ctx.platform === 'linux') {
    const meta = parseLinuxMeta(ctx.text('linux.meta.system'));
    ctx.collectedAt = meta.collectedAt;
    ctx.tzOffsetMin = meta.tzOffsetMin;
    Object.assign(facts, {
      hostname: meta.hostname,
      os: meta.os,
      kernel: meta.uname,
      uptime: meta.uptime,
      collectedAt: meta.collectedAt,
      tzOffsetMin: meta.tzOffsetMin,
      identity: meta.id
    });
    const listen = nonEmptyLines(ctx.text('linux.net.listen')).filter((l) => /LISTEN|UNCONN/.test(l));
    facts.listeningCount = listen.length;
    facts.establishedCount = Math.max(0, nonEmptyLines(ctx.text('linux.net.established')).length - 1);
    facts.processCount = Math.max(0, nonEmptyLines(ctx.text('linux.proc.list')).length - 1);
  } else if (ctx.platform === 'windows') {
    const meta = ctx.json('windows.meta.system', { asArray: false });
    const m = Array.isArray(meta) ? meta[0] : meta;
    if (m) {
      ctx.collectedAt = m.time || null;
      Object.assign(facts, {
        hostname: m.host,
        os: `${m.os || ''} ${m.ver || ''}`.trim(),
        collectedAt: m.time,
        boot: m.boot,
        identity: m.user,
        isAdmin: m.admin
      });
    }
    const conns = ctx.json('windows.net.conns');
    facts.listeningCount = conns.filter((c) => c.state === 'Listen').length;
    facts.establishedCount = conns.filter((c) => c.state === 'Established').length;
    facts.processCount = ctx.json('windows.proc.list').length;
  } else {
    facts.hostname = caseData?.target?.host || null;
    facts.os = caseData?.target?.vendor || null;
  }
  facts.privileges = caseData?.privileges || null;
}

function iocFindings(ctx, iocs, platform) {
  const hits = matchIocs(ctx.artifacts, iocs, { isNoise: isSelfNoise });
  if (!hits.length) return [];
  const groups = { ip: [], domain: [], hash: [], string: [] };
  hits.forEach((h) => groups[h.type].push(h));
  const labels = {
    ip: 'direcciones IP',
    domain: 'dominios',
    hash: 'hashes',
    string: 'cadenas'
  };
  const out = [];
  for (const [type, list] of Object.entries(groups)) {
    if (!list.length) continue;
    out.push({
      ruleId: `IOC-${type.toUpperCase()}`,
      title: `Coincidencias con IOCs importados: ${labels[type]}`,
      severity: type === 'hash' ? 'critical' : 'high',
      description: 'Se han encontrado indicadores de compromiso de tu lista de IOCs en los artefactos recolectados.',
      recommendation: 'Investiga el contexto de cada coincidencia y amplía la búsqueda en logs de red/SIEM.',
      platform,
      mitre: mitreRefs(type === 'ip' || type === 'domain' ? ['T1071'] : []),
      count: list.length,
      evidence: list.slice(0, 10).map((h) => ({ collectorId: h.collectorId, excerpt: truncate(`${h.value} :: ${h.line}`, 400) }))
    });
  }
  return out;
}

function summarize(findings) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  findings.forEach((f) => { counts[f.severity] = (counts[f.severity] || 0) + 1; });
  const score = Math.min(100, counts.critical * 40 + counts.high * 20 + counts.medium * 8 + counts.low * 2);
  let risk = 'none';
  if (counts.critical > 0 || score >= 80) risk = 'critical';
  else if (counts.high > 0 || score >= 30) risk = 'high';
  else if (counts.medium > 0) risk = 'medium';
  else if (counts.low > 0) risk = 'low';
  const tactics = new Set();
  findings.forEach((f) => (f.mitre || []).forEach((m) => m.tactic && tactics.add(m.tactic)));
  return { counts, score, risk, total: findings.length, tactics: [...tactics] };
}

/**
 * @param {{platform:string, artifacts:Object<string,string>, caseData?:object, iocs?:object}} input
 */
function analyzeCase({ platform, artifacts, caseData, iocs }) {
  const ctx = buildContext({ platform, artifacts });
  collectFacts(ctx, caseData);

  const findings = [
    ...runDeclarativeRules(ALL_DECLARATIVE_RULES, ctx),
    ...runCustomRules(ctx),
    ...iocFindings(ctx, iocs, platform)
  ];

  const sorted = sortFindings(findings).map((f, i) => ({ id: `F-${String(i + 1).padStart(3, '0')}`, ...f }));
  const timeline = buildTimeline(ctx);

  // Cuántos colectores fallaron (según el índice de artefactos del caso)
  return {
    platform,
    findings: sorted,
    summary: summarize(sorted),
    facts: ctx.facts,
    timeline
  };
}

module.exports = { analyzeCase, summarize, SEVERITY_ORDER };
