import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collectVaultEntries } from '../../utils/homeWidgets';
import { writeTextWithAutoClear } from '../../utils/clipboard';
import '../../styles/components/vault-cyber-terminal.css';

const TYPE_LABEL = {
  password: 'pwd',
  secret: 'pwd',
  api_key: 'api',
  crypto_wallet: 'wallet',
  secure_note: 'note'
};

const COPY_CLEAR_SECONDS = 30;

function entryHaystack(entry) {
  return [entry.folder, entry.name, entry.username, entry.url]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('es');
}

export default function VaultCyberTerminal({
  passwordNodes = [],
  vaultLocked = false,
  selectedKey = null,
  onOpenDetail
}) {
  const [query, setQuery] = useState('');
  const [revealedKey, setRevealedKey] = useState(null);
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef(null);

  const entries = useMemo(
    () => (vaultLocked ? [] : collectVaultEntries(passwordNodes)),
    [passwordNodes, vaultLocked]
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('es');
    if (!needle) return entries;
    return entries.filter((entry) => entryHaystack(entry).includes(needle));
  }, [entries, query]);

  useEffect(() => {
    if (!revealedKey) return undefined;
    if (!filtered.some((entry) => entry.key === revealedKey)) {
      setRevealedKey(null);
    }
    return undefined;
  }, [filtered, revealedKey]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Escape' || !revealedKey) return;
      const target = event.target;
      if (target && typeof target.closest === 'function' && target.closest('.p-dialog, .p-confirmdialog, [role="dialog"]')) {
        return;
      }
      setRevealedKey(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealedKey]);

  useEffect(() => () => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
  }, []);

  const showStatus = (message) => {
    setStatus(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(''), 4000);
  };

  const toggleReveal = (key) => {
    setRevealedKey((current) => (current === key ? null : key));
  };

  const copySecret = async (entry) => {
    if (!entry.secret) return;
    try {
      const ok = await writeTextWithAutoClear(entry.secret, COPY_CLEAR_SECONDS);
      showStatus(ok
        ? `copiado · el portapapeles se limpia en ${COPY_CLEAR_SECONDS}s`
        : 'no se pudo copiar');
    } catch {
      console.warn('[vault-cyber] copy failed');
      showStatus('no se pudo copiar');
    }
  };

  const openDetail = (entry) => {
    onOpenDetail?.(entry);
  };

  const countLabel = vaultLocked
    ? 'bloqueado'
    : `${filtered.length}${query.trim() ? ` / ${entries.length}` : ''} secretos`;

  return (
    <div className="vault-cyber" role="region" aria-label="Terminal del vault">
      <div className="vault-cyber-vignette" aria-hidden="true" />
      <div className="vault-cyber-scanlines" aria-hidden="true" />
      <div className="vault-cyber-beam" aria-hidden="true" />

      <header className="vault-cyber-header">
        <div className="vault-cyber-title">root@nodeterm:~/vault</div>
        <div className="vault-cyber-count">{countLabel}</div>
      </header>

      {vaultLocked ? (
        <p className="vault-cyber-lock">vault bloqueado — desbloquea la master key</p>
      ) : (
        <>
          <label className="vault-cyber-prompt-line">
            <span className="vault-cyber-prompt">vault@nodeterm:~$</span>
            <input
              className="vault-cyber-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="filtrar nombre, usuario, url o carpeta"
              spellCheck={false}
              autoComplete="off"
              aria-label="Filtrar secretos"
            />
            <span className="vault-cyber-cursor" aria-hidden="true" />
          </label>

          <div className="vault-cyber-list">
            {filtered.length === 0 && (
              <p className="vault-cyber-empty">
                {entries.length === 0 ? 'el vault no tiene secretos' : 'sin coincidencias'}
              </p>
            )}
            {filtered.map((entry, index) => {
              const revealed = revealedKey === entry.key;
              const meta = entry.username || entry.url || '—';
              const pathLabel = entry.folder ? `${entry.folder}/` : '';
              return (
                <div className={`vault-cyber-row${selectedKey === entry.key ? ' is-selected' : ''}`} key={entry.key}>
                  <span className="vault-cyber-idx">{String(index + 1).padStart(3, '0')}</span>
                  <button
                    type="button"
                    className="vault-cyber-name"
                    onClick={() => openDetail(entry)}
                  >
                    {pathLabel && <span className="vault-cyber-folder">{pathLabel}</span>}
                    {entry.name}
                  </button>
                  <span className="vault-cyber-meta">{meta}</span>
                  <span className={`vault-cyber-type vault-cyber-type-${entry.type}`}>
                    {TYPE_LABEL[entry.type] || entry.type}
                  </span>
                  {entry.secret ? (
                    <button
                      type="button"
                      className={`vault-cyber-secret${revealed ? ' is-revealed' : ''}`}
                      onClick={() => toggleReveal(entry.key)}
                      aria-label={revealed ? 'Ocultar secreto' : 'Mostrar secreto'}
                    >
                      {revealed ? entry.secret : '••••••••'}
                    </button>
                  ) : (
                    <span className="vault-cyber-secret is-empty">(vacío)</span>
                  )}
                  {entry.secret ? (
                    <button
                      type="button"
                      className="vault-cyber-copy"
                      onClick={() => copySecret(entry)}
                    >
                      copiar
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <footer className="vault-cyber-footer">
        <span>máscara revela · esc oculta · nombre abre el detalle</span>
        <span className="vault-cyber-status" aria-live="polite">{status}</span>
      </footer>
    </div>
  );
}

export function VaultCyberDetail({ entry }) {
  const [revealed, setRevealed] = useState(false);
  const [status, setStatus] = useState('');
  const statusTimerRef = useRef(null);

  useEffect(() => {
    setRevealed(false);
    setStatus('');
  }, [entry?.key]);

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

  if (!entry) return null;

  const showStatus = (message) => {
    setStatus(message);
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    statusTimerRef.current = setTimeout(() => setStatus(''), 4000);
  };

  const copySecret = async () => {
    if (!entry.secret) return;
    try {
      const ok = await writeTextWithAutoClear(entry.secret, COPY_CLEAR_SECONDS);
      showStatus(ok
        ? `copiado · el portapapeles se limpia en ${COPY_CLEAR_SECONDS}s`
        : 'no se pudo copiar');
    } catch {
      console.warn('[vault-cyber] copy failed');
      showStatus('no se pudo copiar');
    }
  };

  const fields = [
    ['carpeta', entry.folder || '—'],
    ['usuario', entry.username || '—'],
    ['url', entry.url || '—'],
    ['tipo', TYPE_LABEL[entry.type] || entry.type || '—']
  ];

  return (
    <div className="vault-cyber" role="region" aria-label="Detalle del secreto">
      <div className="vault-cyber-vignette" aria-hidden="true" />
      <div className="vault-cyber-scanlines" aria-hidden="true" />
      <header className="vault-cyber-header">
        <div className="vault-cyber-title">{entry.name || 'secreto'}</div>
        <div className="vault-cyber-count">detalle</div>
      </header>
      <div className="vault-cyber-fields">
        {fields.map(([label, value]) => (
          <div className="vault-cyber-field" key={label}>
            <span className="vault-cyber-field-label">{label}</span>
            <span className="vault-cyber-meta">{value}</span>
          </div>
        ))}
        <div className="vault-cyber-field">
          <span className="vault-cyber-field-label">secreto</span>
          {entry.secret ? (
            <button
              type="button"
              className={`vault-cyber-secret${revealed ? ' is-revealed' : ''}`}
              onClick={() => setRevealed((current) => !current)}
              aria-label={revealed ? 'Ocultar secreto' : 'Mostrar secreto'}
            >
              {revealed ? entry.secret : '••••••••'}
            </button>
          ) : (
            <span className="vault-cyber-secret is-empty">(vacío)</span>
          )}
        </div>
        {entry.secret ? (
          <button type="button" className="vault-cyber-copy" onClick={copySecret}>
            copiar
          </button>
        ) : null}
      </div>
      <footer className="vault-cyber-footer">
        <span>esc oculta el secreto</span>
        <span className="vault-cyber-status" aria-live="polite">{status}</span>
      </footer>
    </div>
  );
}
