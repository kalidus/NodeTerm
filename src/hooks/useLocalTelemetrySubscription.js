import { useEffect, useRef, useState } from 'react';
import { systemStatsService } from '../services/SystemStatsService';

/**
 * Suscribe a stats locales solo si el consumidor está visible.
 * Si la telemetría global está apagada, el servicio no consulta y entrega null.
 */
export function useLocalTelemetrySubscription({ active = true, enabled = true, onStats } = {}) {
  const [statusStats, setStatusStats] = useState(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [telemetryDisabled, setTelemetryDisabled] = useState(() => !systemStatsService.isTelemetryEnabled());
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  useEffect(() => {
    const applyDisabled = () => {
      setTelemetryDisabled(true);
      setStatusStats(null);
      setIsLoadingStats(false);
    };

    const syncTelemetry = (e) => {
      const isEnabled = e?.detail?.enabled !== undefined
        ? !!e.detail.enabled
        : systemStatsService.isTelemetryEnabled();
      if (!isEnabled) applyDisabled();
      else setTelemetryDisabled(false);
    };

    window.addEventListener('local-telemetry-enabled-changed', syncTelemetry);

    if (!active || !enabled) {
      return () => window.removeEventListener('local-telemetry-enabled-changed', syncTelemetry);
    }

    if (!systemStatsService.isTelemetryEnabled()) {
      applyDisabled();
    } else {
      setTelemetryDisabled(false);
    }

    // Siempre suscribirse: el servicio no consulta si la telemetría está apagada,
    // y al reactivarla reanuda el muestreo con los suscriptores existentes.
    const unsubscribe = systemStatsService.subscribe((stats) => {
      if (!systemStatsService.isTelemetryEnabled()) {
        applyDisabled();
        return;
      }
      if (!stats) return;
      setTelemetryDisabled(false);
      setStatusStats(stats);
      setIsLoadingStats(false);
      if (typeof onStatsRef.current === 'function') onStatsRef.current(stats);
    });

    return () => {
      window.removeEventListener('local-telemetry-enabled-changed', syncTelemetry);
      unsubscribe();
    };
  }, [active, enabled]);

  return { statusStats, isLoadingStats, telemetryDisabled };
}

export default useLocalTelemetrySubscription;
