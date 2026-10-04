import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dropdown } from 'primereact/dropdown';
import { writeText as clipboardWriteText } from '../utils/clipboard';
import { isFavorite, toggleFavorite } from '../utils/connectionStore';
import { getNetworkById, CRYPTO_NETWORK_OPTIONS } from '../utils/cryptoNetworks';

/**
 * Extrae el dominio limpio de una URL para obtener el favicon o mostrar el host.
 */
function extractDomain(url) {
  if (!url) return '';
  try {
    const withProtocol = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;
    const parsed = new URL(withProtocol);
    return parsed.hostname;
  } catch (e) {
    return url.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0].split(':')[0];
  }
}

/**
 * Genera una contraseña criptográficamente segura.
 */
function generateSecurePassword(length = 18) {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const all = lower + upper + digits + special;

  const chars = [
    lower[Math.floor(Math.random() * lower.length)],
    upper[Math.floor(Math.random() * upper.length)],
    digits[Math.floor(Math.random() * digits.length)],
    special[Math.floor(Math.random() * special.length)]
  ];

  const buffer = new Uint32Array(length - chars.length);
  window.crypto.getRandomValues(buffer);
  for (let i = 0; i < buffer.length; i++) {
    chars.push(all[buffer[i] % all.length]);
  }

  // Barajar
  return chars.sort(() => Math.random() - 0.5).join('');
}

/**
 * Calcula la robustez y entropía de una contraseña.
 */
function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: 'Sin contraseña', color: '#6b7280', percent: 0, desc: 'Introduce una clave para evaluar su seguridad' };
  }

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 2) {
    return { score: 1, label: 'Muy débil', color: '#ef4444', percent: 25, desc: 'Poco segura, vulnerable a ataques de diccionario' };
  }
  if (score === 3) {
    return { score: 2, label: 'Débil', color: '#f97316', percent: 50, desc: 'Seguridad básica, se recomienda añadir más caracteres' };
  }
  if (score === 4 || score === 5) {
    return { score: 3, label: 'Buena', color: '#eab308', percent: 75, desc: 'Contraseña robusta y adecuada para la mayoría de servicios' };
  }
  return { score: 4, label: 'Excelente', color: '#10b981', percent: 100, desc: 'Máxima seguridad criptográfica y alta entropía' };
}

const PasswordTabContent = ({ tab, masterKey, secureStorage, setSshTabs }) => {
  const p = tab?.passwordData || {};
  const secretType = p.type || 'password';

  const isInitializedRef = useRef(false);
  const passwordInputRef = useRef(null);

  // Estados de formulario
  const [formData, setFormData] = useState({
    title: p.title || p.label || '',
    notes: p.notes || '',
    username: p.username || '',
    password: p.password || '',
    url: p.url || '',
    group: p.group || '',
    network: p.network || 'bitcoin',
    seedPhrase: p.seedPhrase || '',
    privateKey: p.privateKey || '',
    address: p.address || '',
    passphrase: p.passphrase || '',
    apiKey: p.apiKey || '',
    apiSecret: p.apiSecret || '',
    endpoint: p.endpoint || '',
    serviceName: p.serviceName || '',
    noteContent: p.noteContent || ''
  });

  // Visibilidad de secretos enmascarados
  const [showMasked, setShowMasked] = useState({
    password: false,
    privateKey: false,
    seedPhrase: false,
    apiSecret: false,
    passphrase: false
  });

  const toggleMask = (field) => {
    setShowMasked(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Feedback de copiado por campo (muestra check verde temporal)
  const [copiedField, setCopiedField] = useState(null);

  // Favicon estado
  const [faviconFailed, setFaviconFailed] = useState(false);
  const domain = useMemo(() => extractDomain(formData.url || formData.title), [formData.url, formData.title]);

  useEffect(() => {
    setFaviconFailed(false);
  }, [domain]);

  // Sincronizar estado cuando cambia el nodo
  useEffect(() => {
    isInitializedRef.current = false;
    setFormData({
      title: p.title || p.label || '',
      notes: p.notes || '',
      username: p.username || '',
      password: p.password || '',
      url: p.url || '',
      group: p.group || '',
      network: p.network || 'bitcoin',
      seedPhrase: p.seedPhrase || '',
      privateKey: p.privateKey || '',
      address: p.address || '',
      passphrase: p.passphrase || '',
      apiKey: p.apiKey || '',
      apiSecret: p.apiSecret || '',
      endpoint: p.endpoint || '',
      serviceName: p.serviceName || '',
      noteContent: p.noteContent || ''
    });

    const timer = setTimeout(() => {
      isInitializedRef.current = true;
    }, 150);
    return () => clearTimeout(timer);
  }, [p.id, p.key]);

  // Favorito
  const [favStatus, setFavStatus] = useState(false);
  const secretConnection = useMemo(() => ({
    id: p.id || p.key,
    type: secretType,
    name: formData.title || p.title || p.label,
    ...p
  }), [p.id, p.key, secretType, formData.title, p]);

  useEffect(() => {
    setFavStatus(isFavorite(secretConnection));
  }, [secretConnection]);

  const handleToggleFav = (e) => {
    e?.stopPropagation?.();
    toggleFavorite(secretConnection);
    setFavStatus(isFavorite(secretConnection));
    window.dispatchEvent(new CustomEvent('connections-updated'));
  };

  // Copiado genérico con feedback
  const copyValue = async (text, fieldKey, label) => {
    if (!text || text.trim() === '' || text.trim() === '-') return;
    try {
      await clipboardWriteText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1600);

      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'success',
          summary: 'Copiado',
          detail: `${label} copiado al portapapeles`,
          life: 1400
        });
      }
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  // Generar y asignar contraseña segura
  const handleGeneratePassword = () => {
    const newPass = generateSecurePassword(18);
    setFormData(prev => ({ ...prev, password: newPass }));
    setShowMasked(prev => ({ ...prev, password: true }));
    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'info',
        summary: 'Contraseña generada',
        detail: 'Nueva contraseña robusta asignada (18 caracteres)',
        life: 2000
      });
    }
  };

  // Lanzar en navegador externo
  const handleOpenExternal = (targetUrl) => {
    if (!targetUrl) return;
    window.electron?.import?.openExternal?.(targetUrl);
  };

  // Lanzar en navegador integrado de NodeTerm con autocompletado
  const handleOpenInternalBrowser = () => {
    if (!formData.url) return;
    window.dispatchEvent(new CustomEvent('open-browser-tab', {
      detail: {
        url: formData.url,
        username: formData.username,
        password: formData.password,
        title: formData.title || 'Navegador'
      }
    }));
  };

  // Detección de advertencia App-Bound
  const isAppBoundWarning = useMemo(() => {
    if (secretType !== 'password') return false;
    if (formData.password && formData.password.trim() !== '') return false;
    const notesLower = (formData.notes || '').toLowerCase();
    const groupLower = (formData.group || '').toLowerCase();
    return notesLower.includes('app-bound') || notesLower.includes('cifrado') || groupLower.includes('navegador');
  }, [secretType, formData.password, formData.notes, formData.group]);

  // Información visual del tipo de secreto
  const secretMeta = useMemo(() => {
    switch (secretType) {
      case 'crypto_wallet': {
        const net = getNetworkById(formData.network);
        return {
          icon: 'pi pi-wallet',
          color: net?.color || '#F7931A',
          label: 'Billetera Crypto',
          badgeText: net?.label || 'Crypto Wallet',
          tabIcon: '💰'
        };
      }
      case 'api_key':
        return {
          icon: 'pi pi-key',
          color: '#06b6d4',
          label: 'API Key',
          badgeText: formData.serviceName || 'API Service',
          tabIcon: '🔑'
        };
      case 'secure_note':
        return {
          icon: 'pi pi-file-edit',
          color: '#a855f7',
          label: 'Nota Segura',
          badgeText: 'Secure Note',
          tabIcon: '📝'
        };
      case 'password':
      default:
        return {
          icon: 'pi pi-lock',
          color: '#6366f1',
          label: 'Contraseña Web',
          badgeText: domain || 'Cuenta Web',
          tabIcon: '🔐'
        };
    }
  }, [secretType, formData.network, formData.serviceName, domain]);

  // Auto-guardado debounced (500ms)
  useEffect(() => {
    if (!isInitializedRef.current) return;
    if (!formData.title.trim()) return;

    const saveTimeout = setTimeout(async () => {
      let passwordNodes = [];
      try {
        if (masterKey && secureStorage) {
          const encryptedData = localStorage.getItem('passwords_encrypted');
          if (encryptedData) {
            passwordNodes = await secureStorage.decryptData(
              JSON.parse(encryptedData),
              masterKey
            );
          } else {
            const plainData = localStorage.getItem('passwordManagerNodes');
            if (plainData) {
              passwordNodes = JSON.parse(plainData);
            }
          }
        } else {
          const saved = localStorage.getItem('passwordManagerNodes');
          if (saved) {
            passwordNodes = JSON.parse(saved);
          }
        }
      } catch (e) {
        console.error('Error cargando contraseñas para guardar:', e);
      }

      const targetId = p.id || p.key;
      const updateNodeInList = (list) => {
        return list.map(node => {
          if (node.key === targetId) {
            return {
              ...node,
              label: formData.title.trim(),
              data: {
                ...node.data,
                type: secretType,
                notes: formData.notes,
                username: formData.username,
                password: formData.password,
                url: formData.url,
                group: formData.group,
                network: formData.network,
                seedPhrase: formData.seedPhrase,
                privateKey: formData.privateKey,
                address: formData.address,
                passphrase: formData.passphrase,
                apiKey: formData.apiKey,
                apiSecret: formData.apiSecret,
                endpoint: formData.endpoint,
                serviceName: formData.serviceName,
                noteContent: formData.noteContent
              }
            };
          }
          if (node.children && node.children.length > 0) {
            return {
              ...node,
              children: updateNodeInList(node.children)
            };
          }
          return node;
        });
      };

      const updatedNodes = updateNodeInList(passwordNodes);

      try {
        if (masterKey && secureStorage) {
          const encrypted = await secureStorage.encryptData(updatedNodes, masterKey);
          localStorage.setItem('passwords_encrypted', JSON.stringify(encrypted));
          localStorage.removeItem('passwordManagerNodes');
        } else {
          localStorage.setItem('passwordManagerNodes', JSON.stringify(updatedNodes));
        }

        window.dispatchEvent(new CustomEvent('passwords-synced-from-cloud', {
          detail: { silent: true }
        }));

        if (setSshTabs) {
          setSshTabs(prev => prev.map(t => {
            if (t.key === tab.key) {
              return {
                ...t,
                label: `${secretMeta.tabIcon} ${formData.title.trim()}`,
                passwordData: {
                  ...t.passwordData,
                  title: formData.title.trim(),
                  notes: formData.notes,
                  username: formData.username,
                  password: formData.password,
                  url: formData.url,
                  group: formData.group,
                  network: formData.network,
                  seedPhrase: formData.seedPhrase,
                  privateKey: formData.privateKey,
                  address: formData.address,
                  passphrase: formData.passphrase,
                  apiKey: formData.apiKey,
                  apiSecret: formData.apiSecret,
                  endpoint: formData.endpoint,
                  serviceName: formData.serviceName,
                  noteContent: formData.noteContent
                }
              };
            }
            return t;
          }));
        }
      } catch (err) {
        console.error('Error guardando contraseña automáticamente:', err);
      }
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [
    formData.title,
    formData.notes,
    formData.username,
    formData.password,
    formData.url,
    formData.group,
    formData.network,
    formData.seedPhrase,
    formData.privateKey,
    formData.address,
    formData.passphrase,
    formData.apiKey,
    formData.apiSecret,
    formData.endpoint,
    formData.serviceName,
    formData.noteContent,
    p.id,
    p.key,
    masterKey,
    secureStorage,
    secretMeta.tabIcon,
    secretType,
    setSshTabs,
    tab.key
  ]);

  // Valores para accesos directos
  const usernameToCopy = secretType === 'crypto_wallet' ? formData.address :
                         secretType === 'api_key' ? formData.apiKey :
                         secretType === 'password' ? formData.username : '';

  const passwordToCopy = secretType === 'crypto_wallet' ? formData.privateKey :
                         secretType === 'api_key' ? formData.apiSecret :
                         secretType === 'password' ? formData.password :
                         secretType === 'secure_note' ? formData.noteContent : '';

  const passwordStrength = useMemo(() => getPasswordStrength(formData.password), [formData.password]);

  // Palabras de Seed phrase
  const seedWords = useMemo(() => {
    return (formData.seedPhrase || '').trim().split(/\s+/).filter(w => w.length > 0);
  }, [formData.seedPhrase]);

  return (
    <div className="password-tab-container">
      {/* ========================================================
          HERO HEADER BAR
          ======================================================== */}
      <div className="password-tab-header">
        <div className="password-hero-info">
          {/* Avatar / Favicon */}
          <div
            className="password-hero-avatar"
            style={{
              background: `linear-gradient(135deg, ${secretMeta.color}33 0%, rgba(255, 255, 255, 0.05) 100%)`,
              borderColor: `${secretMeta.color}55`
            }}
          >
            {/* Si viene con imagen personalizada (KeePass) */}
            {p.iconImage ? (
              <img src={p.iconImage} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            ) : secretType === 'password' && domain && !faviconFailed ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`}
                alt=""
                onError={() => setFaviconFailed(true)}
              />
            ) : (
              <div className="password-hero-avatar-fallback">
                <i className={secretMeta.icon} style={{ color: secretMeta.color }}></i>
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="password-hero-details">
            <InputText
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Nombre o título de la cuenta..."
              className="password-hero-title-input"
            />
            <div className="password-hero-badges">
              <span className="password-badge password-badge-type">
                <i className={secretMeta.icon} style={{ fontSize: '0.75rem' }}></i>
                {secretMeta.label}
              </span>

              {formData.group && (
                <span className="password-badge password-badge-folder">
                  <i className="pi pi-folder" style={{ fontSize: '0.75rem' }}></i>
                  {formData.group}
                </span>
              )}

              <span className="password-badge password-badge-sync" title="Los cambios se guardan de forma instantánea y cifrada">
                <span className="sync-dot"></span>
                Autoguardado
              </span>
            </div>
          </div>
        </div>

        {/* Quick Header Action Buttons */}
        <div className="password-header-actions">
          {/* Copiar Usuario */}
          {usernameToCopy && (
            <button
              type="button"
              className={`password-action-btn ${copiedField === 'header_user' ? 'copied-success' : ''}`}
              onClick={() => copyValue(usernameToCopy, 'header_user', secretType === 'crypto_wallet' ? 'Dirección' : 'Usuario')}
              title={copiedField === 'header_user' ? '¡Copiado!' : (secretType === 'crypto_wallet' ? 'Copiar Dirección' : 'Copiar Usuario')}
            >
              <i className={copiedField === 'header_user' ? 'pi pi-check' : 'pi pi-user'} style={{ color: copiedField === 'header_user' ? '#10b981' : undefined }}></i>
              <span>{copiedField === 'header_user' ? 'Copiado' : 'Usuario'}</span>
            </button>
          )}

          {/* Copiar Contraseña */}
          {passwordToCopy && (
            <button
              type="button"
              className={`password-action-btn ${copiedField === 'header_pass' ? 'copied-success' : ''}`}
              onClick={() => copyValue(passwordToCopy, 'header_pass', secretType === 'secure_note' ? 'Contenido' : 'Contraseña')}
              title={copiedField === 'header_pass' ? '¡Copiado!' : (secretType === 'secure_note' ? 'Copiar Contenido' : 'Copiar Contraseña')}
            >
              <i className={copiedField === 'header_pass' ? 'pi pi-check' : 'pi pi-key'} style={{ color: copiedField === 'header_pass' ? '#10b981' : undefined }}></i>
              <span>{copiedField === 'header_pass' ? 'Copiado' : 'Contraseña'}</span>
            </button>
          )}

          {/* Abrir en Navegador Externo */}
          {secretType === 'password' && formData.url && (
            <button
              type="button"
              className="password-action-btn"
              onClick={() => handleOpenExternal(formData.url)}
              title="Abrir en navegador predeterminado del sistema"
            >
              <i className="pi pi-external-link"></i>
              <span>Abrir URL</span>
            </button>
          )}

          {/* Favorito */}
          <button
            type="button"
            className={`password-action-btn ${favStatus ? 'favorite-active' : ''}`}
            onClick={handleToggleFav}
            title={favStatus ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <i className={favStatus ? 'pi pi-star-fill' : 'pi pi-star'}></i>
          </button>
        </div>
      </div>

      {/* ========================================================
          SCROLLABLE BODY
          ======================================================== */}
      <div className="password-tab-body">
        <div className="password-cards-container">

          {/* SMART ALERT: App-Bound Browser Encryption Banner */}
          {isAppBoundWarning && (
            <div className="password-smart-banner banner-warning">
              <div className="password-smart-banner-icon">
                <i className="pi pi-shield"></i>
              </div>
              <div className="password-smart-banner-text">
                <div className="password-smart-banner-title">
                  Contraseña protegida por el navegador (Cifrado App-Bound)
                </div>
                <div className="password-smart-banner-desc">
                  Chrome/Edge v127+ protegen esta contraseña a nivel de sistema. Puedes asignarla manualmente aquí o generar una nueva y quedará cifrada en NodeTerm.
                </div>
              </div>
              <div className="password-smart-banner-actions">
                <button
                  type="button"
                  className="password-action-btn btn-primary"
                  onClick={() => {
                    passwordInputRef.current?.focus?.();
                  }}
                >
                  <i className="pi pi-pencil"></i>
                  <span>Escribir clave</span>
                </button>
                <button
                  type="button"
                  className="password-action-btn"
                  onClick={handleGeneratePassword}
                  title="Generar una contraseña criptográficamente segura"
                >
                  <i className="pi pi-refresh"></i>
                  <span>Generar</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================
              CARD 1: CREDENCIALES Y ACCESO (PRINCIPAL)
              ======================================================== */}
          <div className="password-card">
            <div className="password-card-header">
              <div className="password-card-title">
                <i className="pi pi-shield"></i>
                <span>Credenciales de Acceso</span>
              </div>
            </div>

            {/* CAMPOS SEGÚN TIPO: PASSWORD */}
            {secretType === 'password' && (
              <div className="password-form-grid">
                {/* Usuario */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Usuario / Correo / ID</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      value={formData.username}
                      onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                      placeholder="Ej: usuario@correo.com o admin"
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.username && (
                        <button
                          type="button"
                          className={`password-inline-btn ${copiedField === 'username' ? 'copied-success' : ''}`}
                          onClick={() => copyValue(formData.username, 'username', 'Usuario')}
                          title={copiedField === 'username' ? '¡Copiado!' : 'Copiar usuario'}
                        >
                          <i className={copiedField === 'username' ? 'pi pi-check' : 'pi pi-copy'}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Contraseña */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Contraseña</span>
                    {formData.password && (
                      <span style={{ fontSize: '0.75rem', color: passwordStrength.color, fontWeight: '600' }}>
                        {passwordStrength.label}
                      </span>
                    )}
                  </div>
                  <div className="password-input-group">
                    <InputText
                      ref={passwordInputRef}
                      type={showMasked.password ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      placeholder={isAppBoundWarning ? 'Sin contraseña importada • Escribe o genera una...' : 'Introduce una contraseña...'}
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {/* Generar contraseña */}
                      <button
                        type="button"
                        className="password-inline-btn generator-btn"
                        onClick={handleGeneratePassword}
                        title="Generar contraseña segura aleatoria"
                      >
                        <i className="pi pi-refresh"></i>
                      </button>

                      {/* Mostrar / Ocultar */}
                      {formData.password && (
                        <button
                          type="button"
                          className="password-inline-btn"
                          onClick={() => toggleMask('password')}
                          title={showMasked.password ? 'Ocultar contraseña' : 'Ver contraseña'}
                        >
                          <i className={`pi ${showMasked.password ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                        </button>
                      )}

                      {/* Copiar */}
                      {formData.password && (
                        <button
                          type="button"
                          className={`password-inline-btn ${copiedField === 'password' ? 'copied-success' : ''}`}
                          onClick={() => copyValue(formData.password, 'password', 'Contraseña')}
                          title={copiedField === 'password' ? '¡Copiado!' : 'Copiar contraseña'}
                        >
                          <i className={copiedField === 'password' ? 'pi pi-check' : 'pi pi-copy'}></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Medidor de fortaleza */}
                  {formData.password && (
                    <div className="password-strength-container">
                      <div className="password-strength-bar">
                        <div
                          className="password-strength-fill"
                          style={{
                            width: `${passwordStrength.percent}%`,
                            backgroundColor: passwordStrength.color
                          }}
                        />
                      </div>
                      <div className="password-strength-meta">
                        <span style={{ color: 'var(--ui-dialog-text)', opacity: 0.6 }}>
                          {formData.password.length} caracteres • {passwordStrength.desc}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* URL del Sitio Web */}
                <div className="password-field full-width">
                  <div className="password-field-label">
                    <span>Sitio Web / URL de Acceso</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      value={formData.url}
                      onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://ejemplo.com/login"
                      className="password-input-control"
                    />
                    <div className="password-input-buttons">
                      {formData.url && (
                        <button
                          type="button"
                          className={`password-inline-btn ${copiedField === 'url' ? 'copied-success' : ''}`}
                          onClick={() => copyValue(formData.url, 'url', 'URL')}
                          title={copiedField === 'url' ? '¡Copiado!' : 'Copiar enlace URL'}
                        >
                          <i className={copiedField === 'url' ? 'pi pi-check' : 'pi pi-copy'}></i>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Botones de acción rápida para la URL */}
                  {formData.url && (
                    <div className="password-url-actions">
                      <button
                        type="button"
                        className="password-url-chip-btn"
                        onClick={() => handleOpenExternal(formData.url)}
                      >
                        <i className="pi pi-external-link"></i>
                        <span>Abrir en Navegador</span>
                      </button>

                      <button
                        type="button"
                        className="password-url-chip-btn"
                        onClick={handleOpenInternalBrowser}
                        title="Abre en una pestaña interna de NodeTerm e inyecta tus credenciales automáticamente"
                      >
                        <i className="pi pi-desktop"></i>
                        <span>Abrir en NodeTerm (Autocompletar)</span>
                      </button>

                      {domain && (
                        <button
                          type="button"
                          className="password-url-chip-btn"
                          onClick={() => copyValue(domain, 'domain', 'Dominio')}
                        >
                          <i className="pi pi-globe"></i>
                          <span>Copiar dominio ({domain})</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CAMPOS SEGÚN TIPO: CRYPTO WALLET */}
            {secretType === 'crypto_wallet' && (
              <div className="password-form-grid">
                {/* Red */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Red / Blockchain</span>
                  </div>
                  <Dropdown
                    value={formData.network}
                    options={CRYPTO_NETWORK_OPTIONS}
                    onChange={(e) => setFormData(prev => ({ ...prev, network: e.value }))}
                    style={{
                      width: '100%',
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid var(--ui-content-border, rgba(255, 255, 255, 0.1))',
                      borderRadius: '10px'
                    }}
                  />
                </div>

                {/* Dirección Pública */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Dirección Pública de Billetera</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      value={formData.address}
                      onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="0x... / bc1... / etc."
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.address && (
                        <button
                          type="button"
                          className={`password-inline-btn ${copiedField === 'address' ? 'copied-success' : ''}`}
                          onClick={() => copyValue(formData.address, 'address', 'Dirección')}
                          title="Copiar dirección"
                        >
                          <i className={copiedField === 'address' ? 'pi pi-check' : 'pi pi-copy'}></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Clave Privada */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Clave Privada</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      type={showMasked.privateKey ? 'text' : 'password'}
                      value={formData.privateKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, privateKey: e.target.value }))}
                      placeholder="Private key hex / wif"
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.privateKey && (
                        <>
                          <button
                            type="button"
                            className="password-inline-btn"
                            onClick={() => toggleMask('privateKey')}
                            title={showMasked.privateKey ? 'Ocultar clave privada' : 'Ver clave privada'}
                          >
                            <i className={`pi ${showMasked.privateKey ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                          </button>
                          <button
                            type="button"
                            className={`password-inline-btn ${copiedField === 'privateKey' ? 'copied-success' : ''}`}
                            onClick={() => copyValue(formData.privateKey, 'privateKey', 'Clave Privada')}
                            title="Copiar clave privada"
                          >
                            <i className={copiedField === 'privateKey' ? 'pi pi-check' : 'pi pi-copy'}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Passphrase */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Passphrase Adicional (Opcional)</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      type={showMasked.passphrase ? 'text' : 'password'}
                      value={formData.passphrase}
                      onChange={(e) => setFormData(prev => ({ ...prev, passphrase: e.target.value }))}
                      placeholder="Passphrase opcional"
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.passphrase && (
                        <>
                          <button
                            type="button"
                            className="password-inline-btn"
                            onClick={() => toggleMask('passphrase')}
                            title={showMasked.passphrase ? 'Ocultar' : 'Ver'}
                          >
                            <i className={`pi ${showMasked.passphrase ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                          </button>
                          <button
                            type="button"
                            className={`password-inline-btn ${copiedField === 'passphrase' ? 'copied-success' : ''}`}
                            onClick={() => copyValue(formData.passphrase, 'passphrase', 'Passphrase')}
                            title="Copiar passphrase"
                          >
                            <i className={copiedField === 'passphrase' ? 'pi pi-check' : 'pi pi-copy'}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Seed Phrase */}
                <div className="password-field full-width">
                  <div className="password-field-label">
                    <span>Seed Phrase ({seedWords.length} palabras)</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {formData.seedPhrase && (
                        <>
                          <button
                            type="button"
                            className="password-url-chip-btn"
                            onClick={() => toggleMask('seedPhrase')}
                          >
                            <i className={`pi ${showMasked.seedPhrase ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                            <span>{showMasked.seedPhrase ? 'Ocultar palabras' : 'Mostrar palabras'}</span>
                          </button>
                          <button
                            type="button"
                            className="password-url-chip-btn"
                            onClick={() => copyValue(formData.seedPhrase, 'seedPhrase', 'Seed Phrase')}
                          >
                            <i className={copiedField === 'seedPhrase' ? 'pi pi-check' : 'pi pi-copy'}></i>
                            <span>Copiar completa</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <InputTextarea
                    value={formData.seedPhrase}
                    onChange={(e) => setFormData(prev => ({ ...prev, seedPhrase: e.target.value }))}
                    placeholder="Palabras semilla separadas por espacio (12 o 24 palabras)..."
                    className="password-textarea"
                    rows={2}
                    style={{ fontFamily: 'monospace' }}
                  />

                  {/* Grid de palabras visual */}
                  {seedWords.length > 0 && showMasked.seedPhrase && (
                    <div className="password-seed-grid">
                      {seedWords.map((word, idx) => (
                        <div key={idx} className="password-seed-chip">
                          <span className="password-seed-number">{idx + 1}.</span>
                          <span className="password-seed-word">{word}</span>
                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'inherit', opacity: 0.5, cursor: 'pointer', padding: '2px' }}
                            onClick={() => copyValue(word, `word_${idx}`, `Palabra #${idx + 1}`)}
                            title={`Copiar palabra ${idx + 1}`}
                          >
                            <i className="pi pi-copy" style={{ fontSize: '0.75rem' }}></i>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CAMPOS SEGÚN TIPO: API KEY */}
            {secretType === 'api_key' && (
              <div className="password-form-grid">
                {/* Nombre de Servicio */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Proveedor / Servicio</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      value={formData.serviceName}
                      onChange={(e) => setFormData(prev => ({ ...prev, serviceName: e.target.value }))}
                      placeholder="Ej: OpenAI, Anthropic, AWS, Stripe..."
                      className="password-input-control"
                    />
                  </div>
                </div>

                {/* Endpoint URL */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>Endpoint URL</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      value={formData.endpoint}
                      onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
                      placeholder="https://api.openai.com/v1"
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.endpoint && (
                        <button
                          type="button"
                          className="password-inline-btn"
                          onClick={() => copyValue(formData.endpoint, 'endpoint', 'Endpoint')}
                          title="Copiar Endpoint"
                        >
                          <i className="pi pi-copy"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Key */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>API Key / Client ID</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      type={showMasked.password ? 'text' : 'password'}
                      value={formData.apiKey}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                      placeholder="sk-..."
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.apiKey && (
                        <>
                          <button
                            type="button"
                            className="password-inline-btn"
                            onClick={() => toggleMask('password')}
                            title={showMasked.password ? 'Ocultar' : 'Ver'}
                          >
                            <i className={`pi ${showMasked.password ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                          </button>
                          <button
                            type="button"
                            className={`password-inline-btn ${copiedField === 'apiKey' ? 'copied-success' : ''}`}
                            onClick={() => copyValue(formData.apiKey, 'apiKey', 'API Key')}
                            title="Copiar API Key"
                          >
                            <i className={copiedField === 'apiKey' ? 'pi pi-check' : 'pi pi-copy'}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* API Secret */}
                <div className="password-field">
                  <div className="password-field-label">
                    <span>API Secret / Private Token</span>
                  </div>
                  <div className="password-input-group">
                    <InputText
                      type={showMasked.apiSecret ? 'text' : 'password'}
                      value={formData.apiSecret}
                      onChange={(e) => setFormData(prev => ({ ...prev, apiSecret: e.target.value }))}
                      placeholder="Secret key..."
                      className="password-input-control monospace"
                    />
                    <div className="password-input-buttons">
                      {formData.apiSecret && (
                        <>
                          <button
                            type="button"
                            className="password-inline-btn"
                            onClick={() => toggleMask('apiSecret')}
                            title={showMasked.apiSecret ? 'Ocultar' : 'Ver'}
                          >
                            <i className={`pi ${showMasked.apiSecret ? 'pi-eye-slash' : 'pi-eye'}`}></i>
                          </button>
                          <button
                            type="button"
                            className={`password-inline-btn ${copiedField === 'apiSecret' ? 'copied-success' : ''}`}
                            onClick={() => copyValue(formData.apiSecret, 'apiSecret', 'API Secret')}
                            title="Copiar API Secret"
                          >
                            <i className={copiedField === 'apiSecret' ? 'pi pi-check' : 'pi pi-copy'}></i>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* CAMPOS SEGÚN TIPO: SECURE NOTE */}
            {secretType === 'secure_note' && (
              <div className="password-form-grid single-col">
                <div className="password-field full-width">
                  <div className="password-field-label">
                    <span>Contenido de la Nota Segura</span>
                    {formData.noteContent && (
                      <button
                        type="button"
                        className="password-url-chip-btn"
                        onClick={() => copyValue(formData.noteContent, 'noteContent', 'Contenido')}
                      >
                        <i className={copiedField === 'noteContent' ? 'pi pi-check' : 'pi pi-copy'}></i>
                        <span>Copiar nota completa</span>
                      </button>
                    )}
                  </div>
                  <InputTextarea
                    value={formData.noteContent}
                    onChange={(e) => setFormData(prev => ({ ...prev, noteContent: e.target.value }))}
                    placeholder="Escribe aquí tu información confidencial, claves de recuperación, certificados o notas privadas..."
                    className="password-textarea"
                    rows={8}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ========================================================
              CARD 2: ORGANIZACIÓN Y UBICACIÓN
              ======================================================== */}
          <div className="password-card">
            <div className="password-card-header">
              <div className="password-card-title">
                <i className="pi pi-folder"></i>
                <span>Organización</span>
              </div>
            </div>

            <div className="password-form-grid">
              <div className="password-field full-width">
                <div className="password-field-label">
                  <span>Carpeta / Grupo</span>
                </div>
                <div className="password-input-group">
                  <InputText
                    value={formData.group}
                    onChange={(e) => setFormData(prev => ({ ...prev, group: e.target.value }))}
                    placeholder="Ej: Personal, Servidores, Curro, Cryptos..."
                    className="password-input-control"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================
              CARD 3: NOTAS Y METADATOS
              ======================================================== */}
          <div className="password-card">
            <div className="password-card-header">
              <div className="password-card-title">
                <i className="pi pi-file-edit"></i>
                <span>Notas Adicionales</span>
              </div>
            </div>

            <div className="password-form-grid single-col">
              <div className="password-field full-width">
                <InputTextarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Añade notas, preguntas de seguridad, observaciones o instrucciones..."
                  className="password-textarea"
                  rows={4}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PasswordTabContent;
