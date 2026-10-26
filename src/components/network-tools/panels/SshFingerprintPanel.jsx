import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const SshFingerprintPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('ssh-fingerprint');
  const history = useNetworkToolHistory('ssh-fingerprint');
  const [host, setHost] = useState('');
  const [port, setPort] = useState(22);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const run = async (overrides) => {
    const target = String(overrides?.host ?? host).trim();
    const nextPort = overrides?.port ?? port ?? 22;
    if (overrides?.host != null) setHost(String(overrides.host));
    if (overrides?.port != null) setPort(overrides.port);
    if (!target) {
      setError('Introduce un host.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:ssh-fingerprint', { host: target, port: nextPort });
      if (!response?.success) {
        setError(response?.error || 'No se pudo leer la clave del host');
        return;
      }
      setResult(response);
      history.record({
        target: `${target}:${response.port || nextPort}`,
        params: { host: target, port: nextPort },
        result: response,
        summary: response.fingerprintSha256 || response.keyType || 'SSH'
      });
    } catch (err) {
      setError(err.message || 'Error al leer la huella SSH');
    } finally {
      setLoading(false);
    }
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
          setHost(entry.params.host || '');
          if (entry.params.port) setPort(entry.params.port);
          setError(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => run(entry.params)}
        extraActions={result && (
          <Button icon="pi pi-trash" className="p-button-text p-button-sm p-button-secondary" onClick={() => { setResult(null); setError(null); }} />
        )}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <InputText value={host} onChange={(e) => setHost(e.target.value)} placeholder="host o IP" style={{ width: isMobile ? '100%' : '240px', height: '30px' }} onKeyDown={(e) => e.key === 'Enter' && run()} />
          <InputNumber value={port} onValueChange={(e) => setPort(e.value)} min={1} max={65535} inputStyle={{ width: '80px', height: '30px' }} />
          <Button label={loading ? 'Leyendo...' : 'Leer huella'} icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-key'} onClick={() => run()} disabled={loading} />
        </div>
      </NetworkToolHeader>
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!result && !loading && !error && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            Lee el banner y la huella de la clave del servidor. No inicia sesión ni prueba contraseñas.
          </div>
        )}
        {result && (
          <div style={resultBoxStyle}>
            <div style={statItemStyle}><span>Host</span><strong>{result.host}:{result.port}</strong></div>
            <div style={statItemStyle}><span>Banner</span><strong>{result.banner || '—'}</strong></div>
            <div style={statItemStyle}><span>Tipo de clave</span><strong>{result.keyType}</strong></div>
            <div style={statItemStyle}><span>SHA256</span><strong style={{ wordBreak: 'break-all' }}>{result.fingerprintSha256}</strong></div>
            <div style={statItemStyle}><span>MD5</span><strong>{result.fingerprintMd5}</strong></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SshFingerprintPanel;
