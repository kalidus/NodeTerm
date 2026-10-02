/**
 * Versionado de security.json (independiente de package.json).
 * Migraciones silenciosas se ejecutan desde el renderer via SecureStorage.loadMasterKey/saveMasterKey.
 */
const VAULT_SECURITY_VERSION = 2;

module.exports = {
  VAULT_SECURITY_VERSION
};
