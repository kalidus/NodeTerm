/**
 * Sanitización HTML en proceso main (jsdom + DOMPurify).
 */

let _purify = null;

function getPurify() {
  if (_purify) return _purify;
  const { JSDOM } = require('jsdom');
  const createDOMPurify = require('dompurify');
  const { window } = new JSDOM('');
  _purify = createDOMPurify(window);
  return _purify;
}

/**
 * @param {string} html
 * @returns {string}
 */
function sanitizeHtml(html) {
  if (!html || typeof html !== 'string') return '';
  try {
    return getPurify().sanitize(html, {
      USE_PROFILES: { html: true },
      ADD_ATTR: ['target']
    });
  } catch (e) {
    console.warn('[html-sanitize] Fallo DOMPurify, devolviendo vacío:', e?.message || e);
    return '';
  }
}

module.exports = { sanitizeHtml };
