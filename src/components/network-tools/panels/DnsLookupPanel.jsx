import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Message } from 'primereact/message';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle, DNS_RECORD_TYPES } from '../toolRegistry';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

const MODE_BUTTON = (active) => ({
  border: 'none',
  borderRadius: '6px',
  padding: '0.35rem 0.7rem',
  height: '30px',
  fontSize: '0.75rem',
  fontWeight: '600',
  cursor: 'pointer',
  background: active ? 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' : 'rgba(255,255,255,0.08)',
  color: active ? '#fff' : 'var(--text-color)'
});

const DnsLookupPanel = ({ isMobile = false, initialMode = 'forward' }) => {
  const forwardTool = findToolMetadata('dns-lookup');
  const reverseTool = findToolMetadata('reverse-dns');
  const forwardHistory = useNetworkToolHistory('dns-lookup');
  const reverseHistory = useNetworkToolHistory('reverse-dns');
  const [mode, setMode] = useState(initialMode === 'reverse' ? 'reverse' : 'forward');
  const [domain, setDomain] = useState('');
  const [recordType, setRecordType] = useState('A');
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const tool = mode === 'reverse' ? reverseTool : forwardTool;
  const history = mode === 'reverse' ? reverseHistory : forwardHistory;
  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const switchMode = (next) => {
    setMode(next);
    setResult(null);
    setError(null);
  };

  const executeForward = async (overrides) => {
    const trimmed = String(overrides?.domain ?? domain).trim();
    const type = overrides?.type ?? recordType;
    if (overrides?.domain != null) setDomain(String(overrides.domain));
    if (overrides?.type != null) setRecordType(overrides.type);
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
      const response = await ipc.invoke('network-tools:dns-lookup', { domain: trimmed, type });
      if (!response) {
        setError('No se recibieron datos de resolución DNS');
        return;
      }
      setResult({ mode: 'forward', data: response });
      const count = response.records?.length || 0;
      forwardHistory.record({
        target: `${trimmed} ${type}`,
        params: { domain: trimmed, type, mode: 'forward' },
        result: response,
        summary: count ? `${type} · ${count} registros` : type
      });
    } catch (err) {
      setError(err.message || 'Error al resolver DNS');
    } finally {
      setLoading(false);
    }
  };

  const executeReverse = async (overrides) => {
    const trimmed = String(overrides?.ip ?? ip).trim();
    if (overrides?.ip != null) setIp(String(overrides.ip));
    if (!trimmed) {
      setError('Por favor, introduce una dirección IP.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:reverse-dns', { ip: trimmed });
      if (!response) {
        setError('No se recibieron datos del DNS inverso');
        return;
      }
      setResult({ mode: 'reverse', data: response });
      reverseHistory.record({
        target: trimmed,
        params: { ip: trimmed, mode: 'reverse' },
        result: response,
        summary: response.hostname || response.hostnames?.[0] || 'OK'
      });
    } catch (err) {
      setError(err.message || 'Error al ejecutar reverse DNS');
    } finally {
      setLoading(false);
    }
  };

  const run = () => (mode === 'reverse' ? executeReverse() : executeForward());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        history={history}
        onViewHistory={(entry) => {
          const entryMode = entry.params?.mode || (entry.params?.ip ? 'reverse' : 'forward');
          setMode(entryMode);
          setError(null);
          if (entryMode === 'reverse') {
            setIp(entry.params.ip || entry.target);
            setResult({ mode: 'reverse', data: entry.result || null });
          } else {
            setDomain(entry.params.domain || entry.target);
            if (entry.params.type) setRecordType(entry.params.type);
            setResult({ mode: 'forward', data: entry.result || null });
          }
        }}
        onRerunHistory={(entry) => {
          if (entry.params?.ip || entry.params?.mode === 'reverse') {
            setMode('reverse');
            executeReverse(entry.params);
          } else {
            setMode('forward');
            executeForward(entry.params);
          }
        }}
        extraActions={
          result && (
            <Button
              icon="pi pi-trash"
              className="p-button-text p-button-sm p-button-secondary"
              tooltip="Limpiar resultados"
              onClick={() => { setResult(null); setError(null); }}
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
            flexWrap: 'wrap'
          }}
        >
          <button type="button" style={MODE_BUTTON(mode === 'forward')} onClick={() => switchMode('forward')}>Directo</button>
          <button type="button" style={MODE_BUTTON(mode === 'reverse')} onClick={() => switchMode('reverse')}>Inverso</button>
          {mode === 'forward' ? (
            <>
              <InputText
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ejemplo.com"
                style={{ width: isMobile ? '100%' : '220px', height: '30px', fontSize: '0.8rem' }}
                onKeyDown={(e) => e.key === 'Enter' && run()}
              />
              <Dropdown
                value={recordType}
                options={DNS_RECORD_TYPES}
                onChange={(e) => setRecordType(e.value)}
                style={{ width: '110px', height: '30px', fontSize: '0.75rem' }}
              />
            </>
          ) : (
            <InputText
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              placeholder="8.8.8.8"
              style={{ width: isMobile ? '100%' : '220px', height: '30px', fontSize: '0.8rem' }}
              onKeyDown={(e) => e.key === 'Enter' && run()}
            />
          )}
          <Button
            label={loading ? 'Buscando...' : 'Buscar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'}
            onClick={run}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '6px',
              height: '30px',
              fontSize: '0.75rem'
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
            <i className={mode === 'reverse' ? 'pi pi-replay' : 'pi pi-search-plus'} style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#3b82f6' }} />
            <span>
              {mode === 'reverse'
                ? 'Introduce una IP para consultar su puntero inverso (PTR).'
                : 'Introduce un dominio y el tipo de registro.'}
            </span>
          </div>
        )}
        {result?.mode === 'forward' && result.data && (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>DNS: {result.data.domain}</strong>
              <span style={{ marginLeft: '1rem', color: 'var(--text-color-secondary)' }}>Tipo: {result.data.type}</span>
            </div>
            {result.data.records && result.data.records.length > 0 ? (
              <DataTable value={result.data.records} size="small" stripedRows scrollable scrollHeight="400px">
                <Column field="type" header="Tipo" style={{ width: '90px' }} />
                <Column field="value" header="Valor" />
                <Column field="priority" header="Prioridad" style={{ width: '100px' }} body={(row) => row.priority !== undefined ? row.priority : '-'} />
              </DataTable>
            ) : (
              <Message severity="warn" text={result.data.error || 'No se encontraron registros para la consulta'} />
            )}
          </div>
        )}
        {result?.mode === 'reverse' && result.data && (
          <div style={resultBoxStyle}>
            <div style={statItemStyle}>
              <span>IP consultada:</span>
              <strong>{result.data.ip}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Hostnames PTR:</span>
              <div style={{ textAlign: isMobile ? 'left' : 'right' }}>
                {result.data.hostnames && result.data.hostnames.length > 0
                  ? result.data.hostnames.map((h) => <div key={h} style={{ color: '#3b82f6' }}><strong>{h}</strong></div>)
                  : <span style={{ color: 'var(--text-color-secondary)' }}>{result.data.error || 'No encontrado'}</span>}
              </div>
            </div>
            {result.data.queryTime !== undefined && (
              <div style={statItemStyle}>
                <span>Tiempo de consulta:</span>
                <strong>{result.data.queryTime}ms</strong>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DnsLookupPanel;
