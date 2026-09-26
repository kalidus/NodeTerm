import { useCallback, useEffect, useRef } from 'react';
import { createLogColorizer, isSshLogHighlightEnabled } from '../utils/logColorizer';

export function useLogColorizer(termRef, writeBufferRef) {
  const colorizerRef = useRef(null);

  useEffect(() => {
    const writeColored = (data) => {
      if (!data) return;
      if (writeBufferRef.current) {
        writeBufferRef.current.write(data);
      } else {
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
  }, [termRef, writeBufferRef]);

  const push = useCallback((data) => {
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
