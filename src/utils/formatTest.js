/**
 * Utilidad para probar el sistema de corrección de formato
 * Simula el problema de formato degradado que se ve en la imagen
 */

import { markdownFormatter } from '../services/MarkdownFormatter';

// Contenido simulado que reproduce el problema de la imagen
const problematicContent = `# Medidor de Temperaturas en Python

## Slide 1: Introducción
* Título: Medidor de Temperaturas
* Objetivo: 
  - Permita medir temperaturas en diferentes escalas
  - Convertir entre escalas
  - Registrar los datos en un archivo CSV
* Herramientas:
  - Python
  - Módulos: \`time\`, \`csv\`

## Slide 2: Funcionamiento del Script
\`\`\`python
def convertir_temperatura(temp, unidad):
    # Conversión entre diferentes escalas
    if unidad == 'C':
        return temp
    elif unidad == 'F':
        return (temp - 32) * 5/9
    elif unidad == 'K':
        return temp - 273.15
\`\`\`

Slide 3: Conversión de Temperaturas
Celsius (°C) a Kelvin (K):
K = °C + 273.15
Fahrenheit (°F) a Celsius (°C):
°C = (°F - 32) × 5/9
Kelvin (K) a Fahrenheit (°F):
°F = (K x 9/5) - 459.67

Slide 4: Ejemplo de Conversión
Temperatura inicial: 25°C
Conversión a Kelvin: 25 + 273.15 = 298.15K
Conversión a Fahrenheit: (25 × 9/5) + 32 = 77°F`;

/**
 * Probar la corrección de formato
 */
export function testFormatCorrection() {
  console.log('🧪 Probando corrección de formato...');
  
  // Procesar el contenido problemático
  const result = markdownFormatter.processContent(problematicContent);
  
  console.log('📊 Análisis del contenido:');
  console.log('- Tiene problemas:', result.analysis.hasIssues);
  console.log('- Total de problemas:', result.analysis.totalIssues);
  console.log('- Tipos de problemas:', result.analysis.issues.map(i => i.type));
  console.log('- ¿Fue corregido?:', result.wasFixed);
  
  console.log('\n📝 Contenido original (primeros 200 caracteres):');
  console.log(result.original.substring(0, 200) + '...');
  
  console.log('\n✅ Contenido corregido (primeros 200 caracteres):');
  console.log(result.fixed.substring(0, 200) + '...');
  
  return result;
}

/**
 * Probar casos específicos del problema
 */
export function testSpecificCases() {
  const testCases = [
    {
      name: 'Slide sin formato',
      input: 'Slide 3: Conversión de Temperaturas',
      expected: '## Slide 3: Conversión de Temperaturas'
    },
    {
      name: 'Fórmula sin formato',
      input: 'K = °C + 273.15',
      expected: '`K = °C + 273.15`'
    },
    {
      name: 'Lista sin viñetas',
      input: 'Celsius (°C) a Kelvin (K):',
      expected: '- **Celsius (°C) a Kelvin (K):**'
    }
  ];
  
  console.log('🧪 Probando casos específicos...');
  
  testCases.forEach(testCase => {
    const result = markdownFormatter.processContent(testCase.input);
    const passed = result.fixed.includes(testCase.expected);
    
    console.log(`\n📋 ${testCase.name}:`);
    console.log(`   Entrada: "${testCase.input}"`);
    console.log(`   Salida: "${result.fixed}"`);
    console.log(`   Esperado: "${testCase.expected}"`);
    console.log(`   ✅ ${passed ? 'PASÓ' : 'FALLÓ'}`);
  });
}

// Exportar para uso en consola del navegador
if (typeof window !== 'undefined') {
  window.testFormatCorrection = testFormatCorrection;
  window.testSpecificCases = testSpecificCases;
}
