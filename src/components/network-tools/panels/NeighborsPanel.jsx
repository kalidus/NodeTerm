import React, { useCallback, useEffect, useState } from 'react';
import { Button } from 'primereact/button';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata } from '../toolRegistry';

const NeighborsPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('neighbors');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const response = await ipc.invoke('network-tools:neighbors');
      if (!response?.success) {
        setError(response?.error || 'No se pudo leer la tabla de vecinos');
        setRows([]);
        return;
      }
      setRows(response.neighbors || []);
    } catch (err) {
      setError(err.message || 'Error al leer vecinos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        extraActions={(
          <Button icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-refresh'} className="p-button-text p-button-sm" onClick={load} disabled={loading} tooltip="Actualizar" />
        )}
      />
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {error && <div style={{ marginBottom: '1rem', color: '#ef4444' }}>{error}</div>}
        {!error && rows.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            La tabla ARP de este equipo está vacía.
          </div>
        )}
        {rows.length > 0 && (
          <DataTable value={rows} size="small" stripedRows scrollable>
            <Column field="ip" header="IP" />
            <Column field="mac" header="MAC" />
          </DataTable>
        )}
      </div>
    </div>
  );
};

export default NeighborsPanel;
