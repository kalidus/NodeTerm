import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { iconThemes } from '../../themes/icon-themes';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { AppDialogHeader } from '../ui/AppDialog';
import {
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE
} from '../EnhancedRDPForm';


const PROTOCOL_SECTION_KEYS = ['remoteAccess', 'fileTransfer', 'secrets'];

const PROTOCOL_PICKER_DIALOG_STYLE = {
  ...TERMINAL_PRO_DIALOG_STYLE,
  width: '760px',
  minWidth: '560px',
  minHeight: '380px',
  maxHeight: '90vh'
};

// --- ProtocolSelectionDialog: categorías + lista compacta (alineado con diálogos terminal-pro) ---
export function ProtocolSelectionDialog({
  visible,
  onHide,
  onSelectProtocol,
  iconTheme = 'material',
  initialCategory = null // 'remoteAccess' | 'fileTransfer' | 'secrets'
}) {
  const { t } = useTranslation('dialogs');

  const [selectedCategoryKey, setSelectedCategoryKey] = useState('remoteAccess');

  useEffect(() => {
    if (!visible) {
      return;
    }
    const key =
      initialCategory && PROTOCOL_SECTION_KEYS.includes(initialCategory)
        ? initialCategory
        : 'remoteAccess';
    setSelectedCategoryKey(key);
  }, [visible, initialCategory]);

  const protocolSections = useMemo(
    () => [
      {
        sectionKey: 'remoteAccess',
        title: t('protocolSelection.categories.remoteAccess'),
        protocols: [
          {
            id: 'ssh',
            listTitle: t('protocolSelection.protocols.ssh.listTitle'),
            tagline: t('protocolSelection.protocols.ssh.tagline'),
            icon: 'pi pi-server',
            iconColor: '#2196F3',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'rdp',
            listTitle: t('protocolSelection.protocols.rdp.listTitle'),
            tagline: t('protocolSelection.protocols.rdp.tagline'),
            icon: 'pi pi-desktop',
            iconColor: '#4CAF50',
            infoBadge: t('protocolSelection.badges.windows'),
            infoBadgeTone: 'windows',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'vnc',
            listTitle: t('protocolSelection.protocols.vnc.listTitle'),
            tagline: t('protocolSelection.protocols.vnc.tagline'),
            icon: 'pi pi-eye',
            iconColor: '#FF5722',
            infoBadge: t('protocolSelection.badges.crossPlatform'),
            infoBadgeTone: 'cross',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'ssh-tunnel',
            listTitle: t('protocolSelection.protocols.sshTunnel.listTitle'),
            tagline: t('protocolSelection.protocols.sshTunnel.tagline'),
            icon: 'pi pi-share-alt',
            iconColor: '#89b4fa',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          }
        ]
      },
      {
        sectionKey: 'fileTransfer',
        title: t('protocolSelection.categories.fileTransfer'),
        protocols: [
          {
            id: 'sftp',
            listTitle: t('protocolSelection.protocols.sftp.listTitle'),
            tagline: t('protocolSelection.protocols.sftp.tagline'),
            icon: 'pi pi-folder-open',
            iconColor: '#FF9800',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: true,
            isInsecure: false
          },
          {
            id: 'ftp',
            listTitle: t('protocolSelection.protocols.ftp.listTitle'),
            tagline: t('protocolSelection.protocols.ftp.tagline'),
            icon: 'pi pi-cloud-upload',
            iconColor: '#9C27B0',
            isRecommended: false,
            isInsecure: true
          },
          {
            id: 'scp',
            listTitle: t('protocolSelection.protocols.scp.listTitle'),
            tagline: t('protocolSelection.protocols.scp.tagline'),
            icon: 'pi pi-copy',
            iconColor: '#00BCD4',
            infoBadge: t('protocolSelection.badges.secure'),
            infoBadgeTone: 'secure',
            isRecommended: false,
            isInsecure: false
          }
        ]
      },
      {
        sectionKey: 'secrets',
        title: t('protocolSelection.categories.secretsManagement'),
        protocols: [
          {
            id: 'password',
            listTitle: t('protocolSelection.protocols.password.listTitle'),
            tagline: t('protocolSelection.protocols.password.tagline'),
            icon: 'pi pi-lock',
            iconColor: '#E91E63',
            infoBadge: t('protocolSelection.badges.vault'),
            infoBadgeTone: 'vault',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'crypto_wallet',
            listTitle: t('protocolSelection.protocols.crypto_wallet.listTitle'),
            tagline: t('protocolSelection.protocols.crypto_wallet.tagline'),
            icon: 'pi pi-wallet',
            iconColor: '#F7931A',
            infoBadge: t('protocolSelection.badges.bip39'),
            infoBadgeTone: 'bip39',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'api_key',
            listTitle: t('protocolSelection.protocols.api_key.listTitle'),
            tagline: t('protocolSelection.protocols.api_key.tagline'),
            icon: 'pi pi-key',
            iconColor: '#00BCD4',
            infoBadge: t('protocolSelection.badges.api'),
            infoBadgeTone: 'api',
            isRecommended: false,
            isInsecure: false
          },
          {
            id: 'secure_note',
            listTitle: t('protocolSelection.protocols.secure_note.listTitle'),
            tagline: t('protocolSelection.protocols.secure_note.tagline'),
            icon: 'pi pi-file-edit',
            iconColor: '#9C27B0',
            infoBadge: t('protocolSelection.badges.notes'),
            infoBadgeTone: 'notes',
            isRecommended: false,
            isInsecure: false
          }
        ]
      }
    ],
    [t]
  );

  const handleProtocolSelect = useCallback(
    (protocolId) => {
      const secretTypes = ['password', 'crypto_wallet', 'api_key', 'secure_note'];

      if (secretTypes.includes(protocolId)) {
        window.dispatchEvent(new CustomEvent('open-password-manager'));
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('open-new-secret-dialog', {
              detail: { secretType: protocolId }
            })
          );
        }, 100);
        onHide();
        return;
      }

      if (onSelectProtocol) {
        onSelectProtocol(protocolId);
      }
      onHide();
    },
    [onHide, onSelectProtocol]
  );

  const currentSection = useMemo(
    () =>
      protocolSections.find((section) => section.sectionKey === selectedCategoryKey) ||
      protocolSections[0],
    [protocolSections, selectedCategoryKey]
  );

  const activeThemeIcons = useMemo(() => {
    const themeKey = String(iconTheme || 'material').toLowerCase();
    return (iconThemes[themeKey] || iconThemes.material || iconThemes.nord)?.icons || {};
  }, [iconTheme]);

  const renderProtocolIcon = useCallback((protocol) => {
    const themeIcon =
      activeThemeIcons[protocol.id] ||
      // Algunos temas usan claves alternativas para VNC/túnel.
      (protocol.id === 'vnc' ? activeThemeIcons.rdp : null) ||
      (protocol.id === 'ssh-tunnel' ? activeThemeIcons['ssh-tunnel'] : null);

    if (themeIcon) {
      return (
        <span className="protocol-option-row-icon protocol-option-row-icon--themed" aria-hidden>
          {React.cloneElement(themeIcon, {
            width: 19,
            height: 19,
            style: {
              ...(themeIcon.props?.style || {}),
              width: '19px',
              height: '19px',
              display: 'block'
            }
          })}
        </span>
      );
    }

    return (
      <div
        className="protocol-option-row-icon"
        style={{ backgroundColor: protocol.iconColor }}
        aria-hidden
      >
        <i className={protocol.icon} />
      </div>
    );
  }, [activeThemeIcons]);

  const headerTitle = String(t('protocolSelection.headerTitle') || t('protocolSelection.title')).toUpperCase();

  const headerTemplate = (
    <AppDialogHeader icon="pi pi-plus" title={headerTitle} />
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={PROTOCOL_PICKER_DIALOG_STYLE}
      modal
      resizable
      className="app-dialog terminal-pro-dialog protocol-selection-dialog-new protocol-selection-picker-compact"
      contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
      closable
    >
      <div className="protocol-selection-layout">
        <div className="protocol-categories-panel" role="tablist" aria-label={t('protocolSelection.title')}>
          {protocolSections.map((section) => (
            <div
              key={section.sectionKey}
              role="tab"
              tabIndex={0}
              aria-selected={selectedCategoryKey === section.sectionKey}
              className={`protocol-category-item ${selectedCategoryKey === section.sectionKey ? 'active' : ''}`}
              data-section-key={section.sectionKey}
              onClick={() => setSelectedCategoryKey(section.sectionKey)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCategoryKey(section.sectionKey);
                }
              }}
            >
              <span className="protocol-category-title">{section.title}</span>
            </div>
          ))}
        </div>

        <div className="protocol-options-panel protocol-options-panel--compact" role="tabpanel">
          {currentSection.protocols.map((protocol) => (
            <div
              key={protocol.id}
              role="button"
              tabIndex={0}
              className="protocol-option-row"
              data-protocol={protocol.id}
              onClick={() => handleProtocolSelect(protocol.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleProtocolSelect(protocol.id);
                }
              }}
            >
              {renderProtocolIcon(protocol)}
              <div className="protocol-option-row-main">
                <div className="protocol-option-row-titleline">
                  <span className="protocol-option-row-title">{protocol.listTitle}</span>
                  <span className="protocol-option-row-pills">
                    {protocol.isInsecure ? (
                      <span className="protocol-option-row-pill protocol-option-row-pill--warn">
                        {t('protocolSelection.badges.insecure')}
                      </span>
                    ) : null}
                    {protocol.isRecommended ? (
                      <span className="protocol-option-row-pill protocol-option-row-pill--info">
                        {t('protocolSelection.badges.recommended')}
                      </span>
                    ) : null}
                    {protocol.infoBadge ? (
                      <span
                        className={`protocol-option-row-pill protocol-option-row-pill--${protocol.infoBadgeTone || 'neutral'}`}
                      >
                        {protocol.infoBadge}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="protocol-option-row-tagline">{protocol.tagline}</div>
              </div>
              <i className="pi pi-angle-right protocol-option-row-chevron" aria-hidden />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
