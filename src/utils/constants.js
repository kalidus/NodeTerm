// Constantes de almacenamiento
export const STORAGE_KEYS = {
  TREE_DATA: 'basicapp2_tree_data',
  UI_THEME: 'ui_theme',
  LOCK_HOME_BUTTON: 'lock_home_button',
  HOME_TAB_ICON: 'home_tab_icon',
  SIDEBAR_START_COLLAPSED: 'sidebar_start_collapsed',
  DEFAULT_LOCAL_TERMINAL: 'nodeterm_default_local_terminal',
  HOME_TAB_LOCAL_TERMINAL_VISIBLE: 'homeTab_localTerminalVisible',
  HOME_TAB_STATUS_BAR_VISIBLE: 'homeTab_statusBarVisible',
  HOME_TAB_RIGHT_COLUMN_COLLAPSED: 'homeTab_rightColumnCollapsed'
};

// Constantes de grupos
export const GROUP_KEYS = {
  DEFAULT: 'no-group'
};

// Constantes de temas
export const THEME_DEFAULTS = {
  BACKGROUND: '#222',
  FONT_SIZE: 14
};

// Constantes de pestañas
export const TAB_INDEXES = {
  HOME: 0,
  FIRST: 0
};

// Constantes de eventos
export const EVENT_NAMES = {
  SSH_STATS_UPDATE: 'ssh-stats:update'
};

// Constantes de tipos de pestañas
export const TAB_TYPES = {
  HOME: 'home',
  TERMINAL: 'terminal',
  SPLIT: 'split',
  RDP: 'rdp',
  RDP_GUACAMOLE: 'rdp-guacamole',
  VNC: 'vnc',
  VNC_GUACAMOLE: 'vnc-guacamole',
  GUACAMOLE: 'guacamole',
  EXPLORER: 'explorer',
  PASSWORD: 'password',
  PASSWORD_FOLDER: 'password-folder'
};

// Constantes de estados de conexión
export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error'
};
