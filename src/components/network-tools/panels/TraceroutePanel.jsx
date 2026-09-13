import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle } from '../toolRegistry';

const TraceroutePanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('traceroute');
  const [tracerouteHost, setTracerouteHost] = useState('');
  const [tracerouteMaxHops] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeTraceroute = async () => {
    const trimmed = tracerouteHost.trim();
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

      const response = await ipc.invoke('network-tools:traceroute', {
        host: trimmed,
        maxHops: tracerouteMaxHops
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibió respuesta del trazado de ruta.');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar traceroute');
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
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(34, 197, 94, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(34, 197, 94, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#22c55e', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Host:
          </span>
          <InputText
            value={tracerouteHost}
            onChange={(e) => setTracerouteHost(e.target.value)}
            placeholder="ejemplo.com o 8.8.8.8"
            style={{
              width: isMobile ? '100%' : '260px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeTraceroute()}
          />
          <Button
            label={loading ? 'Trazando...' : 'Ejecutar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            onClick={executeTraceroute}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
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
            <i className="pi pi-sitemap" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#22c55e' }} />
            <span>Introduce un host o IP para trazar los saltos intermedios de red.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1rem' }}>Traceroute a {result.host}</strong>
              <Badge value={`${result.hops?.length || 0} saltos`} severity={result.success ? 'info' : 'warning'} />
              {!result.success && result.error && <Badge value="Error" severity="danger" />}
            </div>

            {result.hops && result.hops.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable
                  value={result.hops}
                  size="small"
                  stripedRows
                  style={{ fontSize: '0.8rem', minWidth: '400px' }}
                  emptyMessage="Sin datos"
                  scrollable
                  scrollHeight="400px"
                >
                  <Column field="hop" header="#" style={{ width: '50px', textAlign: 'center' }} />
                  <Column
                    field="host"
                    header="Host / IP"
                    body={(row) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span>{row.host || '*'}</span>
                        {row.ip && row.ip !== row.host && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>{row.ip}</span>
                        )}
                      </div>
                    )}
                    style={{ minWidth: '200px' }}
                  />
                  <Column
                    field="times"
                    header="Tiempos"
                    body={(row) => {
                      if (row.timeout) return <span style={{ color: '#ef4444' }}>* * *</span>;
                      if (row.times && row.times.length > 0) {
                        return (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {row.times.map((t, i) => (
                              <Badge key={i} value={`${t.toFixed ? t.toFixed(2) : t}ms`} severity="info" />
                            ))}
                          </div>
                        );
                      }
                      return <span>*</span>;
                    }}
                    style={{ minWidth: '150px' }}
                  />
                  <Column
                    field="avgTime"
                    header="Promedio"
                    body={(row) =>
                      row.avgTime ? (
                        <strong style={{ color: '#3b82f6' }}>{row.avgTime.toFixed(2)} ms</strong>
                      ) : (
                        <span style={{ color: '#ef4444' }}>*</span>
                      )
                    }
                    style={{ width: '100px', textAlign: 'right' }}
                  />
                </DataTable>
              </div>
            ) : (
              <div>
                <Message severity="warn" text={result.error || 'No se pudieron obtener saltos'} style={{ marginBottom: '1rem' }} />
                {result.rawOutput && result.rawOutput.trim().length > 0 && (
                  <details style={{ marginTop: '1rem' }} open={!result.success}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {result.success ? 'Ver salida completa' : 'Ver salida del comando (útil para depuración)'}
                    </summary>
                    <pre
                      style={{
                        marginTop: '0.5rem',
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.72rem',
                        color: 'var(--text-color-secondary)',
                        background: 'rgba(0,0,0,0.25)',
                        padding: '0.5rem',
                        borderRadius: '4px',
                        overflow: 'auto',
                        maxHeight: '350px',
                        fontFamily: 'monospace'
                      }}
                    >
                      {result.rawOutput}
                    </pre>
                  </details>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TraceroutePanel;
