import React, { useState, useEffect } from 'react';
import appIcon from '../assets/app-icon.png';
import { InputText } from 'primereact/inputtext';
import { FaSearch } from 'react-icons/fa';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { iconThemes } from '../themes/icon-themes';

const TitleBar = ({ sidebarFilter, setSidebarFilter, allNodes, findAllConnections, onOpenSSHConnection, onShowImportDialog, onOpenImportWithSource, onQuickImportFromSource, iconTheme = 'material' }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredConnections, setFilteredConnections] = useState([]);

  useEffect(() => {
    if (sidebarFilter.trim()) {
      const allConnections = findAllConnections(allNodes);
      const filtered = allConnections.filter(node =>
        node.label.toLowerCase().includes(sidebarFilter.toLowerCase())
      );
      setFilteredConnections(filtered);
      setShowDropdown(filtered.length > 0);
    } else {
      setFilteredConnections([]);
      setShowDropdown(false);
    }
  }, [sidebarFilter, allNodes, findAllConnections]);

  // Banner para detectar cambios en fuentes vinculadas (usuario inicia revalidación bajo demanda)
  const [importBanner, setImportBanner] = useState(null);
  const [bannerTime, setBannerTime] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      const { source, hasChange } = e.detail || {};
      if (!source) return;
      // Mostrar banner solo si hay cambio confirmado
      if (hasChange === true) {
        setImportBanner({ fileName: source?.fileName, source });
        setBannerTime(new Date());
      }
    };
    window.addEventListener('import-source:poll', handler);
    return () => window.removeEventListener('import-source:poll', handler);
  }, []);

  const handleRecheckImportSource = async (source) => {
    try {
      // Intento directo: si tenemos ruta guardada, comparar hash y ofrecer actualizar
      const filePath = source?.filePath;
      if (!filePath) {
        onShowImportDialog && onShowImportDialog(true);
        setImportBanner(null);
        return;
      }
      const info = await window.electron?.import?.getFileInfo?.(filePath);
      if (!info?.ok) {
        onShowImportDialog && onShowImportDialog(true);
        setImportBanner(null);
        return;
      }
      const hashRes = await window.electron?.import?.getFileHash?.(filePath);
      if (!hashRes?.ok) {
        onShowImportDialog && onShowImportDialog(true);
        setImportBanner(null);
        return;
      }
      const changed = hashRes.hash && source.fileHash && hashRes.hash !== source.fileHash;
      if (changed) {
        // Abrir diálogo directamente para aplicar con opciones
        onShowImportDialog && onShowImportDialog(true);
      } else {
        alert('No se han detectado cambios en el archivo vinculado.');
      }
      setImportBanner(null);
    } catch (err) {
      console.error('Error revalidando fuente de importación:', err);
    }
  };

  const handleSelectConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);
          if (onOpenSSHConnection) {
        onOpenSSHConnection(node, allNodes);
      }
  };

  const handleMinimize = () => {
    window.electronAPI?.minimize && window.electronAPI.minimize();
  };
  const handleMaximizeRestore = () => {
    if (isMaximized) {
      window.electronAPI?.unmaximize && window.electronAPI.unmaximize();
      setIsMaximized(false);
    } else {
      window.electronAPI?.maximize && window.electronAPI.maximize();
      setIsMaximized(true);
    }
  };
  const handleClose = () => {
    window.electronAPI?.close && window.electronAPI.close();
  };

  // Función para manejar el menú de aplicación del TitleBar
  const handleAppMenuClick = (event) => {
    console.log('handleAppMenuClick TitleBar ejecutado - menú unificado');
    const menuStructure = createAppMenu(onShowImportDialog);
    createContextMenu(event, menuStructure, 'app-context-menu-unified');
    return;

    // Código legacy (no usado):
    const menuStructureLegacy = [
      {
        label: 'Archivo',
        icon: 'pi pi-file',
        submenu: [
          {
            label: 'Importar',
            icon: 'pi pi-file-excel',
            command: () => {
              console.log('Abriendo ImportDialog desde TitleBar...');
              onShowImportDialog && onShowImportDialog(true);
            }
          }
        ]
      },
      { separator: true },
      {
        label: 'Ver',
        icon: 'pi pi-eye',
        submenu: [
          {
            label: 'Recargar',
            icon: 'pi pi-refresh',
            shortcut: 'Ctrl+R',
            command: () => window.electronAPI?.reload && window.electronAPI.reload()
          },
          {
            label: 'Forzar recarga',
            icon: 'pi pi-replay',
            shortcut: 'Ctrl+Shift+R',
            command: () => window.electronAPI?.forceReload && window.electronAPI.forceReload()
          },
          { separator: true },
          {
            label: 'Herramientas de desarrollo',
            icon: 'pi pi-wrench',
            shortcut: 'F12',
            command: () => window.electronAPI?.toggleDevTools && window.electronAPI.toggleDevTools()
          },
          { separator: true },
          {
            label: 'Acercar',
            icon: 'pi pi-search-plus',
            shortcut: 'Ctrl++',
            command: () => window.electronAPI?.zoomIn && window.electronAPI.zoomIn()
          },
          {
            label: 'Alejar',
            icon: 'pi pi-search-minus',
            shortcut: 'Ctrl+-',
            command: () => window.electronAPI?.zoomOut && window.electronAPI.zoomOut()
          },
          {
            label: 'Tamaño real',
            icon: 'pi pi-expand',
            shortcut: 'Ctrl+0',
            command: () => window.electronAPI?.actualSize && window.electronAPI.actualSize()
          },
          { separator: true },
          {
            label: 'Pantalla completa',
            icon: 'pi pi-window-maximize',
            shortcut: 'F11',
            command: () => window.electronAPI?.toggleFullscreen && window.electronAPI.toggleFullscreen()
          }
        ]
      },
      { separator: true },
      {
        label: 'Acerca de NodeTerm',
        icon: 'pi pi-info-circle',
        command: () => {
          window.electronAPI?.getVersionInfo && window.electronAPI.getVersionInfo().then(versionInfo => {
            // Crear overlay de fondo
            const overlay = document.createElement('div');
            overlay.style.cssText = `
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: rgba(0, 0, 0, 0.5);
              z-index: 10000;
              display: flex;
              align-items: center;
              justify-content: center;
            `;
            
            const aboutDialog = document.createElement('div');
            aboutDialog.style.cssText = `
              background: var(--ui-sidebar-bg, #fff);
              border: 1px solid var(--ui-sidebar-border, #ddd);
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              min-width: 350px;
              max-width: 500px;
              color: var(--ui-text-primary, #333);
              font-family: var(--font-family, sans-serif);
            `;
            
            aboutDialog.innerHTML = `
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; text-align: center;">${versionInfo.appName || 'NodeTerm'}</h3>
              <div style="margin: 16px 0;">
                <p style="margin: 8px 0; font-size: 14px;"><strong>Versión:</strong> ${versionInfo.appVersion || '1.3.1'}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Electron:</strong> ${versionInfo.electronVersion || 'N/A'}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Node.js:</strong> ${versionInfo.nodeVersion || 'N/A'}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Chrome:</strong> ${versionInfo.chromeVersion || 'N/A'}</p>
              </div>
              <div style="margin-top: 20px; text-align: center;">
                <button id="closeAboutDialog" style="
                  background: var(--primary-color, #007ad9);
                  color: white;
                  border: none;
                  padding: 10px 20px;
                  border-radius: 4px;
                  cursor: pointer;
                  font-size: 14px;
                  min-width: 80px;
                ">Cerrar</button>
              </div>
            `;
            
            overlay.appendChild(aboutDialog);
            document.body.appendChild(overlay);
            // Evitar overlays colgados que bloqueen la UI
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                closeDialog();
              }
            });
            
            // Eventos para cerrar el diálogo
            const closeDialog = () => {
              if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
              }
            };
            
            document.getElementById('closeAboutDialog').addEventListener('click', closeDialog);
            overlay.addEventListener('click', (e) => {
              if (e.target === overlay) {
                closeDialog();
              }
            });
            
            // Cerrar con ESC
            const handleEsc = (e) => {
              if (e.key === 'Escape') {
                closeDialog();
                document.removeEventListener('keydown', handleEsc);
              }
            };
            document.addEventListener('keydown', handleEsc);
          }).catch(error => {
            console.error('Error obteniendo información de versión:', error);
          });
        }
      },
      { separator: true },
      {
        label: 'Salir',
        icon: 'pi pi-sign-out',
        shortcut: 'Ctrl+Q',
        command: () => {
          if (window.confirm('¿Estás seguro de que quieres salir de NodeTerm?')) {
            window.electronAPI?.quitApp && window.electronAPI.quitApp();
          }
        }
      }
    ];
    
    // Variables globales para el menú
    let activeSubmenu = null;
    let submenuTimer = null;
    
    // Función de limpieza completa
    const cleanupMenus = () => {
      if (submenuTimer) clearTimeout(submenuTimer);
      if (activeSubmenu && document.body.contains(activeSubmenu)) {
        document.body.removeChild(activeSubmenu);
      }
      const allMenus = document.querySelectorAll('.app-context-menu-titlebar');
      allMenus.forEach(menu => {
        // Limpiar todos los hovers antes de remover
        const menuItems = menu.querySelectorAll('.menu-item-titlebar');
        menuItems.forEach(item => {
          item.style.backgroundColor = 'transparent';
        });
        if (document.body.contains(menu)) {
          document.body.removeChild(menu);
        }
      });
      activeSubmenu = null;
      submenuTimer = null;
    };
    
    // SIN TIMERS - Control directo del submenú
    const hideSubmenu = () => {
      if (activeSubmenu && document.body.contains(activeSubmenu)) {
        document.body.removeChild(activeSubmenu);
        activeSubmenu = null;
      }
    };
    
    const showSubmenu = (menuItem, submenuItems) => {
      // PRIMERO: Ocultar cualquier submenú existente
      hideSubmenu();
      
      // SEGUNDO: Crear el nuevo submenú
      activeSubmenu = document.createElement('div');
      activeSubmenu.className = 'app-submenu-titlebar';
      activeSubmenu.style.cssText = `
        position: fixed;
        background: var(--ui-sidebar-bg, #333);
        border: 1px solid var(--ui-sidebar-border, #555);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        min-width: 200px;
        padding: 4px 0;
        font-family: var(--font-family, sans-serif);
        font-size: 14px;
      `;
      
      submenuItems.forEach(subItem => {
        const subMenuItem = createMenuItem(subItem, true);
        activeSubmenu.appendChild(subMenuItem);
      });
      
      // Agregar eventos para mantener el submenú abierto
      activeSubmenu.addEventListener('mouseenter', () => {
        // Mantener submenú abierto mientras el mouse esté sobre él
      });
      
      activeSubmenu.addEventListener('mouseleave', () => {
        hideSubmenu();
      });
      
      document.body.appendChild(activeSubmenu);
      
      // Posicionar inmediatamente
      const menuRect = menuItem.getBoundingClientRect();
      let left = menuRect.right;
      let top = menuRect.top;
      
      // Ajustar si se sale de la pantalla
      if (left + 200 > window.innerWidth) {
        left = menuRect.left - 200;
      }
      if (top + 300 > window.innerHeight) {
        top = window.innerHeight - 300 - 8;
      }
      
      activeSubmenu.style.left = `${left}px`;
      activeSubmenu.style.top = `${top}px`;
    };
    
    // Crear el menú contextual principal
    const contextMenu = document.createElement('div');
    contextMenu.className = 'app-context-menu-titlebar';
    contextMenu.style.cssText = `
      position: fixed;
      background: var(--ui-sidebar-bg, #333);
      border: 1px solid var(--ui-sidebar-border, #555);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      min-width: 220px;
      padding: 4px 0;
      font-family: var(--font-family, sans-serif);
      font-size: 14px;
    `;
    
    const createMenuItem = (item, isSubmenu = false) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = `
          height: 1px;
          background: var(--ui-sidebar-border, #555);
          margin: 4px 8px;
        `;
        return separator;
      }
      
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item-titlebar';
      menuItem.style.cssText = `
        padding: ${isSubmenu ? '8px 20px' : '10px 16px'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ui-sidebar-text, #fff);
        transition: background-color 0.15s ease;
        position: relative;
      `;
      
      const leftContent = document.createElement('div');
      leftContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
      `;
      
      leftContent.innerHTML = `
        <i class="${item.icon}" style="width: 16px; font-size: 14px;"></i>
        <span>${item.label}</span>
      `;
      
      menuItem.appendChild(leftContent);
      
      // Agregar shortcut si existe
      if (item.shortcut) {
        const shortcut = document.createElement('span');
        shortcut.style.cssText = `
          font-size: 12px;
          color: var(--ui-sidebar-text, #aaa);
          margin-left: 20px;
        `;
        shortcut.textContent = item.shortcut;
        menuItem.appendChild(shortcut);
      }
      
      // Agregar flecha para submenús
      if (item.submenu) {
        const arrow = document.createElement('i');
        arrow.className = 'pi pi-angle-right';
        arrow.style.cssText = `
          font-size: 12px;
          margin-left: 10px;
        `;
        menuItem.appendChild(arrow);
      }
      
      // Eventos para elementos con submenú
      if (item.submenu) {
        menuItem.addEventListener('mouseenter', () => {
          
          // Limpiar hover de otros elementos
          const allMenuItems = contextMenu.querySelectorAll('.menu-item-titlebar');
          allMenuItems.forEach(item => {
            if (item !== menuItem) {
              item.style.backgroundColor = 'transparent';
            }
          });
          menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
          
          // Mostrar submenú directamente - SIN TIMERS
          showSubmenu(menuItem, item.submenu);
        });
        
        menuItem.addEventListener('mouseleave', (e) => {
          // Solo ocultar si NO se va hacia el submenú
          const rect = activeSubmenu ? activeSubmenu.getBoundingClientRect() : null;
          if (!rect || (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom)) {
            setTimeout(() => {
              // Verificar nuevamente después de un pequeño delay
              if (activeSubmenu && !activeSubmenu.matches(':hover') && !menuItem.matches(':hover')) {
                hideSubmenu();
              }
            }, 100);
          }
        });
      } else {
        // Eventos para elementos normales
        menuItem.addEventListener('mouseenter', () => {
          // Limpiar hover de otros elementos
          const allMenuItems = contextMenu.querySelectorAll('.menu-item-titlebar');
          allMenuItems.forEach(item => {
            if (item !== menuItem) {
              item.style.backgroundColor = 'transparent';
            }
          });
          menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
        });
        
        menuItem.addEventListener('mouseleave', () => {
          menuItem.style.backgroundColor = 'transparent';
        });
      }
      
      if (item.command) {
        menuItem.addEventListener('click', () => {
          item.command();
          // Cerrar todo usando la función de limpieza
          cleanupMenus();
        });
      }
      
      return menuItem;
    };
    
    menuStructure.forEach(item => {
      const menuItem = createMenuItem(item);
      contextMenu.appendChild(menuItem);
    });
    
    document.body.appendChild(contextMenu);
    
    // Posicionar el menú principal
    setTimeout(() => {
      const rect = event.target.closest('button').getBoundingClientRect();
      const menuRect = contextMenu.getBoundingClientRect();
      
      let left = rect.left;
      let top = rect.top - menuRect.height - 8;
      
      // Ajustar si se sale de la pantalla
      if (left + menuRect.width > window.innerWidth) {
        left = window.innerWidth - menuRect.width - 8;
      }
      if (top < 8) {
        top = rect.bottom + 8;
      }
      
      contextMenu.style.left = `${left}px`;
      contextMenu.style.top = `${top}px`;
    }, 10);
    
    // Cerrar el menú al hacer clic fuera
    const closeMenu = (e) => {
      const button = event.target.closest('button');
      const menu = document.querySelector('.app-context-menu-titlebar');
      const submenu = document.querySelector('.app-submenu-titlebar');
      const isClickOnButton = button && button.contains(e.target);
      const isClickOnMenu = menu && menu.contains(e.target);
      const isClickOnSubmenu = submenu && submenu.contains(e.target);
      
      if (!isClickOnButton && !isClickOnMenu && !isClickOnSubmenu) {
        cleanupMenus();
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  };

  return (
    <div
      className="titlebar"
      style={{
        height: 36,
        minHeight: 36,
        maxHeight: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        padding: '0 6px',
        userSelect: 'none',
        WebkitAppRegion: 'drag',
        zIndex: 1000,
        position: 'relative'
      }}
    >
      {importBanner && (
        <div style={{
          position: 'absolute',
          top: 34,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--surface-card, #2b2f33)',
          border: '1px solid var(--surface-border, #3a3f44)',
          color: 'var(--text-color, #e0e0e0)',
          padding: '6px 10px',
          borderRadius: 6,
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          zIndex: 2000
        }}>
          <span>Detectado cambio en “{importBanner.fileName}”. {bannerTime ? `(${bannerTime.toLocaleTimeString()})` : ''}</span>
          <button
            onClick={() => { if (onQuickImportFromSource) onQuickImportFromSource(importBanner.source); setImportBanner(null); }}
            style={{
              background: 'var(--primary-color, #1976d2)',
              color: 'var(--primary-color-text, #fff)',
              border: 'none',
              padding: '4px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >Actualizar ahora</button>
          <button
            onClick={() => {
              if (onOpenImportWithSource) onOpenImportWithSource(importBanner.source);
              setImportBanner(null);
            }}
            style={{
              background: 'transparent',
              color: 'var(--primary-color, #1976d2)',
              border: '1px solid var(--primary-color, #1976d2)',
              padding: '3px 8px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >Revisar</button>
          <button
            onClick={() => setImportBanner(null)}
            style={{
              background: 'transparent',
              color: 'var(--text-color-secondary, #a0a0a0)',
              border: 'none',
              padding: '2px 6px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12
            }}
          >Ignorar</button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 6 }}>
        <img src={require('../assets/app-icon.png')} alt="icon" style={{ width: 18, height: 18, marginRight: 6, marginLeft: 8, display: 'block' }} />
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ui-titlebar-text, #fff)', letterSpacing: 0.1, lineHeight: '18px', display: 'flex', alignItems: 'center', height: 18 }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative', minWidth: 350, maxWidth: 600, width: '35vw', WebkitAppRegion: 'no-drag' }}>
          {!sidebarFilter && (
            <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)', color: '#888', pointerEvents: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FaSearch />
              <span>Buscar...</span>
            </span>
          )}
          <InputText
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder=""
            style={{
              minWidth: 350,
              maxWidth: 600,
              width: '100%',
              paddingLeft: 0,
              height: 28,
              borderRadius: 6,
              border: '1px solid #bbb',
              fontSize: 13,
              background: 'rgba(255,255,255,0.85)',
              color: '#222',
              fontWeight: 500,
              outline: 'none',
              boxShadow: '0 1px 4px 0 rgba(0,0,0,0.08)',
              transition: 'border 0.2s',
              zIndex: 1,
              textAlign: 'center',
            }}
            onFocus={() => setShowDropdown(filteredConnections.length > 0)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 36,
              left: 0,
              width: '100%',
              background: '#232629',
              color: '#fff',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 9999,
              maxHeight: 300,
              overflowY: 'auto',
              border: '1px solid #444',
              WebkitAppRegion: 'no-drag',
            }}>
              {filteredConnections.map(node => {
                const isSSH = node.data && node.data.type === 'ssh';
                const isRDP = node.data && node.data.type === 'rdp';
                const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['material'].icons;
                
                let icon = null;
                let protocolColor = '#4fc3f7';
                let protocolName = 'Conexión';
                
                if (isSSH) {
                  icon = themeIcons.ssh;
                  protocolColor = '#28a745';
                  protocolName = 'SSH';
                } else if (isRDP) {
                  icon = themeIcons.rdp;
                  protocolColor = '#007ad9';
                  protocolName = 'RDP';
                }
                
                // Verificar si es favorito (esto necesitaría implementarse según tu lógica de favoritos)
                const isFavorite = false; // TODO: Implementar lógica de favoritos
                
                return (
                  <div
                    key={node.key}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      borderBottom: '1px solid #333',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      borderRadius: '4px',
                      margin: '2px 4px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#2a2d31';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onMouseDown={e => e.preventDefault()}
                    onClick={() => handleSelectConnection(node)}
                  >
                    {/* Icono de conexión */}
                    <div style={{ display: 'flex', alignItems: 'center', minWidth: 20, justifyContent: 'center' }}>
                      {isSSH ? (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>⚡</span>
                      ) : isRDP ? (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🖥️</span>
                      ) : (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🔗</span>
                      )}
                    </div>
                    
                    {/* Nombre y protocolo */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ 
                        whiteSpace: 'nowrap', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        fontWeight: 500,
                        color: '#fff'
                      }}>
                        {node.label}
                      </span>
                      <span style={{ 
                        fontSize: 10, 
                        color: protocolColor,
                        fontWeight: 600,
                        backgroundColor: `${protocolColor}20`,
                        padding: '2px 6px',
                        borderRadius: '10px',
                        border: `1px solid ${protocolColor}40`,
                        whiteSpace: 'nowrap'
                      }}>
                        {protocolName}
                      </span>
                    </div>
                    
                    {/* Botones de acción */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {/* Botón de favoritos */}
                      <button
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: isFavorite ? '#ffd700' : '#666',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#ffd700';
                          e.currentTarget.style.backgroundColor = '#444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = isFavorite ? '#ffd700' : '#666';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implementar lógica de favoritos
                          console.log('Toggle favorito:', node);
                        }}
                        title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
                      >
                        <i className="pi pi-star" />
                      </button>
                      
                      {/* Botón de editar */}
                      <button
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#888',
                          cursor: 'pointer',
                          padding: '4px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = '#fff';
                          e.currentTarget.style.backgroundColor = '#444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = '#888';
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implementar lógica para editar
                          console.log('Editar conexión:', node);
                        }}
                        title="Editar conexión"
                      >
                        <i className="pi pi-pencil" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredConnections.length === 0 && (
                <div style={{ padding: '12px', color: '#aaa', fontSize: 13, textAlign: 'center' }}>Sin resultados</div>
              )}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, WebkitAppRegion: 'no-drag' }}>
        {/* Botón de menú (3 puntos) */}
        <button
          title="Menú"
          onClick={(event) => {
            console.log('Click en menú TitleBar detectado');
            handleAppMenuClick(event);
          }}
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cy="6" cx="2.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="6" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="9.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/></svg>
        </button>
        {/* Minimizar */}
        <button
          onClick={handleMinimize}
          title="Minimizar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3" y="6.5" width="8" height="1.7" rx="0.85" fill="var(--ui-titlebar-text, #fff)" /></svg>
        </button>
        {/* Maximizar/Restaurar */}
        <button
          onClick={handleMaximizeRestore}
          title="Maximizar/Restaurar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e3e6ea')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.2" /></svg>
        </button>
        {/* Cerrar */}
        <button
          onClick={handleClose}
          title="Cerrar"
          style={{
            width: 22,
            height: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 4,
            margin: 0,
            padding: 0,
            transition: 'background 0.15s',
            cursor: 'pointer'
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e57373')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><line x1="4" y1="4" x2="10" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /><line x1="10" y1="4" x2="4" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 