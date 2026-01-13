import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

// Presets de iconos disponibles para conexiones SSH
export const SSHIconPresets = {
  // Sección: General
  DEFAULT: { id: 'default', name: 'Por Defecto', emoji: '🖥️', description: 'Icono del tema', color: '#FF9800', category: 'general' },
  SERVER: { id: 'server', name: 'Servidor', emoji: '🖥️', description: 'Servidor genérico', color: '#607D8B', category: 'general' },
  PRODUCTION: { id: 'production', name: 'Producción', emoji: '🚀', description: 'Servidor de producción', color: '#F44336', category: 'general' },
  DEVELOPMENT: { id: 'development', name: 'Desarrollo', emoji: '💻', description: 'Servidor de desarrollo', color: '#4CAF50', category: 'general' },
  TESTING: { id: 'testing', name: 'Testing', emoji: '🧪', description: 'Servidor de pruebas', color: '#9C27B0', category: 'general' },
  STAGING: { id: 'staging', name: 'Staging', emoji: '🎭', description: 'Servidor de staging', color: '#FF9800', category: 'general' },
  HOMESERVER: { id: 'homeserver', name: 'Home Server', emoji: '🏠', description: 'Servidor doméstico', color: '#2196F3', category: 'general' },
  BACKUP: { id: 'backup', name: 'Backup', emoji: '💾', description: 'Servidor de respaldo', color: '#795548', category: 'general' },
  MONITORING: { id: 'monitoring', name: 'Monitoreo', emoji: '📊', description: 'Sistema de monitoreo', color: '#00BCD4', category: 'general' },
  GATEWAY: { id: 'gateway', name: 'Gateway', emoji: '🚪', description: 'Puerta de enlace', color: '#3F51B5', category: 'general' },
  BASTION: { id: 'bastion', name: 'Bastión', emoji: '🏰', description: 'Servidor bastión/jump', color: '#E91E63', category: 'general' },
  
  // Sección: Sistemas Operativos
  LINUX: { id: 'linux', name: 'Linux', emoji: '🐧', description: 'Servidor Linux genérico', color: '#FFC107', category: 'os' },
  UBUNTU: { id: 'ubuntu', name: 'Ubuntu', emoji: '🟠', description: 'Ubuntu Server', color: '#E95420', category: 'os' },
  DEBIAN: { id: 'debian', name: 'Debian', emoji: '🔴', description: 'Debian Server', color: '#A80030', category: 'os' },
  CENTOS: { id: 'centos', name: 'CentOS/RHEL', emoji: '🎩', description: 'CentOS/Red Hat', color: '#932279', category: 'os' },
  FEDORA: { id: 'fedora', name: 'Fedora', emoji: '🎩', description: 'Fedora Server', color: '#294172', category: 'os' },
  ARCH: { id: 'arch', name: 'Arch Linux', emoji: '🔷', description: 'Arch Linux', color: '#1793D1', category: 'os' },
  SUSE: { id: 'suse', name: 'SUSE/openSUSE', emoji: '🦎', description: 'SUSE Linux', color: '#73BA25', category: 'os' },
  ALPINE: { id: 'alpine', name: 'Alpine', emoji: '🏔️', description: 'Alpine Linux', color: '#0D597F', category: 'os' },
  WINDOWS: { id: 'windows', name: 'Windows Server', emoji: '🪟', description: 'Windows Server', color: '#0078D4', category: 'os' },
  MACOS: { id: 'macos', name: 'macOS', emoji: '🍎', description: 'macOS Server', color: '#555555', category: 'os' },
  BSD: { id: 'bsd', name: 'FreeBSD', emoji: '😈', description: 'FreeBSD/OpenBSD', color: '#AB2B28', category: 'os' },
  
  // Sección: Cloud/Hosting
  AWS: { id: 'aws', name: 'AWS', emoji: '☁️', description: 'Amazon Web Services', color: '#FF9900', category: 'cloud' },
  AZURE: { id: 'azure', name: 'Azure', emoji: '☁️', description: 'Microsoft Azure', color: '#0078D4', category: 'cloud' },
  GCP: { id: 'gcp', name: 'Google Cloud', emoji: '☁️', description: 'Google Cloud Platform', color: '#4285F4', category: 'cloud' },
  DIGITALOCEAN: { id: 'digitalocean', name: 'DigitalOcean', emoji: '🌊', description: 'DigitalOcean Droplet', color: '#0080FF', category: 'cloud' },
  LINODE: { id: 'linode', name: 'Linode', emoji: '🟢', description: 'Linode/Akamai', color: '#00A95C', category: 'cloud' },
  VULTR: { id: 'vultr', name: 'Vultr', emoji: '🔵', description: 'Vultr VPS', color: '#007BFC', category: 'cloud' },
  OVH: { id: 'ovh', name: 'OVH', emoji: '🔷', description: 'OVHcloud', color: '#123F6D', category: 'cloud' },
  HETZNER: { id: 'hetzner', name: 'Hetzner', emoji: '🔴', description: 'Hetzner Cloud', color: '#D50C2D', category: 'cloud' },
  ORACLE: { id: 'oracle', name: 'Oracle Cloud', emoji: '☁️', description: 'Oracle Cloud', color: '#F80000', category: 'cloud' },
  IBM: { id: 'ibm', name: 'IBM Cloud', emoji: '☁️', description: 'IBM Cloud', color: '#1F70C1', category: 'cloud' },
  
  // Sección: Contenedores y Virtualización
  DOCKER: { id: 'docker', name: 'Docker', emoji: '🐳', description: 'Docker Host', color: '#2496ED', category: 'containers' },
  KUBERNETES: { id: 'kubernetes', name: 'Kubernetes', emoji: '☸️', description: 'K8s Node', color: '#326CE5', category: 'containers' },
  PODMAN: { id: 'podman', name: 'Podman', emoji: '🦭', description: 'Podman Host', color: '#892CA0', category: 'containers' },
  LXC: { id: 'lxc', name: 'LXC/LXD', emoji: '📦', description: 'Linux Containers', color: '#333333', category: 'containers' },
  PROXMOX: { id: 'proxmox', name: 'Proxmox', emoji: '🖥️', description: 'Proxmox VE', color: '#E57000', category: 'containers' },
  VMWARE: { id: 'vmware', name: 'VMware', emoji: '🖥️', description: 'VMware ESXi/vSphere', color: '#607078', category: 'containers' },
  HYPERV: { id: 'hyperv', name: 'Hyper-V', emoji: '🪟', description: 'Microsoft Hyper-V', color: '#00BCF2', category: 'containers' },
  KVM: { id: 'kvm', name: 'KVM/QEMU', emoji: '🐧', description: 'KVM Hypervisor', color: '#FF6600', category: 'containers' },
  
  // Sección: Bases de Datos
  MYSQL: { id: 'mysql', name: 'MySQL', emoji: '🐬', description: 'MySQL Server', color: '#4479A1', category: 'databases' },
  MARIADB: { id: 'mariadb', name: 'MariaDB', emoji: '🦭', description: 'MariaDB Server', color: '#C49A3C', category: 'databases' },
  POSTGRESQL: { id: 'postgresql', name: 'PostgreSQL', emoji: '🐘', description: 'PostgreSQL Server', color: '#336791', category: 'databases' },
  MONGODB: { id: 'mongodb', name: 'MongoDB', emoji: '🍃', description: 'MongoDB Server', color: '#47A248', category: 'databases' },
  REDIS: { id: 'redis', name: 'Redis', emoji: '🔴', description: 'Redis Server', color: '#DC382D', category: 'databases' },
  ELASTICSEARCH: { id: 'elasticsearch', name: 'Elasticsearch', emoji: '🔍', description: 'Elasticsearch Node', color: '#005571', category: 'databases' },
  CASSANDRA: { id: 'cassandra', name: 'Cassandra', emoji: '👁️', description: 'Apache Cassandra', color: '#1287B1', category: 'databases' },
  MSSQL: { id: 'mssql', name: 'SQL Server', emoji: '🗄️', description: 'Microsoft SQL Server', color: '#CC2927', category: 'databases' },
  ORACLE_DB: { id: 'oracle_db', name: 'Oracle DB', emoji: '🗄️', description: 'Oracle Database', color: '#F80000', category: 'databases' },
  
  // Sección: Servicios Web y Red
  NGINX: { id: 'nginx', name: 'Nginx', emoji: '🌐', description: 'Nginx Web Server', color: '#009639', category: 'services' },
  APACHE: { id: 'apache', name: 'Apache', emoji: '🪶', description: 'Apache HTTP Server', color: '#D22128', category: 'services' },
  HAPROXY: { id: 'haproxy', name: 'HAProxy', emoji: '⚖️', description: 'Load Balancer', color: '#106DA4', category: 'services' },
  TRAEFIK: { id: 'traefik', name: 'Traefik', emoji: '🔀', description: 'Traefik Proxy', color: '#24A1C1', category: 'services' },
  API: { id: 'api', name: 'API Server', emoji: '🔌', description: 'Servidor de APIs', color: '#6C5CE7', category: 'services' },
  MAIL: { id: 'mail', name: 'Mail Server', emoji: '📧', description: 'Servidor de correo', color: '#EA4335', category: 'services' },
  DNS: { id: 'dns', name: 'DNS Server', emoji: '🌍', description: 'Servidor DNS', color: '#34A853', category: 'services' },
  FTP: { id: 'ftp', name: 'FTP Server', emoji: '📂', description: 'Servidor FTP/SFTP', color: '#FF6B35', category: 'services' },
  VPN: { id: 'vpn', name: 'VPN Server', emoji: '🔒', description: 'Servidor VPN', color: '#5C6BC0', category: 'services' },
  FIREWALL: { id: 'firewall', name: 'Firewall', emoji: '🛡️', description: 'Firewall/Security', color: '#F44336', category: 'services' },
  
  // Sección: DevOps y CI/CD
  JENKINS: { id: 'jenkins', name: 'Jenkins', emoji: '🤖', description: 'Jenkins CI/CD', color: '#D24939', category: 'devops' },
  GITLAB: { id: 'gitlab', name: 'GitLab', emoji: '🦊', description: 'GitLab Server', color: '#FC6D26', category: 'devops' },
  GITHUB: { id: 'github', name: 'GitHub', emoji: '🐙', description: 'GitHub Actions Runner', color: '#181717', category: 'devops' },
  ANSIBLE: { id: 'ansible', name: 'Ansible', emoji: '🔧', description: 'Ansible Control Node', color: '#EE0000', category: 'devops' },
  TERRAFORM: { id: 'terraform', name: 'Terraform', emoji: '🏗️', description: 'Terraform/IaC', color: '#7B42BC', category: 'devops' },
  PROMETHEUS: { id: 'prometheus', name: 'Prometheus', emoji: '🔥', description: 'Prometheus Monitoring', color: '#E6522C', category: 'devops' },
  GRAFANA: { id: 'grafana', name: 'Grafana', emoji: '📈', description: 'Grafana Dashboards', color: '#F46800', category: 'devops' },
  SONARQUBE: { id: 'sonarqube', name: 'SonarQube', emoji: '🔬', description: 'Code Quality', color: '#4E9BCD', category: 'devops' },
  NEXUS: { id: 'nexus', name: 'Nexus', emoji: '📦', description: 'Artifact Repository', color: '#1B8653', category: 'devops' },
  HARBOR: { id: 'harbor', name: 'Harbor', emoji: '⚓', description: 'Container Registry', color: '#60B932', category: 'devops' }
};

// Categorías de iconos SSH
export const SSHIconCategories = {
  general: {
    id: 'general',
    name: 'General',
    icon: '🖥️',
    description: 'Servidores de propósito general'
  },
  os: {
    id: 'os',
    name: 'Sistemas Operativos',
    icon: '🐧',
    description: 'Sistemas operativos específicos'
  },
  cloud: {
    id: 'cloud',
    name: 'Cloud/Hosting',
    icon: '☁️',
    description: 'Proveedores de cloud y hosting'
  },
  containers: {
    id: 'containers',
    name: 'Contenedores',
    icon: '🐳',
    description: 'Contenedores y virtualización'
  },
  databases: {
    id: 'databases',
    name: 'Bases de Datos',
    icon: '🗄️',
    description: 'Servidores de bases de datos'
  },
  services: {
    id: 'services',
    name: 'Servicios',
    icon: '🌐',
    description: 'Servicios web y red'
  },
  devops: {
    id: 'devops',
    name: 'DevOps',
    icon: '⚙️',
    description: 'Herramientas CI/CD y DevOps'
  }
};

// Renderiza un icono SSH con SVG (estilo terminal)
export const SSHIconRenderer = ({ preset, size = 'medium', pixelSize = null }) => {
  if (!preset) return null;

  // Si se proporciona pixelSize, usarlo directamente
  let containerSize, emojiSize;
  
  if (pixelSize && typeof pixelSize === 'number') {
    containerSize = pixelSize;
    emojiSize = Math.max(8, Math.round(pixelSize * 0.45));
  } else {
    const sizes = {
      small: { container: 40, emoji: 16 },
      medium: { container: 60, emoji: 24 },
      large: { container: 80, emoji: 32 }
    };
    const dims = sizes[size] || sizes.medium;
    containerSize = dims.container;
    emojiSize = dims.emoji;
  }

  // Mapa de emojis que necesitan escalado adicional
  const smallEmojiScaleMap = {
    '👁️': 1.20,
    '🔒': 1.15,
    '📦': 1.12,
    '⭐': 1.12,
    '🔍': 1.10,
    '🔴': 1.10,
    '⚡': 1.10,
    '🪟': 1.10,
    '🐧': 1.10,
    '🛡️': 1.10,
    '💾': 1.10,
    '🍃': 1.10,
    '🔥': 1.10,
    '📈': 1.10,
    '🦌': 1.10,
    '🧂': 1.10,
    '📋': 1.10,
    '📜': 1.10,
    '🔄': 1.10,
    '☸️': 1.10,
    '🏔️': 1.10,
    '😈': 1.10,
    '🪶': 1.10,
    '⚖️': 1.10,
    '🔀': 1.10,
    '⚓': 1.10
  };

  const emojiScale = smallEmojiScaleMap[preset.emoji] || 1.0;
  const emojiFontSizeInViewBox = pixelSize ? (emojiSize / containerSize) * 100 : emojiSize;

  return (
    <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
      <defs>
        <linearGradient id={`ssh-grad-${preset.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.color} stopOpacity="1" />
          <stop offset="100%" stopColor={preset.color} stopOpacity="0.75" />
        </linearGradient>
        <filter id={`ssh-glow-${preset.id}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      {/* Terminal window background */}
      <rect x="5" y="10" width="90" height="80" rx="8" ry="8" fill="#1a1a2e" stroke={preset.color} strokeWidth="2" opacity="0.95"/>
      
      {/* Terminal header bar */}
      <rect x="5" y="10" width="90" height="18" rx="8" ry="8" fill={`url(#ssh-grad-${preset.id})`}/>
      <rect x="5" y="20" width="90" height="8" fill={`url(#ssh-grad-${preset.id})`}/>
      
      {/* Terminal buttons */}
      <circle cx="16" cy="19" r="3.5" fill="#ff5f56"/>
      <circle cx="28" cy="19" r="3.5" fill="#ffbd2e"/>
      <circle cx="40" cy="19" r="3.5" fill="#27ca3f"/>
      
      {/* Terminal content area */}
      <rect x="10" y="32" width="80" height="53" rx="2" fill="#0d0d1a"/>
      
      {/* Command line indicator */}
      <text x="15" y="48" fontSize="10" fill="#4ade80" fontFamily="monospace" fontWeight="bold">$</text>
      <rect x="24" y="42" width="30" height="8" rx="1" fill={preset.color} opacity="0.6"/>
      
      {/* Second line */}
      <text x="15" y="62" fontSize="10" fill="#4ade80" fontFamily="monospace" fontWeight="bold">$</text>
      <rect x="24" y="56" width="20" height="8" rx="1" fill={preset.color} opacity="0.4"/>
      
      {/* Emoji badge */}
      <circle cx="75" cy="70" r="18" fill="rgba(255,255,255,0.15)" filter={`url(#ssh-glow-${preset.id})`}/>
      
      {/* Emoji with optional scaling */}
      {emojiScale !== 1.0 ? (
        <g transform="translate(75, 72)">
          <text 
            x="0" 
            y="0" 
            fontSize={emojiFontSizeInViewBox * emojiScale} 
            textAnchor="middle" 
            dominantBaseline="central"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {preset.emoji}
          </text>
        </g>
      ) : (
        <text 
          x="75" 
          y="72" 
          fontSize={emojiFontSizeInViewBox} 
          textAnchor="middle" 
          dominantBaseline="central"
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {preset.emoji}
        </text>
      )}
    </svg>
  );
};

// Modal selector de iconos SSH
export const SSHIconSelectorModal = ({ visible, onHide, selectedIconId, onSelectIcon, theme }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);
  
  // Determinar la categoría inicial basada en el icono seleccionado
  const getInitialCategory = useCallback(() => {
    if (!selectedIconId || selectedIconId === 'default') return 'general';
    const preset = SSHIconPresets[Object.keys(SSHIconPresets).find(key => 
      SSHIconPresets[key].id === selectedIconId
    )];
    return preset?.category || 'general';
  }, [selectedIconId]);
  
  const [activeCategory, setActiveCategory] = useState(getInitialCategory);
  
  // Actualizar categoría cuando cambia el icono seleccionado o cuando se abre el modal
  useEffect(() => {
    if (visible) {
      setActiveCategory(getInitialCategory());
    }
  }, [visible, getInitialCategory]);

  useEffect(() => {
    const onThemeChanged = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  const currentTheme = useMemo(() => {
    return theme || themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [theme, themeVersion]);

  const themeColors = useMemo(() => {
    return {
      dialogBg: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.95)',
      dialogText: currentTheme.colors?.dialogText || '#ffffff',
      buttonPrimary: currentTheme.colors?.buttonPrimary || '#FF9800',
      buttonHover: currentTheme.colors?.buttonHoverBackground || 'rgba(255, 152, 0, 0.2)',
      border: currentTheme.colors?.contentBorder || 'rgba(255, 255, 255, 0.1)',
      cardBg: currentTheme.colors?.contentBackground || 'rgba(255, 255, 255, 0.05)'
    };
  }, [currentTheme]);

  // Filtrar presets por categoría activa
  const presets = useMemo(() => {
    return Object.values(SSHIconPresets).filter(preset => preset.category === activeCategory);
  }, [activeCategory]);

  // Obtener todas las categorías disponibles
  const categories = useMemo(() => {
    return Object.values(SSHIconCategories);
  }, []);

  const handleSelectIcon = useCallback((iconId) => {
    onSelectIcon(iconId);
    onHide();
  }, [onSelectIcon, onHide]);

  if (!visible) return null;

  return (
    <div
      onClick={onHide}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: themeColors.dialogBg,
            color: themeColors.dialogText,
            borderRadius: '16px',
            border: `1px solid ${themeColors.border}`,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            width: '800px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 10001,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <i className="pi pi-server" style={{ fontSize: '1.5rem', color: themeColors.buttonPrimary }}></i>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Selecciona el icono de la conexión SSH</span>
            <button onClick={onHide} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: themeColors.dialogText, fontSize: '1.5rem', cursor: 'pointer', padding: 0, width: '32px', height: '32px' }}>✕</button>
          </div>

          {/* Pestañas de categorías */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            padding: '1rem 1.5rem', 
            borderBottom: `1px solid ${themeColors.border}`,
            overflowX: 'auto',
            scrollbarWidth: 'thin'
          }}>
            {categories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.75rem 1.25rem',
                    backgroundColor: isActive ? themeColors.buttonPrimary : 'transparent',
                    border: `1px solid ${isActive ? themeColors.buttonPrimary : themeColors.border}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: isActive ? '#ffffff' : themeColors.dialogText,
                    fontSize: '0.9rem',
                    fontWeight: isActive ? '600' : '500',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    pointerEvents: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = themeColors.buttonHover;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{category.icon}</span>
                  <span>{category.name}</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: '1.5rem', pointerEvents: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem', pointerEvents: 'auto' }}>
              {presets.map((preset) => {
                const isSelected = selectedIconId === preset.id;
                const isHovered = hoveredId === preset.id;

                return (
                  <button
                    key={preset.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleSelectIcon(preset.id);
                    }}
                    onMouseEnter={() => setHoveredId(preset.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    type="button"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      padding: '1rem',
                      background: isSelected ? `linear-gradient(135deg, ${themeColors.buttonPrimary}33, ${themeColors.buttonPrimary}11)` : isHovered ? themeColors.buttonHover : themeColors.cardBg,
                      border: isSelected ? `2px solid ${themeColors.buttonPrimary}` : `1px solid ${themeColors.border}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      minHeight: '160px',
                      gap: '0.5rem',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      color: themeColors.dialogText,
                      pointerEvents: 'auto',
                      zIndex: 10
                    }}
                  >
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                      <SSHIconRenderer preset={preset} size="large" />
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: themeColors.dialogText, textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                      {preset.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.6)', textAlign: 'center', width: '100%', pointerEvents: 'none' }}>
                      {preset.description}
                    </div>
                    {isSelected && (
                      <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', width: '24px', height: '24px', borderRadius: '50%', backgroundColor: themeColors.buttonPrimary, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.9rem', fontWeight: 'bold', pointerEvents: 'none' }}>
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: `1px solid ${themeColors.border}`, gap: '0.75rem' }}>
            <button 
              onClick={() => handleSelectIcon(null)} 
              style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: 'transparent', 
                border: `1px solid ${themeColors.border}`, 
                color: themeColors.dialogText, 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontSize: '0.95rem', 
                fontWeight: '600' 
              }}
            >
              Usar icono del tema
            </button>
            <button 
              onClick={onHide} 
              style={{ 
                padding: '0.75rem 1.5rem', 
                backgroundColor: 'transparent', 
                border: `1px solid ${themeColors.border}`, 
                color: themeColors.dialogText, 
                borderRadius: '8px', 
                cursor: 'pointer', 
                fontSize: '0.95rem', 
                fontWeight: '600' 
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
  );
};
