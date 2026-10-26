import React, { useState } from 'react';
import ToolViewSwitch from '../common/ToolViewSwitch';
import MyNetworkPanel from './MyNetworkPanel';
import NeighborsPanel from './NeighborsPanel';
import RoutesPanel from './RoutesPanel';

const VIEWS = [
  { id: 'interfaces', label: 'Interfaces' },
  { id: 'neighbors', label: 'Vecinos' },
  { id: 'routes', label: 'Rutas' }
];

const LocalHostPanel = ({ isMobile = false, initialView = 'interfaces' }) => {
  const start = VIEWS.some((view) => view.id === initialView) ? initialView : 'interfaces';
  const [view, setView] = useState(start);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <ToolViewSwitch views={VIEWS} value={view} onChange={setView} accent="#8b5cf6" />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        {view === 'neighbors' && <NeighborsPanel isMobile={isMobile} />}
        {view === 'routes' && <RoutesPanel isMobile={isMobile} />}
        {view === 'interfaces' && <MyNetworkPanel isMobile={isMobile} />}
      </div>
    </div>
  );
};

export default LocalHostPanel;
