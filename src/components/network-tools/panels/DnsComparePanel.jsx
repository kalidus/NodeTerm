import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, DNS_RECORD_TYPES } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const COMPARE_TYPES = DNS_RECORD_TYPES.filter(item => item.value !== 'ALL' && item.value !== 'SOA');

const DnsComparePanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('dns-compare');
  const history = useNetworkToolHistory('dns-compare');
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultBoxStyle = getResultBoxStyle(isMobile);

  const run = async (overrides) => {
    const value = String(overrides?.domain ?? domain).trim();
    const type = overrides?.type ?? recordType;
    if (overrides?.domain != null) setDomain(String(overrides.domain));
    if (overrides?.type != null) setRecordType(overrides.type);
    if (!value) {
      setError('Introduce un dominio.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:dns-compare', { domain: value, type });
      if (!response?.success) {
        setError(response?.error || 'No se pudo comparar el DNS');
        return;
      }
      setResult(response);
      const agreed = new Set((response.resolvers || []).map(r => (r.records || []).map(rec => rec.value).sort().join(',')));
      history.record({
        target: `${value} ${type}`,
        params: { domain: value, type },
        result: response,
        summary: agreed.size <= 1 ? 'Coinciden' : `${agreed.size} respuestas distintas`
      });
    } catch (err) {
      setError(err.message || 'Error al comparar DNS');
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
          setDomain(entry.params.domain || '');
          if (entry.params.type) setRecordType(entry.params.type);
          setError(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => run(entry.params)}
        extraActions={result && (
          <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-secondary" onClick={() => setResult(null)} />
        )}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <InputText value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="ejemplo.com" style={{ width: isMobile ? '100%' : '220px', height: '30px' }} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <Dropdown value={recordType} options={COMPARE_TYPES} onChange={(e) => setRecordType(e.value)} style={{ width: '140px', height: '30px' }} />
          <Button label={loading ? 'Comparando...' : 'Comparar'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-clone'} onClick={() => run()} disabled={loading} />
        </div>
      </NetworkToolHeader>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            Compara la misma consulta en el resolver de este equipo, Cloudflare, Google y Quad9.
          </div>
        )}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {(result.resolvers || []).map((resolver) => (
              <div key={resolver.id} style={resultBoxStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <strong>{resolver.label}</strong>
                  <span style={{ color: 'var(--text-color-secondary)' }}>{resolver.queryTime} ms</span>
                </div>
                {resolver.records?.length ? resolver.records.map((rec, index) => (
                  <div key={`${resolver.id}-${index}`}>{rec.priority != null ? `${rec.priority} ` : ''}{rec.value}</div>
                )) : (
                  <div style={{ color: '#f59e0b' }}>{resolver.error || 'Sin registros'}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DnsComparePanel;
