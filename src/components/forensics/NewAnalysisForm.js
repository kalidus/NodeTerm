import React, { useEffect, useMemo, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { Checkbox } from 'primereact/checkbox';
import { RadioButton } from 'primereact/radiobutton';
import { invoke, CATEGORY_LABEL } from './forensicsUtils';

export const DEFAULT_FORM = {
  targetKind: 'ssh-session',
  tabId: null,
  host: '',
  port: 22,
  username: '',
  authMode: 'password',
  password: '',
  privateKey: '',
  passphrase: '',
  platform: 'auto',
  vendor: 'generic',
  profile: 'quick',
  sudo: false,
  notes: '',
  excluded: []
};

/** Construye el objeto `target` que se envía al proceso principal. */
export function buildTarget(form) {
  if (form.targetKind === 'local') return { kind: 'local' };
  if (form.targetKind === 'ssh-session') return { kind: 'ssh-session', tabId: form.tabId };
  return {
    kind: 'ssh-direct',
    host: form.host,
    port: Number(form.port) || 22,
    username: form.username,
    password: form.authMode === 'password' ? form.password : undefined,
    privateKey: form.authMode === 'key' ? form.privateKey : undefined,
    passphrase: form.authMode === 'key' && form.passphrase ? form.passphrase : undefined
  };
}

const PLATFORMS = [
  { label: 'Detectar automáticamente', value: 'auto' },
  { label: 'Linux / Unix', value: 'linux' },
  { label: 'Windows (PowerShell)', value: 'windows' },
  { label: 'Equipo de red', value: 'network' }
];

const PROFILES = [
  { label: 'Rápido (triage, pocos minutos)', value: 'quick' },
  { label: 'Completo (más artefactos, más lento)', value: 'full' }
];

export const NewAnalysisForm = ({ form, setForm, sessions, networkProfiles, localPlatform, starting, onStart, error }) => {
  const [collectors, setCollectors] = useState([]);
  const [showCollectors, setShowCollectors] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  // Catálogo de colectores (para plataformas explícitas)
  useEffect(() => {
    let cancelled = false;
    const platform = form.targetKind === 'local' && form.platform === 'auto'
      ? (localPlatform === 'win32' ? 'windows' : 'linux')
      : form.platform;
    if (platform === 'auto') { setCollectors([]); return undefined; }
    invoke('forensics:catalog', { platform, profile: form.profile, vendor: form.vendor })
      .then((r) => { if (!cancelled) setCollectors(r.collectors || []); })
      .catch(() => { if (!cancelled) setCollectors([]); });
    return () => { cancelled = true; };
  }, [form.platform, form.profile, form.vendor, form.targetKind, localPlatform]);

  const usableSessions = useMemo(() => sessions.filter((s) => s.usable), [sessions]);
  const sessionOptions = sessions.map((s) => ({
    label: `${s.label} (${s.username || '?'}@${s.host}:${s.port})${s.viaBastion ? ' · bastión no soportado' : ''}`,
    value: s.tabId,
    disabled: !s.usable
  }));

  const canStart = useMemo(() => {
    if (form.targetKind === 'local') return form.platform !== 'network';
    if (form.targetKind === 'ssh-session') return !!form.tabId && usableSessions.some((s) => s.tabId === form.tabId);
    const authOk = form.authMode === 'password' ? !!form.password : !!form.privateKey.trim();
    return !!form.host.trim() && !!form.username.trim() && authOk;
  }, [form, usableSessions]);

  const groupedCollectors = useMemo(() => {
    const groups = {};
    collectors.forEach((c) => { (groups[c.category] = groups[c.category] || []).push(c); });
    return groups;
  }, [collectors]);

  const toggleCollector = (id) => set({
    excluded: form.excluded.includes(id) ? form.excluded.filter((x) => x !== id) : [...form.excluded, id]
  });

  const selectedCount = collectors.length - collectors.filter((c) => form.excluded.includes(c.id)).length;

  return (
    <div>
      <h3 className="fx-title"><i className="pi pi-search" /> Nuevo análisis forense</h3>
      <p className="fx-sub">
        Triage de solo lectura (live response). No se instala nada ni se modifica el host: cada comando se valida contra una política de solo lectura y queda registrado.
      </p>

      <div className="fx-card">
        <h4>1. Objetivo</h4>
        <div className="fx-row" style={{ marginBottom: 10 }}>
          {[
            ['ssh-session', 'Sesión SSH abierta'],
            ['ssh-direct', 'Conexión SSH manual'],
            ['local', 'Este equipo (local)']
          ].map(([value, label]) => (
            <label key={value} className="fx-row" style={{ gap: 6, cursor: 'pointer' }}>
              <RadioButton checked={form.targetKind === value} onChange={() => set({ targetKind: value })} />
              {label}
            </label>
          ))}
        </div>

        {form.targetKind === 'ssh-session' && (
          sessions.length === 0
            ? <div className="fx-warn">No hay sesiones SSH abiertas. Abre una conexión desde el árbol o usa "Conexión SSH manual".</div>
            : (
              <div className="fx-field">
                <label>Sesión</label>
                <Dropdown value={form.tabId} options={sessionOptions} optionDisabled="disabled" onChange={(e) => set({ tabId: e.value })} placeholder="Elige una sesión abierta" />
              </div>
            )
        )}

        {form.targetKind === 'ssh-direct' && (
          <div className="fx-grid">
            <div className="fx-field"><label>Host / IP</label><InputText value={form.host} onChange={(e) => set({ host: e.target.value })} /></div>
            <div className="fx-field"><label>Puerto</label><InputText type="number" value={form.port} onChange={(e) => set({ port: e.target.value })} /></div>
            <div className="fx-field"><label>Usuario</label><InputText value={form.username} onChange={(e) => set({ username: e.target.value })} autoComplete="off" /></div>
            <div className="fx-field">
              <label>Autenticación</label>
              <Dropdown value={form.authMode} options={[{ label: 'Contraseña', value: 'password' }, { label: 'Clave privada (contenido PEM)', value: 'key' }]} onChange={(e) => set({ authMode: e.value })} />
            </div>
            {form.authMode === 'password' ? (
              <div className="fx-field"><label>Contraseña</label><InputText type="password" value={form.password} onChange={(e) => set({ password: e.target.value })} autoComplete="new-password" /></div>
            ) : (
              <>
                <div className="fx-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Clave privada</label>
                  <InputTextarea rows={4} className="fx-textarea" value={form.privateKey} onChange={(e) => set({ privateKey: e.target.value })} placeholder="-----BEGIN OPENSSH PRIVATE KEY-----" />
                </div>
                <div className="fx-field"><label>Passphrase (opcional)</label><InputText type="password" value={form.passphrase} onChange={(e) => set({ passphrase: e.target.value })} autoComplete="new-password" /></div>
              </>
            )}
          </div>
        )}

        {form.targetKind === 'local' && (
          <div className="fx-muted">Se analizará el equipo donde se ejecuta NodeTerm ({localPlatform === 'win32' ? 'Windows' : localPlatform}).</div>
        )}
        <div className="fx-muted" style={{ marginTop: 6, fontSize: 12 }}>
          Las credenciales manuales solo se usan en memoria para esta recolección y no se guardan.
        </div>
      </div>

      <div className="fx-card">
        <h4>2. Tipo de sistema y perfil</h4>
        <div className="fx-grid">
          <div className="fx-field">
            <label>Sistema</label>
            <Dropdown value={form.platform} options={PLATFORMS} onChange={(e) => set({ platform: e.value, excluded: [] })} />
          </div>
          {form.platform === 'network' && (
            <div className="fx-field">
              <label>Fabricante / perfil</label>
              <Dropdown value={form.vendor} options={networkProfiles.map((p) => ({ label: p.label, value: p.id }))} onChange={(e) => set({ vendor: e.value, excluded: [] })} />
            </div>
          )}
          <div className="fx-field">
            <label>Perfil de recolección</label>
            <Dropdown value={form.profile} options={PROFILES} onChange={(e) => set({ profile: e.value, excluded: [] })} />
          </div>
        </div>
        {form.platform !== 'network' && form.targetKind !== 'local' && (
          <label className="fx-row" style={{ gap: 6, cursor: 'pointer', marginTop: 10 }}>
            <Checkbox checked={form.sudo} onChange={(e) => set({ sudo: e.checked })} />
            Usar sudo sin contraseña si no soy root (Linux; solo para colectores que lo necesitan)
          </label>
        )}
        {form.platform === 'network' && form.targetKind === 'local' && (
          <div className="fx-error">El equipo local no puede analizarse como equipo de red.</div>
        )}

        {collectors.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <span style={{ cursor: 'pointer', color: 'var(--fx-accent)' }} onClick={() => setShowCollectors((v) => !v)}>
              <i className={`pi ${showCollectors ? 'pi-chevron-down' : 'pi-chevron-right'}`} /> {selectedCount} de {collectors.length} colectores seleccionados
            </span>
            {showCollectors && (
              <div style={{ marginTop: 8, maxHeight: 280, overflow: 'auto' }}>
                {Object.entries(groupedCollectors).map(([cat, list]) => (
                  <div key={cat} style={{ marginBottom: 6 }}>
                    <div className="fx-muted" style={{ fontWeight: 600 }}>{CATEGORY_LABEL[cat] || cat}</div>
                    {list.map((c) => (
                      <label key={c.id} className="fx-row" style={{ gap: 6, cursor: 'pointer', padding: '1px 0' }}>
                        <Checkbox checked={!form.excluded.includes(c.id)} onChange={() => toggleCollector(c.id)} />
                        {c.title}{c.needsRoot ? <span className="fx-muted"> (requiere root)</span> : null}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="fx-card">
        <h4>3. Notas del caso (opcional)</h4>
        <InputTextarea rows={2} className="fx-textarea" value={form.notes} onChange={(e) => set({ notes: e.target.value })} placeholder="Ticket, motivo del análisis, observaciones..." />
      </div>

      {error && <div className="fx-error">{error}</div>}
      <Button label="Iniciar análisis" icon="pi pi-play" loading={starting} disabled={!canStart || selectedCount === 0 && collectors.length > 0} onClick={onStart} />
    </div>
  );
};
