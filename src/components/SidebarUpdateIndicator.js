import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n/hooks/useTranslation';

const SidebarUpdateIndicator = ({ onUpdateStatusClick, onConfigClick }) => {
  const { t: tSettings } = useTranslation('settings');
  const [updateStatus, setUpdateStatus] = useState('idle');

  useEffect(() => {
    if (!window.electron?.updater) return;
    const handleUpdaterEvent = (ev) => {
      const { event } = ev;
      if (event === 'update-available') setUpdateStatus('available');
      else if (event === 'update-downloaded') setUpdateStatus('downloaded');
      else if (event === 'update-not-available' || event === 'error') setUpdateStatus('idle');
    };
    window.electron.updater.getUpdateInfo?.().then((result) => {
      if (result?.isUpdateDownloaded) setUpdateStatus('downloaded');
      else if (result?.updateAvailable) setUpdateStatus('available');
    }).catch(() => { });
    const unsubscribe = window.electron.ipcRenderer?.on?.('updater-event', handleUpdaterEvent);
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, []);

  if (updateStatus === 'idle') return null;

  const handleClick = () => {
    if (onUpdateStatusClick) onUpdateStatusClick();
    else if (onConfigClick) onConfigClick();
  };

  return (
    <button
      type="button"
      className="sidebar-panel-toolbar-btn sidebar-panel-toolbar-btn--update"
      onClick={handleClick}
      title={updateStatus === 'downloaded' ? tSettings('updateChannels.downloadCompleteDetail') : tSettings('updateChannels.available')}
      style={{
        color: updateStatus === 'downloaded' ? 'var(--green-500)' : 'var(--primary-color)',
        opacity: 1
      }}
    >
      <i className={updateStatus === 'downloaded' ? 'pi pi-check-circle' : 'pi pi-cloud-download'} />
    </button>
  );
};

export default SidebarUpdateIndicator;
