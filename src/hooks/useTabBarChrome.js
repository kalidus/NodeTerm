import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
  FaWindows,
  FaUbuntu,
  FaLinux,
  FaBrain
} from 'react-icons/fa';
import { SiAnthropic, SiDebian, SiDocker, SiOpenai } from 'react-icons/si';
import AIClientBrandIcon from '../components/AIClientBrandIcon';
import LauncherQuickActions from '../components/home/LauncherQuickActions';
import {
  buildDefaultTerminalOptions,
  setDefaultLocalTerminal as persistDefaultLocalTerminal
} from '../utils/defaultLocalTerminal';
import { themeManager } from '../utils/themeManager';
import { openAppearanceQuickPanel } from '../utils/appearanceQuickPanel';

const LAUNCHER_PANEL_WIDTH = 820;
const LAUNCHER_PANEL_MARGIN = 12;

const positionLauncherPanel = (panel, triggerRect) => {
  if (!panel || !triggerRect) return;

  const margin = LAUNCHER_PANEL_MARGIN;
  const maxWidth = Math.min(LAUNCHER_PANEL_WIDTH, window.innerWidth - margin * 2);
  panel.style.width = `${maxWidth}px`;

  const measured = panel.getBoundingClientRect();
  const width = measured.width > 0 ? measured.width : maxWidth;
  const height = measured.height > 0 ? measured.height : 420;

  let left = (window.innerWidth - width) / 2;
  const maxLeft = window.innerWidth - width - margin;
  left = Math.min(Math.max(margin, left), Math.max(margin, maxLeft));

  let top = triggerRect.bottom + 8;
  if (top + height > window.innerHeight - margin) {
    top = triggerRect.top - height - 8;
  }
  const maxTop = window.innerHeight - height - margin;
  top = Math.min(Math.max(margin, top), Math.max(margin, maxTop));

  panel.style.left = `${left}px`;
  panel.style.top = `${top}px`;
};

/**
 * Inyecta botones fijos (+ / launcher / apariencia) en la barra de pestañas.
 */
export function useTabBarChrome({
  tabsContainerRef,
  titleBarCollapsed,
  isMinimalMode,
  mainFrameHeaderCollapsed,
  filteredTabs,
  activeTabIndex,
  wslDistributions,
  dockerContainers,
  terminalMenuItems,
  aiClientsEnabled,
  lastLocalTerminalTypeRef,
  wslDistributionsRef,
  createLocalTerminalTabRef,
  terminalMenuItemsRef,
  getDefaultTerminalFromConfig,
  setLastLocalTerminalType,
  setMainFrameHeaderCollapsed,
}) {
  // Efecto para añadir botones fijos a la derecha del nav container (fuera del área scrollable)
  useEffect(() => {
    let cancelled = false;
    const retryTimers = [];

    const resolveNavList = () => {
      const refEl = tabsContainerRef.current;
      // El ref a veces apunta al navContainer y otras a .p-tabview-nav (lo sobrescribe el effect de scroll)
      return (
        document.querySelector('.main-tab-view .p-tabview-nav') ||
        (refEl?.classList?.contains('p-tabview-nav') ? refEl : null) ||
        refEl?.querySelector?.('.p-tabview-nav') ||
        null
      );
    };

    const injectTabBarButtons = () => {
      if (cancelled) return false;

      const navList = resolveNavList();
      if (!navList) return false;

      const navContainer = navList.parentElement || navList;

    // Asegurar que todos los elementos dentro de la barra de pestañas
    // (pestañas e iconos de acción) se alineen verticalmente al centro
    try {
      navList.style.display = 'flex';
      navList.style.alignItems = 'center';
    } catch {
      // ignorar si el estilo no se puede aplicar
    }

    // Eliminar botones existentes del nav
    navContainer.querySelectorAll('.local-terminal-buttons, .tab-appearance-button-wrapper').forEach((el) => el.remove());
    navList.querySelectorAll('.local-terminal-buttons, .tab-appearance-button-wrapper').forEach((el) => el.remove());
    navContainer.querySelector('.main-nav-traffic-lights')?.remove();
    navList.querySelector('.main-nav-traffic-lights')?.remove();

    // Crear contenedor de botones (inline después de la última pestaña)
    const buttonsContainer = document.createElement('div');
    buttonsContainer.className = 'local-terminal-buttons';
    buttonsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
      margin-left: 4px;
      -webkit-app-region: no-drag;
    `;

    // Botón +
    const plusButton = document.createElement('button');
    plusButton.innerHTML = '<i class="pi pi-plus"></i>';
    plusButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    plusButton.style.cssText = `
      padding: 0 !important;
      width: 20px !important;
      min-width: 20px !important;
      max-width: 20px !important;
      height: 20px !important;
      min-height: 20px !important;
      max-height: 20px !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
      -webkit-app-region: no-drag !important;
      pointer-events: auto !important;
    `;

    plusButton.title = 'Nueva terminal local';
    plusButton.addEventListener('click', () => {
      const storedDefault = localStorage.getItem('nodeterm_default_local_terminal');
      const lastType = lastLocalTerminalTypeRef.current;
      const fallbackDefault = getDefaultTerminalFromConfig();
      let terminalTypeToUse = storedDefault || lastType || fallbackDefault;

      const findDistro = (value) => {
        if (!value) return null;
        const normalized = value.startsWith('wsl-') ? value.replace('wsl-', '') : value;
        const distros = wslDistributionsRef.current || [];
        return distros.find(d =>
          d.name === normalized ||
          d.label === normalized ||
          d.name?.toLowerCase?.() === normalized.toLowerCase() ||
          d.label?.toLowerCase?.() === normalized.toLowerCase()
        );
      };

      if (terminalTypeToUse.startsWith('docker-')) {
        const containerName = terminalTypeToUse.replace('docker-', '');
        const container = dockerContainers.find(c => c.name === containerName);
        if (container) {
          createLocalTerminalTabRef.current?.(terminalTypeToUse, { dockerContainer: container });
          return;
        }
      }

      const distro = findDistro(terminalTypeToUse);
      if (distro) {
        createLocalTerminalTabRef.current?.(distro.name, distro);
      } else {
        createLocalTerminalTabRef.current?.(terminalTypeToUse, null);
      }
    });

    // Botón dropdown
    const dropdownButton = document.createElement('button');
    dropdownButton.innerHTML = '<i class="pi pi-chevron-down"></i>';
    dropdownButton.className = 'p-button p-button-text p-button-sm tab-action-button';
    dropdownButton.style.cssText = `
      padding: 0 !important;
      width: 20px !important;
      min-width: 20px !important;
      max-width: 20px !important;
      height: 20px !important;
      min-height: 20px !important;
      max-height: 20px !important;
      font-size: 10px !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      box-sizing: border-box !important;
      -webkit-app-region: no-drag !important;
      pointer-events: auto !important;
    `;

    dropdownButton.title = 'Seleccionar tipo de terminal';
    dropdownButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const existingPanel = document.getElementById('terminal-grid-launcher-panel');
      if (existingPanel) {
        if (typeof existingPanel._dispose === 'function') {
          existingPanel._dispose();
          return;
        }
        if (existingPanel._positionRaf) {
          cancelAnimationFrame(existingPanel._positionRaf);
        }
        if (typeof existingPanel._onResize === 'function') {
          window.removeEventListener('resize', existingPanel._onResize);
        }
        if (existingPanel._actionsRoot) {
          try {
            existingPanel._actionsRoot.unmount();
          } catch {
            /* noop */
          }
          existingPanel._actionsRoot = null;
        }
        const roots = existingPanel._launcherIconRoots;
        if (Array.isArray(roots)) {
          roots.forEach((r) => {
            try {
              r.unmount();
            } catch {
              /* noop */
            }
          });
        }
        if (existingPanel._launcherStyleEl?.parentNode) {
          existingPanel._launcherStyleEl.parentNode.removeChild(existingPanel._launcherStyleEl);
        }
        existingPanel.remove();
        return;
      }

      const panel = document.createElement('div');
      panel.id = 'terminal-grid-launcher-panel';
      /** Tokens del tema activo (mismo criterio que menús / themeManager) */
      const theme = {
        ctxBg: 'var(--ui-context-bg)',
        ctxBorder: 'var(--ui-context-border)',
        ctxText: 'var(--ui-context-text)',
        ctxHover: 'var(--ui-context-hover)',
        ctxShadow: 'var(--ui-context-shadow, rgba(0, 0, 0, 0.35))',
        contentBg: 'var(--ui-content-bg)',
        primary: 'var(--ui-button-primary)',
        tabActiveText: 'var(--ui-tab-active-text, var(--ui-context-text))'
      };
      panel._launcherIconRoots = [];
      const unmountLauncherIconRoots = () => {
        if (!Array.isArray(panel._launcherIconRoots)) return;
        panel._launcherIconRoots.forEach((r) => {
          try {
            r.unmount();
          } catch {
            /* noop */
          }
        });
        panel._launcherIconRoots = [];
      };
      const disposePanel = () => {
        if (panel._positionRaf) {
          cancelAnimationFrame(panel._positionRaf);
          panel._positionRaf = 0;
        }
        if (typeof panel._onResize === 'function') {
          window.removeEventListener('resize', panel._onResize);
          panel._onResize = null;
        }
        if (panel._actionsRoot) {
          try {
            panel._actionsRoot.unmount();
          } catch {
            /* noop */
          }
          panel._actionsRoot = null;
        }
        unmountLauncherIconRoots();
        document.removeEventListener('click', handleOutsideClick);
        if (panel._launcherStyleEl?.parentNode) {
          panel._launcherStyleEl.parentNode.removeChild(panel._launcherStyleEl);
        }
        if (panel.parentNode) panel.parentNode.removeChild(panel);
      };
      panel._dispose = disposePanel;

      const launcherStyleEl = document.createElement('style');
      launcherStyleEl.textContent = `
        #terminal-grid-launcher-panel input.terminal-launcher-search::placeholder {
          color: rgba(122, 248, 255, 0.42);
        }
        #terminal-grid-launcher-panel .launcher-default-terminal {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }
        #terminal-grid-launcher-panel .launcher-default-terminal-label {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: ${theme.primary || '#00f3ff'};
          opacity: 0.7;
          white-space: nowrap;
        }
        #terminal-grid-launcher-panel .launcher-default-terminal-select {
          max-width: 180px;
          min-width: 132px;
          height: 24px;
          padding: 0 22px 0 8px;
          font-family: inherit;
          font-size: 11px;
          color: ${theme.ctxText || '#e2f8ff'};
          background: ${theme.contentBg || 'rgba(6, 8, 18, 0.97)'};
          border: 1px solid ${theme.ctxBorder || 'rgba(0, 243, 255, 0.45)'};
          border-radius: 4px;
          outline: none;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          background-image: linear-gradient(45deg, transparent 50%, ${theme.primary || '#00f3ff'} 50%),
            linear-gradient(135deg, ${theme.primary || '#00f3ff'} 50%, transparent 50%);
          background-position: calc(100% - 11px) 9px, calc(100% - 7px) 9px;
          background-size: 4px 4px, 4px 4px;
          background-repeat: no-repeat;
        }
        #terminal-grid-launcher-panel .launcher-default-terminal-select:focus {
          border-color: ${theme.primary || '#00f3ff'};
        }
        #terminal-grid-launcher-panel .launcher-default-terminal-select option {
          color: ${theme.ctxText || '#e2f8ff'};
          background: ${theme.ctxBg || '#060812'};
        }
      `;
      document.head.appendChild(launcherStyleEl);
      panel._launcherStyleEl = launcherStyleEl;

      const launcherPanelWidth = Math.min(LAUNCHER_PANEL_WIDTH, window.innerWidth - LAUNCHER_PANEL_MARGIN * 2);
      panel.style.cssText = `
        position: fixed;
        z-index: 10020;
        width: ${launcherPanelWidth}px;
        max-height: min(78vh, 860px);
        overflow: auto;
        font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
        color: ${theme.ctxText || '#e2f8ff'};
        background: ${theme.ctxBg || 'rgba(6, 8, 18, 0.97)'};
        backdrop-filter: blur(14px) saturate(160%);
        -webkit-backdrop-filter: blur(14px) saturate(160%);
        border: 1px solid ${theme.ctxBorder || 'rgba(0, 243, 255, 0.45)'};
        border-radius: 8px;
        box-shadow: ${theme.ctxShadow || '0 0 40px rgba(0, 243, 255, 0.12)'};
        padding: 12px 12px 10px 12px;
      `;

      // Añadir scanlines sutiles solo si el fondo es oscuro
      const isDark = !theme.contentBg || theme.contentBg.includes('#1') || theme.contentBg.includes('#2') || theme.contentBg.includes('rgb(0') || theme.contentBg.includes('black');
      if (isDark) {
        panel.style.backgroundImage = 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 200, 0.03) 2px, rgba(0, 255, 200, 0.03) 3px)';
      }

      const triggerRect = dropdownButton.getBoundingClientRect();
      positionLauncherPanel(panel, triggerRect);

      const header = document.createElement('div');
      header.className = 'launcher-panel-header';
      header.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 10px;
      `;

      const title = document.createElement('div');
      title.textContent = '// LAUNCHER';
      title.style.cssText = `
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: ${theme.primary || '#00f3ff'};
        text-shadow: 0 0 12px rgba(0, 243, 255, 0.45);
      `;

      const defaultWrap = document.createElement('label');
      defaultWrap.className = 'launcher-default-terminal';
      defaultWrap.title = 'Terminal por defecto al pulsar +';

      const defaultLabel = document.createElement('span');
      defaultLabel.className = 'launcher-default-terminal-label';
      defaultLabel.textContent = 'DEFAULT';

      const defaultSelect = document.createElement('select');
      defaultSelect.className = 'launcher-default-terminal-select';
      defaultSelect.setAttribute('aria-label', 'Terminal por defecto');

      const platform = window.electron?.platform || 'unknown';
      let aiEnabled = aiClientsEnabled;
      try {
        const cfg = JSON.parse(localStorage.getItem('ai_clients_enabled') || '{}');
        aiEnabled = { ...aiClientsEnabled, ...cfg };
      } catch {
        /* keep state */
      }
      const defaultOptions = buildDefaultTerminalOptions({
        platform,
        wslDistributions: wslDistributionsRef.current || [],
        cygwinAvailable: aiEnabled.cygwin === true,
        aiClientsEnabled: aiEnabled
      });
      const currentDefault = localStorage.getItem('nodeterm_default_local_terminal') || getDefaultTerminalFromConfig();
      const hasCurrent = defaultOptions.some((opt) => opt.value === currentDefault);
      if (!hasCurrent && currentDefault) {
        defaultOptions.unshift({ label: currentDefault, value: currentDefault });
      }
      defaultOptions.forEach((opt) => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === currentDefault) option.selected = true;
        defaultSelect.appendChild(option);
      });

      const stopSelectClose = (ev) => ev.stopPropagation();
      defaultWrap.addEventListener('click', stopSelectClose);
      defaultSelect.addEventListener('mousedown', stopSelectClose);
      defaultSelect.addEventListener('click', stopSelectClose);
      defaultSelect.addEventListener('change', (ev) => {
        ev.stopPropagation();
        const value = ev.target.value;
        if (!value) return;
        persistDefaultLocalTerminal(value);
        lastLocalTerminalTypeRef.current = value;
        setLastLocalTerminalType(value);
      });

      defaultWrap.appendChild(defaultLabel);
      defaultWrap.appendChild(defaultSelect);
      header.appendChild(title);
      header.appendChild(defaultWrap);
      panel.appendChild(header);

      const actionsHost = document.createElement('div');
      actionsHost.className = 'launcher-actions-host';
      panel.appendChild(actionsHost);
      const actionsRoot = createRoot(actionsHost);
      panel._actionsRoot = actionsRoot;
      actionsRoot.render(
        <LauncherQuickActions
          variant="panel"
          onActionRun={() => setTimeout(() => disposePanel(), 0)}
        />
      );

      const contentHost = document.createElement('div');
      panel.appendChild(contentHost);

      const getCardMeta = (groupLabel, itemLabel) => {
        const g = (groupLabel || '').toLowerCase();
        const i = (itemLabel || '').toLowerCase();
        if (i.includes('powershell')) return { subtitle: 'SHELL · WIN' };
        if (i.includes('cygwin')) return { subtitle: 'SHELL · POSIX' };
        if (i.includes('ubuntu') || i.includes('debian') || i.includes('kali')) return { subtitle: 'WSL · DISTRO' };
        if (g.includes('shell')) return { subtitle: 'LOCAL' };
        if (g.includes('ai') || i.includes('codex') || i.includes('gemini') || i.includes('claude') || i.includes('opencode')) return { subtitle: 'AI · CLI' };
        if (g.includes('container') || i.includes('docker')) return { subtitle: 'DOCKER' };
        if (i.includes('anythingllm')) return { subtitle: 'NET · APP' };
        if (i.includes('open webui')) return { subtitle: 'NET · APP' };
        if (i.includes('librechat')) return { subtitle: 'NET · APP' };
        if (i.includes('agent zero')) return { subtitle: 'NET · APP' };
        if (i.includes('openclaw')) return { subtitle: 'NET · APP' };
        if (i.includes('open notebook')) return { subtitle: 'NET · APP' };
        if (i.includes('ai chat')) return { subtitle: 'NET · APP' };
        if (g.includes('apps')) return { subtitle: 'NET · APP' };
        return { subtitle: 'PROFILE' };
      };

      const resolveLauncherIconElement = (item, groupLabel, accent) => {
        const gl = (groupLabel || '').toLowerCase();
        const lb = (item.label || '').toLowerCase();

        if (React.isValidElement(item.icon)) {
          const prev = item.icon.props?.style || {};
          return React.cloneElement(item.icon, {
            style: {
              ...prev,
              color: prev.color || accent,
              marginRight: 0,
              display: 'block'
            }
          });
        }

        if (lb.includes('anythingllm')) return <AIClientBrandIcon tabType="anything-llm" size={20} />;
        if (lb.includes('open webui')) return <AIClientBrandIcon tabType="openwebui" size={20} />;
        if (lb.includes('librechat')) return <AIClientBrandIcon tabType="librechat" size={20} />;
        if (lb.includes('agent zero')) return <AIClientBrandIcon tabType="agentzero" size={20} />;
        if (lb.includes('openclaw')) return <AIClientBrandIcon tabType="openclaw" size={20} />;
        if (lb.includes('open notebook')) return <AIClientBrandIcon tabType="open-notebook" size={20} />;
        if (lb.includes('codex')) return <SiOpenai style={{ fontSize: 18, color: '#10A37F' }} />;
        if (lb.includes('claude')) return <SiAnthropic style={{ fontSize: 18, color: '#D97706' }} />;
        if (lb.includes('opencode')) return <AIClientBrandIcon tabType="opencode" size={20} />;
        if (lb.includes('ai chat')) return <FaBrain style={{ fontSize: 18, color: accent }} />;

        if (gl.includes('container') || lb.includes('docker')) {
          return <SiDocker style={{ fontSize: 20, color: accent }} />;
        }
        if (lb.includes('powershell')) return <FaWindows style={{ fontSize: 18, color: '#0078D4' }} />;
        if (lb.includes('cygwin')) return <FaLinux style={{ fontSize: 17, color: '#FCC624' }} />;
        if (lb.includes('ubuntu')) return <FaUbuntu style={{ fontSize: 19, color: '#E95420' }} />;
        if (lb.includes('debian')) return <SiDebian style={{ fontSize: 18, color: '#D70A53' }} />;
        if (lb.includes('kali')) return <FaLinux style={{ fontSize: 18, color: '#2196F3' }} />;

        if (typeof item.icon === 'string' && item.icon.trim()) {
          return <i className={item.icon} style={{ fontSize: '1rem', color: accent }} />;
        }

        return <i className="pi pi-desktop" style={{ fontSize: '1rem', color: accent }} />;
      };

      const renderCard = (item, groupLabel) => {
        const meta = getCardMeta(groupLabel, item.label);
        const accent = isDark ? 'var(--primary-color, #00f3ff)' : (theme.primary || '#007acc');
        const accentMuted = isDark ? 'rgba(0, 243, 255, 0.6)' : 'rgba(0, 0, 0, 0.4)';
        const cardBgIdle = theme.contentBg;
        const cardBorderIdle = theme.ctxBorder || 'rgba(0, 243, 255, 0.25)';

        const button = document.createElement('button');
        button.type = 'button';
        button.style.cssText = `
          border: 1px solid ${cardBorderIdle};
          background: ${cardBgIdle};
          color: ${theme.ctxText || (isDark ? '#e2f8ff' : '#333')};
          min-height: 38px;
          padding: 4px 10px 4px 12px;
          text-align: left;
          cursor: pointer;
          font-family: ui-monospace, "Cascadia Code", "Consolas", monospace, sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
          position: relative;
          overflow: hidden;
          border-radius: 0;
        `;

        const glow = document.createElement('div');
        glow.style.cssText = `
          pointer-events: none;
          position: absolute;
          inset: -50% -30% auto -30%;
          height: 85%;
          background: radial-gradient(ellipse at 50% 0%, rgba(0, 243, 255, 0.15) 0%, transparent 60%);
          opacity: 0.65;
        `;
        button.appendChild(glow);

        const iconBadge = document.createElement('div');
        iconBadge.style.cssText = `
          position: relative;
          z-index: 1;
          width: 26px;
          height: 26px;
          min-width: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 243, 255, 0.08);
          border: 1px solid rgba(0, 243, 255, 0.25);
          border-radius: 0;
          transition: all 0.2s;
        `;
        const iconRoot = createRoot(iconBadge);
        iconRoot.render(resolveLauncherIconElement(item, groupLabel, accent));
        panel._launcherIconRoots.push(iconRoot);

        const left = document.createElement('div');
        left.style.cssText = 'position:relative;z-index:1;display:flex;align-items:center;gap:12px;min-width:0;flex:1;';

        const labelWrap = document.createElement('div');
        labelWrap.style.cssText = 'display:flex;align-items:center;min-width:0;flex:1;';
        const name = document.createElement('div');
        name.textContent = item.label || 'Terminal';
        name.style.cssText = `
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 11px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: ${theme.ctxText || (isDark ? '#00f3ff' : '#333')};
          text-shadow: ${isDark ? '0 0 5px rgba(0, 243, 255, 0.2)' : 'none'};
        `;
        labelWrap.appendChild(name);

        const arrow = document.createElement('i');
        arrow.className = 'pi pi-angle-right';
        arrow.style.cssText = `position:relative;z-index:1;font-size:12px;opacity:0.7;flex-shrink:0;color:${isDark ? '#00f3ff' : 'var(--primary-color, #007acc)'};transition:all 0.2s;text-shadow:${isDark ? '0 0 5px currentColor' : 'none'};`;

        left.appendChild(iconBadge);
        left.appendChild(labelWrap);
        button.appendChild(left);
        button.appendChild(arrow);
        
        button.addEventListener('mouseenter', () => {
          button.style.background = isDark ? 'rgba(0, 243, 255, 0.12)' : 'rgba(0, 0, 0, 0.05)';
          button.style.borderColor = isDark ? 'rgba(0, 243, 255, 0.8)' : 'var(--primary-color)';
          button.style.transform = 'scale(1.02)';
          button.style.boxShadow = isDark ? '0 0 15px rgba(0, 243, 255, 0.25)' : '0 2px 8px rgba(0, 0, 0, 0.1)';
          iconBadge.style.background = isDark ? 'rgba(255, 0, 170, 0.15)' : 'rgba(0, 0, 0, 0.08)';
          iconBadge.style.borderColor = isDark ? 'rgba(255, 0, 170, 0.4)' : 'var(--primary-color)';
          arrow.style.color = isDark ? '#ff00aa' : 'var(--primary-color)';
          arrow.style.transform = 'translateX(2px)';
        });
        button.addEventListener('mouseleave', () => {
          button.style.background = cardBgIdle;
          button.style.borderColor = cardBorderIdle;
          button.style.transform = 'scale(1)';
          button.style.boxShadow = 'none';
          iconBadge.style.background = isDark ? 'rgba(0, 243, 255, 0.08)' : 'rgba(0, 0, 0, 0.03)';
          iconBadge.style.borderColor = isDark ? 'rgba(0, 243, 255, 0.25)' : 'rgba(0, 0, 0, 0.1)';
          arrow.style.color = isDark ? '#00f3ff' : 'var(--primary-color, #007acc)';
          arrow.style.transform = 'translateX(0)';
        });
        button.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (typeof item.command === 'function') item.command();
          disposePanel();
        });
        return button;
      };

      const groups = Array.isArray(terminalMenuItemsRef.current) ? terminalMenuItemsRef.current : [];

      const renderGroups = (query = '') => {
        const normalized = (query || '').trim().toLowerCase();
        unmountLauncherIconRoots();
        contentHost.innerHTML = '';

        const hasItems = groups.some((group) => Array.isArray(group.items) && group.items.length > 0);
        if (!hasItems) {
          const empty = document.createElement('div');
          empty.textContent = 'Cargando perfiles... vuelve a abrir en un instante.';
          empty.style.cssText = 'font-size:13px;opacity:0.8;padding:10px 4px;color:rgba(200, 235, 255, 0.82);';
          contentHost.appendChild(empty);
          return;
        }

        // Reordenar grupos: Contenedores siempre al final
        const sortedGroups = [...groups].sort((a, b) => {
          const aLabel = (a.label || '').toLowerCase();
          const bLabel = (b.label || '').toLowerCase();
          if (aLabel.includes('container') || aLabel.includes('docker')) return 1;
          if (bLabel.includes('container') || bLabel.includes('docker')) return -1;
          return 0;
        });

        let renderedCount = 0;
        sortedGroups.forEach((group) => {
          const allItems = Array.isArray(group.items) ? group.items : [];
          const filteredItems = normalized
            ? allItems.filter((item) => (item.label || '').toLowerCase().includes(normalized))
            : allItems;
          if (!filteredItems.length) return;

          const sectionId = `launcher-section-${(group.label || 'group').replace(/\s+/g, '-').toLowerCase()}`;
          const isContainers = (group.label || '').toLowerCase().includes('container') || (group.label || '').toLowerCase().includes('docker');
          
          // Recuperar estado de persistencia si existe, o usar default (Containers colapsados por defecto)
          const isCollapsed = isContainers;

          const section = document.createElement('div');
          section.style.cssText = 'margin-bottom: 8px; padding-bottom: 4px;';

          const sectionTitle = document.createElement('div');
          sectionTitle.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            padding: 4px 6px;
            border-radius: 4px;
            margin-bottom: 4px;
            transition: all 0.2s;
            user-select: none;
          `;
          
          const titleLeft = document.createElement('div');
          titleLeft.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.14em;
            color: ${isContainers ? 'rgba(0, 243, 255, 0.65)' : '#00f3ff'};
            text-shadow: 0 0 10px rgba(0, 243, 255, 0.25);
            text-transform: uppercase;
          `;

          const sectionIcon = document.createElement('i');
          sectionIcon.className = group.icon || 'pi pi-folder';
          sectionIcon.style.cssText = 'font-size: 10px;';
          
          const sectionText = document.createElement('span');
          sectionText.textContent = `${group.label || 'Grupo'} (${filteredItems.length})`;
          
          titleLeft.appendChild(sectionIcon);
          titleLeft.appendChild(sectionText);

          const chevron = document.createElement('i');
          chevron.className = isCollapsed ? 'pi pi-chevron-down' : 'pi pi-chevron-up';
          chevron.style.cssText = 'font-size: 8px; opacity: 0.6; transition: transform 0.3s;';

          sectionTitle.appendChild(titleLeft);
          sectionTitle.appendChild(chevron);
          section.appendChild(sectionTitle);

          const grid = document.createElement('div');
          grid.style.cssText = `
            display: ${isCollapsed ? 'none' : 'grid'};
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 6px;
            padding: 4px 2px 10px 2px;
            transition: all 0.3s;
          `;
          
          filteredItems.forEach((item) => {
            renderedCount += 1;
            grid.appendChild(renderCard(item, group.label));
          });
          section.appendChild(grid);

          sectionTitle.addEventListener('click', () => {
            const currentlyCollapsed = grid.style.display === 'none';
            grid.style.display = currentlyCollapsed ? 'grid' : 'none';
            chevron.className = currentlyCollapsed ? 'pi pi-chevron-up' : 'pi pi-chevron-down';
            sectionTitle.style.background = currentlyCollapsed ? 'rgba(0, 243, 255, 0.03)' : 'transparent';
          });

          sectionTitle.addEventListener('mouseenter', () => {
            sectionTitle.style.background = 'rgba(0, 243, 255, 0.05)';
          });
          sectionTitle.addEventListener('mouseleave', () => {
            sectionTitle.style.background = grid.style.display === 'none' ? 'transparent' : 'rgba(0, 243, 255, 0.02)';
          });

          contentHost.appendChild(section);
        });

        if (renderedCount === 0) {
          const noResults = document.createElement('div');
          noResults.textContent = 'Sin resultados para tu busqueda.';
          noResults.style.cssText = 'font-size:13px;opacity:0.8;padding:10px 4px;color:rgba(200, 235, 255, 0.82);';
          contentHost.appendChild(noResults);
        }
      };

      renderGroups('');

      const handleOutsideClick = (ev) => {
        if (defaultWrap.contains(ev.target) || ev.target === defaultSelect) return;
        if (!panel.contains(ev.target) && !dropdownButton.contains(ev.target)) {
          disposePanel();
        }
      };

      document.body.appendChild(panel);
      panel._positionRaf = requestAnimationFrame(() => {
        positionLauncherPanel(panel, triggerRect);
        panel._positionRaf = requestAnimationFrame(() => {
          positionLauncherPanel(panel, dropdownButton.getBoundingClientRect());
          panel._positionRaf = 0;
        });
      });
      const onResize = () => positionLauncherPanel(panel, dropdownButton.getBoundingClientRect());
      panel._onResize = onResize;
      window.addEventListener('resize', onResize);
      setTimeout(() => document.addEventListener('click', handleOutsideClick), 0);
    });

    // Botón unificado: Tema + Layout de pestañas (un solo botón, panel con dos secciones)
    const appearanceButton = document.createElement('div');
    appearanceButton.setAttribute('role', 'button');
    appearanceButton.setAttribute('tabIndex', '0');
    appearanceButton.title = 'Tema y diseño de pestañas';
    appearanceButton.className = 'tab-appearance-quick-button';
    const appearanceIcon = document.createElement('i');
    appearanceIcon.className = 'pi pi-cog';
    appearanceIcon.style.cssText = `
      font-size: 0.9rem;
      color: var(--ui-tab-text, rgba(255,255,255,0.85));
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    appearanceButton.appendChild(appearanceIcon);
    appearanceButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      -webkit-app-region: no-drag !important;
    `;
    appearanceButton.addEventListener('mouseenter', () => { appearanceIcon.style.opacity = '1'; });
    appearanceButton.addEventListener('mouseleave', () => { appearanceIcon.style.opacity = '0.6'; });
    appearanceButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        appearanceButton.click();
      }
    });
    const openPanelFromAnchor = (anchorEl) => {
      openAppearanceQuickPanel(anchorEl);
    };

    appearanceButton.addEventListener('click', (e) => {
      e.stopPropagation();
      openPanelFromAnchor(appearanceButton);
    });

    // Botón de apariencia: abre menú con opciones de marco superior y title bar
    const frameToggleButton = document.createElement('div');
    frameToggleButton.setAttribute('role', 'button');
    frameToggleButton.setAttribute('tabIndex', '0');
    frameToggleButton.title = 'Opciones de barra superior';
    frameToggleButton.className = 'tab-frame-toggle-button';
    const frameIcon = document.createElement('i');
    frameIcon.className = 'pi pi-window-maximize';
    frameIcon.style.cssText = `
      font-size: 0.9rem;
      color: var(--ui-tab-text, rgba(255,255,255,0.85));
      opacity: 0.6;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
    `;
    frameToggleButton.appendChild(frameIcon);
    frameToggleButton.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-left: 2px;
      -webkit-app-region: no-drag;
    `;
    frameToggleButton.addEventListener('mouseenter', () => { frameIcon.style.opacity = '1'; });
    frameToggleButton.addEventListener('mouseleave', () => { frameIcon.style.opacity = '0.6'; });
    frameToggleButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        frameToggleButton.click();
      }
    });
    frameToggleButton.addEventListener('click', (e) => {
      e.stopPropagation();

      const existingMenu = document.querySelector('.tab-appearance-toggle-menu');
      if (existingMenu) {
        existingMenu.remove();
        return;
      }

      const menu = document.createElement('div');
      menu.className = 'tab-appearance-toggle-menu';
      menu.style.cssText = `
        position: fixed;
        background: var(--ui-context-bg, #2b2f33);
        border: 1px solid var(--ui-context-border, #444);
        border-radius: 6px;
        box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0,0,0,0.3));
        z-index: 9999;
        min-width: 200px;
        padding: 4px 0;
        font-size: 12px;
        color: var(--ui-context-text, #fff);
      `;

      const createMenuAction = (label, onClick) => {
        const item = document.createElement('div');
        item.setAttribute('role', 'button');
        item.setAttribute('tabIndex', '0');
        item.textContent = label;
        item.style.cssText = `
          padding: 8px 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: background-color 0.15s ease;
        `;
        item.addEventListener('mouseenter', () => { item.style.background = 'var(--ui-context-hover, rgba(255,255,255,0.08))'; });
        item.addEventListener('mouseleave', () => { item.style.background = 'transparent'; });
        item.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') {
            ev.preventDefault();
            item.click();
          }
        });
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onClick();
          menu.remove();
          document.removeEventListener('click', closeOutsideMenu);
        });
        return item;
      };

      const frameLabel = mainFrameHeaderCollapsedRef.current
        ? 'Mostrar marco superior'
        : 'Ocultar marco superior';
      const titleBarLabel = titleBarCollapsedRef.current
        ? 'Mostrar barra de titulo'
        : 'Ocultar barra de titulo';
      const minimalModeLabel = document.body.classList.contains('minimalist-terminal-mode')
        ? 'Desactivar modo minimalista'
        : 'Activar modo minimalista';
      menu.appendChild(createMenuAction(frameLabel, () => setMainFrameHeaderCollapsed(prev => !prev)));
      menu.appendChild(createMenuAction(titleBarLabel, () => window.dispatchEvent(new CustomEvent('toggle-titlebar'))));
      menu.appendChild(createMenuAction(minimalModeLabel, () => window.dispatchEvent(new CustomEvent('toggle-minimal-mode'))));

      document.body.appendChild(menu);
      const rect = frameToggleButton.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      let left = rect.right - menuRect.width;
      if (left < 8) left = 8;
      let top = rect.bottom + 6;
      if (top + menuRect.height > window.innerHeight - 8) {
        top = rect.top - menuRect.height - 6;
      }
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;

      const closeOutsideMenu = (ev) => {
        if (!menu.contains(ev.target) && !frameToggleButton.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('click', closeOutsideMenu);
        }
      };
      setTimeout(() => document.addEventListener('click', closeOutsideMenu), 0);
    });

    buttonsContainer.appendChild(plusButton);
    buttonsContainer.appendChild(dropdownButton);
    navList.appendChild(buttonsContainer);

    // Cog en barra de pestañas solo si la TitleBar no está visible
    const titleBarHidden = titleBarCollapsed || isMinimalMode;
    if (titleBarHidden) {
      const appearanceButtonWrapper = document.createElement('div');
      appearanceButtonWrapper.className = 'tab-appearance-button-wrapper';
      appearanceButtonWrapper.style.cssText = `
        display: flex;
        align-items: center;
        flex-shrink: 0;
        margin-left: auto;
        height: 20px;
      `;
      appearanceButtonWrapper.appendChild(appearanceButton);
      navList.appendChild(appearanceButtonWrapper);
    }

      return true;
    };

    injectTabBarButtons();
    // Reintentos: al ocultar TitleBar el TabView puede regenerar el nav y borrar los botones
    [50, 150, 400].forEach((ms) => {
      retryTimers.push(setTimeout(() => {
        if (cancelled) return;
        const navList = resolveNavList();
        const titleBarHidden = titleBarCollapsed || isMinimalMode;
        const cogMissing = titleBarHidden && navList && !navList.querySelector('.tab-appearance-button-wrapper');
        const actionsMissing = navList && !navList.querySelector('.local-terminal-buttons');
        if (!navList || actionsMissing || cogMissing) {
          injectTabBarButtons();
        }
      }, ms));
    });

    return () => {
      cancelled = true;
      retryTimers.forEach(clearTimeout);
    };
  }, [
    filteredTabs, 
    activeTabIndex, 
    wslDistributions, 
    mainFrameHeaderCollapsed, 
    titleBarCollapsed,
    isMinimalMode,
    terminalMenuItems,
    aiClientsEnabled
  ]); // eslint-disable-line react-hooks/exhaustive-deps
}
