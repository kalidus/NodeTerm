import { writeText as clipboardWriteText, readText as clipboardReadText } from './clipboard.js';
import { shouldBlockHumanInput } from '../services/terminalAgentState.js';

/**
 * Standard helper to paste text into a terminal instance and ensure focus.
 *
 * @param {object} term - Ref or xterm Terminal instance
 * @param {string} text - Text to paste
 * @param {Function} onSendData - Function to send text to PTY backend
 */
export function pasteToTerminal(term, text, onSendData) {
  const getTerm = () => (term && 'current' in term ? term.current : term);
  const activeTerm = getTerm();
  if (activeTerm && text) {
    activeTerm.focus();
    setTimeout(() => {
      if (typeof onSendData === 'function') {
        onSendData(text);
      }
      activeTerm.focus();
      activeTerm.element?.dispatchEvent(new Event('focus', { bubbles: true }));
    }, 10);
  }
}

/**
 * Configures clipboard shortcuts (Ctrl+C, Ctrl+Shift+C, Ctrl+V, Ctrl+Shift+V, Shift+Insert, Ctrl+Insert)
 * and right-click context menu handling on an xterm instance and its container element.
 *
 * @param {object} params
 * @param {object} params.term - Ref or xterm Terminal instance
 * @param {HTMLElement} params.container - Container DOM element (e.g. terminalRef.current)
 * @param {string} params.tabId - Unique tab/terminal identifier
 * @param {Function} [params.onContextMenu] - Optional context menu handler callback: (event, tabId) => void
 * @param {Function} params.onSendData - Function to send pasted text or input to backend PTY
 * @returns {Function} cleanup function to detach handlers
 */
export function setupTerminalClipboard({
  term,
  container,
  tabId,
  onContextMenu,
  onSendData
}) {
  const getTerm = () => (term && 'current' in term ? term.current : term);
  const termInstance = getTerm();

  if (!termInstance || !container) {
    return () => {};
  }

  // 1. Custom key handler for keyboard copy & paste shortcuts
  const keyHandler = (domEvent) => {
    if (domEvent.type !== 'keydown') return true;

    const isMac = typeof window !== 'undefined' && window.electron?.platform === 'darwin';
    const modifierKey = isMac ? domEvent.metaKey : domEvent.ctrlKey;
    const isShift = domEvent.shiftKey;
    const key = domEvent.key ? domEvent.key.toLowerCase() : '';

    // Copy shortcuts:
    // - Ctrl+C / Cmd+C (when text is selected)
    // - Ctrl+Shift+C / Cmd+Shift+C
    // - Ctrl+Insert / Cmd+Insert
    const isCopyKey =
      (modifierKey && key === 'c') ||
      (modifierKey && isShift && key === 'c') ||
      (modifierKey && domEvent.key === 'Insert');

    if (isCopyKey) {
      const activeTerm = getTerm();
      const selection = activeTerm?.getSelection ? activeTerm.getSelection() : '';
      if (selection && selection.length > 0) {
        clipboardWriteText(selection).catch(() => {});
        // Stop event from reaching xterm so it doesn't send \x03 (SIGINT) to the shell
        return false;
      }
      // If Ctrl+Shift+C was pressed without selection, do not send anything
      if (isShift) {
        return false;
      }
      // If Ctrl+C without selection, allow xterm to send \x03 (SIGINT / cancel command)
      return true;
    }

    // Paste shortcuts:
    // - Ctrl+V / Cmd+V
    // - Ctrl+Shift+V / Cmd+Shift+V
    // - Shift+Insert
    const isPasteKey =
      (modifierKey && key === 'v') ||
      (modifierKey && isShift && key === 'v') ||
      (isShift && domEvent.key === 'Insert');

    if (isPasteKey) {
      if (tabId && shouldBlockHumanInput(tabId)) {
        return false;
      }
      clipboardReadText().then((text) => {
        if (text) {
          pasteToTerminal(term, text, onSendData);
        }
      }).catch(() => {});
      return false;
    }

    return true;
  };

  if (typeof termInstance.attachCustomKeyEventHandler === 'function') {
    termInstance.attachCustomKeyEventHandler(keyHandler);
  }

  // 2. Right-click context menu handler
  const contextMenuHandler = (e) => {
    if (typeof onContextMenu === 'function') {
      onContextMenu(e, tabId);
    } else {
      e.preventDefault();
      if (tabId && shouldBlockHumanInput(tabId)) return;
      clipboardReadText().then((text) => {
        if (text) {
          pasteToTerminal(term, text, onSendData);
        }
      }).catch(() => {});
    }
  };

  container.addEventListener('contextmenu', contextMenuHandler);

  return () => {
    container.removeEventListener('contextmenu', contextMenuHandler);
  };
}
