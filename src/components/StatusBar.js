import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp } from '@fortawesome/free-solid-svg-icons';
import { Sparklines, SparklinesLine } from 'react-sparklines';

const StatusBar = ({ stats }) => {
    if (!stats) {
        return null;
    }

    const { cpu, mem, disk, cpuHistory, uptime, network } = stats;

    const formatBytes = (bytes) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    const formatSpeed = (bytesPerSecond) => {
        if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
        const k = 1024;
        const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
        const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));
        return `${(bytesPerSecond / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
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
                {network && (
                    <div className="status-bar-section network-section">
                        <FontAwesomeIcon icon={faArrowDown} className="status-bar-icon" />
                        <span>{formatSpeed(network.rx_speed)}</span>
                        <FontAwesomeIcon icon={faArrowUp} className="status-bar-icon" style={{ marginLeft: '5px' }} />
                        <span>{formatSpeed(network.tx_speed)}</span>
                    </div>
                )}
                {disk && disk.length > 0 && (
                    <div className="status-bar-section disk-section">
                        {disk.map((d, index) => (
                            <div key={index} className="disk-info-item">
                                <FontAwesomeIcon icon={faHdd} className="status-bar-icon" />
                                <span className="disk-info-text">{d.fs}: {d.use}%</span>
                            </div>
                        ))}
                    </div>
                )}
                {uptime && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon icon={faClock} className="status-bar-icon" />
                        <span>{uptime}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusBar;