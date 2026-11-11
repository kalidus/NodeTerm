/**
 * Flag de un solo uso: el próximo guardado de conexiones puede hacer shrink
 * (borrado intencional de carpeta grande / Wallix). Evita allowShrink global.
 */

let pendingAllowShrink = false;

export function requestNextVaultShrink() {
  pendingAllowShrink = true;
}

export function consumeNextVaultShrink() {
  const value = pendingAllowShrink;
  pendingAllowShrink = false;
  return value;
}
