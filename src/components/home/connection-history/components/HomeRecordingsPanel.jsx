import React, { useCallback, useEffect, useState } from 'react';

const RECENT_LIMIT = 10;

const PROTOCOL_COLOR = {
  ssh: '#4fc3f7',
  rdp: '#f59e0b',
  local: '#27c93f',
  powershell: '#4fc3f7',
  wsl: '#27c93f'
};

function protocolColor(type) {
  const key = String(type || 'ssh').toLowerCase();
  return PROTOCOL_COLOR[key] || '#c084fc';
}

function identity(recording) {
  if (recording.username && recording.host) return `${recording.username}@${recording.host}`;
  return recording.host || '';
}

function titleOf(recording) {
  const who = identity(recording);
  const named = recording.sessionName || recording.title;
  if (named && named !== who) return named;
  return who || named || 'Grabación';
}

function formatRelative(timestamp) {
  const ts = Number(timestamp);
  if (!ts) return '';
  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 45) return 'ahora';
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `hace ${days} d`;
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

function metaOf(recording) {
  const who = identity(recording);
  const named = recording.sessionName || recording.title;
  const parts = [];
  if (who && named && named !== who) parts.push(who);
  const when = formatRelative(recording.createdAt);
  if (when) parts.push(when);
  parts.push(formatDuration(recording.duration));
  parts.push(String(recording.connectionType || 'ssh').toUpperCase());
  return parts.join(' · ');
}

function playRecording(recording) {
  if (!recording?.id) return;
  window.dispatchEvent(new CustomEvent('create-recording-player-tab', {
    detail: { recording }
  }));
}

async function openAllRecordings() {
  try {
    const result = await window.electron?.ipcRenderer?.invoke('recording:list', {});
    if (result?.success && Array.isArray(result.recordings) && result.recordings.length > 0) {
      window.dispatchEvent(new CustomEvent('create-audit-tab', {
        detail: {
          tabId: `audit_global_${Date.now()}`,
          title: 'Auditoría global',
          recordings: result.recordings
        }
      }));
      return;
    }
    window.showToast?.('info', 'Sin grabaciones', 'No hay grabaciones disponibles para mostrar');
  } catch (err) {
    console.warn('[HomeRecordings] Error abriendo auditoría:', err?.message || err);
    window.showToast?.('error', 'Grabaciones', 'No se pudo abrir la auditoría');
  }
}

export const HomeRecordingsPanel = () => {
  const [recordings, setRecordings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const loadRecordings = useCallback(async () => {
    try {
      setLoading(true);
      setFailed(false);
      const result = await window.electron?.ipcRenderer?.invoke('recording:list', {});
      const list = result?.success && Array.isArray(result.recordings) ? result.recordings : [];
      if (result && result.success === false) setFailed(true);
      setTotal(list.length);
      setRecordings(list.slice(0, RECENT_LIMIT));
    } catch (err) {
      console.warn('[HomeRecordings] Error listando grabaciones:', err?.message || err);
      setFailed(true);
      setRecordings([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  useEffect(() => {
    const onRefresh = () => { loadRecordings(); };
    window.addEventListener('refresh-audit-tab', onRefresh);
    return () => window.removeEventListener('refresh-audit-tab', onRefresh);
  }, [loadRecordings]);

  const countLabel = total > recordings.length
    ? `${recordings.length} de ${total}`
    : `${total} ${total === 1 ? 'grabación' : 'grabaciones'}`;

  return (
    <div className="home-recordings">
      <div className="home-recordings-toolbar">
        <span className="home-recordings-count">{loading && total === 0 ? 'Cargando…' : countLabel}</span>
        <button
          type="button"
          className="home-recordings-tool"
          onClick={loadRecordings}
          title="Actualizar"
          disabled={loading}
        >
          <i className={`pi pi-refresh${loading ? ' pi-spin' : ''}`} />
        </button>
        <button
          type="button"
          className="home-recordings-tool is-primary"
          onClick={openAllRecordings}
          title="Abrir auditoría completa"
          disabled={!loading && total === 0}
        >
          Todas
        </button>
      </div>

      {failed && !recordings.length ? (
        <div className="home-widget-empty">
          No se pudieron cargar las grabaciones.
          <div>
            <button type="button" onClick={loadRecordings}>Reintentar</button>
          </div>
        </div>
      ) : !loading && !recordings.length ? (
        <div className="home-widget-empty">
          Aún no hay grabaciones.
          <div className="home-recordings-hint">Las sesiones grabadas aparecerán aquí.</div>
        </div>
      ) : (
        <div className="home-widget-list-scroll">
          {recordings.map((recording) => {
            const color = protocolColor(recording.connectionType);
            const title = titleOf(recording);
            return (
              <div
                key={recording.id}
                className="home-widget-row home-recordings-row"
                style={{ '--tile-color': color }}
              >
                <button
                  type="button"
                  className="home-widget-row-main"
                  onClick={() => playRecording(recording)}
                  title={`Reproducir ${title}`}
                >
                  <div className="home-fav-name">{title}</div>
                  <div className="home-widget-meta">{metaOf(recording)}</div>
                </button>
                <button
                  type="button"
                  className="home-recordings-play"
                  onClick={() => playRecording(recording)}
                  title="Reproducir"
                >
                  <i className="pi pi-play" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default HomeRecordingsPanel;
