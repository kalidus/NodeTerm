import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';

const TOOL_CATEGORIES = [
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
      { id: 'host-vuln-scan', label: 'Host Vuln Scanner', icon: 'pi pi-exclamation-triangle', description: 'Detecta vulnerabilidades y CVEs' },
      { id: 'web-security-scan', label: 'Web Security', icon: 'pi pi-globe', description: 'Analiza seguridad web' },
      { id: 'cvss-calculator', label: 'CVSS Calculator', icon: 'pi pi-chart-bar', description: 'Calcula CVSS 3.1 y 4.0' }
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

const ToolsSidebar = ({ onOpenTool }) => {
  const [expandedCategories, setExpandedCategories] = useState(
    TOOL_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.id]: true }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredTool, setHoveredTool] = useState(null);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => ({ ...prev, [categoryId]: !prev[categoryId] }));
  };

  const filteredCategories = TOOL_CATEGORIES.map(cat => ({
    ...cat,
    tools: searchQuery
      ? cat.tools.filter(t =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : cat.tools
  })).filter(cat => cat.tools.length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <i className="pi pi-wrench" style={{ color: '#06b6d4', fontSize: '0.9rem' }} />
          <span style={{ fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-color)' }}>Herramientas</span>
        </div>
        <span className="p-input-icon-left" style={{ width: '100%' }}>
          <i className="pi pi-search" style={{ fontSize: '0.75rem' }} />
          <InputText
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar herramienta..."
            style={{
              width: '100%',
              fontSize: '0.8rem',
              padding: '0.35rem 0.5rem 0.35rem 1.75rem',
              height: '28px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '6px',
              color: 'var(--text-color)'
            }}
          />
        </span>
      </div>

      {/* Lista de categorías y herramientas */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.25rem 0' }}>
        {filteredCategories.map(category => (
          <div key={category.id}>
            {/* Header de categoría */}
            <div
              onClick={() => toggleCategory(category.id)}
              style={{
                padding: '0.5rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
                userSelect: 'none',
                color: category.color,
                fontWeight: '600',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                opacity: 0.9
              }}
            >
              <i
                className={expandedCategories[category.id] ? 'pi pi-chevron-down' : 'pi pi-chevron-right'}
                style={{ fontSize: '0.65rem', transition: 'transform 0.15s ease' }}
              />
              <i className={category.icon} style={{ fontSize: '0.8rem' }} />
              <span>{category.label}</span>
              <span style={{
                marginLeft: 'auto',
                background: `${category.color}25`,
                color: category.color,
                borderRadius: '10px',
                padding: '0 5px',
                fontSize: '0.65rem',
                fontWeight: '700'
              }}>
                {category.tools.length}
              </span>
            </div>

            {/* Herramientas de la categoría */}
            {expandedCategories[category.id] && category.tools.map(tool => (
              <div
                key={tool.id}
                onClick={() => onOpenTool && onOpenTool(tool.id, tool.label)}
                onMouseEnter={() => setHoveredTool(tool.id)}
                onMouseLeave={() => setHoveredTool(null)}
                style={{
                  padding: '0.45rem 0.75rem 0.45rem 2rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: hoveredTool === tool.id ? 'rgba(255,255,255,0.07)' : 'transparent',
                  borderLeft: `2px solid ${hoveredTool === tool.id ? category.color : 'transparent'}`,
                  transition: 'all 0.12s ease',
                  color: hoveredTool === tool.id ? 'var(--text-color)' : 'var(--text-color-secondary)'
                }}
                title={tool.description}
              >
                <i className={tool.icon} style={{ fontSize: '0.8rem', color: hoveredTool === tool.id ? category.color : undefined, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tool.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.75 }}>
                    {tool.description}
                  </div>
                </div>
                {hoveredTool === tool.id && (
                  <i className="pi pi-arrow-right" style={{ fontSize: '0.65rem', color: category.color, flexShrink: 0 }} />
                )}
              </div>
            ))}
          </div>
        ))}

        {filteredCategories.length === 0 && (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
            <i className="pi pi-search" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', display: 'block', opacity: 0.4 }} />
            No se encontraron herramientas
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsSidebar;
