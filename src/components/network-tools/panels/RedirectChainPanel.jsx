import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const RedirectChainPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('redirect-chain');
  const history = useNetworkToolHistory('redirect-chain');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const run = async (overrides) => {
    const value = String(overrides?.url ?? url).trim();
    if (overrides?.url != null) setUrl(String(overrides.url));
    if (!value) {
      setError('Introduce una URL.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:redirect-chain', { url: value });
      setResult(response);
      if (!response?.success && !response?.hops?.length) {
        setError(response?.error || 'No se pudo seguir la cadena');
      }
      history.record({
        target: value,
        params: { url: value },
        result: response,
        summary: response?.hops ? `${response.hops.length} saltos` : 'Error'
      });
    } catch (err) {
      setError(err.message || 'Error al seguir redirecciones');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        history={history}
        onViewHistory={(entry) => {
          setUrl(entry.params.url || entry.target);
          setError(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => run(entry.params)}
        extraActions={result && (
          <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-secondary" onClick={() => { setResult(null); setError(null); }} />
        )}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <InputText value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ejemplo.com" style={{ width: isMobile ? '100%' : '320px', height: '30px' }} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <Button label={loading ? 'Siguiendo...' : 'Seguir'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-directions'} onClick={() => run()} disabled={loading} />
        </div>
      </NetworkToolHeader>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            Muestra cada salto HTTP, con código, destino y tiempo, hasta 10 redirecciones.
          </div>
        )}
        {result?.hops?.length > 0 && (
          <div style={resultBoxStyle}>
            {result.hops.map((hop, index) => (
              <div key={`${hop.url}-${index}`} style={{ ...statItemStyle, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <strong>{index + 1}. {hop.statusCode || '—'}</strong>
                  <div style={{ wordBreak: 'break-all' }}>{hop.url}</div>
                  {hop.location && <div style={{ color: '#3b82f6', wordBreak: 'break-all' }}>{hop.location}</div>}
                  {hop.error && <div style={{ color: '#ef4444' }}>{hop.error}</div>}
                </div>
                <span>{hop.elapsed != null ? `${hop.elapsed} ms` : ''}</span>
              </div>
            ))}
            {result.finalUrl && (
              <div style={{ marginTop: '0.6rem' }}>Destino final: <strong>{result.finalUrl}</strong></div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RedirectChainPanel;
