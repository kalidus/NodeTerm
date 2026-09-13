import React from 'react';
import NetworkToolsDialog from './NetworkToolsDialog';

const NetworkToolTab = ({ tab }) => {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--ui-content-bg, #10141c)'
      }}
    >
      <NetworkToolsDialog standalone={true} toolId={tab.toolId} />
    </div>
  );
};

export default NetworkToolTab;
