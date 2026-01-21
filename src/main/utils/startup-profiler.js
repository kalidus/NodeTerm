// ============================================
// 🔬 PROFILER DE ARRANQUE - Medir tiempos de carga
// ============================================

const _startupTime = Date.now();
const _timings = [];

function logTiming(label) {
  const elapsed = Date.now() - _startupTime;
  _timings.push({ label, elapsed });
  console.log(`⏱️ [${elapsed}ms] ${label}`);
}

function getTimings() {
  return _timings;
}

function getStartupTime() {
  return _startupTime;
}

module.exports = {
  logTiming,
  getTimings,
  getStartupTime
};
