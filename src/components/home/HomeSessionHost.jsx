import React, { useEffect, useRef } from 'react';
import { setHomeSessionHostElement, setHomeSessionHostOptions } from '../../utils/homeSessionHostBus';

export default function HomeSessionHost({
  terminalFrameStyle = 'macos',
  snapToGrid = true,
  smartSnap = true,
  frameBackground = null
}) {
  const ref = useRef(null);

  useEffect(() => {
    setHomeSessionHostElement(ref.current);
    return () => setHomeSessionHostElement(null);
  }, []);

  useEffect(() => {
    setHomeSessionHostOptions({
      terminalFrameStyle,
      snapToGrid,
      smartSnap,
      frameBackground
    });
  }, [terminalFrameStyle, snapToGrid, smartSnap, frameBackground]);

  return (
    <div
      ref={ref}
      className="home-session-host"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    />
  );
}
