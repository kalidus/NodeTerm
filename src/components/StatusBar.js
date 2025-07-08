import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp, faServer } from '@fortawesome/free-solid-svg-icons';
import { FaHdd, FaMemory, FaMicrochip, FaArrowUp, FaArrowDown, FaClock, FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian } from 'react-icons/si';
import { getVersionInfo } from '../version-info';

const CpuSparkline = ({ history }) => (
    <div className="sparkline-container">
        <div className="sparkline-bars">
            {history.map((value, index) => (
                <div
                    key={index}
                    className="sparkline-bar"
                    style={{ height: `${Math.max(value, 1)}%` }} // Ensure a minimum height of 1% for visibility
                />
            ))}
        </div>
    </div>
);

const DistroIcon = ({ distro }) => {
    switch (distro) {
        case 'ubuntu':
            return <FaUbuntu />;
        case 'debian':
            return <SiDebian />;
        case 'rhel':
        case 'redhat':
            return <FaRedhat />;
        case 'centos':
            return <FaCentos />;
        case 'fedora':
            return <FaFedora />;
        case 'arch':
        default:
            return <FaLinux />;
    }
};

const StatusBar = ({ stats }) => {
    // Obtener la versión de la aplicación de forma segura
    const { appVersion } = getVersionInfo();
    
    if (!stats) {
        // Mostrar solo la barra vacía si no hay stats
        return (
            <div className="status-bar">
                <div className="status-group"></div>
            </div>
        );
    }

    const { cpu, mem, disk, cpuHistory, uptime, network, hostname, distro, ip } = stats;

    const formatBytes = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
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
                {hostname && (
                    <div className="status-bar-section">
                        <DistroIcon distro={distro} />
                        <span>{hostname}</span>
                    </div>
                )}
                {cpu !== undefined && (
                    <div className="status-bar-section cpu-section">
                        <FontAwesomeIcon 
                            icon={faMicrochip} 
                            className="status-bar-icon" 
                            style={{ color: 'var(--statusbar-cpu-color, var(--statusbar-icon-color, inherit))' }}
                        />
                        <span>{cpu}%</span>
                        <CpuSparkline history={cpuHistory} />
                    </div>
                )}
                {mem && mem.total > 0 && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon 
                            icon={faMemory} 
                            className="status-bar-icon" 
                            style={{ color: 'var(--statusbar-memory-color, var(--statusbar-icon-color, inherit))' }}
                        />
                        <span>{formatBytes(mem.used)} / {formatBytes(mem.total)}</span>
                    </div>
                )}
                {network && (
                    <div className="status-bar-section network-section">
                        <FontAwesomeIcon 
                            icon={faArrowDown} 
                            className="status-bar-icon" 
                            style={{ color: 'var(--statusbar-network-down-color, var(--statusbar-icon-color, inherit))' }}
                        />
                        <span>{formatSpeed(network.rx_speed)}</span>
                        <FontAwesomeIcon 
                            icon={faArrowUp} 
                            className="status-bar-icon" 
                            style={{ 
                                marginLeft: '5px',
                                color: 'var(--statusbar-network-up-color, var(--statusbar-icon-color, inherit))' 
                            }}
                        />
                        <span>{formatSpeed(network.tx_speed)}</span>
                    </div>
                )}
                {disk && disk.length > 0 && (
                    <div className="status-bar-section disk-section">
                        {disk.map((d, index) => (
                            <div key={index} className="disk-info-item">
                                <FontAwesomeIcon 
                                    icon={faHdd} 
                                    className="status-bar-icon" 
                                    style={{ color: 'var(--statusbar-disk-color, var(--statusbar-icon-color, inherit))' }}
                                />
                                <span className="disk-info-text">{d.fs}: {d.use}%</span>
                            </div>
                        ))}
                    </div>
                )}
                {uptime && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon 
                            icon={faClock} 
                            className="status-bar-icon" 
                            style={{ color: 'var(--statusbar-icon-color, inherit)' }}
                        />
                        <span>{uptime}</span>
                    </div>
                )}
                {ip && (
                    <div className="status-bar-section">
                        <FontAwesomeIcon 
                            icon={faServer} 
                            className="status-bar-icon" 
                            style={{ color: 'var(--statusbar-icon-color, inherit)' }}
                        />
                        <span>{ip}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusBar;