const DEFAULT_MAX_RESULT_CHARS = 280;
const DEFAULT_MAX_ARGS = 4;
const ARG_IGNORE_KEYS = new Set([
  'content',
  'edits',
  'files',
  'fileContent',
  'text',
  'tool',
  'use_tool'
]);

const collapseWhitespace = (text = '') => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/\s+/g, ' ').trim();
};

const formatArgValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return '';
  const str = String(value).replace(/\s+/g, ' ').trim();
  return str.slice(0, 80);
};

const buildArgsSummary = (args = {}, maxArgs = DEFAULT_MAX_ARGS) => {
  if (!args || typeof args !== 'object') return '';
  const entries = Object.entries(args)
    .filter(([key, value]) => {
      if (ARG_IGNORE_KEYS.has(key)) return false;
      if (value === null || value === undefined) return false;
      if (typeof value === 'object') return false;
      const formatted = formatArgValue(value);
      return formatted.length > 0;
    })
    .slice(0, maxArgs)
    .map(([key, value]) => `${key}=${formatArgValue(value)}`);
  return entries.join(', ');
};

export function summarizeToolResult({
  toolName = 'tool',
  args = {},
  resultText = '',
  isError = false,
  maxResultChars = DEFAULT_MAX_RESULT_CHARS,
  maxArgs = DEFAULT_MAX_ARGS
} = {}) {
  const normalizedName = toolName || 'tool';
  const argSummary = buildArgsSummary(args, maxArgs);
  const normalizedResult = collapseWhitespace(resultText);

  let snippet = normalizedResult.slice(0, maxResultChars);
  if (normalizedResult.length > maxResultChars) {
    snippet = `${snippet}…`;
  }

  const parts = [];
  parts.push(`${isError ? '⚠️' : '✅'} ${normalizedName}`);
  if (argSummary) {
    parts.push(`• ${argSummary}`);
  }

  let summary = parts.join(' ');
  if (snippet) {
    summary += `\n${isError ? 'Error' : 'Resultado'}: ${snippet}`;
  }

  return summary;
}


