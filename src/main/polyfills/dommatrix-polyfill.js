// ============================================
// POLYFILL DOMMatrix para jsdom en Node.js
// Debe cargarse ANTES de cualquier módulo que use jsdom
// ============================================

function initializeDOMMatrixPolyfill() {
  if (typeof global.DOMMatrix !== 'undefined') {
    return; // Ya está definido
  }

  try {
    // Intentar usar el polyfill de dommatrix si está disponible
    const dommatrix = require('dommatrix');
    // El paquete dommatrix exporta directamente una función constructor
    if (typeof dommatrix === 'function') {
      global.DOMMatrix = dommatrix;
      global.DOMMatrixReadOnly = dommatrix;
    } else if (dommatrix.DOMMatrix) {
      global.DOMMatrix = dommatrix.DOMMatrix;
      global.DOMMatrixReadOnly = dommatrix.DOMMatrixReadOnly || dommatrix.DOMMatrix;
    } else {
      // Intentar destructuración
      const { DOMMatrix, DOMMatrixReadOnly } = dommatrix;
      global.DOMMatrix = DOMMatrix;
      global.DOMMatrixReadOnly = DOMMatrixReadOnly || DOMMatrix;
    }
  } catch (e) {
    // Si no está disponible, crear un polyfill completo
    class DOMMatrixPolyfill {
      constructor(init) {
        if (typeof init === 'string') {
          const values = init.match(/matrix\(([^)]+)\)/);
          if (values) {
            const nums = values[1].split(',').map(Number);
            this.a = nums[0] || 1;
            this.b = nums[1] || 0;
            this.c = nums[2] || 0;
            this.d = nums[3] || 1;
            this.e = nums[4] || 0;
            this.f = nums[5] || 0;
          } else {
            this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
          }
        } else if (init && typeof init === 'object') {
          this.a = init.a ?? 1;
          this.b = init.b ?? 0;
          this.c = init.c ?? 0;
          this.d = init.d ?? 1;
          this.e = init.e ?? 0;
          this.f = init.f ?? 0;
        } else {
          this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
        }
      }
      
      // Métodos estándar de DOMMatrix
      static fromMatrix(other) {
        return new DOMMatrixPolyfill(other);
      }
      
      static fromFloat32Array(array) {
        if (array.length >= 6) {
          return new DOMMatrixPolyfill({
            a: array[0], b: array[1],
            c: array[2], d: array[3],
            e: array[4], f: array[5]
          });
        }
        return new DOMMatrixPolyfill();
      }
    }
    
    global.DOMMatrix = DOMMatrixPolyfill;
    global.DOMMatrixReadOnly = DOMMatrixPolyfill;
  }
  
  // Asegurar que también esté en window si existe
  if (typeof global.window !== 'undefined') {
    global.window.DOMMatrix = global.DOMMatrix;
    global.window.DOMMatrixReadOnly = global.DOMMatrixReadOnly;
  }
}

module.exports = { initializeDOMMatrixPolyfill };
