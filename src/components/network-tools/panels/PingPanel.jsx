import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const PingPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('ping');
  const [pingHost, setPingHost] = useState('');
  const [pingCount, setPingCount] = useState(4);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executePing = async () => {
    const trimmed = pingHost.trim();
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

      const response = await ipc.invoke('network-tools:ping', {
        host: trimmed,
        count: pingCount,
        timeout: 5
      });

      if (response && response.success !== undefined) {
        setResult(response);
      } else {
        setError(response?.error || 'Error inesperado al ejecutar ping');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar ping');
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
            value={pingHost}
            onChange={(e) => setPingHost(e.target.value)}
            placeholder="ejemplo.com o 192.168.1.1"
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
            onKeyDown={(e) => e.key === 'Enter' && executePing()}
          />
          <Button
            label={loading ? 'Ejecutando...' : 'Ejecutar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-play'}
            onClick={executePing}
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
            <i className="pi pi-clock" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#22c55e' }} />
            <span>Introduce un host o IP y pulsa "Ejecutar" para medir la latencia y pérdida de paquetes.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <i
                className={`pi ${result.success ? 'pi-check-circle' : 'pi-times-circle'}`}
                style={{ color: result.success ? '#22c55e' : '#ef4444', fontSize: '1.2rem' }}
              />
              <strong style={{ fontSize: '1rem' }}>{result.host}</strong>
              <Badge value={result.success ? 'Activo' : 'Inactivo'} severity={result.success ? 'success' : 'danger'} />
              {result.duration && (
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  ({(result.duration / 1000).toFixed(2)}s)
                </span>
              )}
            </div>

            <div style={statItemStyle}>
              <span>Paquetes enviados:</span>
              <strong>{result.sent || 0}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes recibidos:</span>
              <strong style={{ color: '#22c55e' }}>{result.received || 0}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes perdidos:</span>
              <strong style={{ color: (result.lost || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                {result.lost || 0} ({result.lossPercent || 0}%)
              </strong>
            </div>

            {result.times && result.times.length > 0 && (
              <>
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  Tiempos de respuesta:
                </div>
                <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {result.times.map((time, idx) => (
                    <Badge
                      key={idx}
                      value={`${time.toFixed ? time.toFixed(2) : time}ms`}
                      severity="info"
                    />
                  ))}
                </div>
              </>
            )}

            {result.min !== null && result.min !== undefined && (
              <>
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
                  Estadísticas:
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo mínimo:</span>
                  <strong>{result.min?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo promedio:</span>
                  <strong style={{ color: '#3b82f6', fontSize: '1.05rem' }}>{result.avg?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo máximo:</span>
                  <strong>{result.max?.toFixed(2)} ms</strong>
                </div>
              </>
            )}

            {result.error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}

            {result.rawOutput && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)', fontSize: '0.82rem' }}>
                  Ver salida completa
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
                    maxHeight: '200px'
                  }}
                >
                  {result.rawOutput}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PingPanel;
