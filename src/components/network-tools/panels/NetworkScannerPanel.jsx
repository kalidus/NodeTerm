import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import NetworkToolHeader from '../common/NetworkToolHeader';
import CyberTopologyMap from './CyberTopologyMap';
import { findToolMetadata, getResultBoxStyle } from '../toolRegistry';
import localStorageSyncService from '../../../services/LocalStorageSyncService';

const NetworkScannerPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('network-scan');
  const [networkScanSubnet, setNetworkScanSubnet] = useState('');
  const [cyberpunkMode, setCyberpunkMode] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [liveOutput, setLiveOutput] = useState('');

  // Configuración de escaneo
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [scanPingTimeout, setScanPingTimeout] = useState(1000);
  const [scanConcurrency, setScanConcurrency] = useState(50);
  const [scanPortsToScan, setScanPortsToScan] = useState('22,80,135,139,443,445,3389,548,5357');
  const [scanNmapEnabled, setScanNmapEnabled] = useState(true);
  const [scanNetbiosEnabled, setScanNetbiosEnabled] = useState(true);

  // Escaneos guardados
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [saveScanName, setSaveScanName] = useState('');
  const [savedScans, setSavedScans] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_saved_network_scans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading saved network scans:', e);
      return [];
    }
  });
  const [viewingSavedScan, setViewingSavedScan] = useState(null);

  // Sincronización y persistencia de escaneos
  useEffect(() => {
    try {
      const serialized = JSON.stringify(savedScans);
      localStorage.setItem('nodeterm_saved_network_scans', serialized);
      localStorageSyncService.debouncedSync({ nodeterm_saved_network_scans: serialized });
    } catch (e) {
      console.error('Error saving network scans:', e);
    }
  }, [savedScans]);

  // Cargar interfaces al inicio si la subred está vacía
  useEffect(() => {
    const loadDefaultSubnet = async () => {
      try {
        const ipc = window?.electron?.ipcRenderer;
        if (!ipc) return;
        const ifaces = await ipc.invoke('network-tools:get-interfaces');
        if (ifaces && ifaces.length > 0) {
          const active = ifaces.find(i => !i.internal && i.family === 'IPv4' && i.address && i.netmask);
          if (active && active.address) {
            const parts = active.address.split('.');
            if (parts.length === 4) {
              setNetworkScanSubnet(`${parts[0]}.${parts[1]}.${parts[2]}.0/24`);
            }
          }
        }
      } catch (err) {
        console.warn('Error detecting default subnet:', err);
      }
    };
    if (!networkScanSubnet) {
      loadDefaultSubnet();
    }
  }, []);

  // Escuchar progreso en vivo desde el backend
  useEffect(() => {
    const ipc = window?.electron?.ipcRenderer;
    if (!ipc) return;

    const handleProgress = (event, data) => {
      if (data?.tool === 'network-scan' && data.output) {
        setLiveOutput(prev => prev + data.output);
      }
    };

    ipc.on('network-tools:progress', handleProgress);
    return () => {
      ipc.off('network-tools:progress', handleProgress);
    };
  }, []);

  const executeNetworkScan = async (mode = 'quick') => {
    const subnet = networkScanSubnet.trim();
    if (!subnet) {
      setError('Por favor, introduce una subred (ej: 192.168.1.0/24).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setLiveOutput('');
    setViewingSavedScan(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:network-scan', {
        subnet,
        mode,
        timeout: mode === 'quick' ? 400 : scanPingTimeout,
        pingTimeout: mode === 'quick' ? undefined : scanPingTimeout,
        concurrency: mode === 'quick' ? undefined : scanConcurrency,
        portsToScan: mode === 'quick' ? undefined : scanPortsToScan,
        nmapEnabled: mode === 'quick' ? undefined : scanNmapEnabled,
        netbiosEnabled: mode === 'quick' ? undefined : scanNetbiosEnabled
      });

      if (response && response.hosts) {
        setResult(response);
      } else {
        setError(response?.error || 'No se recibieron datos del escaneo');
      }
    } catch (err) {
      setError(err.message || 'Error al escanear la red');
    } finally {
      setLoading(false);
    }
  };

  const autoDetectAndScan = async () => {
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) return;
      const ifaces = await ipc.invoke('network-tools:get-interfaces');
      if (ifaces && ifaces.length > 0) {
        const active = ifaces.find(i => !i.internal && i.family === 'IPv4' && i.address);
        if (active) {
          const parts = active.address.split('.');
          const detectedSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
          setNetworkScanSubnet(detectedSubnet);
          setCyberpunkMode(true);
          executeNetworkScan('quick');
        }
      }
    } catch (err) {
      console.error(err);
      executeNetworkScan('quick');
    }
  };

  const handleSaveScan = () => {
    if (!saveScanName.trim() || !result) return;
    const newScan = {
      id: Date.now().toString(),
      name: saveScanName.trim(),
      subnet: networkScanSubnet.trim(),
      lastResult: result,
      createdAt: new Date().toISOString()
    };
    setSavedScans(prev => [newScan, ...prev]);
    setIsSavingScan(false);
    setSaveScanName('');
  };

  const handleDeleteSavedScan = (id) => {
    setSavedScans(prev => prev.filter(s => s.id !== id));
    if (viewingSavedScan?.id === id) {
      setViewingSavedScan(null);
      setResult(null);
    }
  };

  const handleLoadScan = (scan) => {
    setViewingSavedScan(scan);
    setNetworkScanSubnet(scan.subnet);
    setResult(scan.lastResult);
  };

  const resultBoxStyle = getResultBoxStyle(isMobile);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        extraActions={
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Button
              icon="pi pi-cog"
              className={`p-button-text p-button-sm ${showScanConfig ? 'p-button-warning' : 'p-button-secondary'}`}
              tooltip="Opciones avanzadas"
              onClick={() => setShowScanConfig(!showScanConfig)}
              style={{ padding: '0.35rem 0.5rem' }}
            />
          </div>
        }
      >
        {isSavingScan ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              border: '1.5px solid rgba(245, 158, 11, 0.35)'
            }}
          >
            <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Nombre:</span>
            <InputText
              value={saveScanName}
              onChange={(e) => setSaveScanName(e.target.value)}
              placeholder="Ej: Red Oficina"
              style={{
                width: '180px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                height: '30px'
              }}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleSaveScan()}
            />
            <Button
              label="Guardar"
              icon="pi pi-check"
              onClick={handleSaveScan}
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.75rem',
                height: '30px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            />
            <Button
              label="Cancelar"
              icon="pi pi-times"
              onClick={() => setIsSavingScan(false)}
              className="p-button-secondary p-button-text"
              style={{ height: '30px', fontSize: '0.75rem' }}
            />
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
              padding: '0.45rem 0.65rem',
              borderRadius: '8px',
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              flexWrap: 'wrap'
            }}
          >
            <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
              Subred:
            </span>
            <InputText
              value={networkScanSubnet}
              onChange={(e) => setNetworkScanSubnet(e.target.value)}
              placeholder="192.168.1.0/24"
              style={{
                width: isMobile ? '100%' : '170px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '6px',
                color: 'var(--text-color)',
                padding: '0.35rem 0.5rem',
                fontSize: '0.8rem',
                height: '30px'
              }}
              onKeyDown={(e) => e.key === 'Enter' && executeNetworkScan('quick')}
            />

            <Button
              label="Rápido"
              icon="pi pi-bolt"
              onClick={() => executeNetworkScan('quick')}
              disabled={loading}
              title="Descubre hosts activos (ARP + DNS). Rápido."
              style={{
                background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                height: '30px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            />

            <Button
              label="Completo"
              icon="pi pi-search"
              onClick={() => executeNetworkScan('full')}
              disabled={loading}
              title="Incluye escaneo exhaustivo, NetBIOS, SO y sondeo de puertos."
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                height: '30px',
                fontSize: '0.75rem',
                fontWeight: '600'
              }}
            />

            <Button
              label="Cyber ⚡"
              icon="pi pi-bolt"
              onClick={autoDetectAndScan}
              disabled={loading}
              title="Auto-detecta subred y escanea con HUD Cyberpunk."
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #ff007f 100%)',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.65rem',
                height: '30px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: '#fff'
              }}
            />

            <Button
              label={cyberpunkMode ? 'Cyber: ON 🕶️' : 'Cyber: OFF 🕶️'}
              icon={cyberpunkMode ? 'pi pi-eye' : 'pi pi-eye-slash'}
              onClick={() => setCyberpunkMode(!cyberpunkMode)}
              style={{
                background: cyberpunkMode ? 'linear-gradient(135deg, rgba(255,0,127,0.2) 0%, rgba(124,0,255,0.2) 100%)' : 'rgba(255,255,255,0.06)',
                border: cyberpunkMode ? '1px solid #ff007f' : '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                padding: '0.35rem 0.6rem',
                height: '30px',
                fontSize: '0.75rem',
                color: cyberpunkMode ? '#ff007f' : 'var(--text-color-secondary)'
              }}
            />

            {result && (
              <Button
                label="Guardar"
                icon="pi pi-bookmark"
                onClick={() => {
                  setSaveScanName('');
                  setIsSavingScan(true);
                }}
                disabled={loading}
                style={{
                  background: 'rgba(245,158,11,0.1)',
                  border: '1px solid rgba(245,158,11,0.3)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.65rem',
                  height: '30px',
                  fontSize: '0.75rem',
                  color: '#f59e0b'
                }}
              />
            )}

            {result && (
              <Button
                label="Ver Guardados"
                icon="pi pi-list"
                onClick={() => {
                  setResult(null);
                  setViewingSavedScan(null);
                }}
                className="p-button-text p-button-sm p-button-secondary"
                style={{ height: '30px', fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
              />
            )}
          </div>
        )}

        {showScanConfig && (
          <div
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.25)',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              fontSize: '0.75rem'
            }}
          >
            <div>
              <span style={{ display: 'block', color: 'var(--text-color-secondary)', marginBottom: '3px' }}>Puertos adicionales:</span>
              <InputText
                value={scanPortsToScan}
                onChange={e => setScanPortsToScan(e.target.value)}
                style={{ width: '220px', height: '26px', fontSize: '0.75rem' }}
              />
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-color-secondary)', marginBottom: '3px' }}>Concurrencia:</span>
              <InputText
                type="number"
                value={scanConcurrency}
                onChange={e => setScanConcurrency(Number(e.target.value))}
                style={{ width: '80px', height: '26px', fontSize: '0.75rem' }}
              />
            </div>
          </div>
        )}
      </NetworkToolHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: cyberpunkMode && (result || loading) ? '0' : '1rem', background: 'rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ margin: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Modo Cyberpunk */}
        {cyberpunkMode && (result || loading) ? (
          <CyberTopologyMap
            result={result}
            liveOutput={liveOutput}
            isScanning={loading}
            networkScanSubnet={networkScanSubnet}
            isMobile={isMobile}
            viewingSavedScan={viewingSavedScan}
          />
        ) : result ? (
          /* Modo Clásico */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            {viewingSavedScan && (
              <div
                style={{
                  background: 'rgba(33, 150, 243, 0.1)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem',
                  color: '#64b5f6'
                }}
              >
                <span>
                  <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }} />
                  Resultados guardados: <strong>{viewingSavedScan.name}</strong> ({new Date(viewingSavedScan.lastResult.timestamp).toLocaleString()})
                </span>
                <Button
                  icon="pi pi-times"
                  onClick={() => {
                    setViewingSavedScan(null);
                    setResult(null);
                  }}
                  className="p-button-text p-button-sm p-button-secondary"
                  style={{ width: '24px', height: '24px', padding: 0 }}
                />
              </div>
            )}

            <div style={resultBoxStyle}>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <strong>Red: {result.subnet}</strong>
                <Badge
                  value={result.scanMode === 'quick' ? 'Escaneo rápido' : 'Escaneo completo'}
                  severity={result.scanMode === 'quick' ? 'info' : 'warning'}
                />
                <Badge value={`${result.hosts?.length || 0} hosts encontrados`} severity="success" />
                {result.scanTime !== undefined && (
                  <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                    ({(result.scanTime / 1000).toFixed(1)}s)
                  </span>
                )}
              </div>

              {result.hosts && result.hosts.length > 0 ? (
                <DataTable value={result.hosts} size="small" stripedRows scrollable scrollHeight="450px">
                  <Column field="ip" header="IP" style={{ width: '130px' }} />
                  <Column field="hostname" header="Hostname" body={(row) => row.hostname || row.netbiosName || '-'} />
                  <Column field="mac" header="MAC" body={(row) => row.mac || '-'} style={{ width: '140px' }} />
                  <Column field="vendor" header="Fabricante" body={(row) => row.vendor || '-'} style={{ width: '130px' }} />
                  <Column field="os" header="Sistema" body={(row) => row.os || '-'} style={{ width: '120px' }} />
                  <Column field="responseTime" header="Respuesta" body={(row) => `${row.responseTime}ms`} style={{ width: '90px' }} />
                </DataTable>
              ) : (
                <Message severity="info" text="No se encontraron hosts activos en la subred." />
              )}
            </div>
          </div>
        ) : !loading ? (
          /* Lista de escaneos guardados o estado vacío */
          <div>
            {savedScans && savedScans.length > 0 ? (
              <div>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-color-secondary)' }}>
                  <i className="pi pi-history" style={{ marginRight: '0.5rem' }} /> Escaneos de Red Guardados
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
                  {savedScans.map(scan => (
                    <div
                      key={scan.id}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ fontSize: '0.9rem' }}>{scan.name}</strong>
                        <Button
                          icon="pi pi-trash"
                          className="p-button-text p-button-danger p-button-sm"
                          onClick={() => handleDeleteSavedScan(scan.id)}
                          style={{ padding: '0.2rem', width: '24px', height: '24px' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>
                        <div>Subred: <code>{scan.subnet}</code></div>
                        <div>Hosts: {scan.lastResult?.hosts?.length || 0} detectados</div>
                        <div>Fecha: {new Date(scan.createdAt).toLocaleDateString()}</div>
                      </div>
                      <Button
                        label="Ver Resultados"
                        icon="pi pi-external-link"
                        onClick={() => handleLoadScan(scan)}
                        className="p-button-sm p-button-outlined"
                        style={{ marginTop: '0.25rem', fontSize: '0.75rem', padding: '0.3rem 0.5rem' }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
                <i className="pi pi-globe" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#f59e0b' }} />
                <span>Introduce una subred CIDR o pulsa "Cyber ⚡" para detectar automáticamente los equipos de tu red local.</span>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default NetworkScannerPanel;
