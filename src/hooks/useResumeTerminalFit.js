import { useEffect, useRef } from 'react';

/** Tras salir del zoom, el panel vuelve a tener tamaño y hay que hacer fit. */
export function useResumeTerminalFit(layoutSuspended, fit) {
  const sawHiddenRef = useRef(false);
  const fitRef = useRef(fit);
  fitRef.current = fit;
  useEffect(() => {
    if (layoutSuspended) {
      sawHiddenRef.current = true;
      return undefined;
    }
    if (!sawHiddenRef.current) return undefined;
    sawHiddenRef.current = false;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        try { fitRef.current?.(); } catch (_) { /* noop */ }
      });
    });
    return () => {
      cancelAnimationFrame(outer);
      if (inner) cancelAnimationFrame(inner);
    };
  }, [layoutSuspended]);
}
