import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp, faServer } from '@fortawesome/free-solid-svg-icons';
import { FaHdd, FaMemory, FaMicrochip, FaArrowUp, FaArrowDown, FaClock, FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora } from 'react-icons/fa';
import { SiDebian } from 'react-icons/si';
import { getVersionInfo } from '../version-info';
import { statusBarIconThemes } from '../themes/statusbar-icon-themes';

const CpuSparkline = ({ history }) => (
    <div className="sparkline-container">
        <div className="sparkline-bars">
            {history.map((value, index) => (
                <div
                    key={index}
                    className="sparkline-bar"
                    style={{ height: `${Math.max(value, 1)}%` }}
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

const StatusBar = ({ stats, active, statusBarIconTheme = 'classic' }) => {
    // Obtener la versión de la aplicación de forma segura
    const { appVersion } = getVersionInfo();
    
    // Obtener el tema de iconos actual
    const currentIconTheme = statusBarIconThemes[statusBarIconTheme] || statusBarIconThemes.classic;
    

    if (!stats) {
        // Mostrar solo la barra vacía si no hay stats
        return (
            <div className="status-bar">
                <div className="status-group"></div>
            </div>
        );
    }

    const { cpu, mem, disk, cpuHistory, uptime, network, hostname, distro, ip, versionId = '' } = stats;

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
                        <span 
                            className="status-bar-icon cpu" 
                            style={{ color: currentIconTheme.colors.cpu }}
                        >
                            {currentIconTheme.icons.cpu}
                        </span>
                        <span>{cpu}%</span>
                        <CpuSparkline history={cpuHistory || []} />
                    </div>
                )}
                {mem && mem.total > 0 && (
                    <div className="status-bar-section">
                        <span 
                            className="status-bar-icon mem" 
                            style={{ color: currentIconTheme.colors.memory }}
                        >
                            {currentIconTheme.icons.memory}
                        </span>
                        <span>{formatBytes(mem.used)} / {formatBytes(mem.total)}</span>
                    </div>
                )}
                {network && (
                    <div className="status-bar-section network-section">
                        <span 
                            className="status-bar-icon net-down" 
                            style={{ color: currentIconTheme.colors.networkDown }}
                        >
                            {currentIconTheme.icons.networkDown}
                        </span>
                        <span>{formatSpeed(network.rx_speed)}</span>
                        <span 
                            className="status-bar-icon net-up" 
                            style={{ color: currentIconTheme.colors.networkUp, marginLeft: '5px' }}
                        >
                            {currentIconTheme.icons.networkUp}
                        </span>
                        <span>{formatSpeed(network.tx_speed)}</span>
                    </div>
                )}
                {disk && disk.length > 0 && (
                    <div className="status-bar-section disk-section">
                        {disk.map((d, index) => (
                            <div key={index} className="disk-info-item">
                                <span 
                                    className="status-bar-icon disk" 
                                    style={{ color: currentIconTheme.colors.disk }}
                                >
                                    {currentIconTheme.icons.disk}
                                </span>
                                <span className="disk-info-text">{d.fs}: {d.use}%</span>
                            </div>
                        ))}
                    </div>
                )}
                {uptime && (
                    <div className="status-bar-section">
                        <span 
                            className="status-bar-icon" 
                            style={{ color: currentIconTheme.colors.uptime }}
                        >
                            {currentIconTheme.icons.uptime}
                        </span>
                        <span>{uptime}</span>
                    </div>
                )}
                {ip && (
                    <div className="status-bar-section">
                        <span 
                            className="status-bar-icon" 
                            style={{ color: currentIconTheme.colors.server }}
                        >
                            {currentIconTheme.icons.server}
                        </span>
                        <span>{ip}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatusBar;