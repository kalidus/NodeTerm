import React from 'react';
import AIChatPanel from './AIChatPanel';

const AIChatTab = () => {
  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'transparent'
    }}>
      <AIChatPanel />
    </div>
  );
};

export default AIChatTab;
