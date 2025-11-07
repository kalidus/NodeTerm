import React, { useState, useEffect, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import mcpCatalogData from '../data/mcp-catalog.json';

// Componente: Sección colapsable simple y robusta
const CollapsibleSection = ({
  id,
  icon,
  color,
  title,
  description,
  count,
  expanded,
  onToggle,
  themeColors,
  children
}) => {
  return (
    <div key={id} style={{
      background: themeColors.cardBackground,
      border: `1px solid ${themeColors.borderColor}`,
      borderRadius: '10px'
    }}>
      <div
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        style={{
          padding: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          cursor: 'pointer',
          userSelect: 'none',
          background: expanded ? `${color}15` : 'transparent',
          borderBottom: expanded ? `1px solid ${themeColors.borderColor}` : 'none'
        }}
      >
        <div style={{
          width: '36px',
          height: '36px',
          background: `${color}20`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <i className={icon} style={{ fontSize: '1.1rem', color: color }} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600', color: themeColors.textPrimary }}>{title}</h3>
            <span style={{
              fontSize: '0.65rem',
              padding: '0.125rem 0.4rem',
              background: `${color}20`,
              border: `1px solid ${color}40`,
              borderRadius: '8px',
              fontWeight: '600',
              color
            }}>{count}</span>
          </div>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.7rem', color: themeColors.textSecondary, lineHeight: '1.2' }}>{description}</p>
        </div>

        <i className={expanded ? 'pi pi-chevron-up' : 'pi pi-chevron-down'} style={{ fontSize: '0.8rem', color: themeColors.textSecondary }} />
      </div>

      {expanded && (
        <div style={{ padding: '0.75rem' }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Componente: Tarjeta MCP compacta
const MCPCard = ({ mcp, installed, serverState, onInstall, themeColors }) => {
  const buttonLabel = installed ? 'Instalado' : (mcp.requiresConfig ? 'Configurar' : 'Instalar');
  const buttonIcon = installed ? 'pi pi-check' : (mcp.requiresConfig ? 'pi pi-cog' : 'pi pi-download');

  return (
    <div style={{
      background: themeColors.cardBackground,
      border: `1px solid ${installed ? 'rgba(100, 200, 100, 0.4)' : themeColors.borderColor}`,
      borderRadius: '10px',
      padding: '0.75rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      position: 'relative'
    }}>
      {installed && (
        <div style={{
          position: 'absolute',
          top: '0.625rem',
          right: '0.625rem',
          background: serverState?.running ? 'rgba(100, 200, 100, 0.2)' : 'rgba(158, 158, 158, 0.2)',
          border: serverState?.running ? '1px solid rgba(100, 200, 100, 0.6)' : '1px solid rgba(158, 158, 158, 0.4)',
          borderRadius: '10px',
          padding: '0.15rem 0.4rem',
          fontSize: '0.65rem',
          fontWeight: '600',
          color: themeColors.textPrimary
        }}>
          {serverState?.running ? '● ACTIVO' : '○ Instalado'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', paddingRight: installed ? '3.5rem' : '0' }}>
        <div style={{
          width: '32px',
          height: '32px',
          background: `${themeColors.primaryColor}20`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <i className={mcp.icon} style={{ fontSize: '1rem', color: themeColors.primaryColor }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '0.875rem', fontWeight: '600', color: themeColors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mcp.name}</h4>
          <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.65rem', color: themeColors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mcp.package}</p>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.75rem', color: themeColors.textSecondary, lineHeight: '1.3', flex: 1, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mcp.description}</p>

      {mcp.warning && (
        <div style={{ padding: '0.375rem', background: 'rgba(255, 152, 0, 0.1)', border: '1px solid rgba(255, 152, 0, 0.3)', borderRadius: '6px', fontSize: '0.7rem', color: '#ff9800' }}>⚠️ {mcp.warning}</div>
      )}

      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {mcp.capabilities?.map(cap => (
          <span key={cap} style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem', background: `${themeColors.primaryColor}15`, border: `1px solid ${themeColors.primaryColor}40`, borderRadius: '6px', color: themeColors.textPrimary, fontWeight: '500' }}>{cap}</span>
        ))}
        {mcp.tools && (
          <span style={{ fontSize: '0.625rem', padding: '0.15rem 0.4rem', background: 'rgba(100, 200, 100, 0.1)', border: '1px solid rgba(100, 200, 100, 0.3)', borderRadius: '6px', color: themeColors.textPrimary, fontWeight: '500' }}>🔧 {mcp.tools.length}</span>
        )}
      </div>

      <Button
        label={buttonLabel}
        icon={buttonIcon}
        disabled={installed}
        onClick={() => onInstall(mcp)}
        style={{ width: '100%', background: installed ? 'rgba(100, 200, 100, 0.2)' : themeColors.primaryColor, border: installed ? '1px solid rgba(100, 200, 100, 0.4)' : 'none', color: installed ? themeColors.textSecondary : 'white', borderRadius: '7px', fontSize: '0.75rem', padding: '0.4rem', cursor: installed ? 'not-allowed' : 'pointer', opacity: installed ? 0.7 : 1, fontWeight: '500' }}
      />
    </div>
  );
};

const MCPCatalog = ({ installedServers = [], onInstall, themeColors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const allCategoryIds = useMemo(() => mcpCatalogData.categories.map(c => c.id), []);
  const [expandedCategories, setExpandedCategories] = useState(() => allCategoryIds);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedMCP, setSelectedMCP] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customPackage, setCustomPackage] = useState('');
  const [customId, setCustomId] = useState('');
  const [customArgs, setCustomArgs] = useState('');

  useEffect(() => {
    setExpandedCategories(allCategoryIds);
  }, [allCategoryIds]);

  const isInstalled = (mcpId) => installedServers.some(s => s.id === mcpId);
  const getServerState = (mcpId) => installedServers.find(s => s.id === mcpId) || null;

  const filteredMCPs = useMemo(() => {
    if (!searchTerm.trim()) return mcpCatalogData.mcps;
    const term = searchTerm.toLowerCase();
    return mcpCatalogData.mcps.filter(mcp =>
      mcp.name.toLowerCase().includes(term) ||
      mcp.description.toLowerCase().includes(term) ||
      mcp.package.toLowerCase().includes(term) ||
      (mcp.tools && mcp.tools.some(t => t.toLowerCase().includes(term)))
    );
  }, [searchTerm]);

  const mcpsByCategory = useMemo(() => {
    const grouped = {};
    mcpCatalogData.categories.forEach(category => {
      grouped[category.id] = { ...category, mcps: [] };
    });
    filteredMCPs.forEach(mcp => {
      if (grouped[mcp.category]) grouped[mcp.category].mcps.push(mcp);
    });
    return grouped;
  }, [filteredMCPs]);

  const stats = useMemo(() => {
    const total = mcpCatalogData.mcps.length;
    let installed = 0; let active = 0;
    installedServers.forEach(server => { installed++; if (server.running) active++; });
    return { total, installed, active, available: total - installed };
  }, [installedServers]);

  const toggleCategory = (categoryId) => {
    setExpandedCategories(prev => prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]);
  };
  const toggleAllCategories = () => {
    setExpandedCategories(prev => prev.length === mcpCatalogData.categories.length ? [] : mcpCatalogData.categories.map(c => c.id));
  };

  const handleInstall = (mcp) => {
    if (mcp.requiresConfig) {
      setSelectedMCP(mcp); setConfigValues({}); setShowConfigDialog(true);
      return;
    }
    const config = { command: 'npx', args: ['-y', mcp.package], enabled: true, autostart: false, autoRestart: true };
    if (onInstall) onInstall(mcp.id, config);
  };

  const handleConfirmInstall = () => {
    if (!selectedMCP) return;
    const args = ['-y', selectedMCP.package];
    if (selectedMCP.configSchema) {
      for (const [key, schema] of Object.entries(selectedMCP.configSchema)) {
        const value = configValues[key];
        if (!value) continue;
        if (schema.type === 'array') {
          const arrayValue = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
          arrayValue.forEach(v => args.push(v));
        } else {
          args.push(value);
        }
      }
    }
    const config = { command: 'npx', args, enabled: true, autostart: false, autoRestart: true, configValues };
    if (onInstall) onInstall(selectedMCP.id, config);
    setShowConfigDialog(false); setSelectedMCP(null); setConfigValues({});
  };

  const handleCustomInstall = () => {
    if (!customPackage.trim() || !customId.trim()) return;
    const args = customArgs.trim() ? ['-y', customPackage, ...customArgs.split(' ').filter(a => a.trim())] : ['-y', customPackage];
    const config = { command: 'npx', args, enabled: true, autostart: false, autoRestart: true };
    if (onInstall) onInstall(customId, config);
    setShowCustomDialog(false); setCustomPackage(''); setCustomId(''); setCustomArgs('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', height: '100%', width: '100%', minHeight: 0 }}>
      {/* Header: Búsqueda + Stats */}
      <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
        <div style={{ flex: 1, minWidth: '180px', position: 'relative' }}>
          <i className="pi pi-search" style={{ position: 'absolute', left: '0.625rem', top: '50%', transform: 'translateY(-50%)', color: themeColors.textSecondary, fontSize: '0.8rem' }} />
          <InputText value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar MCPs..." style={{ width: '100%', paddingLeft: '2.25rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem 0.5rem 0.5rem 2.25rem' }} />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0.875rem', background: 'rgba(255,255,255,0.03)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: themeColors.textPrimary }}>{stats.total}</div>
            <div style={{ fontSize: '0.6rem', color: themeColors.textSecondary }}>Total</div>
          </div>
          <div style={{ width: '1px', background: themeColors.borderColor }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#66bb6a' }}>{stats.active}</div>
            <div style={{ fontSize: '0.6rem', color: themeColors.textSecondary }}>Activos</div>
          </div>
          <div style={{ width: '1px', background: themeColors.borderColor }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#9e9e9e' }}>{stats.installed}</div>
            <div style={{ fontSize: '0.6rem', color: themeColors.textSecondary }}>Instalados</div>
          </div>
          <div style={{ width: '1px', background: themeColors.borderColor }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: themeColors.primaryColor }}>{stats.available}</div>
            <div style={{ fontSize: '0.6rem', color: themeColors.textSecondary }}>Disponibles</div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div style={{ display: 'flex', gap: '0.625rem', flexShrink: 0 }}>
        <Button label={expandedCategories.length === mcpCatalogData.categories.length ? 'Colapsar Todo' : 'Expandir Todo'} icon={expandedCategories.length === mcpCatalogData.categories.length ? 'pi pi-minus' : 'pi pi-plus'} onClick={toggleAllCategories} style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, color: themeColors.textPrimary, borderRadius: '8px', fontSize: '0.75rem', padding: '0.4rem 0.875rem' }} />
        <Button label="MCP Personalizado" icon="pi pi-plus-circle" onClick={() => setShowCustomDialog(true)} style={{ background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.75rem', padding: '0.4rem 0.875rem', fontWeight: '500' }} />
      </div>

      {/* Categorías */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingRight: '0.25rem', minHeight: 0 }}>
        {mcpCatalogData.categories.map(category => {
          const categoryData = mcpsByCategory[category.id];
          if (!categoryData) return null;
          const mcpCount = categoryData.mcps?.length || 0;
          if (mcpCount === 0 && searchTerm.trim()) return null;
          const expanded = expandedCategories.includes(category.id);

          return (
            <CollapsibleSection
              key={category.id}
              id={category.id}
              icon={category.icon}
              color={category.color}
              title={category.name}
              description={category.description}
              count={mcpCount}
              expanded={expanded}
              onToggle={toggleCategory}
              themeColors={themeColors}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
                {mcpCount > 0 ? (
                  categoryData.mcps.map(mcp => (
                    <MCPCard key={mcp.id} mcp={mcp} installed={isInstalled(mcp.id)} serverState={getServerState(mcp.id)} onInstall={handleInstall} themeColors={themeColors} />
                  ))
                ) : (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                    <i className="pi pi-inbox" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'block' }} />
                    <p style={{ margin: 0 }}>No hay MCPs en esta categoría</p>
                  </div>
                )}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      {/* Diálogos */}
      <Dialog header={`Configurar ${selectedMCP?.name}`} visible={showConfigDialog} onHide={() => setShowConfigDialog(false)} style={{ width: '480px' }} contentStyle={{ background: themeColors.cardBackground, padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: themeColors.textSecondary, lineHeight: '1.4' }}>{selectedMCP?.description}</p>
          {selectedMCP?.configSchema && Object.entries(selectedMCP.configSchema).map(([key, schema]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: themeColors.textPrimary }}>{key} {schema.required && <span style={{ color: '#f44336' }}>*</span>}</label>
              {schema.description && (<p style={{ margin: 0, fontSize: '0.7rem', color: themeColors.textSecondary }}>{schema.description}</p>)}
              {schema.type === 'array' ? (
                <InputTextarea value={configValues[key] || ''} onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })} placeholder={schema.example ? `Ejemplo: ${schema.example.join(', ')}` : 'Separar con comas'} rows={3} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem' }} />
              ) : (
                <InputText type={schema.secret ? 'password' : 'text'} value={configValues[key] || ''} onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })} placeholder={schema.example || `Ingresa ${key}`} style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem' }} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.4rem' }}>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowConfigDialog(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, color: themeColors.textPrimary, borderRadius: '8px' }} />
            <Button label="Instalar" icon="pi pi-download" onClick={handleConfirmInstall} style={{ flex: 1, background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px' }} />
          </div>
        </div>
      </Dialog>

      <Dialog header="Instalar MCP Personalizado" visible={showCustomDialog} onHide={() => setShowCustomDialog(false)} style={{ width: '480px' }} contentStyle={{ background: themeColors.cardBackground, padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: themeColors.textSecondary, lineHeight: '1.4' }}>Instala un MCP desde npm que no esté en el catálogo.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: themeColors.textPrimary }}>ID del Servidor <span style={{ color: '#f44336' }}>*</span></label>
            <InputText value={customId} onChange={(e) => setCustomId(e.target.value)} placeholder="mi-mcp-custom" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: themeColors.textPrimary }}>Package NPM <span style={{ color: '#f44336' }}>*</span></label>
            <InputText value={customPackage} onChange={(e) => setCustomPackage(e.target.value)} placeholder="@org/mi-mcp-server" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '600', color: themeColors.textPrimary }}>Argumentos (opcional)</label>
            <InputText value={customArgs} onChange={(e) => setCustomArgs(e.target.value)} placeholder="--config /path/to/config" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, fontSize: '0.8rem', padding: '0.5rem' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.625rem', marginTop: '0.4rem' }}>
            <Button label="Cancelar" icon="pi pi-times" onClick={() => setShowCustomDialog(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, color: themeColors.textPrimary, borderRadius: '8px' }} />
            <Button label="Instalar" icon="pi pi-download" onClick={handleCustomInstall} disabled={!customPackage.trim() || !customId.trim()} style={{ flex: 1, background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px', opacity: (!customPackage.trim() || !customId.trim()) ? 0.5 : 1 }} />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MCPCatalog;
