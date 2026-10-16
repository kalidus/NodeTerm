/**
 * Informe de la matriz de capturas mstsc vs NodeTerm.
 *
 * Convencion de nombres en testing/rdp/traces/matrix/:
 *   <cliente>-<escenario>-<estado>-<n>.jsonl
 *   cliente   = mstsc | nodeterm
 *   escenario = selector | rdp | app
 *   estado    = frio | solape
 *   n         = 1..3 (repeticiones)
 *
 * Uso:
 *   node testing/rdp/matrix-report.js [directorio]   (defecto: testing/rdp/traces/matrix)
 *
 * Por cada escenario/estado compara mstsc vs nodeterm: CS_NET, canal y generaciones de cliprdr,
 * primer saludo y tiempo input -> siguiente rafaga (mediana por cliente).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { loadJsonl, milestoneDiffs } = require('./trace-diff');
const { analyzeTrace } = require('./trace-milestones');

const NAME_RE = /^(mstsc|nodeterm)-(selector|rdp|app)-(frio|solape)-(\d+)\.jsonl$/;

function median(values) {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : Math.round((v[mid - 1] + v[mid]) / 2);
}

function groupTraces(dir) {
  const groups = new Map();
  if (!fs.existsSync(dir)) return groups;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(NAME_RE);
    if (!m) continue;
    const [, client, scenario, state] = m;
    const key = `${scenario}/${state}`;
    const g = groups.get(key) || { mstsc: [], nodeterm: [] };
    g[client].push({ file: f, analysis: analyzeTrace(loadJsonl(path.join(dir, f))) });
    groups.set(key, g);
  }
  return groups;
}

function summarizeClient(list) {
  return {
    runs: list.length,
    firstGreetMs: median(list.map((x) => x.analysis.channels.cliprdr && x.analysis.channels.cliprdr.firstS2c)),
    drdynvcMs: median(list.map((x) => x.analysis.channels.drdynvc && x.analysis.channels.drdynvc.firstS2c)),
    rdpdrMs: median(list.map((x) => x.analysis.channels.rdpdr && x.analysis.channels.rdpdr.firstS2c)),
    gens: median(list.map((x) => x.analysis.cliprdrGenerations.length)),
    inputToBurstMs: median(list.flatMap((x) => x.analysis.inputClusters.map((c) => c.nextBurstMs)))
  };
}

function report(dir) {
  const groups = groupTraces(dir);
  if (!groups.size) {
    console.log(`Sin trazas en ${dir}. Ver README-MITM-CAPTURE.md (seccion Matriz).`);
    return 0;
  }
  let problems = 0;
  for (const [key, g] of [...groups.entries()].sort()) {
    console.log(`\n### ${key}  (mstsc=${g.mstsc.length} nodeterm=${g.nodeterm.length})`);
    if (!g.mstsc.length || !g.nodeterm.length) {
      console.log('  falta uno de los dos lados');
      problems += 1;
      continue;
    }
    console.log('  mstsc   ', JSON.stringify(summarizeClient(g.mstsc)));
    console.log('  nodeterm', JSON.stringify(summarizeClient(g.nodeterm)));
    const diffs = milestoneDiffs(g.mstsc[0].analysis, g.nodeterm[0].analysis);
    if (diffs.length) {
      problems += 1;
      for (const d of diffs) console.log(`  DIFF ${d}`);
    } else {
      console.log('  canales/cliprdr: sin diferencias');
    }
  }
  return problems;
}

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || path.join(__dirname, 'traces', 'matrix'));
  process.exitCode = report(dir) > 0 ? 2 : 0;
}

module.exports = { groupTraces, summarizeClient, report, median, NAME_RE };
