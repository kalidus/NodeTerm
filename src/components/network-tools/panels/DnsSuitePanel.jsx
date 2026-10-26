import React, { useState } from 'react';
import ToolViewSwitch from '../common/ToolViewSwitch';
import DnsLookupPanel from './DnsLookupPanel';
import DnsComparePanel from './DnsComparePanel';
import MailDnsPanel from './MailDnsPanel';

const VIEWS = [
  { id: 'lookup', label: 'Resolución' },
  { id: 'compare', label: 'Comparar' },
  { id: 'mail', label: 'Correo' }
];

const DnsSuitePanel = ({ isMobile = false, initialView = 'lookup', initialMode = 'forward' }) => {
  const start = VIEWS.some((view) => view.id === initialView) ? initialView : 'lookup';
  const [view, setView] = useState(start);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ToolViewSwitch views={VIEWS} value={view} onChange={setView} accent="#3b82f6" />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'compare' && <DnsComparePanel isMobile={isMobile} />}
        {view === 'mail' && <MailDnsPanel isMobile={isMobile} />}
        {view === 'lookup' && <DnsLookupPanel isMobile={isMobile} initialMode={initialMode} />}
      </div>
    </div>
  );
};

export default DnsSuitePanel;
