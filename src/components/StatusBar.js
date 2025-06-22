import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd } from '@fortawesome/free-solid-svg-icons';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const StatusBar = ({ stats }) => {
    if (!stats) {
        return null;
    }

    const { cpu, mem, disk, cpuHistory } = stats;

    const formatBytes = (bytes) => {
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        if (bytes === 0) return '0 B';
        const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
    };

    return (
        <div className="status-bar">
            <div className="status-group">
                {cpu !== undefined && (
                    <div className="status-bar-section cpu-section">
                        <FontAwesomeIcon icon={faMicrochip} className="status-bar-icon" />
                        <span>{cpu}%</span>
                        <div className="sparkline-container">
                            <Sparklines data={cpuHistory} width={100} height={20} margin={5}>
                                <SparklinesLine color="#2cce10" />
                            </Sparklines>
                        </div>
                    </div>
                )}
                {mem && mem.total > 0 && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon icon={faMemory} className="status-bar-icon" />
                        <span>{formatBytes(mem.used)} / {formatBytes(mem.total)}</span>
                    </div>
                )}
                {disk && disk.length > 0 && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon icon={faHdd} className="status-bar-icon" />
                        {disk.map((d, index) => (
                            <span key={index} className="disk-info">
                                {d.fs}: {d.use}%
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusBar;