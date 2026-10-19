import { createAiCliTerminalComponent } from '../utils/aiCliTerminalFactory';

const OpenCodeTerminal = createAiCliTerminalComponent({
  displayName: 'OpenCodeTerminal',
  ipcPrefix: 'opencode',
  errorLabel: 'OpenCode',
  defaultBackground: '#111827',
  cursor: '#6366f1',
  selection: 'rgba(99, 102, 241, 0.3)',
  shellClass: 'opencode-terminal-shell',
  validateConfig: () => window.electron?.opencode?.validateConfig?.()
});

export default OpenCodeTerminal;
