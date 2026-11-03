import React, { useEffect, useState } from 'react';
import { normalizeSplashStyle } from './splashStyles';

const STEPS = [
  { percent: 25, text: 'Iniciando NodeTerm' },
  { percent: 50, text: 'Preparando ventana' },
  { percent: 75, text: 'Cargando interfaz' },
  { percent: 100, text: 'Listo' }
];

/**
 * Preview visual del splash (React, sin IPC) — mismo enfoque que UnlockScreen.
 */
export default function SplashLivePreview({ styleId }) {
  const id = normalizeSplashStyle(styleId);
  const [step, setStep] = useState(0);
  const [lines, setLines] = useState(['>> BOOTING NODETERM SHELL PROTOCOLS...']);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let idx = 0;

    setStep(0);
    setLines(['>> BOOTING NODETERM SHELL PROTOCOLS...']);

    const schedule = (fn, ms) => {
      timer = setTimeout(() => {
        if (!cancelled) fn();
      }, ms);
    };

    const tick = () => {
      if (cancelled) return;
      if (idx >= STEPS.length) {
        schedule(() => {
          idx = 0;
          setStep(0);
          setLines(['>> BOOTING NODETERM SHELL PROTOCOLS...']);
          schedule(tick, 400);
        }, 1800);
        return;
      }
      const current = STEPS[idx];
      setStep(idx);
      setLines((prev) => [...prev, `>> ${current.text.toUpperCase()}... OK`]);
      idx += 1;
      schedule(tick, 1100);
    };

    schedule(tick, 350);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const active = STEPS[Math.min(step, STEPS.length - 1)] || STEPS[0];
  const showHud = ['terminal', 'glass-hud', 'synthwave', 'matrix'].includes(id);

  return (
    <div className={`splash-live splash-live--${id}`}>
      <div className="splash-live-grid" aria-hidden="true" />
      <div className="splash-live-container">
        <div className="splash-live-logo">
          <span className="splash-live-prompt">&gt;_</span>
          <span className="splash-live-code">&lt;/&gt;_</span>
        </div>
        <div className="splash-live-brand">NodeTerm</div>
        <div className="splash-live-tagline">Secure. Reliable. Connected.</div>

        {showHud ? (
          <div className="splash-live-hud">
            {lines.map((line, i) => (
              <div key={`${line}-${i}`} className="splash-live-hud-line">
                {line}
              </div>
            ))}
          </div>
        ) : null}

        <div className="splash-live-progress">
          <div className="splash-live-bar-track">
            <div className="splash-live-bar-fill" style={{ width: `${active.percent}%` }} />
          </div>
          <div className="splash-live-progress-row">
            <span className="splash-live-status">
              <i className="splash-live-spinner" />
              {active.text}...
            </span>
            <span className="splash-live-percent">{active.percent}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
