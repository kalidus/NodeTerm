import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const SubnetCalculatorPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('subnet-calc');
  const [subnetCalcCidr, setSubnetCalcCidr] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeSubnetCalc = async () => {
    const trimmed = subnetCalcCidr.trim();
    if (!trimmed) {
      setError('Por favor, introduce una dirección IP con máscara CIDR (ej: 192.168.1.0/24).');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:subnet-calc', {
        cidr: trimmed
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se pudieron calcular los parámetros de la subred');
      }
    } catch (err) {
      setError(err.message || 'Error al calcular subred');
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
            CIDR:
          </span>
          <InputText
            value={subnetCalcCidr}
            onChange={(e) => setSubnetCalcCidr(e.target.value)}
            placeholder="192.168.1.0/24 o 10.0.0.0/16"
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
            onKeyDown={(e) => e.key === 'Enter' && executeSubnetCalc()}
          />
          <Button
            label={loading ? 'Calculando...' : 'Calcular'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-calculator'}
            onClick={executeSubnetCalc}
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
            <i className="pi pi-calculator" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#8b5cf6' }} />
            <span>Introduce una notación CIDR (ej: 192.168.1.0/24) para calcular red, broadcast, máscara, rango utilizable y binario.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1rem' }}>Subred: {result.input}</strong>
              {result.ipClass && <Badge value={`Clase ${result.ipClass}`} severity="info" />}
              {result.isPrivate && <Badge value="Red Privada" severity="success" />}
            </div>

            <div style={statItemStyle}>
              <span>Dirección de red:</span>
              <strong style={{ color: '#8b5cf6' }}>{result.networkAddress}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Dirección de broadcast:</span>
              <strong>{result.broadcastAddress}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Máscara de subred:</span>
              <strong>{result.subnetMask}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Máscara Wildcard:</span>
              <strong>{result.wildcardMask}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Primer host utilizable:</span>
              <strong style={{ color: '#22c55e' }}>{result.firstHost}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Último host utilizable:</span>
              <strong style={{ color: '#22c55e' }}>{result.lastHost}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Total de direcciones IP:</span>
              <strong>{result.totalHosts?.toLocaleString()}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Hosts útiles asignables:</span>
              <strong style={{ color: '#22c55e', fontSize: '1.05rem' }}>{result.usableHosts?.toLocaleString()}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Prefijo CIDR:</span>
              <strong>/{result.prefix}</strong>
            </div>
            {result.binaryMask && (
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-color-secondary)' }}>
                <span>Representación binaria de la máscara:</span>
                <div style={{ fontFamily: 'monospace', marginTop: '0.25rem', padding: '0.35rem 0.5rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                  {result.binaryMask}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SubnetCalculatorPanel;
