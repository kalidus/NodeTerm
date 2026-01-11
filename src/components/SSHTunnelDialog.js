/**
 * SSHTunnelDialog - Diálogo para crear/editar túneles SSH
 * 
 * Diseño visual inspirado en MobaXterm con diagrama interactivo
 * que cambia según el tipo de túnel seleccionado
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { RadioButton } from 'primereact/radiobutton';
import { Dropdown } from 'primereact/dropdown';
import { Password } from 'primereact/password';
import { FileUpload } from 'primereact/fileupload';
import { useTranslation } from '../i18n/hooks/useTranslation';

/**
 * Componente SVG del diagrama visual del túnel
 */
const TunnelDiagram = ({ tunnelType, config }) => {
  const { t } = useTranslation('dialogs');
  
  // Colores del tema
  const colors = {
    background: '#1e1e2e',
    primary: '#89b4fa',
    secondary: '#a6e3a1',
    accent: '#f38ba8',
    text: '#cdd6f4',
    textMuted: '#6c7086',
    tunnel: '#f9e2af',
    firewall: '#fab387',
    server: '#74c7ec'
  };

  // Renderizar diagrama según tipo
  const renderLocalForward = () => (
    <svg viewBox="0 0 700 280" className="tunnel-diagram-svg">
      {/* Fondo */}
      <rect width="700" height="280" fill={colors.background} rx="8"/>
      
      {/* Título */}
      <text x="350" y="30" textAnchor="middle" fill={colors.text} fontSize="14" fontWeight="bold">
        {t('sshTunnel.diagram.localTitle') || 'Local Port Forwarding (-L)'}
      </text>
      <text x="350" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">
        {t('sshTunnel.diagram.localDesc') || 'Conexiones locales se reenvían al servidor remoto'}
      </text>
      
      {/* Tu computadora */}
      <g transform="translate(50, 100)">
        <rect width="120" height="100" fill="#2d2d3d" rx="8" stroke={colors.primary} strokeWidth="2"/>
        <text x="60" y="-10" textAnchor="middle" fill={colors.primary} fontSize="12" fontWeight="bold">
          {t('sshTunnel.diagram.yourComputer') || 'Tu Computadora'}
        </text>
        {/* Icono de monitor */}
        <rect x="25" y="15" width="70" height="45" fill="#1a1a2e" rx="4" stroke={colors.textMuted}/>
        <rect x="45" y="65" width="30" height="8" fill={colors.textMuted} rx="2"/>
        <text x="60" y="85" textAnchor="middle" fill={colors.secondary} fontSize="10">
          :{config.localPort || '????'}
        </text>
      </g>
      
      {/* Flecha hacia túnel */}
      <g transform="translate(180, 145)">
        <line x1="0" y1="0" x2="80" y2="0" stroke={colors.tunnel} strokeWidth="3" strokeDasharray="5,3"/>
        <polygon points="80,0 70,-6 70,6" fill={colors.tunnel}/>
        <text x="40" y="-10" textAnchor="middle" fill={colors.tunnel} fontSize="9">
          {t('sshTunnel.diagram.sshTunnel') || 'SSH Tunnel'}
        </text>
      </g>
      
      {/* Firewall */}
      <g transform="translate(270, 90)">
        <rect width="80" height="120" fill="#3d2020" rx="4" stroke={colors.firewall} strokeWidth="2"/>
        <text x="40" y="-8" textAnchor="middle" fill={colors.firewall} fontSize="11" fontWeight="bold">
          Firewall
        </text>
        {/* Llamas */}
        <text x="20" y="40" fontSize="24">🔥</text>
        <text x="40" y="70" fontSize="24">🔥</text>
        <text x="20" y="100" fontSize="24">🔥</text>
      </g>
      
      {/* Flecha después del firewall */}
      <g transform="translate(360, 145)">
        <line x1="0" y1="0" x2="60" y2="0" stroke={colors.tunnel} strokeWidth="3" strokeDasharray="5,3"/>
        <polygon points="60,0 50,-6 50,6" fill={colors.tunnel}/>
      </g>
      
      {/* Servidor SSH */}
      <g transform="translate(430, 80)">
        <rect width="100" height="70" fill="#2d2d3d" rx="8" stroke={colors.server} strokeWidth="2"/>
        <text x="50" y="-10" textAnchor="middle" fill={colors.server} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.sshServer') || 'SSH Server'}
        </text>
        {/* Icono de servidor */}
        <rect x="15" y="10" width="70" height="15" fill="#1a1a2e" rx="2"/>
        <circle cx="25" cy="17" r="3" fill={colors.secondary}/>
        <rect x="15" y="30" width="70" height="15" fill="#1a1a2e" rx="2"/>
        <circle cx="25" cy="37" r="3" fill={colors.secondary}/>
        <text x="50" y="60" textAnchor="middle" fill={colors.textMuted} fontSize="9">
          {config.sshHost || '<SSH host>'}:{config.sshPort || 22}
        </text>
      </g>
      
      {/* Flecha al destino */}
      <g transform="translate(540, 110)">
        <line x1="0" y1="0" x2="40" y2="0" stroke={colors.secondary} strokeWidth="2"/>
        <polygon points="40,0 32,-5 32,5" fill={colors.secondary}/>
      </g>
      
      {/* Servidor destino */}
      <g transform="translate(590, 80)">
        <rect width="90" height="70" fill="#2d3d2d" rx="8" stroke={colors.secondary} strokeWidth="2"/>
        <text x="45" y="-10" textAnchor="middle" fill={colors.secondary} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.target') || 'Destino'}
        </text>
        <rect x="10" y="15" width="70" height="35" fill="#1a2e1a" rx="4"/>
        <text x="45" y="38" textAnchor="middle" fill={colors.secondary} fontSize="9">
          {config.remoteHost || '<host>'}
        </text>
        <text x="45" y="60" textAnchor="middle" fill={colors.secondary} fontSize="10" fontWeight="bold">
          :{config.remotePort || '????'}
        </text>
      </g>
      
      {/* Leyenda */}
      <g transform="translate(50, 230)">
        <rect width="600" height="40" fill="#252535" rx="4"/>
        <text x="15" y="25" fill={colors.textMuted} fontSize="10">
          💡 {t('sshTunnel.diagram.localExample') || `Ejemplo: localhost:${config.localPort || 8080} → ${config.remoteHost || 'remote'}:${config.remotePort || 80}`}
        </text>
      </g>
    </svg>
  );

  const renderRemoteForward = () => (
    <svg viewBox="0 0 700 280" className="tunnel-diagram-svg">
      {/* Fondo */}
      <rect width="700" height="280" fill={colors.background} rx="8"/>
      
      {/* Título */}
      <text x="350" y="30" textAnchor="middle" fill={colors.text} fontSize="14" fontWeight="bold">
        {t('sshTunnel.diagram.remoteTitle') || 'Remote Port Forwarding (-R)'}
      </text>
      <text x="350" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">
        {t('sshTunnel.diagram.remoteDesc') || 'Conexiones remotas se reenvían a tu computadora'}
      </text>
      
      {/* Servidor local (tu máquina) */}
      <g transform="translate(50, 100)">
        <rect width="120" height="100" fill="#2d3d2d" rx="8" stroke={colors.secondary} strokeWidth="2"/>
        <text x="60" y="-10" textAnchor="middle" fill={colors.secondary} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.localServer') || 'Servidor Local'}
        </text>
        <rect x="25" y="15" width="70" height="45" fill="#1a2e1a" rx="4"/>
        <text x="60" y="45" textAnchor="middle" fill={colors.secondary} fontSize="10">
          {config.localHost || 'localhost'}
        </text>
        <text x="60" y="85" textAnchor="middle" fill={colors.secondary} fontSize="11" fontWeight="bold">
          :{config.localPort || '????'}
        </text>
      </g>
      
      {/* Flecha de retorno */}
      <g transform="translate(180, 145)">
        <line x1="80" y1="0" x2="0" y2="0" stroke={colors.tunnel} strokeWidth="3" strokeDasharray="5,3"/>
        <polygon points="0,0 10,-6 10,6" fill={colors.tunnel}/>
        <text x="40" y="-10" textAnchor="middle" fill={colors.tunnel} fontSize="9">
          ← {t('sshTunnel.diagram.sshTunnel') || 'SSH Tunnel'}
        </text>
      </g>
      
      {/* Firewall */}
      <g transform="translate(270, 90)">
        <rect width="80" height="120" fill="#3d2020" rx="4" stroke={colors.firewall} strokeWidth="2"/>
        <text x="40" y="-8" textAnchor="middle" fill={colors.firewall} fontSize="11" fontWeight="bold">
          Firewall
        </text>
        <text x="20" y="40" fontSize="24">🔥</text>
        <text x="40" y="70" fontSize="24">🔥</text>
        <text x="20" y="100" fontSize="24">🔥</text>
      </g>
      
      {/* Flecha */}
      <g transform="translate(360, 145)">
        <line x1="60" y1="0" x2="0" y2="0" stroke={colors.tunnel} strokeWidth="3" strokeDasharray="5,3"/>
        <polygon points="0,0 10,-6 10,6" fill={colors.tunnel}/>
      </g>
      
      {/* Servidor SSH */}
      <g transform="translate(430, 80)">
        <rect width="100" height="70" fill="#2d2d3d" rx="8" stroke={colors.server} strokeWidth="2"/>
        <text x="50" y="-10" textAnchor="middle" fill={colors.server} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.sshServer') || 'SSH Server'}
        </text>
        <rect x="15" y="10" width="70" height="15" fill="#1a1a2e" rx="2"/>
        <circle cx="25" cy="17" r="3" fill={colors.secondary}/>
        <rect x="15" y="30" width="70" height="15" fill="#1a1a2e" rx="2"/>
        <circle cx="25" cy="37" r="3" fill={colors.secondary}/>
        <text x="50" y="60" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">
          :{config.remotePort || '????'}
        </text>
      </g>
      
      {/* Flecha de clientes */}
      <g transform="translate(540, 110)">
        <line x1="40" y1="0" x2="0" y2="0" stroke={colors.accent} strokeWidth="2"/>
        <polygon points="0,0 8,-5 8,5" fill={colors.accent}/>
      </g>
      
      {/* Clientes remotos */}
      <g transform="translate(590, 80)">
        <rect width="90" height="70" fill="#3d2d3d" rx="8" stroke={colors.accent} strokeWidth="2"/>
        <text x="45" y="-10" textAnchor="middle" fill={colors.accent} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.remoteClients') || 'Clientes Remotos'}
        </text>
        {/* Iconos de personas */}
        <text x="25" y="45" fontSize="22">👤</text>
        <text x="50" y="45" fontSize="22">👤</text>
        <text x="37" y="65" fontSize="16">👤</text>
      </g>
      
      {/* Leyenda */}
      <g transform="translate(50, 230)">
        <rect width="600" height="40" fill="#252535" rx="4"/>
        <text x="15" y="25" fill={colors.textMuted} fontSize="10">
          💡 {t('sshTunnel.diagram.remoteExample') || `Ejemplo: Clientes → SSH:${config.remotePort || 8080} → localhost:${config.localPort || 3000}`}
        </text>
      </g>
    </svg>
  );

  const renderDynamicForward = () => (
    <svg viewBox="0 0 700 280" className="tunnel-diagram-svg">
      {/* Fondo */}
      <rect width="700" height="280" fill={colors.background} rx="8"/>
      
      {/* Título */}
      <text x="350" y="30" textAnchor="middle" fill={colors.text} fontSize="14" fontWeight="bold">
        {t('sshTunnel.diagram.dynamicTitle') || 'Dynamic Port Forwarding (-D) - SOCKS Proxy'}
      </text>
      <text x="350" y="50" textAnchor="middle" fill={colors.textMuted} fontSize="11">
        {t('sshTunnel.diagram.dynamicDesc') || 'Proxy SOCKS que enruta todo el tráfico a través del túnel SSH'}
      </text>
      
      {/* Aplicaciones locales */}
      <g transform="translate(30, 80)">
        <rect width="130" height="130" fill="#2d2d3d" rx="8" stroke={colors.primary} strokeWidth="2"/>
        <text x="65" y="-10" textAnchor="middle" fill={colors.primary} fontSize="11" fontWeight="bold">
          {t('sshTunnel.diagram.localApps') || 'Aplicaciones'}
        </text>
        {/* Iconos de apps */}
        <text x="20" y="35" fontSize="20">🌐</text>
        <text x="60" y="35" fontSize="10" fill={colors.textMuted}>Navegador</text>
        <text x="20" y="65" fontSize="20">💬</text>
        <text x="60" y="65" fontSize="10" fill={colors.textMuted}>Chat</text>
        <text x="20" y="95" fontSize="20">📧</text>
        <text x="60" y="95" fontSize="10" fill={colors.textMuted}>Email</text>
        <text x="65" y="120" textAnchor="middle" fill={colors.accent} fontSize="10" fontWeight="bold">
          SOCKS :{config.localPort || '????'}
        </text>
      </g>
      
      {/* Flechas al proxy */}
      <g transform="translate(170, 120)">
        <line x1="0" y1="0" x2="50" y2="20" stroke={colors.tunnel} strokeWidth="2"/>
        <line x1="0" y1="25" x2="50" y2="20" stroke={colors.tunnel} strokeWidth="2"/>
        <line x1="0" y1="50" x2="50" y2="20" stroke={colors.tunnel} strokeWidth="2"/>
        <polygon points="50,20 42,14 42,26" fill={colors.tunnel}/>
        <text x="25" y="70" textAnchor="middle" fill={colors.tunnel} fontSize="9">SOCKS5</text>
      </g>
      
      {/* Proxy SOCKS */}
      <g transform="translate(230, 110)">
        <rect width="80" height="60" fill="#3d3d2d" rx="8" stroke={colors.tunnel} strokeWidth="2"/>
        <text x="40" y="20" textAnchor="middle" fill={colors.tunnel} fontSize="10" fontWeight="bold">
          SOCKS
        </text>
        <text x="40" y="35" textAnchor="middle" fill={colors.tunnel} fontSize="10" fontWeight="bold">
          Proxy
        </text>
        <text x="40" y="52" textAnchor="middle" fill={colors.accent} fontSize="10">
          :{config.localPort || '1080'}
        </text>
      </g>
      
      {/* Túnel SSH */}
      <g transform="translate(320, 135)">
        <line x1="0" y1="0" x2="60" y2="0" stroke={colors.tunnel} strokeWidth="3" strokeDasharray="5,3"/>
        <polygon points="60,0 50,-6 50,6" fill={colors.tunnel}/>
        <text x="30" y="-10" textAnchor="middle" fill={colors.tunnel} fontSize="9">SSH</text>
      </g>
      
      {/* Firewall */}
      <g transform="translate(390, 90)">
        <rect width="60" height="100" fill="#3d2020" rx="4" stroke={colors.firewall} strokeWidth="2"/>
        <text x="30" y="30" textAnchor="middle" fontSize="20">🔥</text>
        <text x="30" y="60" textAnchor="middle" fontSize="20">🔥</text>
        <text x="30" y="90" textAnchor="middle" fontSize="20">🔥</text>
      </g>
      
      {/* Servidor SSH */}
      <g transform="translate(460, 100)">
        <rect width="80" height="70" fill="#2d2d3d" rx="8" stroke={colors.server} strokeWidth="2"/>
        <text x="40" y="-8" textAnchor="middle" fill={colors.server} fontSize="10" fontWeight="bold">
          SSH Server
        </text>
        <rect x="10" y="10" width="60" height="12" fill="#1a1a2e" rx="2"/>
        <circle cx="18" cy="16" r="3" fill={colors.secondary}/>
        <rect x="10" y="28" width="60" height="12" fill="#1a1a2e" rx="2"/>
        <circle cx="18" cy="34" r="3" fill={colors.secondary}/>
        <text x="40" y="60" textAnchor="middle" fill={colors.textMuted} fontSize="9">
          {config.sshHost || '<SSH host>'}
        </text>
      </g>
      
      {/* Flechas a Internet */}
      <g transform="translate(550, 110)">
        <line x1="0" y1="10" x2="30" y2="-10" stroke={colors.secondary} strokeWidth="2"/>
        <line x1="0" y1="25" x2="30" y2="25" stroke={colors.secondary} strokeWidth="2"/>
        <line x1="0" y1="40" x2="30" y2="60" stroke={colors.secondary} strokeWidth="2"/>
      </g>
      
      {/* Internet */}
      <g transform="translate(590, 80)">
        <ellipse cx="50" cy="60" rx="50" ry="50" fill="#1a2e3d" stroke={colors.secondary} strokeWidth="2"/>
        <text x="50" y="55" textAnchor="middle" fontSize="28">🌍</text>
        <text x="50" y="85" textAnchor="middle" fill={colors.secondary} fontSize="10" fontWeight="bold">
          Internet
        </text>
      </g>
      
      {/* Leyenda */}
      <g transform="translate(50, 230)">
        <rect width="600" height="40" fill="#252535" rx="4"/>
        <text x="15" y="25" fill={colors.textMuted} fontSize="10">
          💡 {t('sshTunnel.diagram.dynamicExample') || `Configura tus apps para usar proxy SOCKS5 en localhost:${config.localPort || 1080}`}
        </text>
      </g>
    </svg>
  );

  switch (tunnelType) {
    case 'local':
      return renderLocalForward();
    case 'remote':
      return renderRemoteForward();
    case 'dynamic':
      return renderDynamicForward();
    default:
      return renderLocalForward();
  }
};

/**
 * Diálogo principal de configuración de túnel SSH
 */
export function SSHTunnelDialog({
  visible,
  onHide,
  mode = 'new',
  onConfirm,
  onGoBack,
  foldersOptions = [],
  // Valores iniciales para edición
  initialData = null
}) {
  const { t } = useTranslation('dialogs');
  const { t: tCommon } = useTranslation('common');

  // Estado del formulario
  const [tunnelName, setTunnelName] = useState('');
  const [tunnelType, setTunnelType] = useState('local');
  const [sshHost, setSshHost] = useState('');
  const [sshPort, setSshPort] = useState(22);
  const [sshUser, setSshUser] = useState('');
  const [sshPassword, setSshPassword] = useState('');
  const [authType, setAuthType] = useState('password');
  const [privateKeyPath, setPrivateKeyPath] = useState('');
  const [passphrase, setPassphrase] = useState('');
  
  // Campos específicos según tipo
  const [localHost, setLocalHost] = useState('127.0.0.1');
  const [localPort, setLocalPort] = useState('');
  const [remoteHost, setRemoteHost] = useState('');
  const [remotePort, setRemotePort] = useState('');
  const [bindHost, setBindHost] = useState('0.0.0.0');
  
  // Carpeta destino
  const [targetFolder, setTargetFolder] = useState(null);
  
  // Estado UI
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Cargar datos iniciales en modo edición
  useEffect(() => {
    if (visible && initialData) {
      setTunnelName(initialData.name || '');
      setTunnelType(initialData.tunnelType || 'local');
      setSshHost(initialData.sshHost || '');
      setSshPort(initialData.sshPort || 22);
      setSshUser(initialData.sshUser || '');
      setSshPassword(initialData.sshPassword || '');
      setAuthType(initialData.authType || 'password');
      setPrivateKeyPath(initialData.privateKeyPath || '');
      setPassphrase(initialData.passphrase || '');
      setLocalHost(initialData.localHost || '127.0.0.1');
      setLocalPort(initialData.localPort?.toString() || '');
      setRemoteHost(initialData.remoteHost || '');
      setRemotePort(initialData.remotePort?.toString() || '');
      setBindHost(initialData.bindHost || '0.0.0.0');
    } else if (visible && !initialData) {
      // Reset para nuevo túnel
      setTunnelName('');
      setTunnelType('local');
      setSshHost('');
      setSshPort(22);
      setSshUser('');
      setSshPassword('');
      setAuthType('password');
      setPrivateKeyPath('');
      setPassphrase('');
      setLocalHost('127.0.0.1');
      setLocalPort('');
      setRemoteHost('');
      setRemotePort('');
      setBindHost('0.0.0.0');
      setTargetFolder(null);
    }
  }, [visible, initialData]);

  // Manejar confirmación
  const handleConfirm = useCallback(() => {
    const tunnelData = {
      name: tunnelName,
      tunnelType,
      sshHost,
      sshPort: parseInt(sshPort) || 22,
      sshUser,
      sshPassword,
      authType,
      privateKeyPath: authType === 'key' ? privateKeyPath : '',
      passphrase: authType === 'key' ? passphrase : '',
      localHost,
      localPort: parseInt(localPort) || 0,
      remoteHost,
      remotePort: parseInt(remotePort) || 0,
      bindHost,
      targetFolder
    };
    
    if (onConfirm) {
      onConfirm(tunnelData);
    }
  }, [
    tunnelName, tunnelType, sshHost, sshPort, sshUser, sshPassword,
    authType, privateKeyPath, passphrase, localHost, localPort,
    remoteHost, remotePort, bindHost, targetFolder, onConfirm
  ]);

  // Validación del formulario
  const isValid = useCallback(() => {
    if (!tunnelName.trim() || !sshHost.trim() || !sshUser.trim()) return false;
    if (authType === 'password' && !sshPassword.trim()) return false;
    if (authType === 'key' && !privateKeyPath.trim()) return false;
    if (!localPort) return false;
    
    if (tunnelType === 'local') {
      if (!remoteHost.trim() || !remotePort) return false;
    }
    if (tunnelType === 'remote') {
      if (!remotePort) return false;
    }
    
    return true;
  }, [tunnelName, sshHost, sshUser, sshPassword, authType, privateKeyPath, localPort, tunnelType, remoteHost, remotePort]);

  // Config para el diagrama
  const diagramConfig = {
    localHost,
    localPort: localPort || '????',
    remoteHost: remoteHost || '<host>',
    remotePort: remotePort || '????',
    sshHost: sshHost || '<SSH host>',
    sshPort: sshPort || 22
  };

  const headerTemplate = (
    <div className="protocol-dialog-header-custom">
      <div className="protocol-dialog-header-icon" style={{ background: 'linear-gradient(135deg, #89b4fa 0%, #74c7ec 100%)', boxShadow: '0 2px 8px rgba(137, 180, 250, 0.3)' }}>
        <i className="pi pi-share-alt"></i>
      </div>
      <span className="protocol-dialog-header-title">
        {mode === 'edit' 
          ? (t('sshTunnel.title.edit') || 'Editar Túnel SSH')
          : (t('sshTunnel.title.new') || 'Nuevo Túnel SSH')
        }
      </span>
    </div>
  );

  return (
    <Dialog
      header={headerTemplate}
      visible={visible}
      onHide={onHide}
      style={{ width: '90vw', maxWidth: '900px' }}
      modal
      className="ssh-tunnel-dialog protocol-selection-dialog-new"
      contentStyle={{ padding: '0', overflow: 'auto' }}
    >
      <div style={{ padding: '1.5rem' }}>
        {/* Selector de tipo de túnel */}
        <div className="tunnel-type-selector" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <label 
              className={`tunnel-type-option ${tunnelType === 'local' ? 'selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                border: tunnelType === 'local' ? '2px solid var(--ui-button-primary)' : '2px solid transparent',
                background: tunnelType === 'local' ? 'rgba(137, 180, 250, 0.1)' : 'var(--ui-card-bg)',
                transition: 'all 0.2s'
              }}
            >
              <RadioButton 
                inputId="tunnel-local" 
                value="local" 
                checked={tunnelType === 'local'} 
                onChange={(e) => setTunnelType(e.value)}
              />
              <span style={{ fontWeight: tunnelType === 'local' ? '600' : '400' }}>
                {t('sshTunnel.types.local') || 'Local port forwarding'}
              </span>
            </label>
            
            <label 
              className={`tunnel-type-option ${tunnelType === 'remote' ? 'selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                border: tunnelType === 'remote' ? '2px solid var(--ui-button-primary)' : '2px solid transparent',
                background: tunnelType === 'remote' ? 'rgba(137, 180, 250, 0.1)' : 'var(--ui-card-bg)',
                transition: 'all 0.2s'
              }}
            >
              <RadioButton 
                inputId="tunnel-remote" 
                value="remote" 
                checked={tunnelType === 'remote'} 
                onChange={(e) => setTunnelType(e.value)}
              />
              <span style={{ fontWeight: tunnelType === 'remote' ? '600' : '400' }}>
                {t('sshTunnel.types.remote') || 'Remote port forwarding'}
              </span>
            </label>
            
            <label 
              className={`tunnel-type-option ${tunnelType === 'dynamic' ? 'selected' : ''}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                borderRadius: '8px',
                cursor: 'pointer',
                border: tunnelType === 'dynamic' ? '2px solid var(--ui-button-primary)' : '2px solid transparent',
                background: tunnelType === 'dynamic' ? 'rgba(137, 180, 250, 0.1)' : 'var(--ui-card-bg)',
                transition: 'all 0.2s'
              }}
            >
              <RadioButton 
                inputId="tunnel-dynamic" 
                value="dynamic" 
                checked={tunnelType === 'dynamic'} 
                onChange={(e) => setTunnelType(e.value)}
              />
              <span style={{ fontWeight: tunnelType === 'dynamic' ? '600' : '400' }}>
                {t('sshTunnel.types.dynamic') || 'Dynamic port forwarding (SOCKS proxy)'}
              </span>
            </label>
          </div>
        </div>

        {/* Diagrama visual */}
        <div className="tunnel-diagram-container" style={{ marginBottom: '1.5rem', borderRadius: '8px', overflow: 'hidden' }}>
          <TunnelDiagram tunnelType={tunnelType} config={diagramConfig} />
        </div>

        {/* Formulario */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {/* Columna izquierda: Configuración local */}
          <div className="tunnel-form-section">
            <h4 style={{ marginBottom: '1rem', color: 'var(--ui-dialog-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-home" style={{ color: 'var(--ui-button-primary)' }}></i>
              {tunnelType === 'remote' 
                ? (t('sshTunnel.sections.localServer') || 'Servidor Local')
                : (t('sshTunnel.sections.localConfig') || 'Configuración Local')
              }
            </h4>
            
            {/* Nombre del túnel */}
            <div className="p-field" style={{ marginBottom: '1rem' }}>
              <label htmlFor="tunnelName" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('sshTunnel.fields.name') || 'Nombre'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
              </label>
              <InputText
                id="tunnelName"
                value={tunnelName}
                onChange={(e) => setTunnelName(e.target.value)}
                placeholder={t('sshTunnel.placeholders.name') || 'Mi túnel SSH'}
                style={{ width: '100%' }}
              />
            </div>

            {/* Host local (solo para remote forwarding) */}
            {tunnelType === 'remote' && (
              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label htmlFor="localHost" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.localServer') || 'Servidor local'}
                </label>
                <InputText
                  id="localHost"
                  value={localHost}
                  onChange={(e) => setLocalHost(e.target.value)}
                  placeholder="127.0.0.1"
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* Puerto local */}
            <div className="p-field" style={{ marginBottom: '1rem' }}>
              <label htmlFor="localPort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {tunnelType === 'dynamic' 
                  ? (t('sshTunnel.fields.socksPort') || 'Puerto SOCKS')
                  : (t('sshTunnel.fields.localPort') || 'Puerto local')
                } <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
              </label>
              <InputText
                id="localPort"
                type="number"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
                placeholder={tunnelType === 'dynamic' ? '1080' : '8080'}
                style={{ width: '100%' }}
              />
            </div>

            {/* Host y puerto remoto (solo para local forwarding) */}
            {tunnelType === 'local' && (
              <>
                <div className="p-field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="remoteHost" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {t('sshTunnel.fields.remoteHost') || 'Host remoto'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                  </label>
                  <InputText
                    id="remoteHost"
                    value={remoteHost}
                    onChange={(e) => setRemoteHost(e.target.value)}
                    placeholder="database.internal"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="p-field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="remotePort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {t('sshTunnel.fields.remotePort') || 'Puerto remoto'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                  </label>
                  <InputText
                    id="remotePort"
                    type="number"
                    value={remotePort}
                    onChange={(e) => setRemotePort(e.target.value)}
                    placeholder="3306"
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {/* Puerto reenviado (solo para remote forwarding) */}
            {tunnelType === 'remote' && (
              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label htmlFor="remotePort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.forwardedPort') || 'Puerto reenviado (en servidor SSH)'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                </label>
                <InputText
                  id="remotePort"
                  type="number"
                  value={remotePort}
                  onChange={(e) => setRemotePort(e.target.value)}
                  placeholder="8080"
                  style={{ width: '100%' }}
                />
              </div>
            )}
          </div>

          {/* Columna derecha: Servidor SSH */}
          <div className="tunnel-form-section">
            <h4 style={{ marginBottom: '1rem', color: 'var(--ui-dialog-text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-server" style={{ color: 'var(--ui-button-primary)' }}></i>
              {t('sshTunnel.sections.sshServer') || 'Servidor SSH'}
            </h4>
            
            {/* SSH Host */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', marginBottom: '1rem' }}>
              <div className="p-field">
                <label htmlFor="sshHost" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.sshServer') || 'Servidor SSH'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                </label>
                <InputText
                  id="sshHost"
                  value={sshHost}
                  onChange={(e) => setSshHost(e.target.value)}
                  placeholder="ssh.ejemplo.com"
                  style={{ width: '100%' }}
                />
              </div>
              <div className="p-field">
                <label htmlFor="sshPort" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.sshPort') || 'Puerto'}
                </label>
                <InputText
                  id="sshPort"
                  type="number"
                  value={sshPort}
                  onChange={(e) => setSshPort(e.target.value)}
                  placeholder="22"
                  style={{ width: '80px' }}
                />
              </div>
            </div>

            {/* Usuario SSH */}
            <div className="p-field" style={{ marginBottom: '1rem' }}>
              <label htmlFor="sshUser" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('sshTunnel.fields.sshLogin') || 'Usuario SSH'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
              </label>
              <InputText
                id="sshUser"
                value={sshUser}
                onChange={(e) => setSshUser(e.target.value)}
                placeholder="root"
                style={{ width: '100%' }}
              />
            </div>

            {/* Selector de tipo de autenticación */}
            <div className="p-field" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                {t('sshTunnel.fields.authType') || 'Autenticación'}
              </label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <RadioButton 
                    inputId="auth-password" 
                    value="password" 
                    checked={authType === 'password'} 
                    onChange={(e) => setAuthType(e.value)}
                  />
                  <span>{t('sshTunnel.auth.password') || 'Contraseña'}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <RadioButton 
                    inputId="auth-key" 
                    value="key" 
                    checked={authType === 'key'} 
                    onChange={(e) => setAuthType(e.value)}
                  />
                  <span>{t('sshTunnel.auth.key') || 'Clave privada'}</span>
                </label>
              </div>
            </div>

            {/* Contraseña o clave */}
            {authType === 'password' ? (
              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label htmlFor="sshPassword" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.password') || 'Contraseña'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <InputText
                    id="sshPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={sshPassword}
                    onChange={(e) => setSshPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{ flex: 1 }}
                  />
                  <Button
                    type="button"
                    icon={showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'}
                    className="p-button-outlined"
                    onClick={() => setShowPassword(!showPassword)}
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="p-field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="privateKeyPath" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {t('sshTunnel.fields.privateKey') || 'Ruta clave privada'} <span style={{ color: 'var(--ui-button-danger)' }}>*</span>
                  </label>
                  <InputText
                    id="privateKeyPath"
                    value={privateKeyPath}
                    onChange={(e) => setPrivateKeyPath(e.target.value)}
                    placeholder="C:\Users\...\.ssh\id_rsa"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="p-field" style={{ marginBottom: '1rem' }}>
                  <label htmlFor="passphrase" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                    {t('sshTunnel.fields.passphrase') || 'Passphrase (opcional)'}
                  </label>
                  <InputText
                    id="passphrase"
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="••••••••"
                    style={{ width: '100%' }}
                  />
                </div>
              </>
            )}

            {/* Carpeta destino */}
            {foldersOptions.length > 0 && (
              <div className="p-field" style={{ marginBottom: '1rem' }}>
                <label htmlFor="targetFolder" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                  {t('sshTunnel.fields.folder') || 'Guardar en carpeta'}
                </label>
                <Dropdown
                  id="targetFolder"
                  value={targetFolder}
                  options={foldersOptions}
                  onChange={(e) => setTargetFolder(e.value)}
                  placeholder={t('sshTunnel.placeholders.folder') || 'Raíz del árbol'}
                  style={{ width: '100%' }}
                  showClear
                />
              </div>
            )}
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--ui-content-border)' }}>
          <div>
            {onGoBack && (
              <Button
                label={tCommon('buttons.back') || 'Volver'}
                icon="pi pi-arrow-left"
                className="p-button-text"
                onClick={onGoBack}
              />
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button
              label={tCommon('buttons.cancel') || 'Cancelar'}
              icon="pi pi-times"
              className="p-button-text"
              onClick={onHide}
            />
            <Button
              label={mode === 'edit' 
                ? (tCommon('buttons.save') || 'Guardar')
                : (tCommon('buttons.create') || 'Crear')
              }
              icon={mode === 'edit' ? 'pi pi-check' : 'pi pi-plus'}
              className="p-button-primary"
              onClick={handleConfirm}
              disabled={!isValid() || loading}
              loading={loading}
            />
          </div>
        </div>
      </div>
    </Dialog>
  );
}

export default SSHTunnelDialog;
