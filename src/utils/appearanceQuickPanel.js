import { themeManager } from './themeManager';
import { uiThemes } from '../themes/ui-themes';
import { presetManager } from './presetManager';
import { applyTabTheme, getTabThemeList, applyTabLayout, getTabLayoutList } from './tabThemeLoader';

const TAB_THEME_STORAGE_KEY = 'nodeterm_tab_theme';
const TAB_LAYOUT_STORAGE_KEY = 'nodeterm_tab_layout';

export function openAppearanceQuickPanel(anchorEl, deps = {}) {
  const {
    titleBarCollapsedRef,
    mainFrameHeaderCollapsedRef,
    isMinimalModeRef,
    setMainFrameHeaderCollapsed,
  } = deps;
  if (!anchorEl) return;
  const existingPanel = document.getElementById('tab-appearance-quick-panel');
  if (existingPanel) {
    existingPanel.remove();
    return;
  }
  const rect = anchorEl.getBoundingClientRect();
  const currentTheme = localStorage.getItem(TAB_THEME_STORAGE_KEY) || 'default';
  const currentLayout = localStorage.getItem(TAB_LAYOUT_STORAGE_KEY) || 'default';
  const themeList = getTabThemeList();
  const layoutList = getTabLayoutList();

  const panel = document.createElement('div');
  panel.id = 'tab-appearance-quick-panel';
  panel.style.cssText = `
    position: fixed;
    right: 8px;
    top: ${rect.bottom + 4}px;
    width: 280px;
    max-height: 420px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    background: var(--ui-dialog-bg, var(--ui-card-bg, #2d2d30));
    border: 1px solid var(--ui-tab-border, rgba(255,255,255,0.12));
    border-radius: 8px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.35);
    z-index: 10000;
    font-size: 12px;
  `;

  const openedAt = Date.now();
  const closeOutside = (ev) => {
    // Evitar que el mismo click que abre el panel lo cierre al instante
    if (Date.now() - openedAt < 150) return;
    if (!panel.contains(ev.target) && !(anchorEl && anchorEl.contains(ev.target))) {
      if (panel.parentNode) panel.remove();
      document.removeEventListener('click', closeOutside);
    }
  };

  const contentArea = document.createElement('div');
  contentArea.style.cssText = 'flex: 1; overflow: auto; padding: 8px;';

  const choiceBtnStyle = (active) => `
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 12px 10px;
    margin-bottom: 6px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 13px;
    color: var(--ui-tab-text, rgba(255,255,255,0.9));
    background: ${active ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'};
    transition: background 0.15s;
  `;

  function showChoice() {
    contentArea.innerHTML = '';
    contentArea.style.padding = '8px';

    const optThemes = document.createElement('button');
    optThemes.type = 'button';
    optThemes.style.cssText = choiceBtnStyle(false);
    optThemes.innerHTML = '<i class="pi pi-palette" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Tema de pestañas</span>';
    optThemes.addEventListener('mouseenter', () => { optThemes.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
    optThemes.addEventListener('mouseleave', () => { optThemes.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
    optThemes.addEventListener('click', (ev) => { ev.stopPropagation(); showThemeList(); });

    const optLayout = document.createElement('button');
    optLayout.type = 'button';
    optLayout.style.cssText = choiceBtnStyle(false);
    optLayout.innerHTML = '<i class="pi pi-th-large" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Diseño / layout</span>';
    optLayout.addEventListener('mouseenter', () => { optLayout.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
    optLayout.addEventListener('mouseleave', () => { optLayout.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
    optLayout.addEventListener('click', (ev) => { ev.stopPropagation(); showLayoutList(); });

    const optUiTheme = document.createElement('button');
    optUiTheme.type = 'button';
    optUiTheme.style.cssText = choiceBtnStyle(false);
    optUiTheme.innerHTML = '<i class="pi pi-desktop" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Tema de apariencia</span>';
    optUiTheme.addEventListener('mouseenter', () => { optUiTheme.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
    optUiTheme.addEventListener('mouseleave', () => { optUiTheme.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
    optUiTheme.addEventListener('click', (ev) => { ev.stopPropagation(); showUiThemeList(); });

    const optPresets = document.createElement('button');
    optPresets.type = 'button';
    optPresets.style.cssText = choiceBtnStyle(false);
    optPresets.innerHTML = '<i class="pi pi-star" style="font-size: 1.1rem; opacity: 0.9;"></i><span>Presets de temas</span>';
    optPresets.addEventListener('mouseenter', () => { optPresets.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))'; });
    optPresets.addEventListener('mouseleave', () => { optPresets.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))'; });
    optPresets.addEventListener('click', (ev) => { ev.stopPropagation(); showPresetList(); });

    contentArea.appendChild(optThemes);
    contentArea.appendChild(optLayout);
    contentArea.appendChild(optUiTheme);
    contentArea.appendChild(optPresets);

    const separator = document.createElement('div');
    separator.style.cssText = 'height: 1px; background: var(--ui-tab-border, rgba(255,255,255,0.1)); margin: 8px 4px;';
    contentArea.appendChild(separator);

    const titleVentana = document.createElement('div');
    titleVentana.textContent = 'Ventana';
    titleVentana.style.cssText = 'font-size: 10px; font-weight: 700; text-transform: uppercase; opacity: 0.5; margin: 4px 10px 8px; letter-spacing: 0.05em; color: var(--ui-tab-text);';
    contentArea.appendChild(titleVentana);

    const createToggleOption = (label, iconClass, isActive, onToggle) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.style.cssText = choiceBtnStyle(false);
      btn.style.justifyContent = 'space-between';
      btn.style.padding = '10px 12px';
      
      const leftSide = document.createElement('div');
      leftSide.style.cssText = 'display: flex; align-items: center; gap: 12px;';
      // Si no hay icono, el texto se alinea a la izquierda
      if (iconClass) {
        leftSide.innerHTML = `<i class="pi ${iconClass}" style="font-size: 1.1rem; opacity: 0.9;"></i><span style="font-weight: 500;">${label}</span>`;
      } else {
        leftSide.innerHTML = `<span style="font-weight: 500;">${label}</span>`;
      }
      
      // Switch Track (Estilo de la imagen)
      const track = document.createElement('div');
      track.style.cssText = `
        width: 38px;
        height: 20px;
        border-radius: 12px;
        background: ${isActive ? '#4d79c7' : '#323d4d'};
        position: relative;
        transition: background 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        flex-shrink: 0;
      `;
      
      // Switch Thumb (Círculo blanco)
      const thumb = document.createElement('div');
      thumb.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: white;
        position: absolute;
        top: 2px;
        left: ${isActive ? '20px' : '2px'};
        transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      `;
      
      track.appendChild(thumb);
      btn.appendChild(leftSide);
      btn.appendChild(track);
      
      btn.addEventListener('mouseenter', () => { 
        btn.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.08))';
      });
      btn.addEventListener('mouseleave', () => { 
        btn.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
      });
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        onToggle();
        // Feedback visual inmediato
        const willBeActive = !isActive;
        track.style.background = willBeActive ? '#4d79c7' : '#323d4d';
        thumb.style.left = willBeActive ? '20px' : '2px';
        setTimeout(() => showChoice(), 150);
      });
      return btn;
    };

    const isTitleBarVisible = !titleBarCollapsedRef.current;
    const isMarcoVisible = !mainFrameHeaderCollapsedRef.current;
    const isMinimal = isMinimalModeRef.current;

    // Reordenados según petición del usuario: Barra de título, Marco superior, Modo minimalista
    contentArea.appendChild(createToggleOption('Barra de título', null, isTitleBarVisible, () => window.dispatchEvent(new CustomEvent('toggle-titlebar'))));
    contentArea.appendChild(createToggleOption('Marco superior', null, isMarcoVisible, () => setMainFrameHeaderCollapsed(prev => !prev)));
    contentArea.appendChild(createToggleOption('Modo Minimalista Absoluto', null, isMinimal, () => window.dispatchEvent(new CustomEvent('toggle-minimal-mode'))));
  }

  function addBackBar(title, onBack) {
    const bar = document.createElement('div');
    bar.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--ui-tab-border, rgba(255,255,255,0.12));
    `;
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.innerHTML = '<i class="pi pi-arrow-left" style="font-size: 0.85rem;"></i>';
    backBtn.style.cssText = `
      padding: 4px 6px;
      border: none;
      border-radius: 6px;
      background: transparent;
      color: var(--ui-tab-text, rgba(255,255,255,0.8));
      cursor: pointer;
    `;
    backBtn.addEventListener('click', onBack);
    const titleEl = document.createElement('span');
    titleEl.textContent = title;
    titleEl.style.cssText = 'font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--ui-tab-text, rgba(255,255,255,0.7));';
    bar.appendChild(backBtn);
    bar.appendChild(titleEl);
    contentArea.insertBefore(bar, contentArea.firstChild);
  }

  function showThemeList() {
    contentArea.innerHTML = '';
    contentArea.style.padding = '8px';
    addBackBar('Tema de pestañas', showChoice);

    themeList.forEach(({ id, name, preview }) => {
      const item = document.createElement('div');
      item.dataset.themeId = id;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
        color: var(--ui-tab-text, rgba(255,255,255,0.9));
        background: ${id === currentTheme ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
      `;
      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width: 28px;
        height: 18px;
        flex-shrink: 0;
        border-radius: ${preview.borderRadius || '4px 4px 0 0'};
        background: ${preview.background};
        border: ${preview.border || '1px solid rgba(255,255,255,0.2)'};
        box-shadow: ${preview.boxShadow || 'none'};
      `;
      const label = document.createElement('span');
      label.textContent = name;
      label.style.flex = '1';
      label.style.overflow = 'hidden';
      label.style.textOverflow = 'ellipsis';
      label.style.whiteSpace = 'nowrap';
      item.appendChild(swatch);
      item.appendChild(label);
      if (id === currentTheme) {
        const check = document.createElement('i');
        check.className = 'pi pi-check';
        check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
        item.appendChild(check);
      }
      item.addEventListener('mouseenter', () => {
        if (id !== currentTheme) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
      });
      item.addEventListener('mouseleave', () => {
        if (id !== currentTheme) item.style.background = 'transparent';
      });
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        applyTabTheme(id);
        localStorage.setItem(TAB_THEME_STORAGE_KEY, id);
        panel.remove();
        document.removeEventListener('click', closeOutside);
      });
      contentArea.appendChild(item);
    });
  }

  function showLayoutList() {
    contentArea.innerHTML = '';
    contentArea.style.padding = '8px';
    addBackBar('Diseño / layout', showChoice);

    layoutList.forEach(({ id, name, description, preview }) => {
      const item = document.createElement('div');
      item.dataset.layoutId = id;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
        color: var(--ui-tab-text, rgba(255,255,255,0.9));
        background: ${id === currentLayout ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
      `;
      const swatch = document.createElement('div');
      const previewBorderStyle = preview?.borderStyle;
      const isMinimalPreview = previewBorderStyle === 'minimal';
      const isUnderlinePreview = previewBorderStyle === 'underline';
      const isBoxedPreview = previewBorderStyle === 'boxed';
      const isVscodePreview = previewBorderStyle === 'vscode';
      const isBrowserPreview = previewBorderStyle === 'browser';
      const isRetroPreview = previewBorderStyle === 'retro';
      const isPillsPreview = previewBorderStyle === 'pills';
      const isClassicBrowserPreview = previewBorderStyle === 'classicBrowser';
      const isChromePreview = previewBorderStyle === 'chrome';
      swatch.style.cssText = `
        width: 28px;
        height: ${preview?.tabHeight || '30px'};
        flex-shrink: 0;
        border-radius: ${preview?.borderRadius || '4px 4px 0 0'};
        border: ${isVscodePreview || isChromePreview ? 'none' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))'};
        border-right: ${isVscodePreview ? '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))' : 'none'};
        border-top: ${isVscodePreview ? '2px solid var(--primary-color, #2196f3)' : (isChromePreview ? 'none' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))')};
        background: ${isMinimalPreview ? 'transparent' : 'var(--ui-tab-bg, rgba(255,255,255,0.05))'};
        box-shadow: ${isBoxedPreview ? 'inset 0 0 0 1px var(--ui-tab-border, rgba(255,255,255,0.35))' : 'none'};
        border-bottom: ${isUnderlinePreview ? '2px solid var(--primary-color, #2196f3)' : (isClassicBrowserPreview || isChromePreview ? 'none' : '1px solid var(--ui-tab-border, rgba(255,255,255,0.25))')};
        margin-top: ${isBrowserPreview || isChromePreview ? '2px' : '0'};
        font-family: ${isRetroPreview ? '"Consolas","Courier New",monospace' : 'inherit'};
        border-radius: ${isPillsPreview ? '999px' : (preview?.borderRadius || '4px 4px 0 0')};
      `;
      const textWrap = document.createElement('div');
      textWrap.style.cssText = 'display: flex; flex-direction: column; min-width: 0; flex: 1;';
      const label = document.createElement('span');
      label.textContent = name;
      label.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      const subLabel = document.createElement('span');
      subLabel.textContent = description || '';
      subLabel.style.cssText = 'font-size: 10px; opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      textWrap.appendChild(label);
      textWrap.appendChild(subLabel);
      item.appendChild(swatch);
      item.appendChild(textWrap);
      if (id === currentLayout) {
        const check = document.createElement('i');
        check.className = 'pi pi-check';
        check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
        item.appendChild(check);
      }
      item.addEventListener('mouseenter', () => {
        if (id !== currentLayout) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
      });
      item.addEventListener('mouseleave', () => {
        if (id !== currentLayout) item.style.background = 'transparent';
      });
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        applyTabLayout(id);
        localStorage.setItem(TAB_LAYOUT_STORAGE_KEY, id);
        panel.remove();
        document.removeEventListener('click', closeOutside);
      });
      contentArea.appendChild(item);
    });
  }

  function showUiThemeList() {
    contentArea.innerHTML = '';
    contentArea.style.padding = '8px';
    addBackBar('Tema de apariencia', showChoice);

    const currentUiTheme = localStorage.getItem('ui_theme') || 'Light';
    const uiThemeList = Array.from(
      new Map(
        Object.values(uiThemes || {})
          .filter(theme => theme?.name)
          .map(theme => [theme.name, theme])
      ).values()
    );

    uiThemeList.forEach((theme) => {
      const isActive = theme.name === currentUiTheme;
      const item = document.createElement('div');
      item.dataset.uiThemeName = theme.name;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px 8px;
        cursor: pointer;
        border-radius: 6px;
        color: var(--ui-tab-text, rgba(255,255,255,0.9));
        background: ${isActive ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
      `;

      const swatch = document.createElement('div');
      swatch.style.cssText = `
        width: 28px;
        height: 18px;
        flex-shrink: 0;
        border-radius: 4px;
        border: 1px solid rgba(255,255,255,0.2);
        background: linear-gradient(135deg, ${theme.colors?.sidebarBackground || '#2b2f33'} 0%, ${theme.colors?.contentBackground || '#1e1e1e'} 100%);
      `;

      const label = document.createElement('span');
      label.textContent = theme.name;
      label.style.cssText = 'flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';

      item.appendChild(swatch);
      item.appendChild(label);
      if (isActive) {
        const check = document.createElement('i');
        check.className = 'pi pi-check';
        check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
        item.appendChild(check);
      }

      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.background = 'transparent';
      });
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        themeManager.applyTheme(theme.name);
        panel.remove();
        document.removeEventListener('click', closeOutside);
      });

      contentArea.appendChild(item);
    });
  }

  function showPresetList() {
    contentArea.innerHTML = '';
    contentArea.style.padding = '8px';
    addBackBar('Presets de temas', showChoice);

    const allPresets = presetManager.getAllPresets();
    const activePresetId = presetManager.getActivePresetId();

    allPresets.forEach((preset) => {
      const isActive = preset.id === activePresetId;
      const item = document.createElement('div');
      item.dataset.presetId = preset.id;
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 8px;
        cursor: pointer;
        border-radius: 6px;
        color: var(--ui-tab-text, rgba(255,255,255,0.9));
        background: ${isActive ? 'var(--ui-tab-active-bg, rgba(255,255,255,0.12))' : 'transparent'};
      `;

      const icon = document.createElement('span');
      icon.textContent = preset.icon || '🎨';
      icon.style.cssText = 'font-size: 0.95rem; line-height: 1; width: 16px; text-align: center; flex-shrink: 0;';

      const textWrap = document.createElement('div');
      textWrap.style.cssText = 'display: flex; flex-direction: column; min-width: 0; flex: 1;';
      const label = document.createElement('span');
      label.textContent = preset.name;
      label.style.cssText = 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      const subLabel = document.createElement('span');
      subLabel.textContent = preset.description || '';
      subLabel.style.cssText = 'font-size: 10px; opacity: 0.72; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;';
      textWrap.appendChild(label);
      textWrap.appendChild(subLabel);

      item.appendChild(icon);
      item.appendChild(textWrap);

      if (isActive) {
        const check = document.createElement('i');
        check.className = 'pi pi-check';
        check.style.cssText = 'font-size: 0.7rem; opacity: 0.9; flex-shrink: 0;';
        item.appendChild(check);
      }

      item.addEventListener('mouseenter', () => {
        if (!isActive) item.style.background = 'var(--ui-tab-hover-bg, rgba(255,255,255,0.06))';
      });
      item.addEventListener('mouseleave', () => {
        if (!isActive) item.style.background = 'transparent';
      });
      item.addEventListener('click', (ev) => {
        ev.stopPropagation();
        presetManager.applyPreset(preset);
        panel.remove();
        document.removeEventListener('click', closeOutside);
      });

      contentArea.appendChild(item);
    });
  }

  panel.appendChild(contentArea);
  showChoice();
  document.body.appendChild(panel);
  setTimeout(() => document.addEventListener('click', closeOutside), 0);
}

