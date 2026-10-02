/**
 * Claves de localStorage que contienen vaults cifrados con la master key.
 * Fuente de verdad para validar contrasena al desbloquear.
 */
const VAULT_LOCAL_STORAGE_KEYS = [
  'connections_encrypted',
  'passwords_encrypted',
  'nodeterm_secure_sessions',
  'documents_encrypted'
];

module.exports = { VAULT_LOCAL_STORAGE_KEYS };
