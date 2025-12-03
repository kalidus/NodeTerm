import React, { useState, useEffect, useCallback } from 'react';
import { Button } from 'primereact/button';
import { Tree } from 'primereact/tree';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Divider } from 'primereact/divider';
import { uiThemes } from '../themes/ui-themes';
import SidebarFooter from './SidebarFooter';
import { useTranslation } from '../i18n/hooks/useTranslation';
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
  sessionActionIconTheme = 'modern'
}) => {
  const { t } = useTranslation('common');
  const theme = uiThemes[uiTheme] || uiThemes['Light'];
  const colors = theme?.colors || {};
  
  const [nodes, setNodes] = useState([]);
  const [expandedKeys, setExpandedKeys] = useState({});
  const [selectedKey, setSelectedKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState(null);

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
        const children = result.files.map(file => ({
          key: makeKey(file.path),
          label: file.name,
          data: {
            path: file.path,
            type: file.type,
            size: file.size,
            parentPath: dirPath
          },
          icon: file.type === 'directory' ? 'pi pi-folder' : 'pi pi-file',
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
  }, [makeKey, showToast, currentPath, updateNodeChildren]);

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
            textAlign: 'center', 
            padding: '2rem', 
            opacity: 0.7,
            fontSize: '0.9rem',
            width: '100%'
          }}>
            No hay archivos
          </div>
        ) : (
          <Tree
            value={nodes}
            expandedKeys={expandedKeys}
            onToggle={handleToggle}
            selectionMode="single"
            selectionKeys={selectedKey}
            onSelectionChange={(e) => setSelectedKey(e.value)}
            className="sidebar-tree"
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
