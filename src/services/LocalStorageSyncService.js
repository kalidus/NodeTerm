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
    }

    /**
     * Inicializa el servicio y carga datos del archivo compartido si es necesario
     */
    async initialize() {
        if (this._initialized) return;

        try {
            // Verificar si el API está disponible
            if (!window.electron?.appdata) {
                console.warn('[LocalStorageSync] API no disponible');
                return;
            }

            // Cargar datos del archivo compartido
            const sharedData = await window.electron.appdata.getAll();

            if (sharedData) {
                console.log('[LocalStorageSync] Cargando datos desde archivo compartido...');
                this._importToLocalStorage(sharedData);
                console.log('[LocalStorageSync] Datos cargados correctamente');
            } else {
                console.log('[LocalStorageSync] No hay datos compartidos.');

                // Verificar si tenemos datos locales significativos antes de sobrescribir
                const hasLocalTheme = localStorage.getItem('ui_theme');
                const hasLocalHistory = localStorage.getItem('nodeterm_connection_history');

                if (hasLocalTheme || hasLocalHistory) {
                    console.log('[LocalStorageSync] Exportando datos locales existentes a archivo compartido...');
                    await this.syncToFile();
                } else {
                    console.log('[LocalStorageSync] LocalStorage vacío, esperando cambios antes de sincronizar.');
                }
            }

            this._initialized = true;

            // 🔄 Auto-sync cuando la ventana pierde el foco (para que otras instancias vean cambios)
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    console.log('[LocalStorageSync] Ventana oculta, sincronizando datos...');
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

        console.log(`[LocalStorageSync] Importados ${importedCount} items a localStorage`);

        // Notificar a la aplicación que hubo cambios
        if (importedCount > 0) {
            window.dispatchEvent(new CustomEvent('settings-updated', {
                detail: { source: 'sync', count: importedCount }
            }));
        }
    }

    /**
     * Exporta localStorage a archivo compartido
     */
    async syncToFile() {
        try {
            console.log('[LocalStorageSync] Iniciando syncToFile...');

            if (!window.electron?.appdata) {
                console.warn('[LocalStorageSync] API appdata no disponible');
                return;
            }

            const data = {};
            let count = 0;
            for (const key of SYNC_KEYS) {
                const value = localStorage.getItem(key);
                if (value !== null) {
                    data[key] = value;
                    count++;
                }
            }

            console.log(`[LocalStorageSync] Encontradas ${count} claves para sincronizar`);

            if (count === 0) {
                console.log('[LocalStorageSync] No hay datos que sincronizar (localStorage vacío)');
                return;
            }

            const result = await window.electron.appdata.saveAll(data);
            if (result.success) {
                console.log('[LocalStorageSync] ✅ Datos sincronizados a archivo compartido');
            } else {
                console.error('[LocalStorageSync] ❌ Error guardando:', result.error);
            }
        } catch (error) {
            console.error('[LocalStorageSync] Error sincronizando a archivo:', error);
        }
    }

    /**
     * Sincroniza después de un cambio con debounce para evitar escrituras frecuentes
     */
    debouncedSync() {
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
        }
        this._debounceTimer = setTimeout(() => {
            this.syncToFile();
        }, 2000); // Esperar 2 segundos después del último cambio
    }
}

// Singleton
const localStorageSyncService = new LocalStorageSyncService();

export default localStorageSyncService;
