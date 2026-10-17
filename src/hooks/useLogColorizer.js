import { useCallback, useEffect, useRef } from 'react';
import { createLogColorizer, isSshLogHighlightEnabled } from '../utils/logColorizer';

/**
 * @param {React.MutableRefObject} termRef
 * @param {React.MutableRefObject} writeBufferRef
 * @param {React.MutableRefObject<boolean>} [activeRef] - reservado; el paint lo controla writeBuffer.setActive
 *
 * Siempre coloriza al encolar. Las tabs ocultas no pintan GPU (writeBuffer inactive),
 * pero el texto ya lleva SGR para cuando se reactive o se drenen buffers.
 */
export function useLogColorizer(termRef, writeBufferRef, activeRef) {
  const colorizerRef = useRef(null);

  useEffect(() => {
    const writeColored = (data) => {
      if (!data) return;
      if (writeBufferRef.current) {
        writeBufferRef.current.write(data);
      } else if (!activeRef || activeRef.current) {
        termRef.current?.write(data);
      }
    };
    const colorizer = createLogColorizer({
      enabled: isSshLogHighlightEnabled(),
      onPending: writeColored
    });
    colorizerRef.current = colorizer;
    const onSettings = (e) => {
      if (e.detail && typeof e.detail.sshLogHighlight === 'boolean') {
        colorizer.setEnabled(e.detail.sshLogHighlight);
      }
    };
    window.addEventListener('terminal-settings-changed', onSettings);
    return () => {
      window.removeEventListener('terminal-settings-changed', onSettings);
      writeColored(colorizer.flush());
      colorizer.destroy();
      if (colorizerRef.current === colorizer) {
        colorizerRef.current = null;
      }
    };
  }, [termRef, writeBufferRef, activeRef]);

  const push = useCallback((data) => {
    if (!data) return;

    if (!colorizerRef.current) {
      colorizerRef.current = createLogColorizer({
        enabled: isSshLogHighlightEnabled(),
        onPending: (pending) => {
          if (!pending) return;
          if (writeBufferRef.current) writeBufferRef.current.write(pending);
          else termRef.current?.write(pending);
        }
      });
    }
    const out = colorizerRef.current.push(data);
    if (!out) return;
    if (writeBufferRef.current) {
      writeBufferRef.current.write(out);
    } else {
      termRef.current?.write(out);
    }
  }, [termRef, writeBufferRef]);

  const flushPending = useCallback(() => {
    const rest = colorizerRef.current?.flush();
    if (!rest) return;
    if (writeBufferRef.current) {
      writeBufferRef.current.write(rest);
    } else {
      termRef.current?.write(rest);
    }
  }, [termRef, writeBufferRef]);

  return { push, flushPending };
}
