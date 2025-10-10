import React, { useRef, useState } from 'react';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { ProgressBar } from 'primereact/progressbar';

// Panel embebido (sin Dialog) para importar KeePass. Reutiliza la lógica del diálogo.

const KeePassImportPanel = ({
  onImportPasswordsComplete,
  showToast,
  defaultContainerName
}) => {
  const fileInputRef = useRef(null);
  const keyFileInputRef = useRef(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedKeyFile, setSelectedKeyFile] = useState(null);
  const [dbPassword, setDbPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [placeInFolder, setPlaceInFolder] = useState(true);
  const [containerFolderName, setContainerFolderName] = useState(
    defaultContainerName || `KeePass imported - ${new Date().toLocaleDateString()}`
  );

  const chooseFile = () => fileInputRef.current && fileInputRef.current.click();
  const chooseKeyFile = () => keyFileInputRef.current && keyFileInputRef.current.click();

  const ensureKdbxwebLoaded = () => new Promise((resolve, reject) => {
    if (window.kdbxweb) return resolve(window.kdbxweb);
    const script = document.createElement('script');
    script.src = 'vendor/kdbxweb.min.js';
    script.async = true;
    script.onload = () => window.kdbxweb ? resolve(window.kdbxweb) : reject(new Error('kdbxweb no se cargó'));
    script.onerror = () => reject(new Error('No se pudo cargar kdbxweb'));
    document.head.appendChild(script);
  });

  const readFileAsArrayBuffer = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });

  const protectedToString = async (val) => {
    try {
      if (!val) return '';
      if (typeof val === 'string') return val;
      if (typeof val.getText === 'function') {
        let s = '';
        try { s = val.getText(); } catch {}
        if (typeof s === 'string' && s.length > 0) return s.replace(/\u0000/g, '').trim();
        try {
          const bin = val.getBinary && val.getBinary();
          if (bin) {
            const dec = new TextDecoder('utf-8');
            const txt = dec.decode(bin).replace(/\u0000/g, '').trim();
            if (txt) return txt;
          }
        } catch {}
        return '';
      }
      return String(val || '');
    } catch { return ''; }
  };

  const bytesToDataUrl = (bytes, mime = 'image/png') => {
    try {
      if (!bytes) return null;
      const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      let binary = '';
      for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
      const base64 = btoa(binary);
      return `data:${mime};base64,${base64}`;
    } catch { return null; }
  };

  const getCustomIconData = (db, uuid) => {
    try {
      const icons = db && db.meta && db.meta.customIcons;
      if (!uuid || !icons) return null;
      if (typeof icons.get === 'function') {
        let val = icons.get(uuid);
        if (!val) {
          // Iterar por si el Map usa claves con objetos Uuid no estrictamente iguales
          for (const [k, v] of icons) {
            if ((k && k.equals && k.equals(uuid)) || (k && k.toString && uuid && uuid.toString && k.toString() === uuid.toString())) {
              val = v; break;
            }
          }
        }
        return (val && (val.data || val)) || null;
      }
      if (Array.isArray(icons)) {
        const found = icons.find(ci => (ci && (ci.uuid?.toString?.() === uuid?.toString?.())));
        return found && (found.data || found) || null;
      }
      return null;
    } catch { return null; }
  };

  const getEntryField = (entry, key) => {
    try {
      if (!entry || !entry.fields) return null;
      if (typeof entry.fields.get === 'function') {
        const v = entry.fields.get(key);
        if (v !== undefined && v !== null) return v;
      }
      const v2 = entry.fields[key];
      if (v2 !== undefined && v2 !== null) return v2;
    } catch {}
    return null;
  };

  const mapKeePassToNodes = async (db) => {
    const genKey = (p) => `${p}_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
    const toPasswordNode = async (entry, groupPath) => {
      const title = await protectedToString(getEntryField(entry, 'Title'));
      const username = await protectedToString(getEntryField(entry, 'UserName') || getEntryField(entry, 'Username'));
      const password = await protectedToString(getEntryField(entry, 'Password'));
      const url = await protectedToString(getEntryField(entry, 'URL'));
      const notes = await protectedToString(getEntryField(entry, 'Notes'));
      const iconId = entry.icon || entry.iconId || null;
      // Icono: intentar extraer icono personalizado desde db.meta.customIcons
      let iconImage = null;
      try {
        const uuid = entry.customIcon || entry.customIconId || entry.customIconUuid;
        const data = getCustomIconData(db, uuid);
        const url = data ? bytesToDataUrl(data, 'image/png') : null;
        if (url) iconImage = url;
      } catch {}
      const key = genKey('password');
      return {
        key,
        label: title || username || url || '(Sin título)',
        data: { type: 'password', username: username || '', password: password || '', url: url || '', group: groupPath || '', notes: notes || '', iconImage, iconId },
        uid: key,
        createdAt: new Date().toISOString(),
        isUserCreated: true,
        draggable: true,
        droppable: false
      };
    };
    const toFolderNode = (label, iconImage = null, iconId = null) => {
      const key = genKey('password_folder');
      return { key, label, droppable: true, children: [], uid: key, createdAt: new Date().toISOString(), isUserCreated: true, data: { type: 'password-folder', iconImage, iconId } };
    };
    const processGroup = async (group, path = []) => {
      const currentPath = [...path, group.name].filter(Boolean);
      // Intentar icono por grupo (KeePass suele permitir iconos en grupos también)
      let folderIcon = null;
      let folderIconId = group.icon || group.iconId || null;
      try {
        const uuid = group.customIcon || group.customIconId || group.customIconUuid;
        const data = getCustomIconData(db, uuid);
        const url = data ? bytesToDataUrl(data, 'image/png') : null;
        if (url) folderIcon = url;
      } catch {}
      const folder = toFolderNode(group.name || 'Carpeta', folderIcon, folderIconId);
      if (Array.isArray(group.entries)) {
        for (const entry of group.entries) {
          folder.children.push(await toPasswordNode(entry, currentPath.join(' / ')));
        }
      }
      if (Array.isArray(group.groups)) {
        for (const sub of group.groups) {
          folder.children.push(await processGroup(sub, currentPath));
        }
      }
      return folder;
    };
    const result = [];
    for (const root of db.groups) result.push(await processGroup(root, []));
    return result;
  };

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.kdbx')) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Seleccione un archivo .kdbx', life: 3000 });
      return;
    }
    setSelectedFile(f);
    try { e.target.value = ''; } catch {}
  };
  const onKeyFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setSelectedKeyFile(f);
    try { e.target.value = ''; } catch {}
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showToast && showToast({ severity: 'error', summary: 'Error', detail: 'Seleccione un archivo .kdbx', life: 3000 });
      return;
    }
    if (!dbPassword && !selectedKeyFile) {
      showToast && showToast({ severity: 'warn', summary: 'Falta clave', detail: 'Proporcione contraseña y/o archivo clave de KeePass', life: 4000 });
      return;
    }
    setImporting(true);
    setProgress(10);
    try {
      const kdbxweb = await ensureKdbxwebLoaded();
      const ab = await readFileAsArrayBuffer(selectedFile);
      const keyAb = selectedKeyFile ? await readFileAsArrayBuffer(selectedKeyFile) : null;
      setProgress(30);
      const pwd = (dbPassword || '').toString();
      const credentials = new kdbxweb.Credentials(pwd ? kdbxweb.ProtectedValue.fromString(pwd) : null, keyAb ? new Uint8Array(keyAb) : null);
      const db = await kdbxweb.Kdbx.load(ab, credentials);
      setProgress(60);
      const nodes = await mapKeePassToNodes(db);
      setProgress(85);
      const payload = { nodes, createContainerFolder: !!placeInFolder, containerFolderName };
      if (onImportPasswordsComplete) onImportPasswordsComplete(payload);
      else window.dispatchEvent(new CustomEvent('import-passwords-to-manager', { detail: payload }));
      setProgress(100);
      showToast && showToast({ severity: 'success', summary: 'Importación exitosa', detail: 'Passwords importados', life: 3000 });
    } catch (err) {
      const rawMsg = (err && (err.message || err.toString())) || '';
      const isInvalidKey = /InvalidKey/i.test(rawMsg) || (err && err.code === 'InvalidKey');
      const msg = isInvalidKey ? 'Contraseña o archivo clave incorrecto.' : (rawMsg || 'Error al importar .kdbx');
      showToast && showToast({ severity: 'error', summary: 'Error', detail: msg, life: 6000 });
    } finally {
      setImporting(false);
      setProgress(0);
    }
  };

  return (
    <div style={{ padding: '0 4px' }}>
      <div className="import-two-col-grid">
        <div>
          <div className="mb-3">
            <div className="flex align-items-center" style={{ gap: 8 }}>
              <input type="checkbox" id="kp-placeInFolder" checked={placeInFolder} onChange={(e) => setPlaceInFolder(e.target.checked)} disabled={importing} />
              <label htmlFor="kp-placeInFolder" style={{ fontWeight: 500 }}>Crear carpeta</label>
            </div>
            {placeInFolder && (
              <div style={{ marginLeft: 26, marginTop: 6 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>Nombre de la carpeta</label>
                <InputText value={containerFolderName} onChange={(e) => setContainerFolderName(e.target.value)} placeholder="KeePass imported - ..." style={{ width: 320 }} />
              </div>
            )}
          </div>
        </div>
        <div>
          {/* Archivo DB */}
          <div className="flex align-items-center" style={{ gap: 8, marginBottom: 6 }}>
            <i className="pi pi-file" />
            <span style={{ fontWeight: 600 }}>Archivo .kdbx</span>
          </div>
          {!selectedFile ? (
            <div className="border-2 border-dashed rounded-lg text-center" style={{ padding: 16, cursor: 'pointer' }} onClick={chooseFile}>
              <i className="pi pi-cloud-upload" style={{ color: 'var(--text-color-secondary)' }} />
              <div style={{ marginTop: 6 }}>Haz clic para seleccionar un archivo .kdbx</div>
            </div>
          ) : (
            <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-200)', borderRadius: 8, padding: 12 }}>
              <div className="flex align-items-center justify-content-between">
                <div className="flex align-items-center" style={{ gap: 10 }}>
                  <div style={{ background: 'var(--blue-500)', color: 'white', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="pi pi-file" />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{selectedFile.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-color-secondary)' }}>{(selectedFile.size/1024).toFixed(1)} KB • KeePass DB</div>
                  </div>
                </div>
                <div className="flex align-items-center" style={{ gap: 8 }}>
                  <Button icon="pi pi-refresh" className="p-button-outlined p-button-sm" onClick={chooseFile} disabled={importing} />
                  <Button icon="pi pi-times" className="p-button-outlined p-button-danger p-button-sm" onClick={() => setSelectedFile(null)} disabled={importing} />
                </div>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept=".kdbx" style={{ display: 'none' }} onChange={onFileChange} />

          {/* Key file opcional */}
          <div style={{ marginTop: 12 }}>
            <div className="flex align-items-center" style={{ gap: 8, marginBottom: 6 }}>
              <i className="pi pi-key" />
              <span style={{ fontWeight: 600 }}>Archivo clave (opcional)</span>
            </div>
            {!selectedKeyFile ? (
              <div className="border-2 border-dashed rounded-lg text-center" style={{ padding: 12, cursor: 'pointer' }} onClick={chooseKeyFile}>
                <i className="pi pi-plus" style={{ color: 'var(--text-color-secondary)' }} />
                <div style={{ marginTop: 6, fontSize: 12 }}>Agregar archivo clave (.key/.bin)</div>
              </div>
            ) : (
              <div style={{ background: 'var(--surface-ground)', border: '1px solid var(--surface-border)', borderRadius: 8, padding: 10 }}>
                <div className="flex align-items-center justify-content-between">
                  <div className="flex align-items-center" style={{ gap: 8 }}>
                    <i className="pi pi-file" />
                    <span style={{ fontWeight: 600 }}>{selectedKeyFile.name}</span>
                  </div>
                  <div className="flex align-items-center" style={{ gap: 6 }}>
                    <Button icon="pi pi-refresh" className="p-button-outlined p-button-sm" onClick={chooseKeyFile} disabled={importing} />
                    <Button icon="pi pi-times" className="p-button-outlined p-button-danger p-button-sm" onClick={() => setSelectedKeyFile(null)} disabled={importing} />
                  </div>
                </div>
              </div>
            )}
            <input ref={keyFileInputRef} type="file" accept=".key,.bin,.txt,*" style={{ display: 'none' }} onChange={onKeyFileChange} />
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-color-secondary)' }}>
              Puede usar contraseña, archivo clave o ambos (clave compuesta).
            </div>
          </div>

          {/* Password */}
          <div style={{ marginTop: 12 }}>
            <div className="flex align-items-center" style={{ gap: 8, marginBottom: 6 }}>
              <i className="pi pi-lock" />
              <span style={{ fontWeight: 600 }}>Contraseña de la base</span>
            </div>
            <Password value={dbPassword} onChange={(e) => setDbPassword(e.target.value)} placeholder="Contraseña" feedback={false} toggleMask inputStyle={{ width: '100%' }} />
          </div>

          {importing && (
            <div style={{ marginTop: 12, background: 'var(--surface-ground)', borderRadius: 6, padding: 10 }}>
              <div className="flex align-items-center justify-content-between" style={{ marginBottom: 6 }}>
                <span style={{ fontWeight: 500 }}>Importando...</span>
                <span style={{ color: 'var(--text-color-secondary)' }}>{progress}%</span>
              </div>
              <ProgressBar value={progress} style={{ height: 6 }} />
            </div>
          )}

          <div style={{ marginTop: 12 }}>
            <Button label={importing ? 'Importando…' : 'Importar passwords'} icon={importing ? 'pi pi-spin pi-spinner' : 'pi pi-upload'} onClick={handleImport} disabled={!selectedFile || importing} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeePassImportPanel;


