import React from 'react';
import appIcon from '../assets/app-icon.png';

/**
 * Icono de la aplicación NodeTerm para la shell local (cygwin) y selectores.
 * @param {object} props
 * @param {number} [props.size=14]
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 * @param {string} [props.alt='']
 */
const NodeTermAppIcon = ({ size = 14, className, style, alt = '' }) => (
  <img
    src={appIcon}
    alt={alt}
    className={className}
    style={{
      width: size,
      height: size,
      flexShrink: 0,
      objectFit: 'contain',
      borderRadius: 3,
      display: 'inline-block',
      verticalAlign: 'middle',
      ...style,
    }}
  />
);

export default NodeTermAppIcon;
export { appIcon };
