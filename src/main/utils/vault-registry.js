/**
 * Registro de vaults extra (conexiones). El vault principal ("default") no se lista aquí:
 * siempre existe implícitamente y usa las rutas/claves históricas.
 */

const fs = require('fs');
const path = require('path');
const { getNodeTermDataDir } = require('./file-utils');
const { DEFAULT_VAULT_ID } = require('../../shared/vault-connection-trees');
const { deleteExtraVaultDir, ensureVaultDir } = require('./vault-sidecar');

const EXPERIMENTAL_FLAG_KEY = 'nodeterm_experimental_multi_vault';

function getVaultsRegistryPath() {
  if (process.env.NODETERM_TEST_DATA_DIR) {
    return path.join(process.env.NODETERM_TEST_DATA_DIR, 'vaults.json');
  }
  return path.join(getNodeTermDataDir(), 'vaults.json');
}

const DEFAULT_VAULT_DISPLAY_NAME = 'Principal';

function normalizeDefaultVaultName(raw) {
  const name = String(raw || '').trim();
  return name || DEFAULT_VAULT_DISPLAY_NAME;
}

function readRegistry() {
  const filePath = getVaultsRegistryPath();
  if (!fs.existsSync(filePath)) {
    return { version: 1, defaultVaultName: DEFAULT_VAULT_DISPLAY_NAME, vaults: [] };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!parsed || typeof parsed !== 'object') {
      return { version: 1, defaultVaultName: DEFAULT_VAULT_DISPLAY_NAME, vaults: [] };
    }
    const vaults = Array.isArray(parsed.vaults) ? parsed.vaults : [];
    return {
      version: typeof parsed.version === 'number' ? parsed.version : 1,
      defaultVaultName: normalizeDefaultVaultName(parsed.defaultVaultName),
      vaults: vaults
        .filter((v) => v && v.id && v.id !== DEFAULT_VAULT_ID)
        .map((v) => ({
          id: String(v.id),
          name: String(v.name || v.id),
          icon: v.icon || 'pi pi-lock',
          order: typeof v.order === 'number' ? v.order : 0,
          createdAt: v.createdAt || null
        }))
    };
  } catch (e) {
    console.warn('[VaultRegistry] Error leyendo vaults.json:', e.message);
    return { version: 1, defaultVaultName: DEFAULT_VAULT_DISPLAY_NAME, vaults: [] };
  }
}

function writeRegistry(registry) {
  const filePath = getVaultsRegistryPath();
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const payload = {
    version: 1,
    defaultVaultName: normalizeDefaultVaultName(registry.defaultVaultName),
    vaults: (registry.vaults || [])
      .filter((v) => v && v.id && v.id !== DEFAULT_VAULT_ID)
      .map((v, index) => ({
        id: String(v.id),
        name: String(v.name || v.id),
        icon: v.icon || 'pi pi-lock',
        order: typeof v.order === 'number' ? v.order : index,
        createdAt: v.createdAt || new Date().toISOString()
      }))
  };
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, filePath);
  return payload;
}

function getDefaultVaultName() {
  return normalizeDefaultVaultName(readRegistry().defaultVaultName);
}

function listVaults() {
  const reg = readRegistry();
  return [...reg.vaults].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name));
}

function getVault(vaultId) {
  if (!vaultId || vaultId === DEFAULT_VAULT_ID) return null;
  return listVaults().find((v) => v.id === String(vaultId)) || null;
}

function sanitizeVaultId(raw) {
  const safe = String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safe || safe === DEFAULT_VAULT_ID) return null;
  return safe;
}

function createVault({ id, name, icon } = {}) {
  if (id != null && String(id) !== '') {
    if (String(id) === DEFAULT_VAULT_ID || !sanitizeVaultId(id)) {
      throw new Error('vaultId inválido');
    }
  }
  const vaultId =
    sanitizeVaultId(id) ||
    `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  if (!sanitizeVaultId(vaultId)) {
    throw new Error('vaultId inválido');
  }
  const reg = readRegistry();
  if (reg.vaults.some((v) => v.id === vaultId)) {
    throw new Error('Ya existe un vault con ese id');
  }
  ensureVaultDir(vaultId);
  const entry = {
    id: vaultId,
    name: String(name || vaultId).trim() || vaultId,
    icon: icon || 'pi pi-lock',
    order: reg.vaults.length,
    createdAt: new Date().toISOString()
  };
  reg.vaults.push(entry);
  writeRegistry(reg);
  return entry;
}

function renameVault(vaultId, name) {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('Nombre vacío');

  if (!vaultId || vaultId === DEFAULT_VAULT_ID) {
    const reg = readRegistry();
    reg.defaultVaultName = normalizeDefaultVaultName(trimmed);
    writeRegistry(reg);
    return {
      id: DEFAULT_VAULT_ID,
      name: reg.defaultVaultName,
      icon: 'pi pi-home'
    };
  }

  const id = sanitizeVaultId(vaultId);
  if (!id) throw new Error('vaultId inválido');
  const reg = readRegistry();
  const entry = reg.vaults.find((v) => v.id === id);
  if (!entry) throw new Error('Vault no encontrado');
  entry.name = trimmed;
  writeRegistry(reg);
  return entry;
}

function deleteVault(vaultId) {
  const id = sanitizeVaultId(vaultId);
  if (!id) throw new Error('vaultId inválido');
  const reg = readRegistry();
  const before = reg.vaults.length;
  reg.vaults = reg.vaults.filter((v) => v.id !== id);
  if (reg.vaults.length === before) {
    throw new Error('Vault no encontrado');
  }
  writeRegistry(reg);
  deleteExtraVaultDir(id);
  return { success: true, id };
}

/**
 * Copia de seguridad previa a crear el primer vault extra.
 * @returns {{ backupDir: string|null, created: boolean }}
 */
function backupBeforeFirstExtraVault() {
  const reg = readRegistry();
  if (reg.vaults.length > 0) {
    return { backupDir: null, created: false };
  }

  const dataDir = process.env.NODETERM_TEST_DATA_DIR || getNodeTermDataDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(dataDir, 'backups', `pre-multi-vault-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  const copyIfExists = (srcName) => {
    const src = path.join(dataDir, srcName);
    if (!fs.existsSync(src)) return;
    const dest = path.join(backupDir, srcName);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
      fs.cpSync(src, dest, { recursive: true });
    } else {
      fs.copyFileSync(src, dest);
    }
  };

  try {
    copyIfExists('security.json');
    copyIfExists('app-data.json');
    copyIfExists('vault');
    copyIfExists('vaults.json');
  } catch (e) {
    console.warn('[VaultRegistry] Backup parcial:', e.message);
  }

  return { backupDir, created: true };
}

module.exports = {
  EXPERIMENTAL_FLAG_KEY,
  DEFAULT_VAULT_ID,
  DEFAULT_VAULT_DISPLAY_NAME,
  getVaultsRegistryPath,
  readRegistry,
  writeRegistry,
  listVaults,
  getVault,
  getDefaultVaultName,
  sanitizeVaultId,
  createVault,
  renameVault,
  deleteVault,
  backupBeforeFirstExtraVault
};
