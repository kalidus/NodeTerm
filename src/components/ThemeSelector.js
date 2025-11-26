import React, { useState, useEffect } from 'react';
import { Checkbox } from 'primereact/checkbox';
import { themeManager } from '../utils/themeManager';
import { uiThemes, CLASSIC_UI_KEYS, FUTURISTIC_UI_KEYS, MODERN_UI_KEYS, ANIMATED_UI_KEYS, NATURE_UI_KEYS } from '../themes/ui-themes';
import '../styles/components/theme-selector.css';

const ANIM_SPEED_KEY = 'nodeterm_ui_anim_speed';
const REDUCED_MOTION_KEY = 'nodeterm_ui_reduced_motion';

// Definición de categorías
const CATEGORIES = [
  { id: 'classic', name: 'Clásicos', icon: '🎨', keys: CLASSIC_UI_KEYS },
  { id: 'futuristic', name: 'Futuristas', icon: '🚀', keys: FUTURISTIC_UI_KEYS },
  { id: 'modern', name: 'Modernos', icon: '✨', keys: MODERN_UI_KEYS },
  { id: 'animated', name: 'Animados', icon: '🎬', keys: ANIMATED_UI_KEYS },
  { id: 'nature', name: 'Naturaleza', icon: '🌿', keys: NATURE_UI_KEYS }
];

const ThemeSelector = ({ showPreview = false }) => {
  const [currentTheme, setCurrentTheme] = useState('Light');
  const [usePrimaryColorsForTitlebar, setUsePrimaryColorsForTitlebar] = useState(false);
  const [animSpeed, setAnimSpeed] = useState('normal');
  const [reducedMotion, setReducedMotion] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('classic');

  useEffect(() => {
    // Cargar el tema actual
    const savedTheme = localStorage.getItem('ui_theme') || 'Light';
    setCurrentTheme(savedTheme);
    
    // Cargar la preferencia de colores primarios para titlebar
    const savedTitlebarPreference = localStorage.getItem('use_primary_colors_titlebar') === 'true';
    setUsePrimaryColorsForTitlebar(savedTitlebarPreference);
    
    // Cargar preferencias de animación
    const savedSpeed = localStorage.getItem(ANIM_SPEED_KEY) || 'normal';
    setAnimSpeed(savedSpeed);
    if (!document.documentElement.hasAttribute('data-ui-anim-speed')) {
      document.documentElement.setAttribute('data-ui-anim-speed', savedSpeed);
    }
    
    // Reduced motion inicial
    const savedReduced = localStorage.getItem(REDUCED_MOTION_KEY);
    let initialReduced = false;
    if (savedReduced === 'true' || savedReduced === 'false') {
      initialReduced = savedReduced === 'true';
    } else if (window.matchMedia) {
      initialReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    setReducedMotion(initialReduced);
    document.documentElement.setAttribute('data-ui-reduced-motion', initialReduced ? 'true' : 'false');

    // Detectar categoría del tema actual
    detectCategoryForTheme(savedTheme);
  }, []);

  const detectCategoryForTheme = (themeName) => {
    for (const category of CATEGORIES) {
      const hasTheme = category.keys.some(key => uiThemes[key]?.name === themeName);
      if (hasTheme) {
        setSelectedCategory(category.id);
        break;
      }
    }
  };

  const handleThemeChange = (themeName) => {
    setCurrentTheme(themeName);
    themeManager.applyTheme(themeName);
  };

  const handleTitlebarColorPreferenceChange = (usePrimary) => {
    setUsePrimaryColorsForTitlebar(usePrimary);
    localStorage.setItem('use_primary_colors_titlebar', usePrimary.toString());
    themeManager.applyTheme(currentTheme);
  };

  const handleAnimSpeedChange = (e) => {
    const speed = e.target.value;
    setAnimSpeed(speed);
    localStorage.setItem(ANIM_SPEED_KEY, speed);
    document.documentElement.setAttribute('data-ui-anim-speed', speed);
  };

  const handleReducedMotionToggle = (e) => {
    const reduced = e.target.checked;
    setReducedMotion(reduced);
    localStorage.setItem(REDUCED_MOTION_KEY, reduced.toString());
    document.documentElement.setAttribute('data-ui-reduced-motion', reduced ? 'true' : 'false');
  };

  // Obtener temas de la categoría seleccionada
  const getCurrentCategoryThemes = () => {
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    if (!category) return [];
    return category.keys.filter(key => uiThemes[key]).map(key => uiThemes[key]);
  };

  const getCurrentCategoryName = () => {
    const category = CATEGORIES.find(c => c.id === selectedCategory);
    return category ? category.name : '';
  };

  // Componente ThemeCard compacto
  const ThemeCardCompact = ({ theme, isActive, onClick }) => {
    const colors = theme.colors;
    
    return (
      <div 
        className={`theme-card-compact ${isActive ? 'active' : ''}`}
        onClick={onClick}
      >
        {isActive && (
          <div className="theme-card-active-badge">
            <i className="pi pi-check"></i>
            Activo
          </div>
        )}

        {/* Preview del tema */}
        <div className="theme-card-preview">
          {/* Menubar */}
          <div 
            className="theme-preview-menubar"
            style={{
              background: colors.menuBarBackground,
              color: colors.menuBarText,
              borderColor: colors.menuBarBorder
            }}
          >
            <span className="theme-preview-menubar-icons">🏠 📁 ⚙️</span>
            <span className="theme-preview-menubar-title">NodeTerm</span>
          </div>

          {/* Main area */}
          <div className="theme-preview-main">
            {/* Sidebar */}
            <div 
              className="theme-preview-sidebar"
              style={{
                background: colors.sidebarBackground,
                color: colors.sidebarText,
                borderColor: colors.sidebarBorder
              }}
            >
              <div 
                className="theme-preview-sidebar-item"
                style={{ background: colors.sidebarSelected }}
              >
                📁 Projects
              </div>
              <div className="theme-preview-sidebar-item">🖥️ SSH-1</div>
              <div className="theme-preview-sidebar-item">🖥️ SSH-2</div>
            </div>

            {/* Content */}
            <div className="theme-preview-content-area">
              {/* Tabs */}
              <div 
                className="theme-preview-tabs"
                style={{
                  background: colors.tabBackground,
                  borderColor: colors.tabBorder
                }}
              >
                <div 
                  className="theme-preview-tab active"
                  style={{
                    background: colors.tabActiveBackground,
                    color: colors.tabActiveText,
                    borderColor: colors.tabBorder
                  }}
                >
                  Terminal
                </div>
                <div 
                  className="theme-preview-tab"
                  style={{
                    color: colors.tabText
                  }}
                >
                  Explorer
                </div>
              </div>

              {/* Terminal content */}
              <div 
                className="theme-preview-terminal"
                style={{
                  background: colors.contentBackground,
                  color: colors.dialogText
                }}
              >
                <div 
                  className="theme-preview-prompt"
                  style={{ color: colors.buttonPrimary }}
                >
                  user@server:~$
                </div>
                <div style={{ opacity: 0.8 }}>Welcome to {theme.name}</div>
                <div style={{ opacity: 0.6 }}>ls -la</div>
              </div>
            </div>
          </div>

          {/* Statusbar */}
          <div 
            className="theme-preview-statusbar"
            style={{
              background: colors.statusBarBackground,
              color: colors.statusBarText,
              borderColor: colors.statusBarBorder
            }}
          >
            <span>✓ Connected</span>
            <span>{theme.name}</span>
          </div>
        </div>

        {/* Info */}
        <div className="theme-card-info">
          <span className="theme-card-name">{theme.name}</span>
          <div className="theme-card-palette">
            {[
              colors.sidebarBackground,
              colors.contentBackground,
              colors.buttonPrimary,
              colors.tabActiveBackground
            ].map((color, index) => (
              <div
                key={index}
                className="theme-palette-dot"
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const themes = getCurrentCategoryThemes();

  return (
    <div className="theme-selector-container">
      {/* Panel Lateral */}
      <div className="theme-selector-sidebar">
        {/* Header */}
        <div className="theme-sidebar-header">
          <h3 className="theme-sidebar-title">
            <i className="pi pi-palette theme-sidebar-title-icon"></i>
            Temas de Interfaz
          </h3>
          <p className="theme-sidebar-subtitle">
            Personaliza la apariencia de tu entorno de trabajo
          </p>
        </div>

        {/* Categorías */}
        <div className="theme-categories-section">
          <div className="theme-section-label">
            <i className="pi pi-folder"></i>
            Categorías
          </div>
          <div className="theme-category-list">
            {CATEGORIES.map(category => {
              const count = category.keys.filter(key => uiThemes[key]).length;
              return (
                <div
                  key={category.id}
                  className={`theme-category-item ${selectedCategory === category.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <div className="theme-category-info">
                    <span className="theme-category-icon">{category.icon}</span>
                    <span className="theme-category-name">{category.name}</span>
                  </div>
                  <span className="theme-category-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Configuración */}
        <div className="theme-config-section">
          <div className="theme-section-label">
            <i className="pi pi-cog"></i>
            Configuración
          </div>

          {/* Card: Titlebar */}
          <div className="theme-config-card">
            <div className="theme-config-header">
              <div className="theme-config-icon">
                <i className="pi pi-window-maximize"></i>
              </div>
              <span className="theme-config-title">Barra de Título</span>
            </div>
            <div className="theme-config-content">
              <div 
                className="theme-config-option"
                onClick={() => handleTitlebarColorPreferenceChange(!usePrimaryColorsForTitlebar)}
              >
                <div className="theme-config-option-info">
                  <label className="theme-config-option-label">
                    Usar colores del tema
                  </label>
                  <span className="theme-config-option-desc">
                    Aplica los colores primarios a la titlebar
                  </span>
                </div>
                <Checkbox
                  checked={usePrimaryColorsForTitlebar}
                  onChange={(e) => handleTitlebarColorPreferenceChange(e.checked)}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          </div>

          {/* Card: Animaciones */}
          <div className="theme-config-card">
            <div className="theme-config-header">
              <div className="theme-config-icon">
                <i className="pi pi-bolt"></i>
              </div>
              <span className="theme-config-title">Animaciones</span>
            </div>
            <div className="theme-config-content">
              <div 
                className="theme-config-option"
                onClick={() => handleReducedMotionToggle({ target: { checked: !reducedMotion } })}
              >
                <div className="theme-config-option-info">
                  <label className="theme-config-option-label">
                    Reducir movimiento
                  </label>
                  <span className="theme-config-option-desc">
                    Minimiza las animaciones
                  </span>
                </div>
                <Checkbox
                  checked={reducedMotion}
                  onChange={handleReducedMotionToggle}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <div className="theme-config-dropdown">
                <span className="theme-config-dropdown-label">Velocidad:</span>
                <select 
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
      </div>

      {/* Panel Principal */}
      <div className="theme-selector-main">
        {/* Header */}
        <div className="theme-main-header">
          <div className="theme-main-title">
            Temas <span className="theme-main-title-category">{getCurrentCategoryName()}</span>
          </div>
          <span className="theme-count-badge">{themes.length} temas</span>
        </div>

        {/* Grid de temas */}
        <div className="theme-grid-container">
          <div className="theme-grid">
            {themes.map((theme) => (
              <ThemeCardCompact
                key={theme.name}
                theme={theme}
                isActive={currentTheme === theme.name}
                onClick={() => handleThemeChange(theme.name)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThemeSelector;
