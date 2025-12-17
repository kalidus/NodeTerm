import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Divider } from 'primereact/divider';
import { uiThemes } from '../themes/ui-themes';
import { iconThemes } from '../themes/icon-themes';
import SidebarFooter from './SidebarFooter';
import { useTranslation } from '../i18n/hooks/useTranslation';
import { 
  FaFolder, FaFolderOpen, FaFile, FaFilePdf, FaFileWord, FaFileExcel, 
  FaImage, FaVideo, FaMusic, FaCode, FaGlobe, FaArchive, FaCog, 
  FaDatabase, FaFileAlt, FaArrowUp, FaLink, FaPython, FaJs, FaHtml5,
  FaCss3Alt, FaFileCode
} from 'react-icons/fa';
import '../styles/layout/sidebar.css';
import '../styles/components/tree-themes.css';

const LocalFileExplorerSidebar = ({
  initialPath,
  onBackToConnections,
  sidebarCollapsed,
  setSidebarCollapsed,
  explorerFont,
  explorerFontSize,
  uiTheme = 'Light',
  showToast,
  setShowSettingsDialog,
  sessionActionIconTheme = 'modern',
  iconTheme: propIconTheme,
  iconSize: propIconSize,
  folderIconSize: propFolderIconSize
}) => {
  const { t } = useTranslation('common');
  const theme = uiThemes[uiTheme] || uiThemes['Light'];
  const colors = theme?.colors || {};
  
  // Leer tema de iconos del explorador de archivos directamente del localStorage
  const [iconTheme, setIconTheme] = useState(() => {
    try {
      return localStorage.getItem('iconTheme') || propIconTheme || 'material';
    } catch {
      return propIconTheme || 'material';
    }
  });
  
  // Leer tamaños de iconos del explorador de archivos
  const [iconSize, setIconSize] = useState(() => {
    try {
      const saved = localStorage.getItem('iconSize');
      return saved ? parseInt(saved, 10) : (propIconSize || 20);
    } catch {
      return propIconSize || 20;
    }
  });
  
  const [folderIconSize, setFolderIconSize] = useState(() => {
    try {
      const saved = localStorage.getItem('folderIconSize');
      return saved ? parseInt(saved, 10) : (propFolderIconSize || 20);
    } catch {
      return propFolderIconSize || 20;
    }
  });
  
  // Escuchar cambios en el tema de iconos del explorador de archivos
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedIconTheme = localStorage.getItem('iconTheme');
        const storedIconSize = localStorage.getItem('iconSize');
        const storedFolderIconSize = localStorage.getItem('folderIconSize');
        
        if (storedIconTheme && storedIconTheme !== iconTheme) {
          setIconTheme(storedIconTheme);
        }
        
        if (storedIconSize) {
          const size = parseInt(storedIconSize, 10);
          if (size && size !== iconSize) {
            setIconSize(size);
          }
        }
        
        if (storedFolderIconSize) {
          const size = parseInt(storedFolderIconSize, 10);
          if (size && size !== folderIconSize) {
            setFolderIconSize(size);
          }
        }
      } catch (error) {
        console.error('Error leyendo tema del explorador:', error);
      }
    };
    
    // Verificar cambios periódicamente
    const interval = setInterval(handleStorageChange, 2000); // Reducido de 500ms a 2000ms para ahorrar CPU/RAM
    
    // También escuchar eventos de storage
    window.addEventListener('storage', handleStorageChange);
    
    // Verificar inmediatamente
    handleStorageChange();
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [iconTheme, iconSize, folderIconSize]);
  
  const [nodes, setNodes] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);
  const [showHiddenFiles, setShowHiddenFiles] = useState(() => {
    try {
      return localStorage.getItem('localExplorer_showHiddenFiles') === 'true';
    } catch {
      return false;
    }
  });

  const makeKey = useCallback((filePath) => `local|${filePath}`, []);

  // Función para actualizar nodos en el árbol de forma jerárquica
  const updateNodeChildren = useCallback((nodeList, targetPath, children) => {
    return nodeList.map(node => {
      if (node.data?.path === targetPath) {
        return { ...node, children, leaf: children.length === 0 && node.data?.type !== 'directory' };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: updateNodeChildren(node.children, targetPath, children) };
      }
      return node;
    });
  }, []);

  const loadDirectory = useCallback(async (dirPath, { keepExpanded = false } = {}) => {
    if (!dirPath || !window.electron?.ipcRenderer) {
      return;
    }
    
    setLoading(true);
    try {
      const result = await window.electron.ipcRenderer.invoke('local:list-files', dirPath);
      
      if (result && result.success && Array.isArray(result.files)) {
        // Filtrar archivos ocultos si no se deben mostrar
        const filteredFiles = showHiddenFiles 
          ? result.files 
          : result.files.filter(file => {
              // Filtrar archivos ocultos
              // Los archivos ocultos tienen hidden=true o empiezan con punto
              const isHidden = file.hidden === true || 
                             file.name.startsWith('.') ||
                             (file.name && file.name.length > 0 && file.name[0] === '.');
              return !isHidden;
            });
        
        const children = filteredFiles.map(file => ({
          key: makeKey(file.path),
          label: file.name,
          data: {
            path: file.path,
            type: file.type,
            size: file.size,
            parentPath: dirPath
          },
          leaf: file.type !== 'directory',
          children: file.type === 'directory' ? [] : undefined
        }));
        
        // Ordenar: carpetas primero, luego archivos
        children.sort((a, b) => {
          if (a.data.type === b.data.type) {
            return a.label.localeCompare(b.label);
          }
          return a.data.type === 'directory' ? -1 : 1;
        });
        
        setNodes(prev => {
          // Si es el directorio raíz o no hay nodos previos, reemplazar todo
          if (dirPath === currentPath || prev.length === 0 || !currentPath) {
            return children;
          }
          // Si no, actualizar el nodo específico en el árbol
          return updateNodeChildren(prev, dirPath, children);
        });
        
        // Si es el directorio raíz, actualizar currentPath
        if (dirPath === currentPath || currentPath === null) {
          setCurrentPath(dirPath);
        }
      } else {
        showToast && showToast({
          severity: 'error',
          summary: 'Error',
          detail: result?.error || 'No se pudo listar el directorio',
          life: 3000
        });
      }
    } catch (error) {
      console.error('❌ [LocalFileExplorerSidebar] Error cargando directorio:', error);
      showToast && showToast({
        severity: 'error',
        summary: 'Error',
        detail: error.message || 'Error al cargar directorio',
        life: 3000
      });
    } finally {
      setLoading(false);
    }
  }, [makeKey, showToast, currentPath, updateNodeChildren, showHiddenFiles]);

  // Cargar directorio inicial
  useEffect(() => {
    if (initialPath && currentPath !== initialPath) {
      setCurrentPath(null);
      setNodes([]);
      setExpandedKeys({});
      loadDirectory(initialPath);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPath]);

  const findNodeByKey = useCallback((nodeList, targetKey) => {
    for (const node of nodeList) {
      if (node.key === targetKey) return node;
      if (node.children && node.children.length > 0) {
        const found = findNodeByKey(node.children, targetKey);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const handleToggle = useCallback((event) => {
    const newExpanded = event.value || {};
    setExpandedKeys(newExpanded);
    
    // Cargar hijos cuando se expande un nodo
    Object.keys(newExpanded).forEach(key => {
      if (newExpanded[key] && !expandedKeys[key]) {
        const node = findNodeByKey(nodes, key);
        if (node && node.data?.type === 'directory' && (!node.children || node.children.length === 0)) {
          loadDirectory(node.data.path, { keepExpanded: true });
        }
      }
    });
  }, [expandedKeys, nodes, loadDirectory, findNodeByKey]);

  // Función para obtener el color por defecto del tema
  const getThemeDefaultColor = useCallback((themeName) => {
    const theme = iconThemes[themeName];
    if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac';
    
    const folderIcon = theme.icons.folder;
    if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
      return folderIcon.props.fill;
    }
    if (folderIcon.props && folderIcon.props.stroke) {
      return folderIcon.props.stroke;
    }
    if (folderIcon.props && folderIcon.props.children) {
      const children = Array.isArray(folderIcon.props.children) 
        ? folderIcon.props.children 
        : [folderIcon.props.children];
      for (const child of children) {
        if (child.props && child.props.fill && child.props.fill !== 'none') {
          return child.props.fill;
        }
        if (child.props && child.props.stroke) {
          return child.props.stroke;
        }
      }
    }
    return '#5e81ac';
  }, []);

  // Función para obtener icono según tipo de archivo (igual que FileExplorer)
  const getFileIcon = useCallback((fileName, fileType) => {
    if (fileType === 'directory') {
      return null; // Las carpetas se manejan por separado con el tema
    }
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Documentos
    if (['pdf'].includes(extension)) {
      return <FaFilePdf className="file-icon file-pdf-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    if (['doc', 'docx', 'odt', 'txt', 'rtf'].includes(extension)) {
      return <FaFileWord className="file-icon file-doc-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    if (['xls', 'xlsx', 'ods', 'csv'].includes(extension)) {
      return <FaFileExcel className="file-icon file-excel-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Imágenes
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico'].includes(extension)) {
      return <FaImage className="file-icon file-image-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Video
    if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(extension)) {
      return <FaVideo className="file-icon file-video-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'].includes(extension)) {
      return <FaMusic className="file-icon file-audio-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Código específico
    if (['py'].includes(extension)) {
      return <FaPython className="file-icon file-code-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    if (['js', 'jsx'].includes(extension)) {
      return <FaJs className="file-icon file-code-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    if (['html', 'htm'].includes(extension)) {
      return <FaHtml5 className="file-icon file-web-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    if (['css', 'scss', 'sass', 'less'].includes(extension)) {
      return <FaCss3Alt className="file-icon file-web-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Código genérico
    if (['ts', 'tsx', 'java', 'cpp', 'c', 'cs', 'go', 'rs', 'php', 'rb', 'swift'].includes(extension)) {
      return <FaCode className="file-icon file-code-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Web/Config
    if (['json', 'yaml', 'yml', 'xml', 'toml', 'ini', 'cfg', 'conf'].includes(extension)) {
      return <FaFileCode className="file-icon file-config-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Comprimidos
    if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(extension)) {
      return <FaArchive className="file-icon file-archive-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Ejecutables
    if (['exe', 'msi', 'deb', 'rpm', 'dmg', 'app', 'sh', 'bat', 'cmd'].includes(extension)) {
      return <FaCog className="file-icon file-executable-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Base de datos
    if (['sql', 'db', 'sqlite', 'mdb'].includes(extension)) {
      return <FaDatabase className="file-icon file-database-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
    }
    
    // Genérico
    return <FaFile className="file-icon file-generic-icon" style={{ fontSize: `${iconSize}px`, width: `${iconSize}px`, height: `${iconSize}px` }} />;
  }, [iconSize]);

  // Node template personalizado con iconos del tema
  const nodeTemplate = useCallback((node, options) => {
    const isDirectory = node.data?.type === 'directory';
    const isExpanded = expandedKeys[node.key];
    let icon = null;

    if (isDirectory) {
      const folderColor = getThemeDefaultColor(iconTheme);
      const themeIcon = isExpanded
        ? iconThemes[iconTheme]?.icons?.folderOpen
        : iconThemes[iconTheme]?.icons?.folder;

      if (themeIcon) {
        icon = React.cloneElement(themeIcon, {
          style: {
            ...themeIcon.props.style,
            color: folderColor,
            '--icon-color': folderColor,
            fontSize: `${folderIconSize}px`,
            width: `${folderIconSize}px`,
            height: `${folderIconSize}px`
          },
          'data-folder-color': folderColor
        });
      } else {
        icon = isExpanded
          ? <span 
              className="pi pi-folder-open" 
              style={{ 
                color: folderColor,
                fontSize: `${folderIconSize}px`
              }} 
            />
          : <span 
              className="pi pi-folder" 
              style={{ 
                color: folderColor,
                fontSize: `${folderIconSize}px`
              }} 
            />;
      }
    } else {
      // Icono para archivos - usar función getFileIcon que reconoce tipos
      icon = getFileIcon(node.label, node.data?.type);
    }

    // Handler para drag start
    const handleDragStart = (e) => {
      if (isDirectory) {
        e.preventDefault(); // No permitir arrastrar carpetas por ahora
        return;
      }
      
      const filePath = node.data?.path;
      if (!filePath) {
        e.preventDefault();
        return;
      }
      
      // Guardar la ruta del archivo en dataTransfer
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('text/plain', filePath);
      e.dataTransfer.setData('application/x-local-file', JSON.stringify({
        path: filePath,
        name: node.label,
        type: node.data?.type || 'file'
      }));
      
      // Establecer un identificador para que FileExplorer sepa que viene del sidebar local
      e.dataTransfer.setData('x-source', 'local-explorer-sidebar');
      
      console.log('📤 [LocalFileExplorerSidebar] Iniciando drag:', filePath);
    };
    
    return (
      <div 
        className="flex align-items-center gap-1" 
        style={{ width: '100%', cursor: isDirectory ? 'default' : 'grab' }}
        draggable={!isDirectory}
        onDragStart={handleDragStart}
      >
        <span style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexShrink: 0
        }}>
          {icon}
        </span>
        <span className="node-label" style={{ flex: 1, minWidth: 0 }}>
          {node.label}
        </span>
      </div>
    );
  }, [expandedKeys, iconTheme, iconSize, folderIconSize, getThemeDefaultColor, getFileIcon]);

  const panelBorder = colors?.contentBorder || 'rgba(255,255,255,0.08)';
  const textPrimary = colors?.sidebarText || '#e5ecff';

  // Navegar hacia atrás
  const handleNavigateUp = useCallback(() => {
    if (!currentPath) return;
    try {
      const normalizedPath = currentPath.replace(/\\/g, '/');
      const pathParts = normalizedPath.split('/').filter(p => p);
      
      if (pathParts.length <= 1) {
        return;
      }
      
      const parentParts = pathParts.slice(0, -1);
      const parentPath = parentParts.length === 1 && parentParts[0].endsWith(':') 
        ? parentParts[0] + '/' 
        : parentParts.join('/');
      
      const platform = window.electron?.platform || 'win32';
      const finalPath = platform === 'win32' 
        ? parentPath.replace(/\//g, '\\')
        : '/' + parentPath;
      
      setCurrentPath(null);
      setNodes([]);
      setExpandedKeys({});
      loadDirectory(finalPath);
    } catch (error) {
      console.error('Error navegando hacia atrás:', error);
    }
  }, [currentPath, loadDirectory]);

  return (
    <div
      className="local-file-explorer-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'transparent',
        color: textPrimary,
        fontFamily: explorerFont,
        fontSize: `${explorerFontSize}px`,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: 0,
        margin: 0
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0.5rem',
        borderBottom: `1px solid ${panelBorder}`,
        gap: '0.375rem',
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box',
        minHeight: '48px'
      }}>
        <Button
          icon="pi pi-arrow-left"
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={onBackToConnections}
          tooltip="Volver a conexiones"
          style={{ flexShrink: 0 }}
        />
        {currentPath && currentPath !== initialPath && (
          <Button
            icon="pi pi-arrow-up"
            className="p-button-rounded p-button-text sidebar-action-button"
            onClick={handleNavigateUp}
            tooltip="Subir nivel"
            style={{ flexShrink: 0 }}
          />
        )}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          minWidth: 0,
          overflow: 'hidden',
          marginLeft: '0.375rem',
          marginRight: '0.375rem'
        }}>
          <span style={{ 
            fontSize: `${explorerFontSize || 14}px`, 
            fontWeight: 500,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: '1.2'
          }}>
            Explorador Local
          </span>
          {currentPath && (
            <span style={{ 
              fontSize: `${Math.max(10, (explorerFontSize || 14) - 2)}px`, 
              opacity: 0.7, 
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              lineHeight: '1.2',
              marginTop: '0.125rem'
            }}>
              {currentPath}
            </span>
          )}
        </div>
        <Button
          icon={showHiddenFiles ? "pi pi-eye-slash" : "pi pi-eye"}
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={() => {
            const newValue = !showHiddenFiles;
            setShowHiddenFiles(newValue);
            try {
              localStorage.setItem('localExplorer_showHiddenFiles', newValue.toString());
            } catch (e) {
              console.error('Error guardando preferencia:', e);
            }
            // Recargar el directorio actual con el nuevo filtro
            if (currentPath) {
              loadDirectory(currentPath);
            }
          }}
          tooltip={showHiddenFiles ? "Ocultar archivos ocultos" : "Mostrar archivos ocultos"}
          style={{ flexShrink: 0 }}
        />
        <Button
          icon="pi pi-refresh"
          className="p-button-rounded p-button-text sidebar-action-button"
          onClick={() => currentPath && loadDirectory(currentPath)}
          tooltip="Actualizar"
          disabled={!currentPath || loading}
          style={{ flexShrink: 0 }}
        />
      </div>

      <Divider style={{ margin: 0, flexShrink: 0 }} />

      {/* Tree Container */}
      <div 
        className="tree-container"
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '0.5rem',
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        {loading && nodes.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            padding: '2rem',
            width: '100%'
          }}>
            <ProgressSpinner size="small" />
          </div>
        ) : nodes.length === 0 ? (
          <div style={{ 
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem', 
            gap: '1rem',
            width: '100%'
          }}>
            <div style={{ 
              textAlign: 'center', 
              opacity: 0.7,
              fontSize: '0.9rem'
            }}>
              No hay archivos visibles
            </div>
            <Button
              icon={showHiddenFiles ? 'pi pi-eye-slash' : 'pi pi-eye'}
              label={showHiddenFiles ? 'Ocultar archivos ocultos' : 'Mostrar archivos ocultos'}
              className="p-button-rounded p-button-text"
              onClick={() => {
                const newValue = !showHiddenFiles;
                setShowHiddenFiles(newValue);
                try {
                  localStorage.setItem('localExplorer_showHiddenFiles', newValue.toString());
                } catch (e) {
                  console.error('Error guardando preferencia:', e);
                }
                // Recargar el directorio actual con el nuevo filtro
                if (currentPath) {
                  loadDirectory(currentPath);
                }
              }}
              style={{
                fontSize: '0.875rem',
                padding: '0.5rem 1rem'
              }}
            />
          </div>
        ) : (
          <Tree
            key={`local-explorer-${iconTheme}-${iconSize}-${folderIconSize}`}
            value={nodes}
            expandedKeys={expandedKeys}
            onToggle={handleToggle}
            selectionMode="single"
            selectionKeys={selectedKey}
            onSelectionChange={(e) => setSelectedKey(e.value)}
            className="sidebar-tree"
            nodeTemplate={nodeTemplate}
            style={{ 
              fontSize: `${explorerFontSize || 14}px`,
              backgroundColor: 'transparent',
              color: textPrimary,
              width: '100%'
            }}
          />
        )}
      </div>

      <div style={{ flexShrink: 0, width: '100%' }}>
        <SidebarFooter
          onConfigClick={() => {
            if (setShowSettingsDialog) {
              setShowSettingsDialog(true);
            }
          }}
          allExpanded={false}
          toggleExpandAll={() => {
            // No hay funcionalidad de expandir/colapsar todo en el explorador local
          }}
          collapsed={sidebarCollapsed}
          sessionActionIconTheme={sessionActionIconTheme}
        />
      </div>
    </div>
  );
};

export default LocalFileExplorerSidebar;
