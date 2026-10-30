/**
 * engine.js - Evaluación de reglas declarativas
 */
const { mitreRefs } = require('./mitre');
const { isSelfNoise, truncate } = require('../parsers');

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

function toSources(rule) {
  return Array.isArray(rule.source) ? rule.source : [rule.source];
}

function compile(rule) {
  if (!rule.pattern) return null;
  return new RegExp(rule.pattern, rule.flags || '');
}

function buildFinding(rule, evidence, total) {
  return {
    ruleId: rule.id,
    title: rule.title,
    severity: rule.severity,
    description: rule.description,
    recommendation: rule.recommendation,
    platform: rule.platforms?.[0] || null,
    mitre: mitreRefs(rule.mitre || []),
    count: total,
    evidence
  };
}

function evalLinesRule(rule, ctx) {
  const re = compile(rule);
  const exclude = rule.exclude ? new RegExp(rule.exclude, rule.flags || '') : null;
  const max = rule.max || 8;
  const evidence = [];
  let total = 0;

  for (const source of toSources(rule)) {
    const text = ctx.text(source);
    if (!text) continue;
    for (const line of text.split('\n')) {
      if (!line.trim() || isSelfNoise(line)) continue;
      if (re && !re.test(line)) continue;
      if (exclude && exclude.test(line)) continue;
      total += 1;
      if (evidence.length < max) evidence.push({ collectorId: source, excerpt: truncate(line.trim(), 400) });
    }
  }
  return total > 0 ? buildFinding(rule, evidence, total) : null;
}

function evalJsonRule(rule, ctx) {
  const re = compile(rule);
  const max = rule.max || 8;
  const evidence = [];
  let total = 0;

  for (const source of toSources(rule)) {
    const rows = ctx.json(source);
    if (!rows || !rows.length) continue;
    for (const row of rows) {
      if (!row || typeof row !== 'object') continue;
      if (rule.excludeRow && rule.excludeRow(row)) continue;
      let hit;
      if (typeof rule.test === 'function') {
        hit = rule.test(row);
      } else {
        const hay = (rule.fields && rule.fields.length ? rule.fields : Object.keys(row))
          .map((f) => (row[f] == null ? '' : String(row[f])))
          .join(' \n ');
        if (isSelfNoise(hay)) continue;
        hit = re ? re.test(hay) : false;
      }
      if (!hit) continue;
      total += 1;
      if (evidence.length < max) {
        const text = typeof rule.format === 'function' ? rule.format(row) : JSON.stringify(row);
        evidence.push({ collectorId: source, excerpt: truncate(text, 400) });
      }
    }
  }
  return total > 0 ? buildFinding(rule, evidence, total) : null;
}

function runDeclarativeRules(rules, ctx) {
  const findings = [];
  for (const rule of rules) {
    if (rule.platforms && !rule.platforms.includes(ctx.platform)) continue;
    try {
      const finding = rule.kind === 'json-rows' ? evalJsonRule(rule, ctx) : evalLinesRule(rule, ctx);
      if (finding) findings.push(finding);
    } catch (_) { /* una regla defectuosa no debe romper el análisis */ }
  }
  return findings;
}

function sortFindings(findings) {
  return findings.slice().sort((a, b) => {
    const s = (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9);
    return s !== 0 ? s : String(a.ruleId).localeCompare(String(b.ruleId));
  });
}

module.exports = { runDeclarativeRules, sortFindings, buildFinding, SEVERITY_ORDER };
