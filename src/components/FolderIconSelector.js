import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

// Presets de iconos disponibles
export const FolderIconPresets = {
  // Sección: Libretas y Notas
  BOOKS: { id: 'books', name: 'Libros', emoji: '📚', description: 'Biblioteca o temas generales', color: '#8B5CF6', category: 'notes' },
  OPEN_BOOK: { id: 'open_book', name: 'Libro Abierto', emoji: '📖', description: 'Lectura o estudio', color: '#3B82F6', category: 'notes' },
  NOTEBOOK_1: { id: 'notebook_1', name: 'Cuaderno Cerrado', emoji: '📓', description: 'Notas diarias', color: '#10B981', category: 'notes' },
  NOTEBOOK_2: { id: 'notebook_2', name: 'Cuaderno de Notas', emoji: '📒', description: 'Apuntes rápidos', color: '#F59E0B', category: 'notes' },
  SPIRAL_PAD: { id: 'spiral_pad', name: 'Bloc de Notas', emoji: '🗒️', description: 'Tareas y listas', color: '#EC4899', category: 'notes' },
  WRITING: { id: 'writing', name: 'Escritura', emoji: '📝', description: 'Redacción o diario', color: '#06B6D4', category: 'notes' },
  IDEA: { id: 'idea', name: 'Ideas', emoji: '💡', description: 'Inspiraciones', color: '#EAB308', category: 'notes' },
  BRAIN: { id: 'brain', name: 'Estudios/Mente', emoji: '🧠', description: 'Conocimiento', color: '#EF4444', category: 'notes' },
  PENCIL: { id: 'pencil', name: 'Bocetos', emoji: '✏️', description: 'Dibujo o notas rápidas', color: '#84CC16', category: 'notes' },
  WORK: { id: 'work', name: 'Proyectos/Trabajo', emoji: '💼', description: 'Documentos profesionales', color: '#6366F1', category: 'notes' },
  SECRET: { id: 'secret', name: 'Privado', emoji: '🔒', description: 'Notas protegidas', color: '#6B7280', category: 'notes' },
  ROCKET: { id: 'rocket', name: 'Metas/Lanzamientos', emoji: '🚀', description: 'Objetivos', color: '#F97316', category: 'notes' },

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
  notes: {
    id: 'notes',
    name: 'Libretas y Notas',
    icon: '📚',
    description: 'Iconos para tus libretas y cuadernos'
  },
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

  // Si el preset es de la categoría 'notes', renderizamos iconos totalmente únicos y diferentes en lugar de carpetas con emojis
  if (preset.category === 'notes') {
    const color = preset.color || '#2196F3';
    switch (preset.id) {
      case 'books':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Libro horizontal inferior */}
              <path d="M 15 68 L 82 68 Q 87 68 87 73 Q 87 78 82 78 L 15 78 Z" fill={color} />
              <rect x="20" y="70" width="62" height="6" fill="#f1f5f9" rx="1" />
              <path d="M 15 68 Q 11 68 11 73 Q 11 78 15 78 Z" fill="#1e1b4b" opacity="0.4" />
              {/* Libro horizontal medio */}
              <path d="M 22 52 L 78 52 Q 83 52 83 57 Q 83 62 78 62 L 22 62 Z" fill="#f43f5e" />
              <rect x="26" y="54" width="52" height="6" fill="#f1f5f9" rx="1" />
              <path d="M 22 52 Q 18 52 18 57 Q 18 62 22 62 Z" fill="#4c0519" opacity="0.4" />
              {/* Libro superior inclinado */}
              <g transform="rotate(-15, 50, 35)">
                <path d="M 25 35 L 75 35 Q 80 35 80 40 Q 80 45 75 45 L 25 45 Z" fill="#10b981" />
                <rect x="29" y="37" width="46" height="6" fill="#f1f5f9" rx="1" />
                <path d="M 25 35 Q 21 35 21 40 Q 21 45 25 45 Z" fill="#022c22" opacity="0.4" />
              </g>
            </g>
          </svg>
        );

      case 'open_book':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Tapas traseras */}
              <path d="M 8 72 L 48 78 L 48 28 L 8 22 Z" fill="#1e293b" />
              <path d="M 92 72 L 52 78 L 52 28 L 92 22 Z" fill="#1e293b" />
              {/* Páginas izquierda */}
              <path d="M 12 70 Q 30 71 47 75 L 47 25 Q 30 21 12 20 Z" fill="#ffffff" />
              <path d="M 13 71 Q 30 72 47 76 L 47 26 Q 30 22 13 21 Z" fill="#f8fafc" />
              {/* Páginas derecha */}
              <path d="M 88 70 Q 70 71 53 75 L 53 25 Q 70 21 88 20 Z" fill="#ffffff" />
              <path d="M 87 71 Q 70 72 53 76 L 53 26 Q 70 22 87 21 Z" fill="#f8fafc" />
              {/* Canto/Lomo inferior */}
              <path d="M 45 76 Q 50 82 55 76 Z" fill="#64748b" />
              {/* Marcador de cinta */}
              <path d="M 50 25 L 50 82 L 54 80 L 58 82 L 58 25 Z" fill={color} />
              {/* Líneas de texto simuladas */}
              <line x1="18" y1="32" x2="41" y2="34" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="18" y1="42" x2="38" y2="44" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="18" y1="52" x2="41" y2="54" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="18" y1="62" x2="35" y2="64" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />

              <line x1="59" y1="34" x2="82" y2="32" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="62" y1="44" x2="82" y2="42" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="59" y1="54" x2="82" y2="52" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
              <line x1="65" y1="64" x2="82" y2="62" stroke="#94a3b8" strokeWidth="2" opacity="0.6" />
            </g>
          </svg>
        );

      case 'notebook_1':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Cubierta del cuaderno */}
              <rect x="20" y="16" width="60" height="72" rx="6" fill={color} />
              {/* Detalle del lomo */}
              <path d="M 20 16 L 25 16 L 25 88 L 20 88 Z" fill="rgba(0,0,0,0.15)" />
              {/* Banda elástica vertical */}
              <rect x="64" y="16" width="6" height="72" rx="1" fill="#1e293b" />
              {/* Separador de páginas (cinta que sale por abajo) */}
              <path d="M 45 88 L 45 96 L 49 93 L 53 96 L 53 88 Z" fill="#f43f5e" />
              {/* Costuras/relieve del lomo */}
              <line x1="25" y1="26" x2="20" y2="26" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <line x1="25" y1="38" x2="20" y2="38" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <line x1="25" y1="50" x2="20" y2="50" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <line x1="25" y1="62" x2="20" y2="62" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
              <line x1="25" y1="74" x2="20" y2="74" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
            </g>
          </svg>
        );

      case 'notebook_2':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Cubierta del cuaderno */}
              <rect x="18" y="18" width="64" height="68" rx="8" fill={color} />
              {/* Lomo de cuero (izq) */}
              <path d="M 18 22 C 18 19, 21 18, 25 18 L 30 18 L 30 86 L 25 86 C 21 86, 18 85, 18 82 Z" fill="#78350f" opacity="0.9" />
              {/* Pestaña de cierre magnético */}
              <path d="M 64 45 L 86 45 C 88 45, 90 47, 90 50 C 90 53, 88 55, 86 55 L 64 55 Z" fill="#78350f" />
              <circle cx="80" cy="50" r="3" fill="#f59e0b" />
              {/* Detalle en relieve dorado */}
              <rect x="36" y="28" width="20" height="2" fill="#fbbf24" opacity="0.7" />
              <rect x="36" y="34" width="12" height="2" fill="#fbbf24" opacity="0.7" />
            </g>
          </svg>
        );

      case 'spiral_pad':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Base/Tapa trasera */}
              <rect x="20" y="24" width="60" height="66" rx="4" fill="#334155" />
              {/* Hojas de papel */}
              <rect x="22" y="28" width="56" height="58" rx="2" fill="#f8fafc" />
              {/* Líneas del papel */}
              <line x1="28" y1="42" x2="72" y2="42" stroke="#93c5fd" strokeWidth="1.2" />
              <line x1="28" y1="50" x2="72" y2="50" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="28" y1="58" x2="72" y2="58" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="28" y1="66" x2="72" y2="66" stroke="#cbd5e1" strokeWidth="1" />
              <line x1="28" y1="74" x2="72" y2="74" stroke="#cbd5e1" strokeWidth="1" />
              {/* Margen rojo vertical */}
              <line x1="36" y1="34" x2="36" y2="82" stroke="#fca5a5" strokeWidth="1.2" />
              {/* Espirales del bloc de notas */}
              <circle cx="28" cy="20" r="4" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="39" cy="20" r="4" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="50" cy="20" r="4" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="61" cy="20" r="4" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              <circle cx="72" cy="20" r="4" fill="none" stroke="#cbd5e1" strokeWidth="2.5" />
              {/* Enlaces de los espirales */}
              <line x1="28" y1="20" x2="28" y2="28" stroke="#94a3b8" strokeWidth="2" />
              <line x1="39" y1="20" x2="39" y2="28" stroke="#94a3b8" strokeWidth="2" />
              <line x1="50" y1="20" x2="50" y2="28" stroke="#94a3b8" strokeWidth="2" />
              <line x1="61" y1="20" x2="61" y2="28" stroke="#94a3b8" strokeWidth="2" />
              <line x1="72" y1="20" x2="72" y2="28" stroke="#94a3b8" strokeWidth="2" />
            </g>
          </svg>
        );

      case 'writing':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Tabla portapapeles/Clipboard */}
              <rect x="22" y="20" width="56" height="70" rx="6" fill="#78350f" />
              {/* Hoja blanca */}
              <rect x="26" y="28" width="48" height="58" rx="2" fill="#ffffff" />
              {/* Clip de metal superior */}
              <path d="M 40 16 L 60 16 L 58 26 L 42 26 Z" fill="#94a3b8" />
              <circle cx="50" cy="21" r="2.5" fill="#475569" />
              {/* Líneas escritas */}
              <line x1="32" y1="38" x2="68" y2="38" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="32" y1="46" x2="68" y2="46" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1="32" y1="54" x2="62" y2="54" stroke="#cbd5e1" strokeWidth="1.5" />
              {/* Pluma estilográfica cruzada */}
              <g transform="rotate(-30, 60, 60)">
                {/* Cuerpo pluma */}
                <rect x="52" y="32" width="6" height="42" rx="2" fill={color} />
                <path d="M 52 32 L 55 24 L 58 32 Z" fill="#fbbf24" /> {/* Punta */}
                <line x1="55" y1="24" x2="55" y2="32" stroke="#1e293b" strokeWidth="1" />
                <rect x="51" y="44" width="8" height="3" fill="#fbbf24" />
              </g>
            </g>
          </svg>
        );

      case 'idea':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 6px rgba(250,204,21,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Rayos de luz de fondo */}
              <circle cx="50" cy="46" r="30" fill="none" stroke="#fef08a" strokeWidth="1" strokeDasharray="4 6" opacity="0.8" />
              {/* Bulbo de cristal */}
              <path d="M 32 46 C 32 30, 68 30, 68 46 C 68 56, 58 60, 58 68 L 42 68 C 42 60, 32 56, 32 46 Z" fill="none" stroke="#facc15" strokeWidth="3" />
              <path d="M 32 46 C 32 30, 68 30, 68 46 C 68 56, 58 60, 58 68 L 42 68 C 42 60, 32 56, 32 46 Z" fill="rgba(254,240,138,0.15)" />
              {/* Base de rosca */}
              <rect x="44" y="68" width="12" height="4" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
              <rect x="44" y="73" width="12" height="4" rx="1" fill="#94a3b8" stroke="#64748b" strokeWidth="1" />
              <path d="M 46 78 Q 50 82 54 78 Z" fill="#475569" />
              {/* Filamento brillante */}
              <path d="M 44 68 L 46 54 Q 50 48 50 52 Q 50 48 54 54 L 56 68" fill="none" stroke="#facc15" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="6" fill="#facc15" />
            </g>
          </svg>
        );

      case 'brain':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(239,68,68,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Silueta del cerebro */}
              <path d="M 34 50 C 26 50, 22 40, 30 32 C 28 22, 40 18, 50 24 C 60 18, 72 22, 70 32 C 78 40, 74 50, 66 50 C 66 58, 62 66, 50 66 C 38 66, 34 58, 34 50 Z" fill="rgba(244,63,94,0.15)" stroke="#f43f5e" strokeWidth="3" />
              {/* Hemisferio divisorio */}
              <path d="M 50 24 L 50 66" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />
              {/* Conexiones sinápticas (nodos) */}
              <circle cx="36" cy="38" r="3" fill="#f43f5e" />
              <circle cx="44" cy="30" r="3" fill="#f43f5e" />
              <circle cx="56" cy="30" r="3" fill="#f43f5e" />
              <circle cx="64" cy="38" r="3" fill="#f43f5e" />
              <circle cx="42" cy="46" r="3.5" fill="#ec4899" />
              <circle cx="58" cy="46" r="3.5" fill="#ec4899" />
              <circle cx="44" cy="58" r="3" fill="#f43f5e" />
              <circle cx="56" cy="58" r="3" fill="#f43f5e" />
              {/* Líneas de enlace */}
              <line x1="36" y1="38" x2="42" y2="46" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="44" y1="30" x2="42" y2="46" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="56" y1="30" x2="58" y2="46" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="64" y1="38" x2="58" y2="46" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="42" y1="46" x2="44" y2="58" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="58" y1="46" x2="56" y2="58" stroke="#f43f5e" strokeWidth="1.2" />
              <line x1="42" y1="46" x2="58" y2="46" stroke="#ec4899" strokeWidth="1.5" />
            </g>
          </svg>
        );

      case 'pencil':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Dibujo de trazo de línea curva debajo del lápiz */}
              <path d="M 20 80 Q 40 82 50 68" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="3 3" />
              {/* Lápiz posicionado diagonalmente */}
              <g transform="rotate(-40, 50, 50)">
                {/* Borrador (rosa) */}
                <rect x="42" y="16" width="16" height="12" fill="#f43f5e" rx="1.5" />
                {/* Virola metálica (gris) */}
                <rect x="42" y="28" width="16" height="6" fill="#94a3b8" />
                <line x1="42" y1="31" x2="58" y2="31" stroke="#475569" strokeWidth="1" />
                {/* Cuerpo de madera (amarillo) */}
                <rect x="42" y="34" width="16" height="42" fill="#f59e0b" />
                <rect x="48" y="34" width="4" height="42" fill="#d97706" />
                {/* Punta tallada de madera */}
                <path d="M 42 76 L 50 90 L 58 76 Z" fill="#fed7aa" />
                {/* Mina de grafito */}
                <path d="M 48 83 L 50 90 L 52 83 Z" fill="#1e293b" />
              </g>
            </g>
          </svg>
        );

      case 'work':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Asa/Mango del maletín */}
              <path d="M 38 24 L 38 18 C 38 15, 41 12, 45 12 L 55 12 C 59 12, 62 15, 62 18 L 62 24" fill="none" stroke="#475569" strokeWidth="4.5" />
              {/* Cuerpo del maletín */}
              <rect x="14" y="24" width="72" height="58" rx="8" fill={color} />
              {/* Solapa superior del maletín */}
              <path d="M 14 24 L 86 24 L 86 48 L 58 48 C 55 48, 54 52, 50 52 C 46 52, 45 48, 42 48 L 14 48 Z" fill="rgba(0,0,0,0.15)" />
              {/* Cerraduras metálicas y hebilla */}
              <circle cx="32" cy="58" r="4.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
              <circle cx="68" cy="58" r="4.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
              <rect x="46" y="46" width="8" height="10" rx="1.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />
            </g>
          </svg>
        );

      case 'secret':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Grillete de candado */}
              <path d="M 30 46 L 30 32 C 30 20, 70 20, 70 32 L 70 46" fill="none" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
              {/* Cuerpo del candado */}
              <rect x="22" y="44" width="56" height="42" rx="8" fill={color} />
              <rect x="22" y="44" width="56" height="42" rx="8" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              {/* Ojo de la cerradura */}
              <circle cx="50" cy="60" r="5" fill="#1e293b" />
              <path d="M 47 62 L 53 62 L 55 76 L 45 76 Z" fill="#1e293b" />
              {/* Detalle metálico superior de seguridad */}
              <rect x="42" y="44" width="16" height="4" fill="#cbd5e1" />
            </g>
          </svg>
        );

      case 'rocket':
        return (
          <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 4px 6px rgba(249,115,22,0.25))' }}>
            <g transform="translate(0, -2)">
              {/* Fuego / Propulsión */}
              <path d="M 40 76 L 50 94 L 60 76 Z" fill="#ef4444" />
              <path d="M 44 76 L 50 88 L 56 76 Z" fill="#f97316" />
              <path d="M 47 76 L 50 82 L 53 76 Z" fill="#facc15" />
              {/* Aletas laterales cohete */}
              <path d="M 30 76 L 40 58 L 40 76 Z" fill="#b91c1c" />
              <path d="M 70 76 L 60 58 L 60 76 Z" fill="#b91c1c" />
              {/* Cuerpo del cohete */}
              <path d="M 40 76 L 40 44 C 40 24, 50 12, 50 12 C 50 12, 60 24, 60 44 L 60 76 Z" fill="#f8fafc" />
              {/* Punta del cohete */}
              <path d="M 40 40 C 40 24, 50 12, 50 12 C 50 12, 60 24, 60 40 Z" fill="#ef4444" />
              {/* Ventanilla redonda */}
              <circle cx="50" cy="46" r="6" fill="#38bdf8" stroke="#94a3b8" strokeWidth="2" />
              <circle cx="48" cy="44" r="2" fill="#ffffff" opacity="0.7" />
              {/* Líneas de costura de metal */}
              <line x1="40" y1="58" x2="60" y2="58" stroke="#cbd5e1" strokeWidth="1.5" />
            </g>
          </svg>
        );
    }
  }

  return (
    <svg width={containerSize} height={containerSize} viewBox="0 0 100 100" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
      <defs>
        {/* Degradado para la parte trasera de la carpeta */}
        <linearGradient id={`back-grad-${preset.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={preset.color} stopOpacity="0.85" />
          <stop offset="100%" stopColor={preset.color} stopOpacity="0.45" />
        </linearGradient>
        
        {/* Degradado para la parte delantera (glassmorphic) */}
        <linearGradient id={`front-grad-${preset.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={preset.color} stopOpacity="0.95" />
          <stop offset="60%" stopColor={preset.color} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>

        {/* Degradado para la hoja interior */}
        <linearGradient id="paper-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.9" />
        </linearGradient>
        
        {/* Sombra interna para profundidad */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodOpacity="0.25"/>
        </filter>
      </defs>

      <g transform="translate(0, -6)">
        {/* 1. Tapa trasera de la carpeta */}
        <path 
          d="M 6 30 C 6 26, 9 23, 13 23 L 34 23 C 37 23, 39 25, 41 27 L 47 34 C 48 35, 50 36, 52 36 L 87 36 C 91 36, 94 39, 94 43 L 94 84 C 94 88, 91 91, 87 91 L 13 91 C 9 91, 6 88, 6 84 Z" 
          fill={`url(#back-grad-${preset.id})`}
        />
        
        {/* 2. Papel/Documento que sobresale */}
        <path 
          d="M 16 30 C 16 28, 18 26, 20 26 L 80 26 C 82 26, 84 28, 84 30 L 84 65 L 16 65 Z" 
          fill="url(#paper-grad)"
          filter="url(#shadow)"
        />
        {/* Líneas en el papel que simulan renglones de libreta */}
        <line x1="24" y1="36" x2="76" y2="36" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.8" />
        <line x1="24" y1="44" x2="76" y2="44" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.8" />
        <line x1="24" y1="52" x2="76" y2="52" stroke="#cbd5e1" strokeWidth="1.5" opacity="0.8" />

        {/* 3. Tapa delantera de la carpeta (corte más bajo y efecto cristalizado) */}
        <path 
          d="M 6 42 C 6 38, 9 35, 13 35 L 87 35 C 91 35, 94 38, 94 42 L 94 84 C 94 88, 91 91, 87 91 L 13 91 C 9 91, 6 88, 6 84 Z" 
          fill={`url(#front-grad-${preset.id})`}
          filter="url(#shadow)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="1.2"
        />

        {/* Brillo en el borde superior de la tapa delantera */}
        <path 
          d="M 8 35 L 92 35" 
          stroke="rgba(255,255,255,0.4)" 
          strokeWidth="1" 
          fill="none"
        />

        {/* 4. Círculo frosted-glass para el emoji */}
        <circle cx="72" cy="68" r="19" fill="rgba(15, 23, 42, 0.45)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
        <circle cx="72" cy="68" r="18" fill="none" stroke={preset.color} strokeWidth="1.5" opacity="0.8" />

        {/* 5. Emoji */}
        <g transform="translate(72, 68)">
          <text 
            x="0" 
            y="0" 
            fontSize={emojiFontSizeInViewBox * emojiScale * 0.85} 
            textAnchor="middle" 
            dominantBaseline="central"
            style={{ userSelect: 'none', pointerEvents: 'none', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}
          >
            {preset.emoji}
          </text>
        </g>
      </g>
    </svg>
  );
};

// Modal selector de iconos
export const FolderIconSelectorModal = ({ visible, onHide, selectedIconId, onSelectIcon, theme, defaultCategory = 'general' }) => {
  const [hoveredId, setHoveredId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);
  
  // Determinar la categoría inicial basada en el icono seleccionado
  const getInitialCategory = useCallback(() => {
    if (!selectedIconId) return defaultCategory;
    const preset = FolderIconPresets[Object.keys(FolderIconPresets).find(key => 
      FolderIconPresets[key].id === selectedIconId
    )];
    return preset?.category || defaultCategory;
  }, [selectedIconId, defaultCategory]);
  
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

  return createPortal(
    <div
      onClick={onHide}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
          width: '700px',
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          zIndex: 10001,
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
    </div>,
    document.body
  );
};

