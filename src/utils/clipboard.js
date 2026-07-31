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
    await window.electron.clipboard.writeText(value);
    return true;
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return true;
  }

  writeViaExecCommand(value);
  return true;
}

/**
 * Read text from the OS clipboard.
 * @returns {Promise<string>}
 */
export async function readText() {
  if (window.electron?.clipboard?.readText) {
    const value = await window.electron.clipboard.readText();
    return normalizeText(value);
  }

  if (navigator.clipboard?.readText) {
    const value = await navigator.clipboard.readText();
    return normalizeText(value);
  }

  return '';
}
