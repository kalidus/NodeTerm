import React, { useState, useEffect } from 'react';
import { Button } from 'primereact/button';
import mcpClient from '../services/MCPClientService';

const MCPActiveTools = ({ themeColors, onExpandedChange }) => {
  const [tools, setTools] = useState([]);
  const [servers, setServers] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadData();

    // Listener para cambios
    const unsubscribe = mcpClient.addListener((event, data) => {
      if (event === 'tools-updated' || event === 'servers-updated') {
        loadData();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(expanded);
    }
  }, [expanded, onExpandedChange]);

  const loadData = async () => {
    // Forzar refresh de herramientas antes de cargar
    try {
      await mcpClient.refreshTools();
      await mcpClient.refreshServers();
    } catch (error) {
      console.error('[MCPActiveTools] Error refrescando:', error);
    }
    
    const allTools = mcpClient.getAvailableTools();
    const allServers = mcpClient.getActiveServers();
    
    // 🔒 DEBUG: Log de herramientas de Tenable
    const tenableTools = allTools.filter(t => t.serverId === 'tenable');
    if (tenableTools.length > 0) {
      console.log(`🔒 [MCPActiveTools] Herramientas de Tenable encontradas: ${tenableTools.length}`, 
        tenableTools.map(t => t.name));
    } else {
      console.warn(`⚠️ [MCPActiveTools] NO se encontraron herramientas de Tenable. Total herramientas: ${allTools.length}`);
      // Log de todas las herramientas para debugging
      const toolsByServer = allTools.reduce((acc, t) => {
        acc[t.serverId] = (acc[t.serverId] || 0) + 1;
        return acc;
      }, {});
      console.log('   Herramientas por servidor:', toolsByServer);
    }
    
    setTools(allTools);
    setServers(allServers);
    setStats(mcpClient.getStats());
  };
  
  const handleRefresh = async () => {
    try {
      await mcpClient.refreshAll();
      loadData();
    } catch (error) {
      console.error('[MCPActiveTools] Error en refresh manual:', error);
    }
  };

  // 🔒 MEJORADO: Mostrar si hay herramientas disponibles O servidores activos
  // Esto asegura que las herramientas sean visibles incluso si el servidor está iniciando
  if (tools.length === 0 && servers.length === 0) {
    return null; // No mostrar si no hay herramientas ni servidores
  }

  return (
    <div style={{
      position: 'relative',
      background: expanded 
        ? `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`
        : 'transparent',
      border: expanded ? `1px solid ${themeColors.borderColor}` : 'none',
      borderRadius: expanded ? '8px' : '0',
      padding: expanded ? '0.75rem' : '0',
      marginBottom: expanded ? '0.5rem' : '0',
      transition: 'all 0.2s ease'
    }}>
      {/* Header con toggle */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          padding: expanded ? '0' : '0.5rem',
          background: !expanded 
            ? `linear-gradient(135deg, ${themeColors.primaryColor}20 0%, ${themeColors.primaryColor}10 100%)`
            : 'transparent',
          border: !expanded ? `1px solid ${themeColors.primaryColor}40` : 'none',
          borderRadius: '8px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.primaryColor}30 0%, ${themeColors.primaryColor}15 100%)`;
          }
        }}
        onMouseLeave={(e) => {
          if (!expanded) {
            e.currentTarget.style.background = `linear-gradient(135deg, ${themeColors.primaryColor}20 0%, ${themeColors.primaryColor}10 100%)`;
          }
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.85rem',
          color: themeColors.textPrimary,
          fontWeight: '500'
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#66bb6a',
            boxShadow: '0 0 6px #66bb6a'
          }} />
          <i className="pi pi-wrench" style={{ fontSize: '0.9rem' }} />
          <span>{tools.length} herramienta{tools.length !== 1 ? 's' : ''} MCP disponible{tools.length !== 1 ? 's' : ''}</span>
        </div>

        <i className={`pi ${expanded ? 'pi-chevron-up' : 'pi-chevron-down'}`} 
           style={{ fontSize: '0.8rem', color: themeColors.textSecondary }} />
      </div>

      {/* Panel expandido */}
      {expanded && (
        <div style={{
          marginTop: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          animation: 'slideIn 0.2s ease',
          maxHeight: '70vh',
          overflow: 'auto'
        }}>
          {/* Servidores activos */}
          {servers.length > 0 && (
            <div>
              <div style={{
                fontSize: '0.75rem',
                color: themeColors.textSecondary,
                marginBottom: '0.5rem',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Servidores Activos ({servers.length})
              </div>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {servers.map(server => (
                  <div
                    key={server.id}
                    style={{
                      padding: '0.3rem 0.6rem',
                      background: `rgba(100, 200, 100, 0.15)`,
                      border: `1px solid rgba(100, 200, 100, 0.3)`,
                      borderRadius: '12px',
                      fontSize: '0.75rem',
                      color: themeColors.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem'
                    }}
                  >
                    <div style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#66bb6a'
                    }} />
                    {server.id}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Mensaje si hay herramientas pero no servidores activos */}
          {tools.length > 0 && servers.length === 0 && (
            <div style={{
              padding: '0.5rem',
              background: 'rgba(255, 193, 7, 0.1)',
              border: '1px solid rgba(255, 193, 7, 0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: themeColors.textPrimary,
              marginBottom: '0.5rem'
            }}>
              <i className="pi pi-info-circle" style={{ marginRight: '0.3rem' }} />
              Herramientas disponibles pero servidores no activos. Las herramientas se activarán automáticamente cuando sean necesarias.
            </div>
          )}

          {/* Tools disponibles */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.5rem'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: themeColors.textSecondary,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Herramientas ({tools.length})
              </div>
              <button
                onClick={handleRefresh}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: `1px solid ${themeColors.borderColor}`,
                  borderRadius: '4px',
                  padding: '0.2rem 0.4rem',
                  color: themeColors.textPrimary,
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                }}
                title="Actualizar herramientas"
              >
                <i className="pi pi-refresh" style={{ fontSize: '0.7rem' }} />
                Actualizar
              </button>
            </div>
            
            {tools.length === 0 && servers.length > 0 && (
              <div style={{
                padding: '0.75rem',
                background: 'rgba(255, 193, 7, 0.1)',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: themeColors.textPrimary,
                marginBottom: '0.5rem'
              }}>
                <i className="pi pi-exclamation-triangle" style={{ marginRight: '0.3rem' }} />
                No se encontraron herramientas. Los servidores pueden estar iniciando. Haz clic en "Actualizar" para refrescar.
              </div>
            )}

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '0.5rem',
              maxHeight: '200px',
              overflowY: 'auto',
              padding: '0.25rem'
            }}>
              {tools.map((tool, index) => (
                <div
                  key={`${tool.serverId}-${tool.name}-${index}`}
                  style={{
                    padding: '0.5rem',
                    background: `rgba(255,255,255,0.03)`,
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.borderColor = themeColors.primaryColor;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = themeColors.borderColor;
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <i className="pi pi-wrench" style={{
                      fontSize: '0.8rem',
                      color: themeColors.primaryColor
                    }} />
                    <span style={{
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      color: themeColors.textPrimary,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {tool.name}
                    </span>
                  </div>

                  {tool.description && (
                    <p style={{
                      margin: 0,
                      fontSize: '0.7rem',
                      color: themeColors.textSecondary,
                      lineHeight: '1.3',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {tool.description}
                    </p>
                  )}

                  <div style={{
                    fontSize: '0.65rem',
                    color: themeColors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    opacity: 0.7
                  }}>
                    <i className="pi pi-server" style={{ fontSize: '0.6rem' }} />
                    {tool.serverId}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Estadísticas */}
          {stats && (
            <div style={{
              padding: '0.5rem',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '6px',
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              fontSize: '0.7rem',
              color: themeColors.textSecondary
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <i className="pi pi-server" style={{ fontSize: '0.7rem' }} />
                <span>{stats.activeServers} servidores</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <i className="pi pi-box" style={{ fontSize: '0.7rem' }} />
                <span>{stats.totalResources} resources</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <i className="pi pi-comment" style={{ fontSize: '0.7rem' }} />
                <span>{stats.totalPrompts} prompts</span>
              </div>
            </div>
          )}
        </div>
      )}

      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default MCPActiveTools;

