import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const ReverseDnsPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('reverse-dns');
  const [reverseDnsIp, setReverseDnsIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeReverseDns = async () => {
    const trimmed = reverseDnsIp.trim();
    if (!trimmed) {
      setError('Por favor, introduce una dirección IP.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:reverse-dns', {
        ip: trimmed
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos del DNS inverso');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar reverse DNS');
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(59, 130, 246, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            IP:
          </span>
          <InputText
            value={reverseDnsIp}
            onChange={(e) => setReverseDnsIp(e.target.value)}
            placeholder="8.8.8.8 o 1.1.1.1"
            style={{
              width: isMobile ? '100%' : '260px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeReverseDns()}
          />
          <Button
            label={loading ? 'Consultando...' : 'Buscar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
            onClick={executeReverseDns}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
            }}
          />
        </div>
      </NetworkToolHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-replay" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#3b82f6' }} />
            <span>Introduce una dirección IP para consultar su puntero inverso (PTR) y nombres de host asociados.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={statItemStyle}>
              <span>IP consultada:</span>
              <strong>{result.ip}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Hostnames PTR:</span>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                {result.hostnames && result.hostnames.length > 0
                  ? result.hostnames.map((h, i) => (
                      <div key={i} style={{ color: '#3b82f6' }}>
                        <strong>{h}</strong>
                      </div>
                    ))
                  : <span style={{ color: 'var(--text-color-secondary)' }}>No encontrado</span>}
              </div>
            </div>
            {result.queryTime !== undefined && (
              <div style={statItemStyle}>
                <span>Tiempo de consulta:</span>
                <strong>{result.queryTime}ms</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReverseDnsPanel;
