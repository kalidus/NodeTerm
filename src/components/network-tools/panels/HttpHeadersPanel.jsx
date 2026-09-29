import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const HttpHeadersPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('http-headers');
  const history = useNetworkToolHistory('http-headers');
  const [httpHeadersUrl, setHttpHeadersUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeHttpHeaders = async (overrides) => {
    let url = String(overrides?.url ?? httpHeadersUrl).trim();
    if (!url) {
      setError('Por favor, introduce una URL.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setHttpHeadersUrl(url);

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:http-headers', {
        url
      });

      if (!response) {
        setError('No se recibieron cabeceras HTTP de la URL.');
        return;
      }

      const failedWithoutStatus = response.success === false && !response.statusCode;
      if (failedWithoutStatus) {
        setError(response.error || 'No se pudieron obtener las cabeceras HTTP.');
        setResult(null);
        history.record({
          target: url,
          params: { url },
          result: response,
          summary: 'Error'
        });
        return;
      }

      setResult(response);
      history.record({
        target: url,
        params: { url },
        result: response,
        summary: response.statusCode ? `HTTP ${response.statusCode}` : 'Headers'
      });
    } catch (err) {
      setError(err.message || 'Error al analizar cabeceras HTTP');
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
        history={history}
        onViewHistory={(entry) => {
          setHttpHeadersUrl(entry.params.url || entry.target);
          setError(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => executeHttpHeaders(entry.params)}
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
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(239, 68, 68, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            URL:
          </span>
          <InputText
            value={httpHeadersUrl}
            onChange={(e) => setHttpHeadersUrl(e.target.value)}
            placeholder="https://ejemplo.com"
            style={{
              width: isMobile ? '100%' : '280px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeHttpHeaders()}
          />
          <Button
            label={loading ? 'Analizando...' : 'Analizar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-file'}
            onClick={executeHttpHeaders}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
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
            <i className="pi pi-file" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#ef4444' }} />
            <span>Introduce una URL HTTP/HTTPS para inspeccionar sus cabeceras de respuesta y evaluar las directivas de seguridad.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong>
                {result.statusCode != null ? `HTTP ${result.statusCode}` : 'HTTP'}
              </strong>
              {result.statusCode != null && (
                <Badge
                  value={result.statusMessage || (result.statusCode < 400 ? 'OK' : 'Error')}
                  severity={result.statusCode < 400 ? 'success' : 'danger'}
                />
              )}
              {result.method && (
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  {result.method}
                </span>
              )}
              {result.timing?.responseTime != null && (
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  ({result.timing.responseTime}ms)
                </span>
              )}
            </div>

            {result.finalUrl && result.finalUrl !== result.url && (
              <div style={{ ...statItemStyle, fontSize: '0.78rem' }}>
                <span>URL final:</span>
                <span style={{ wordBreak: 'break-all' }}>{result.finalUrl}</span>
              </div>
            )}

            {result.error && (
              <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}

            <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
              Cabeceras de Seguridad:
            </div>
            {Object.keys(result.securityHeaders || {}).length === 0 ? (
              <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                No hay cabeceras de seguridad para mostrar.
              </div>
            ) : (
              Object.entries(result.securityHeaders).map(([key, value]) => (
                <div key={key} style={{ ...statItemStyle, alignItems: isMobile ? 'flex-start' : 'flex-start' }}>
                  <span style={{ minWidth: isMobile ? 'auto' : '220px' }}>{key}:</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: 0 }}>
                    <Badge
                      value={value ? 'Presente' : 'Ausente'}
                      severity={value ? 'success' : 'warning'}
                    />
                    {value && (
                      <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                        {String(value)}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}

            <div style={{ marginTop: '1.25rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.85rem' }}>
              Todas las cabeceras HTTP:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {Object.keys(result.headers || {}).length === 0 ? (
                <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  No se recibieron cabeceras HTTP.
                </div>
              ) : (
                Object.entries(result.headers).map(([key, value]) => (
                  <div key={key} style={{ ...statItemStyle, fontSize: '0.78rem' }}>
                    <span style={{ color: '#3b82f6', fontWeight: '500' }}>{key}:</span>
                    <span style={{ maxWidth: isMobile ? '100%' : '500px', overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-all' }}>
                      {String(value)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HttpHeadersPanel;
