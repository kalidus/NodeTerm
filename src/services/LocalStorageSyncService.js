/**
 * LocalStorageSyncService - Sincronización de localStorage entre instancias
 * 
 * Este servicio resuelve el problema de que las instancias secundarias de Electron
 * usan un directorio UserData temporal y no tienen acceso al localStorage de la
 * instancia principal.
 * 
 * Funcionamiento:
 * 1. Al iniciar, si es instancia secundaria, carga datos del archivo compartido
 * 2. Después de cambios importantes, exporta localStorage al archivo compartido
 */

// Lista de claves críticas que deben sincronizarse
const SYNC_KEYS = [
    // Conexiones encriptadas
    'connections_encrypted',
    'passwords_encrypted',
    'nodeterm_secure_sessions',

    // Historial y favoritos
    'nodeterm_connection_history',
    'nodeterm_favorite_connections',

    // Árbol de datos (conexiones organizadas)
    'basicapp2_tree_data',

    // Configuración de sincronización
    'nodeterm_sync_config',

    // Temas y configuración visual
    'ui_theme',
    'basicapp_statusbar_theme',
    'basicapp_terminal_theme',
    'iconTheme',
    'iconThemeSidebar',
    'sessionActionIconTheme',
    'nodeterm_tab_theme',
    'nodeterm_tab_layout',
    // Configuración de fuentes y terminal
    'basicapp_font_family',
    'basicapp_font_size',
    'basicapp_local_terminal_font_family',
    'basicapp_local_terminal_font_size',
    'basicapp_statusbar_height',
    'localPowerShellTheme',
    'localLinuxTerminalTheme',
    'explorerFont',
    'explorerFontSize',
    'explorerColorTheme',
    'sidebarFont',
    'sidebarFontSize',
    'sidebarFontColor',
    'iconSize',
    'folderIconSize',
    'connectionIconSize',
    'nodeterm_interactive_icon',
    'nodeterm_expanded_keys', // Estado de expansión del sidebar

    // Grupos de favoritos
    'nodeterm_favorite_groups',
    'nodeterm_group_assignments',
    'nodeterm_filter_config',

    // Configuración específica de terminales (Docker/Linux)
    'localDockerTerminalTheme',
    'nodeterm_docker_font_family',
    'nodeterm_docker_font_size',
    'nodeterm_linux_font_family',
    'nodeterm_linux_font_size',

    // Master key (backup) y Auth pref
    'nodeterm_master_key',
    'nodeterm_remember_password',

    // Configuración General
    'lock_home_button',
    'home_tab_icon',
    'sidebar_start_collapsed',
    'nodeterm_default_local_terminal',
    'nodeterm_ui_anim_speed',
    'nodeterm_language',
    'nodeterm_ai_provider',
    'nodeterm_ai_model',
    'nodeterm_guacd_preferred_method',
    'rdp_freeze_timeout_ms',
    'update_auto_check',
    'update_channel',
    'update_channel',

    // Configuración de Auditoría
    'audit_auto_recording',
    'audit_recording_quality',
    'audit_encrypt_recordings',
    'audit_auto_cleanup',
    'audit_retention_days',
    'audit_max_storage_size',
    'audit_cleanup_on_startup',
    'audit_cleanup_frequency',

    // Configuración HomeTab
    'homeTab_localTerminalVisible',
    'homeTab_statusBarVisible',
    'homeTabFont',
    'homeTabFontSize',
    'actionBarIconTheme',
    'homeTab_rightColumnCollapsed',
    'homeTab_rightColumn_sections',
    'homeTabFont',
    'homeTabFontSize',

    // Configuración RDP/Guacamole
    'rdp_idle_timeout_minutes',
    'rdp_session_activity_minutes',
    'rdp_resize_debounce_ms',
    'rdp_resize_ack_timeout_ms',
    'rdp_guacd_inactivity_ms',
    'rdp_freeze_timeout_ms',

    // Configuración AI
    'aichat_history',
    'aichat_model_config',

    'nodeterm_remember_password'
];

class LocalStorageSyncService {
    constructor() {
        this._initialized = false;
        this._debounceTimer = null;
        this._lastSyncDataStr = null;
    }

    /**
     * Inicializa el servicio y carga datos del archivo compartido si es necesario
     */
    async initialize() {
        if (this._initialized) return;

        try {
            // Verificar si el API está disponible
            if (!window.electron?.appdata) {
                // console.warn('[LocalStorageSync] API no disponible');
                return;
            }

            // Cargar datos del archivo compartido
            const sharedData = await window.electron.appdata.getAll();

            if (sharedData) {
                // console.log('[LocalStorageSync] Cargando datos desde archivo compartido...');
                this._importToLocalStorage(sharedData);
                // console.log('[LocalStorageSync] Datos cargados correctamente');

                // Inicializar el estado de sincronización con los datos cargados
                const initialSyncData = {};
                for (const key of SYNC_KEYS) {
                    const value = localStorage.getItem(key);
                    if (value !== null) initialSyncData[key] = value;
                }
                this._lastSyncDataStr = JSON.stringify(initialSyncData);
            } else {
                // console.log('[LocalStorageSync] No hay datos compartidos.');

                // Verificar si tenemos datos locales significativos antes de sobrescribir
                const hasLocalTheme = localStorage.getItem('ui_theme');
                const hasLocalHistory = localStorage.getItem('nodeterm_connection_history');

                if (hasLocalTheme || hasLocalHistory) {
                    // console.log('[LocalStorageSync] Exportando datos locales existentes a archivo compartido...');
                    await this.syncToFile();
                } else {
                    // console.log('[LocalStorageSync] LocalStorage vacío, esperando cambios antes de sincronizar.');
                }
            }

            this._initialized = true;

            // 🔄 Auto-sync cuando la ventana pierde el foco (para que otras instancias vean cambios)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    // console.log('[LocalStorageSync] Ventana oculta, sincronizando datos...');
                    this.syncToFile();
                }
            });

            // 🔄 Sync periódico cada 30 segundos para mantener datos actualizados
            setInterval(() => {
                this.syncToFile();
            }, 30000);

        } catch (error) {
            console.error('[LocalStorageSync] Error inicializando:', error);
        }
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
