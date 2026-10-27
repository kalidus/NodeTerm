import React, { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { SSHIconSelectorModal } from '../SSHIconSelector';
import { iconThemes } from '../../themes/icon-themes';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { AppDialogHeader } from '../ui/AppDialog';
import {
  TERMINAL_PRO_DIALOG_STYLE,
  TERMINAL_PRO_DIALOG_CONTENT_STYLE,
  TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE
} from '../EnhancedRDPForm';
import { EnhancedSSHForm } from './EnhancedSSHForm';
import { resolveSSHIconPreset, renderSSHDialogHeaderIconContent } from './sshDialogHeaderHelpers';

// --- EditSSHConnectionDialog: Diálogo independiente para editar conexiones SSH ---
export function EditSSHConnectionDialog({
  visible,
  onHide,
  editNodeData,
  sshName, setSSHName,
  sshHost, setSSHHost,
  sshUser, setSSHUser,
  sshPassword, setSSHPassword,
  sshPort, setSSHPort,
  sshRemoteFolder, setSSHRemoteFolder,
  sshTargetFolder, setSSHTargetFolder,
  sshAuthMethod = 'password', setSSHAuthMethod = () => {},
  sshPrivateKey = '', setSSHPrivateKey = () => {},
  sshAutoCopyPassword = false, setSSHAutoCopyPassword = () => {},
  sshX11Forwarding = false, setSSHX11Forwarding = () => {},
  sshAgentForwarding = false, setSSHAgentForwarding = () => {},
  sshAutoRecording = false, setSSHAutoRecording = () => {},
  sshProxyJumpEnabled = false, setSSHProxyJumpEnabled = () => {},
  sshJumpHost = '', setSSHJumpHost = () => {},
  sshJumpPort = 22, setSSHJumpPort = () => {},
  sshJumpUser = '', setSSHJumpUser = () => {},
  sshJumpAuthMethod = 'password', setSSHJumpAuthMethod = () => {},
  sshJumpPassword = '', setSSHJumpPassword = () => {},
  sshJumpPrivateKey = '', setSSHJumpPrivateKey = () => {},
  sshHostKeyPolicy = 'warn_new', setSSHHostKeyPolicy = () => {},
  sshDescription = '', setSSHDescription = () => {},
  sshIcon = null, setSSHIcon = () => {},
  sshUseBastionWallix = false, setSSHUseBastionWallix = () => {},
  foldersOptions = [],
  onSSHConfirm,
  sshLoading = false,
  iconTheme = 'material'
}) {
  // Hook de internacionalización
  const { t } = useTranslation('dialogs');
  
  // Estado para el modal del selector de iconos
  const [showIconSelector, setShowIconSelector] = useState(false);
  
  const currentIconPreset = useMemo(() => resolveSSHIconPreset(sshIcon), [sshIcon]);
  
  // Obtener el icono SSH del tema actual
  const themeSSHIcon = useMemo(() => {
    const theme = iconThemes[iconTheme] || iconThemes['material'];
    return theme?.icons?.ssh || null;
  }, [iconTheme]);
  
  // Precargar datos cuando se abre el diálogo
  useEffect(() => {
    if (editNodeData && visible) {
      if (setSSHName) setSSHName(editNodeData.label || '');
      if (setSSHHost) setSSHHost(editNodeData.data?.bastionHost || editNodeData.data?.host || '');
      if (setSSHUser) setSSHUser(editNodeData.data?.useBastionWallix ? editNodeData.data?.bastionUser || '' : editNodeData.data?.user || '');
      if (setSSHPassword) setSSHPassword(editNodeData.data?.password || '');
      if (setSSHAuthMethod) setSSHAuthMethod(deriveSSHAuthMethod(editNodeData.data));
      if (setSSHPrivateKey) setSSHPrivateKey(editNodeData.data?.privateKey || '');
      if (setSSHRemoteFolder) setSSHRemoteFolder(editNodeData.data?.remoteFolder || '');
      if (setSSHPort) setSSHPort(editNodeData.data?.port || 22);
      if (setSSHAutoCopyPassword && typeof setSSHAutoCopyPassword === 'function') {
        setSSHAutoCopyPassword(editNodeData.data?.autoCopyPassword || false);
      }
      if (setSSHX11Forwarding && typeof setSSHX11Forwarding === 'function') {
        setSSHX11Forwarding(editNodeData.data?.x11Forwarding || false);
      }
      if (setSSHAgentForwarding && typeof setSSHAgentForwarding === 'function') {
        setSSHAgentForwarding(editNodeData.data?.agentForwarding || false);
      }
      if (setSSHAutoRecording && typeof setSSHAutoRecording === 'function') {
        setSSHAutoRecording(editNodeData.data?.autoRecording || false);
      }
      if (setSSHProxyJumpEnabled && typeof setSSHProxyJumpEnabled === 'function') {
        setSSHProxyJumpEnabled(editNodeData.data?.proxyJumpEnabled || false);
      }
      if (setSSHJumpHost && typeof setSSHJumpHost === 'function') {
        setSSHJumpHost(editNodeData.data?.jumpHost || '');
      }
      if (setSSHJumpPort && typeof setSSHJumpPort === 'function') {
        setSSHJumpPort(editNodeData.data?.jumpPort || 22);
      }
      if (setSSHJumpUser && typeof setSSHJumpUser === 'function') {
        setSSHJumpUser(editNodeData.data?.jumpUser || '');
      }
      if (setSSHJumpAuthMethod && typeof setSSHJumpAuthMethod === 'function') {
        setSSHJumpAuthMethod(editNodeData.data?.jumpAuthMethod === 'key' ? 'key' : 'password');
      }
      if (setSSHJumpPassword && typeof setSSHJumpPassword === 'function') {
        setSSHJumpPassword(editNodeData.data?.jumpPassword || '');
      }
      if (setSSHJumpPrivateKey && typeof setSSHJumpPrivateKey === 'function') {
        setSSHJumpPrivateKey(editNodeData.data?.jumpPrivateKey || '');
      }
      if (setSSHHostKeyPolicy && typeof setSSHHostKeyPolicy === 'function') {
        setSSHHostKeyPolicy(editNodeData.data?.hostKeyPolicy || 'warn_new');
      }
      if (setSSHDescription && typeof setSSHDescription === 'function') {
        setSSHDescription(editNodeData.data?.description || '');
      }
      if (setSSHIcon && typeof setSSHIcon === 'function') {
        setSSHIcon(editNodeData.data?.customIcon || null);
      }
      if (setSSHUseBastionWallix && typeof setSSHUseBastionWallix === 'function') {
        setSSHUseBastionWallix(!!(editNodeData.data?.useBastionWallix || editNodeData.data?.isBastion));
      }
    }
  }, [editNodeData, visible, setSSHName, setSSHHost, setSSHUser, setSSHPassword, setSSHAuthMethod, setSSHPrivateKey, setSSHRemoteFolder, setSSHPort, setSSHAutoCopyPassword, setSSHX11Forwarding, setSSHAgentForwarding, setSSHAutoRecording, setSSHProxyJumpEnabled, setSSHJumpHost, setSSHJumpPort, setSSHJumpUser, setSSHJumpAuthMethod, setSSHJumpPassword, setSSHJumpPrivateKey, setSSHHostKeyPolicy, setSSHDescription, setSSHIcon, setSSHUseBastionWallix]);

  // Handler para seleccionar icono
  const handleIconSelect = useCallback((iconId) => {
    if (setSSHIcon && typeof setSSHIcon === 'function') {
      setSSHIcon(iconId === 'default' || iconId == null ? null : iconId);
    }
  }, [setSSHIcon]);

  const headerTemplate = (
    <AppDialogHeader
      icon={(
        <button
          type="button"
          onClick={() => setShowIconSelector(true)}
          className="app-dialog-header-icon-btn"
          title="Cambiar Icono"
        >
          {renderSSHDialogHeaderIconContent(currentIconPreset, themeSSHIcon)}
        </button>
      )}
      title={t('ssh.title.edit').toUpperCase()}
    />
  );

  return (
    <>
      <Dialog
        header={headerTemplate}
        visible={visible}
        style={TERMINAL_PRO_DIALOG_STYLE}
        modal
        resizable
        onHide={onHide}
        contentStyle={TERMINAL_PRO_DIALOG_CONTENT_STYLE}
        className="app-dialog terminal-pro-dialog"
        closable={false}
      >
        <div style={TERMINAL_PRO_DIALOG_FORM_WRAPPER_STYLE}>
          <EnhancedSSHForm
            activeTabIndex={0}
            sshName={sshName}
            setSSHName={setSSHName}
            sshHost={sshHost}
            setSSHHost={setSSHHost}
            sshUser={sshUser}
            setSSHUser={setSSHUser}
            sshPassword={sshPassword}
            setSSHPassword={setSSHPassword}
            sshPort={sshPort}
            setSSHPort={setSSHPort}
            sshRemoteFolder={sshRemoteFolder}
            setSSHRemoteFolder={setSSHRemoteFolder}
            sshTargetFolder={sshTargetFolder}
            setSSHTargetFolder={setSSHTargetFolder}
            sshAuthMethod={sshAuthMethod}
            setSSHAuthMethod={setSSHAuthMethod}
            sshPrivateKey={sshPrivateKey}
            setSSHPrivateKey={setSSHPrivateKey}
            sshAutoCopyPassword={sshAutoCopyPassword}
            setSSHAutoCopyPassword={setSSHAutoCopyPassword}
            sshX11Forwarding={sshX11Forwarding}
            setSSHX11Forwarding={setSSHX11Forwarding}
            sshAgentForwarding={sshAgentForwarding}
            setSSHAgentForwarding={setSSHAgentForwarding}
            sshAutoRecording={sshAutoRecording}
            setSSHAutoRecording={setSSHAutoRecording}
            sshProxyJumpEnabled={sshProxyJumpEnabled}
            setSSHProxyJumpEnabled={setSSHProxyJumpEnabled}
            sshJumpHost={sshJumpHost}
            setSSHJumpHost={setSSHJumpHost}
            sshJumpPort={sshJumpPort}
            setSSHJumpPort={setSSHJumpPort}
            sshJumpUser={sshJumpUser}
            setSSHJumpUser={setSSHJumpUser}
            sshJumpAuthMethod={sshJumpAuthMethod}
            setSSHJumpAuthMethod={setSSHJumpAuthMethod}
            sshJumpPassword={sshJumpPassword}
            setSSHJumpPassword={setSSHJumpPassword}
            sshJumpPrivateKey={sshJumpPrivateKey}
            setSSHJumpPrivateKey={setSSHJumpPrivateKey}
            sshHostKeyPolicy={sshHostKeyPolicy}
            setSSHHostKeyPolicy={setSSHHostKeyPolicy}
            sshDescription={sshDescription}
            setSSHDescription={setSSHDescription}
            sshUseBastionWallix={sshUseBastionWallix}
            setSSHUseBastionWallix={setSSHUseBastionWallix}
            foldersOptions={foldersOptions}
            onSSHConfirm={onSSHConfirm}
            onHide={onHide}
            sshLoading={sshLoading}
            isEditMode
          />
        </div>
      </Dialog>
      
      {/* Modal selector de iconos SSH */}
      <SSHIconSelectorModal
        visible={showIconSelector}
        onHide={() => setShowIconSelector(false)}
        selectedIconId={sshIcon ?? 'default'}
        onSelectIcon={handleIconSelect}
      />
    </>
  );
}
