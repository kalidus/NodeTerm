import React, { useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMicrochip, faMemory, faHdd, faClock, faArrowDown, faArrowUp, faServer, faDesktop } from '@fortawesome/free-solid-svg-icons';
import { FaHdd, FaMemory, FaMicrochip, FaArrowUp, FaArrowDown, FaClock, FaLinux, FaUbuntu, FaRedhat, FaCentos, FaFedora, FaWindows, FaNetworkWired } from 'react-icons/fa';
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
    const id = String(distro || '').toLowerCase();
    switch (id) {
        // Windows host
        case 'windows':
        case 'win':
        case 'win32':
            return <FaWindows />;

        // Debian family
        case 'ubuntu':
        case 'ubuntu-core':
        case 'ubuntu_server':
            return <FaUbuntu />;
        case 'debian':
            return <SiDebian />;

        // RedHat family
        case 'rhel':
        case 'redhat':
        case 'red hat enterprise linux':
            return <FaRedhat />;
        case 'centos':
            return <FaCentos />;
        case 'fedora':
            return <FaFedora />;
        case 'rocky':
        case 'rockylinux':
        case 'alma':
        case 'almalinux':
        case 'oracle':
        case 'ol':
            return <FaLinux />;

        // SUSE family
        case 'opensuse':
        case 'opensuse-leap':
        case 'opensuse-tumbleweed':
        case 'suse':
        case 'sles':
            return <FaLinux />;

        // Arch family
        case 'arch':
        case 'archlinux':
        case 'manjaro':
            return <FaLinux />;

        // Other popular distros
        case 'alpine':
        case 'alpinelinux':
        case 'kali':
        case 'kalilinux':
        case 'gentoo':
        case 'linuxmint':
        case 'amazon':
        case 'amzn':
        case 'pop':
        case 'pop_os':
        case 'pop-os':
        case 'elementary':
        case 'elementaryos':
        case 'zorin':
            return <FaLinux />;

        default:
            return <FaLinux />;
    }
};

const StatusBar = ({ stats, active, statusBarIconTheme = 'classic', showNetworkDisks = true, isLoading = false, gpuStats = null }) => {
    // Obtener la versión de la aplicación de forma segura
    const { appVersion } = getVersionInfo();
    
    // Obtener el tema de iconos actual
    const currentIconTheme = statusBarIconThemes[statusBarIconTheme] || statusBarIconThemes.classic;
    
    // Componente memoizado para el icono de GPU (basado en la imagen proporcionada)
    const GPUIcon = useMemo(() => {
        // SVG de tarjeta gráfica que coincide con la imagen del usuario
        return (
            <svg 
                viewBox="0 0 100 60" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                style={{ 
                    display: 'block',
                    width: '1em',
                    height: '1em',
                    minWidth: '22px',
                    minHeight: '22px'
                }}
            >
                {/* Bracket vertical oscuro (dark teal) - extremo izquierdo */}
                <rect x="2" y="20" width="4" height="35" fill="#2C5F5F" rx="0.5"/>
                
                {/* Bloques naranjas/amarillos apilados verticalmente (puertos) */}
                <rect x="7" y="25" width="6" height="8" fill="#FF9800" rx="0.5"/>
                <rect x="7" y="35" width="6" height="8" fill="#FFB74D" rx="0.5"/>
                
                {/* Sección verde brillante (PCB) con líneas horizontales */}
                <rect x="15" y="22" width="14" height="32" fill="#66BB6A" rx="1"/>
                <line x1="16" y1="28" x2="27" y2="28" stroke="#4CAF50" strokeWidth="1.5"/>
                <line x1="16" y1="32" x2="27" y2="32" stroke="#4CAF50" strokeWidth="1.5"/>
                <line x1="16" y1="36" x2="27" y2="36" stroke="#4CAF50" strokeWidth="1.5"/>
                
                {/* Cuerpo principal azul oscuro con esquina angular */}
                <path d="M30 15 L88 15 L88 52 L30 52 Z" fill="#546E7A" rx="1"/>
                <rect x="30" y="15" width="58" height="37" fill="#455A64" rx="1"/>
                
                {/* Ventilador izquierdo - círculo azul claro */}
                <circle cx="42" cy="36" r="7" fill="#81D4FA"/>
                {/* Hélice de 4 aspas del ventilador izquierdo */}
                <path d="M42 29 L42 43 M35 36 L49 36 M38 33 L46 39 M46 33 L38 39" 
                      stroke="#546E7A" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      fill="#455A64"/>
                
                {/* Ventilador derecho - círculo azul claro */}
                <circle cx="62" cy="36" r="7" fill="#81D4FA"/>
                {/* Hélice de 4 aspas del ventilador derecho */}
                <path d="M62 29 L62 43 M55 36 L69 36 M58 33 L66 39 M66 33 L58 39" 
                      stroke="#546E7A" 
                      strokeWidth="2" 
                      strokeLinecap="round"
                      fill="#455A64"/>
                
                {/* Pequeños cuadrados azul claro en el cuerpo */}
                <rect x="73" y="18" width="3" height="3" fill="#81D4FA" rx="0.3"/>
                <rect x="77" y="18" width="3" height="3" fill="#81D4FA" rx="0.3"/>
                <rect x="82" y="18" width="3" height="3" fill="#81D4FA" rx="0.3"/>
                
                {/* Línea horizontal azul claro en la parte inferior */}
                <line x1="30" y1="50" x2="88" y2="50" stroke="#81D4FA" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
        );
    }, []);
    
    // Función para obtener color de GPU según el tipo
    const getGPUColor = (type) => {
        if (!type) return currentIconTheme.colors.memory;
        if (type.toLowerCase().includes('nvidia')) return '#76b900'; // Verde NVIDIA
        if (type.toLowerCase().includes('amd')) return '#ED1C24'; // Rojo AMD
        if (type.toLowerCase().includes('apple')) return '#A8A8A8'; // Gris Apple
        return '#9c27b0'; // Púrpura por defecto para GPU
    };
    
    // Mostrar estado de carga si no hay stats o está cargando
    if (!stats || isLoading) {
        return (
            <div className="status-bar">
                <div className="status-group">
                    <div className="status-bar-section loading-section">
                        <span 
                            className="status-bar-icon cpu loading" 
                            style={{ color: currentIconTheme.colors.cpu }}
                        >
                            {currentIconTheme.icons.cpu}
                        </span>
                        <span className="loading-text">--%</span>
                        <div className="sparkline-container loading">
                            <div className="sparkline-bars">
                                {Array.from({ length: 10 }, (_, i) => (
                                    <div key={i} className="sparkline-bar loading" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="status-bar-section loading-section">
                        <span 
                            className="status-bar-icon mem loading" 
                            style={{ color: currentIconTheme.colors.memory }}
                        >
                            {currentIconTheme.icons.memory}
                        </span>
                        <span className="loading-text">-- / --</span>
                    </div>
                    <div className="status-bar-section loading-section">
                        <span 
                            className="status-bar-icon net-down loading" 
                            style={{ color: currentIconTheme.colors.networkDown }}
                        >
                            {currentIconTheme.icons.networkDown}
                        </span>
                        <span className="loading-text">-- B/s</span>
                        <span 
                            className="status-bar-icon net-up loading" 
                            style={{ color: currentIconTheme.colors.networkUp, marginLeft: '5px' }}
                        >
                            {currentIconTheme.icons.networkUp}
                        </span>
                        <span className="loading-text">-- B/s</span>
                    </div>
                </div>
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
                {gpuStats && gpuStats.ok && gpuStats.type && (
                    <div className="status-bar-section gpu-section" title={gpuStats.name || `${gpuStats.type.toUpperCase()} GPU`}>
                        <span 
                            className="status-bar-icon gpu" 
                            style={{ 
                                color: getGPUColor(gpuStats.type),
                                display: 'inline-flex',
                                alignItems: 'center',
                                fontSize: 'calc(var(--statusbar-height, 40px) * 0.75)',
                                lineHeight: '1'
                            }}
                        >
                            {GPUIcon}
                        </span>
                        {gpuStats.totalMB && gpuStats.usedMB !== null ? (
                            <span>{Math.round(gpuStats.usedMB / 1024 * 10) / 10}GB / {Math.round(gpuStats.totalMB / 1024 * 10) / 10}GB</span>
                        ) : (
                            <span>{gpuStats.type.toUpperCase()}</span>
                        )}
                        {gpuStats.temperature !== null && (
                            <span style={{ marginLeft: '4px' }}>
                                {gpuStats.temperature}°C
                            </span>
                        )}
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
                {Array.isArray(disk) && disk.length > 0 && (
                    <div className="status-bar-section disk-section">
                        {disk
                            .filter(d => (showNetworkDisks ? true : !Boolean(d && d.isNetwork)))
                            .map((d, index) => {
                                const isNet = Boolean(d && d.isNetwork);
                                const idLabel = ((d && (d.fs || d.name || d.mount)) || '').trim();
                                const pct = (d && (d.use || d.percentage)) ?? '';
                                return (
                                    <div key={index} className="disk-info-item">
                                        <span 
                                            className="status-bar-icon disk" 
                                            style={{ color: isNet ? currentIconTheme.colors.networkDown : currentIconTheme.colors.disk }}
                                        >
                                            {isNet ? <FaNetworkWired /> : currentIconTheme.icons.disk}
                                        </span>
                                        <span className="disk-info-text">{idLabel} {pct}%</span>
                                    </div>
                                );
                            })}
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