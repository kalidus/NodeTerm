/**
 * Script para medir el uso de RAM de NodeTerm
 * 
 * Cómo usar:
 * 1. Abre el Administrador de Tareas de Windows (Ctrl+Shift+Esc)
 * 2. Ve a la pestaña "Detalles"
 * 3. Busca "NodeTerm.exe" o "electron.exe"
 * 4. Anota el valor de "Memoria (conjunto de trabajo privado)"
 * 
 * O usa este script desde la consola del navegador (DevTools):
 * - Abre DevTools (F12)
 * - Ve a la consola
 * - Pega y ejecuta el código de abajo
 */

// Función para medir memoria del proceso actual (renderer)
function measureMemory() {
  if (performance.memory) {
    const memory = performance.memory;
    return {
      used: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      total: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2) + ' MB',
      limit: (memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2) + ' MB'
    };
  }
  return { error: 'performance.memory no disponible en este navegador' };
}

// Función para contar terminales activos
function countActiveTerminals() {
  const terminals = document.querySelectorAll('.xterm');
  return terminals.length;
}

// Función principal de medición
function testRAMUsage() {
  console.log('=== MEDICIÓN DE RAM - NodeTerm ===');
  console.log('Fecha:', new Date().toLocaleString());
  console.log('');
  
  const memory = measureMemory();
  console.log('Memoria del Renderer (JavaScript Heap):');
  console.log('  - Usada:', memory.used || memory.error);
  console.log('  - Total:', memory.total || 'N/A');
  console.log('  - Límite:', memory.limit || 'N/A');
  console.log('');
  
  const terminalCount = countActiveTerminals();
  console.log('Terminales activos:', terminalCount);
  console.log('');
  
  console.log('💡 TIPS:');
  console.log('1. Abre el Administrador de Tareas (Ctrl+Shift+Esc)');
  console.log('2. Busca "NodeTerm.exe" o "electron.exe"');
  console.log('3. Revisa "Memoria (conjunto de trabajo privado)"');
  console.log('4. Compara antes y después de las optimizaciones');
  console.log('');
  console.log('📊 Optimizaciones aplicadas:');
  console.log('  ✅ Scrollback reducido: 10000 → 1000 líneas (ahorro ~90%)');
  console.log('  ✅ Polling SystemStats: 5s → 10s (menos CPU)');
  console.log('');
  
  return { memory, terminalCount };
}

// Ejecutar automáticamente
testRAMUsage();

// Exportar para uso manual
if (typeof window !== 'undefined') {
  window.testRAMUsage = testRAMUsage;
  window.measureMemory = measureMemory;
  window.countActiveTerminals = countActiveTerminals;
}
