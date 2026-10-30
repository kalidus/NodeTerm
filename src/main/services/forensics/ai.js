/**
 * ai.js - Resumen asistido por IA (opcional, con confirmación del usuario)
 *
 * - El prompt se construye siempre con datos REDACTADOS (sin secretos) y acotados.
 * - Se puede copiar el prompt y usarlo con cualquier cliente IA integrado (MCP, chat...)
 *   o enviarlo a un endpoint compatible con la API de OpenAI (Ollama, LM Studio,
 *   AnythingLLM, LiteLLM, OpenAI...) configurado por el usuario.
 */
const fs = require('fs');
const path = require('path');
const { redactDeep, redactText } = require('./redaction');

const DEFAULT_SETTINGS = {
  baseUrl: 'http://localhost:11434/v1',
  model: '',
  apiKey: '',
  maxPromptChars: 24000,
  timeoutMs: 120000
};

function settingsPath(baseDir) {
  return path.join(path.dirname(baseDir), 'ai-settings.json');
}

function getSafeStorage() {
  try {
    const { safeStorage } = require('electron');
    return safeStorage && safeStorage.isEncryptionAvailable() ? safeStorage : null;
  } catch (_) {
    return null;
  }
}

async function loadSettings(baseDir, { withSecret = false } = {}) {
  let stored = {};
  try {
    stored = JSON.parse(await fs.promises.readFile(settingsPath(baseDir), 'utf8'));
  } catch (_) { /* valores por defecto */ }

  const settings = { ...DEFAULT_SETTINGS, ...stored };
  let apiKey = '';
  if (stored.apiKeyEnc) {
    const ss = getSafeStorage();
    if (ss) {
      try { apiKey = ss.decryptString(Buffer.from(stored.apiKeyEnc, 'base64')); } catch (_) { apiKey = ''; }
    }
  }
  delete settings.apiKeyEnc;
  settings.hasApiKey = !!apiKey;
  settings.apiKey = withSecret ? apiKey : '';
  return settings;
}

async function saveSettings(baseDir, input = {}) {
  const current = await loadSettings(baseDir, { withSecret: true });
  const next = {
    baseUrl: String(input.baseUrl || current.baseUrl || DEFAULT_SETTINGS.baseUrl).trim().replace(/\/+$/, ''),
    model: String(input.model ?? current.model ?? '').trim(),
    maxPromptChars: Math.max(2000, Math.min(120000, Number(input.maxPromptChars) || current.maxPromptChars || DEFAULT_SETTINGS.maxPromptChars)),
    timeoutMs: DEFAULT_SETTINGS.timeoutMs
  };
  if (!/^https?:\/\//i.test(next.baseUrl)) throw new Error('La URL del endpoint debe empezar por http:// o https://');

  const stored = { ...next };
  // apiKey: undefined => conservar; '' => borrar; texto => cifrar con safeStorage
  let apiKey = current.apiKey;
  if (typeof input.apiKey === 'string') apiKey = input.apiKey;
  if (apiKey) {
    const ss = getSafeStorage();
    if (!ss) throw new Error('El cifrado seguro del sistema no está disponible: no se puede guardar la API key');
    stored.apiKeyEnc = ss.encryptString(apiKey).toString('base64');
  }
  await fs.promises.mkdir(path.dirname(settingsPath(baseDir)), { recursive: true });
  await fs.promises.writeFile(settingsPath(baseDir), JSON.stringify(stored, null, 2), 'utf8');
  return loadSettings(baseDir);
}

const INSTRUCTIONS = [
  'Eres un analista DFIR senior. Analiza el siguiente triage forense de un host que puede haber sido vulnerado.',
  'Responde en español con estas secciones: 1) Veredicto (comprometido / sospechoso / sin indicios) con nivel de confianza y justificación;',
  '2) Cronología probable del ataque; 3) Hallazgos priorizados (qué es más grave y por qué); 4) Posibles falsos positivos;',
  '5) Pasos de contención y erradicación inmediatos, en orden; 6) Evidencias adicionales a recolectar (memoria, disco, logs remotos).',
  'No inventes datos que no estén en la información proporcionada. Los secretos han sido redactados.'
].join(' ');

function buildPrompt(caseFull, { maxChars = DEFAULT_SETTINGS.maxPromptChars } = {}) {
  const c = caseFull.case || {};
  const t = c.target || {};
  const findings = caseFull.findings?.findings || [];
  const summary = caseFull.findings?.summary || {};
  const facts = caseFull.findings?.facts || {};
  const timeline = (caseFull.timeline?.events || []).filter((e) => !['process-start', 'prefetch', 'file-modified'].includes(e.type));

  const data = redactDeep({
    host: { name: t.host, platform: t.platform, vendor: t.vendor, os: facts.os, kernel: facts.kernel, uptime: facts.uptime, collectedAt: facts.collectedAt, identity: facts.identity },
    summary: { risk: summary.risk, score: summary.score, counts: summary.counts, tactics: summary.tactics },
    findings: findings.map((f) => ({
      id: f.id,
      severity: f.severity,
      title: f.title,
      rule: f.ruleId,
      mitre: (f.mitre || []).map((m) => `${m.id} ${m.name}`),
      matches: f.count,
      evidence: (f.evidence || []).slice(0, 5).map((e) => e.excerpt)
    })),
    timeline: timeline.slice(-80).map((e) => `${e.ts} [${e.type}] ${e.text}`)
  });

  let json = JSON.stringify(data, null, 1);
  if (json.length > maxChars) {
    // Reducir primero la línea de tiempo y después las evidencias
    data.timeline = data.timeline.slice(-30);
    json = JSON.stringify(data, null, 1);
    if (json.length > maxChars) {
      data.findings = data.findings.map((f) => ({ ...f, evidence: f.evidence.slice(0, 2) }));
      json = JSON.stringify(data);
    }
    if (json.length > maxChars) json = `${json.slice(0, maxChars)}\n...[TRUNCADO]`;
  }
  return `${INSTRUCTIONS}\n\nDATOS DEL TRIAGE (JSON):\n${json}`;
}

async function requestSummary(settings, prompt) {
  if (!settings.model) throw new Error('Configura el modelo de IA antes de continuar');
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), settings.timeoutMs || DEFAULT_SETTINGS.timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(settings.apiKey ? { Authorization: `Bearer ${settings.apiKey}` } : {})
      },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Eres un analista forense (DFIR). Responde siempre en español y con rigor técnico.' },
          { role: 'user', content: prompt }
        ]
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`La API de IA respondió ${res.status}: ${redactText(body).slice(0, 300)}`);
    }
    const json = await res.json();
    const text = json?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Respuesta de IA vacía');
    return String(text).trim();
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Tiempo de espera agotado esperando a la IA');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { loadSettings, saveSettings, buildPrompt, requestSummary, DEFAULT_SETTINGS };
