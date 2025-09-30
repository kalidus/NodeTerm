// Animación Matrix simple y segura
// Genera múltiples caracteres cayendo por toda la barra de título

export function initSimpleMatrixAnimation() {
  const titleBar = document.querySelector('.title-bar[data-animation="matrix"]');
  if (!titleBar) return;

  // Limpiar animación anterior si existe
  cleanupMatrixAnimation();

  // Obtener velocidad de animación del tema
  const animationSpeed = titleBar.getAttribute('data-anim-speed') || 'normal';
  const speedMultiplier = getSpeedMultiplier(animationSpeed);

  // Crear contenedor para los caracteres
  const matrixContainer = document.createElement('div');
  matrixContainer.className = 'matrix-rain-container';
  matrixContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 1000;
  `;

  titleBar.appendChild(matrixContainer);

  // Establecer variable CSS para el color verde
  titleBar.style.setProperty('--matrix-color', '#00ff41');

  // Caracteres del Matrix
  const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

  // Crear múltiples columnas de caracteres
  const numColumns = 15; // Número de columnas
  const columnWidth = 100 / numColumns;

  for (let i = 0; i < numColumns; i++) {
    createMatrixColumn(matrixContainer, i, columnWidth, matrixChars, speedMultiplier, '#00ff41');
  }
}

export function initSimpleMatrixBlueAnimation() {
  const titleBar = document.querySelector('.title-bar[data-animation="matrix-blue"]');
  if (!titleBar) return;

  // Limpiar animación anterior si existe
  cleanupMatrixAnimation();

  // Obtener velocidad de animación del tema
  const animationSpeed = titleBar.getAttribute('data-anim-speed') || 'normal';
  const speedMultiplier = getSpeedMultiplier(animationSpeed);

  // Crear contenedor para los caracteres
  const matrixContainer = document.createElement('div');
  matrixContainer.className = 'matrix-rain-container';
  matrixContainer.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    pointer-events: none;
    z-index: 1000;
  `;

  titleBar.appendChild(matrixContainer);

  // Establecer variable CSS para el color azul
  titleBar.style.setProperty('--matrix-color', '#0080ff');

  // Caracteres del Matrix
  const matrixChars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzアイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

  // Crear múltiples columnas de caracteres
  const numColumns = 15; // Número de columnas
  const columnWidth = 100 / numColumns;

  for (let i = 0; i < numColumns; i++) {
    createMatrixColumn(matrixContainer, i, columnWidth, matrixChars, speedMultiplier, '#0080ff');
  }
}

function getSpeedMultiplier(speed) {
  switch (speed) {
    case 'slow': return 4.0;    // 4x más lento (muy lento)
    case 'fast': return 0.5;    // 2x más rápido
    case 'normal': 
    default: return 2.0;        // Velocidad normal más lenta
  }
}

function createMatrixColumn(container, index, columnWidth, chars, speedMultiplier, color) {
  const column = document.createElement('div');
  column.className = `matrix-column-${index}`;
  column.style.cssText = `
    position: absolute;
    top: -20px;
    left: ${index * columnWidth}%;
    width: ${columnWidth}%;
    height: 100px;
    overflow: hidden;
    pointer-events: none;
  `;

  container.appendChild(column);

  // Crear caracteres cayendo en esta columna
  createFallingChars(column, chars, index, speedMultiplier, color);
}

function createFallingChars(column, chars, columnIndex, speedMultiplier, color) {
  const numChars = 15; // Más caracteres por columna (era 8, ahora 15)
  const charDelay = columnIndex * 300; // Delay escalonado por columna (más tiempo)
  
  // Calcular duración base y aplicar multiplicador de velocidad
  const baseDuration = 8 + Math.random() * 4; // 8-12 segundos base (más lento)
  const adjustedDuration = baseDuration * speedMultiplier;

  for (let i = 0; i < numChars; i++) {
    const char = document.createElement('div');
    char.className = 'matrix-char';
    char.textContent = chars[Math.floor(Math.random() * chars.length)];
    char.style.cssText = `
      position: absolute;
      top: ${-20 - (i * 12)}px;
      left: 0;
      color: ${color};
      font-family: 'Courier New', monospace;
      font-size: 12px;
      font-weight: bold;
      text-shadow: 0 0 8px ${color}, 0 0 16px ${color}, 0 0 24px ${color}, 0 0 32px ${color};
      animation: matrixCharFall ${adjustedDuration}s linear infinite ${charDelay + (i * 150)}ms;
      pointer-events: none;
    `;

    column.appendChild(char);
  }
}

// Agregar estilos CSS para la animación
function addMatrixStyles() {
  if (document.getElementById('simple-matrix-styles')) return;

  const style = document.createElement('style');
  style.id = 'simple-matrix-styles';
  style.textContent = `
    @keyframes matrixCharFall {
      0% {
        transform: translateY(-150px);
        opacity: 0;
        text-shadow: 0 0 8px var(--matrix-color, #00ff41), 0 0 16px var(--matrix-color, #00ff41), 0 0 24px var(--matrix-color, #00ff41), 0 0 32px var(--matrix-color, #00ff41);
      }
      5% {
        opacity: 0.3;
        text-shadow: 0 0 6px var(--matrix-color, #00ff41), 0 0 12px var(--matrix-color, #00ff41), 0 0 18px var(--matrix-color, #00ff41), 0 0 24px var(--matrix-color, #00ff41);
      }
      15% {
        opacity: 1;
        text-shadow: 0 0 10px var(--matrix-color, #00ff41), 0 0 20px var(--matrix-color, #00ff41), 0 0 30px var(--matrix-color, #00ff41), 0 0 40px var(--matrix-color, #00ff41);
      }
      25% {
        opacity: 1;
        text-shadow: 0 0 8px var(--matrix-color, #00ff41), 0 0 16px var(--matrix-color, #00ff41), 0 0 24px var(--matrix-color, #00ff41), 0 0 32px var(--matrix-color, #00ff41);
      }
      75% {
        opacity: 0.9;
        text-shadow: 0 0 6px var(--matrix-color, #00ff41), 0 0 12px var(--matrix-color, #00ff41), 0 0 18px var(--matrix-color, #00ff41), 0 0 24px var(--matrix-color, #00ff41);
      }
      85% {
        opacity: 0.7;
        text-shadow: 0 0 4px var(--matrix-color, #00ff41), 0 0 8px var(--matrix-color, #00ff41), 0 0 12px var(--matrix-color, #00ff41), 0 0 16px var(--matrix-color, #00ff41);
      }
      95% {
        opacity: 0.3;
        text-shadow: 0 0 2px var(--matrix-color, #00ff41), 0 0 4px var(--matrix-color, #00ff41), 0 0 6px var(--matrix-color, #00ff41), 0 0 8px var(--matrix-color, #00ff41);
      }
      100% {
        transform: translateY(150px);
        opacity: 0;
        text-shadow: 0 0 1px var(--matrix-color, #00ff41), 0 0 2px var(--matrix-color, #00ff41), 0 0 3px var(--matrix-color, #00ff41), 0 0 4px var(--matrix-color, #00ff41);
      }
    }
  `;

  document.head.appendChild(style);
}

export function cleanupMatrixAnimation() {
  // Remover contenedor de animación Matrix
  const existingContainer = document.querySelector('.matrix-rain-container');
  if (existingContainer) {
    existingContainer.remove();
  }
}

// Inicializar estilos cuando se carga el módulo
addMatrixStyles();
