import React from 'react';
import NetworkToolsDialog from './NetworkToolsDialog';

const NetworkToolTab = ({ tab }) => {
  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <NetworkToolsDialog standalone={true} toolId={tab.toolId} />
    </div>
  );
};

export default NetworkToolTab;
