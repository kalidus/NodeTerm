import React, { useState, useEffect, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputTextarea } from 'primereact/inputtextarea';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import mcpCatalogData from '../data/mcp-catalog.json';

const MCPCatalog = ({ installedServers = [], onInstall, themeColors }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedMCP, setSelectedMCP] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customPackage, setCustomPackage] = useState('');
  const [customId, setCustomId] = useState('');
  const [customArgs, setCustomArgs] = useState('');

  // Categorías con opción "Todos"
  const categories = useMemo(() => {
    return [
      { id: 'all', name: 'Todos', icon: 'pi-th-large' },
      ...mcpCatalogData.categories
    ];
  }, []);

  // Filtrar MCPs según búsqueda y categoría
  const filteredMCPs = useMemo(() => {
    let filtered = mcpCatalogData.mcps;

    // Filtrar por categoría
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(mcp => mcp.category === selectedCategory);
    }

    // Filtrar por término de búsqueda
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(mcp =>
        mcp.name.toLowerCase().includes(term) ||
        mcp.description.toLowerCase().includes(term) ||
        mcp.package.toLowerCase().includes(term) ||
        (mcp.tools && mcp.tools.some(t => t.toLowerCase().includes(term)))
      );
    }

    return filtered;
  }, [searchTerm, selectedCategory]);

  // Verificar si un MCP está instalado
  const isInstalled = (mcpId) => {
    return installedServers.some(s => s.id === mcpId);
  };

  // Obtener estado de un MCP instalado
  const getServerState = (mcpId) => {
    const server = installedServers.find(s => s.id === mcpId);
    return server || null;
  };

  // Manejar instalación de MCP
  const handleInstall = (mcp) => {
    console.log('🔧 [MCP Catalog] Instalando MCP:', mcp.id);
    
    if (mcp.requiresConfig) {
      // Mostrar diálogo de configuración
      setSelectedMCP(mcp);
      setConfigValues({});
      setShowConfigDialog(true);
    } else {
      // Instalar sin configuración
      const config = {
        command: 'npx',
        args: ['-y', mcp.package],
        enabled: true,
        autostart: false, // Cambiar a false por defecto para evitar que se inicie automáticamente
        autoRestart: true
      };
      
      console.log('   Config sin diálogo:', config);
      
      if (onInstall) {
        onInstall(mcp.id, config);
      }
    }
  };

  // Confirmar instalación con configuración
  const handleConfirmInstall = () => {
    if (!selectedMCP) return;

    console.log('🔧 [MCP Catalog] Confirmando instalación con config:', selectedMCP.id, configValues);

    // Construir args con configuración
    const args = ['-y', selectedMCP.package];
    
    // Agregar configuración como argumentos
    // Cada elemento del array se pasa como un argumento separado a spawn()
    // Node.js maneja automáticamente los espacios dentro de cada argumento
    if (selectedMCP.configSchema) {
      for (const [key, schema] of Object.entries(selectedMCP.configSchema)) {
        const value = configValues[key];
        if (value) {
          if (schema.type === 'array') {
            // Para arrays, pasar cada elemento como argumento separado
            const arrayValue = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
            arrayValue.forEach(v => args.push(v)); // NO agregar comillas, spawn() lo maneja
          } else {
            // Para valores únicos, pasarlos tal cual
            args.push(value); // NO agregar comillas, spawn() lo maneja
          }
        }
      }
    }

    const config = {
      command: 'npx',
      args,
      enabled: true,
      autostart: false, // Cambiar a false por defecto
      autoRestart: true,
      configValues // Guardar los valores de configuración también
    };

    console.log('   Config con diálogo:', config);

    if (onInstall) {
      onInstall(selectedMCP.id, config);
    }

    setShowConfigDialog(false);
    setSelectedMCP(null);
    setConfigValues({});
  };

  // Manejar instalación de MCP personalizado
  const handleCustomInstall = () => {
    if (!customPackage.trim() || !customId.trim()) return;

    console.log('🔧 [MCP Catalog] Instalación personalizada:', customId, customPackage);

    const args = customArgs.trim() 
      ? ['-y', customPackage, ...customArgs.split(' ').filter(a => a.trim())]
      : ['-y', customPackage];

    const config = {
      command: 'npx',
      args,
      enabled: true,
      autostart: false, // Cambiar a false por defecto
      autoRestart: true
    };

    console.log('   Config personalizada:', config);

    if (onInstall) {
      onInstall(customId, config);
    }

    setShowCustomDialog(false);
    setCustomPackage('');
    setCustomId('');
    setCustomArgs('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      {/* Barra de búsqueda y filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <i className="pi pi-search" style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: themeColors.textSecondary,
            fontSize: '0.9rem'
          }} />
          <InputText
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar MCPs..."
            style={{
              width: '100%',
              paddingLeft: '2.5rem',
              background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${themeColors.borderColor}`,
              borderRadius: '8px',
              color: themeColors.textPrimary,
              fontSize: '0.9rem',
              padding: '0.6rem 0.6rem 0.6rem 2.5rem'
            }}
          />
        </div>

        <Dropdown
          value={selectedCategory}
          options={categories}
          onChange={(e) => setSelectedCategory(e.value)}
          optionLabel="name"
          optionValue="id"
          placeholder="Categoría"
          style={{
            minWidth: '150px',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid ${themeColors.borderColor}`,
            borderRadius: '8px'
          }}
        />

        <Button
          label="MCP Personalizado"
          icon="pi pi-plus"
          onClick={() => setShowCustomDialog(true)}
          style={{
            background: 'rgba(100, 200, 100, 0.2)',
            border: '1px solid rgba(100, 200, 100, 0.4)',
            color: themeColors.textPrimary,
            borderRadius: '8px',
            fontSize: '0.85rem',
            padding: '0.6rem 1rem'
          }}
        />
      </div>

      {/* Contador de resultados */}
      <div style={{
        fontSize: '0.85rem',
        color: themeColors.textSecondary,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <i className="pi pi-info-circle" />
        <span>{filteredMCPs.length} MCP{filteredMCPs.length !== 1 ? 's' : ''} disponible{filteredMCPs.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Grid de MCPs */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1rem',
        padding: '0.25rem'
      }}>
        {filteredMCPs.map((mcp) => {
          const installed = isInstalled(mcp.id);
          const serverState = getServerState(mcp.id);

          return (
            <div
              key={mcp.id}
              style={{
                background: `linear-gradient(135deg, ${themeColors.cardBackground} 0%, ${themeColors.cardBackground}dd 100%)`,
                border: `1px solid ${installed ? 'rgba(100, 200, 100, 0.4)' : themeColors.borderColor}`,
                borderRadius: '12px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${themeColors.primaryColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Badge de estado */}
              {installed && (
                <div style={{
                  position: 'absolute',
                  top: '0.75rem',
                  right: '0.75rem',
                  background: serverState?.running ? 'rgba(100, 200, 100, 0.2)' : 'rgba(255, 193, 7, 0.2)',
                  border: serverState?.running ? '1px solid rgba(100, 200, 100, 0.4)' : '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: '12px',
                  padding: '0.25rem 0.5rem',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  color: themeColors.textPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <i className={serverState?.running ? 'pi pi-check-circle' : 'pi pi-pause'} style={{ fontSize: '0.7rem' }} />
                  {serverState?.running ? 'Activo' : 'Instalado'}
                </div>
              )}

              {/* Header con icono y nombre */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingRight: installed ? '4rem' : '0' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: `${themeColors.primaryColor}20`,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <i className={mcp.icon} style={{
                    fontSize: '1.25rem',
                    color: themeColors.primaryColor
                  }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: themeColors.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {mcp.name}
                  </h3>
                  <p style={{
                    margin: '0.15rem 0 0 0',
                    fontSize: '0.75rem',
                    color: themeColors.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {mcp.package}
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <p style={{
                margin: 0,
                fontSize: '0.85rem',
                color: themeColors.textSecondary,
                lineHeight: '1.5',
                flex: 1,
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {mcp.description}
              </p>

              {/* Capacidades y herramientas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {mcp.capabilities && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {mcp.capabilities.map(cap => (
                      <span key={cap} style={{
                        fontSize: '0.7rem',
                        padding: '0.2rem 0.5rem',
                        background: `${themeColors.primaryColor}15`,
                        border: `1px solid ${themeColors.primaryColor}40`,
                        borderRadius: '8px',
                        color: themeColors.textPrimary
                      }}>
                        {cap}
                      </span>
                    ))}
                  </div>
                )}

                {mcp.tools && mcp.tools.length > 0 && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: themeColors.textSecondary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <i className="pi pi-wrench" style={{ fontSize: '0.7rem' }} />
                    <span>{mcp.tools.length} herramienta{mcp.tools.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>

              {/* Botón de acción */}
              <Button
                label={installed ? 'Instalado' : 'Instalar'}
                icon={installed ? 'pi pi-check' : 'pi pi-download'}
                disabled={installed}
                onClick={(e) => {
                  e.stopPropagation();
                  handleInstall(mcp);
                }}
                style={{
                  width: '100%',
                  background: installed 
                    ? 'rgba(100, 200, 100, 0.2)'
                    : `${themeColors.primaryColor}`,
                  border: installed 
                    ? '1px solid rgba(100, 200, 100, 0.4)'
                    : 'none',
                  color: installed ? themeColors.textSecondary : 'white',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  padding: '0.6rem',
                  cursor: installed ? 'not-allowed' : 'pointer',
                  opacity: installed ? 0.7 : 1
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Diálogo de configuración */}
      <Dialog
        header={`Configurar ${selectedMCP?.name}`}
        visible={showConfigDialog}
        onHide={() => setShowConfigDialog(false)}
        style={{ width: '500px' }}
        contentStyle={{
          background: themeColors.cardBackground,
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{
            margin: 0,
            fontSize: '0.9rem',
            color: themeColors.textSecondary,
            lineHeight: '1.5'
          }}>
            {selectedMCP?.description}
          </p>

          {selectedMCP?.configSchema && Object.entries(selectedMCP.configSchema).map(([key, schema]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: themeColors.textPrimary
              }}>
                {key} {schema.required && <span style={{ color: '#f44336' }}>*</span>}
              </label>
              
              {schema.description && (
                <p style={{
                  margin: 0,
                  fontSize: '0.75rem',
                  color: themeColors.textSecondary
                }}>
                  {schema.description}
                </p>
              )}

              {schema.type === 'array' ? (
                <InputTextarea
                  value={configValues[key] || ''}
                  onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                  placeholder={schema.example ? `Ejemplo: ${schema.example.join(', ')}` : 'Separar con comas'}
                  rows={3}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '8px',
                    color: themeColors.textPrimary,
                    fontSize: '0.85rem',
                    padding: '0.6rem'
                  }}
                />
              ) : (
                <InputText
                  type={schema.secret ? 'password' : 'text'}
                  value={configValues[key] || ''}
                  onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })}
                  placeholder={schema.example || `Ingresa ${key}`}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${themeColors.borderColor}`,
                    borderRadius: '8px',
                    color: themeColors.textPrimary,
                    fontSize: '0.85rem',
                    padding: '0.6rem'
                  }}
                />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setShowConfigDialog(false)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                color: themeColors.textPrimary,
                borderRadius: '8px'
              }}
            />
            <Button
              label="Instalar"
              icon="pi pi-download"
              onClick={handleConfirmInstall}
              style={{
                flex: 1,
                background: themeColors.primaryColor,
                border: 'none',
                color: 'white',
                borderRadius: '8px'
              }}
            />
          </div>
        </div>
      </Dialog>

      {/* Diálogo de MCP personalizado */}
      <Dialog
        header="Instalar MCP Personalizado"
        visible={showCustomDialog}
        onHide={() => setShowCustomDialog(false)}
        style={{ width: '500px' }}
        contentStyle={{
          background: themeColors.cardBackground,
          padding: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: themeColors.textPrimary
            }}>
              ID del Servidor <span style={{ color: '#f44336' }}>*</span>
            </label>
            <InputText
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              placeholder="mi-mcp-custom"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
                color: themeColors.textPrimary,
                fontSize: '0.85rem',
                padding: '0.6rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: themeColors.textPrimary
            }}>
              Package NPM <span style={{ color: '#f44336' }}>*</span>
            </label>
            <InputText
              value={customPackage}
              onChange={(e) => setCustomPackage(e.target.value)}
              placeholder="@org/mi-mcp-server"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
                color: themeColors.textPrimary,
                fontSize: '0.85rem',
                padding: '0.6rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{
              fontSize: '0.85rem',
              fontWeight: '600',
              color: themeColors.textPrimary
            }}>
              Argumentos (opcional)
            </label>
            <InputText
              value={customArgs}
              onChange={(e) => setCustomArgs(e.target.value)}
              placeholder="--config /path/to/config"
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                borderRadius: '8px',
                color: themeColors.textPrimary,
                fontSize: '0.85rem',
                padding: '0.6rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setShowCustomDialog(false)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${themeColors.borderColor}`,
                color: themeColors.textPrimary,
                borderRadius: '8px'
              }}
            />
            <Button
              label="Instalar"
              icon="pi pi-download"
              onClick={handleCustomInstall}
              disabled={!customPackage.trim() || !customId.trim()}
              style={{
                flex: 1,
                background: themeColors.primaryColor,
                border: 'none',
                color: 'white',
                borderRadius: '8px',
                opacity: (!customPackage.trim() || !customId.trim()) ? 0.5 : 1
              }}
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default MCPCatalog;

