import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, DNS_RECORD_TYPES } from '../toolRegistry';

const DnsLookupPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('dns-lookup');
  const [dnsLookupDomain, setDnsLookupDomain] = useState('');
  const [dnsLookupType, setDnsLookupType] = useState('A');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeDnsLookup = async () => {
    const trimmed = dnsLookupDomain.trim();
    if (!trimmed) {
      setError('Por favor, introduce un nombre de dominio.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:dns-lookup', {
        domain: trimmed,
        type: dnsLookupType
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos de resolución DNS');
      }
    } catch (err) {
      setError(err.message || 'Error al resolver DNS');
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
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(59, 130, 246, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(59, 130, 246, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#3b82f6', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Dominio:
          </span>
          <InputText
            value={dnsLookupDomain}
            onChange={(e) => setDnsLookupDomain(e.target.value)}
            placeholder="ejemplo.com"
            style={{
              width: isMobile ? '100%' : '240px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeDnsLookup()}
          />
          <Dropdown
            value={dnsLookupType}
            options={DNS_RECORD_TYPES}
            onChange={(e) => setDnsLookupType(e.value)}
            style={{
              width: '110px',
              height: '30px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '6px',
              fontSize: '0.75rem'
            }}
          />
          <Button
            label={loading ? 'Buscando...' : 'Buscar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
            onClick={executeDnsLookup}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
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
            <i className="pi pi-search-plus" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#3b82f6' }} />
            <span>Introduce un dominio y selecciona el tipo de registro para consultar sus registros DNS.</span>
          </div>
        )}

        {result && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>DNS: {result.domain}</strong>
              <span style={{ marginLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                Tipo: {result.type}
              </span>
            </div>
            {result.records && result.records.length > 0 ? (
              <DataTable value={result.records} size="small" stripedRows scrollable scrollHeight="400px">
                <Column field="type" header="Tipo" style={{ width: '90px' }} />
                <Column field="value" header="Valor" />
                <Column field="priority" header="Prioridad" style={{ width: '100px' }} body={(row) => row.priority !== undefined ? row.priority : '-'} />
              </DataTable>
            ) : (
              <Message severity="warn" text="No se encontraron registros para la consulta" />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DnsLookupPanel;
