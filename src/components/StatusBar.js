import React from 'react';

const StatusBar = ({ stats }) => {
  if (!stats) {
    return null; // Don't render anything if there are no stats
  }

  return (
    <div className="status-bar">
      <div className="status-item" title="CPU Load">
        <i className="pi pi-chip" style={{ marginRight: '5px' }}></i>
        <span>{stats.cpu}%</span>
      </div>
      <div className="status-item" title="Memory Usage">
        <i className="pi pi-server" style={{ marginRight: '5px', marginLeft: '10px' }}></i>
        <span className="ram-text">{stats.mem.used}G / {stats.mem.total}G</span>
      </div>
      {stats.disks && stats.disks.map(disk => (
        <div key={disk.name} className="status-item-disk" title={`Disk: ${disk.name}`}>
          <span className="disk-name">{disk.name === '/' ? '/ ' : disk.name}:</span>
          <span className="disk-usage">{disk.use}%</span>
        </div>
      ))}
    </div>
  );
};

export default StatusBar; 