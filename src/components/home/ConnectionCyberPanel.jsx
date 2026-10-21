import React, { useEffect, useMemo, useRef, useState } from 'react';
import { writeTextWithAutoClear } from '../../utils/clipboard';
import '../../styles/components/vault-cyber-terminal.css';
import '../../styles/components/connection-cyber-panel.css';

const COPY_CLEAR_SECONDS = 30;

const TYPE_LABEL = {
  ssh: 'ssh',
  rdp: 'rdp',
  'rdp-guacamole': 'rdp',
  vnc: 'vnc',
  'vnc-guacamole': 'vnc',
  sftp: 'sftp',
  ftp: 'ftp',
  scp: 'scp',
  'ssh-tunnel': 'tunnel'
};

function displayHost(data = {}) {
  if (data.useBastionWallix) {
    return data.bastionHost || data.host || data.hostname || data.server || '';
  }
  return data.host || data.hostname || data.server || data.sshHost || data.targetServer || '';
}

function displayUser(data = {}) {
  return data.user || data.username || data.bastionUser || data.sshUser || '';
}

function displayPort(data = {}, type = '') {
  if (data.port != null && data.port !== '') return String(data.port);
  if (data.sshPort != null && data.sshPort !== '') return String(data.sshPort);
  if (type === 'rdp' || type === 'rdp-guacamole') return '3389';
  if (type === 'vnc' || type === 'vnc-guacamole') return '5900';
  if (type === 'ftp') return '21';
  if (type === 'sftp' || type === 'scp' || type === 'ssh' || type === 'ssh-tunnel') return '22';
  return '';
}

export default function ConnectionCyberPanel({
  node,
  onConnect,
  onConnectInTab,
  onInfo
}) {
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef(null);

  const data = node?.data || {};
  const type = String(data.type || '').toLowerCase();
  const password = typeof data.password === 'string' ? data.password : '';

  useEffect(() => {
    setRevealed(false);
    setStatus('');
  }, [node?.key]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape' || !revealed) return;
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.p-dialog, .p-confirmdialog, [role="dialog"]')) {
        return;
      }
      setRevealed(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const fields = useMemo(() => {
    const host = displayHost(data) || '—';
    const user = displayUser(data) || '—';
    const port = displayPort(data, type) || '—';
    const rows = [
      ['tipo', TYPE_LABEL[type] || type || '—'],
      ['host', host],
      ['usuario', user],
      ['puerto', port]
    ];
    if (data.domain) rows.push(['dominio', data.domain]);
    if (data.useBastionWallix) {
      rows.push(['bastion', data.bastionHost || '—']);
      rows.push(['target', data.targetServer || '—']);
    }
    if (data.description) rows.push(['nota', data.description]);
    return rows;
  }, [data, type]);

  const showStatus = (message) => {
    setStatus(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(''), 4000);
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      const ok = await writeTextWithAutoClear(password, COPY_CLEAR_SECONDS);
      showStatus(ok
        ? `copiado · el portapapeles se limpia en ${COPY_CLEAR_SECONDS}s`
        : 'no se pudo copiar');
    } catch {
      console.warn('[connection-cyber] copy failed');
      showStatus('no se pudo copiar');
    }
  };

  if (!node) return null;

  return (
    <div className="vault-cyber connection-cyber" role="region" aria-label="Detalle de conexión">
      <div className="vault-cyber-vignette" aria-hidden="true" />
      <div className="vault-cyber-scanlines" aria-hidden="true" />
      <div className="vault-cyber-beam" aria-hidden="true" />

      <header className="vault-cyber-header">
        <div className="vault-cyber-title">{node.label || 'conexión'}</div>
        <span className="connection-cyber-type-pill">{TYPE_LABEL[type] || type || 'conn'}</span>
      </header>

      <div className="vault-cyber-fields">
        {fields.map(([label, value]) => (
          <div className="vault-cyber-field" key={label}>
            <span className="vault-cyber-field-label">{label}</span>
            <span className="vault-cyber-meta">{value}</span>
          </div>
        ))}
        <div className="vault-cyber-field">
          <span className="vault-cyber-field-label">password</span>
          {password ? (
            <button
              type="button"
              className={`vault-cyber-secret${revealed ? ' is-revealed' : ''}`}
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? 'Ocultar password' : 'Mostrar password'}
            >
              {revealed ? password : '••••••••'}
            </button>
          ) : (
            <span className="vault-cyber-secret is-empty">(vacío / clave)</span>
          )}
        </div>
        {password ? (
          <button type="button" className="vault-cyber-copy" onClick={copyPassword}>
            copiar
          </button>
        ) : null}

        <div className="connection-cyber-actions">
          <button
            type="button"
            className="connection-cyber-btn is-connect"
            onClick={() => onConnect?.(node)}
          >
            conectar
          </button>
          <button
            type="button"
            className="connection-cyber-btn"
            onClick={() => onConnectInTab?.(node)}
          >
            en pestaña
          </button>
          <button
            type="button"
            className="connection-cyber-btn"
            onClick={() => onInfo?.(node)}
          >
            info
          </button>
        </div>
      </div>

      <footer className="vault-cyber-footer">
        <span>doble clic en sidebar conecta · esc oculta password</span>
        <span className="vault-cyber-status" aria-live="polite">{status}</span>
      </footer>
    </div>
  );
}
