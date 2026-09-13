import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle } from '../toolRegistry';

const DEFAULT_PORTS = '21,22,23,25,53,80,110,143,443,993,995,3306,3389,5432,8080';

const PortScannerPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('port-scan');
  const [portScanHost, setPortScanHost] = useState('');
  const [portScanPorts, setPortScanPorts] = useState(DEFAULT_PORTS);
  const [showPortConfig, setShowPortConfig] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executePortScan = async () => {
    const trimmed = portScanHost.trim();
    if (!trimmed) {
      setError('Por favor, introduce un host o dirección IP.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC de Electron no disponible');

      const response = await ipc.invoke('network-tools:port-scan', {
        host: trimmed,
        ports: portScanPorts.trim() || DEFAULT_PORTS,
        timeout: 2000
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibió respuesta del escaneo de puertos.');
      }
    } catch (err) {
      setError(err.message || 'Error al escanear puertos');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
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
              className={`p-button-text p-button-sm ${showPortConfig ? 'p-button-warning' : 'p-button-secondary'}`}
              tooltip="Configurar puertos"
              onClick={() => setShowPortConfig(!showPortConfig)}
              style={{ padding: '0.35rem 0.5rem' }}
            />
            {result && (
              <Button
                icon="pi pi-trash"
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Limpiar resultados"
                onClick={clearResults}
                style={{ padding: '0.35rem 0.5rem' }}
              />
            )}
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(245, 158, 11, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(245, 158, 11, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#f59e0b', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Host:
          </span>
          <InputText
            value={portScanHost}
            onChange={(e) => setPortScanHost(e.target.value)}
            placeholder="ejemplo.com o 192.168.1.1"
            style={{
              width: isMobile ? '100%' : '260px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executePortScan()}
          />
          <Button
            label={loading ? 'Escaneando...' : 'Escanear'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
            onClick={executePortScan}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
            }}
          />
        </div>

        {showPortConfig && (
          <div
            style={{
              width: '100%',
              marginTop: '0.5rem',
              padding: '0.6rem 0.8rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <span style={{ fontSize: '0.75rem', color: 'var(--text-color-secondary)', whiteSpace: 'nowrap' }}>
              Puertos a escanear:
            </span>
            <InputText
              value={portScanPorts}
              onChange={(e) => setPortScanPorts(e.target.value)}
              placeholder="Ej: 22,80,443,8080 o 1-1024"
              style={{
                flex: 1,
                fontSize: '0.75rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '4px',
                color: 'var(--text-color)',
                padding: '0.25rem 0.5rem',
                height: '26px'
              }}
            />
            <Button
              label="Restablecer"
              className="p-button-text p-button-sm p-button-secondary"
              onClick={() => setPortScanPorts(DEFAULT_PORTS)}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.4rem' }}
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

        {!result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-th-large" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#f59e0b' }} />
            <span>Introduce un host o IP para escanear sus puertos TCP abiertos y servicios.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <strong>Escaneo de {result.host}</strong>
              <Badge value={`${result.openPorts?.length || 0} abiertos`} severity="success" />
              {result.scanTime !== undefined && (
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  ({result.scanTime}ms)
                </span>
              )}
            </div>

            {result.openPorts && result.openPorts.length > 0 ? (
              <DataTable value={result.openPorts} size="small" stripedRows scrollable scrollHeight="400px">
                <Column field="port" header="Puerto" style={{ width: '120px' }} />
                <Column field="service" header="Servicio" />
              </DataTable>
            ) : (
              <Message severity="info" text="No se encontraron puertos abiertos en el rango seleccionado" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PortScannerPanel;
