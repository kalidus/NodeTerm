/**
 * Membresía de broadcast (iTerm2 / tmux synchronize-panes):
 * un panel envía y recibe solo si el modo está encendido y no está excluido.
 * Con menos de dos miembros el modo se apaga.
 */

export function collectTerminalIds(tab) {
  if (!tab) return [];
  const ids = [];

  const pushKey = (node) => {
    if (node?.key) ids.push(node.key);
  };

  if (tab.type === 'split') {
    const visit = (node) => {
      if (!node) return;
      if (node.type === 'terminal' && node.key) {
        ids.push(node.key);
        return;
      }
      if (node.first || node.second) {
        visit(node.first);
        visit(node.second);
        return;
      }
      if (Array.isArray(node.terminals)) {
        node.terminals.forEach(pushKey);
        return;
      }
      if (node.leftTerminal || node.rightTerminal) {
        pushKey(node.leftTerminal);
        pushKey(node.rightTerminal);
      }
    };

    if (tab.first || tab.second) {
      visit(tab.first);
      visit(tab.second);
    } else if (Array.isArray(tab.terminals)) {
      tab.terminals.forEach(pushKey);
    } else if (tab.leftTerminal || tab.rightTerminal) {
      pushKey(tab.leftTerminal);
      pushKey(tab.rightTerminal);
    }
    return ids;
  }

  if (tab.type === 'terminal' || tab.type === 'local-terminal' || tab.type === 'docker') {
    pushKey(tab);
  }
  return ids;
}

export function findTerminalNode(tab, terminalId) {
  if (!tab || !terminalId) return null;
  const visit = (node) => {
    if (!node) return null;
    if (node.type === 'terminal' && node.key === terminalId) return node;
    if (node.key === terminalId && !node.first && !node.second) return node;
    if (node.first || node.second) {
      return visit(node.first) || visit(node.second);
    }
    if (Array.isArray(node.terminals)) {
      for (const child of node.terminals) {
        const found = visit(child);
        if (found) return found;
      }
    }
    if (node.leftTerminal?.key === terminalId) return node.leftTerminal;
    if (node.rightTerminal?.key === terminalId) return node.rightTerminal;
    return null;
  };
  if (tab.type === 'split' || tab.first || tab.second) return visit(tab);
  if (tab.key === terminalId) return tab;
  return null;
}

export function findTabOwningTerminal(tabs, originTabId) {
  if (!originTabId || !Array.isArray(tabs)) return null;
  return tabs.find((tab) => collectTerminalIds(tab).includes(originTabId)) || null;
}

export function isBroadcastMember(tab, terminalId) {
  if (!tab?.isBroadcastActive || !terminalId) return false;
  const excluded = tab.broadcastExcludedTargets || [];
  return !excluded.includes(terminalId);
}

export function broadcastDestinationIds(tab, originTabId) {
  if (!isBroadcastMember(tab, originTabId)) return [];
  return collectTerminalIds(tab).filter((id) => id !== originTabId && isBroadcastMember(tab, id));
}

export function normalizeBroadcast(tab, allIds) {
  const ids = allIds || collectTerminalIds(tab);
  if (!tab?.isBroadcastActive) {
    return { ...tab, isBroadcastActive: false, broadcastExcludedTargets: [] };
  }
  const excluded = new Set(tab.broadcastExcludedTargets || []);
  const members = ids.filter((id) => !excluded.has(id));
  if (tab.type === 'split' && members.length < 2) {
    return { ...tab, isBroadcastActive: false, broadcastExcludedTargets: [] };
  }
  return {
    ...tab,
    isBroadcastActive: true,
    broadcastExcludedTargets: ids.filter((id) => excluded.has(id)),
  };
}

export function toggleBroadcastGroup(tab) {
  return normalizeBroadcast({
    ...tab,
    isBroadcastActive: !tab.isBroadcastActive,
    broadcastExcludedTargets: [],
  });
}

export function toggleBroadcastTarget(tab, targetId) {
  let isBroadcastActive = !!tab.isBroadcastActive;
  let excluded = [...(tab.broadcastExcludedTargets || [])];

  if (!isBroadcastActive) {
    isBroadcastActive = true;
    excluded = [];
  } else if (excluded.includes(targetId)) {
    excluded = excluded.filter((id) => id !== targetId);
  } else {
    excluded = [...excluded, targetId];
  }

  return normalizeBroadcast({
    ...tab,
    isBroadcastActive,
    broadcastExcludedTargets: excluded,
  });
}
