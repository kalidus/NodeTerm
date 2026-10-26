import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const WhoisIpPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('whois-ip');
  const history = useNetworkToolHistory('whois-ip');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const run = async (overrides) => {
    const value = String(overrides?.ip ?? ip).trim();
    if (overrides?.ip != null) setIp(String(overrides.ip));
    if (!value) {
      setError('Introduce una dirección IP.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:whois-ip', { ip: value });
      if (!response?.success) {
        setError(response?.error || 'No hubo respuesta RDAP');
        return;
      }
      setResult(response);
      history.record({
        target: value,
        params: { ip: value },
        result: response,
        summary: response.name || response.handle || 'RDAP'
      });
    } catch (err) {
      setError(err.message || 'Error en WHOIS de IP');
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
          setIp(entry.params.ip || entry.target);
          setError(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => run(entry.params)}
        extraActions={result && (
          <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-secondary" onClick={() => setResult(null)} />
        )}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <InputText value={ip} onChange={(e) => setIp(e.target.value)} placeholder="8.8.8.8" style={{ width: isMobile ? '100%' : '240px', height: '30px' }} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <Button label={loading ? 'Consultando...' : 'Consultar'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'} onClick={() => run()} disabled={loading} />
        </div>
      </NetworkToolHeader>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            Consulta RDAP de una IP: rango anunciado, país y organización.
          </div>
        )}
        {result && (
          <div style={resultBoxStyle}>
            <div style={statItemStyle}><span>IP</span><strong>{result.ip}</strong></div>
            <div style={statItemStyle}><span>Nombre</span><strong>{result.name || '—'}</strong></div>
            <div style={statItemStyle}><span>Handle</span><strong>{result.handle || '—'}</strong></div>
            <div style={statItemStyle}><span>País</span><strong>{result.country || '—'}</strong></div>
            <div style={statItemStyle}><span>Tipo</span><strong>{result.type || '—'}</strong></div>
            <div style={statItemStyle}><span>Rango</span><strong>{result.startAddress && result.endAddress ? `${result.startAddress} – ${result.endAddress}` : '—'}</strong></div>
            <div style={statItemStyle}><span>CIDR</span><strong>{result.cidrs?.length ? result.cidrs.join(', ') : '—'}</strong></div>
            <div style={statItemStyle}><span>Organización</span><strong>{result.organizations?.length ? result.organizations.join(', ') : '—'}</strong></div>
            <div style={statItemStyle}><span>WHOIS</span><strong>{result.port43 || '—'}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhoisIpPanel;
