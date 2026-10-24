/**
 * LocalStorageSyncService - Sincronización de localStorage entre instancias
 *
 * Las instancias secundarias usan UserData temporal; cargan datos desde app-data.json compartido.
 */

import { SYNC_KEYS } from '../shared/sync-keys';
import { VAULT_LOCAL_STORAGE_KEYS } from '../shared/vault-local-storage-keys';
import { vaultPayloadsEquivalent } from '../shared/vault-blob-encoding';
import { isCatastrophicVaultPayloadShrink } from '../shared/vault-shrink-guard';
import { isTinyVaultPayload, VAULT_STAMPS_LS } from '../shared/vault-write';

const EXTRA_FETCH_ROUNDS = 2;
const EXTRA_FETCH_DELAY_MS = 300;
const SECONDARY_EXTRA_ROUNDS = 3;
const SECONDARY_FETCH_DELAY_MS = 400;

/** Clave legacy (sync-keys antiguo); migrar a nodeterm_favorite_group_assignments */
const LEGACY_FAVORITE_ASSIGNMENTS_KEY = 'nodeterm_group_assignments';
const FAVORITE_ASSIGNMENTS_KEY = 'nodeterm_favorite_group_assignments';

const FAVORITE_SYNC_KEYS = [
    'nodeterm_favorite_connections',
    'nodeterm_favorite_groups',
    FAVORITE_ASSIGNMENTS_KEY,
    'nodeterm_favorite_member_order',
    'nodeterm_filter_config',
    LEGACY_FAVORITE_ASSIGNMENTS_KEY
];

const isEmptyValue = (val) => {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') {
        const trimmed = val.trim();
        return trimmed === '' || trimmed === '[]' || trimmed === '{}';
    }
    return false;
};

class LocalStorageSyncService {
    constructor() {
        this._initialized = false;
        this._syncReady = false;
        this._initPromise = null;
        this._debounceTimer = null;
        this._lastSyncDataStr = null;
        this._listenersBound = false;
    }

    isSyncReady() {
        return this._syncReady;
    }

    async _fetchSharedData() {
        if (!window.electron?.appdata) {
            return null;
        }

        const isSecondary = window.electron?.isSecondaryInstance === true;
        const maxRounds = isSecondary ? SECONDARY_EXTRA_ROUNDS : EXTRA_FETCH_ROUNDS;
        const delayMs = isSecondary ? SECONDARY_FETCH_DELAY_MS : EXTRA_FETCH_DELAY_MS;

        for (let round = 0; round <= maxRounds; round++) {
            const data = await window.electron.appdata.getAll();
            if (data) {
                return data;
            }
            if (round < maxRounds) {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
        return null;
    }

    _bindPeriodicSync() {
        if (this._listenersBound) {
            return;
        }
        this._listenersBound = true;

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.syncToFile();
            }
        });

        // Garantizar persistencia a disco al cerrar la ventana o salir de la aplicación
        window.addEventListener('beforeunload', () => {
            this.syncToFile();
        });

        window.addEventListener('pagehide', () => {
            this.syncToFile();
        });
    }

    _snapshotSyncState() {
        const initialSyncData = {};
        for (const key of SYNC_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                initialSyncData[key] = value;
            }
        }
        this._lastSyncDataStr = JSON.stringify(initialSyncData);
    }

    /**
     * Inicializa el servicio y carga datos del archivo compartido si es necesario
     */
    _hasLocalKeysMissingFromShared(sharedData) {
        if (!sharedData || typeof sharedData !== 'object') {
            return true;
        }
        const stamps = sharedData._vaultStamps || {};
        for (const key of SYNC_KEYS) {
            const localVal = localStorage.getItem(key);
            if (VAULT_LOCAL_STORAGE_KEYS.includes(key)) {
                // Sidecar presente: el blob no viaja en getAll. Solo falta si hay local y no hay fichero.
                if (!isEmptyValue(localVal) && !(stamps[key] > 0) && (sharedData[key] == null)) {
                    return true;
                }
                continue;
            }
            if (!isEmptyValue(localVal) && (sharedData[key] === undefined || sharedData[key] === null)) {
                return true;
            }
        }
        return false;
    }

    _readSavedVaultStamps() {
        try {
            const raw = localStorage.getItem(VAULT_STAMPS_LS);
            const parsed = raw ? JSON.parse(raw) : {};
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (_) {
            return {};
        }
    }

    _persistVaultStamps(stamps, confirmedKeys) {
        if (!Array.isArray(confirmedKeys)) return;
        const next = { ...this._readSavedVaultStamps() };
        const allowed = new Set(confirmedKeys);
        for (const key of VAULT_LOCAL_STORAGE_KEYS) {
            if (!allowed.has(key)) continue;
            if (stamps[key] > 0 && localStorage.getItem(key)) {
                next[key] = stamps[key];
            }
        }
        try {
            localStorage.setItem(VAULT_STAMPS_LS, JSON.stringify(next));
        } catch (_) {
            /* noop */
        }
    }

    /**
     * Trae blobs de vault solo si no hay copia local o el mtime del sidecar cambió.
     */
    async _hydrateVaultBlobs(sharedData) {
        if (!sharedData || !window.electron?.appdata?.getVault) {
            return sharedData;
        }
        const stamps = sharedData._vaultStamps || {};
        const saved = this._readSavedVaultStamps();
        const confirmed = [];

        const toFetch = [];
        for (const key of VAULT_LOCAL_STORAGE_KEYS) {
            const stamp = stamps[key] || 0;
            if (!stamp) continue;
            const localVal = localStorage.getItem(key);
            // Stamp match: skip solo si el local no parece un wipe (encrypt([]) ~tiny).
            const stampMatches = !!(localVal && saved[key] === stamp);
            const localTiny = isTinyVaultPayload(localVal);
            if (stampMatches && !localTiny) {
                confirmed.push(key);
                continue;
            }
            toFetch.push({ key, localVal, localTiny, stampMatches });
        }

        if (toFetch.length > 0) {
            const results = await Promise.all(
                toFetch.map(async ({ key, localVal, localTiny, stampMatches }) => {
                    try {
                        const blob = await window.electron.appdata.getVault(key);
                        return { key, localVal, localTiny, stampMatches, blob, error: null };
                    } catch (error) {
                        console.warn(
                            `[LocalStorageSync] No se pudo leer vault ${key}:`,
                            error
                        );
                        return { key, localVal, localTiny, stampMatches, blob: null, error };
                    }
                })
            );

            for (const { key, localVal, localTiny, stampMatches, blob } of results) {
                if (blob) {
                    if (localVal && isCatastrophicVaultPayloadShrink(localVal, blob)) {
                        console.error(
                            `[LocalStorageSync] getVault ${key} ignorado: shrink vs local`
                        );
                        if (!localTiny) confirmed.push(key);
                    } else {
                        sharedData[key] = blob;
                        confirmed.push(key);
                    }
                } else if (stampMatches && !localTiny) {
                    confirmed.push(key);
                }
            }
        }

        sharedData._vaultConfirmed = confirmed;
        return sharedData;
    }

    async initialize() {
        if (this._initialized) {
            return;
        }
        if (this._initPromise) {
            return this._initPromise;
        }

        this._initPromise = this._doInitialize();
        return this._initPromise;
    }

    async _doInitialize() {
        try {
            if (!window.electron?.appdata) {
                return;
            }

            const sharedData = await this._hydrateVaultBlobs(await this._fetchSharedData());

            if (sharedData) {
                this._importToLocalStorage(sharedData);
                this._persistVaultStamps(sharedData._vaultStamps || {}, sharedData._vaultConfirmed);
                this._snapshotSyncState();
                if (!window.electron?.isSecondaryInstance && this._hasLocalKeysMissingFromShared(sharedData)) {
                    await this.syncToFile();
                }
            } else {
                const hasLocalTheme = localStorage.getItem('ui_theme');
                const hasLocalHistory = localStorage.getItem('nodeterm_connection_history');

                if (hasLocalTheme || hasLocalHistory) {
                    await this.syncToFile();
                } else if (window.electron?.isSecondaryInstance) {
                    console.warn(
                        '[LocalStorageSync] Instancia secundaria: no se pudieron cargar datos compartidos'
                    );
                }
            }

            this._initialized = true;
            this._bindPeriodicSync();
        } catch (error) {
            console.error('[LocalStorageSync] Error inicializando:', error);
        } finally {
            this._syncReady = true;
            window.dispatchEvent(new CustomEvent('localstorage-sync-ready'));
        }
    }

    /**
     * Reimporta app-data.json (p. ej. tras unlock si faltaban conexiones)
     */
    async reloadFromSharedFile() {
        if (!window.electron?.appdata) {
            return false;
        }
        const sharedData = await this._hydrateVaultBlobs(await this._fetchSharedData());
        if (!sharedData) {
            return false;
        }
        this._importToLocalStorage(sharedData);
        this._persistVaultStamps(sharedData._vaultStamps || {}, sharedData._vaultConfirmed);
        this._snapshotSyncState();
        return true;
    }

    _normalizeFavoriteSyncPayload(data) {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const legacy = data[LEGACY_FAVORITE_ASSIGNMENTS_KEY];
        const current = data[FAVORITE_ASSIGNMENTS_KEY];

        if (legacy && !current) {
            data[FAVORITE_ASSIGNMENTS_KEY] = legacy;
        }

        return data;
    }

    _migrateLegacyFavoriteAssignmentsInLocalStorage() {
        const legacy = localStorage.getItem(LEGACY_FAVORITE_ASSIGNMENTS_KEY);
        const current = localStorage.getItem(FAVORITE_ASSIGNMENTS_KEY);

        if (legacy && !current) {
            localStorage.setItem(FAVORITE_ASSIGNMENTS_KEY, legacy);
        }

        if (legacy) {
            localStorage.removeItem(LEGACY_FAVORITE_ASSIGNMENTS_KEY);
        }
    }

    /**
     * Importa datos del archivo compartido a localStorage
     */
    _importToLocalStorage(data) {
        const normalized = this._normalizeFavoriteSyncPayload({ ...data });
        let importedCount = 0;
        let needsWriteBack = false;
        const writtenKeys = [];

        for (const key of SYNC_KEYS) {
            if (normalized[key] !== undefined && normalized[key] !== null) {
                const localVal = localStorage.getItem(key);
                if (isEmptyValue(normalized[key]) && !isEmptyValue(localVal)) {
                    // Evitar que un valor vacío compartido sobrescriba un valor local no vacío
                    needsWriteBack = true;
                    continue;
                }
                if (localVal === normalized[key]) {
                    continue;
                }
                if (
                    VAULT_LOCAL_STORAGE_KEYS.includes(key) &&
                    localVal &&
                    vaultPayloadsEquivalent(localVal, normalized[key])
                ) {
                    continue;
                }
                // No importar un vault casi vacío sobre uno local sustancial
                if (
                    VAULT_LOCAL_STORAGE_KEYS.includes(key) &&
                    isCatastrophicVaultPayloadShrink(localVal, normalized[key])
                ) {
                    console.error(
                        `[LocalStorageSync] Import rechazado para ${key}: shrink catastrófico`
                    );
                    needsWriteBack = true;
                    continue;
                }
                localStorage.setItem(key, normalized[key]);
                writtenKeys.push(key);
                importedCount++;
            }
        }

        if (needsWriteBack) {
            this._lastSyncDataStr = null;
            this.debouncedSync();
        }

        this._migrateLegacyFavoriteAssignmentsInLocalStorage();

        // console.log(`[LocalStorageSync] Importados ${importedCount} items a localStorage`);

        // Notificar a la aplicación que hubo cambios
        if (importedCount > 0) {
            window.dispatchEvent(new CustomEvent('settings-updated', {
                detail: { source: 'sync', count: importedCount, keys: writtenKeys }
            }));
        }

        if (FAVORITE_SYNC_KEYS.some((k) => normalized[k] !== undefined && normalized[k] !== null)) {
            window.dispatchEvent(new CustomEvent('favorite-groups-updated', {
                detail: { source: 'sync' }
            }));
        }

        const docKeys = ['documents_encrypted', 'documentManagerNodes', 'documents_expanded_keys'];
        if (docKeys.some((k) => normalized[k] !== undefined && normalized[k] !== null)) {
            window.dispatchEvent(new CustomEvent('documents-storage-updated'));
        }
    }

    /**
     * Actualiza la caché en memoria para una clave específica.
     * Útil para asegurar que datos críticos (como el árbol) no se pierdan
     * si localStorage falla al leerlos en el momento del sync.
     */
    updateCache(key, value) {
        if (!this._memoryCache) this._memoryCache = {};
        this._memoryCache[key] = value;
    }

    /**
     * Forces an immediate sync to app-data.json, bypassing the change-detection
     * snapshot. Use this when you know keys were deleted from localStorage and want
     * to guarantee those deletions are written before a possible app restart.
     */
    async forceSync() {
        // Reset the snapshot so the change-detection check does not skip the write
        this._lastSyncDataStr = null;
        return this.syncToFile();
    }

    /**
     * Exporta localStorage a archivo compartido
     * @param {Object} explicitOverrides - Datos explícitos para sincronizar (tienen prioridad sobre localStorage)
     */
    async syncToFile(explicitOverrides = {}) {
        try {
            if (!window.electron?.appdata) {
                return;
            }

            const data = {};
            let count = 0;

            // Si el argumento NO es un objeto de overrides (es null o undefined), tratarlo como vacío
            const overrides = explicitOverrides || {};

            // Inicializar caché si no existe
            if (!this._memoryCache) this._memoryCache = {};

            for (const key of SYNC_KEYS) {
                // PRIMERO: Intentar usar el override explícito si existe
                if (overrides[key] !== undefined) {
                    const nextVal = overrides[key];
                    if (
                        VAULT_LOCAL_STORAGE_KEYS.includes(key) &&
                        isCatastrophicVaultPayloadShrink(
                            localStorage.getItem(key) || this._memoryCache?.[key],
                            nextVal
                        )
                    ) {
                        console.error(
                            `[LocalStorageSync] Sync omitido para ${key}: shrink catastrófico`
                        );
                        continue;
                    }
                    data[key] = nextVal;
                    this._memoryCache[key] = nextVal;
                    count++;
                }
                // SEGUNDO: Fallback a localStorage
                else {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        // LS envenenado (encrypt([])) vs caché buena: no empujar el vacío a disco
                        if (
                            VAULT_LOCAL_STORAGE_KEYS.includes(key) &&
                            isCatastrophicVaultPayloadShrink(this._memoryCache?.[key], value)
                        ) {
                            console.error(
                                `[LocalStorageSync] Sync LS omitido para ${key}: shrink vs caché; se conserva caché`
                            );
                            data[key] = this._memoryCache[key];
                            count++;
                            continue;
                        }
                        data[key] = value;
                        this._memoryCache[key] = value;
                        count++;
                    }
                    // TERCERO: Fallback a caché en memoria (para evitar borrados accidentales si localStorage falla antes de inicializar)
                    else if (!this._initialized && this._memoryCache[key] !== undefined) {
                        data[key] = this._memoryCache[key];
                        count++;
                    } else if (this._initialized) {
                        // Si está inicializado y no está en localStorage, lo eliminamos de la caché en memoria para permitir su borrado en app-data.json
                        delete this._memoryCache[key];
                    }
                }
            }

            if (count === 0) {
                return;
            }

            // --- DETECCIÓN DE CAMBIOS ---
            const currentDataStr = JSON.stringify(data);
            if (this._lastSyncDataStr === currentDataStr) {
                // console.log('[LocalStorageSync] Sin cambios detectados. Saltando sincronización.');
                return;
            }

            // console.log('[LocalStorageSync] 🔄 Cambios detectados. Iniciando syncToFile...');
            // console.log(`[LocalStorageSync] Encontradas ${count} claves para sincronizar`);

            const result = await window.electron.appdata.saveAll(data);
            if (result.success) {
                this._lastSyncDataStr = currentDataStr;
                // console.log('[LocalStorageSync] ✅ Datos sincronizados a archivo compartido');
            } else {
                console.error('[LocalStorageSync] ❌ Error guardando:', result.error);
            }
        } catch (error) {
            console.error('[LocalStorageSync] Error sincronizando a archivo:', error);
        }
    }

    /**
     * Programa una sincronización diferida
     * @param {Object} overrides - Datos opcionales para pasar al sync
     */
    debouncedSync(overrides = {}) {
        // Acumular overrides si se llama varias veces rápido
        if (overrides) {
            this._pendingOverrides = { ...this._pendingOverrides, ...overrides };
        }

        if (this._syncTimeout) {
            clearTimeout(this._syncTimeout);
        }

        this._syncTimeout = setTimeout(() => {
            const finalOverrides = this._pendingOverrides || {};
            this._pendingOverrides = {}; // Limpiar pendientes
            this.syncToFile(finalOverrides);
        }, 2000); // Esperar 2 segundos después del último cambio
    }
}

// Singleton
const localStorageSyncService = new LocalStorageSyncService();

export default localStorageSyncService;
