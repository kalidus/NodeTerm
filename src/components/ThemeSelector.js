import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { themeManager, getTitlebarColorConfig } from '../utils/themeManager';
import { uiThemes, CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS, ANIMATED_UI_KEYS, NATURE_UI_KEYS } from '../themes/ui-themes';
import '../styles/components/theme-selector.css';

const ANIM_SPEED_KEY = 'nodeterm_ui_anim_speed';
const REDUCED_MOTION_KEY = 'nodeterm_ui_reduced_motion';
const THEMES_PER_ROW_KEY = 'nodeterm_themes_per_row';
const TITLEBAR_COLOR_KEY = 'custom_titlebar_color';
const LEGACY_TITLEBAR_KEY = 'use_primary_colors_titlebar';

// Definición de categorías
const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: '🎯', keys: [...CLASSIC_UI_KEYS, ...FUTURISTIC_UI_KEYS, ...MODERN_UI_KEYS, ...ANIMATED_UI_KEYS, ...NATURE_UI_KEYS] },
  { id: 'classic', name: 'Clásicos', icon: '🎨', keys: CLASSIC_UI_KEYS },
  { id: 'futuristic', name: 'Futuristas', icon: '🚀', keys: FUTURISTIC_UI_KEYS },
  { id: 'modern', name: 'Modernos', icon: '✨', keys: MODERN_UI_KEYS },
  { id: 'animated', name: 'Animados', icon: '🎬', keys: ANIMATED_UI_KEYS },
  { id: 'nature', name: 'Naturaleza', icon: '🌿', keys: NATURE_UI_KEYS }
];

// Descripciones de temas
const THEME_DESCRIPTIONS = {
  'Light': 'Tema claro y limpio, ideal para ambientes bien iluminados',
  'Dark': 'Tema oscuro elegante para reducir fatiga visual',
  'Solarized Light': 'Paleta Solarized clara, equilibrada y suave',
  'Solarized Dark': 'Paleta Solarized oscura, fácil para los ojos',
  'Dracula': 'Colores vibrantes sobre fondo oscuro púrpura',
  'Monokai': 'Inspirado en el clásico tema de Sublime Text',
  'Gruvbox Dark': 'Tonos retro cálidos sobre fondo oscuro',
  'Nord': 'Paleta ártica fría y minimalista',
  'One Dark': 'Inspirado en Atom, moderno y profesional',
  'Pro Cyberpunk': 'Estética neón futurista de alto contraste',
  'Pro Aurora': 'Tonos polares suaves y relajantes',
  'Pro Cosmic': 'Vastedad espacial con acentos estelares premium',
  'Pro Emerald': 'Elegancia orgánica en verde esmeralda profundo',
  'Pro Sakura': 'Sofisticación inspirada en los cerezos japoneses',
  'Pro Autumn': 'Calidez otoñal profesional y reconfortante',
  'Pro Cobalt': 'Azul real profundo con acentos oro, un clásico refinado',
  'Pro Moonlight': 'Azul grisáceo minimalista para sesiones nocturnas',
  'Pro Oceanic': 'Balance perfecto de verde azulado y tonos coral',
  'Pro Everforest': 'Verde bosque orgánico y sereno para enfoque total',
  'Pro Minty': 'Frescura digital con acentos menta sobre carbón',
  'Pro Mirage': 'Gris cálido técnico con acentos naranja vibrante',
  'Pro Solar Amber': 'Confort visual en tonos ámbar y miel vintage',
  'Pro Magma': 'Potencia visual con rojo lava y naranja quemado',
  'Pro Catppuccin': 'Paleta pastel reconfortante, tendencia en la comunidad',
  'Pro Rosé Pine': 'Estética minimalista y zen con tonos lavanda',
  'default': 'Un tema personalizado para tu terminal'
};

const ThemeSelector = ({ showPreview = false }) => {
  const [currentTheme, setCurrentTheme] = useState('Light');
  const [customTitlebarColor, setCustomTitlebarColor] = useState(null);
  const [animSpeed, setAnimSpeed] = useState('normal');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [themesPerRow, setThemesPerRow] = useState(4);

  useEffect(() => {
    const savedTheme = localStorage.getItem('ui_theme') || 'Light';
    setCurrentTheme(savedTheme);

    let savedTitlebarColor = localStorage.getItem(TITLEBAR_COLOR_KEY);
    if (!savedTitlebarColor && localStorage.getItem(LEGACY_TITLEBAR_KEY) === 'true') {
      const themeColors = uiThemes[savedTheme]?.colors;
      if (themeColors) {
        savedTitlebarColor = getTitlebarColorConfig(themeColors).accent;
        localStorage.setItem(TITLEBAR_COLOR_KEY, savedTitlebarColor);
        localStorage.removeItem(LEGACY_TITLEBAR_KEY);
      }
    }
    setCustomTitlebarColor(savedTitlebarColor || null);

    const savedSpeed = localStorage.getItem(ANIM_SPEED_KEY) || 'normal';
    setAnimSpeed(savedSpeed);
    if (!document.documentElement.hasAttribute('data-ui-anim-speed')) {
      document.documentElement.setAttribute('data-ui-anim-speed', savedSpeed);
    }

    const savedReduced = localStorage.getItem(REDUCED_MOTION_KEY);
    let initialReduced = false;
    if (savedReduced === 'true' || savedReduced === 'false') {
      initialReduced = savedReduced === 'true';
    } else if (window.matchMedia) {
      initialReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    setReducedMotion(initialReduced);
    document.documentElement.setAttribute('data-ui-reduced-motion', initialReduced ? 'true' : 'false');

    const savedThemesPerRow = localStorage.getItem(THEMES_PER_ROW_KEY);
    if (savedThemesPerRow) {
      const parsed = parseInt(savedThemesPerRow, 10);
      if ([2, 4, 6, 8].includes(parsed)) {
        setThemesPerRow(parsed);
      } else {
        setThemesPerRow(4);
      }
    } else {
      setThemesPerRow(4);
    }
  }, []);

  useEffect(() => {
    const syncTitlebarColorState = () => {
      setCustomTitlebarColor(localStorage.getItem(TITLEBAR_COLOR_KEY) || null);
    };
    window.addEventListener('theme-changed', syncTitlebarColorState);
    return () => window.removeEventListener('theme-changed', syncTitlebarColorState);
  }, []);

  const handleThemeChange = useCallback((themeName) => {
    setCurrentTheme(themeName);
    setCustomTitlebarColor(null);
    themeManager.applyTheme(themeName);
  }, []);

  const handleTitlebarColorChange = useCallback((e) => {
    const color = e.target.value;
    setCustomTitlebarColor(color);
    localStorage.setItem(TITLEBAR_COLOR_KEY, color);
    localStorage.removeItem(LEGACY_TITLEBAR_KEY);
    themeManager.applyTitlebarColors(localStorage.getItem('ui_theme') || currentTheme);
  }, [currentTheme]);

  const handleTitlebarColorReset = useCallback((e) => {
    e.stopPropagation();
    setCustomTitlebarColor(null);
    localStorage.removeItem(TITLEBAR_COLOR_KEY);
    localStorage.removeItem(LEGACY_TITLEBAR_KEY);
    themeManager.applyTitlebarColors(localStorage.getItem('ui_theme') || currentTheme);
    themeManager.applyTheme(localStorage.getItem('ui_theme') || currentTheme);
  }, [currentTheme]);

  const handleAnimSpeedChange = useCallback((e) => {
    const speed = e.target.value;
    setAnimSpeed(speed);
    localStorage.setItem(ANIM_SPEED_KEY, speed);
    document.documentElement.setAttribute('data-ui-anim-speed', speed);
  }, []);

  const handleReducedMotionToggle = useCallback(() => {
    const newValue = !reducedMotion;
    setReducedMotion(newValue);
    localStorage.setItem(REDUCED_MOTION_KEY, newValue.toString());
    document.documentElement.setAttribute('data-ui-reduced-motion', newValue ? 'true' : 'false');
  }, [reducedMotion]);

  const handleThemesPerRowToggle = useCallback(() => {
    const options = [2, 4, 6, 8];
    const currentIndex = options.indexOf(themesPerRow);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextValue = options[nextIndex];
    setThemesPerRow(nextValue);
    localStorage.setItem(THEMES_PER_ROW_KEY, nextValue.toString());
  }, [themesPerRow]);

  // Obtener tema actual (memoizado)
  const activeTheme = useMemo(() => {
    for (const category of CATEGORIES) {
      for (const key of category.keys) {
        if (uiThemes[key]?.name === currentTheme) {
          return uiThemes[key];
        }
      }
    }
    return uiThemes[CLASSIC_UI_KEYS[0]];
  }, [currentTheme]);

  const displayTitlebarColor = useMemo(() => {
    if (customTitlebarColor) return customTitlebarColor;
    return getTitlebarColorConfig(activeTheme.colors).accent;
  }, [customTitlebarColor, activeTheme]);

  // Obtener temas filtrados (memoizado para evitar recálculos durante resize)
  const themes = useMemo(() => {
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return [];
    return category.keys
      .filter(key => uiThemes[key])
      .map(key => uiThemes[key]);
  }, [selectedCategory]);

  // Preview del tema hero (grande) - Memoizado para evitar re-renders innecesarios
  const HeroPreview = memo(({ theme }) => {
    const colors = theme.colors;
    return (
      <div className="theme-hero-preview">
        <div
          className="theme-hero-menubar"
          style={{ background: colors.menuBarBackground, color: colors.menuBarText }}
        >
          <span className="theme-hero-menubar-icons">🏠 📁 ⚙️</span>
          <span className="theme-hero-menubar-title">NodeTerm</span>
        </div>
        <div className="theme-hero-main">
          <div
            className="theme-hero-sidebar"
            style={{ background: colors.sidebarBackground, color: colors.sidebarText, borderRight: `1px solid ${colors.sidebarBorder}` }}
          >
            <div className="theme-hero-sidebar-item" style={{ background: colors.sidebarSelected }}>📁 Projects</div>
            <div className="theme-hero-sidebar-item">🖥️ SSH-Server</div>
            <div className="theme-hero-sidebar-item">🖥️ Database</div>
            <div className="theme-hero-sidebar-item">📂 Config</div>
          </div>
          <div className="theme-hero-content-area">
            <div
              className="theme-hero-tabs"
              style={{ background: colors.tabBackground, borderBottom: `1px solid ${colors.tabBorder}` }}
            >
              <div
                className="theme-hero-tab active"
                style={{ background: colors.tabActiveBackground, color: colors.tabActiveText }}
              >
                Terminal
              </div>
              <div className="theme-hero-tab" style={{ color: colors.tabText }}>Explorer</div>
              <div className="theme-hero-tab" style={{ color: colors.tabText }}>Logs</div>
            </div>
            <div
              className="theme-hero-terminal"
              style={{ background: colors.contentBackground, color: colors.dialogText }}
            >
              <div style={{ color: colors.buttonPrimary, marginBottom: '4px' }}>user@server:~$</div>
              <div style={{ opacity: 0.9 }}>Welcome to {theme.name} theme</div>
              <div style={{ opacity: 0.7 }}>Last login: Today at 10:30</div>
              <div style={{ opacity: 0.6, marginTop: '4px' }}>$ ls -la</div>
            </div>
          </div>
        </div>
        <div
          className="theme-hero-statusbar"
          style={{ background: colors.statusBarBackground, color: colors.statusBarText, borderTop: `1px solid ${colors.statusBarBorder}` }}
        >
          <span>✓ Connected • SSH</span>
          <span>UTF-8 • LF</span>
        </div>
      </div>
    );
  });

  // Preview miniatura - Memoizado para evitar re-renders durante resize
  const ThumbnailPreview = memo(({ theme }) => {
    const colors = theme.colors;
    return (
      <div className="theme-thumbnail-preview">
        <div
          className="theme-thumbnail-menubar"
          style={{ background: colors.menuBarBackground, color: colors.menuBarText }}
        >
          🏠📁⚙️ NodeTerm
        </div>
        <div className="theme-thumbnail-main">
          <div
            className="theme-thumbnail-sidebar"
            style={{ background: colors.sidebarBackground, color: colors.sidebarText }}
          >
            <div className="theme-thumbnail-sidebar-item" style={{ background: colors.sidebarSelected }}>📁 Proj</div>
            <div className="theme-thumbnail-sidebar-item">🖥️ SSH</div>
          </div>
          <div className="theme-thumbnail-content">
            <div
              className="theme-thumbnail-tabs"
              style={{ background: colors.tabBackground }}
            >
              <div
                className="theme-thumbnail-tab"
                style={{ background: colors.tabActiveBackground, color: colors.tabActiveText }}
              >
                Term
              </div>
            </div>
            <div
              className="theme-thumbnail-terminal"
              style={{ background: colors.contentBackground, color: colors.dialogText }}
            >
              <span style={{ color: colors.buttonPrimary }}>$</span> ls
            </div>
          </div>
        </div>
        <div
          className="theme-thumbnail-statusbar"
          style={{ background: colors.statusBarBackground, color: colors.statusBarText }}
        >
          <span>✓</span>
          <span>{theme.name}</span>
        </div>
      </div>
    );
  });

  // Componente memoizado para las tarjetas de tema - Evita re-renders durante resize
  const ThemeThumbnailCard = memo(({ theme, isActive, onSelect }) => {
    return (
      <div
        className={`theme-thumbnail ${isActive ? 'active' : ''}`}
        onClick={onSelect}
      >
        {isActive && (
          <div className="theme-thumbnail-check">
            <i className="pi pi-check"></i>
          </div>
        )}

        <ThumbnailPreview theme={theme} />

        <div className="theme-thumbnail-info">
          <span className="theme-thumbnail-name">{theme.name}</span>
          <div className="theme-thumbnail-palette">
            {[
              theme.colors.sidebarBackground,
              theme.colors.buttonPrimary,
              theme.colors.contentBackground
            ].map((color, index) => (
              <div
                key={index}
                className="theme-thumbnail-dot"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }, (prevProps, nextProps) => {
    // Comparación personalizada: solo re-renderizar si cambia el tema activo o el tema mismo
    return prevProps.isActive === nextProps.isActive &&
      prevProps.theme.name === nextProps.theme.name;
  });

  return (
    <div className="theme-selector-container">
      {/* Hero Section - Tema Activo */}
      <div className="theme-hero-section">
        <div className="theme-hero-content">
          <HeroPreview theme={activeTheme} />

          <div className="theme-hero-info">
            {/* Panel de opciones a la derecha */}
            <div className="theme-options-wrapper">
              {/* Card de Animaciones */}
              <div className="theme-anim-card">
                <div className="theme-anim-card-header">
                  <span className="theme-anim-card-title">🎬 Animaciones</span>
                  <span
                    className="theme-anim-card-badge"
                    title="Muestra solo temas con animaciones activas"
                  >
                    Solo animados
                  </span>
                </div>
                <div className="theme-anim-card-options">
                  <div className="theme-anim-option-wrapper">
                    <button
                      className={`theme-anim-option ${!reducedMotion ? 'active' : ''}`}
                      onClick={handleReducedMotionToggle}
                      title={reducedMotion ? "Activa las animaciones de la interfaz" : "Desactiva las animaciones para mejorar el rendimiento y reducir distracciones"}
                    >
                      <i className="pi pi-eye-slash" style={{ width: '0.6875rem', display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}></i>
                      <span>Animaciones</span>
                      <div className={`theme-mini-toggle ${!reducedMotion ? 'on' : ''}`} style={{ marginLeft: 'auto' }}></div>
                    </button>
                  </div>
                  <div className="theme-anim-speed-wrapper">
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 500,
                      color: 'var(--ui-dialog-text)',
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      paddingLeft: '0.375rem'
                    }}>
                      <i className="pi pi-forward" style={{ fontSize: '0.6875rem', opacity: 0.7, width: '0.6875rem', display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}></i>
                      Velocidad animaciones
                    </span>
                    <div
                      className="theme-anim-speed"
                      title="Controla la velocidad de las animaciones de la interfaz"
                    >
                      <select
                        className="theme-speed-select-mini"
                        value={animSpeed}
                        onChange={handleAnimSpeedChange}
                      >
                        <option value="slow">Lento</option>
                        <option value="normal">Normal</option>
                        <option value="fast">Rápido</option>
                        <option value="turbo">Turbo</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color personalizado de la titlebar */}
              <div className="theme-titlebar-wrapper">
                <div
                  className={`theme-titlebar-btn ${customTitlebarColor ? 'active' : ''}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => document.getElementById('theme-titlebar-color-input')?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      document.getElementById('theme-titlebar-color-input')?.click();
                    }
                  }}
                  title="Elige el color de fondo de la barra de título"
                >
                  <i className="pi pi-window-maximize"></i>
                  <div className="theme-titlebar-text-container">
                    <span>Titlebar</span>
                    <span className="theme-option-hint">
                      {customTitlebarColor ? 'Color personalizado' : 'Automático (tema)'}
                    </span>
                  </div>
                  <div
                    className="theme-titlebar-controls"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {customTitlebarColor && (
                      <button
                        type="button"
                        className="theme-titlebar-reset"
                        onClick={handleTitlebarColorReset}
                        title="Volver al color automático del tema"
                        aria-label="Restablecer color de titlebar"
                      >
                        <i className="pi pi-refresh" />
                      </button>
                    )}
                    <label
                      className="theme-titlebar-color-swatch"
                      style={{ backgroundColor: displayTitlebarColor }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        id="theme-titlebar-color-input"
                        type="color"
                        value={displayTitlebarColor}
                        onChange={handleTitlebarColorChange}
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
            <div className="theme-hero-badge">
              <i className="pi pi-check"></i>
              Tema Activo
            </div>

            <h2 className="theme-hero-name">{activeTheme.name}</h2>

            <p className="theme-hero-description">
              {THEME_DESCRIPTIONS[activeTheme.name] || THEME_DESCRIPTIONS['default']}
            </p>

            <div className="theme-hero-palette">
              <span className="theme-hero-palette-label">Paleta:</span>
              <div className="theme-hero-palette-colors">
                {[
                  activeTheme.colors.sidebarBackground,
                  activeTheme.colors.contentBackground,
                  activeTheme.colors.buttonPrimary,
                  activeTheme.colors.tabActiveBackground,
                  activeTheme.colors.statusBarBackground,
                  activeTheme.colors.menuBarBackground
                ].map((color, index) => (
                  <div
                    key={index}
                    className="theme-hero-palette-dot"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección de Exploración */}
      <div className="theme-explore-section">
        <div className="theme-explore-header">
          <div className="theme-explore-title">
            <i className="pi pi-th-large"></i>
            Explorar Temas
          </div>

          <div className="theme-category-filters">
            {CATEGORIES.map(category => {
              const count = category.keys.filter(key => uiThemes[key]).length;
              return (
                <button
                  key={category.id}
                  className={`theme-category-pill ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="theme-category-pill-icon">{category.icon}</span>
                  <span>{category.name}</span>
                  <span className="theme-category-pill-count">{count}</span>
                </button>
              );
            })}
          </div>

          <button
            className="theme-per-row-btn"
            onClick={handleThemesPerRowToggle}
            title={`${themesPerRow} temas por fila. Clic para cambiar: 2 → 4 → 6 → 8 → 2...`}
          >
            <i className="pi pi-th-large"></i>
          </button>
        </div>

        <div className="theme-thumbnails-container">
          <div
            className={`theme-thumbnails-grid themes-per-row-${themesPerRow}`}
            style={{
              gridTemplateColumns: `repeat(${themesPerRow}, 1fr)`
            }}
          >
            {themes.map((theme) => (
              <ThemeThumbnailCard
                key={theme.name}
                theme={theme}
                isActive={currentTheme === theme.name}
                onSelect={() => handleThemeChange(theme.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
