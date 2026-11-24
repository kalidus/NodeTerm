import React, { useEffect, useMemo, useRef, useState } from 'react';
import appIcon from '../assets/app-icon.png';
import '../styles/components/unlock-screen.css';

export const MIN_MASTER_KEY_LENGTH = 6;
const SEAL_HOLD_MS = 1200;
const LEAVE_MS = 380;

const STRENGTH_LABELS = ['Muy débil', 'Muy débil', 'Débil', 'Media', 'Fuerte', 'Excelente'];

const STEPS = [
  { id: 1, label: 'Crear clave' },
  { id: 2, label: 'Cifrar' },
  { id: 3, label: 'Listo' }
];

export function evaluateMasterPassword(password) {
  const checks = {
    length: password.length >= MIN_MASTER_KEY_LENGTH,
    long: password.length >= 10,
    mixedCase: /[a-z]/.test(password) && /[A-Z]/.test(password),
    digit: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password)
  };
  const score = password
    ? Object.values(checks).filter(Boolean).length
    : 0;
  return { checks, score };
}

/**
 * Formulario de creación de clave maestra.
 * variant: "overlay" | "panel" (Home embebido).
 */
export default function MasterKeySetupForm({
  secureStorage,
  onSuccess,
  variant = 'overlay',
  autoFocus = true,
  showBrand = true
}) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [phase, setPhase] = useState('idle'); // idle | encrypting | sealed | leaving
  const passwordInputRef = useRef(null);
  const timersRef = useRef([]);

  const { checks, score } = useMemo(() => evaluateMasterPassword(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const mismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const canSubmit =
    checks.length && passwordsMatch && acknowledged && phase === 'idle';

  const currentStep = phase === 'idle' ? 1 : phase === 'encrypting' ? 2 : 3;

  useEffect(() => {
    if (autoFocus && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => () => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

  const handleSubmit = async () => {
    if (!canSubmit) {
      if (!checks.length) {
        setError(`La clave maestra debe tener al menos ${MIN_MASTER_KEY_LENGTH} caracteres.`);
      } else if (!passwordsMatch) {
        setError('Las claves no coinciden.');
      } else if (!acknowledged) {
        setError('Confirma que entiendes que la clave no se puede recuperar.');
      }
      return;
    }

    setError('');
    setPhase('encrypting');

    try {
      await secureStorage.saveMasterKey(password, remember);
    } catch (err) {
      console.error('[MasterKeySetupForm]', err);
      setError(err?.message || 'No se pudo guardar la clave maestra.');
      setPhase('idle');
      return;
    }

    const key = password;
    setPhase('sealed');
    timersRef.current.push(
      setTimeout(() => {
        setPhase('leaving');
        timersRef.current.push(
          setTimeout(() => {
            setPassword('');
            setConfirmPassword('');
            setPhase('idle');
            onSuccess?.(key);
          }, LEAVE_MS)
        );
      }, SEAL_HOLD_MS)
    );
  };

  const handleKeyDown = (e) => {
    if (variant === 'overlay') {
      e.stopPropagation();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const busy = phase !== 'idle';
  const sealed = phase === 'sealed' || phase === 'leaving';
  const heading = sealed
    ? 'Vault sellado'
    : phase === 'encrypting'
      ? 'Cifrando tu vault…'
      : 'Configura tu vault';
  const subtitle = sealed
    ? 'Tus credenciales ya están protegidas con tu clave maestra.'
    : phase === 'encrypting'
      ? 'Generando claves y protegiendo el almacén local.'
      : 'Protege tus datos con cifrado fuerte y local. Puedes seguir usando la app mientras tanto.';

  const cardClass = [
    'mk-setup-card',
    variant === 'panel' ? 'mk-setup-card--panel' : '',
    phase === 'encrypting' ? 'is-encrypting' : '',
    sealed ? 'is-sealed' : '',
    phase === 'leaving' ? 'is-leaving' : ''
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClass}
      onKeyDown={handleKeyDown}
      role={variant === 'panel' ? 'region' : undefined}
      aria-labelledby="mk-setup-title"
    >
      <ol className="mk-setup-steps" aria-label="Progreso">
        {STEPS.map((step, idx) => {
          const done = currentStep > step.id || (step.id === 3 && sealed);
          const active = currentStep === step.id && !(step.id === 3 && sealed);
          return (
            <React.Fragment key={step.id}>
              <li
                className={`mk-setup-step${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
                aria-current={active ? 'step' : undefined}
              >
                <span className="mk-setup-step-dot">
                  {done ? <i className="pi pi-check" aria-hidden="true" /> : step.id}
                </span>
                <span className="mk-setup-step-label">{step.label}</span>
              </li>
              {idx < STEPS.length - 1 ? (
                <span
                  className={`mk-setup-step-line${currentStep > step.id ? ' is-done' : ''}`}
                  aria-hidden="true"
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </ol>

      <div className="mk-setup-chip">
        <i className="pi pi-lock" aria-hidden="true" />
        <span>ENCRYPTED AES-256</span>
      </div>

      <div className="mk-setup-shield" aria-hidden="true">
        <span className="mk-setup-ring mk-setup-ring--1" />
        <span className="mk-setup-ring mk-setup-ring--2" />
        <span className="mk-setup-ring mk-setup-ring--3" />
        <div className="mk-setup-shield-core">
          <svg viewBox="0 0 64 72" className="mk-setup-shield-svg">
            <path
              d="M32 3 7 12v20c0 17 10.5 30.5 25 37 14.5-6.5 25-20 25-37V12L32 3z"
              className="mk-setup-shield-path"
            />
          </svg>
          <i className={`pi ${sealed ? 'pi-check' : 'pi-lock'} mk-setup-shield-icon`} />
        </div>
      </div>

      <h2 id="mk-setup-title" className="mk-setup-title">{heading}</h2>
      <p className="mk-setup-subtitle">{subtitle}</p>

      <div className="mk-setup-form">
        <div className={`mk-setup-field${busy ? ' is-disabled' : ''}`}>
          <i className="pi pi-key mk-setup-field-icon" aria-hidden="true" />
          <input
            ref={passwordInputRef}
            id="mk-setup-password"
            type={revealed ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(''); }}
            placeholder="Crea tu clave maestra"
            autoComplete="new-password"
            disabled={busy}
            aria-label="Clave maestra"
          />
          <button
            type="button"
            className="mk-setup-field-toggle"
            aria-label={revealed ? 'Ocultar clave' : 'Mostrar clave'}
            aria-pressed={revealed}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setRevealed((v) => !v)}
            disabled={busy}
          >
            <i className={revealed ? 'pi pi-eye-slash' : 'pi pi-eye'} aria-hidden="true" />
          </button>
        </div>

        <div className={`mk-setup-field${mismatch ? ' is-invalid' : ''}${passwordsMatch ? ' is-valid' : ''}${busy ? ' is-disabled' : ''}`}>
          <i className="pi pi-shield mk-setup-field-icon" aria-hidden="true" />
          <input
            id="mk-setup-confirm"
            type={revealed ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
            placeholder="Confirma tu clave maestra"
            autoComplete="new-password"
            disabled={busy}
            aria-label="Confirmar clave maestra"
          />
          {passwordsMatch ? (
            <i className="pi pi-check-circle mk-setup-field-ok" aria-hidden="true" />
          ) : null}
        </div>

        <div className="mk-setup-strength" aria-live="polite">
          <span className="mk-setup-strength-title">Fortaleza de la clave</span>
          <div className="mk-setup-meter" data-level={score} aria-hidden="true">
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className={n <= score ? 'is-on' : ''} />
            ))}
          </div>
          <span className="mk-setup-strength-label">
            {password ? STRENGTH_LABELS[score] : '—'}
          </span>
        </div>

        <ul className="mk-setup-checklist">
          <li className={checks.length ? 'is-ok' : ''}>
            <i className={`pi ${checks.length ? 'pi-check-circle' : 'pi-circle'}`} aria-hidden="true" />
            Mínimo {MIN_MASTER_KEY_LENGTH} caracteres
          </li>
          <li className={checks.mixedCase ? 'is-ok' : ''}>
            <i className={`pi ${checks.mixedCase ? 'pi-check-circle' : 'pi-circle'}`} aria-hidden="true" />
            Mayúsculas y minúsculas
          </li>
          <li className={checks.digit ? 'is-ok' : ''}>
            <i className={`pi ${checks.digit ? 'pi-check-circle' : 'pi-circle'}`} aria-hidden="true" />
            Números
          </li>
          <li className={checks.symbol ? 'is-ok' : ''}>
            <i className={`pi ${checks.symbol ? 'pi-check-circle' : 'pi-circle'}`} aria-hidden="true" />
            Símbolos
          </li>
        </ul>

        {mismatch ? (
          <div className="mk-setup-hint mk-setup-hint--warn">Las claves no coinciden.</div>
        ) : null}
        {error ? (
          <div className="mk-setup-error" role="alert">
            <i className="pi pi-exclamation-triangle" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <label className="mk-setup-check">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => { setAcknowledged(e.target.checked); setError(''); }}
            disabled={busy}
          />
          <span className="mk-setup-check-box" aria-hidden="true" />
          <span>
            Entiendo que si olvido la clave <strong>no se podrá recuperar</strong>.
          </span>
        </label>

        <label className="mk-setup-check">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            disabled={busy}
          />
          <span className="mk-setup-check-box" aria-hidden="true" />
          <span>Recordar en este equipo (protegida por el sistema operativo)</span>
        </label>

        <button
          type="button"
          className="mk-setup-cta"
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {phase === 'encrypting' ? (
            <>
              <i className="pi pi-spin pi-spinner" aria-hidden="true" />
              <span>Cifrando…</span>
            </>
          ) : sealed ? (
            <>
              <i className="pi pi-check" aria-hidden="true" />
              <span>Vault sellado</span>
            </>
          ) : (
            <>
              <span>Crear clave maestra</span>
              <i className="pi pi-arrow-right" aria-hidden="true" />
            </>
          )}
        </button>
      </div>

      <div className="mk-setup-trust">
        <div className="mk-setup-trust-item">
          <i className="pi pi-desktop" aria-hidden="true" />
          <div>
            <strong>Local</strong>
            <span>Solo en tu dispositivo</span>
          </div>
        </div>
        <div className="mk-setup-trust-sep" aria-hidden="true" />
        <div className="mk-setup-trust-item">
          <i className="pi pi-eye-slash" aria-hidden="true" />
          <div>
            <strong>Zero-knowledge</strong>
            <span>Nunca enviamos tu clave</span>
          </div>
        </div>
      </div>

      {(showBrand || variant === 'panel') ? (
        <img src={appIcon} alt="" className="mk-setup-brand" aria-hidden="true" />
      ) : null}
    </div>
  );
}
