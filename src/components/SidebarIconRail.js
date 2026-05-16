import React, { useCallback } from 'react';
import AIClientBrandIcon from './AIClientBrandIcon';
import { sessionActionIconThemes } from '../themes/session-action-icons';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';

const ICON_SIZE = 22;
const RAIL_WIDTH = 48;

const SECTIONS = [
  { id: 'connections', icon: 'pi pi-server', color: '#4fc3f7', labelKey: 'tooltips.connections' },
  { id: 'passwords',  icon: 'pi pi-shield',  color: '#ef9a9a', labelKey: 'tooltips.passwords' },
  { id: 'documents',  icon: 'pi pi-file',    color: '#64b5f6', labelKey: null, label: 'Notas' },
  { id: 'favorites',  icon: 'pi pi-star-fill', color: '#ffc107', labelKey: 'tooltips.showFavorites' },
];

const SidebarIconRail = React.memo(({
  activeSection,
  panelOpen,
  onSectionClick,
  onSettingsClick,
  sessionActionIconTheme = 'modern',
  aiClientsEnabled = {},
  onOpenAIClient,
  filesystemAvailable = false,
  isAIChatActive = false,
  onFilesystemClick,
  viewMode,
  onToggleLocalTerminalForAIChat,
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

  const cliClients = ['opencode', 'geminicli', 'codexcli', 'claude'];
  const appClients = ['nodeterm', 'anythingllm', 'openwebui', 'librechat', 'agentzero', 'openclaw', 'opennotebook'];

  const hasAnyCli = cliClients.some(c => aiClientsEnabled[c]);
  const hasAnyApp = appClients.some(c => aiClientsEnabled[c]);
  const hasAnyAI = hasAnyCli || hasAnyApp;

  const aiClientTabTypes = {
    nodeterm: 'ai-chat',
    opencode: 'opencode',
    geminicli: 'geminicli',
    codexcli: 'codexcli',
    claude: 'claude',
    anythingllm: 'anything-llm',
    openwebui: 'openwebui',
    librechat: 'librechat',
    agentzero: 'agentzero',
    openclaw: 'openclaw',
    opennotebook: 'open-notebook',
  };

  const aiClientTooltips = {
    nodeterm: 'tooltips.aiChat',
    opencode: 'tooltips.openCode',
    geminicli: 'tooltips.geminiCLI',
    codexcli: 'tooltips.codexCLI',
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
          return (
            <button
              key={section.id}
              className={`sidebar-icon-rail-item${isActive ? ' active' : ''}`}
              onClick={() => onSectionClick(section.id)}
              title={tooltip}
              style={{ '--rail-item-color': section.color }}
            >
              <i className={section.icon} style={{ fontSize: `${Math.round(ICON_SIZE * 0.75)}px` }} />
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

            if (clientId === 'nodeterm') {
              return (
                <button
                  key={clientId}
                  className="sidebar-icon-rail-item"
                  onClick={() => onOpenAIClient(clientId)}
                  title={tooltip}
                >
                  <i className="pi pi-comments" style={{ fontSize: `${Math.round(ICON_SIZE * 0.75)}px` }} />
                </button>
              );
            }

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

      {/* Filesystem + Local Terminal (conditional) */}
      {filesystemAvailable && isAIChatActive && (
        <>
          <div className="sidebar-icon-rail-separator" />
          <button
            className={`sidebar-icon-rail-item${viewMode === 'filesystem' ? ' active' : ''}`}
            onClick={onFilesystemClick}
            title={t('tooltips.filesystemMCP')}
            style={{ '--rail-item-color': '#8bc34a' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: ICON_SIZE, height: ICON_SIZE }}>
              {sessionActionIconThemes[sessionActionIconTheme]?.icons.newFolder}
            </span>
          </button>
          {onToggleLocalTerminalForAIChat && (
            <button
              className="sidebar-icon-rail-item"
              onClick={onToggleLocalTerminalForAIChat}
              title={t('tooltips.localTerminal')}
              style={{ '--rail-item-color': '#90caf9' }}
            >
              <i className="pi pi-desktop" style={{ fontSize: `${Math.round(ICON_SIZE * 0.75)}px` }} />
            </button>
          )}
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Bottom actions */}
      <div className="sidebar-icon-rail-bottom">
        <button
          className="sidebar-icon-rail-item"
          onClick={onSettingsClick}
          title={t('tooltips.settings')}
          style={{ '--rail-item-color': 'var(--ui-sidebar-text)' }}
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
