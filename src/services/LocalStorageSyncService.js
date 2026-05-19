/**
 * LocalStorageSyncService - Sincronización de localStorage entre instancias
 *
 * Las instancias secundarias usan UserData temporal; cargan datos desde app-data.json compartido.
 */

import { SYNC_KEYS } from '../shared/sync-keys';

const EXTRA_FETCH_ROUNDS = 2;
const EXTRA_FETCH_DELAY_MS = 300;
const SECONDARY_EXTRA_ROUNDS = 12;
const SECONDARY_FETCH_DELAY_MS = 500;

class LocalStorageSyncService {
    constructor() {
        this._initialized = false;
        this._syncReady = false;
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

        setInterval(() => {
            this.syncToFile();
        }, 30000);
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
    async initialize() {
        if (this._initialized) {
            return;
        }

        try {
            if (!window.electron?.appdata) {
                return;
            }

            const sharedData = await this._fetchSharedData();

            if (sharedData) {
                this._importToLocalStorage(sharedData);
                this._snapshotSyncState();
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
        const sharedData = await this._fetchSharedData();
        if (!sharedData) {
            return false;
        }
        this._importToLocalStorage(sharedData);
        this._snapshotSyncState();
        return true;
    }

    /**
     * Importa datos del archivo compartido a localStorage
     */
    _importToLocalStorage(data) {
        let importedCount = 0;

        for (const key of SYNC_KEYS) {
            if (data[key] !== undefined && data[key] !== null) {
                // Sobrescribir siempre al inicializar para asegurar sync
                localStorage.setItem(key, data[key]);
                importedCount++;
            }
        }

        // console.log(`[LocalStorageSync] Importados ${importedCount} items a localStorage`);

        // Notificar a la aplicación que hubo cambios
        if (importedCount > 0) {
            window.dispatchEvent(new CustomEvent('settings-updated', {
                detail: { source: 'sync', count: importedCount }
            }));
        }

        const docKeys = ['documents_encrypted', 'documentManagerNodes', 'documents_expanded_keys'];
        if (docKeys.some((k) => data[k] !== undefined && data[k] !== null)) {
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
     * Exporta localStorage a archivo compartido
     * @param {Object} explicitOverrides - Datos explícitos para sincronizar (tienen prioridad sobre localStorage)
     */
    async syncToFile(explicitOverrides = {}) {
        try {
            if (!window.electron?.appdata) {
                return;
            }

            const keys = await window.electron.appdata.getSyncKeys();

            const data = {};
            let count = 0;

            // Si el argumento NO es un objeto de overrides (es null o undefined), tratarlo como vacío
            const overrides = explicitOverrides || {};

            // Inicializar caché si no existe
            if (!this._memoryCache) this._memoryCache = {};

            for (const key of keys) {
                // PRIMERO: Intentar usar el override explícito si existe
                if (overrides[key] !== undefined) {
                    data[key] = overrides[key];
                    this._memoryCache[key] = overrides[key]; // Actualizar caché
                    count++;
                }
                // SEGUNDO: Fallback a localStorage
                else {
                    const value = localStorage.getItem(key);
                    if (value !== null) {
                        data[key] = value;
                        this._memoryCache[key] = value; // Actualizar caché
                        count++;
                    }
                    // TERCERO: Fallback a caché en memoria (para evitar borrados accidentales si localStorage falla)
                    else if (this._memoryCache[key] !== undefined) {
                        data[key] = this._memoryCache[key];
                        count++;
                        // console.log(`[LocalStorageSync] ⚠️ Usando caché en memoria para clave perdida: ${key}`);
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
