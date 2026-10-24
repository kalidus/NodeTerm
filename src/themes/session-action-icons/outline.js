import React from 'react';

const theme = {
  name: 'Outline',
  description: 'Iconos outline minimalistas con estilo lineal',
  icons: {
    // Icono de nueva conexión (servidor/base de datos conectado a red)
    newConnection: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Pila de servidor/base de datos - tres cilindros horizontales más grandes y centrados */}
          {/* Cilindro superior */}
          <ellipse cx="12" cy="4.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="5.5" y1="4.5" x2="18.5" y2="4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Cilindro medio */}
          <ellipse cx="12" cy="8.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="5.5" y1="8.5" x2="18.5" y2="8.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Cilindro inferior */}
          <ellipse cx="12" cy="12.5" rx="6.5" ry="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="5.5" y1="12.5" x2="18.5" y2="12.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Línea vertical de conexión */}
          <line x1="12" y1="15" x2="12" y2="17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Línea horizontal de red */}
          <line x1="2" y1="19.5" x2="22" y2="19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          {/* Tres nodos cuadrados en la red - más grandes y centrados */}
          <rect x="2" y="18.5" width="3" height="3" fill="currentColor" />
          <rect x="10.5" y="18.5" width="3" height="3" fill="currentColor" />
          <rect x="19" y="18.5" width="3" height="3" fill="currentColor" />
        </svg>,
    // Icono de nueva carpeta (carpeta con lupa superpuesta en la parte frontal)
    newFolder: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Carpeta estándar - más grande */}
          <path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M2 6l2-2h5l2 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Líneas decorativas en la carpeta */}
          <line x1="6" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          <line x1="6" y1="14" x2="14" y2="14" stroke="currentColor" strokeWidth="1.5" opacity="0.5" strokeLinecap="round" />
          {/* Lupa superpuesta en la parte frontal de la carpeta - más grande */}
          <circle cx="15.5" cy="10.5" r="3" stroke="currentColor" strokeWidth="2" fill="none" />
          <line x1="17.5" y1="12.5" x2="19.5" y2="14.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    // Icono de nuevo grupo (cuadrícula 3x3 de 9 cuadrados pequeños rellenos)
    newGroup: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Cuadrícula 3x3 - 9 cuadrados más grandes y mejor espaciados */}
          <rect x="2.5" y="2.5" width="5" height="5" fill="currentColor" />
          <rect x="9.5" y="2.5" width="5" height="5" fill="currentColor" />
          <rect x="16.5" y="2.5" width="5" height="5" fill="currentColor" />
          <rect x="2.5" y="9.5" width="5" height="5" fill="currentColor" />
          <rect x="9.5" y="9.5" width="5" height="5" fill="currentColor" />
          <rect x="16.5" y="9.5" width="5" height="5" fill="currentColor" />
          <rect x="2.5" y="16.5" width="5" height="5" fill="currentColor" />
          <rect x="9.5" y="16.5" width="5" height="5" fill="currentColor" />
          <rect x="16.5" y="16.5" width="5" height="5" fill="currentColor" />
        </svg>,
    // Icono de gestor de contraseñas (llave)
    passwordManager: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Anillo de la llave - más grande */}
          <circle cx="8.5" cy="12" r="4" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Cuerpo de la llave - más grande */}
          <rect x="8.5" y="9.5" width="9" height="5" rx="2.5" stroke="currentColor" strokeWidth="2" fill="none" />
          {/* Dientes de la llave - más grandes y detallados */}
          <rect x="11.5" y="7" width="2" height="2.5" rx="1" fill="currentColor" />
          <rect x="13.5" y="8.5" width="2" height="2.5" rx="1" fill="currentColor" />
          <rect x="15.5" y="14.5" width="2" height="2.5" rx="1" fill="currentColor" />
          {/* Brillo decorativo en el anillo */}
          <circle cx="8.5" cy="12" r="2" fill="currentColor" opacity="0.3" />
        </svg>,
    // Icono de colapsar (chevron izquierdo angular - flecha angular apuntando a la izquierda)
    collapseLeft: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
        </svg>,
    // Icono de expandir (chevron derecho)
    expandRight: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    // Icono de menú (tres líneas horizontales)
    menu: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>,
    // Icono de expandir todo
    expandAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 13l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M7 6l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    // Icono de colapsar todo
    collapseAll: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M17 11l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M17 18l-5-5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>,
    // Icono de configuración
    settings: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <path d="M12 1v6m0 6v6M23 12h-6m-6 0H1M19.07 4.93l-4.24 4.24m0 2.83l4.24 4.24M4.93 19.07l4.24-4.24m0-2.83L4.93 4.93" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>,
    treeTheme: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M20 12h-8m0 0V5m0 7v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <rect x="4" y="10" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="16" y="4" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
          <rect x="16" y="16" width="4" height="4" rx="1" stroke="currentColor" strokeWidth="2" />
        </svg>
  }
};

export default theme;
