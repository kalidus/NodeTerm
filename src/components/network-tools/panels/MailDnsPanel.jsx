import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

function Block({ title, lines, error, empty }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <strong>{title}</strong>
      {error && <div style={{ color: '#f59e0b', marginTop: '0.25rem' }}>{error}</div>}
      {!error && lines?.length > 0 && lines.map((line) => (
        <div key={line} style={{ marginTop: '0.25rem', wordBreak: 'break-all' }}>{line}</div>
      ))}
      {!error && (!lines || lines.length === 0) && (
        <div style={{ marginTop: '0.25rem', color: 'var(--text-color-secondary)' }}>{empty}</div>
      )}
    </div>
  );
}

const MailDnsPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('mail-dns');
  const history = useNetworkToolHistory('mail-dns');
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const resultBoxStyle = getResultBoxStyle(isMobile);

  const run = async (overrides) => {
    const value = String(overrides?.domain ?? domain).trim();
    const dkim = String(overrides?.selector ?? selector).trim();
    if (overrides?.domain != null) setDomain(String(overrides.domain));
    if (overrides?.selector != null) setSelector(String(overrides.selector));
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
      const response = await ipc.invoke('network-tools:mail-dns', { domain: value, selector: dkim || undefined });
      if (!response?.success) {
        setError(response?.error || 'No se pudo consultar el correo del dominio');
        return;
      }
      setResult(response);
      history.record({
        target: value,
        params: { domain: value, selector: dkim },
        result: response,
        summary: [
          response.mx?.length ? `${response.mx.length} MX` : 'sin MX',
          response.spf?.length ? 'SPF' : 'sin SPF',
          response.dmarc?.length ? 'DMARC' : 'sin DMARC'
        ].join(' · ')
      });
    } catch (err) {
      setError(err.message || 'Error al consultar el correo del dominio');
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
          setSelector(entry.params.selector || '');
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
          <InputText value={selector} onChange={(e) => setSelector(e.target.value)} placeholder="selector DKIM (opcional)" style={{ width: isMobile ? '100%' : '180px', height: '30px' }} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <Button label={loading ? 'Consultando...' : 'Consultar'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-envelope'} onClick={() => run()} disabled={loading} />
        </div>
      </NetworkToolHeader>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            Muestra MX, SPF, DMARC y, si indicas el selector, el TXT de DKIM.
          </div>
        )}
        {result && (
          <div style={resultBoxStyle}>
            <Block
              title="MX"
              error={result.mxError}
              lines={(result.mx || []).map(r => `${r.priority ?? ''} ${r.value}`.trim())}
              empty="Sin registros MX"
            />
            <Block title="SPF" error={result.txtError} lines={result.spf} empty="Sin registro SPF" />
            <Block title="DMARC" error={result.dmarcError} lines={result.dmarc} empty="Sin registro DMARC" />
            {result.dkimSelector && (
              <Block title={`DKIM (${result.dkimSelector})`} error={result.dkimError} lines={result.dkim} empty="Sin TXT para ese selector" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MailDnsPanel;
