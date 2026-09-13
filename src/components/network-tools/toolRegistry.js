/**
 * toolRegistry.js - Categorías, metadatos y configuraciones de NetworkTools
 */

import React from 'react';

export const TOOL_CATEGORIES = [
  {
    id: 'connectivity',
    label: 'Conectividad',
    icon: 'pi pi-wifi',
    color: '#22c55e',
    tools: [
      { id: 'ping', label: 'Ping', icon: 'pi pi-clock', description: 'Test de conectividad con estadísticas' },
      { id: 'traceroute', label: 'Traceroute', icon: 'pi pi-sitemap', description: 'Trazado de rutas de red' }
    ]
  },
  {
    id: 'scanning',
    label: 'Escaneo',
    icon: 'pi pi-search',
    color: '#f59e0b',
    tools: [
      { id: 'port-scan', label: 'Port Scanner', icon: 'pi pi-th-large', description: 'Escaneo de puertos TCP' },
      { id: 'network-scan', label: 'Network Scan', icon: 'pi pi-globe', description: 'Descubrimiento de hosts en red' }
    ]
  },
  {
    id: 'dns',
    label: 'DNS',
    icon: 'pi pi-database',
    color: '#3b82f6',
    tools: [
      { id: 'dns-lookup', label: 'DNS Lookup', icon: 'pi pi-search-plus', description: 'Resolución de registros DNS' },
      { id: 'reverse-dns', label: 'Reverse DNS', icon: 'pi pi-replay', description: 'DNS inverso (IP a hostname)' }
    ]
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: 'pi pi-shield',
    color: '#ef4444',
    tools: [
      { id: 'ssl-check', label: 'SSL Checker', icon: 'pi pi-lock', description: 'Verificación de certificados SSL/TLS' },
      { id: 'http-headers', label: 'HTTP Headers', icon: 'pi pi-file', description: 'Análisis de cabeceras HTTP' },
      { id: 'host-vuln-scan', label: 'Host Vuln Scanner', icon: 'pi pi-exclamation-triangle', description: 'Detecta vulnerabilidades y CVEs en servicios' },
      { id: 'web-security-scan', label: 'Web Security', icon: 'pi pi-globe', description: 'Analiza seguridad web, headers y cookies' },
      { id: 'cvss-calculator', label: 'CVSS Calculator', icon: 'pi pi-chart-bar', description: 'Calcula CVSS 3.1 y 4.0 · Templates · Reportes HTML/PDF' },
      { id: 'recent-vulns', label: 'Critical Vulns', icon: 'pi pi-shield', description: 'Consulta vulnerabilidades críticas globales de los últimos años' }
    ]
  },
  {
    id: 'utilities',
    label: 'Utilidades',
    icon: 'pi pi-cog',
    color: '#8b5cf6',
    tools: [
      { id: 'whois', label: 'WHOIS', icon: 'pi pi-id-card', description: 'Información de dominio' },
      { id: 'subnet-calc', label: 'Subnet Calculator', icon: 'pi pi-calculator', description: 'Calculadora de subredes' },
      { id: 'wake-on-lan', label: 'Wake on LAN', icon: 'pi pi-power-off', description: 'Despertar equipos en red' }
    ]
  }
];

export const TOOL_COMPONENTS = {
  'ping': React.lazy(() => import('./panels/PingPanel')),
  'traceroute': React.lazy(() => import('./panels/TraceroutePanel')),
  'port-scan': React.lazy(() => import('./panels/PortScannerPanel')),
  'network-scan': React.lazy(() => import('./panels/NetworkScannerPanel')),
  'dns-lookup': React.lazy(() => import('./panels/DnsLookupPanel')),
  'reverse-dns': React.lazy(() => import('./panels/ReverseDnsPanel')),
  'ssl-check': React.lazy(() => import('./panels/SslCheckerPanel')),
  'http-headers': React.lazy(() => import('./panels/HttpHeadersPanel')),
  'host-vuln-scan': React.lazy(() => import('./panels/HostVulnScanPanel')),
  'web-security-scan': React.lazy(() => import('./panels/WebSecurityScanPanel')),
  'cvss-calculator': React.lazy(() => import('./CvssCalculatorPanel')),
  'recent-vulns': React.lazy(() => import('./RecentVulnsPanel')),
  'whois': React.lazy(() => import('./panels/WhoisPanel')),
  'subnet-calc': React.lazy(() => import('./panels/SubnetCalculatorPanel')),
  'wake-on-lan': React.lazy(() => import('./panels/WakeOnLanPanel'))
};

export const DNS_RECORD_TYPES = [
  { label: 'A (IPv4)', value: 'A' },
  { label: 'AAAA (IPv6)', value: 'AAAA' },
  { label: 'MX (Mail)', value: 'MX' },
  { label: 'TXT', value: 'TXT' },
  { label: 'NS (Name Servers)', value: 'NS' },
  { label: 'SOA (Authority)', value: 'SOA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'Todos', value: 'ALL' }
];

export const COMMON_INPUT_STYLE = {
  width: '100%',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '8px',
  color: 'var(--text-color)'
};

export const COMMON_LABEL_STYLE = {
  display: 'block',
  marginBottom: '0.5rem',
  color: 'var(--text-color-secondary)',
  fontSize: '0.85rem',
  fontWeight: '500'
};

export const hexToRgba = (hex, alpha) => {
  if (!hex) return 'transparent';
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const getResultBoxStyle = (isMobile = false) => ({
  background: 'rgba(0,0,0,0.2)',
  borderRadius: '8px',
  padding: isMobile ? '0.75rem' : '1rem',
  fontFamily: 'monospace',
  fontSize: isMobile ? '0.75rem' : '0.85rem',
  lineHeight: '1.6',
  color: 'rgba(255,255,255,0.95)',
  overflow: 'visible',
  wordBreak: 'break-word',
  overflowWrap: 'break-word',
  width: '100%'
});

export const getStatItemStyle = (isMobile = false) => ({
  display: 'flex',
  flexDirection: isMobile ? 'column' : 'row',
  justifyContent: isMobile ? 'flex-start' : 'space-between',
  alignItems: isMobile ? 'flex-start' : 'center',
  padding: '0.5rem 0',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  gap: isMobile ? '0.25rem' : '0'
});

export const findToolMetadata = (toolId) => {
  for (const cat of TOOL_CATEGORIES) {
    const tool = cat.tools.find(t => t.id === toolId);
    if (tool) {
      return {
        ...tool,
        categoryId: cat.id,
        categoryLabel: cat.label,
        categoryColor: cat.color
      };
    }
  }
  return {
    id: toolId,
    label: toolId,
    icon: 'pi pi-cog',
    description: '',
    categoryColor: '#2196f3'
  };
};
