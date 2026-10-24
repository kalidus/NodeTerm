/**
 * Detecta si un nuevo blob de vault cifrado sería un wipe accidental
 * respecto al valor local ya persistido (p. ej. encrypt([]) ~100–300 chars).
 */

/** Alineado con writeVaultSidecar / VAULT_TINY_PAYLOAD_CHARS */
const VAULT_SHRINK_MIN_EXISTING = 2048;

function isCatastrophicVaultPayloadShrink(existingStr, incomingStr) {
  if (existingStr == null || incomingStr == null) return false;
  const oldLen = typeof existingStr === 'string' ? existingStr.length : 0;
  const newLen = typeof incomingStr === 'string' ? incomingStr.length : 0;
  if (oldLen < VAULT_SHRINK_MIN_EXISTING) return false;
  if (newLen >= oldLen) return false;
  return newLen < oldLen * 0.25;
}

module.exports = {
  VAULT_SHRINK_MIN_EXISTING,
  isCatastrophicVaultPayloadShrink
};
