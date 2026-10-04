/**
 * Clipboard UI helpers for NodeTerm (renderer).
 * Prefer Electron IPC; never used by MCP secret injection (inject_secret writes to PTY only).
 */

function normalizeText(text) {
  if (text == null) return '';
  return typeof text === 'string' ? text : String(text);
}

function writeViaExecCommand(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  const ok = document.execCommand('copy');
  document.body.removeChild(textArea);
  if (!ok) {
    throw new Error('execCommand copy failed');
  }
}

/**
 * Write text to the OS clipboard.
 * @param {unknown} text
 * @returns {Promise<boolean>} true if something was written
 */
export async function writeText(text) {
  const value = normalizeText(text);
  if (!value) return false;

  if (window.electron?.clipboard?.writeText) {
    try {
      await window.electron.clipboard.writeText(value);
      return true;
    } catch (err) {
      // Handler ausente o IPC roto: continuar con fallbacks del renderer
      console.warn('[clipboard] Electron IPC write failed, using fallback:', err?.message || err);
    }
  }

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (err) {
      console.warn('[clipboard] navigator.clipboard write failed:', err?.message || err);
    }
  }

  writeViaExecCommand(value);
  return true;
}

/**
 * Write text to the OS clipboard and schedule auto-clear after timeoutSeconds.
 * @param {unknown} text
 * @param {number} [timeoutSeconds=30]
 * @returns {Promise<boolean>}
 */
export async function writeTextWithAutoClear(text, timeoutSeconds = 30) {
  const value = normalizeText(text);
  if (!value) return false;

  if (window.electron?.clipboard?.writeTextWithAutoClear) {
    try {
      await window.electron.clipboard.writeTextWithAutoClear(value, timeoutSeconds);
      return true;
    } catch (err) {
      console.warn('[clipboard] Electron IPC writeTextWithAutoClear failed, using writeText fallback:', err?.message || err);
    }
  }

  return writeText(value);
}

/**
 * Read text from the OS clipboard.
 * @returns {Promise<string>}
 */
export async function readText() {
  if (window.electron?.clipboard?.readText) {
    try {
      const value = await window.electron.clipboard.readText();
      return normalizeText(value);
    } catch (err) {
      console.warn('[clipboard] Electron IPC read failed, using fallback:', err?.message || err);
    }
  }

  if (navigator.clipboard?.readText) {
    try {
      const value = await navigator.clipboard.readText();
      return normalizeText(value);
    } catch (err) {
      console.warn('[clipboard] navigator.clipboard read failed:', err?.message || err);
    }
  }

  return '';
}
