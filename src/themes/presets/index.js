/**
 * Preset definitions for NodeTerm appearance system.
 * Each preset bundles ALL appearance settings into a single selectable profile.
 *
 * Built-in presets are read-only. User presets are stored in localStorage under
 * 'nodeterm_user_presets' and can be created, renamed, and deleted.
 */

export const PRESET_STORAGE_KEY = 'nodeterm_user_presets';
export const ACTIVE_PRESET_STORAGE_KEY = 'nodeterm_active_preset';

/**
 * All localStorage keys that a preset captures and restores.
 */
export const PRESET_SETTINGS_KEYS = [
  // UI theme and window style
  'ui_theme',
  'ui_layout',
  // Tab theme, layout and animation
  'nodeterm_tab_theme',
  'nodeterm_tab_layout',
  'nodeterm_tab_reduced_motion',
  'nodeterm_tab_anim_speed',
  // Terminal themes per type
  'basicapp_terminal_theme',
  'localPowerShellTheme',
  'localLinuxTerminalTheme',
  'localDockerTerminalTheme',
  // Status bar themes per type
  'basicapp_statusbar_theme',
  'localPowerShellStatusBarTheme',
  'localLinuxStatusBarTheme',
  'localDockerStatusBarTheme',
  'localCygwinStatusBarTheme',
  // Status bar icon themes
  'basicapp_ssh_statusbar_icon_theme',
  'basicapp_powershell_statusbar_icon_theme',
  'basicapp_linux_statusbar_icon_theme',
  'basicapp_docker_statusbar_icon_theme',
  // Terminal fonts per type
  'basicapp_terminal_font_family',
  'basicapp_terminal_font_size',
  'basicapp_font_family',
  'basicapp_font_size',
  'basicapp_local_terminal_font_family',
  'basicapp_local_terminal_font_size',
  'nodeterm_linux_font_family',
  'nodeterm_linux_font_size',
  'nodeterm_docker_font_family',
  'nodeterm_docker_font_size',
  // UI / Explorer / sidebar fonts
  'uiFont',
  'uiFontSize',
  'homeTabFont',
  'homeTabFontSize',
  'explorerFont',
  'explorerFontSize',
  'explorerColorTheme',
  'sidebarFont',
  'sidebarFontSize',
  'sidebarFontColor',
  // Cursor
  'nodeterm_cursor_style',
  'nodeterm_cursor_blink',
  // Icon themes and sizes
  'iconTheme',
  'iconThemeSidebar',
  'iconSize',
  'folderIconSize',
  'connectionIconSize',
  // Tree / session / action bar
  'nodeterm_tree_theme',
  'sessionActionIconTheme',
  'actionBarIconTheme',
  // Status bar misc
  'basicapp_statusbar_height',
  // Terminal Opacity
  'nodeterm_terminal_opacity',
  'nodeterm_home_backdrop_blur',
  'nodeterm_main_frame_header_start_collapsed'
];

/**
 * Built-in presets shipped with the application.
 * Users can overwrite custom presets but not built-in ones.
 *
 * Each preset pairs a bundled sans for the UI with a bundled mono for every
 * terminal, and keeps UI theme, explorer, tabs, window layout and status bar
 * on the same palette. sidebarFontColor is omitted on purpose so the theme
 * text color wins and a previous override is cleared on apply.
 */

const UI_FONT_SIZE = '14';
const TERMINAL_FONT_SIZE = '14';
const ICON_SIZE = '20';
const ROOMY_TAB_LAYOUTS = new Set(['spacious', 'arcPills', 'boxed', 'classicBrowser', 'retroTerminal']);

function monoStack(family) {
  const quoted = /[\s-]/.test(family) ? `"${family}"` : family;
  return `${quoted}, monospace`;
}

function treeForLayout(layout) {
  if (layout === 'mux' || layout === 'studio' || layout === 'dock') return 'cursor';
  if (layout === 'atelier' || layout === 'tablero') return 'minimal';
  return 'default';
}

function definePreset(spec) {
  const mono = monoStack(spec.monoFont);
  const tabLayout = spec.tabLayout;
  const uiSize = spec.uiFontSize || UI_FONT_SIZE;
  const monoSize = spec.monoFontSize || TERMINAL_FONT_SIZE;
  const settings = {
    ui_theme: spec.ui,
    ui_layout: spec.layout,
    nodeterm_tab_theme: spec.tabTheme,
    nodeterm_tab_layout: tabLayout,
    nodeterm_tab_reduced_motion: 'false',
    nodeterm_tab_anim_speed: '1',
    basicapp_terminal_theme: spec.terminal,
    localPowerShellTheme: spec.terminal,
    localLinuxTerminalTheme: spec.terminal,
    localDockerTerminalTheme: spec.terminal,
    basicapp_statusbar_theme: spec.status,
    localPowerShellStatusBarTheme: spec.status,
    localLinuxStatusBarTheme: spec.status,
    localDockerStatusBarTheme: spec.status,
    localCygwinStatusBarTheme: spec.status,
    basicapp_ssh_statusbar_icon_theme: spec.statusIcon || 'classic',
    basicapp_powershell_statusbar_icon_theme: spec.statusIcon || 'classic',
    basicapp_linux_statusbar_icon_theme: spec.statusIcon || 'classic',
    basicapp_docker_statusbar_icon_theme: spec.statusIcon || 'classic',
    basicapp_terminal_font_family: mono,
    basicapp_terminal_font_size: monoSize,
    basicapp_font_family: mono,
    basicapp_font_size: monoSize,
    basicapp_local_terminal_font_family: mono,
    basicapp_local_terminal_font_size: monoSize,
    nodeterm_linux_font_family: mono,
    nodeterm_linux_font_size: monoSize,
    nodeterm_docker_font_family: mono,
    nodeterm_docker_font_size: monoSize,
    uiFont: spec.uiFont,
    uiFontSize: uiSize,
    homeTabFont: spec.uiFont,
    homeTabFontSize: uiSize,
    explorerFont: spec.uiFont,
    explorerFontSize: uiSize,
    explorerColorTheme: spec.ui,
    sidebarFont: spec.uiFont,
    sidebarFontSize: uiSize,
    nodeterm_cursor_style: 'bar',
    nodeterm_cursor_blink: 'true',
    iconTheme: spec.iconTheme,
    iconThemeSidebar: spec.iconTheme,
    iconSize: ICON_SIZE,
    folderIconSize: ICON_SIZE,
    connectionIconSize: ICON_SIZE,
    nodeterm_tree_theme: spec.tree || treeForLayout(spec.layout),
    sessionActionIconTheme: spec.sessionIcons || 'glyphs',
    actionBarIconTheme: spec.actionBar || 'nodeterm',
    basicapp_statusbar_height: ROOMY_TAB_LAYOUTS.has(tabLayout) ? '32' : '28',
    nodeterm_terminal_opacity: '1',
    nodeterm_home_backdrop_blur: spec.blur || '0',
    nodeterm_main_frame_header_start_collapsed: 'true'
  };

  return {
    id: spec.id,
    name: spec.name,
    description: spec.description,
    icon: spec.icon,
    isBuiltin: true,
    settings
  };
}

const presetSpecs = [
  {
    id: 'pro-ocean',
    name: 'Pro Ocean (Por defecto)',
    description: 'Estética oceánica con estilo unified, Plus Jakarta Sans, Victor Mono 13px y terminal Oceanic Next',
    icon: '🌊',
    ui: 'Pro Ocean',
    layout: 'unified',
    tabTheme: 'proOcean',
    tabLayout: 'spacious',
    terminal: 'Oceanic Next',
    status: 'Tokyo Night',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'Victor Mono',
    monoFontSize: '13',
    iconTheme: 'ocean',
    sessionIcons: 'glass',
    actionBar: 'glass'
  },
  {
    id: 'mux',
    name: 'Mux',
    description: 'Multiplexor con Geist, pestañas de editor y terminal Tokyo Night',
    icon: '▣',
    ui: 'Mux',
    layout: 'mux',
    tabTheme: 'default',
    tabLayout: 'vscode',
    terminal: 'Tokyo Night',
    status: 'Tokyo Night',
    uiFont: 'Geist',
    monoFont: 'Geist Mono',
    iconTheme: 'cupertino',
    sessionIcons: 'modern'
  },
  {
    id: 'atelier',
    name: 'Atelier',
    description: 'Consola refinada con IBM Plex, pestañas subrayadas y terminal One Dark',
    icon: '✦',
    ui: 'Atelier',
    layout: 'atelier',
    tabTheme: 'default',
    tabLayout: 'underline',
    terminal: 'One Dark',
    status: 'One Dark',
    uiFont: 'IBM Plex Sans',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'cupertino',
    sessionIcons: 'glyphs',
    actionBar: 'outline'
  },
  {
    id: 'ion-storm',
    name: 'Ion Storm',
    description: 'Interfaz eléctrica con Inter, Victor Mono y lluvia esmeralda en todos los terminales',
    icon: '⚡',
    ui: 'Ion Storm UI',
    layout: 'cyberpunk',
    tabTheme: 'ionStorm',
    tabLayout: 'retroTerminal',
    terminal: 'Emerald Rain Animated',
    status: 'Hologram Emerald',
    statusIcon: 'neon',
    uiFont: 'Inter',
    monoFont: 'Victor Mono',
    iconTheme: 'neon',
    sessionIcons: 'neon',
    actionBar: 'neon'
  },
  {
    id: 'default-dark',
    name: 'Default Dark',
    description: 'Oscuro clásico con Inter, JetBrains Mono y terminal Default Dark',
    icon: '🌑',
    ui: 'Dark',
    layout: 'default',
    tabTheme: 'uiDark',
    tabLayout: 'compact',
    terminal: 'Default Dark',
    status: 'Default Dark',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'ghost_ui',
    sessionIcons: 'minimal',
    actionBar: 'minimal'
  },
  {
    id: 'dracula',
    name: 'Dracula',
    description: 'Dracula de punta a punta: interfaz, pestañas, terminal y explorador',
    icon: '🧛',
    ui: 'Dracula',
    layout: 'default',
    tabTheme: 'uiDracula',
    tabLayout: 'vscode',
    terminal: 'Dracula',
    status: 'Dracula',
    uiFont: 'Inter',
    monoFont: 'Fira Code',
    iconTheme: 'dracula',
    sessionIcons: 'filled'
  },
  {
    id: 'nord',
    name: 'Nord',
    description: 'Nord frío con Source Sans 3, pestañas uiNord y árbol frost',
    icon: '❄️',
    ui: 'Nord',
    layout: 'unified',
    tabTheme: 'uiNord',
    tabLayout: 'underline',
    terminal: 'Nord',
    status: 'Nord',
    uiFont: 'Source Sans 3',
    monoFont: 'JetBrains Mono',
    iconTheme: 'nord',
    tree: 'frost',
    sessionIcons: 'modern'
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night',
    description: 'Noche de Tokio con Geist, pestañas uiTokyoNight y terminal a juego',
    icon: '🏙️',
    ui: 'Tokyo Night',
    layout: 'mux',
    tabTheme: 'uiTokyoNight',
    tabLayout: 'vscode',
    terminal: 'Tokyo Night',
    status: 'Tokyo Night',
    uiFont: 'Geist',
    monoFont: 'Geist Mono',
    iconTheme: 'tokyonight',
    sessionIcons: 'modern'
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    description: 'Neón de alto contraste con Share Tech Mono y terminal Cyberpunk estático',
    icon: '🤖',
    ui: 'Pro Cobalt',
    layout: 'cyberpunk',
    tabTheme: 'uiCyberpunk',
    tabLayout: 'retroTerminal',
    terminal: 'Cyberpunk',
    status: 'Cyberpunk',
    statusIcon: 'neon',
    uiFont: 'Inter',
    monoFont: 'Share Tech Mono',
    iconTheme: 'cyber_blue',
    sessionIcons: 'cyberpunk',
    actionBar: 'neon'
  },
  {
    id: 'cyberpunk-light',
    name: 'Cyberpunk Light',
    description: 'Ámbar solar con Plus Jakarta Sans y terminal Hologram Amber',
    icon: '⭐',
    ui: 'Pro Solar Amber',
    layout: 'cyberpunk',
    tabTheme: 'default',
    tabLayout: 'boxed',
    terminal: 'Hologram Amber',
    status: 'Pro Solar Amber',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    iconTheme: 'cyber_blue',
    sessionIcons: 'modern'
  },
  {
    id: 'night-owl',
    name: 'Night Owl',
    description: 'Nocturno para sesiones largas, con Inter y terminal Night Owl en todos los shells',
    icon: '🦉',
    ui: 'Night Owl',
    layout: 'studio',
    tabTheme: 'default',
    tabLayout: 'vscode',
    terminal: 'Night Owl',
    status: 'Night Owl',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'vscode',
    sessionIcons: 'minimal'
  },
  {
    id: 'everforest',
    name: 'Everforest',
    description: 'Bosque suave con Source Sans 3, terminal Zenburn y status Pro Everforest',
    icon: '🌲',
    ui: 'Pro Everforest',
    layout: 'atelier',
    tabTheme: 'default',
    tabLayout: 'underline',
    terminal: 'Zenburn',
    status: 'Pro Everforest',
    uiFont: 'Source Sans 3',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'forest',
    sessionIcons: 'glyphs'
  },
  {
    id: 'catppuccin',
    name: 'Catppuccin',
    description: 'Malva moderno con Plus Jakarta Sans, píldoras Arc y terminal Palenight',
    icon: '🧋',
    ui: 'Pro Catppuccin',
    layout: 'mux',
    tabTheme: 'default',
    tabLayout: 'arcPills',
    terminal: 'Palenight',
    status: 'Pro Catppuccin',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    iconTheme: 'palenight',
    sessionIcons: 'modern'
  },
  {
    id: 'rose-pine',
    name: 'Rosé Pine',
    description: 'Rosé Pine en Atelier, con IBM Plex y terminal Palenight',
    icon: '🌹',
    ui: 'Pro Rosé Pine',
    layout: 'atelier',
    tabTheme: 'default',
    tabLayout: 'underline',
    terminal: 'Palenight',
    status: 'Pro Rosé Pine',
    uiFont: 'Source Sans 3',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'palenight',
    sessionIcons: 'glyphs'
  },
  {
    id: 'emerald',
    name: 'Emerald',
    description: 'Esmeralda estática con Inter, Fira Code y status Pro Emerald',
    icon: '💚',
    ui: 'Pro Emerald',
    layout: 'studio',
    tabTheme: 'default',
    tabLayout: 'boxed',
    terminal: 'Hologram Emerald',
    status: 'Pro Emerald',
    uiFont: 'Inter',
    monoFont: 'Fira Code',
    iconTheme: 'forest',
    sessionIcons: 'modern'
  },
  {
    id: 'sakura',
    name: 'Sakura',
    description: 'Islas con cerezos animados en todos los terminales y blur suave en el inicio',
    icon: '🌸',
    ui: 'Pro Sakura',
    layout: 'islas',
    tabTheme: 'default',
    tabLayout: 'arcPills',
    terminal: 'Cherry Blossoms Animated',
    status: 'Pro Sakura',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    iconTheme: 'sunset',
    sessionIcons: 'rounded',
    blur: '8'
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    description: 'Luz de luna con Geist, pestañas minimal y terminal Tokyo Night',
    icon: '🌙',
    ui: 'Pro Moonlight',
    layout: 'mux',
    tabTheme: 'default',
    tabLayout: 'minimal',
    terminal: 'Tokyo Night',
    status: 'Pro Moonlight',
    uiFont: 'Geist',
    monoFont: 'Geist Mono',
    iconTheme: 'obsidian_glass',
    sessionIcons: 'minimal'
  },
  {
    id: 'magma',
    name: 'Magma',
    description: 'Calor carmesí con pestañas de fuego y terminal Hologram Crimson',
    icon: '🔥',
    ui: 'Pro Magma',
    layout: 'cyberpunk',
    tabTheme: 'fire',
    tabLayout: 'boxed',
    terminal: 'Hologram Crimson',
    status: 'Hologram Crimson',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'fire',
    sessionIcons: 'vibrant'
  },
  {
    id: 'oceanic',
    name: 'Oceanic',
    description: 'Muelle con Source Sans 3, pestañas Oceanic Next y terminal a juego',
    icon: '🐚',
    ui: 'Pro Oceanic',
    layout: 'dock',
    tabTheme: 'uiOceanicNext',
    tabLayout: 'spacious',
    terminal: 'Oceanic Next',
    status: 'Pro Oceanic',
    uiFont: 'Source Sans 3',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'ocean',
    sessionIcons: 'glyphs'
  },
  {
    id: 'papel',
    name: 'Papel',
    description: 'Claro de papel con Inter, pestañas uiLight y terminal GitHub',
    icon: '📄',
    ui: 'Light',
    layout: 'unified-rounded',
    tabTheme: 'uiLight',
    tabLayout: 'underline',
    terminal: 'GitHub',
    status: 'GitHub',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'material',
    tree: 'minimal',
    sessionIcons: 'minimal',
    actionBar: 'minimal'
  },
  {
    id: 'atelier-light',
    name: 'Atelier Light',
    description: 'Atelier en claro con IBM Plex y terminal GitHub',
    icon: '✧',
    ui: 'Atelier Light',
    layout: 'atelier',
    tabTheme: 'default',
    tabLayout: 'underline',
    terminal: 'GitHub',
    status: 'Default Light',
    uiFont: 'IBM Plex Sans',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'cupertino',
    sessionIcons: 'glyphs',
    actionBar: 'outline'
  },
  {
    id: 'mux-light',
    name: 'Mux Light',
    description: 'Mux en claro con Geist y terminal GitHub',
    icon: '▢',
    ui: 'Mux Light',
    layout: 'mux',
    tabTheme: 'default',
    tabLayout: 'vscode',
    terminal: 'GitHub',
    status: 'GitHub',
    uiFont: 'Geist',
    monoFont: 'Geist Mono',
    iconTheme: 'cupertino',
    sessionIcons: 'modern'
  },
  {
    id: 'menta',
    name: 'Menta',
    description: 'Menta clara en islas, con Plus Jakarta Sans y terminal Arctic',
    icon: '🍃',
    ui: 'Soft Mint',
    layout: 'islas',
    tabTheme: 'default',
    tabLayout: 'arcPills',
    terminal: 'Arctic',
    status: 'Arctic',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    iconTheme: 'material',
    sessionIcons: 'fluent',
    blur: '8'
  },
  {
    id: 'calido',
    name: 'Cálido',
    description: 'Beige cálido con Source Sans 3 y terminal Solarized Light',
    icon: '🫖',
    ui: 'Warm Beige',
    layout: 'atelier',
    tabTheme: 'default',
    tabLayout: 'classicBrowser',
    terminal: 'Solarized Light',
    status: 'Solarized Light',
    uiFont: 'Source Sans 3',
    monoFont: 'IBM Plex Mono',
    iconTheme: 'solarized',
    sessionIcons: 'glyphs',
    actionBar: 'outline'
  },
  {
    id: 'solarized',
    name: 'Solarized',
    description: 'Solarized Light completo: interfaz, pestañas, terminal y explorador',
    icon: '☼',
    ui: 'Solarized Light',
    layout: 'unified',
    tabTheme: 'uiSolarizedLight',
    tabLayout: 'underline',
    terminal: 'Solarized Light',
    status: 'Solarized Light',
    uiFont: 'Source Sans 3',
    monoFont: 'Source Code Pro',
    iconTheme: 'solarized',
    sessionIcons: 'solar',
    actionBar: 'outline'
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Pizarra de estudio con Geist, pestañas Pro Slate y terminal One Dark',
    icon: '▤',
    ui: 'Pro Slate',
    layout: 'studio',
    tabTheme: 'proSlate',
    tabLayout: 'compact',
    terminal: 'One Dark',
    status: 'One Dark',
    uiFont: 'Geist',
    monoFont: 'Geist Mono',
    iconTheme: 'vscode',
    sessionIcons: 'studio'
  },
  {
    id: 'indigo',
    name: 'Indigo',
    description: 'Índigo redondeado con Plus Jakarta Sans y terminal Palenight',
    icon: '🔷',
    ui: 'Pro Indigo',
    layout: 'unified-rounded',
    tabTheme: 'default',
    tabLayout: 'arcPills',
    terminal: 'Palenight',
    status: 'Palenight',
    uiFont: 'Plus Jakarta Sans',
    monoFont: 'JetBrains Mono',
    iconTheme: 'palenight',
    sessionIcons: 'modern'
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Grafito de tablero con Inter, pestañas minimal y terminal One Dark',
    icon: '⬛',
    ui: 'Graphite',
    layout: 'tablero',
    tabTheme: 'default',
    tabLayout: 'minimal',
    terminal: 'One Dark',
    status: 'One Dark',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'fluent',
    sessionIcons: 'fluent',
    actionBar: 'minimal'
  },
  {
    id: 'medianoche',
    name: 'Medianoche',
    description: 'Azul de medianoche en dock, con Inter y terminal Cobalt2',
    icon: '🌃',
    ui: 'Midnight Blue',
    layout: 'dock',
    tabTheme: 'default',
    tabLayout: 'vscode',
    terminal: 'Cobalt2',
    status: 'Tokyo Night',
    uiFont: 'Inter',
    monoFont: 'JetBrains Mono',
    iconTheme: 'vscode',
    sessionIcons: 'modern'
  }
];

export const builtinPresets = presetSpecs.map(definePreset);
