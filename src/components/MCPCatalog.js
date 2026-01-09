import React, { useState, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputTextarea } from 'primereact/inputtextarea';
import { InputSwitch } from 'primereact/inputswitch';
import mcpCatalogData from '../data/mcp-catalog.json';
import { useTranslation } from '../i18n/hooks/useTranslation';

const normalizePrimeIcon = (iconName) => {
  if (!iconName) return 'pi pi-question-circle';
  const trimmed = iconName.trim();
  if (trimmed.startsWith('pi pi-')) return trimmed;
  if (trimmed.startsWith('pi-')) return `pi ${trimmed}`;
  if (trimmed.startsWith('pi ')) return trimmed;
  if (trimmed.startsWith('pi')) {
    const normalized = trimmed.replace(/^pi/, '').trim();
    if (normalized.startsWith('pi-')) return `pi ${normalized}`;
    return `pi pi-${normalized.replace(/^pi-/, '')}`;
  }
  return `pi pi-${trimmed.replace(/^pi-/, '')}`;
};

// Componente: Tarjeta de categoría
const CategoryCard = ({
  id,
  icon,
  color,
  title,
  description,
  count,
  installedCount,
  activeCount,
  onSelect,
  themeColors
}) => (
  <button
    type="button"
    key={id}
    onClick={() => onSelect(id)}
    style={{
      textAlign: 'left',
      background: `linear-gradient(135deg, rgba(16, 20, 28, 0.6) 0%, rgba(16, 20, 28, 0.4) 100%)`,
      backdropFilter: 'blur(8px) saturate(140%)',
      WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      border: `2px solid ${color}30`,
      borderRadius: '12px',
      padding: '1rem',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '220px',
      outline: 'none',
      color: themeColors.textPrimary
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-6px)';
    e.currentTarget.style.borderColor = color;
    e.currentTarget.style.boxShadow = `0 12px 32px ${color}30, inset 0 1px 0 rgba(255,255,255,0.05)`;
  }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.borderColor = `${color}30`;
      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)';
    }}
  >
    <div style={{
      position: 'absolute',
      top: '-20px',
      right: '-20px',
      width: '100px',
      height: '100px',
      borderRadius: '50%',
      background: `${color}10`,
      filter: 'blur(30px)',
      pointerEvents: 'none'
    }} />

    <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{
        width: '44px',
        height: '44px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        background: `${color}20`,
        border: `1px solid ${color}40`,
        boxShadow: `0 2px 8px ${color}20`
      }}>
      <i className={normalizePrimeIcon(icon)} style={{ color: color, fontSize: '1.2rem' }} />
      </div>

      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: themeColors.textPrimary }}>
          {title}
        </h3>
        <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: themeColors.textSecondary, lineHeight: 1.4 }}>
          {description}
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '0.75rem',
        marginTop: 'auto',
        marginBottom: '0.75rem',
        paddingBottom: '0.75rem',
        borderBottom: `1px solid ${color}20`
      }}>
        <div>
          <div style={{
            fontSize: '0.7rem',
            color: themeColors.textSecondary,
            marginBottom: '0.3rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600
          }}>
            MCPs
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color }}>
            {count}
          </div>
        </div>
        <div>
          <div style={{
            fontSize: '0.7rem',
            color: themeColors.textSecondary,
            marginBottom: '0.3rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontWeight: 600
          }}>
            Disponibles
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color }}>
            {Math.max(count - installedCount, 0) > 0 ? Math.max(count - installedCount, 0) : (activeCount > 0 ? '✓' : '-') }
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
        color: color,
        fontSize: '0.8rem',
        fontWeight: 600,
        padding: '0.6rem',
        background: `${color}15`,
        borderRadius: '10px',
        border: `1px solid ${color}30`,
        transition: 'all 0.2s ease'
      }}>
        <span>Ver detalles</span>
        <i className="pi pi-arrow-right" style={{ fontSize: '0.8rem' }} />
      </div>
    </div>
  </button>
);

// Componente: Tarjeta MCP compacta
const MCPCard = ({ mcp, installed, serverState, onInstall, themeColors, accentColor }) => {
  const buttonLabel = installed ? 'Instalado' : (mcp.requiresConfig ? 'Configurar' : 'Instalar');
  const buttonIcon = installed ? 'pi pi-check' : (mcp.requiresConfig ? 'pi pi-cog' : 'pi pi-download');
  const color = accentColor || themeColors.primaryColor;

  return (
    <div style={{
      background: `linear-gradient(135deg, rgba(16, 20, 28, 0.6) 0%, rgba(16, 20, 28, 0.4) 100%)`,
      border: `1.5px solid ${installed ? 'rgba(100, 200, 100, 0.4)' : `${color}30`}`,
      borderRadius: '12px',
      padding: '0.95rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
      position: 'relative',
      boxShadow: installed
        ? '0 6px 16px rgba(76, 175, 80, 0.25)'
        : '0 4px 14px rgba(0,0,0,0.18)',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
      minHeight: '210px'
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
          color: themeColors.textPrimary,
          backdropFilter: 'blur(8px)',
          borderRadius: '10px'
        }}>
          {serverState?.running ? '● ACTIVO' : '○ Instalado'}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.625rem', paddingRight: installed ? '3.5rem' : '0' }}>
        <div style={{
          width: '40px',
          height: '40px',
          background: `${color}20`,
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: `1px solid ${color}40`,
          boxShadow: `0 2px 8px ${color}20`
        }}>
        <i className={normalizePrimeIcon(mcp.icon)} style={{ fontSize: '1rem', color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: themeColors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mcp.name}</h4>
          <p style={{ margin: '0.125rem 0 0 0', fontSize: '0.7rem', color: themeColors.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.2px' }}>{mcp.package}</p>
        </div>
      </div>

      <p style={{ margin: 0, fontSize: '0.78rem', color: themeColors.textSecondary, lineHeight: '1.4', flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{mcp.description}</p>

      {mcp.warning && (
        <div style={{ padding: '0.375rem', background: 'rgba(255, 152, 0, 0.12)', border: '1px solid rgba(255, 152, 0, 0.35)', borderRadius: '8px', fontSize: '0.72rem', color: '#ffb74d' }}>⚠️ {mcp.warning}</div>
      )}

      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
        {mcp.capabilities?.map(cap => (
          <span key={cap} style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', background: `${color}15`, border: `1px solid ${color}30`, borderRadius: '6px', color: themeColors.textPrimary, fontWeight: '500', backdropFilter: 'blur(3px)' }}>{cap}</span>
        ))}
        {mcp.tools && (
          <span style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', background: 'rgba(100, 200, 100, 0.12)', border: '1px solid rgba(100, 200, 100, 0.35)', borderRadius: '6px', color: themeColors.textPrimary, fontWeight: '500' }}>🔧 {mcp.tools.length}</span>
        )}
      </div>

      <Button
        label={buttonLabel}
        icon={buttonIcon}
        disabled={installed}
        onClick={() => onInstall(mcp)}
        style={{
          width: '100%',
          background: installed ? 'rgba(100, 200, 100, 0.18)' : color,
          border: installed ? '1px solid rgba(100, 200, 100, 0.35)' : 'none',
          color: installed ? themeColors.textSecondary : 'white',
          borderRadius: '8px',
          fontSize: '0.78rem',
          padding: '0.45rem',
          cursor: installed ? 'not-allowed' : 'pointer',
          opacity: installed ? 0.7 : 1,
          fontWeight: '600',
          transition: 'transform 0.18s ease'
        }}
        onMouseEnter={(e) => {
          if (!installed) e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      />
    </div>
  );
};

const MCPCatalog = ({ installedServers = [], onInstall, themeColors }) => {
  const { t } = useTranslation('common');
  
  const [searchTerm, setSearchTerm] = useState('');
  const VALID_CATEGORY_IDS = ['system','automation','development','data','web','websearch','productivity','security'];
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [selectedMCP, setSelectedMCP] = useState(null);
  const [configValues, setConfigValues] = useState({});
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customPackage, setCustomPackage] = useState('');
  const [customId, setCustomId] = useState('');
  const [customArgs, setCustomArgs] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Funciones helper para manejar allowedPaths en filesystem
  const sanitizeFilesystemPath = (rawPath) => {
    if (Array.isArray(rawPath)) {
      return sanitizeFilesystemPath(rawPath[0]);
    }
    if (rawPath && typeof rawPath === 'object') {
      const firstValue = Object.values(rawPath)[0];
      return sanitizeFilesystemPath(firstValue);
    }
    if (typeof rawPath !== 'string') {
      return '';
    }
    const trimmed = rawPath.trim();
    if (!trimmed) {
      return '';
    }
    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const handleBrowseFilesystemPath = async () => {
    try {
      if (
        typeof window === 'undefined' ||
        !window?.electron?.dialog?.showOpenDialog
      ) {
        return;
      }
      const result = await window.electron.dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Seleccionar directorio permitido'
      });
      if (result && !result.canceled) {
        const selectedPath =
          (Array.isArray(result.filePaths) && result.filePaths[0]) ||
          result.filePath ||
          null;
        if (selectedPath) {
          setConfigValues({
            ...configValues,
            allowedPaths: selectedPath
          });
        }
      }
    } catch (error) {
      console.error('Error abriendo dialog:', error);
    }
  };

  const isInstalled = (mcpId) => installedServers.some(s => s.id === mcpId);
  const getServerState = (mcpId) => installedServers.find(s => s.id === mcpId) || null;

  const filteredMCPs = useMemo(() => {
    if (!searchTerm.trim()) return mcpCatalogData.mcps;
    const term = searchTerm.toLowerCase();
    return mcpCatalogData.mcps.filter(mcp =>
      mcp.name.toLowerCase().includes(term) ||
      mcp.description.toLowerCase().includes(term) ||
      (mcp.package && mcp.package.toLowerCase().includes(term)) ||
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

  const selectedCategory = selectedCategoryId ? mcpsByCategory[selectedCategoryId] : null;

  const stats = useMemo(() => {
    const total = mcpCatalogData.mcps.length;
    let installed = 0; let active = 0;
    installedServers.forEach(server => { installed++; if (server.running) active++; });
    return { total, installed, active, available: total - installed };
  }, [installedServers]);

  const handleSelectCategory = (categoryId) => {
    setSelectedCategoryId(categoryId);
    setShowCategoryDialog(true);
  };

  const handleInstall = (mcp) => {
    if (mcp.type === 'native') {
      setSelectedMCP(mcp);
      setConfigValues(mcp.recommendedConfig || {
        mode: 'scraping',
        maxResults: '5',
        timeoutMs: '5000',
        maxContentLength: '200000',
        allowedDomains: '',
        userAgent: 'NodeTerm-WebSearch/1.0',
        renderMode: 'static',
        apiEndpoint: '',
        apiKey: '',
        apiProvider: ''
      });
      setShowConfigDialog(true);
      return;
    }

    if (mcp.requiresConfig) {
      setSelectedMCP(mcp);
      // Usar valores recomendados si existen
      if (mcp.recommendedConfig) {
        setConfigValues(mcp.recommendedConfig);
      } else {
        setConfigValues({});
      }
      setShowConfigDialog(true);
      return;
    }
    const cmd = mcp.runCommand || 'npx';
    const baseArgs = cmd === 'uvx' ? [mcp.package] : ['-y', mcp.package];
    const config = { command: cmd, args: baseArgs, enabled: true, autostart: false, autoRestart: true };
    if (onInstall) onInstall(mcp.id, config);
  };

  const handleConfirmInstall = () => {
    if (!selectedMCP) return;

    if (selectedMCP.type === 'native') {
      const mode = (configValues.mode || 'scraping').toLowerCase() === 'api' ? 'api' : 'scraping';
      const renderMode = (configValues.renderMode || 'static').toLowerCase() === 'rendered' ? 'rendered' : 'static';
      const maxResults = Number(configValues.maxResults) || 5;
      const timeoutMs = Number(configValues.timeoutMs) || 5000;
      const maxContentLength = Number(configValues.maxContentLength) || 200000;
      const allowedDomains = (configValues.allowedDomains || '')
        .split(',')
        .map(domain => domain.trim())
        .filter(Boolean);

      const options = {
        maxResults,
        timeoutMs,
        maxContentLength,
        userAgent: configValues.userAgent || undefined,
        api: {
          endpoint: configValues.apiEndpoint || '',
          key: configValues.apiKey || '',
          provider: configValues.apiProvider || ''
        }
      };

      const config = {
        type: 'native',
        enabled: true,
        autostart: false,
        renderMode,
        mode,
        allowedDomains,
        options
      };

      if (onInstall) onInstall(selectedMCP.id, config);
      setShowConfigDialog(false);
      setSelectedMCP(null);
      setConfigValues({});
      return;
    }
    // 🔒 ESPECIAL: Para Tenable, ejecutar desde archivo local en lugar de npx
    let cmd, args, cwdForTenable;
    if (selectedMCP.id === 'tenable') {
      // Ejecutar el servidor Tenable desde el directorio donde están las dependencias
      cmd = 'node';
      args = ['index.js'];
      // CRÍTICO: Establecer el directorio de trabajo como el directorio de tenable
      // donde están instaladas las dependencias (node_modules)
      cwdForTenable = 'src/mcp-servers/tenable';
    } else {
      cmd = selectedMCP.runCommand || 'npx';
      args = cmd === 'uvx' ? [selectedMCP.package] : ['-y', selectedMCP.package];
    }
    const env = {};
    
    // Función helper para agregar flags de PowerShell por defecto a ALLOWED_FLAGS
    const ensurePowerShellFlags = (flagsStr) => {
      if (!flagsStr || flagsStr.trim() === '' || flagsStr.toLowerCase() === 'all') {
        return flagsStr; // No modificar si está vacío o es 'all'
      }
      const defaultPowerShellFlags = ['-command', '-Command', '-ExecutionPolicy', '-NoProfile', '-NonInteractive'];
      const existingFlags = flagsStr.split(',').map(f => f.trim()).filter(Boolean);
      const existingLower = existingFlags.map(f => f.toLowerCase());
      
      // Agregar flags de PowerShell que no estén ya presentes
      defaultPowerShellFlags.forEach(flag => {
        if (!existingLower.includes(flag.toLowerCase())) {
          existingFlags.push(flag);
        }
      });
      
      return existingFlags.join(',');
    };
    
    // Procesar configValues y asegurar flags de PowerShell para cli-mcp-server
    const processedConfigValues = { ...configValues };
    if (selectedMCP.id === 'cli-mcp-server') {
      // Si ALLOWED_FLAGS no está definido o está vacío, usar la configuración recomendada del catálogo
      if (processedConfigValues.ALLOWED_FLAGS === undefined || !processedConfigValues.ALLOWED_FLAGS || processedConfigValues.ALLOWED_FLAGS.trim() === '') {
        processedConfigValues.ALLOWED_FLAGS = selectedMCP.recommendedConfig?.ALLOWED_FLAGS || processedConfigValues.ALLOWED_FLAGS || '';
      } else {
        // Si tiene valor, asegurar que incluye flags de PowerShell
        processedConfigValues.ALLOWED_FLAGS = ensurePowerShellFlags(processedConfigValues.ALLOWED_FLAGS);
      }
    }
    
    if (selectedMCP.configSchema) {
      for (const [key, schema] of Object.entries(selectedMCP.configSchema)) {
        const value = processedConfigValues[key];
        if (!value) continue;
        if (schema.envName) {
          // Mandar como variable de entorno
          if (schema.type === 'array') {
            const arrayValue = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
            env[schema.envName] = arrayValue.join(',');
          } else if (schema.type === 'boolean') {
            env[schema.envName] = value ? 'true' : 'false';
          } else {
            env[schema.envName] = value;
          }
        } else if (schema.type === 'array') {
          const arrayValue = Array.isArray(value) ? value : value.split(',').map(v => v.trim());
          arrayValue.forEach(v => args.push(v));
        } else {
          args.push(value);
        }
      }
    }
    // Ajuste para servidores Python/CLI: usar ALLOWED_DIR como cwd si está disponible
    let cwd;
    if (selectedMCP.id === 'tenable' && cwdForTenable) {
      cwd = cwdForTenable;
    } else if ((selectedMCP.id === 'cli-mcp-server' || selectedMCP.runtime === 'python') && env && env.ALLOWED_DIR) {
      cwd = env.ALLOWED_DIR;
    }
    const config = { command: cmd, args, enabled: true, autostart: false, autoRestart: true, configValues: processedConfigValues, env, ...(cwd ? { cwd } : {}) };
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
        <Button label="MCP Personalizado" icon="pi pi-plus-circle" onClick={() => setShowCustomDialog(true)} style={{ background: themeColors.primaryColor, border: 'none', color: 'white', borderRadius: '8px', fontSize: '0.75rem', padding: '0.4rem 0.875rem', fontWeight: '500' }} />
      </div>

      {/* Categorías */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingRight: '0.25rem', minHeight: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.1rem', paddingTop: '0.5rem' }}>
        {VALID_CATEGORY_IDS.map(categoryId => {
          const base = (mcpCatalogData.categories || []).find(c => c.id === categoryId) || { id: categoryId, name: categoryId, icon: 'pi-folder', color: '#888', description: '' };
          const categoryData = mcpsByCategory[categoryId] || { ...base, mcps: [] };
          const mcpCount = categoryData.mcps?.length || 0;
          if (mcpCount === 0 && searchTerm.trim()) return null;
          const installedCount = categoryData.mcps.filter(mcp => isInstalled(mcp.id)).length;
          const activeCount = categoryData.mcps.filter(mcp => {
            const server = getServerState(mcp.id);
            return !!server?.running;
          }).length;

          return (
            <CategoryCard
              key={categoryId}
              icon={base.icon}
              color={base.color}
              title={base.name}
              description={base.description}
              count={mcpCount}
              installedCount={installedCount}
              activeCount={activeCount}
              onSelect={handleSelectCategory}
              id={categoryId}
              themeColors={themeColors}
            />
          );
        })}
        {(searchTerm.trim() && Object.values(mcpsByCategory).every(category => (category?.mcps?.length || 0) === 0)) && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '1.5rem', color: themeColors.textSecondary, fontSize: '0.85rem' }}>
            <i className="pi pi-inbox" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'block' }} />
            <p style={{ margin: 0 }}>No encontramos MCPs que coincidan con tu búsqueda.</p>
          </div>
        )}
        </div>
      </div>

      {/* Diálogos */}
      <Dialog header={`Configurar ${selectedMCP?.name}`} visible={showConfigDialog} onHide={() => setShowConfigDialog(false)} style={{ width: '480px' }} contentStyle={{ background: themeColors.cardBackground, padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ margin: 0, fontSize: '0.85rem', color: themeColors.textSecondary, lineHeight: '1.4' }}>{selectedMCP?.description}</p>
          {selectedMCP?.configSchema && Object.entries(selectedMCP.configSchema).map(([key, schema]) => (
            <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: themeColors.textPrimary }}>{key} {schema.required && <span style={{ color: '#f44336' }}>*</span>}</label>
              {schema.description && (<p style={{ margin: 0, fontSize: '0.7rem', color: themeColors.textSecondary }}>{schema.description}</p>)}
              {schema.type === 'boolean' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <InputSwitch checked={!!configValues[key]} onChange={(e) => setConfigValues({ ...configValues, [key]: e.value })} />
                  <span style={{ fontSize: '0.8rem', color: themeColors.textSecondary }}>{configValues[key] ? 'Sí' : 'No'}</span>
                </div>
              ) : key === 'allowedPaths' ? (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
                  <InputText 
                    type='text' 
                    value={sanitizeFilesystemPath(configValues[key])} 
                    onChange={(e) => setConfigValues({ ...configValues, [key]: e.target.value })} 
                    placeholder="C:\path\to\directory"
                    style={{ flex: 1, fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', border: `1px solid ${themeColors.borderColor}`, borderRadius: '8px', color: themeColors.textPrimary, padding: '0.5rem' }} 
                  />
                  <Button 
                    icon="pi pi-folder-open" 
                    onClick={handleBrowseFilesystemPath}
                    tooltip={t('tooltips.browse')}
                    tooltipOptions={{ position: 'top' }}
                    style={{ 
                      background: 'rgba(33, 150, 243, 0.2)', 
                      border: '1px solid rgba(33, 150, 243, 0.5)', 
                      color: '#2196f3', 
                      borderRadius: '8px',
                      minWidth: 'auto',
                      aspectRatio: '1',
                      padding: '0.5rem'
                    }} 
                  />
                </div>
              ) : schema.type === 'array' ? (
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

      <Dialog
        header={selectedCategory ? selectedCategory.name : ''}
        visible={showCategoryDialog}
        onHide={() => {
          setShowCategoryDialog(false);
          setSelectedCategoryId(null);
        }}
        style={{ width: '720px', maxWidth: '95vw' }}
        contentStyle={{ background: themeColors.cardBackground, padding: '1.25rem', maxHeight: '70vh' }}
      >
        {selectedCategory ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', height: '100%' }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: themeColors.textSecondary, lineHeight: '1.4' }}>{selectedCategory.description}</p>
            {selectedCategory.mcps && selectedCategory.mcps.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem', overflowY: 'auto', paddingRight: '0.25rem' }}>
                {selectedCategory.mcps.map(mcp => (
                  <MCPCard
                    key={mcp.id}
                    mcp={mcp}
                    installed={isInstalled(mcp.id)}
                    serverState={getServerState(mcp.id)}
                    onInstall={handleInstall}
                    themeColors={themeColors}
                    accentColor={selectedCategory.color}
                  />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: themeColors.textSecondary, fontSize: '0.8rem' }}>
                <i className="pi pi-inbox" style={{ fontSize: '1.75rem', marginBottom: '0.5rem', display: 'block' }} />
                <p style={{ margin: 0 }}>No hay MCPs en esta categoría</p>
              </div>
            )}
          </div>
        ) : null}
      </Dialog>
    </div>
  );
};

export default MCPCatalog;
