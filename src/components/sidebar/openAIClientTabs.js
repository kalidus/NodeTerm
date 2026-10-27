/** Abridores de pestañas de clientes AI desde el rail de la sidebar. */

export const openOpenCodeTab = () => {
  window.dispatchEvent(new CustomEvent('create-local-terminal', {
    detail: { terminalType: 'opencode' }
  }));
};

export const openCodexCliTab = () => {
  window.dispatchEvent(new CustomEvent('create-local-terminal', {
    detail: { terminalType: 'codexcli' }
  }));
};

export const openAntigravityCliTab = () => {
  window.dispatchEvent(new CustomEvent('create-local-terminal', {
    detail: { terminalType: 'antigravitycli' }
  }));
};

export const openHermesCliTab = () => {
  window.dispatchEvent(new CustomEvent('create-local-terminal', {
    detail: { terminalType: 'hermescli' }
  }));
};

export const openClaudeTab = () => {
  window.dispatchEvent(new CustomEvent('create-local-terminal', {
    detail: { terminalType: 'claude' }
  }));
};

export const openAnythingLLMTab = () => {
  const newTab = {
    key: `anythingllm-${Date.now()}`,
    label: 'AnythingLLM',
    type: 'anything-llm',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-anythingllm-tab', {
    detail: { tab: newTab }
  }));
};

export const openOpenWebUITab = () => {
  const newTab = {
    key: `openwebui-${Date.now()}`,
    label: 'Open WebUI',
    type: 'openwebui',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-openwebui-tab', {
    detail: { tab: newTab }
  }));
};

export const openLibreChatTab = () => {
  const newTab = {
    key: `librechat-${Date.now()}`,
    label: 'LibreChat',
    type: 'librechat',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-librechat-tab', {
    detail: { tab: newTab }
  }));
};

export const openAgentZeroTab = () => {
  const newTab = {
    key: `agentzero-${Date.now()}`,
    label: 'Agent Zero',
    type: 'agentzero',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-agentzero-tab', {
    detail: { tab: newTab }
  }));
};

export const openOpenClawTab = () => {
  const newTab = {
    key: `openclaw-${Date.now()}`,
    label: 'OpenClaw',
    type: 'openclaw',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-openclaw-tab', {
    detail: { tab: newTab }
  }));
};

export const openOpenNotebookTab = () => {
  const newTab = {
    key: `open-notebook-${Date.now()}`,
    label: 'Open Notebook',
    type: 'open-notebook',
    createdAt: Date.now(),
    groupId: null
  };
  window.dispatchEvent(new CustomEvent('create-open-notebook-tab', {
    detail: { tab: newTab }
  }));
};

export const AI_CLIENT_OPENERS = {
  opencode: openOpenCodeTab,
  codexcli: openCodexCliTab,
  antigravitycli: openAntigravityCliTab,
  hermescli: openHermesCliTab,
  claude: openClaudeTab,
  anythingllm: openAnythingLLMTab,
  openwebui: openOpenWebUITab,
  librechat: openLibreChatTab,
  agentzero: openAgentZeroTab,
  openclaw: openOpenClawTab,
  opennotebook: openOpenNotebookTab,
};

export const openAIClientById = (clientId) => {
  const opener = AI_CLIENT_OPENERS[clientId];
  if (opener) opener();
};
