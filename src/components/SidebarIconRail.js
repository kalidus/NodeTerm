import React, { useCallback } from 'react';
import AIClientBrandIcon from './AIClientBrandIcon';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import { railIcons } from '../themes/rail-icons';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';

const ICON_SIZE = 22;
const RAIL_WIDTH = 48;

const SECTIONS = [
  { id: 'connections', icon: 'pi pi-server', color: '#4fc3f7', labelKey: 'tooltips.connections' },
  { id: 'passwords',  icon: 'pi pi-shield',  color: '#ef9a9a', labelKey: 'tooltips.passwords' },
  { id: 'documents',  icon: 'pi pi-file',    color: '#64b5f6', labelKey: null, label: 'Notas' },
  { id: 'favorites',  icon: 'pi pi-star-fill', color: '#ffc107', labelKey: 'tooltips.showFavorites' },
  { id: 'tools',      icon: 'pi pi-wrench',  color: '#06b6d4', labelKey: null, label: 'Herramientas' },
];

const SidebarIconRail = React.memo(({
  activeSection,
  panelOpen,
  onSectionClick,
  onSettingsClick,
  sessionActionIconTheme = 'modern',
  aiClientsEnabled = {},
  onOpenAIClient,
  viewMode,
  onShowImportDialog,
  onShowExportDialog,
  onShowImportExportDialog,
  onShowImportWizard,
}) => {
  const { t } = useTranslation('common');

  const handleAppMenuClick = useCallback((event) => {
    const importCallback = onShowImportDialog || (() => {});
    const exportCallback = onShowExportDialog || (() => {});
    const importExportCallback = onShowImportExportDialog || (() => {});
    const wizardCallback = onShowImportWizard || (() => {});
    const menuStructure = createAppMenu(importCallback, exportCallback, importExportCallback, t, wizardCallback);
    createContextMenu(event, menuStructure, 'app-context-menu-sidebar');
  }, [onShowImportDialog, onShowExportDialog, onShowImportExportDialog, onShowImportWizard, t]);

  const cliClients = ['opencode', 'geminicli', 'codexcli', 'antigravitycli', 'hermescli', 'claude'];
  const appClients = ['anythingllm', 'openwebui', 'librechat', 'agentzero', 'openclaw', 'opennotebook'];

  const hasAnyCli = cliClients.some(c => aiClientsEnabled[c]);
  const hasAnyApp = appClients.some(c => aiClientsEnabled[c]);
  const hasAnyAI = hasAnyCli || hasAnyApp;

  const aiClientTabTypes = {

    opencode: 'opencode',
    geminicli: 'geminicli',
    codexcli: 'codexcli',
    antigravitycli: 'antigravitycli',
    hermescli: 'hermescli',
    claude: 'claude',
    anythingllm: 'anything-llm',
    openwebui: 'openwebui',
    librechat: 'librechat',
    agentzero: 'agentzero',
    openclaw: 'openclaw',
    opennotebook: 'open-notebook',
  };

  const aiClientTooltips = {

    opencode: 'tooltips.openCode',
    geminicli: 'tooltips.geminiCLI',
    codexcli: 'tooltips.codexCLI',
    antigravitycli: 'tooltips.antigravityCLI',
    hermescli: 'tooltips.hermesCLI',
    claude: 'tooltips.claudeCode',
    anythingllm: 'tooltips.anythingLLM',
    openwebui: 'tooltips.openWebUI',
    librechat: 'tooltips.libreChat',
    agentzero: null,
    openclaw: null,
    opennotebook: null,
  };

  return (
    <div className="sidebar-icon-rail" style={{ width: RAIL_WIDTH }}>
      {/* Main sections */}
      <div className="sidebar-icon-rail-sections">
        {SECTIONS.map(section => {
          const isActive = panelOpen && activeSection === section.id;
          const tooltip = section.labelKey ? t(section.labelKey) : section.label;
          const customIcon = railIcons[sessionActionIconTheme]?.[section.id];
          return (
            <button
              key={section.id}
              className={`sidebar-icon-rail-item${isActive ? ' active' : ''}`}
              onClick={() => onSectionClick(section.id)}
              title={tooltip}
              style={{ '--rail-item-color': section.color }}
            >
              {customIcon ? (
                <span className="sidebar-rail-svg-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {customIcon}
                </span>
              ) : (
                <i className={section.icon} style={{ fontSize: `${Math.round(ICON_SIZE * 0.75)}px` }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="sidebar-icon-rail-separator" />

      {/* AI Clients */}
      {hasAnyAI && (
        <div className="sidebar-icon-rail-ai">
          {cliClients.map(clientId => {
            if (!aiClientsEnabled[clientId]) return null;
            const tooltipKey = aiClientTooltips[clientId];
            const tooltip = tooltipKey ? t(tooltipKey) : clientId;
            return (
              <button
                key={clientId}
                className="sidebar-icon-rail-item"
                onClick={() => onOpenAIClient(clientId)}
                title={tooltip}
              >
                <AIClientBrandIcon tabType={aiClientTabTypes[clientId]} size={Math.round(ICON_SIZE * 0.85)} />
              </button>
            );
          })}

          {hasAnyCli && hasAnyApp && (
            <div className="sidebar-icon-rail-separator mini" />
          )}

          {appClients.map(clientId => {
            if (!aiClientsEnabled[clientId]) return null;
            const tooltipKey = aiClientTooltips[clientId];
            const tooltip = tooltipKey ? t(tooltipKey) : clientId;



            return (
              <button
                key={clientId}
                className="sidebar-icon-rail-item"
                onClick={() => onOpenAIClient(clientId)}
                title={tooltip}
              >
                <AIClientBrandIcon tabType={aiClientTabTypes[clientId]} size={Math.round(ICON_SIZE * 0.85)} />
              </button>
            );
          })}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div className="sidebar-icon-rail-bottom">
        <button
          className={`sidebar-icon-rail-item${panelOpen && activeSection === 'settings' ? ' active' : ''}`}
          onClick={() => onSectionClick('settings')}
          title={t('tooltips.settings')}
          style={{ '--rail-item-color': '#a78bfa' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: ICON_SIZE, height: ICON_SIZE }}>
            {sessionActionIconThemes[sessionActionIconTheme]?.icons.settings}
          </span>
        </button>
        <button
          className="sidebar-icon-rail-item"
          onClick={handleAppMenuClick}
          title={t('tooltips.appMenu')}
          style={{ '--rail-item-color': 'var(--ui-sidebar-text)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: ICON_SIZE, height: ICON_SIZE }}>
            {sessionActionIconThemes[sessionActionIconTheme]?.icons.menu}
          </span>
        </button>
      </div>
    </div>
  );
});

export default SidebarIconRail;
