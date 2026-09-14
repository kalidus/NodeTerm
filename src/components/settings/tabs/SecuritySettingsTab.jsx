import React, { useCallback } from 'react';
import MasterKeySubTab from './security/MasterKeySubTab';
import AuditSubTab from './security/AuditSubTab';

const SecuritySettingsTab = ({
  contentHeight,
  activeSubTab = 'clave-maestra',
  onMasterPasswordConfigured,
  onMasterPasswordChanged,
  showToast,
  toastRef,
  onHide,
  isVisible = true
}) => {
  const handleShowToast = useCallback((severity, summary, detail, life = 3000) => {
    if (typeof showToast === 'function') {
      showToast(severity, summary, detail, life);
    } else if (toastRef?.current?.show) {
      toastRef.current.show({ severity, summary, detail, life });
    }
  }, [showToast, toastRef]);

  const currentSubTab = activeSubTab || 'clave-maestra';

  return (
    <div
      className="settings-tab-outer-wrapper"
      style={{
        height: contentHeight ? `${contentHeight}px` : '100%',
        maxHeight: contentHeight ? `${contentHeight}px` : '100%',
        minHeight: contentHeight ? `${contentHeight}px` : '100%',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{
        height: '100%',
        maxHeight: '100%',
        minHeight: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'absolute',
        top: 0,
        left: 0,
        right: '8px',
        bottom: 0,
        width: 'calc(100% - 8px)',
        padding: '1rem 1.5rem 1.5rem 1.5rem'
      }}>
        {currentSubTab === 'clave-maestra' && (
          <MasterKeySubTab
            onMasterPasswordConfigured={onMasterPasswordConfigured}
            onMasterPasswordChanged={onMasterPasswordChanged}
            showToast={handleShowToast}
            toastRef={toastRef}
          />
        )}
        {currentSubTab === 'auditoria' && (
          <AuditSubTab
            onHide={onHide}
            showToast={handleShowToast}
            toastRef={toastRef}
            isVisible={isVisible}
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(SecuritySettingsTab);
