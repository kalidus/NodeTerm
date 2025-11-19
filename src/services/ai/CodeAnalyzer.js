import debugLogger from '../../utils/debugLogger';

/**
 * CodeAnalyzer - Análisis y evaluación de código
 * 
 * Este módulo contiene métodos para:
 * - Calcular significancia del código
 * - Generar nombres de archivos descriptivos
 * - Extraer información del código (funciones, títulos, propósito)
 * - Validar relevancia del código al contexto
 */

class CodeAnalyzer {
  isSignificantCode(code, language) {
  // Criterios más flexibles para detectar scripts completos
  const minLength = 20; // Muy bajo para scripts pequeños pero completos
  const lines = code.split('\n');
  const lineCount = lines.length;
  
  // Para Python, ser más inclusivo con scripts de prueba
  if (language === 'python') {
    const hasPythonStructure = (
      code.includes('def ') || 
      code.includes('class ') || 
      code.includes('import ') ||
      code.includes('if __name__') ||
      code.includes('main()') ||
      code.includes('assert ') ||
      code.includes('print(') ||
      code.includes('for ') ||
      code.includes('if ') ||
      code.includes('while ') ||
      code.includes('try:') ||
      code.includes('except:') ||
      code.includes('input(') ||
      code.includes('return ')
    );
    
    // Un script Python es significativo si:
    // 1. Tiene estructura Python Y (es suficientemente largo O tiene múltiples líneas)
    // 2. O es un script completo con main() o if __name__
    const isCompleteScript = code.includes('if __name__') || code.includes('main()');
    const hasGoodLength = code.length > minLength;
    const hasMultipleLines = lineCount > 2;
    
    return hasPythonStructure && (isCompleteScript || (hasGoodLength && hasMultipleLines));
  }
  
  // Para otros lenguajes, mantener criterios más estrictos
  const hasStructure = (
    code.includes('import ') || 
    code.includes('def ') || 
    code.includes('class ') || 
    code.includes('function ') || 
    code.includes('const ') || 
    code.includes('let ') || 
    code.includes('var ') ||
    code.includes('public class') ||
    code.includes('#include') ||
    code.includes('package ') ||
    code.includes('export ') ||
    code.includes('module.exports') ||
    code.includes('require(') ||
    code.includes('from ') ||
    code.includes('@') // Decoradores
  );
  
  const hasContent = code.length > minLength;
  const hasMultipleLines = lineCount > 3;
  
  return hasStructure && hasContent && hasMultipleLines;
}

/**
 * Calcular la significancia del código para seleccionar el mejor
 */
calculateCodeSignificance(code, language) {
  let score = 0;
  
  // Puntuación base por longitud (más código = más significativo)
  score += Math.min(code.length / 100, 10);
  
  // Puntuación por estructura - más específica para Python
  const structureKeywords = {
    'python': [
      'def ', 'class ', 'import ', 'if __name__', 'main()',
      'assert ', 'print(', 'for ', 'if ', 'while ', 'try:', 'except:',
      'return ', 'yield ', 'lambda ', 'with ', 'as '
    ],
    'javascript': ['function', 'const ', 'class ', 'export ', 'import '],
    'java': ['public class', 'public static void main', 'import '],
    'cpp': ['int main', 'class ', '#include']
  };
  
  const keywords = structureKeywords[language] || structureKeywords['python'];
  keywords.forEach(keyword => {
    if (code.includes(keyword)) {
      score += 2;
    }
  });
  
  // Puntuación especial para scripts Python completos
  if (language === 'python') {
    // Script completo con main
    if (code.includes('if __name__') && code.includes('main()')) {
      score += 10; // Puntuación alta para scripts completos
    }
    
    // Script con funciones definidas
    if (code.includes('def ')) {
      score += 5;
    }
    
    // Script con pruebas (assert)
    if (code.includes('assert ')) {
      score += 3;
    }
    
    // Script con bucles o condicionales
    if (code.includes('for ') || code.includes('while ') || code.includes('if ')) {
      score += 2;
    }
    
    // Script con manejo de errores
    if (code.includes('try:') || code.includes('except:')) {
      score += 2;
    }
    
    // Script con input del usuario
    if (code.includes('input(')) {
      score += 2;
    }
  }
  
  // Puntuación por funcionalidad específica
  const functionalityKeywords = {
    'python': ['random', 'randint', 'suma', 'resta', 'multiplicacion', 'division', 'celsius', 'fahrenheit', 'prueba', 'test'],
    'javascript': ['express', 'react', 'vue', 'angular', 'api', 'server'],
    'java': ['@SpringBootApplication', '@RestController', '@Service', '@Entity'],
    'cpp': ['iostream', 'vector', 'string', 'algorithm']
  };
  
  const funcKeywords = functionalityKeywords[language] || functionalityKeywords['python'];
  funcKeywords.forEach(keyword => {
    if (code.toLowerCase().includes(keyword.toLowerCase())) {
      score += 3;
    }
  });
  
  // Puntuación por comentarios y documentación
  const commentCount = (code.match(/#|\/\/|\/\*/g) || []).length;
  score += Math.min(commentCount, 5);
  
  // Puntuación por líneas de código
  const lineCount = code.split('\n').length;
  score += Math.min(lineCount / 10, 5);
  
  return score;
}

/**
 * Verificar si se debe crear un archivo (evitar duplicados innecesarios)
 */
shouldCreateFile(code, language, existingFiles) {
          const extension = this.getLanguageExtension(language);
  
  // Si ya hay archivos del mismo tipo, ser más selectivo
  const sameTypeFiles = existingFiles.filter(f => f.endsWith(`.${extension}`));
  if (sameTypeFiles.length >= 1) {
    // Solo crear si es realmente único o importante
    return this.isUniqueCode(code, language) || this.isImportantCode(code, language);
  }
  
  // Si es el primer archivo de este tipo, permitir si es significativo
  return this.isSignificantCode(code, language);
}

/**
 * Verificar si el código es único (no duplicado)
 */
isUniqueCode(code, language) {
  // Buscar características únicas del código
  const uniquePatterns = {
    'python': [/def\s+\w+/, /class\s+\w+/, /import\s+\w+/],
    'javascript': [/function\s+\w+/, /const\s+\w+/, /class\s+\w+/],
    'java': [/public\s+class\s+\w+/, /public\s+static\s+void\s+main/],
    'cpp': [/int\s+main\s*\(/, /class\s+\w+/, /#include/]
  };
  
  const patterns = uniquePatterns[language] || [];
  return patterns.some(pattern => pattern.test(code));
}

/**
 * Verificar si el código es importante (merece ser archivo)
 */
isImportantCode(code, language) {
  const importantKeywords = {
    'python': ['def ', 'class ', 'import ', 'if __name__'],
    'javascript': ['function', 'const ', 'class ', 'export '],
    'java': ['public class', 'public static void main'],
    'cpp': ['int main', 'class ', '#include'],
    'html': ['<!DOCTYPE', '<html', '<head', '<body'],
    'css': ['@media', '@keyframes', 'body', 'html'],
    'sql': ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE']
  };
  
  const keywords = importantKeywords[language] || [];
  return keywords.some(keyword => code.includes(keyword));
}

/**
 * Generar nombre de archivo descriptivo basado en el contenido del código
 */
generateDescriptiveFileName(code, language, index, userMessage = '') {
  const extension = this.getLanguageExtension(language);
  
  // FILTRO ESPECIAL: Para bash/sh, diferenciar entre comandos simples y scripts
  if (language === 'bash' || language === 'shell' || language === 'sh') {
    // Si es un comando simple (una línea o pocas líneas de comandos), IGNORAR
    const lines = code.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
    
    // Verificar si es un script real (tiene estructura de script)
    const isRealScript = code.includes('#!/') || // Shebang
                        code.includes('function ') || // Definición de función
                        code.includes('for ') || // Loops
                        code.includes('while ') ||
                        code.includes('if ') || // Condicionales
                        code.includes('case ') ||
                        lines.length > 3; // Más de 3 líneas de verdadero código
    
    // Si es solo comandos simples (una o dos líneas), NO generar archivo
    if (!isRealScript && lines.length <= 2) {
      return null; // Retornar null para ignorar este bloque
    }
  }
  
  // 1. PRIMERO: Intentar generar nombre basado en la solicitud del usuario
  const nameFromUserRequest = this.extractNameFromUserRequest(userMessage, language);
  if (nameFromUserRequest) {
    return `${nameFromUserRequest}.${extension}`;
  }
  
  // 2. Buscar títulos y descripciones en comentarios
  const titleFromComments = this.extractTitleFromComments(code, language);
  if (titleFromComments) {
    return `${titleFromComments}.${extension}`;
  }
  
  // 3. Buscar descripción del propósito en el contexto (más específico)
  const purposeFromContext = this.extractPurposeFromContext(code, language);
  if (purposeFromContext) {
    return `${purposeFromContext}.${extension}`;
  }
  
  // 4. Buscar patrones específicos de funcionalidad
  const functionalityName = this.extractFunctionalityName(code, language);
  if (functionalityName) {
    return `${functionalityName}.${extension}`;
  }
  
  // 5. Buscar nombres de funciones principales
  const mainFunctionName = this.extractMainFunctionName(code, language);
  if (mainFunctionName) {
    return `${mainFunctionName}.${extension}`;
  }
  
  // 6. Analizar el contenido del código para generar nombre descriptivo
  const contentBasedName = this.generateNameFromCodeContent(code, language, userMessage);
  if (contentBasedName) {
    return `${contentBasedName}.${extension}`;
  }
  
  // 7. Si no se encuentra nada descriptivo, usar un nombre genérico pero más específico
  const genericNames = {
    'python': 'script_python',
    'javascript': 'script_js',
    'typescript': 'script_ts',
    'java': 'script_java',
    'cpp': 'script_cpp',
    'c': 'script_c',
    'html': 'page_html',
    'css': 'styles_css',
    'sql': 'query_sql'
  };
  
  const baseName = genericNames[language] || 'script';
  return `${baseName}.${extension}`;
}

/**
 * Generar nombre basado en el contenido del código
 */
generateNameFromCodeContent(code, language, userMessage = '') {
  const codeLower = code.toLowerCase();
  const messageLower = userMessage.toLowerCase();
  
  // Patrones específicos para diferentes tipos de código
  if (codeLower.includes('csv') || messageLower.includes('csv')) {
    return 'procesar_csv';
  }
  if (codeLower.includes('pandas') || codeLower.includes('dataframe')) {
    return 'analisis_datos';
  }
  if (codeLower.includes('import csv') || codeLower.includes('csv.reader')) {
    return 'lector_csv';
  }
  if (codeLower.includes('def ') && codeLower.includes('csv')) {
    return 'funciones_csv';
  }
  if (codeLower.includes('class ') && codeLower.includes('csv')) {
    return 'clase_csv';
  }
  if (codeLower.includes('pandas') && codeLower.includes('read_csv')) {
    return 'pandas_csv';
  }
  if (codeLower.includes('to_excel') || codeLower.includes('excel')) {
    return 'exportar_excel';
  }
  if (codeLower.includes('json') && codeLower.includes('load')) {
    return 'procesar_json';
  }
  if (codeLower.includes('api') || codeLower.includes('requests')) {
    return 'cliente_api';
  }
  if (codeLower.includes('web') || codeLower.includes('scraping')) {
    return 'web_scraper';
  }
  if (codeLower.includes('database') || codeLower.includes('sql')) {
    return 'base_datos';
  }
  if (codeLower.includes('test') || codeLower.includes('unittest')) {
    return 'test_unitario';
  }
  if (codeLower.includes('main') && codeLower.includes('if __name__')) {
    return 'script_principal';
  }
  
  return null;
}

/**
 * Extraer nombre basado en la solicitud del usuario
 */
extractNameFromUserRequest(userMessage, language) {
  if (!userMessage) return null;
  
  const message = userMessage.toLowerCase();
  
  // Patrones de solicitudes comunes del usuario
  const requestPatterns = {
    'calculadora': ['calculadora', 'calculadora basica', 'operaciones basicas', 'sumar restar multiplicar dividir', 'calculadora simple'],
    'generador_numeros': ['generar numeros', 'numeros aleatorios', 'random', 'generar numero', 'numero aleatorio'],
    'sumador': ['sumar numeros', 'suma', 'sumar', 'suma de numeros'],
    'conversor_temperatura': ['conversor', 'temperatura', 'celsius fahrenheit', 'convertir temperatura'],
    'promedio': ['promedio', 'calcular promedio', 'media'],
    'manejador_archivos': ['manejar archivos', 'leer archivo', 'escribir archivo', 'archivos'],
    'web_scraper': ['scraper', 'web scraping', 'extraer datos', 'scraping'],
    'api_client': ['api', 'cliente api', 'llamar api', 'consumir api'],
    'base_datos': ['base de datos', 'database', 'sql', 'consulta'],
    'automatizacion': ['automatizar', 'automatizacion', 'tarea automatica', 'cron'],
    'escaner_redes': ['escanear redes', 'escanear red', 'redes locales', 'escanear dispositivos', 'red local', 'escanear red local', 'dispositivos red', 'redes', 'escanear'],
    'monitor_sistema': ['monitor', 'monitorear', 'sistema', 'recursos', 'cpu', 'memoria', 'disco'],
    'backup_archivos': ['backup', 'respaldo', 'copiar archivos', 'respaldo archivos'],
    'conversor_archivos': ['convertir archivos', 'conversor archivos', 'formato archivo'],
    'generador_passwords': ['generar contraseñas', 'passwords', 'contraseñas', 'generar password'],
    'analizador_logs': ['analizar logs', 'logs', 'analizar archivos log', 'log files']
  };
  
  // Buscar el patrón que mejor coincida con la solicitud del usuario
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [name, keywords] of Object.entries(requestPatterns)) {
    let score = 0;
    keywords.forEach(keyword => {
      if (message.includes(keyword)) {
        score += keyword.length; // Puntuación basada en la longitud de la palabra clave
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }
  
  // Solo devolver si hay una coincidencia significativa
  return bestScore > 5 ? bestMatch : null;
}

/**
 * Extraer nombre basado en la funcionalidad específica del código
 */
extractFunctionalityName(code, language) {
  const functionalityPatterns = {
    'python': {
      'generador_numeros': ['random', 'randint', 'aleatorio', 'generar_numero', 'numero_aleatorio'],
      'calculadora_basica': ['suma', 'resta', 'multiplicacion', 'division', 'calculadora', 'operaciones', 'opcion', 'elija'],
      'sumador_numeros': ['sumar', 'suma', 'numeros', 'cantidad', 'ingrese'],
      'promedio_numeros': ['promedio', 'calcular_promedio', 'numeros', 'promediar'],
      'conversor_temperatura': ['celsius', 'fahrenheit', 'convertir', 'temperatura', 'grados'],
      'manejador_archivos': ['open', 'read', 'write', 'file', 'path', 'os'],
      'web_scraper': ['requests', 'beautifulsoup', 'scrape', 'url', 'html'],
      'api_client': ['requests', 'api', 'http', 'get', 'post', 'json'],
      'base_datos': ['sqlite', 'mysql', 'postgres', 'database', 'db'],
      'automatizacion': ['schedule', 'cron', 'automate', 'task', 'job']
    },
    'javascript': {
      'web_app': ['express', 'react', 'vue', 'angular', 'dom', 'html'],
      'api_server': ['express', 'fastify', 'koa', 'api', 'server'],
      'procesador_datos': ['json', 'array', 'map', 'filter', 'reduce'],
      'utilidad': ['util', 'helper', 'common', 'shared', 'tool']
    },
    'java': {
      'aplicacion_spring': ['@SpringBootApplication', '@RestController', '@Service'],
      'modelo_datos': ['@Entity', '@Table', '@Column', 'model', 'entity'],
      'utilidad': ['util', 'helper', 'common', 'shared', 'tool']
    }
  };
  
  const patterns = functionalityPatterns[language] || functionalityPatterns['python'];
  
  // Buscar el patrón con más coincidencias
  let bestMatch = null;
  let bestScore = 0;
  
  for (const [name, keywords] of Object.entries(patterns)) {
    let score = 0;
    keywords.forEach(keyword => {
      if (code.toLowerCase().includes(keyword.toLowerCase())) {
        score++;
      }
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = name;
    }
  }
  
  // Solo devolver si hay al menos 2 coincidencias
  return bestScore >= 2 ? bestMatch : null;
}

/**
 * Extraer nombre de la función principal
 */
extractMainFunctionName(code, language) {
  const mainFunctionPatterns = {
    'python': [
      /def\s+(\w+)\s*\([^)]*\):/,  // def function_name():
      /def\s+main\s*\([^)]*\):/,   // def main():
      /def\s+(\w+)\s*\([^)]*\):\s*"""/  // def function_name(): """
    ],
    'javascript': [
      /function\s+(\w+)\s*\([^)]*\)/,  // function functionName()
      /const\s+(\w+)\s*=\s*\([^)]*\)\s*=>/,  // const functionName = () =>
      /export\s+(?:default\s+)?function\s+(\w+)/  // export function functionName
    ],
    'java': [
      /public\s+static\s+void\s+(\w+)\s*\([^)]*\)/,  // public static void methodName()
      /public\s+class\s+(\w+)/  // public class ClassName
    ]
  };
  
  const patterns = mainFunctionPatterns[language] || mainFunctionPatterns['python'];
  
  // Lista de nombres de funciones genéricas que no deben usarse
  const genericFunctionNames = [
    'main', 'test', 'example', 'demo', 'sample', 'temp', 'tmp', 'func', 'function', 'method'
  ];
  
  // Lista de nombres de funciones específicas que SÍ deben usarse
  const specificFunctionNames = [
    'fahrenheit_a_celsius', 'celsius_a_fahrenheit', 'conversor_temperatura',
    'calcular_promedio', 'verificar_par_impar', 'generar_contrasena'
  ];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      const functionName = match[1];
      if (functionName && 
          (specificFunctionNames.includes(functionName.toLowerCase()) ||
           (!genericFunctionNames.includes(functionName.toLowerCase()) && functionName.length > 3))) {
        return functionName.toLowerCase();
      }
    }
  }
  
  return null;
}

/**
 * Extraer título de markdown que aparece antes del bloque de código
 */
extractTitleFromMarkdown(content, blockStartPosition) {
  // Obtener el texto antes del bloque de código
  const textBeforeBlock = content.substring(0, blockStartPosition);
  
  // Buscar títulos markdown hacia atrás desde la posición del bloque
  const lines = textBeforeBlock.split('\n').reverse();
  
  for (let i = 0; i < Math.min(lines.length, 10); i++) { // Buscar hasta 10 líneas atrás
    const line = lines[i].trim();
    
    // Patrones de títulos markdown - CORREGIDOS según los logs reales
    const titlePatterns = [
      // **Script 1: Conversor de temperatura** (formato real de tus logs)
      /^\*\*Script\s*\d*:\s*(.+?)\*\*$/i,
      // **Ejemplo 1: Calculadora**
      /^\*\*Ejemplo\s*\d*:\s*(.+?)\*\*$/i,
      // ## Script 1: Par o Impar
      /^#+\s*Script\s*\d*:\s*(.+)$/i,
      // ## Ejemplo 1: Calculadora  
      /^#+\s*Ejemplo\s*\d*:\s*(.+)$/i,
      // ## 1. Conversor de temperatura
      /^#+\s*\d+\.\s*(.+)$/i,
      // ## Conversor de temperatura
      /^#+\s*([A-Z][^#\n]{3,100})$/i,
      // Script 1: Par o Impar (sin formato)
      /^Script\s*\d*:\s*(.+)$/i,
      // Ejemplo: Calculadora (sin formato) 
      /^Ejemplo\s*\d*:\s*(.+)$/i,
      // Casos específicos 
      /^(Juego\s+de\s+Adivina\s+el\s+Número)$/i,
      /^(Generador\s+de\s+números?\s+aleatorios?)$/i,
      /^(Conversor\s+de\s+temperatura)$/i,
      // Cualquier título descriptivo con palabras clave
      /^(.*(?:juego|generador|calculadora|conversor|sistema|programa).*[a-zA-Z\s]{5,60})$/i,
      // Título que empiece con mayúscula y tenga al menos 3 palabras
      /^([A-Z][a-z]+\s+[a-z]+\s+[A-Z][a-z]+.*?)$/i,
      // Título simple con palabras descriptivas
      /^([A-Z][a-zA-Z\s]{8,60})$/i
    ];
    
    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match && match[1]) {
        const titleText = match[1].trim();
        return this.sanitizeFileName(titleText);
      }
    }
    
    // Si encontramos una línea que no está vacía y no es un título, dejar de buscar
    if (line.length > 0 && !line.match(/^```/) && !line.match(/^\s*$/)) {
      break;
    }
  }
  
  return null;
}

/**
 * Convertir texto a nombre de archivo válido
 */
sanitizeFileName(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s\-]/g, '') // Remover caracteres especiales
    .replace(/\s+/g, '_') // Espacios a guiones bajos
    .replace(/_+/g, '_') // Múltiples guiones bajos a uno solo
    .replace(/^_|_$/g, '') // Remover guiones bajos al inicio y final
    .substring(0, 50); // Limitar longitud
}

/**
 * Extraer título de comentarios en el código
 */
extractTitleFromComments(code, language) {
  // Buscar títulos más específicos y descriptivos
  const titlePatterns = {
    'python': [
      /#\s*Ejemplo:\s*([^#\n]+)/,        // Ejemplo: Título
      /#\s*Script:\s*([^#\n]+)/,         // Script: Título
      /#\s*Programa:\s*([^#\n]+)/,       // Programa: Título
      /#\s*Calculadora\s+([^#\n]+)/,      // Calculadora Título
      /#\s*Sumador\s+([^#\n]+)/,         // Sumador Título
      /#\s*Conversor\s+([^#\n]+)/,       // Conversor Título
      /#\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
      /"""\s*([^"]{3,30})\s*"""/         // Docstrings
    ],
    'javascript': [
      /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
      /\/\/\s*Script:\s*([^\/\n]+)/,     // Script: Título
      /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
      /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
    ],
    'java': [
      /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
      /\/\/\s*Class:\s*([^\/\n]+)/,      // Class: Título
      /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
      /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
    ],
    'cpp': [
      /\/\/\s*Ejemplo:\s*([^\/\n]+)/,    // Ejemplo: Título
      /\/\/\s*Program:\s*([^\/\n]+)/,    // Program: Título
      /\/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,  // Títulos con mayúsculas
      /\/\*\s*([^*]{3,30})\s*\*\//       // Comentarios de bloque
    ]
  };
  
  const patterns = titlePatterns[language] || titlePatterns['python'];
  
  for (const pattern of patterns) {
    const match = code.match(pattern);
    if (match) {
      let title = match[1].trim();
      
      // Limpiar y formatear el título de manera más inteligente
      title = title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')  // Solo letras, números y espacios
        .replace(/\s+/g, '_')         // Espacios a guiones bajos
        .replace(/_+/g, '_')          // Múltiples guiones bajos a uno
        .replace(/^_|_$/g, '')        // Quitar guiones al inicio y final
        .substring(0, 30);           // Limitar longitud
      
      // Solo usar si es un título válido (no muy corto ni genérico)
      if (title.length > 3 && !this.isGenericTitle(title)) {
        return title;
      }
    }
  }
  
  return null;
}

/**
 * Verificar si un título es genérico y no debe usarse
 */
isGenericTitle(title) {
  const genericTitles = [
    'script', 'program', 'code', 'example', 'ejemplo',
    'import', 'definir', 'funcion', 'function', 'class',
    'main', 'principal', 'basic', 'basico', 'simple',
    'configuracion', 'configuracion de', 'configuracion de la',
    'configuracion de la interfaz', 'configuracion de la red',
    'configuracion de la red local', 'configuracion de la red local',
    'configuracion de la red local', 'configuracion de la red local'
  ];
  
  return genericTitles.some(generic => 
    title.toLowerCase().includes(generic) || 
    title.toLowerCase() === generic
  );
}

/**
 * Extraer propósito del contexto del código
 */
extractPurposeFromContext(code, language) {
  // Buscar palabras clave que indiquen el propósito específico
  const purposeKeywords = {
    'python': {
      'prueba_for': ['for ', 'frutas', 'bucle', 'iteracion', 'lista', 'append'],
      'verificador_par_impar': ['% 2', 'par', 'impar', 'numero % 2', 'es par', 'es impar'],
      'prueba_if': ['if ', 'condicional', 'assert', 'verificar', 'validar'],
      'prueba_while': ['while ', 'bucle', 'iteracion', 'condicion'],
      'prueba_funciones': ['def ', 'funcion', 'parametros', 'return'],
      'prueba_clases': ['class ', 'objeto', 'metodo', 'constructor'],
      'prueba_manejo_errores': ['try:', 'except:', 'error', 'excepcion'],
      'analizador_csv': ['csv', 'analizar', 'archivo', 'columnas', 'filas', 'frecuencia'],
      'lista_tareas': ['tareas', 'agregar', 'mostrar', 'pendientes', 'opcion', 'menu'],
      'calculadora_interactiva': ['calcular', 'operacion', 'ingrese', 'numeros', 'resultado'],
      'calculadora_basica': ['suma', 'resta', 'multiplicacion', 'division', 'calculadora', 'operaciones'],
      'sumador_numeros': ['sumar', 'suma', 'numeros', 'cantidad', 'ingrese'],
      'promedio_numeros': ['promedio', 'calcular_promedio', 'numeros', 'promediar'],
      'conversor_temperatura': ['celsius', 'fahrenheit', 'convertir', 'temperatura', 'grados'],
      'data_analysis': ['pandas', 'numpy', 'dataframe', 'csv', 'json', 'analysis'],
      'web_scraper': ['requests', 'beautifulsoup', 'scrape', 'url', 'html'],
      'api_client': ['requests', 'api', 'http', 'get', 'post', 'json'],
      'file_handler': ['open', 'read', 'write', 'file', 'path', 'os'],
      'database': ['sqlite', 'mysql', 'postgres', 'database', 'db'],
      'automation': ['schedule', 'cron', 'automate', 'task', 'job']
    },
    'javascript': {
      'web_app': ['express', 'react', 'vue', 'angular', 'dom', 'html'],
      'api_server': ['express', 'fastify', 'koa', 'api', 'server'],
      'data_processor': ['json', 'array', 'map', 'filter', 'reduce'],
      'utility': ['util', 'helper', 'common', 'shared', 'tool']
    },
    'java': {
      'spring_app': ['@SpringBootApplication', '@RestController', '@Service'],
      'data_model': ['@Entity', '@Table', '@Column', 'model', 'entity'],
      'utility': ['util', 'helper', 'common', 'shared', 'tool']
    }
  };
  
  const keywords = purposeKeywords[language] || purposeKeywords['python'];
  
  // Buscar el propósito más específico primero - ordenar por especificidad
  const sortedPurposes = Object.entries(keywords).sort((a, b) => {
    // Contar cuántas palabras clave coinciden para cada propósito
    const aMatches = a[1].filter(word => code.toLowerCase().includes(word.toLowerCase())).length;
    const bMatches = b[1].filter(word => code.toLowerCase().includes(word.toLowerCase())).length;
    return bMatches - aMatches; // Más coincidencias primero
  });
  
  for (const [purpose, words] of sortedPurposes) {
    const matchingWords = words.filter(word => 
      code.toLowerCase().includes(word.toLowerCase())
    );
    
    // Solo considerar si tiene al menos 2 coincidencias O es muy específico
    if (matchingWords.length >= 2 || 
        (matchingWords.length >= 1 && ['celsius', 'fahrenheit', 'temperatura', 'pandas', 'numpy', 'beautifulsoup'].some(specific => 
          matchingWords.some(match => match.includes(specific))))) {
      return purpose;
    }
  }
  
  // Si no encuentra propósito específico, buscar patrones generales
  const generalPatterns = {
    'python': {
      'script_prueba': ['assert ', 'print(', 'prueba', 'test'],
      'script_basico': ['def ', 'if __name__', 'main()'],
      'script_bucle': ['for ', 'while ', 'bucle'],
      'script_condicional': ['if ', 'elif ', 'else:', 'condicional'],
      'script_interactivo': ['input(', 'while True', 'opcion', 'menu'],
      'script_tareas': ['tareas', 'agregar', 'mostrar', 'pendientes'],
      'script_calculadora': ['calcular', 'operacion', 'numeros', 'resultado'],
      'calculadora': ['suma', 'resta', 'multiplicacion', 'division'],
      'sumador': ['sumar', 'suma', 'numeros'],
      'conversor': ['convertir', 'celsius', 'fahrenheit', 'grados']
    }
  };
  
  const patterns = generalPatterns[language] || generalPatterns['python'];
  
  for (const [purpose, words] of Object.entries(patterns)) {
    const hasPatterns = words.some(word => 
      code.toLowerCase().includes(word.toLowerCase())
    );
    
    if (hasPatterns) {
      return purpose;
    }
  }
  
  return null;
}

/**
 * Verificar si el código es relevante al contexto de la solicitud del usuario
 */
isRelevantToContext(code, userContext, language) {
  if (!userContext || userContext.trim() === '') return true; // Si no hay contexto, aceptar
  
  const codeLower = code.toLowerCase();
  const userContextLower = userContext.toLowerCase();
  
  debugLogger.debug('AIService.Relevance', 'Validando relevancia', {
    userContext: userContext.substring(0, 50),
    language,
    codePreview: code.substring(0, 50)
  });
  
  // Validar por tipo de solicitud específica CON MAYOR PRECISIÓN
  if (userContextLower.includes('electron')) {
    const isRelevant = codeLower.includes('electron') || 
                       codeLower.includes('app.on') || 
                       codeLower.includes('browserwindow') ||
                       codeLower.includes('createwindow') ||
                       codeLower.includes('const { app, browserwindow }') ||
                       codeLower.includes('loadurl') ||
                       codeLower.includes('index.html') ||
                       codeLower.includes('<!doctype html>') ||
                       codeLower.includes('<html') ||
                       codeLower.includes('mi aplicación') ||
                       codeLower.includes('aplicación electrónica');
    
    debugLogger.debug('AIService.Relevance', 'Electron validation', {
      isRelevant,
      hasElectron: codeLower.includes('electron'),
      hasAppOn: codeLower.includes('app.on'),
      hasBrowserWindow: codeLower.includes('browserwindow'),
      hasLoadURL: codeLower.includes('loadurl'),
      hasIndexHTML: codeLower.includes('index.html'),
      hasHTML: codeLower.includes('<!doctype html>') || codeLower.includes('<html')
    });
    
    return isRelevant;
  }
  
  if (userContextLower.includes('react')) {
    const isRelevant = codeLower.includes('react') || 
                       codeLower.includes('import react') ||
                       codeLower.includes('from "react"');
    
    debugLogger.debug('AIService.Relevance', 'React validation', { isRelevant });
    return isRelevant;
  }
  
  if (userContextLower.includes('vue')) {
    const isRelevant = codeLower.includes('vue') || 
                       codeLower.includes('import') && codeLower.includes('vue');
    
    debugLogger.debug('AIService.Relevance', 'Vue validation', { isRelevant });
    return isRelevant;
  }
  
  if (userContextLower.includes('python') || userContextLower.includes('pandas')) {
    const isRelevant = codeLower.includes('import') || 
                       codeLower.includes('def ') || 
                       codeLower.includes('pandas');
    
    debugLogger.debug('AIService.Relevance', 'Python validation', { isRelevant });
    return isRelevant;
  }
  
  if (userContextLower.includes('web scraper') || userContextLower.includes('scraper')) {
    const isRelevant = codeLower.includes('scraper') || 
                       codeLower.includes('requests') ||
                       codeLower.includes('beautifulsoup') ||
                       codeLower.includes('fetch(');
    
    debugLogger.debug('AIService.Relevance', 'Web scraper validation', { isRelevant });
    return isRelevant;
  }
  
  if (userContextLower.includes('data analysis') || userContextLower.includes('analisis de datos')) {
    const isRelevant = codeLower.includes('pandas') || 
                       codeLower.includes('numpy') ||
                       codeLower.includes('dataframe') ||
                       codeLower.includes('csv');
    
    debugLogger.debug('AIService.Relevance', 'Data analysis validation', { isRelevant });
    return isRelevant;
  }
  
  // Detectar archivos JavaScript/HTML genéricos si el contexto es de desarrollo
  if (userContextLower.includes('proyecto') || userContextLower.includes('aplicación') || 
      userContextLower.includes('app') || userContextLower.includes('desarrollo')) {
    
    const isRelevant = (language === 'javascript' && (
      codeLower.includes('function') || 
      codeLower.includes('const ') || 
      codeLower.includes('let ') ||
      codeLower.includes('var ') ||
      codeLower.includes('import ') ||
      codeLower.includes('export ')
    )) || (language === 'html' && (
      codeLower.includes('<!doctype') ||
      codeLower.includes('<html') ||
      codeLower.includes('<head') ||
      codeLower.includes('<body')
    ));
    
    debugLogger.debug('AIService.Relevance', 'Generic project validation', {
      isRelevant,
      language,
      hasJS: language === 'javascript',
      hasHTML: language === 'html'
    });
    return isRelevant;
  }
  
  // Si no hay contexto específico conocido, RECHAZAR por defecto (más restrictivo)
  debugLogger.debug('AIService.Relevance', 'Contexto no reconocido; rechazando archivo');
  return false;
}

/**
 * Obtener extensión de archivo basada en el lenguaje
 */
getLanguageExtension(language) {
  const extensions = {
    'python': 'py',
    'javascript': 'js',
    'typescript': 'ts',
    'jsx': 'jsx',
    'tsx': 'tsx',
    'java': 'java',
    'cpp': 'cpp',
    'c': 'c',
    'csharp': 'cs',
    'perl': 'pl',
    'ruby': 'rb',
    'swift': 'swift',
    'kotlin': 'kt',
    'scala': 'scala',
    'rust': 'rs',
    'dart': 'dart',
    'php': 'php',
    'lua': 'lua',
    'r': 'r',
    'matlab': 'm',
    'octave': 'm',
    'fortran': 'f90',
    'haskell': 'hs',
    'erlang': 'erl',
    'elixir': 'ex',
    'clojure': 'clj',
    'fsharp': 'fs',
    'ocaml': 'ml',
    'prolog': 'pl',
    'lisp': 'lisp',
    'scheme': 'scm',
    'racket': 'rkt',
    'd': 'd',
    'nim': 'nim',
    'crystal': 'cr',
    'zig': 'zig',
    'v': 'v',
    'sql': 'sql',
    'matlab': 'm',
    'octave': 'm',
    'fortran': 'f90',
    'assembly': 'asm',
    'vhdl': 'vhdl',
    'verilog': 'v',
    'tcl': 'tcl',
    'ada': 'adb',
    'cobol': 'cob',
    'pascal': 'pas',
    'smalltalk': 'st',
    'forth': 'fth',
    'apl': 'apl',
    'j': 'ijs',
    'k': 'k',
    'q': 'q',
    'wolfram': 'wl',
    'maxima': 'mac',
    'sage': 'sage',
    'maple': 'mpl',
    'mathematica': 'nb',
    'go': 'go',
    'bash': 'sh',
    'shell': 'sh',
    'sql': 'sql',
    'html': 'html',
    'css': 'css',
    'json': 'json',
    'yaml': 'yml',
    'xml': 'xml',
    'markdown': 'md',
    'txt': 'txt'
  };
  return extensions[language] || 'txt';
}
}

// Exportar instancia singleton
export const codeAnalyzer = new CodeAnalyzer();
export default codeAnalyzer;
