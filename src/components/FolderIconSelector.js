import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

// Presets de iconos disponibles
export const FolderIconPresets = {
  // Sección: General
  GENERAL: { id: 'general', name: 'General', emoji: '📁', description: 'Carpeta estándar', color: '#2196F3', category: 'general' },
  SECURITY: { id: 'security', name: 'Seguridad', emoji: '🔒', description: 'Datos seguros', color: '#F44336', category: 'general' },
  NETWORK: { id: 'network', name: 'Redes', emoji: '🌐', description: 'Conexiones', color: '#FF9800', category: 'general' },
  DATABASE: { id: 'database', name: 'Base de Datos', emoji: '💾', description: 'Almacenamiento', color: '#673AB7', category: 'general' },
  ANALYTICS: { id: 'analytics', name: 'Análisis', emoji: '📊', description: 'Reportes y datos', color: '#4CAF50', category: 'general' },
  SETTINGS: { id: 'settings', name: 'Configuración', emoji: '⚙️', description: 'Ajustes', color: '#009688', category: 'general' },
  PROJECTS: { id: 'projects', name: 'Proyectos', emoji: '💼', description: 'Trabajos', color: '#3F51B5', category: 'general' },
  DOCUMENTS: { id: 'documents', name: 'Documentos', emoji: '📝', description: 'Archivos', color: '#2196F3', category: 'general' },
  DESIGN: { id: 'design', name: 'Diseño', emoji: '🎨', description: 'Creatividad', color: '#E91E63', category: 'general' },
  MEDIA: { id: 'media', name: 'Media', emoji: '🎬', description: 'Videos e imágenes', color: '#FF5722', category: 'general' },
  FAVORITES: { id: 'favorites', name: 'Favoritos', emoji: '⭐', description: 'Marcados', color: '#FFC107', category: 'general' },
  SYNC: { id: 'sync', name: 'Sincronización', emoji: '🔄', description: 'Actualizaciones', color: '#00BCD4', category: 'general' },
  
  // Sección: Administrador de Sistemas
  SERVERS: { id: 'servers', name: 'Servidores', emoji: '🖥️', description: 'Servidores y hosts', color: '#607D8B', category: 'sysadmin' },
  CONNECTIONS: { id: 'connections', name: 'Conexiones', emoji: '🔌', description: 'Conexiones remotas', color: '#795548', category: 'sysadmin' },
  DATABASES_SYS: { id: 'databases_sys', name: 'Bases de Datos', emoji: '🗄️', description: 'Bases de datos generales', color: '#9C27B0', category: 'sysadmin' },
  WINDOWS: { id: 'windows', name: 'Windows', emoji: '🪟', description: 'Sistemas Windows', color: '#00BCD4', category: 'sysadmin' },
  LINUX: { id: 'linux', name: 'Linux', emoji: '🐧', description: 'Sistemas Linux', color: '#FFC107', category: 'sysadmin' },
  SCRIPTS: { id: 'scripts', name: 'Scripts', emoji: '📜', description: 'Scripts y automatización', color: '#FF9800', category: 'sysadmin' },
  LOGS: { id: 'logs', name: 'Logs', emoji: '📋', description: 'Archivos de registro', color: '#9E9E9E', category: 'sysadmin' },
  MONITORING: { id: 'monitoring', name: 'Monitoreo', emoji: '📊', description: 'Sistemas de monitoreo', color: '#4CAF50', category: 'sysadmin' },
  BACKUP: { id: 'backup', name: 'Backup', emoji: '💿', description: 'Copias de seguridad', color: '#3F51B5', category: 'sysadmin' },
  SYSTEM_SECURITY: { id: 'system_security', name: 'Seguridad del Sistema', emoji: '🛡️', description: 'Firewall y seguridad', color: '#F44336', category: 'sysadmin' },
  VIRTUALIZATION: { id: 'virtualization', name: 'Virtualización', emoji: '☁️', description: 'Virtualización general', color: '#00ACC1', category: 'sysadmin' },
  CONTAINERS: { id: 'containers', name: 'Containers', emoji: '📦', description: 'Contenedores generales', color: '#2196F3', category: 'sysadmin' },
  CLOUD: { id: 'cloud', name: 'Cloud', emoji: '☁️', description: 'Cloud general', color: '#03A9F4', category: 'sysadmin' },
  DEVOPS: { id: 'devops', name: 'DevOps', emoji: '⚡', description: 'CI/CD y automatización', color: '#FF6F00', category: 'sysadmin' },
  CONFIG_SERVERS: { id: 'config_servers', name: 'Configuración', emoji: '⚙️', description: 'Config de servidores', color: '#009688', category: 'sysadmin' },
  TERMINAL: { id: 'terminal', name: 'Terminal', emoji: '💻', description: 'Acceso por terminal', color: '#424242', category: 'sysadmin' },
  
  // Software específico - Virtualización
  VMWARE: { id: 'vmware', name: 'VMware', emoji: '🖥️', description: 'VMware vSphere/ESXi', color: '#607078', category: 'sysadmin' },
  HYPERV: { id: 'hyperv', name: 'Hyper-V', emoji: '🪟', description: 'Microsoft Hyper-V', color: '#0078D4', category: 'sysadmin' },
  VIRTUALBOX: { id: 'virtualbox', name: 'VirtualBox', emoji: '📦', description: 'Oracle VirtualBox', color: '#183A61', category: 'sysadmin' },
  KVM: { id: 'kvm', name: 'KVM', emoji: '🐧', description: 'Kernel-based VM', color: '#FF6F00', category: 'sysadmin' },
  
  // Software específico - Containers
  DOCKER: { id: 'docker', name: 'Docker', emoji: '🐳', description: 'Docker containers', color: '#2496ED', category: 'sysadmin' },
  KUBERNETES: { id: 'kubernetes', name: 'Kubernetes', emoji: '☸️', description: 'Kubernetes (K8s)', color: '#326CE5', category: 'sysadmin' },
  
  // Software específico - Bases de Datos
  MYSQL: { id: 'mysql', name: 'MySQL', emoji: '🗄️', description: 'MySQL Database', color: '#4479A1', category: 'sysadmin' },
  MARIADB: { id: 'mariadb', name: 'MariaDB', emoji: '🗄️', description: 'MariaDB Database', color: '#C49A3C', category: 'sysadmin' },
  POSTGRESQL: { id: 'postgresql', name: 'PostgreSQL', emoji: '🐘', description: 'PostgreSQL Database', color: '#336791', category: 'sysadmin' },
  MONGODB: { id: 'mongodb', name: 'MongoDB', emoji: '🍃', description: 'MongoDB Database', color: '#47A248', category: 'sysadmin' },
  REDIS: { id: 'redis', name: 'Redis', emoji: '🔴', description: 'Redis Cache', color: '#DC382D', category: 'sysadmin' },
  ELASTICSEARCH: { id: 'elasticsearch', name: 'Elasticsearch', emoji: '🔍', description: 'Elasticsearch', color: '#005571', category: 'sysadmin' },
  
  // Software específico - Cloud
  AWS: { id: 'aws', name: 'AWS', emoji: '☁️', description: 'Amazon Web Services', color: '#FF9900', category: 'sysadmin' },
  AZURE: { id: 'azure', name: 'Azure', emoji: '☁️', description: 'Microsoft Azure', color: '#0078D4', category: 'sysadmin' },
  GCP: { id: 'gcp', name: 'GCP', emoji: '☁️', description: 'Google Cloud Platform', color: '#4285F4', category: 'sysadmin' },
  
  // Software específico - Monitoreo y Logs
  PROMETHEUS: { id: 'prometheus', name: 'Prometheus', emoji: '🔥', description: 'Prometheus Monitoring', color: '#E6522C', category: 'sysadmin' },
  GRAFANA: { id: 'grafana', name: 'Grafana', emoji: '📊', description: 'Grafana Dashboards', color: '#F46800', category: 'sysadmin' },
  NAGIOS: { id: 'nagios', name: 'Nagios', emoji: '👁️', description: 'Nagios Monitoring', color: '#1A1A1A', category: 'sysadmin' },
  ZABBIX: { id: 'zabbix', name: 'Zabbix', emoji: '📈', description: 'Zabbix Monitoring', color: '#D40000', category: 'sysadmin' },
  ELK: { id: 'elk', name: 'ELK Stack', emoji: '🦌', description: 'Elasticsearch, Logstash, Kibana', color: '#005571', category: 'sysadmin' },
  
  // Software específico - CI/CD y DevOps
  JENKINS: { id: 'jenkins', name: 'Jenkins', emoji: '🤖', description: 'Jenkins CI/CD', color: '#D24939', category: 'sysadmin' },
  GITLAB: { id: 'gitlab', name: 'GitLab', emoji: '🦊', description: 'GitLab CI/CD', color: '#FC6D26', category: 'sysadmin' },
  GITHUB_ACTIONS: { id: 'github_actions', name: 'GitHub Actions', emoji: '🐙', description: 'GitHub CI/CD', color: '#2088FF', category: 'sysadmin' },
  ANSIBLE: { id: 'ansible', name: 'Ansible', emoji: '🔴', description: 'Ansible Automation', color: '#EE0000', category: 'sysadmin' },
  TERRAFORM: { id: 'terraform', name: 'Terraform', emoji: '🏗️', description: 'Terraform IaC', color: '#7B42BC', category: 'sysadmin' },
  
  // Software específico - Web Servers
  NGINX: { id: 'nginx', name: 'Nginx', emoji: '🌐', description: 'Nginx Web Server', color: '#009639', category: 'sysadmin' },
  APACHE: { id: 'apache', name: 'Apache', emoji: '🌐', description: 'Apache HTTP Server', color: '#D22128', category: 'sysadmin' },
  
  // Software específico - Otros
  PUPPET: { id: 'puppet', name: 'Puppet', emoji: '🎭', description: 'Puppet Configuration', color: '#FFAE1A', category: 'sysadmin' },
  CHEF: { id: 'chef', name: 'Chef', emoji: '👨‍🍳', description: 'Chef Automation', color: '#F09820', category: 'sysadmin' },
  SALTSTACK: { id: 'saltstack', name: 'SaltStack', emoji: '🧂', description: 'SaltStack Automation', color: '#00EACE', category: 'sysadmin' }
};

// Categorías de iconos
export const IconCategories = {
  general: {
    id: 'general',
    name: 'General',
    icon: '📁',
    description: 'Iconos de uso general'
  },
  sysadmin: {
    id: 'sysadmin',
    name: 'Administrador de Sistemas',
    icon: '🖥️',
    description: 'Iconos para administración de sistemas'
  }
};

// Renderiza un icono de carpeta con SVG
export const FolderIconRenderer = ({ preset, size = 'medium', pixelSize = null }) => {
  if (!preset) return null;

  // Si se proporciona pixelSize, usarlo directamente; si no, usar los tamaños predefinidos
  let containerSize, emojiSize;
  
  if (pixelSize && typeof pixelSize === 'number') {
    // Usar el tamaño en píxeles proporcionado
    containerSize = pixelSize;
    // Calcular el tamaño del emoji proporcionalmente (aproximadamente 42% del tamaño del contenedor)
    emojiSize = Math.max(8, Math.round(pixelSize * 0.42));
  } else {
    // Usar tamaños predefinidos para compatibilidad
    const sizes = {
      small: { container: 40, emoji: 16 },
      medium: { container: 60, emoji: 24 },
      large: { container: 80, emoji: 32 }
    };
    const dims = sizes[size] || sizes.medium;
    containerSize = dims.container;
    emojiSize = dims.emoji;
  }

  // Mapa de emojis que se ven más pequeños y necesitan escalado adicional
  // Solo aplicamos escalado a estos emojis específicos para mantener uniformidad
  const smallEmojiScaleMap = {
    '👁️': 1.20, // Nagios - ojo se ve más pequeño
    '🔒': 1.15, // Seguridad - candado se ve más pequeño
    '📦': 1.12, // Containers/Homeservers - caja se ve más pequeña
    '⭐': 1.12, // Favoritos - estrella se ve más pequeña
    '🔍': 1.10, // Elasticsearch - lupa se ve más pequeña
    '🔴': 1.10, // Redis/Ansible - círculo se ve más pequeño
    '⚡': 1.10, // DevOps - rayo se ve más pequeño
    '🪟': 1.10, // Windows - ventana se ve más pequeña
    '🐧': 1.10, // Linux - pingüino se ve más pequeño
    '🛡️': 1.10, // Sistema Seguridad - escudo se ve más pequeño
    '💿': 1.10, // Backup - disco se ve más pequeño
    '🍃': 1.10, // MongoDB - hoja se ve más pequeña
    '🔥': 1.10, // Prometheus - fuego se ve más pequeño
    '📈': 1.10, // Zabbix - gráfico se ve más pequeño
    '🦌': 1.10, // ELK - ciervo se ve más pequeño
    '🧂': 1.10, // SaltStack - sal se ve más pequeña
    '📋': 1.10, // Logs - clipboard se ve más pequeño
    '📜': 1.10, // Scripts - pergamino se ve más pequeño
    '🔄': 1.10  // Sync - sincronización se ve más pequeño
  };

  // Obtener el factor de escala para este emoji, o 1.0 si no necesita escalado
  const emojiScale = smallEmojiScaleMap[preset.emoji] || 1.0;

  // Calcular el fontSize del emoji en unidades del viewBox
  const emojiFontSizeInViewBox = pixelSize ? (emojiSize / containerSize) * 100 : emojiSize;

  return (
    <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>
      <defs>
        <linearGradient id={`grad-${preset.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.color} stopOpacity="1" />
          <stop offset="100%" stopColor={preset.color} stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <g transform="translate(0, -12)">
        <path d="M 10 35 L 30 20 L 40 20 L 40 35 Z" fill={`url(#grad-${preset.id})`} opacity="0.9" />
        <path d="M 10 35 L 10 85 Q 10 90 15 90 L 85 90 Q 90 90 90 85 L 90 40 Q 90 35 85 35 L 40 35 L 40 30 Q 40 25 35 25 L 15 25 Q 10 25 10 30 Z" fill={`url(#grad-${preset.id})`} />
        <path d="M 10 35 L 10 85 Q 10 90 15 90 L 85 90 Q 90 90 90 85 L 90 40 Q 90 35 85 35 L 40 35 L 40 30 Q 40 25 35 25 L 15 25 Q 10 25 10 30 Z" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
        {/* Emoji con escalado solo para los que se ven más pequeños */}
        {emojiScale !== 1.0 ? (
          <g transform={`translate(70, 75)`}>
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
            x="70" 
            y="75" 
            fontSize={emojiFontSizeInViewBox} 
            textAnchor="middle" 
            dominantBaseline="central"
            style={{ userSelect: 'none', pointerEvents: 'none' }}
          >
            {preset.emoji}
          </text>
        )}
        <circle cx="70" cy="70" r="22" fill="rgba(255,255,255,0.15)" opacity="0.6" />
      </g>
    </svg>
  );
};

// Modal selector de iconos
export const FolderIconSelectorModal = ({ visible, onHide, selectedIconId, onSelectIcon, theme }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);
  
  // Determinar la categoría inicial basada en el icono seleccionado
  const getInitialCategory = useCallback(() => {
    if (!selectedIconId || selectedIconId === 'general') return 'general';
    const preset = FolderIconPresets[Object.keys(FolderIconPresets).find(key => 
      FolderIconPresets[key].id === selectedIconId
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
      buttonPrimary: currentTheme.colors?.buttonPrimary || '#2196F3',
      buttonHover: currentTheme.colors?.buttonHoverBackground || 'rgba(33, 150, 243, 0.2)',
      border: currentTheme.colors?.contentBorder || 'rgba(255, 255, 255, 0.1)',
      cardBg: currentTheme.colors?.contentBackground || 'rgba(255, 255, 255, 0.05)'
    };
  }, [currentTheme]);

  // Filtrar presets por categoría activa
  const presets = useMemo(() => {
    return Object.values(FolderIconPresets).filter(preset => preset.category === activeCategory);
  }, [activeCategory]);

  // Obtener todas las categorías disponibles
  const categories = useMemo(() => {
    return Object.values(IconCategories);
  }, []);

  const handleSelectIcon = useCallback((iconId) => {
    onSelectIcon(iconId);
    onHide();
  }, [onSelectIcon, onHide]);

  if (!visible) return null;

  return (
    <>
      <div
        onClick={onHide}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1090,
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
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            width: '700px',
            maxWidth: '95vw',
            maxHeight: '90vh',
            overflowY: 'auto',
            zIndex: 1100,
            pointerEvents: 'auto'
          }}
        >
          <div style={{ padding: '1.5rem', borderBottom: `1px solid ${themeColors.border}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <i className="pi pi-palette" style={{ fontSize: '1.5rem', color: themeColors.buttonPrimary }}></i>
            <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Selecciona el icono de la carpeta</span>
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
                      console.log('Click en icono:', preset.id);
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
                      <FolderIconRenderer preset={preset} size="large" />
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 1.5rem', borderTop: `1px solid ${themeColors.border}` }}>
            <button onClick={onHide} style={{ padding: '0.75rem 1.5rem', backgroundColor: 'transparent', border: `1px solid ${themeColors.border}`, color: themeColors.dialogText, borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', fontWeight: '600' }}>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

