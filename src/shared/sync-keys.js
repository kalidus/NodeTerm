/**
 * Claves de localStorage sincronizadas entre instancias (app-data.json compartido).
 * Usado por main (appdata-handlers) y renderer (LocalStorageSyncService).
 */
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
  'nodeterm_expanded_keys',
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

  // Fuentes y terminal
  'basicapp_font_family',
  'basicapp_font_size',
  'basicapp_statusbar_height',
  'basicapp_local_terminal_font_family',
  'basicapp_local_terminal_font_size',
  'basicapp_local_powershell_theme',
  'basicapp_local_linux_terminal_theme',
  'localPowerShellTheme',
  'localLinuxTerminalTheme',

  // Grupos de favoritos
  'nodeterm_favorite_groups',
  'nodeterm_group_assignments',
  'nodeterm_filter_config',

  // Terminales Docker/Linux
  'localDockerTerminalTheme',
  'nodeterm_docker_font_family',
  'nodeterm_docker_font_size',
  'nodeterm_linux_font_family',
  'nodeterm_linux_font_size',

  // Master key (backup) y auth
  'nodeterm_master_key',
  'nodeterm_remember_password',

  // Configuración general y UI
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

  // Auditoría
  'audit_auto_recording',
  'audit_recording_quality',
  'audit_encrypt_recordings',
  'audit_auto_cleanup',
  'audit_retention_days',
  'audit_max_storage_size',
  'audit_cleanup_on_startup',
  'audit_cleanup_frequency',

  // HomeTab
  'homeTab_localTerminalVisible',
  'homeTab_localTerminalTabsVisible',
  'homeTab_localTerminalWorkspace',
  'homeTab_statusBarVisible',
  'homeTabFont',
  'homeTabFontSize',
  'actionBarIconTheme',
  'homeTab_rightColumnCollapsed',
  'homeTab_rightColumn_sections',

  // RDP/Guacamole
  'rdp_idle_timeout_minutes',
  'rdp_session_activity_minutes',
  'rdp_resize_debounce_ms',
  'rdp_resize_ack_timeout_ms',
  'rdp_guacd_inactivity_ms',

  // AI
  'aichat_history',
  'aichat_model_config',
  'ai_clients_enabled',

  // Notas / documentos
  'documents_encrypted',
  'documentManagerNodes',
  'documents_expanded_keys'
];

module.exports = { SYNC_KEYS };
