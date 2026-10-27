import React, { useEffect, useState } from 'react';

/** Visor de texto plano y código, con ajuste de línea conmutable. */
const TextViewer = ({ text, onControlsChange }) => {
  const [wrapped, setWrapped] = useState(false);

  useEffect(() => {
    if (typeof onControlsChange !== 'function') return undefined;
    onControlsChange([
      {
        id: 'wrap',
        icon: 'pi pi-align-left',
        title: 'Ajustar líneas',
        active: wrapped,
        onClick: () => setWrapped((w) => !w)
      }
    ]);
    return () => onControlsChange([]);
  }, [onControlsChange, wrapped]);

  return <pre className={`library-viewer__text${wrapped ? ' is-wrapped' : ''}`}>{text}</pre>;
};

export default React.memo(TextViewer);
