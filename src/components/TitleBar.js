import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import appIcon from '../assets/app-icon.png';
import { InputText } from 'primereact/inputtext';
import { FaSearch } from 'react-icons/fa';
import { createAppMenu, createContextMenu } from '../utils/appMenuUtils';
import { iconThemes } from '../themes/icon-themes';
import { toggleFavorite, helpers } from '../utils/connectionStore';

const TitleBar = ({ sidebarFilter, setSidebarFilter, allNodes, findAllConnections, onOpenSSHConnection, onOpenRdpConnection, onShowImportDialog, onOpenImportWithSource, onQuickImportFromSource, iconTheme = 'material', openEditSSHDialog, openEditRdpDialog, expandedKeys, masterKey, secureStorage }) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredConnections, setFilteredConnections] = useState([]);
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Cache para passwords y conexiones aplanados
  const [cachedAllItems, setCachedAllItems] = useState([]);




  // Cargar passwords desde localStorage (con soporte para encriptación)
  useEffect(() => {
    const loadPasswords = async () => {
      try {
        if (masterKey && secureStorage) {
          // CON master key: Cargar encriptado
          const encryptedData = localStorage.getItem('passwords_encrypted');
          
          if (encryptedData) {
            const decrypted = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
            setPasswordNodes(decrypted);
          } else {
            // Migración: Si hay datos sin encriptar, usarlos
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              const parsed = JSON.parse(plainData);
              setPasswordNodes(parsed);
            } else {
              setPasswordNodes([]);
            }
          }
        } else {
          // SIN master key: Funciona como antes
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            setPasswordNodes(JSON.parse(saved));
          } else {
            setPasswordNodes([]);
          }
        }
      } catch (error) {
        console.error('Error loading passwords for search:', error);
        setPasswordNodes([]);
      }
    };

    loadPasswords();
    
    // Recargar cuando cambie el localStorage o masterKey
    const handleStorageChange = (e) => {
      if (e.key === 'passwordManagerNodes' || e.key === 'passwords_encrypted') {
        loadPasswords();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [masterKey, secureStorage]);
  
  // Función para extraer todos los passwords recursivamente
  const findAllPasswords = (nodes) => {
    const result = [];
    const traverse = (nodeList) => {
      for (const node of nodeList) {
        if (node.data && node.data.type === 'password') {
          result.push(node);
        }
        if (node.children && node.children.length > 0) {
          traverse(node.children);
        }
      }
    };
    traverse(nodes);
    return result;
  };
  
  // Actualizar cache cuando cambien los nodos o passwords
  useEffect(() => {
    const updateCache = () => {
      try {
        const allConnections = findAllConnections(allNodes);
        const allPasswords = findAllPasswords(passwordNodes);
        const combined = [...allConnections, ...allPasswords];
        setCachedAllItems(combined);
      } catch (error) {
        console.error('Error actualizando cache:', error);
      }
    };
    
    // Usar requestIdleCallback para no bloquear
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(updateCache);
    } else {
      setTimeout(updateCache, 0);
    }
  }, [allNodes, passwordNodes, findAllConnections]);

  // Función para extraer y truncar el usuario correctamente
  const getDisplayUser = (node) => {
    if (!node.data) return null;
    
    // SSH usa 'user', RDP usa 'username'
    const user = node.data.user || node.data.username;
    if (!user) return null;
    
    // Para formatos Wallix largos, extraer solo el usuario final
    // Formato: usuario@dominio@servidor:protocolo:usuario_destino
    const wallixPattern = /^(.+)@(.+)@(.+):(.+):(.+)$/;
    const match = user.match(wallixPattern);
    
    if (match) {
      // Si es formato Wallix, mostrar el usuario destino (último elemento)
      const targetUser = match[5];
      return targetUser.length > 25 ? targetUser.substring(0, 22) + '...' : targetUser;
    }
    
    // Para usuarios normales, truncar si es muy largo
    return user.length > 25 ? user.substring(0, 22) + '...' : user;
  };

  // Búsqueda optimizada con debouncing y límite de resultados
  useEffect(() => {
    // Debouncing: esperar 200ms después de que el usuario deje de escribir
    const timeoutId = setTimeout(() => {
      if (sidebarFilter.trim()) {
        setIsSearching(true);
        
        // Realizar filtrado de manera asíncrona
        const performFilter = () => {
          try {
            const searchTerm = sidebarFilter.toLowerCase();
            const filtered = [];
            const MAX_RESULTS = 50; // Limitar a 50 resultados para mejor rendimiento
            
            // Filtrado eficiente: parar cuando tengamos suficientes resultados
            for (let i = 0; i < cachedAllItems.length && filtered.length < MAX_RESULTS; i++) {
              const node = cachedAllItems[i];
              let matches = false;
              
              // Búsqueda rápida en label primero (más común)
              if (node.label.toLowerCase().includes(searchTerm)) {
                matches = true;
              } else if (node.data) {
                // Buscar en passwords
                if (node.data.type === 'password') {
                  matches = (
                    (node.data.password && node.data.password.toLowerCase().includes(searchTerm)) ||
                    (node.data.username && node.data.username.toLowerCase().includes(searchTerm)) ||
                    (node.data.url && node.data.url.toLowerCase().includes(searchTerm)) ||
                    (node.data.group && node.data.group.toLowerCase().includes(searchTerm))
                  );
                } else {
                  // Buscar en conexiones (SSH/RDP)
                  matches = (
                    (node.data.username && node.data.username.toLowerCase().includes(searchTerm)) ||
                    (node.data.user && node.data.user.toLowerCase().includes(searchTerm))
                  );
                }
              }
              
              if (matches) {
                filtered.push(node);
              }
            }
            
            setFilteredConnections(filtered);
            setShowDropdown(filtered.length > 0);
            setIsSearching(false);
          } catch (error) {
            console.error('Error en búsqueda:', error);
            setIsSearching(false);
          }
        };
        
        // Usar requestIdleCallback si está disponible, sino setTimeout para no bloquear
        if (typeof requestIdleCallback !== 'undefined') {
          requestIdleCallback(performFilter, { timeout: 100 });
        } else {
          setTimeout(performFilter, 0);
        }
      } else {
        setFilteredConnections([]);
        setShowDropdown(false);
        setIsSearching(false);
      }
    }, 200); // Reducido a 200ms para respuesta más rápida
    
    // Limpiar timeout si el usuario sigue escribiendo
    return () => clearTimeout(timeoutId);
  }, [sidebarFilter, cachedAllItems]);

  // Efecto para ocultar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.search-dropdown') && !event.target.closest('.search-input')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  // Función para manejar el focus del input
  const handleInputFocus = () => {
    // El dropdown se muestra automáticamente en el useEffect
  };

  // Banner para detectar cambios en fuentes vinculadas (usuario inicia revalidación bajo demanda)
  const [importBanner, setImportBanner] = useState(null);

  // Efecto para crear copos de nieve dinámicamente para el tema Winter Snowfall
  useEffect(() => {
    const titleBar = document.querySelector('.title-bar');
    if (!titleBar) return;

    // Verificar si el tema es winter-snowfall
    const checkAnimation = () => {
      const animation = titleBar.getAttribute('data-animation');
      return animation === 'winter-snowfall';
    };

    // Crear copos de nieve si el tema está activo
    if (checkAnimation()) {
      const snowflakes = [];
      
      // Crear 6 copos de nieve adicionales
      for (let i = 1; i <= 6; i++) {
        const snowflake = document.createElement('div');
        snowflake.className = `snowflake-${i}`;
        snowflake.textContent = '❄';
        titleBar.appendChild(snowflake);
        snowflakes.push(snowflake);
      }

      // Cleanup: remover copos cuando el componente se desmonte o cambie el tema
      return () => {
        snowflakes.forEach(snowflake => {
          if (snowflake.parentNode) {
            snowflake.parentNode.removeChild(snowflake);
          }
        });
      };
    }
  }, []);

  // Observer para detectar cambios en data-animation
  useEffect(() => {
    const titleBar = document.querySelector('.title-bar');
    if (!titleBar) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-animation') {
          const animation = titleBar.getAttribute('data-animation');
          
          // Limpiar elementos animados existentes
          const existingSnowflakes = titleBar.querySelectorAll('[class^="snowflake-"]');
          const existingRaindrops = titleBar.querySelectorAll('[class^="raindrop-"]');
          const existingLightning = titleBar.querySelectorAll('[class^="lightning-"]');
          const existingSand = titleBar.querySelectorAll('[class^="sand-"]');
          existingSnowflakes.forEach(el => el.remove());
          existingRaindrops.forEach(el => el.remove());
          existingLightning.forEach(el => el.remove());
          existingSand.forEach(el => el.remove());
          
          // Crear nuevos copos si es winter-snowfall
          if (animation === 'winter-snowfall') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxSnowflakes = animSpeed === 'slow' ? 2 : (animSpeed === 'normal' ? 8 : 6); // Más copos en normal
            
            for (let i = 1; i <= maxSnowflakes; i++) {
              const snowflake = document.createElement('div');
              snowflake.className = `snowflake-${i}`;
              snowflake.textContent = '❄';
              titleBar.appendChild(snowflake);
            }
          }
          
          // Crear gotas de lluvia y relámpagos si es thunderstorm
          if (animation === 'thunderstorm') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxRaindrops = animSpeed === 'slow' ? 4 : (animSpeed === 'normal' ? 16 : 12); // Más gotas en normal
            const maxLightning = animSpeed === 'slow' ? 1 : (animSpeed === 'normal' ? 3 : 2); // Más rayos en normal
            
            // Crear gotas de lluvia
            for (let i = 1; i <= maxRaindrops; i++) {
              const raindrop = document.createElement('div');
              raindrop.className = `raindrop-${i}`;
              raindrop.textContent = '💧';
              titleBar.appendChild(raindrop);
            }
            
            // Crear rayos visibles
            for (let i = 1; i <= maxLightning; i++) {
              const lightning = document.createElement('div');
              lightning.className = `lightning-${i}`;
              lightning.textContent = '⚡';
              titleBar.appendChild(lightning);
            }
          }
          
          // Crear partículas de arena si es desert-storm
          if (animation === 'desert-storm') {
            // Verificar velocidad de animación
            const animSpeed = document.documentElement.getAttribute('data-ui-anim-speed') || 'normal';
            const maxSand = animSpeed === 'slow' ? 5 : (animSpeed === 'normal' ? 20 : 15); // Más partículas en normal
            
            for (let i = 1; i <= maxSand; i++) {
              const sand = document.createElement('div');
              sand.className = `sand-${i}`;
              sand.textContent = '•';
              titleBar.appendChild(sand);
            }
          }
        }
      });
    });

    observer.observe(titleBar, {
      attributes: true,
      attributeFilter: ['data-animation']
    });

    return () => observer.disconnect();
  }, []);
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

  // Función para encontrar la ruta de una conexión en el árbol
  const findNodePath = (nodes, targetNode) => {
    const findPath = (nodeList, target, currentPath = []) => {
      for (const node of nodeList) {
        const newPath = [...currentPath, node.key];
        
        // Si encontramos el nodo objetivo, retornar la ruta
        if (node.key === target.key) {
          return newPath;
        }
        
        // Si tiene hijos, buscar recursivamente
        if (node.children && node.children.length > 0) {
          const foundPath = findPath(node.children, target, newPath);
          if (foundPath) {
            return foundPath;
          }
        }
      }
      return null;
    };
    
    return findPath(nodes, targetNode);
  };

  // Función para obtener la ruta de carpetas de una conexión
  const getNodeFolderPath = (nodes, targetNode) => {
    const findFolderPath = (nodeList, target, currentPath = []) => {
      for (const node of nodeList) {
        // Solo agregar a la ruta si es una carpeta (no una conexión)
        const isFolder = !node.data || (!node.data.type || (node.data.type !== 'ssh' && node.data.type !== 'rdp' && node.data.type !== 'rdp-guacamole'));
        const newPath = isFolder ? [...currentPath, node.label] : currentPath;
        
        // Si encontramos el nodo objetivo, retornar la ruta de carpetas (sin incluir la conexión)
        if (node.key === target.key) {
          return currentPath; // Retornar solo las carpetas padre, no la conexión misma
        }
        
        // Si tiene hijos, buscar recursivamente
        if (node.children && node.children.length > 0) {
          const foundPath = findFolderPath(node.children, target, newPath);
          if (foundPath) {
            return foundPath;
          }
        }
      }
      return null;
    };
    
    return findFolderPath(nodes, targetNode);
  };

  // Función para expandir carpetas en la ruta de una conexión
  const expandNodePath = (nodePath, currentExpandedKeys) => {
    if (!nodePath || nodePath.length === 0) return currentExpandedKeys;
    
    // Crear una copia de las claves expandidas actuales para preservar el estado existente
    const newExpandedKeys = { ...currentExpandedKeys };
    
    // Solo expandir las carpetas en la ruta que no estén ya expandidas
    for (let i = 0; i < nodePath.length - 1; i++) {
      const folderKey = nodePath[i];
      // Solo expandir si no está ya expandida
      if (!newExpandedKeys[folderKey]) {
        newExpandedKeys[folderKey] = true;
      }
    }
    
    return newExpandedKeys;
  };

  const handleSelectConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);
    
    // Encontrar la ruta de la conexión y expandir las carpetas padre
    const nodePath = findNodePath(allNodes, node);
    if (nodePath && nodePath.length > 1) {
      // Expandir las carpetas en la ruta, preservando las que ya están expandidas
      const newExpandedKeys = expandNodePath(nodePath, expandedKeys || {});
      
      // Disparar evento personalizado para que el componente padre actualice expandedKeys
      const expandEvent = new CustomEvent('expand-node-path', { 
        detail: { expandedKeys: newExpandedKeys } 
      });
      window.dispatchEvent(expandEvent);
    }
    
    // Detectar el tipo y llamar a la función apropiada
    const isPassword = node.data && node.data.type === 'password';
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');
    
    if (isPassword) {
      // Abrir password en una pestaña
      const payload = {
        key: node.key,
        label: node.label,
        data: {
          username: node.data?.username || '',
          password: node.data?.password || '',
          url: node.data?.url || '',
          group: node.data?.group || '',
          notes: node.data?.notes || ''
        }
      };
      window.dispatchEvent(new CustomEvent('open-password-tab', { detail: payload }));
    } else if (isSSH && onOpenSSHConnection) {
      onOpenSSHConnection(node, allNodes);
    } else if (isRDP && onOpenRdpConnection) {
      onOpenRdpConnection(node, allNodes);
    } else if (onOpenSSHConnection) {
      // Fallback para conexiones sin tipo definido
      onOpenSSHConnection(node, allNodes);
    }
  };

  const handleToggleFavorite = (node) => {
    try {
      // Convertir el nodo a formato de conexión
      const connection = helpers.fromSidebarNode(node);
      if (connection) {
        toggleFavorite(connection);
        // Opcional: mostrar notificación de éxito
        console.log('Favorito actualizado:', connection.name);
      }
    } catch (error) {
      console.error('Error al actualizar favorito:', error);
    }
  };

  const handleEditConnection = (node) => {
    setSidebarFilter('');
    setShowDropdown(false);
    
    const isSSH = node.data && node.data.type === 'ssh';
    const isRDP = node.data && (node.data.type === 'rdp' || node.data.type === 'rdp-guacamole');
    
    if (isSSH && openEditSSHDialog) {
      openEditSSHDialog(node);
    } else if (isRDP && openEditRdpDialog) {
      openEditRdpDialog(node);
    } else {
      console.warn('No hay función de edición disponible para este tipo de conexión');
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
        background: var(--ui-context-bg, #333) !important;
        border: 1px solid var(--ui-context-border, #555);
        border-radius: 6px;
        box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0, 0, 0, 0.3));
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
      background: var(--ui-context-bg, #333) !important;
      border: 1px solid var(--ui-context-border, #555);
      border-radius: 6px;
      box-shadow: 0 4px 12px var(--ui-context-shadow, rgba(0, 0, 0, 0.3));
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
          background: var(--ui-context-border, #555);
          margin: 4px 8px;
          opacity: 0.5;
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
          color: var(--ui-context-text, #aaa);
          margin-left: 20px;
          opacity: 0.7;
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
          menuItem.style.backgroundColor = 'var(--ui-context-hover, rgba(255, 255, 255, 0.1))';
          
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
      className="title-bar"
      style={{
        height: 36,
        minHeight: 36,
        maxHeight: 36,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--ui-titlebar-accent, #1976d2)',
        boxShadow: '0 0.5px 2px rgba(0,0,0,0.06)',
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
        <svg 
          width="18" 
          height="18" 
          viewBox="0 0 24 24" 
          style={{ 
            width: 18, 
            height: 18, 
            marginRight: 6, 
            marginLeft: 8, 
            display: 'flex', 
            alignItems: 'center'
          }}
        >
          <g fill="var(--ui-titlebar-text, #fff)">
            {/* Símbolo > de prompt */}
            <path d="M7 8 L11 12 L7 16" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Línea de comando _ */}
            <rect x="13" y="15" width="5" height="1.5" rx="0.75" className="title-cursor-blink"/>
          </g>
        </svg>
        <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--ui-titlebar-text, #fff)', letterSpacing: 0.1, lineHeight: '18px', display: 'flex', alignItems: 'center', height: 18, marginTop: '2px' }}>NodeTerm</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: 10, flex: 1, justifyContent: 'center' }}>
        <div style={{ position: 'relative', minWidth: 350, maxWidth: 600, width: '35vw', WebkitAppRegion: 'no-drag' }}>
          {!sidebarFilter ? (
            <span style={{ 
              position: 'absolute', 
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)', 
              color: 'var(--ui-titlebar-text, #fff)', 
              pointerEvents: 'none', 
              fontSize: 13, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              opacity: 1,
              zIndex: 2
            }}>
              <FaSearch />
              <span>NodeTerm</span>
            </span>
          ) : isSearching && (
            <span style={{ 
              position: 'absolute', 
              right: '12px', 
              top: '50%', 
              transform: 'translateY(-50%)', 
              color: '#666', 
              pointerEvents: 'none', 
              fontSize: 12, 
              display: 'flex', 
              alignItems: 'center',
              zIndex: 2
            }}>
              <i className="pi pi-spin pi-spinner" style={{ fontSize: '12px' }} />
            </span>
          )}
          <InputText
            value={sidebarFilter}
            onChange={e => setSidebarFilter(e.target.value)}
            placeholder=""
            className="search-input"
            data-animation=""
            style={{
              minWidth: 350,
              maxWidth: 600,
              width: '100%',
              paddingLeft: 12,
              height: 28,
              borderRadius: 6,
              border: '1px solid #bbb',
              fontSize: 13,
              background: '#f5f5f5',
              color: '#333',
              fontWeight: 500,
              outline: 'none',
              boxShadow: '0 1px 4px 0 rgba(0,0,0,0.1)',
              transition: 'border 0.2s',
              zIndex: 1,
              textAlign: 'center',
            }}
            onFocus={handleInputFocus}
            onBlur={() => {
              // Solo ocultar el dropdown si no hay texto en el filtro
              if (!sidebarFilter.trim()) {
                setTimeout(() => {
                  setShowDropdown(false);
                }, 150);
              }
            }}
            autoComplete="off"
          />
          {showDropdown && ReactDOM.createPortal(
            <div 
              className="search-dropdown"
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed',
                top: 36,
                left: '50%',
                transform: 'translateX(-50%)',
                minWidth: 350,
                maxWidth: 600,
                width: '35vw',
                maxHeight: 300,
                background: 'var(--ui-dialog-bg, #232629)',
                color: 'var(--ui-dialog-text, #fff)',
                borderRadius: 6,
                boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                zIndex: 9999,
                overflowY: 'auto',
                border: '1px solid var(--ui-dialog-border, #444)',
                WebkitAppRegion: 'no-drag',
                fontFamily: 'inherit',
                fontSize: '13px',
                fontWeight: '500',
                margin: 0,
                padding: 0,
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--ui-sidebar-selected, #00bfff) var(--ui-dialog-bg, #232629)',
              }}>
              {filteredConnections.map(node => {
                const isSSH = node.data && node.data.type === 'ssh';
                const isRDP = node.data && node.data.type === 'rdp';
                const isPassword = node.data && node.data.type === 'password';
                const themeIcons = iconThemes[iconTheme]?.icons || iconThemes['nord'].icons;
                
                let icon = null;
                let protocolColor = '#4fc3f7';
                let protocolName = 'Conexión';
                
                if (isPassword) {
                  protocolColor = '#ffc107';
                  protocolName = 'Password';
                } else if (isSSH) {
                  icon = themeIcons.ssh;
                  protocolColor = '#28a745';
                  protocolName = 'SSH';
                } else if (isRDP) {
                  icon = themeIcons.rdp;
                  protocolColor = '#007ad9';
                  protocolName = 'RDP';
                }
                
                // Obtener la ruta de carpetas de la conexión
                const folderPath = getNodeFolderPath(allNodes, node);
                const folderPathString = folderPath && folderPath.length > 0 ? folderPath.join(' / ') : 'Raíz';
                
                // Verificar si es favorito
                const connection = helpers.fromSidebarNode(node);
                const favorites = JSON.parse(localStorage.getItem('nodeterm_favorite_connections') || '[]');
                const isFavorite = favorites.some(fav => fav.id === connection?.id);
                
                return (
                  <div
                    key={node.key}
                    style={{
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: 13,
                      borderBottom: '1px solid var(--ui-dialog-border, #333)',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      borderRadius: '4px',
                      margin: '2px 4px',
                      minHeight: '60px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--ui-sidebar-hover, #2a2d31)';
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
                    <div style={{ display: 'flex', alignItems: 'flex-start', minWidth: 20, justifyContent: 'center', paddingTop: '2px' }}>
                      {isPassword ? (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🔑</span>
                      ) : isSSH ? (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>⚡</span>
                      ) : isRDP ? (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🖥️</span>
                      ) : (
                        <span style={{ color: protocolColor, fontSize: 16, fontWeight: 'bold' }}>🔗</span>
                      )}
                    </div>
                    
                    {/* Nombre, carpeta y protocolo */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontWeight: 500,
                          color: 'var(--ui-dialog-text, #fff)',
                          fontSize: '13px'
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
                      {/* Ruta de carpeta */}
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        fontSize: '11px',
                        color: 'var(--ui-dialog-text, #aaa)',
                        opacity: 0.8
                      }}>
                        <span style={{ fontSize: '10px' }}>📁</span>
                        <span style={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontStyle: 'italic'
                        }}>
                          {folderPathString}
                        </span>
                      </div>
                    </div>
                    
                    {/* Usuario con mismo formato que protocolo */}
                    {getDisplayUser(node) && (
                      <div style={{ 
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 6,
                        marginRight: 8,
                        paddingTop: '2px'
                      }}>
                        <span style={{ 
                          fontSize: 11, 
                          color: 'var(--ui-dialog-text, #fff)',
                          fontWeight: 600,
                          backgroundColor: 'var(--ui-sidebar-hover, #2a2d31)',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          border: '1px solid var(--ui-dialog-border, #444)',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}>
                          <span style={{ fontSize: 10 }}>👤</span>
                          <span>{getDisplayUser(node)}</span>
                        </span>
                      </div>
                    )}
                    
                    {/* Botones de acción - Solo para conexiones, no passwords */}
                    {!isPassword && (
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4, paddingTop: '2px' }}>
                        {/* Botón de favoritos */}
                        <button
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isFavorite ? 'var(--ui-primary-color, #ffd700)' : 'var(--ui-dialog-text, #666)',
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
                            e.currentTarget.style.color = 'var(--ui-primary-color, #ffd700)';
                            e.currentTarget.style.backgroundColor = 'var(--ui-sidebar-hover, #444)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = isFavorite ? 'var(--ui-primary-color, #ffd700)' : 'var(--ui-dialog-text, #666)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(node);
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
                            color: 'var(--ui-dialog-text, #888)',
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
                            e.currentTarget.style.color = 'var(--ui-dialog-text, #fff)';
                            e.currentTarget.style.backgroundColor = 'var(--ui-sidebar-hover, #444)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--ui-dialog-text, #888)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditConnection(node);
                          }}
                          title="Editar conexión"
                        >
                          <i className="pi pi-pencil" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredConnections.length === 0 && (
                <div style={{ 
                  padding: '12px', 
                  color: 'var(--ui-dialog-text, #aaa)', 
                  fontSize: 13, 
                  textAlign: 'center',
                  fontFamily: 'inherit'
                }}>Sin resultados</div>
              )}
              {filteredConnections.length >= 50 && (
                <div style={{ 
                  padding: '8px 12px', 
                  color: 'var(--ui-dialog-text, #888)', 
                  fontSize: 11, 
                  textAlign: 'center',
                  fontFamily: 'inherit',
                  fontStyle: 'italic',
                  borderTop: '1px solid var(--ui-dialog-border, #333)'
                }}>
                  Mostrando primeros 50 resultados. Refina tu búsqueda para ver más.
                </div>
              )}
            </div>,
            document.body
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
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            margin: 0,
            padding: 0,
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12"><circle cy="6" cx="2.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="6" r="1.2" fill="var(--ui-titlebar-text, #fff)"/><circle cy="6" cx="9.5" r="1.2" fill="var(--ui-titlebar-text, #fff)"/></svg>
        </button>
        {/* Minimizar */}
        <button
          onClick={handleMinimize}
          title="Minimizar"
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            margin: 0,
            padding: 0,
            transition: 'all 0.2s ease',
            cursor: 'pointer',
            verticalAlign: 'middle',
            position: 'relative',
            top: '1px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3" y="6.5" width="8" height="1.7" rx="0.85" fill="var(--ui-titlebar-text, #fff)" /></svg>
        </button>
        {/* Maximizar/Restaurar */}
        <button
          onClick={handleMaximizeRestore}
          title="Maximizar/Restaurar"
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            margin: 0,
            padding: 0,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><rect x="3.5" y="3.5" width="7" height="7" rx="1.5" fill="none" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.2" /></svg>
        </button>
        {/* Cerrar */}
        <button
          onClick={handleClose}
          title="Cerrar"
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'transparent',
            border: 'none',
            borderRadius: 6,
            margin: 0,
            padding: 0,
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(229,115,115,0.2)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <svg width="12" height="12" viewBox="0 0 14 14"><line x1="4" y1="4" x2="10" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /><line x1="10" y1="4" x2="4" y2="10" stroke="var(--ui-titlebar-text, #fff)" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar; 