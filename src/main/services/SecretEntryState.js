/**
 * Tabs SSH en modo contraseña (renderer detectó prompt de secreto).
 * Main omite recordInput; la escritura al stream sigue.
 */

const activeTabs = new Set();

function setSecretEntry(tabId, active) {
  if (!tabId) return;
  if (active) activeTabs.add(tabId);
  else activeTabs.delete(tabId);
}

function isSecretEntry(tabId) {
  return !!tabId && activeTabs.has(tabId);
}

function clearSecretEntry(tabId) {
  if (tabId) activeTabs.delete(tabId);
}

module.exports = {
  setSecretEntry,
  isSecretEntry,
  clearSecretEntry
};
