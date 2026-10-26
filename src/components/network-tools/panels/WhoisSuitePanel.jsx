import React, { useState } from 'react';
import ToolViewSwitch from '../common/ToolViewSwitch';
import WhoisPanel from './WhoisPanel';
import WhoisIpPanel from './WhoisIpPanel';

const VIEWS = [
  { id: 'domain', label: 'Dominio' },
  { id: 'ip', label: 'IP' }
];

const WhoisSuitePanel = ({ isMobile = false, initialView = 'domain' }) => {
  const start = initialView === 'ip' ? 'ip' : 'domain';
  const [view, setView] = useState(start);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ToolViewSwitch views={VIEWS} value={view} onChange={setView} accent="#3b82f6" />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'ip'
          ? <WhoisIpPanel isMobile={isMobile} />
          : <WhoisPanel isMobile={isMobile} />}
      </div>
    </div>
  );
};

export default WhoisSuitePanel;
