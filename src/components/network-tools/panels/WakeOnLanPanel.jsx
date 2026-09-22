/**
 * WakeOnLanPanel.jsx - Envío de Magic Packets y Gestión de Equipos WoL
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle, hexToRgba } from '../toolRegistry';
import localStorageSyncService from '../../../services/LocalStorageSyncService';

const WakeOnLanPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('wake-on-lan');
  const [wolMac, setWolMac] = useState('');
  const [wolBroadcast, setWolBroadcast] = useState('255.255.255.255');
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [saveDeviceName, setSaveDeviceName] = useState('');
  const [saveDeviceIp, setSaveDeviceIp] = useState('');
  const [deviceStatuses, setDeviceStatuses] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const themeColors = useMemo(() => ({
    primaryColor: '#8b5cf6',
    textPrimary: 'var(--text-color, #ffffff)'
  }), []);

  const [wolDevices, setWolDevices] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_wol_devices');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading WoL devices:', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      const serialized = JSON.stringify(wolDevices);
      localStorage.setItem('nodeterm_wol_devices', serialized);
      localStorageSyncService.debouncedSync({ nodeterm_wol_devices: serialized });
    } catch (e) {
      console.error('Error saving WoL devices:', e);
    }
  }, [wolDevices]);

  // Handlers para equipos WoL
  const handleSaveDevice = () => {
    if (!saveDeviceName.trim()) {
      return;
    }
    if (!wolMac.trim()) {
      return;
    }
    
    const cleanMac = wolMac.replace(/[:-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(cleanMac)) {
      setError('Formato de MAC inválido. Use XX:XX:XX:XX:XX:XX');
      setIsSavingDevice(false);
      return;
    }

    const newDevice = {
      name: saveDeviceName.trim(),
      mac: wolMac.trim(),
      broadcast: wolBroadcast.trim() || '255.255.255.255',
      ip: saveDeviceIp.trim(),
      port: 9
    };

    setWolDevices(prev => {
      const filtered = prev.filter(d => d.mac.replace(/[:-]/g, '').toUpperCase() !== cleanMac);
      return [...filtered, newDevice];
    });

    setIsSavingDevice(false);
    setSaveDeviceName('');
    setSaveDeviceIp('');
  };

  // Cargar un dispositivo guardado en los inputs
  const handleLoadDevice = (device) => {
    setWolMac(device.mac);
    setWolBroadcast(device.broadcast || '255.255.255.255');
    setSaveDeviceIp(device.ip || '');
  };

  // Eliminar un dispositivo guardado
  const handleDeleteDevice = (mac) => {
    setWolDevices(prev => prev.filter(d => d.mac !== mac));
    setDeviceStatuses(prev => {
      const next = { ...prev };
      delete next[mac];
      return next;
    });
  };

  // Despertar un dispositivo directamente desde la lista
  const handleQuickWake = async (device) => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Cargar en inputs para que el usuario vea qué se está ejecutando
    setWolMac(device.mac);
    setWolBroadcast(device.broadcast || '255.255.255.255');
    setSaveDeviceIp(device.ip || '');
    
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) {
        throw new Error('IPC no disponible');
      }
      
      const response = await ipc.invoke('network-tools:wake-on-lan', {
        mac: device.mac,
        broadcast: device.broadcast || '255.255.255.255',
        port: device.port || 9
      });
      
      if (response && response.success) {
        setResult(response);
        // Esperar un par de segundos y verificar el estado
        setTimeout(() => {
          checkDeviceStatus(device);
        }, 3000);
      } else {
        setError(response?.error || 'No se pudo enviar el magic packet');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar Wake on LAN');
    } finally {
      setLoading(false);
    }
  };

  // Verificar el estado de un dispositivo individual (ping)
  const checkDeviceStatus = async (device) => {
    setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'checking' }));
    
    let targetIp = device.ip || '';
    const ipc = window?.electron?.ipcRenderer;
    
    if (!targetIp && ipc) {
      try {
        const arpResult = await ipc.invoke('network-tools:resolve-mac-ip', { mac: device.mac });
        if (arpResult && arpResult.success && arpResult.ip) {
          targetIp = arpResult.ip;
        }
      } catch (e) {
        console.warn('Error resolviendo IP por ARP:', e);
      }
    }
    
    if (!targetIp || !ipc) {
      setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'unknown' }));
      return;
    }
    
    try {
      const pingResult = await ipc.invoke('network-tools:ping', {
        host: targetIp,
        count: 1,
        timeout: 1
      });
      
      const isOnline = pingResult && pingResult.success && pingResult.received > 0;
      setDeviceStatuses(prev => ({
        ...prev,
        [device.mac]: isOnline ? 'online' : 'offline'
      }));
    } catch (e) {
      setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'offline' }));
    }
  };

  // Verificar el estado de todos los dispositivos
  const checkAllDevicesStatus = useCallback(() => {
    if (wolDevices.length === 0) return;
    wolDevices.forEach(device => {
      checkDeviceStatus(device);
    });
  }, [wolDevices]);

  // Ejecutar verificación de estado periódica
  useEffect(() => {
    checkAllDevicesStatus();
    
    const interval = setInterval(() => {
      checkAllDevicesStatus();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [checkAllDevicesStatus]);

  // Renderizar la etiqueta de estado online/offline
  const renderStatusBadge = (mac) => {
    const status = deviceStatuses[mac] || 'unknown';
    
    switch (status) {
      case 'online':
        return (
          <span style={{
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span className="wol-status-dot online" />
            Activo
          </span>
        );
      case 'offline':
        return (
          <span style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span className="wol-status-dot offline" />
            Inactivo
          </span>
        );
      case 'checking':
        return (
          <span style={{
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '0.6rem' }} />
            Verificando
          </span>
        );
      case 'unknown':
      default:
        return null;
    }
  };

  // Renderizar la lista de escaneos de red guardados

  const executeWol = async () => {
    const trimmedMac = wolMac.trim();
    if (!trimmedMac) {
      setError('Por favor, introduce una dirección MAC.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:wake-on-lan', {
        mac: trimmedMac,
        broadcast: wolBroadcast.trim() || '255.255.255.255'
      });

      if (response && response.success) {
        setResult(response);
      } else {
        setError(response?.error || 'Error al enviar Magic Packet');
      }
    } catch (err) {
      setError(err.message || 'Error al enviar Magic Packet');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
  };

  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const renderWolDevicesList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
        <style>{`
          .wol-device-card {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            background: rgba(30, 25, 45, 0.18) !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.12)} !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          }
          .wol-device-card:hover {
            transform: translateY(-2px);
            border-color: ${hexToRgba(themeColors.primaryColor, 0.4)} !important;
            box-shadow: 0 8px 24px ${hexToRgba(themeColors.primaryColor, 0.15)} !important;
            background: linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.06)} 0%, rgba(30, 25, 45, 0.02) 100%) !important;
          }
          .wol-action-btn {
            background: ${hexToRgba(themeColors.primaryColor, 0.08)} !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.25)} !important;
            color: ${themeColors.primaryColor} !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .wol-action-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${hexToRgba(themeColors.primaryColor, 0.8)} 100%) !important;
            border-color: transparent !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px ${hexToRgba(themeColors.primaryColor, 0.35)} !important;
          }
          .wol-control-btn {
            color: rgba(255, 255, 255, 0.4) !important;
            transition: all 0.2s ease !important;
            border-radius: 6px !important;
            width: 26px !important;
            height: 26px !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .wol-control-btn:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            color: var(--text-color) !important;
          }
          .wol-control-btn-danger:hover {
            background: rgba(239, 68, 68, 0.12) !important;
            color: #f87171 !important;
          }
          .wol-refresh-btn {
            transition: all 0.2s ease !important;
            color: var(--text-color-secondary) !important;
            border: none !important;
            background: transparent !important;
            width: 22px !important;
            height: 22px !important;
            padding: 0 !important;
          }
          .wol-refresh-btn:hover:not(:disabled) {
            color: ${themeColors.primaryColor} !important;
            background: rgba(255, 255, 255, 0.05) !important;
          }
          @keyframes wol-pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
          @keyframes wol-pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .wol-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }
          .wol-status-dot.online {
            background-color: #22c55e;
            animation: wol-pulse-green 2s infinite;
          }
          .wol-status-dot.offline {
            background-color: #ef4444;
            animation: wol-pulse-red 2s infinite;
          }
        `}</style>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
          <i className="pi pi-server" style={{ color: themeColors.primaryColor, fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color-secondary)' }}>
            Dispositivos guardados
          </span>
          <span style={{ 
            background: hexToRgba(themeColors.primaryColor, 0.08), 
            color: themeColors.primaryColor, 
            border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.2)}`,
            borderRadius: '12px',
            padding: '1px 5px',
            fontSize: '0.65rem',
            fontWeight: '600',
            lineHeight: 1
          }}>
            {wolDevices.length}
          </span>
          <Button 
            icon="pi pi-refresh" 
            onClick={checkAllDevicesStatus} 
            className="wol-refresh-btn" 
            tooltip="Refrescar estados"
            tooltipOptions={{ position: 'right' }}
          />
        </div>

        {wolDevices.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: `1px dashed ${hexToRgba(themeColors.primaryColor, 0.25)}`,
            borderRadius: '8px',
            color: 'var(--text-color-secondary)',
            textAlign: 'center'
          }}>
            <i className="pi pi-info-circle" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: themeColors.primaryColor, opacity: 0.6 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>No hay dispositivos guardados</span>
            <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.6, maxWidth: '280px' }}>
              Introduce una MAC, IP y Broadcast arriba y haz clic en "Guardar" para conservarla.
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            {wolDevices.map((device, idx) => (
              <div 
                key={idx}
                style={{
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
                className="wol-device-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '75%', overflow: 'hidden' }}>
                    <i className="pi pi-desktop" style={{ color: themeColors.primaryColor, fontSize: '0.85rem', opacity: 0.9 }} />
                    <span 
                      style={{ 
                        fontWeight: '600', 
                        fontSize: '0.85rem', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: '#ffffff'
                      }}
                      title={device.name}
                    >
                      {device.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                    <Button 
                      icon="pi pi-pencil" 
                      onClick={() => handleLoadDevice(device)}
                      className="wol-control-btn"
                      tooltip="Cargar"
                      tooltipOptions={{ position: 'top' }}
                    />
                    <Button 
                      icon="pi pi-trash" 
                      onClick={() => handleDeleteDevice(device.mac)}
                      className="wol-control-btn wol-control-btn-danger"
                      tooltip="Eliminar"
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', minHeight: '22px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>Estado:</span>
                  {renderStatusBadge(device.mac) || (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem', fontStyle: 'italic' }}>
                      Sin verificar
                    </span>
                  )}
                </div>

                <div style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--text-color-secondary)', 
                  fontFamily: 'monospace', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem', 
                  borderTop: '1px solid rgba(255,255,255,0.05)', 
                  paddingTop: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>MAC:</span>
                    <span style={{ color: themeColors.textPrimary, fontWeight: '500' }}>{device.mac}</span>
                  </div>
                  {device.ip && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>IP/Host:</span>
                      <span style={{ color: '#ffffff' }}>{device.ip}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Broadcast:</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{device.broadcast || '255.255.255.255'}</span>
                  </div>
                </div>

                <Button 
                  label="Despertar"
                  icon="pi pi-power-off"
                  onClick={() => handleQuickWake(device)}
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    marginTop: '0.4rem',
                    width: '100%',
                    justifyContent: 'center',
                    height: '30px'
                  }}
                  className="wol-action-btn"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Cyberpunk Scan Auto-detect & Scan trigger

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        extraActions={
          result && (
            <Button
              icon="pi pi-trash"
              className="p-button-text p-button-sm p-button-secondary"
              tooltip="Limpiar resultados"
              onClick={clearResults}
              style={{ padding: '0.35rem 0.5rem' }}
            />
          )
        }
      >
        {isSavingDevice ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid rgba(139, 92, 246, 0.35)',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600' }}>Nombre:</span>
            <InputText
              value={saveDeviceName}
              onChange={e => setSaveDeviceName(e.target.value)}
              placeholder="Ej: Servidor NAS"
              style={{ width: '150px', height: '30px', fontSize: '0.8rem' }}
              autoFocus
            />
            <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600' }}>IP (opc):</span>
            <InputText
              value={saveDeviceIp}
              onChange={e => setSaveDeviceIp(e.target.value)}
              placeholder="192.168.1.50"
              style={{ width: '130px', height: '30px', fontSize: '0.8rem' }}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              onClick={handleSaveDevice}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                height: '30px',
                fontSize: '0.75rem'
              }}
            />
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setIsSavingDevice(false)}
              className="p-button-secondary p-button-text"
              style={{ height: '30px', fontSize: '0.75rem' }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid rgba(139, 92, 246, 0.35)',
              width: 'fit-content',
              maxWidth: '100%',
              boxShadow: '0 2px 12px rgba(139, 92, 246, 0.15)',
              flexWrap: isMobile ? 'wrap' : 'nowrap'
            }}
          >
            <span style={{ color: '#8b5cf6', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              MAC:
            </span>
            <InputText
              value={wolMac}
              onChange={(e) => setWolMac(e.target.value)}
              placeholder="AA:BB:CC:DD:EE:FF"
              style={{
                width: isMobile ? '100%' : '180px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                height: '30px'
              }}
              onKeyDown={(e) => e.key === 'Enter' && executeWol()}
            />
            <span style={{ color: '#8b5cf6', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Broadcast:
            </span>
            <InputText
              value={wolBroadcast}
              onChange={(e) => setWolBroadcast(e.target.value)}
              placeholder="255.255.255.255"
              style={{
                width: isMobile ? '100%' : '140px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                height: '30px'
              }}
              onKeyDown={(e) => e.key === 'Enter' && executeWol()}
            />
            <Button
              label={loading ? 'Enviando...' : 'Despertar'}
              icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-power-off'}
              onClick={executeWol}
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                height: '30px',
                fontSize: '0.75rem',
                fontWeight: '600',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
              }}
            />
            <Button
              label="Guardar"
              icon="pi pi-bookmark"
              onClick={() => {
                if (!wolMac.trim()) return;
                setSaveDeviceName('');
                setSaveDeviceIp('');
                setIsSavingDevice(true);
              }}
              disabled={loading || !wolMac.trim()}
              style={{
                background: 'rgba(139, 92, 246, 0.1)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                height: '30px',
                fontSize: '0.75rem',
                color: '#8b5cf6'
              }}
            />
          </div>
        )}
      </NetworkToolHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {result && (
          <div style={{ ...resultBoxStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
              <i className="pi pi-check-circle" style={{ fontSize: '2.5rem', color: '#22c55e', marginBottom: '0.5rem' }} />
              <strong style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: '#22c55e' }}>Magic Packet Enviado</strong>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>MAC: {result.mac}</span>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.78rem' }}>
                Broadcast: {result.broadcast} · Puerto: {result.port || 9}
              </span>
            </div>
          </div>
        )}

        {renderWolDevicesList()}
      </div>
    </div>
  );
};

export default WakeOnLanPanel;
