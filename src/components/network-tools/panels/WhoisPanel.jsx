import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const WhoisPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('whois');
  const [whoisDomain, setWhoisDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeWhois = async () => {
    const trimmed = whoisDomain.trim();
    if (!trimmed) {
      setError('Por favor, introduce un dominio o dirección IP.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:whois', {
        domain: trimmed
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos de WHOIS');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar WHOIS');
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
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(139, 92, 246, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(139, 92, 246, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#8b5cf6', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Dominio / IP:
          </span>
          <InputText
            value={whoisDomain}
            onChange={(e) => setWhoisDomain(e.target.value)}
            placeholder="ejemplo.com o 8.8.8.8"
            style={{
              width: isMobile ? '100%' : '260px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeWhois()}
          />
          <Button
            label={loading ? 'Consultando...' : 'Buscar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
            onClick={executeWhois}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)'
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
            <i className="pi pi-id-card" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#8b5cf6' }} />
            <span>Introduce un dominio o IP para consultar los datos de registro, expiración y servidores de nombres en WHOIS.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>WHOIS: {result.domain}</strong>
            </div>

            {result.parsed && Object.keys(result.parsed).length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {result.parsed.registrar && (
                  <div style={statItemStyle}>
                    <span>Registrar:</span>
                    <strong>{result.parsed.registrar}</strong>
                  </div>
                )}
                {result.parsed.creationDate && (
                  <div style={statItemStyle}>
                    <span>Fecha de creación:</span>
                    <strong>{result.parsed.creationDate}</strong>
                  </div>
                )}
                {result.parsed.expirationDate && (
                  <div style={statItemStyle}>
                    <span>Fecha de expiración:</span>
                    <strong>{result.parsed.expirationDate}</strong>
                  </div>
                )}
                {result.parsed.nameServers && result.parsed.nameServers.length > 0 && (
                  <div style={statItemStyle}>
                    <span>Name Servers:</span>
                    <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                      {result.parsed.nameServers.map((ns, i) => (
                        <div key={i}><strong>{ns}</strong></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {result.rawData && (
              <details open={!result.parsed || Object.keys(result.parsed).length === 0}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                  Ver datos completos (Raw WHOIS)
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
                    maxHeight: '400px'
                  }}
                >
                  {result.rawData}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhoisPanel;
