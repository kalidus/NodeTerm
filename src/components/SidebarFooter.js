import React from 'react';
import { Button } from 'primereact/button';

const SidebarFooter = ({ onConfigClick, allExpanded, toggleExpandAll }) => {
  const handleAppMenuClick = (event) => {
    // Estructura del menú con submenús
    const menuStructure = [
      {
        label: 'Ver',
        icon: 'pi pi-eye',
        submenu: [
          {
            label: 'Recargar',
            icon: 'pi pi-refresh',
            shortcut: 'Ctrl+R',
            command: () => window.electronAPI.reload()
          },
          {
            label: 'Forzar recarga',
            icon: 'pi pi-replay',
            shortcut: 'Ctrl+Shift+R',
            command: () => window.electronAPI.forceReload()
          },
          { separator: true },
          {
            label: 'Herramientas de desarrollo',
            icon: 'pi pi-wrench',
            shortcut: 'F12',
            command: () => window.electronAPI.toggleDevTools()
          },
          { separator: true },
          {
            label: 'Acercar',
            icon: 'pi pi-search-plus',
            shortcut: 'Ctrl++',
            command: () => window.electronAPI.zoomIn()
          },
          {
            label: 'Alejar',
            icon: 'pi pi-search-minus',
            shortcut: 'Ctrl+-',
            command: () => window.electronAPI.zoomOut()
          },
          {
            label: 'Tamaño real',
            icon: 'pi pi-expand',
            shortcut: 'Ctrl+0',
            command: () => window.electronAPI.actualSize()
          },
          { separator: true },
          {
            label: 'Pantalla completa',
            icon: 'pi pi-window-maximize',
            shortcut: 'F11',
            command: () => window.electronAPI.toggleFullscreen()
          }
        ]
      },
      { separator: true },
      {
        label: 'Acerca de NodeTerm',
        icon: 'pi pi-info-circle',
        command: () => {
          window.electronAPI.getVersionInfo().then(versionInfo => {
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
              background: var(--ui-sidebar-bg);
              border: 1px solid var(--ui-sidebar-border);
              border-radius: 8px;
              padding: 24px;
              box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
              min-width: 350px;
              max-width: 500px;
              color: var(--ui-text-primary);
              font-family: var(--font-family);
            `;
            
            aboutDialog.innerHTML = `
              <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; text-align: center;">${versionInfo.appName}</h3>
              <div style="margin: 16px 0;">
                <p style="margin: 8px 0; font-size: 14px;"><strong>Versión:</strong> ${versionInfo.appVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Electron:</strong> ${versionInfo.electronVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Node.js:</strong> ${versionInfo.nodeVersion}</p>
                <p style="margin: 8px 0; font-size: 14px;"><strong>Chrome:</strong> ${versionInfo.chromeVersion}</p>
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
            window.electronAPI.quitApp();
          }
        }
      }
    ];
    
    // Remover menú existente si está abierto
    const existingMenu = document.querySelector('.app-context-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }
    
    // Crear el menú contextual principal
    const contextMenu = document.createElement('div');
    contextMenu.className = 'app-context-menu';
    contextMenu.style.cssText = `
      position: fixed;
      background: var(--ui-sidebar-bg);
      border: 1px solid var(--ui-sidebar-border);
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      min-width: 220px;
      padding: 4px 0;
      font-family: var(--font-family);
      font-size: 14px;
    `;
    
    let activeSubmenu = null;
    
    const createMenuItem = (item, isSubmenu = false) => {
      if (item.separator) {
        const separator = document.createElement('div');
        separator.style.cssText = `
          height: 1px;
          background: var(--ui-sidebar-border);
          margin: 4px 8px;
        `;
        return separator;
      }
      
      const menuItem = document.createElement('div');
      menuItem.className = 'menu-item';
      menuItem.style.cssText = `
        padding: ${isSubmenu ? '8px 20px' : '10px 16px'};
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ui-text-primary);
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
          color: var(--ui-text-secondary, #888);
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
      
      // Eventos del menú
      menuItem.addEventListener('mouseenter', () => {
        menuItem.style.backgroundColor = 'var(--ui-hover-bg, rgba(255, 255, 255, 0.1))';
        
        // Limpiar submenú anterior
        if (activeSubmenu && activeSubmenu.parentNode) {
          activeSubmenu.parentNode.removeChild(activeSubmenu);
          activeSubmenu = null;
        }
        
        // Crear submenú si existe
        if (item.submenu) {
          activeSubmenu = document.createElement('div');
          activeSubmenu.className = 'app-submenu';
          activeSubmenu.style.cssText = `
            position: fixed;
            background: var(--ui-sidebar-bg);
            border: 1px solid var(--ui-sidebar-border);
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            min-width: 200px;
            padding: 4px 0;
            font-family: var(--font-family);
            font-size: 14px;
          `;
          
          item.submenu.forEach(subItem => {
            const subMenuItem = createMenuItem(subItem, true);
            activeSubmenu.appendChild(subMenuItem);
          });
          
          document.body.appendChild(activeSubmenu);
          
          // Posicionar submenú
          setTimeout(() => {
            const menuRect = menuItem.getBoundingClientRect();
            const submenuRect = activeSubmenu.getBoundingClientRect();
            
            let left = menuRect.right + 5;
            let top = menuRect.top;
            
            // Ajustar si se sale de la pantalla
            if (left + submenuRect.width > window.innerWidth) {
              left = menuRect.left - submenuRect.width - 5;
            }
            if (top + submenuRect.height > window.innerHeight) {
              top = window.innerHeight - submenuRect.height - 8;
            }
            
            activeSubmenu.style.left = `${left}px`;
            activeSubmenu.style.top = `${top}px`;
          }, 10);
        }
      });
      
      menuItem.addEventListener('mouseleave', () => {
        menuItem.style.backgroundColor = 'transparent';
      });
      
      if (item.command) {
        menuItem.addEventListener('click', () => {
          item.command();
          // Cerrar todos los menús
          const allMenus = document.querySelectorAll('.app-context-menu, .app-submenu');
          allMenus.forEach(menu => {
            if (document.body.contains(menu)) {
              document.body.removeChild(menu);
            }
          });
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
      const isClickOnButton = event.target.closest('button').contains(e.target);
      const isClickOnMenu = document.querySelector('.app-context-menu')?.contains(e.target);
      const isClickOnSubmenu = document.querySelector('.app-submenu')?.contains(e.target);
      
      if (!isClickOnButton && !isClickOnMenu && !isClickOnSubmenu) {
        const allMenus = document.querySelectorAll('.app-context-menu, .app-submenu');
        allMenus.forEach(menu => {
          if (document.body.contains(menu)) {
            document.body.removeChild(menu);
          }
        });
        document.removeEventListener('click', closeMenu);
      }
    };
    
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  };
  
  return (
    <div className="sidebar-footer" style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.5rem 1rem',
      borderTop: '1px solid var(--ui-sidebar-border)',
      background: 'var(--ui-sidebar-bg)',
      minHeight: '48px',
      boxSizing: 'border-box',
      gap: '0.5rem'
    }}>
      <Button
        icon="pi pi-bars"
        className="p-button-rounded p-button-text sidebar-action-button"
        onClick={handleAppMenuClick}
        tooltip="Menú de la aplicación"
      />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <Button
          icon={allExpanded ? "pi pi-angle-double-up" : "pi pi-angle-double-down"}
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={toggleExpandAll}
          tooltip={allExpanded ? "Plegar todo" : "Desplegar todo"}
        />
        <Button icon="pi pi-cog" className="p-button-rounded p-button-text sidebar-action-button" onClick={onConfigClick} tooltip="Configuración" />
      </div>
    </div>
  );
};

export default SidebarFooter;