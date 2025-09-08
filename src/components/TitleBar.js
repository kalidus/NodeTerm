import React, { useState, useEffect } from 'react';
import appIcon from '../assets/app-icon.png';
import { InputText } from 'primereact/inputtext';
import { FaSearch } from 'react-icons/fa';

const TitleBar = ({ sidebarFilter, setSidebarFilter, allNodes, findAllConnections, onOpenSSHConnection, onShowImportDialog }) => {
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
    console.log('handleAppMenuClick TitleBar ejecutado');
    
    // Remover menú existente si está abierto
    const existingMenu = document.querySelector('.app-context-menu-titlebar');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Estructura del menú con submenús
    const menuStructure = [
      {
        label: 'Archivo',
        icon: 'pi pi-file',
        submenu: [
          {
            label: 'Importar desde mRemoteNG',
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
    
    // Función simplificada para cerrar submenú (como funciona "Ver")
    const scheduleSubmenuClose = () => {
      if (submenuTimer) clearTimeout(submenuTimer);
      submenuTimer = setTimeout(() => {
        if (activeSubmenu && document.body.contains(activeSubmenu)) {
          document.body.removeChild(activeSubmenu);
          activeSubmenu = null;
        }
      }, 300); // Timer más corto y simple
    };
    
    // Función para cancelar el cierre
    const cancelSubmenuClose = () => {
      if (submenuTimer) {
        clearTimeout(submenuTimer);
        submenuTimer = null;
      }
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
          cancelSubmenuClose();
          
          // Limpiar hover de otros elementos
          const allMenuItems = contextMenu.querySelectorAll('.menu-item-titlebar');
          allMenuItems.forEach(item => {
            if (item !== menuItem) {
              item.style.backgroundColor = 'transparent';
            }
          });
          menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
          
          // Limpiar submenú anterior
          if (activeSubmenu && document.body.contains(activeSubmenu)) {
            document.body.removeChild(activeSubmenu);
          }
          
          // Crear nuevo submenú
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
          
          // Eventos simplificados del submenú (igual que funciona "Ver")
          activeSubmenu.addEventListener('mouseenter', cancelSubmenuClose);
          activeSubmenu.addEventListener('mouseleave', scheduleSubmenuClose);
          
          item.submenu.forEach(subItem => {
            const subMenuItem = createMenuItem(subItem, true);
            activeSubmenu.appendChild(subMenuItem);
          });
          
          document.body.appendChild(activeSubmenu);
          
          // Posicionar submenú de manera simple y directa
          setTimeout(() => {
            const menuRect = menuItem.getBoundingClientRect();
            const submenuRect = activeSubmenu.getBoundingClientRect();
            
            let left = menuRect.right;
            let top = menuRect.top;
            
            // Ajustar si se sale de la pantalla
            if (left + submenuRect.width > window.innerWidth) {
              left = menuRect.left - submenuRect.width;
            }
            if (top + submenuRect.height > window.innerHeight) {
              top = window.innerHeight - submenuRect.height - 8;
            }
            
            activeSubmenu.style.left = `${left}px`;
            activeSubmenu.style.top = `${top}px`;
          }, 5);
        });
        
        menuItem.addEventListener('mouseleave', scheduleSubmenuClose);
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
        height: 32,
        minHeight: 32,
        maxHeight: 32,
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
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 6 }}>
        <img src={require('../assets/app-icon.png')} alt="icon" style={{ width: 18, height: 18, marginRight: 6, marginLeft: 8, display: 'block' }} />
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ui-titlebar-text, #fff)', letterSpacing: 0.1, lineHeight: '18px', display: 'flex', alignItems: 'center', height: 18 }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative', minWidth: 250, maxWidth: 520, width: '22vw', WebkitAppRegion: 'no-drag' }}>
          <span style={{ position: 'absolute', left: 10, top: 7, color: '#888', pointerEvents: 'none', fontSize: 13 }}>
            <FaSearch />
          </span>
          <InputText
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder="Buscar..."
            style={{
              minWidth: 250,
              maxWidth: 520,
              width: '100%',
              paddingLeft: 36,
              height: 24,
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
            }}
            onFocus={() => setShowDropdown(filteredConnections.length > 0)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            autoComplete="off"
          />
          {showDropdown && (
            <div style={{
              position: 'absolute',
              top: 32,
              left: 0,
              width: 320,
              background: '#232629',
              color: '#fff',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
              zIndex: 9999,
              maxHeight: 260,
              overflowY: 'auto',
              border: '1px solid #444',
              WebkitAppRegion: 'no-drag',
            }}>
              {filteredConnections.map(node => (
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
                  }}
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleSelectConnection(node)}
                >
                  <i className="pi pi-desktop" style={{ color: '#4fc3f7', fontSize: 15 }} />
                  <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.label}</span>
                </div>
              ))}
              {filteredConnections.length === 0 && (
                <div style={{ padding: '8px 12px', color: '#aaa', fontSize: 13 }}>Sin resultados</div>
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