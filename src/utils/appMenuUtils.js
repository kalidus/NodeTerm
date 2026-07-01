/**
 * Utilidades para el menú de aplicación unificado
 * Se usa en la barra vertical de iconos (SidebarIconRail)
 */

import { getVersionInfo } from '../version-info';

export const createAppMenu = (onShowImportDialog, onShowExportDialog, onShowImportExportDialog, t, onShowImportWizard) => {
  // Si no se pasa t, usar valores por defecto en español (fallback)
  const getText = (key) => {
    if (t) return t(key);
    // Fallback en español si no hay traducción
    const fallbacks = {
      'appMenu.file': 'Archivo',
      'appMenu.import': 'Importar...',
      'appMenu.importMremote': 'Importar mRemoteNG/KeePass',
      'appMenu.importNodeterm': 'Importar NodeTerm (.nodeterm)',
      'appMenu.export': 'Exportar',
      'appMenu.view': 'Ver',
      'appMenu.reload': 'Recargar',
      'appMenu.forceReload': 'Forzar recarga',
      'appMenu.devTools': 'Herramientas de desarrollo',
      'appMenu.zoomIn': 'Acercar',
      'appMenu.zoomOut': 'Alejar',
      'appMenu.actualSize': 'Tamaño real',
      'appMenu.fullscreen': 'Pantalla completa',
      'appMenu.unblockForms': '🔧 Desbloquear Formularios',
      'appMenu.about': 'Acerca de NodeTerm',
      'appMenu.version': 'Versión',
      'appMenu.close': 'Cerrar',
      'appMenu.exit': 'Salir',
      'appMenu.exitConfirm': '¿Estás seguro de que quieres salir de NodeTerm?'
    };
    return fallbacks[key] || key;
  };

  const menuStructure = [
    {
      label: getText('appMenu.file'),
      icon: 'pi pi-file',
      submenu: [
        {
          label: getText('appMenu.export'),
          icon: 'pi pi-download',
          command: () => {
            console.log('🔍 [Menu] Exportar clickeado');
            window.dispatchEvent(new CustomEvent('open-settings-dialog', { detail: { tab: 'import-export' } }));
          }
        },
        { separator: true },
        {
          label: getText('appMenu.import'),
          icon: 'pi pi-upload',
          command: () => {
            console.log('🔍 [Menu] Importar (Wizard) clickeado');
            window.dispatchEvent(new CustomEvent('open-settings-dialog', { detail: { tab: 'import-export', subTab: 'wizard' } }));
          }
        }
      ]
    },
    { separator: true },
    {
      label: getText('appMenu.view'),
      icon: 'pi pi-eye',
      submenu: [
        {
          label: getText('appMenu.reload'),
          icon: 'pi pi-refresh',
          shortcut: 'Ctrl+R',
          command: () => window.electronAPI?.reload && window.electronAPI.reload()
        },
        {
          label: getText('appMenu.forceReload'),
          icon: 'pi pi-replay',
          shortcut: 'Ctrl+Shift+R',
          command: () => window.electronAPI?.forceReload && window.electronAPI.forceReload()
        },
        { separator: true },
        {
          label: getText('appMenu.devTools'),
          icon: 'pi pi-wrench',
          shortcut: 'F12',
          command: () => window.electronAPI?.toggleDevTools && window.electronAPI.toggleDevTools()
        },
        { separator: true },
        {
          label: getText('appMenu.zoomIn'),
          icon: 'pi pi-search-plus',
          shortcut: 'Ctrl++',
          command: () => window.electronAPI?.zoomIn && window.electronAPI.zoomIn()
        },
        {
          label: getText('appMenu.zoomOut'),
          icon: 'pi pi-search-minus',
          shortcut: 'Ctrl+-',
          command: () => window.electronAPI?.zoomOut && window.electronAPI.zoomOut()
        },
        {
          label: getText('appMenu.actualSize'),
          icon: 'pi pi-expand',
          shortcut: 'Ctrl+0',
          command: () => window.electronAPI?.actualSize && window.electronAPI.actualSize()
        },
        { separator: true },
        {
          label: getText('appMenu.fullscreen'),
          icon: 'pi pi-window-maximize',
          shortcut: 'F11',
          command: () => window.electronAPI?.toggleFullscreen && window.electronAPI.toggleFullscreen()
        },
        { separator: true },
        {
          label: getText('appMenu.unblockForms'),
          icon: 'pi pi-wrench',
          command: () => {
            // Llamar a la función global para desbloquear formularios
            if (window.handleUnblockForms) {
              window.handleUnblockForms();
            }
          }
        }
      ]
    },
    { separator: true },
    {
      label: getText('appMenu.about'),
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
              <p style="margin: 8px 0; font-size: 14px;"><strong>${getText('appMenu.version')}:</strong> ${versionInfo.appVersion || getVersionInfo().appVersion}</p>
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
              ">${getText('appMenu.close')}</button>
            </div>
          `;

          overlay.appendChild(aboutDialog);
          // Asegurar que overlay no bloquee inputs si queda colgado
          document.body.appendChild(overlay);
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
      label: getText('appMenu.exit'),
      icon: 'pi pi-sign-out',
      shortcut: 'Ctrl+Q',
      command: () => {
        if (window.confirm(getText('appMenu.exitConfirm'))) {
          window.electronAPI?.quitApp && window.electronAPI.quitApp();
        }
      }
    }
  ];

  return menuStructure;
};

export const createContextMenu = (event, menuStructure, menuClass = 'app-context-menu-unified') => {
  // Remover menú existente si está abierto
  const existingMenu = document.querySelector(`.${menuClass}`);
  if (existingMenu) {
    existingMenu.remove();
    return;
  }

  // Variables globales para el menú
  let activeSubmenu = null;
  let submenuTimer = null;

  // Función de limpieza completa
  const cleanupMenus = () => {
    if (submenuTimer) clearTimeout(submenuTimer);
    if (activeSubmenu && document.body.contains(activeSubmenu)) {
      document.body.removeChild(activeSubmenu);
    }
    const allMenus = document.querySelectorAll(`.${menuClass}`);
    allMenus.forEach(menu => {
      // Limpiar todos los hovers antes de remover
      const menuItems = menu.querySelectorAll('.menu-item-unified');
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
  contextMenu.className = menuClass;
  contextMenu.style.cssText = `
    position: fixed;
    background: var(--ui-context-bg, #333) !important;
    border: 1px solid var(--ui-context-border, #555);
    border-radius: 6px;
    box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0, 0, 0, 0.3));
    z-index: 9999;
    min-width: 220px;
    padding: 4px 0;
    font-family: var(--font-family, sans-serif);
    font-size: 14px;
    left: -9999px;
    top: -9999px;
    opacity: 0;
  `;

  const createMenuItem = (item, isSubmenu = false) => {
    if (item.separator) {
      const separator = document.createElement('div');
      separator.style.cssText = `
          height: 1px;
          background: var(--ui-context-border, #555);
          margin: 4px 8px;
          opacity: 0.5;
        `;
      return separator;
    }

    const menuItem = document.createElement('div');
    menuItem.className = 'menu-item-unified';
    menuItem.style.cssText = `
      padding: ${isSubmenu ? '8px 20px' : '10px 16px'};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--ui-context-text, #fff);
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
        const allMenuItems = contextMenu.querySelectorAll('.menu-item-unified');
        allMenuItems.forEach(item => {
          if (item !== menuItem) {
            item.style.backgroundColor = 'transparent';
          }
        });
        menuItem.style.backgroundColor = 'var(--ui-context-hover, rgba(255, 255, 255, 0.1))';

        // Limpiar submenú anterior
        if (activeSubmenu && document.body.contains(activeSubmenu)) {
          document.body.removeChild(activeSubmenu);
        }

        // Crear nuevo submenú
        activeSubmenu = document.createElement('div');
        activeSubmenu.className = `${menuClass}-submenu`;
        activeSubmenu.style.cssText = `
          position: fixed;
          background: var(--ui-context-bg, #333) !important;
          border: 1px solid var(--ui-context-border, #555);
          border-radius: 6px;
          box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0, 0, 0, 0.3));
          z-index: 10000;
          min-width: 200px;
          padding: 4px 0;
          font-family: var(--font-family, sans-serif);
          font-size: 14px;
          left: -9999px;
          top: -9999px;
          opacity: 0;
        `;

        // Eventos simplificados del submenú (igual que funciona "Ver")
        activeSubmenu.addEventListener('mouseenter', cancelSubmenuClose);
        activeSubmenu.addEventListener('mouseleave', scheduleSubmenuClose);

        item.submenu.forEach(subItem => {
          const subMenuItem = createMenuItem(subItem, true);
          activeSubmenu.appendChild(subMenuItem);
        });

        document.body.appendChild(activeSubmenu);

        // Posicionar submenú de manera simple y directa (sin destellos)
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
          activeSubmenu.style.opacity = '1';
        }, 5);
      });

      menuItem.addEventListener('mouseleave', scheduleSubmenuClose);
    } else {
      // Eventos para elementos normales
      menuItem.addEventListener('mouseenter', () => {
        // Limpiar hover de otros elementos
        const allMenuItems = contextMenu.querySelectorAll('.menu-item-unified');
        allMenuItems.forEach(item => {
          if (item !== menuItem) {
            item.style.backgroundColor = 'transparent';
          }
        });
        menuItem.style.backgroundColor = 'var(--ui-context-hover, rgba(255, 255, 255, 0.1))';
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

  // Posicionar el menú principal (sin destellos)
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
    contextMenu.style.opacity = '1';
  }, 10);

  // Cerrar el menú al hacer clic fuera
  const closeMenu = (e) => {
    const button = event.target.closest('button');
    const menu = document.querySelector(`.${menuClass}`);
    const submenu = document.querySelector(`.${menuClass}-submenu`);
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
