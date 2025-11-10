/**
 * AIService - Servicio principal para manejar las APIs de IA
 * Soporta modelos remotos (GPT, Claude, etc.) y locales (Llama, Qwen, DeepSeek)
 */

import { conversationService } from './ConversationService';
import debugLogger from '../utils/debugLogger';

import fileAnalysisService from './FileAnalysisService';
import mcpClient from './MCPClientService';
import toolOrchestrator from './ToolOrchestrator';
import modelMemoryService from './ModelMemoryService';

class AIService {
  constructor() {
    this.currentModel = null;
    this.modelType = 'remote'; // 'remote', 'local' o 'remote-ollama'
    this.apiKey = null;
    this.remoteOllamaUrl = null;
    this.performanceConfig = null; // Configuración manual de rendimiento
    // Caché simple para los directorios permitidos de MCP (evita pedirlos repetidamente)
    this.allowedDirectoriesCache = { value: null, fetchedAt: 0 };
    this.mcpDefaultDirs = {}; // Map<serverId, { raw, normalized }>
    // Flag para invalidar información del filesystem cuando se modifica
    this._filesystemModified = false;
    // Feature flags y orquestador
    this.featureFlags = { structuredToolMessages: true };
    this.toolOrchestrator = toolOrchestrator;
    // Servicio de gestión de memoria
    this.memoryService = modelMemoryService;
    this.models = {
      remote: [
        { 
          id: 'gpt-4', 
          name: 'GPT-4', 
          provider: 'openai', 
          endpoint: 'https://api.openai.com/v1/chat/completions', 
          performance: 'high',
          description: 'El modelo más avanzado de OpenAI. Excelente para tareas complejas, programación, análisis y razonamiento profundo.',
          useCases: ['Programación avanzada', 'Análisis de datos', 'Investigación', 'Escritura técnica', 'Resolución de problemas complejos'],
          strengths: ['Razonamiento superior', 'Código de alta calidad', 'Análisis detallado', 'Creatividad avanzada'],
          bestFor: 'Desarrolladores, investigadores, analistas y usuarios que necesitan la máxima calidad',
          context: '128K tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '220B',
          quantization: 'Full Precision'
        },
        { 
          id: 'gpt-3.5-turbo', 
          name: 'GPT-3.5 Turbo', 
          provider: 'openai', 
          endpoint: 'https://api.openai.com/v1/chat/completions', 
          performance: 'medium',
          description: 'Modelo rápido y eficiente de OpenAI. Ideal para uso general, programación básica y conversaciones.',
          useCases: ['Programación básica', 'Asistencia general', 'Escritura', 'Traducción', 'Resumen de textos'],
          strengths: ['Velocidad alta', 'Costo eficiente', 'Buena calidad general', 'Respuestas rápidas'],
          bestFor: 'Uso diario, programación básica, estudiantes y usuarios que buscan velocidad',
          context: '16K tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '175B',
          quantization: 'Full Precision'
        },
        { 
          id: 'claude-3-opus', 
          name: 'Claude 3 Opus', 
          provider: 'anthropic', 
          endpoint: 'https://api.anthropic.com/v1/messages', 
          performance: 'high',
          description: 'El modelo más potente de Anthropic. Destaca en análisis, escritura creativa y comprensión de contexto.',
          useCases: ['Análisis profundo', 'Escritura creativa', 'Investigación académica', 'Edición de textos', 'Análisis de documentos'],
          strengths: ['Comprensión superior', 'Escritura excelente', 'Análisis detallado', 'Creatividad'],
          bestFor: 'Escritores, investigadores, analistas y usuarios que necesitan análisis profundo',
          context: '200K tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '200B',
          quantization: 'Full Precision'
        },
        { 
          id: 'claude-3-sonnet', 
          name: 'Claude 3 Sonnet', 
          provider: 'anthropic', 
          endpoint: 'https://api.anthropic.com/v1/messages', 
          performance: 'medium',
          description: 'Modelo equilibrado de Anthropic. Buen balance entre velocidad y calidad para uso general.',
          useCases: ['Programación', 'Asistencia general', 'Análisis de datos', 'Escritura', 'Resolución de problemas'],
          strengths: ['Balance velocidad/calidad', 'Buena programación', 'Análisis sólido', 'Respuestas coherentes'],
          bestFor: 'Desarrolladores, profesionales y usuarios que buscan un buen balance',
          context: '200K tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '100B',
          quantization: 'Full Precision'
        },
        { 
          id: 'gemini-2.5-flash', 
          name: 'Gemini 2.5 Flash', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', 
          performance: 'high',
          description: 'El modelo más reciente y rápido de Google. Excelente para tareas generales y programación con velocidad superior.',
          useCases: ['Programación rápida', 'Análisis de datos', 'Investigación', 'Escritura técnica', 'Resolución de problemas'],
          strengths: ['Velocidad excepcional', 'Código de calidad', 'Análisis rápido', 'Multimodal'],
          bestFor: 'Desarrolladores que necesitan velocidad, analistas y usuarios que buscan respuestas rápidas',
          context: '1M tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '~100B',
          quantization: 'Full Precision'
        },
        { 
          id: 'gemini-2.5-pro', 
          name: 'Gemini 2.5 Pro', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent', 
          performance: 'high',
          description: 'El modelo más potente de Google. Máxima calidad para tareas complejas y análisis profundos.',
          useCases: ['Programación avanzada', 'Análisis complejo', 'Investigación profunda', 'Escritura técnica', 'Resolución de problemas difíciles'],
          strengths: ['Máxima calidad', 'Razonamiento superior', 'Análisis profundo', 'Código avanzado'],
          bestFor: 'Desarrolladores senior, investigadores y usuarios que necesitan la máxima calidad',
          context: '2M tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '~200B',
          quantization: 'Full Precision'
        },
        { 
          id: 'gemini-2.0-flash-exp', 
          name: 'Gemini 2.0 Flash', 
          provider: 'google', 
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', 
          performance: 'high',
          description: 'Modelo experimental de Google con capacidades avanzadas. Ideal para probar nuevas funcionalidades.',
          useCases: ['Experimentación', 'Funcionalidades nuevas', 'Análisis innovador', 'Programación experimental'],
          strengths: ['Funcionalidades nuevas', 'Capacidades experimentales', 'Innovación', 'Tecnología de vanguardia'],
          bestFor: 'Usuarios avanzados, investigadores y desarrolladores que quieren probar lo último',
          context: '1M tokens',
          ramRequired: 'N/A (Cloud)',
          parameters: '~100B',
          quantization: 'Full Precision'
        },
      ],
      local: {
        ollama: [
          { 
            id: 'llama3.2:latest', 
            name: 'Llama 3.2 (Latest - 3B)', 
            size: '2GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo predeterminado de Llama 3.2 optimizado para texto. Versión recomendada para la mayoría de usuarios.',
            useCases: ['Programación general', 'Asistencia técnica', 'Procesamiento de texto', 'Uso general'],
            strengths: ['Versión recomendada', 'Optimizado para texto', 'Excelente balance', 'Versatilidad'],
            bestFor: 'Usuarios que quieren la versión más reciente optimizada para texto',
            context: '8K tokens',
            ramRequired: '6-8GB',
            parameters: '3B',
            quantization: 'Q4, Q5, Q8'
          },
          { 
            id: 'llama3.2:1b', 
            name: 'Llama 3.2 (1B)', 
            size: '1.3GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo más ligero de Llama 3.2 optimizado para dispositivos con recursos limitados. Ideal para uso básico.',
            useCases: ['Procesamiento básico', 'Dispositivos móviles', 'Uso ligero', 'Tareas simples'],
            strengths: ['Muy ligero', 'Rápido', 'Eficiente', 'Ideal para móviles'],
            bestFor: 'Usuarios con dispositivos limitados o que necesitan máxima velocidad',
            context: '4K tokens',
            ramRequired: '2-4GB',
            parameters: '1B',
            quantization: 'Q4'
          },
          { 
            id: 'llama3.1:8b', 
            name: 'Llama 3.1 (8B)', 
            size: '4.7GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión moderna de Llama 3.1 con contexto extendido hasta 128K tokens. Excelente para análisis de documentos largos y conversaciones extensas.',
            useCases: ['Análisis de documentos largos', 'Conversaciones extensas', 'Programación compleja', 'Investigación', 'Análisis de código masivo'],
            strengths: ['Contexto ultra-largo (128K nativo)', 'Optimizado para instrucciones', 'Excelente para documentos', 'Análisis profundo'],
            bestFor: 'Análisis de documentos extensos, conversaciones largas y tareas que requieren contexto amplio',
            context: '128K tokens',
            ramRequired: '8-10GB',
            parameters: '8B',
            quantization: 'Q4, Q5, Q8'
          },
          { 
            id: 'llama3.1:70b', 
            name: 'Llama 3.1 (70B)', 
            size: '40GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente + GPU potente',
            description: 'Modelo más potente de Llama 3.1 con contexto extendido a 128K tokens. Excelente para programación avanzada, análisis complejos y documentos largos con máxima calidad.',
            useCases: ['Programación avanzada', 'Análisis de código complejo', 'Investigación', 'Razonamiento profundo', 'Análisis masivo de documentos', 'Documentos muy largos'],
            strengths: ['Contexto ultra-largo (128K)', 'Excelente programación', 'Razonamiento superior', 'Código de máxima calidad', 'Análisis profundo'],
            bestFor: 'Desarrolladores senior, investigadores y usuarios con hardware potente que necesitan máxima calidad y contextos largos',
            context: '128K tokens',
            ramRequired: '45-70GB',
            parameters: '70B',
            quantization: 'Q2, Q3, Q4'
          },
          { 
            id: 'llama3', 
            name: 'Llama 3 (8B)', 
            size: '4.7GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo estable y confiable de Meta. Buen balance entre rendimiento y recursos para uso general.',
            useCases: ['Programación general', 'Asistencia técnica', 'Análisis de datos', 'Escritura', 'Resolución de problemas'],
            strengths: ['Estabilidad', 'Buena programación', 'Análisis sólido', 'Respuestas coherentes'],
            bestFor: 'Uso general, programación básica-intermedia y usuarios que buscan estabilidad',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '8B',
            quantization: 'Q4, Q5, Q8'
          },
          { 
            id: 'llama3:70b', 
            name: 'Llama 3 (70B)', 
            size: '40GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo más potente de Llama 3. Excelente para programación avanzada y análisis complejos con máxima calidad.',
            useCases: ['Programación avanzada', 'Análisis de código complejo', 'Investigación', 'Razonamiento profundo', 'Tareas de alta complejidad'],
            strengths: ['Excelente programación', 'Razonamiento superior', 'Código de máxima calidad', 'Análisis profundo', 'Máxima potencia'],
            bestFor: 'Desarrolladores senior, investigadores y usuarios que necesitan máxima calidad en programación',
            context: '8K tokens',
            ramRequired: '40-64GB',
            parameters: '70B',
            quantization: 'Q2, Q3, Q4, Q5'
          },
          { 
            id: 'llama2', 
            name: 'Llama 2 (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo clásico de Meta. Versión anterior estable y confiable para uso general.',
            useCases: ['Programación básica', 'Asistencia general', 'Análisis de texto', 'Resolución de problemas'],
            strengths: ['Estabilidad', 'Buena comprensión', 'Respuestas coherentes', 'Amplio conocimiento'],
            bestFor: 'Uso general, programación básica y usuarios que buscan estabilidad',
            context: '4K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5, Q8'
          },
          { 
            id: 'deepseek-r1:latest', 
            name: 'DeepSeek R1 (Latest)', 
            size: '5.2GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'DeepSeek-R1 es una familia de modelos de razonamiento abierto con rendimiento que se acerca a modelos líderes como O3 y Gemini 2.5 Pro. Versión latest optimizada.',
            useCases: ['Razonamiento profundo', 'Programación compleja', 'Análisis matemático', 'Resolución de problemas complejos', 'Pensamiento crítico'],
            strengths: ['Razonamiento superior', 'Programación avanzada', 'Lógica matemática', 'Análisis profundo', 'Contexto extenso'],
            bestFor: 'Desarrolladores senior, matemáticos, investigadores y usuarios que necesitan razonamiento profundo y contexto extenso',
            context: '128K tokens',
            ramRequired: '10-12GB',
            parameters: '8B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:1.5b', 
            name: 'DeepSeek R1 (1.5B)', 
            size: '1.1GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión compacta de DeepSeek-R1. Ideal para dispositivos con recursos limitados pero que requieren razonamiento avanzado.',
            useCases: ['Razonamiento básico', 'Programación ligera', 'Análisis rápido', 'Dispositivos con recursos limitados'],
            strengths: ['Muy compacto', 'Razonamiento eficiente', 'Bajo consumo', 'Contexto extenso'],
            bestFor: 'Usuarios con recursos limitados que buscan razonamiento avanzado en un paquete compacto',
            context: '128K tokens',
            ramRequired: '4-6GB',
            parameters: '1.5B',
            quantization: 'Q4'
          },
          { 
            id: 'deepseek-r1:7b', 
            name: 'DeepSeek R1 (7B)', 
            size: '4.7GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 7B de DeepSeek-R1. Excelente balance entre rendimiento y eficiencia para razonamiento profundo.',
            useCases: ['Razonamiento profundo', 'Programación compleja', 'Análisis matemático', 'Resolución de algoritmos', 'Debugging avanzado'],
            strengths: ['Razonamiento superior', 'Balance rendimiento/eficiencia', 'Lógica matemática', 'Análisis profundo', 'Contexto extenso'],
            bestFor: 'Desarrolladores que buscan excelente razonamiento con eficiencia de recursos',
            context: '128K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:8b', 
            name: 'DeepSeek R1 (8B)', 
            size: '5.2GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'DeepSeek-R1 8B. Modelo especializado en razonamiento y programación. Ideal para tareas que requieren lógica profunda con contexto extenso.',
            useCases: ['Programación compleja', 'Razonamiento lógico', 'Análisis matemático', 'Resolución de algoritmos', 'Debugging avanzado'],
            strengths: ['Razonamiento superior', 'Programación avanzada', 'Lógica matemática', 'Análisis profundo', 'Contexto extenso'],
            bestFor: 'Desarrolladores senior, matemáticos, investigadores y usuarios que necesitan razonamiento profundo',
            context: '128K tokens',
            ramRequired: '10-12GB',
            parameters: '8B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:14b', 
            name: 'DeepSeek R1 (14B)', 
            size: '9.0GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 14B de DeepSeek-R1. Mayor capacidad de razonamiento y análisis para tareas complejas que requieren comprensión profunda.',
            useCases: ['Razonamiento avanzado', 'Programación de nivel experto', 'Análisis matemático complejo', 'Investigación', 'Resolución de problemas complejos'],
            strengths: ['Razonamiento excepcional', 'Comprensión profunda', 'Análisis complejo', 'Contexto extenso', 'Precisión superior'],
            bestFor: 'Investigadores, desarrolladores expertos y profesionales que requieren máximo razonamiento',
            context: '128K tokens',
            ramRequired: '16-20GB',
            parameters: '14B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:32b', 
            name: 'DeepSeek R1 (32B)', 
            size: '20GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 32B de DeepSeek-R1. Modelo de alto rendimiento para razonamiento extremadamente complejo y análisis de nivel experto.',
            useCases: ['Razonamiento de nivel experto', 'Programación avanzada', 'Análisis matemático complejo', 'Investigación avanzada', 'Resolución de problemas extremadamente complejos'],
            strengths: ['Razonamiento excepcional', 'Comprensión profunda', 'Análisis complejo', 'Contexto extenso', 'Precisión máxima'],
            bestFor: 'Investigadores avanzados, desarrolladores expertos y profesionales que requieren máximo razonamiento y capacidad de análisis',
            context: '128K tokens',
            ramRequired: '40-48GB',
            parameters: '32B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:70b', 
            name: 'DeepSeek R1 (70B)', 
            size: '43GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 70B de DeepSeek-R1. Modelo de máximo rendimiento para razonamiento de nivel experto, comparable con modelos líderes como O3 y Gemini 2.5 Pro.',
            useCases: ['Razonamiento de nivel experto', 'Programación avanzada', 'Análisis matemático complejo', 'Investigación avanzada', 'Resolución de problemas extremadamente complejos'],
            strengths: ['Razonamiento excepcional', 'Comprensión profunda', 'Análisis complejo', 'Contexto extenso', 'Precisión máxima', 'Rendimiento de nivel líder'],
            bestFor: 'Investigadores avanzados, desarrolladores expertos y profesionales que requieren máximo razonamiento y capacidad de análisis',
            context: '128K tokens',
            ramRequired: '80-96GB',
            parameters: '70B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'deepseek-r1:671b', 
            name: 'DeepSeek R1 (671B)', 
            size: '404GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente + GPU muy potente',
            description: 'Versión completa 671B de DeepSeek-R1. El modelo más grande de la familia, con rendimiento que se acerca a modelos líderes como O3 y Gemini 2.5 Pro. Requiere hardware de nivel enterprise.',
            useCases: ['Razonamiento de nivel experto', 'Programación avanzada', 'Análisis matemático complejo', 'Investigación avanzada', 'Resolución de problemas extremadamente complejos', 'Benchmarks de investigación'],
            strengths: ['Razonamiento excepcional', 'Comprensión profunda', 'Análisis complejo', 'Contexto extenso (160K)', 'Precisión máxima', 'Rendimiento de nivel líder', 'Máxima capacidad'],
            bestFor: 'Investigadores avanzados, instituciones de investigación y usuarios con hardware enterprise que requieren máxima capacidad de razonamiento',
            context: '160K tokens',
            ramRequired: '450-500GB',
            parameters: '671B',
            quantization: 'MXFP4'
          },
          { 
            id: 'mistral', 
            name: 'Mistral (7B)', 
            size: '4.1GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo europeo eficiente. Excelente para programación y tareas técnicas con buen rendimiento.',
            useCases: ['Programación', 'Análisis técnico', 'Escritura técnica', 'Resolución de problemas', 'Asistencia general'],
            strengths: ['Eficiencia', 'Buena programación', 'Análisis técnico', 'Respuestas precisas'],
            bestFor: 'Desarrolladores, técnicos y usuarios que buscan eficiencia en programación',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'qwen2.5', 
            name: 'Qwen 2.5 (7B)', 
            size: '4.5GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo chino con capacidades multilingües. Excelente para programación y análisis en múltiples idiomas.',
            useCases: ['Programación multilingüe', 'Análisis de código', 'Traducción técnica', 'Asistencia general'],
            strengths: ['Multilingüe', 'Buena programación', 'Análisis de código', 'Flexibilidad'],
            bestFor: 'Desarrolladores internacionales, programación multilingüe y análisis de código',
            context: '128K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'qwen3:8b', 
            name: 'Qwen 3 (8B)', 
            size: '5.0GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo Qwen3 de 8B con contexto extendido hasta 128K tokens. Optimizado para GPU y conversaciones largas.',
            useCases: ['Análisis de documentos largos', 'Conversaciones extensas', 'Programación compleja', 'Análisis profundo', 'Contextos largos'],
            strengths: ['Contexto ultra-largo (128K)', 'Optimización GPU', 'Multilingüe avanzado', 'Razonamiento profundo'],
            bestFor: 'Análisis de documentos extensos, conversaciones largas y tareas que requieren contexto amplio',
            context: '128K tokens',
            ramRequired: '10-12GB',
            parameters: '8B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'qwen3:30b', 
            name: 'Qwen 3 (30B-A3B)', 
            size: '18.6GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente + GPU potente',
            description: 'Modelo Qwen3 de 30B con arquitectura MoE (solo 3B activos). Contexto de 128K tokens para máximo rendimiento.',
            useCases: ['Análisis masivos', 'Investigación compleja', 'Documentos muy largos', 'Razonamiento avanzado', 'Tareas complejas'],
            strengths: ['Contexto ultra-largo (128K)', 'Arquitectura MoE eficiente', 'Rendimiento superior', 'GPU optimizado'],
            bestFor: 'Usuarios con hardware potente que necesitan máximo rendimiento y contextos extremadamente largos',
            context: '128K tokens',
            ramRequired: '20-32GB',
            parameters: '30B (3B activos)',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'dolphin-mixtral', 
            name: 'Dolphin Mixtral (8x7B)', 
            size: '26GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente + GPU potente',
            description: 'Dolphin fine-tuned sobre Mixtral MoE. Excelente razonamiento con arquitectura eficiente.',
            useCases: ['Razonamiento avanzado', 'Programación compleja', 'Análisis profundo', 'Instrucciones precisas'],
            strengths: ['Razonamiento superior', 'MoE eficiente', 'Análisis profundo', 'Instrucciones precisas'],
            bestFor: 'Usuarios con GPU que necesitan razonamiento avanzado y eficiencia',
            context: '32K tokens',
            ramRequired: '30-40GB',
            parameters: '8x7B (MoE)',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'gpt-oss:20b', 
            name: 'GPT-OSS (20B)', 
            size: '14GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'OpenAI\'s open-weight models designed for powerful reasoning, agentic tasks, and versatile developer use cases. Modelo de 20B optimizado para baja latencia.',
            useCases: ['Razonamiento poderoso', 'Tareas agentic', 'Desarrollo versátil', 'Programación', 'Resolución de problemas complejos'],
            strengths: ['Razonamiento superior', 'Versatilidad', 'Calidad de código', 'Análisis complejo', 'Tareas agentic'],
            bestFor: 'Desarrolladores, investigadores y usuarios que necesitan razonamiento y versatilidad',
            context: '128K tokens',
            ramRequired: '16-20GB',
            parameters: '20B',
            quantization: 'MXFP4'
          },
          { 
            id: 'gpt-oss:120b', 
            name: 'GPT-OSS (120B)', 
            size: '65GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente + GPU muy potente',
            description: 'OpenAI\'s open-weight 120B model. Modelo más potente para razonamiento y tareas complejas con máxima calidad.',
            useCases: ['Razonamiento avanzado', 'Programación compleja', 'Análisis profundo', 'Tareas agentic', 'Investigación de alto nivel'],
            strengths: ['Razonamiento superior', 'Mayor capacidad', 'Versatilidad', 'Análisis profundo', 'Código de máxima calidad'],
            bestFor: 'Desarrolladores senior, investigadores y usuarios con GPU potente que necesitan máxima capacidad',
            context: '128K tokens',
            ramRequired: '70-80GB',
            parameters: '120B',
            quantization: 'MXFP4'
          },
          { 
            id: 'gemma3:latest', 
            name: 'Gemma 3 (Latest)', 
            size: '3.3GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'The current, most capable model that runs on a single GPU. Modelo de Google con soporte para texto e imágenes.',
            useCases: ['Análisis de imágenes', 'Programación con contexto visual', 'Análisis de datos', 'Escritura técnica', 'Tareas multimodales'],
            strengths: ['Multimodal (texto e imagen)', 'Eficiencia', 'Contexto extenso', 'Versatilidad'],
            bestFor: 'Desarrolladores que necesitan análisis multimodal y contexto extenso',
            context: '128K tokens',
            ramRequired: '6-8GB',
            parameters: '4B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'gemma3:270m', 
            name: 'Gemma 3 (270M)', 
            size: '292MB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo ultra-compacto de Gemma 3. Ideal para dispositivos con recursos muy limitados.',
            useCases: ['Tareas básicas', 'Respuestas rápidas', 'Dispositivos móviles', 'Prototipado ligero'],
            strengths: ['Muy compacto', 'Velocidad alta', 'Bajo consumo', 'Fácil instalación'],
            bestFor: 'Dispositivos con recursos muy limitados y tareas básicas rápidas',
            context: '32K tokens',
            ramRequired: '1-2GB',
            parameters: '270M',
            quantization: 'Q4'
          },
          { 
            id: 'gemma3:1b', 
            name: 'Gemma 3 (1B)', 
            size: '815MB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión compacta de Gemma 3. Ideal para dispositivos con recursos limitados.',
            useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos móviles', 'Tareas simples', 'Prototipado'],
            strengths: ['Compacto', 'Velocidad alta', 'Bajo consumo', 'Fácil instalación'],
            bestFor: 'Dispositivos con recursos limitados y tareas básicas rápidas',
            context: '32K tokens',
            ramRequired: '2-4GB',
            parameters: '1B',
            quantization: 'Q4'
          },
          { 
            id: 'gemma3:4b', 
            name: 'Gemma 3 (4B)', 
            size: '3.3GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'The current, most capable model that runs on a single GPU. Versión 4B con soporte para texto e imágenes.',
            useCases: ['Análisis de imágenes', 'Programación con contexto visual', 'Análisis de datos', 'Escritura técnica', 'Tareas multimodales'],
            strengths: ['Multimodal (texto e imagen)', 'Eficiencia', 'Contexto extenso', 'Balance rendimiento/recursos'],
            bestFor: 'Desarrolladores que necesitan análisis multimodal con eficiencia de recursos',
            context: '128K tokens',
            ramRequired: '6-8GB',
            parameters: '4B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'gemma3:12b', 
            name: 'Gemma 3 (12B)', 
            size: '8.1GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 12B de Gemma 3. Mayor capacidad para análisis multimodal y tareas complejas.',
            useCases: ['Análisis avanzado de imágenes', 'Programación compleja con contexto visual', 'Análisis profundo', 'Investigación multimodal', 'Tareas agentic'],
            strengths: ['Multimodal avanzado', 'Mayor capacidad', 'Contexto extenso', 'Análisis profundo'],
            bestFor: 'Desarrolladores y investigadores que necesitan análisis multimodal avanzado',
            context: '128K tokens',
            ramRequired: '16-20GB',
            parameters: '12B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'gemma3:27b', 
            name: 'Gemma 3 (27B)', 
            size: '17GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 27B de Gemma 3. Máxima capacidad para análisis multimodal y tareas complejas de nivel experto.',
            useCases: ['Análisis experto de imágenes', 'Programación avanzada con contexto visual', 'Investigación multimodal', 'Análisis profundo', 'Tareas agentic complejas'],
            strengths: ['Multimodal de nivel experto', 'Máxima capacidad', 'Contexto extenso', 'Análisis profundo', 'Precisión superior'],
            bestFor: 'Investigadores avanzados y desarrolladores expertos que requieren máxima capacidad multimodal',
            context: '128K tokens',
            ramRequired: '32-40GB',
            parameters: '27B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'phi3', 
            name: 'Phi-3 (3.8B)', 
            size: '2.3GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo compacto de Microsoft. Ideal para dispositivos con recursos limitados y tareas básicas.',
            useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos móviles', 'Tareas simples', 'Prototipado'],
            strengths: ['Muy compacto', 'Velocidad alta', 'Bajo consumo', 'Fácil instalación'],
            bestFor: 'Dispositivos con recursos limitados, desarrollo móvil y tareas básicas rápidas',
            context: '4K tokens',
            ramRequired: '4-6GB',
            parameters: '3.8B',
            quantization: 'Q4'
          },
          { 
            id: 'codellama', 
            name: 'Code Llama (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de programación de Meta basado en Llama. Excelente para generación y comprensión de código.',
            useCases: ['Programación en múltiples lenguajes', 'Generación de código', 'Explicación de código', 'Refactoring', 'Debugging'],
            strengths: ['Multilenguaje', 'Comprensión de código', 'Generación eficiente', 'Soporte para múltiples paradigmas'],
            bestFor: 'Desarrolladores que trabajan con múltiples lenguajes de programación',
            context: '16K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'wizardcoder', 
            name: 'WizardCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo especializado en programación con capacidades avanzadas de generación de código.',
            useCases: ['Generación de código', 'Programación asistida', 'Resolución de problemas', 'Optimización de código'],
            strengths: ['Generación de código limpio', 'Comprensión de requerimientos', 'Optimización', 'Buena documentación'],
            bestFor: 'Desarrolladores que buscan asistencia inteligente en programación',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'starcoder', 
            name: 'StarCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de código de BigCode entrenado en repositorios públicos. Excelente para programación.',
            useCases: ['Programación en múltiples lenguajes', 'Generación de código', 'Completado de código', 'Refactoring'],
            strengths: ['Gran conocimiento de código', 'Soporte multilenguaje', 'Comprensión de patrones', 'Generación eficiente'],
            bestFor: 'Desarrolladores que necesitan un modelo con amplio conocimiento de código',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'mistral-instruct', 
            name: 'Mistral Instruct (7B)', 
            size: '4.1GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión Instruct de Mistral. Modelo europeo eficiente optimizado para seguimiento de instrucciones.',
            useCases: ['Seguimiento de instrucciones', 'Programación', 'Análisis técnico', 'Respuestas precisas'],
            strengths: ['Eficiencia superior', 'Instrucciones precisas', 'Respuestas relevantes', 'Bajo consumo'],
            bestFor: 'Desarrolladores que buscan eficiencia y precisión en seguimiento de instrucciones',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'neural-chat', 
            name: 'Neural Chat (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo especializado en conversaciones naturales y chat. Entrenado con RLHF para diálogos fluidos.',
            useCases: ['Chat natural', 'Conversaciones', 'Asistencia general', 'Diálogos prolongados', 'Entretenimiento'],
            strengths: ['Conversaciones naturales', 'Diálogos fluidos', 'Comprensión contextual', 'Respuestas personalizadas'],
            bestFor: 'Usuarios que buscan conversaciones naturales y asistencia conversacional',
            context: '4K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'vicuna', 
            name: 'Vicuña (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Modelo de conversación basado en LLaMA, fine-tuned con instrucciones de alta calidad de usuarios.',
            useCases: ['Chat general', 'Asistencia', 'Brainstorming', 'Escritura', 'Respuestas creativas'],
            strengths: ['Chat natural', 'Versatilidad', 'Respuestas creativas', 'Buena comprensión'],
            bestFor: 'Usuarios que buscan un asistente de conversación versátil y accesible',
            context: '2K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'orca-mini:3b', 
            name: 'Orca Mini (3B)', 
            size: '2.0GB', 
            downloaded: false, 
            performance: 'low',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión mini ultra-compacta de Orca. Ideal para dispositivos con recursos limitados.',
            useCases: ['Asistencia básica', 'Respuestas rápidas', 'Dispositivos móviles', 'Prototipado', 'Testing'],
            strengths: ['Muy ligero', 'Rápido', 'Bajo consumo', 'Fácil instalación'],
            bestFor: 'Dispositivos con recursos muy limitados y tareas de respuesta rápida',
            context: '32K tokens',
            ramRequired: '3-4GB',
            parameters: '3B',
            quantization: 'Q4'
          },
          { 
            id: 'orca-mini:7b', 
            name: 'Orca Mini (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 7B de Orca Mini. Modelo de propósito general adecuado para hardware de nivel de entrada.',
            useCases: ['Asistencia general', 'Programación básica', 'Análisis de texto', 'Resolución de problemas', 'Uso general'],
            strengths: ['Balance rendimiento/recursos', 'Buena comprensión', 'Respuestas coherentes', 'Amplio conocimiento'],
            bestFor: 'Usuarios con hardware básico que buscan buen rendimiento general',
            context: '32K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'orca-mini:13b', 
            name: 'Orca Mini (13B)', 
            size: '7.4GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 13B de Orca Mini. Mayor capacidad para tareas más complejas manteniendo eficiencia.',
            useCases: ['Programación avanzada', 'Análisis profundo', 'Razonamiento', 'Escritura técnica', 'Asistencia avanzada'],
            strengths: ['Mayor capacidad', 'Mejor razonamiento', 'Análisis profundo', 'Versatilidad'],
            bestFor: 'Usuarios que buscan mayor capacidad sin requerir hardware extremo',
            context: '32K tokens',
            ramRequired: '16-20GB',
            parameters: '13B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'orca-mini:70b', 
            name: 'Orca Mini (70B)', 
            size: '39GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Versión 70B de Orca Mini. Máxima capacidad de la serie Orca Mini para tareas complejas.',
            useCases: ['Programación avanzada', 'Análisis profundo', 'Razonamiento complejo', 'Investigación', 'Tareas complejas'],
            strengths: ['Máxima capacidad', 'Razonamiento superior', 'Análisis profundo', 'Precisión superior'],
            bestFor: 'Investigadores y desarrolladores expertos que requieren máxima capacidad',
            context: '32K tokens',
            ramRequired: '80-96GB',
            parameters: '70B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'orca2', 
            name: 'Orca 2 (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Orca 2 con mejoras en razonamiento y seguimiento de instrucciones. Versión mejorada de Orca basada en Llama 2.',
            useCases: ['Razonamiento', 'Instrucciones complejas', 'Análisis', 'Programación', 'Resolución de problemas'],
            strengths: ['Razonamiento mejorado', 'Instrucciones precisas', 'Análisis profundo', 'Versatilidad'],
            bestFor: 'Usuarios que buscan mejor razonamiento y comprensión de instrucciones complejas',
            context: '32K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'neural-chat-instruct', 
            name: 'Neural Chat Instruct (8B)', 
            size: '4.2GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'ollama',
            platformName: 'Ollama',
            platformDescription: 'Requiere Ollama instalado localmente',
            description: 'Intel Neural Chat Instruct - Modelo optimizado para instrucciones. Excelente balance velocidad/calidad.',
            useCases: ['Seguimiento de instrucciones', 'Conversaciones', 'Programación', 'Asistencia general', 'Escritura técnica'],
            strengths: ['Instrucciones precisas', 'Chat natural', 'Optimizado por Intel', 'Balance velocidad/calidad'],
            bestFor: 'Usuarios que buscan seguimiento preciso de instrucciones con buena velocidad',
            context: '4K tokens',
            ramRequired: '10-12GB',
            parameters: '8B',
            quantization: 'Q4, Q5'
          },
        ],
        independent: [
          { 
            id: 'deepseek-coder:6.7b', 
            name: 'DeepSeek Coder (6.7B)', 
            size: '4.1GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en programación y generación de código. Optimizado para tareas de desarrollo.',
            useCases: ['Generación de código', 'Refactoring', 'Debugging', 'Documentación técnica', 'Análisis de código'],
            strengths: ['Excelente en programación', 'Generación de código de calidad', 'Comprensión de sintaxis', 'Refactoring inteligente'],
            bestFor: 'Desarrolladores, programadores y equipos de desarrollo que necesitan asistencia en código',
            context: '4K tokens',
            ramRequired: '8-10GB',
            parameters: '6.7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'magicoder:7b', 
            name: 'Magicoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo de programación con capacidades mágicas para generación de código y resolución de problemas.',
            useCases: ['Generación de código', 'Resolución de bugs', 'Optimización', 'Documentación automática'],
            strengths: ['Generación creativa', 'Resolución de problemas', 'Optimización inteligente', 'Código bien documentado'],
            bestFor: 'Desarrolladores que buscan soluciones creativas y optimizadas',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'phind-codellama:7b', 
            name: 'Phind CodeLlama (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Versión optimizada de CodeLlama por Phind. Mejorado para búsqueda y generación de código.',
            useCases: ['Búsqueda de código', 'Generación eficiente', 'Análisis de código', 'Documentación'],
            strengths: ['Búsqueda inteligente', 'Generación rápida', 'Análisis profundo', 'Documentación clara'],
            bestFor: 'Desarrolladores que necesitan búsqueda y análisis eficiente de código',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'octocoder:7b', 
            name: 'OctoCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'medium',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en desarrollo web y aplicaciones. Optimizado para tecnologías modernas.',
            useCases: ['Desarrollo web', 'Aplicaciones modernas', 'Frontend/Backend', 'APIs', 'Frameworks populares'],
            strengths: ['Conocimiento web', 'Frameworks modernos', 'APIs y servicios', 'Desarrollo full-stack'],
            bestFor: 'Desarrolladores web y de aplicaciones modernas',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'sqlcoder:7b', 
            name: 'SQLCoder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en SQL y bases de datos. Excelente para consultas y optimización de bases de datos.',
            useCases: ['Consultas SQL', 'Optimización de bases de datos', 'Análisis de datos', 'Diseño de esquemas', 'Migración de datos'],
            strengths: ['SQL avanzado', 'Optimización de consultas', 'Análisis de rendimiento', 'Diseño de bases de datos'],
            bestFor: 'Desarrolladores de bases de datos, analistas de datos y administradores de sistemas',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          },
          { 
            id: 'python-coder:7b', 
            name: 'Python Coder (7B)', 
            size: '3.8GB', 
            downloaded: false, 
            performance: 'high',
            platform: 'independent',
            platformName: 'Independiente',
            platformDescription: 'No requiere Ollama - Funciona directamente',
            description: 'Modelo especializado en Python. Optimizado para desarrollo, análisis de datos y machine learning.',
            useCases: ['Desarrollo Python', 'Data Science', 'Machine Learning', 'Automatización', 'Scripting'],
            strengths: ['Python puro', 'Librerías populares', 'Data Science', 'ML/AI', 'Automatización'],
            bestFor: 'Desarrolladores Python, científicos de datos y profesionales de ML/AI',
            context: '8K tokens',
            ramRequired: '8-10GB',
            parameters: '7B',
            quantization: 'Q4, Q5'
          }
        ]
      }
    };
    this.conversationHistory = [];
    this.loadConfig();
  }

  _setMcpDefaultDir(serverId, path) {
    if (!serverId || !path || typeof path !== 'string') return;
    const trimmed = path.trim();
    if (!trimmed) return;
    const normalized = trimmed.replace(/\\/g, '/');
    this.mcpDefaultDirs[serverId] = {
      raw: trimmed,
      normalized
    };
  }

  _getMcpDefaultDir(serverId) {
    if (!serverId) return null;
    return this.mcpDefaultDirs[serverId] || null;
  }

  /**
   * Validar si un modelo está disponible para uso
   */
  validateModelAvailability(modelId, type) {
    if (!modelId) return false;
    
    if (type === 'local') {
      const model = this.getAllLocalModels().find(m => m.id === modelId);
      if (!model) return false;
      // Solo permitir modelos que estén marcados como descargados
      return model.downloaded === true;
    } else if (type === 'remote') {
      const model = this.models.remote.find(m => m.id === modelId);
      if (!model) return false;
      // Solo permitir modelos remotos con API key configurada
      const apiKey = this.getApiKey(model.provider);
      return !!apiKey;
    }
    
    return false;
  }

  /**
   * Cargar configuración desde localStorage
   */
  loadConfig() {
    try {
      const config = localStorage.getItem('ai-service-config');
      if (config) {
        const parsed = JSON.parse(config);
        
        // Restaurar API keys primero (necesario para validación de modelos remotos)
        this.apiKey = parsed.apiKey || null;
        this.remoteOllamaUrl = parsed.remoteOllamaUrl || null;
        this.performanceConfig = parsed.performanceConfig || null;
        
        // Cargar estado de modelos locales descargados
        if (parsed.localModels) {
          const allLocalModels = this.getAllLocalModels();
          allLocalModels.forEach(model => {
            const saved = parsed.localModels.find(m => m.id === model.id);
            if (saved) {
              model.downloaded = saved.downloaded;
            }
          });
        }
        
        // Validar que el modelo guardado esté disponible antes de usarlo
        const savedModel = parsed.currentModel;
        const savedType = parsed.modelType || 'remote';
        
        if (savedModel && this.validateModelAvailability(savedModel, savedType)) {
          // Modelo válido, usar configuración guardada
          this.currentModel = savedModel;
          this.modelType = savedType;
        } else {
          // Modelo no válido o no disponible, limpiar selección
          // El usuario deberá seleccionar un modelo válido manualmente
          this.currentModel = null;
          this.modelType = 'remote';
          
          if (savedModel) {
            debugLogger.warn('AIService', `Modelo guardado ${savedModel} (${savedType}) no está disponible. Limpiando selección.`);
          }
        }
      }
    } catch (error) {
      console.error('Error cargando configuración de AI:', error);
    }
  }

  /**
   * Guardar configuración en localStorage
   */
  saveConfig() {
    try {
      const config = {
        currentModel: this.currentModel,
        modelType: this.modelType,
        apiKey: this.apiKey,
        remoteOllamaUrl: this.remoteOllamaUrl,
        performanceConfig: this.performanceConfig,
        localModels: this.getAllLocalModels().map(m => ({ id: m.id, downloaded: m.downloaded }))
      };
      localStorage.setItem('ai-service-config', JSON.stringify(config));
    } catch (error) {
      console.error('Error guardando configuración de AI:', error);
    }
  }

  /**
   * Obtener todos los modelos locales (Ollama + Independientes)
   */
  getAllLocalModels() {
    return [...this.models.local.ollama, ...this.models.local.independent];
  }

  /**
   * Obtener lista de modelos disponibles
   */
  getAvailableModels(type = null) {
    if (type) {
      if (type === 'local') {
        return this.getAllLocalModels();
      }
      return this.models[type] || [];
    }
    return {
      remote: this.models.remote,
      local: this.getAllLocalModels()
    };
  }

  /**
   * Obtener solo los modelos funcionales (con API key o descargados)
   */
  getFunctionalModels() {
    const functional = [];
    
    // Modelos remotos con API key configurada
    this.models.remote.forEach(model => {
      const apiKey = this.getApiKey(model.provider);
      if (apiKey) {
        functional.push({
          ...model,
          type: 'remote',
          displayName: `${model.name} (${model.provider})`
        });
      }
    });
    
    // Modelos locales descargados
    this.getAllLocalModels().forEach(model => {
      if (model.downloaded) {
        functional.push({
          ...model,
          type: 'local',
          displayName: `${model.name} (Local)`
        });
      }
    });
    
    return functional;
  }

  /**
   * Obtener configuración de rendimiento para un modelo
   */
  getModelPerformanceConfig(modelId, modelType) {
    debugLogger.debug('AIService', `getModelPerformanceConfig - Modelo: ${modelId}, Tipo: ${modelType}`);
    
    // Configuraciones específicas por modelo cloud
    const cloudModelConfigs = {
      // OpenAI Models
      'gpt-4': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 128000 // 128K contexto
      },
      'gpt-4-turbo': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 128000 // 128K contexto
      },
      'gpt-3.5-turbo': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 16000 // 16K contexto
      },
      'gpt-3.5-turbo-16k': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 16000 // 16K contexto
      },
      
      // Anthropic Models
      'claude-3-opus': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-3-sonnet': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-3-haiku': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 200000 // 200K contexto
      },
      'claude-2': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 100000 // 100K contexto
      },
      
      // Google Models
      'gemini-2.5-flash': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 1000000 // 1M contexto (Flash tiene contexto muy alto)
      },
      'gemini-2.5-pro': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 2000000 // 2M contexto (Pro tiene el contexto más alto)
      },
      'gemini-2.0-flash-exp': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 1000000 // 1M contexto (experimental)
      },
      // Modelos legacy (por compatibilidad)
      'gemini-pro': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 32000 // 32K contexto
      },
      'gemini-pro-vision': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 32000 // 32K contexto
      }
    };

    // Si es un modelo cloud, usar configuración específica (prioridad máxima)
    if (modelType === 'remote' && cloudModelConfigs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para ${modelId}:`, cloudModelConfigs[modelId]);
      return cloudModelConfigs[modelId];
    }

    // Para modelos locales, verificar configuración guardada manualmente (prioridad alta)
    if (modelType === 'local') {
      try {
        const localConfigs = JSON.parse(localStorage.getItem('local-model-performance-configs') || '{}');
        
        // Buscar configuración exacta primero
        if (localConfigs[modelId]) {
          debugLogger.info('AIService', `✅ Usando configuración INDIVIDUAL guardada para ${modelId}:`, localConfigs[modelId]);
          return localConfigs[modelId];
        }
        
        // Si no se encuentra, intentar con el nombre base (sin tags como :latest, :8b, etc.)
        // Esto permite que modelos como "llama3.2:latest" usen la configuración de "llama3.2"
        const baseModelId = modelId.split(':')[0];
        if (baseModelId !== modelId && localConfigs[baseModelId]) {
          debugLogger.info('AIService', `✅ Usando configuración INDIVIDUAL guardada para ${baseModelId} (base de ${modelId}):`, localConfigs[baseModelId]);
          return localConfigs[baseModelId];
        }
        
        // Buscar también por coincidencias parciales (para modelos personalizados)
        // Por ejemplo, si tenemos "mistral:7b" instalado y configuramos "mistral"
        const matchingKey = Object.keys(localConfigs).find(key => {
          return modelId.includes(key) || key.includes(baseModelId);
        });
        if (matchingKey) {
          debugLogger.info('AIService', `✅ Usando configuración INDIVIDUAL guardada (coincidencia parcial) ${matchingKey} para ${modelId}:`, localConfigs[matchingKey]);
          return localConfigs[matchingKey];
        }
      } catch (e) {
        debugLogger.warn('AIService', `Error al cargar configuración individual de ${modelId}:`, e.message);
      }
    }

    // Si no, usar configuración automática basada en performance
    let model;
    if (modelType === 'local') {
      model = this.getAllLocalModels().find(m => m.id === modelId);
    } else {
      model = this.models[modelType].find(m => m.id === modelId);
    }
    
    if (!model) {
      debugLogger.warn('AIService', `Modelo no encontrado, usando configuración por defecto`);
      return this.getDefaultPerformanceConfig();
    }

    // Configuraciones específicas para modelos Qwen con contextos largos
    const qwen3Configs = {
      'qwen2.5': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen 2.5
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'qwen3:8b': {
        maxTokens: 15000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen3
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'qwen3:30b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 25,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Qwen3
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para modelos GPT-OSS con contextos largos
    const gptOssConfigs = {
      'gpt-oss:20b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de GPT-OSS 20B
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gpt-oss:120b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de GPT-OSS 120B
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para Llama 3.2
    const llama32Configs = {
      'llama3.2:latest': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3.2 3B
        num_ctx: 8000          // Para Ollama
      },
      'llama3.2:1b': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 4000,    // 4K contexto nativo de Llama 3.2 1B
        num_ctx: 4000          // Para Ollama
      }
    };

    // Configuraciones específicas para Llama 3.1 con contexto extendido
    const llama31Configs = {
      'llama3.1:8b': {
        maxTokens: 8000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1 8B
        num_ctx: 128000        // Para Ollama
      },
      'llama3.1:latest': {
        maxTokens: 8000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1
        num_ctx: 128000        // Para Ollama
      },
      'llama3.1:70b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo de Llama 3.1 70B
        num_ctx: 128000        // Para Ollama
      }
    };

    // Configuraciones específicas para Llama 3 (versión anterior)
    const llama3Configs = {
      'llama3': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3 8B
        num_ctx: 8000          // Para Ollama
      },
      'llama3:70b': {
        maxTokens: 10000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 8000,    // 8K contexto nativo de Llama 3 70B
        num_ctx: 8000          // Para Ollama
      }
    };

    // Configuraciones específicas para DeepSeek R1 (todos tienen 128K contexto)
    const deepseekR1Configs = {
      'deepseek-r1:latest': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,      // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:1.5b': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 16,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,       // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:7b': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 18,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,       // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:8b': {
        maxTokens: 2000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 8192,  // Reducido para velocidad
        num_ctx: 8192,       // Para Ollama - más rápido
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:14b': {
        maxTokens: 14000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:32b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 28,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:70b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 32,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'deepseek-r1:671b': {
        maxTokens: 24000,
        temperature: 0.7,
        maxHistory: 36,
        useStreaming: true,
        contextLimit: 160000,  // 160K contexto nativo
        num_ctx: 160000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Configuraciones específicas para Gemma 3 (multimodal)
    const gemma3Configs = {
      'gemma3:latest': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:270m': {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 12,
        useStreaming: true,
        contextLimit: 32000,   // 32K contexto nativo
        num_ctx: 32000,        // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:1b': {
        maxTokens: 6000,
        temperature: 0.7,
        maxHistory: 14,
        useStreaming: true,
        contextLimit: 32000,   // 32K contexto nativo
        num_ctx: 32000,        // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:4b': {
        maxTokens: 12000,
        temperature: 0.7,
        maxHistory: 20,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:12b': {
        maxTokens: 16000,
        temperature: 0.7,
        maxHistory: 24,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      },
      'gemma3:27b': {
        maxTokens: 20000,
        temperature: 0.7,
        maxHistory: 28,
        useStreaming: true,
        contextLimit: 128000,  // 128K contexto nativo (multimodal)
        num_ctx: 128000,       // Para Ollama
        top_k: 40,
        top_p: 0.9,
        repeat_penalty: 1.1
      }
    };

    // Si es un modelo Gemma 3, usar configuración específica
    if (gemma3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Gemma 3 ${modelId}:`, gemma3Configs[modelId]);
      return gemma3Configs[modelId];
    }

    // Si es un modelo DeepSeek R1, usar configuración específica
    if (deepseekR1Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para DeepSeek R1 ${modelId}:`, deepseekR1Configs[modelId]);
      return deepseekR1Configs[modelId];
    }

    // Si es un modelo Qwen, usar configuración específica
    if (qwen3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Qwen ${modelId}:`, qwen3Configs[modelId]);
      return qwen3Configs[modelId];
    }

    // Si es un modelo GPT-OSS, usar configuración específica
    if (gptOssConfigs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para GPT-OSS ${modelId}:`, gptOssConfigs[modelId]);
      return gptOssConfigs[modelId];
    }

    // Si es un modelo Llama 3.2, usar configuración específica
    if (llama32Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3.2 ${modelId}:`, llama32Configs[modelId]);
      return llama32Configs[modelId];
    }

    // Si es un modelo Llama 3.1, usar configuración específica
    if (llama31Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3.1 ${modelId}:`, llama31Configs[modelId]);
      return llama31Configs[modelId];
    }

    // Si es un modelo Llama 3, usar configuración específica
    if (llama3Configs[modelId]) {
      debugLogger.trace('AIService', `Usando configuración específica para Llama 3 ${modelId}:`, llama3Configs[modelId]);
      return llama3Configs[modelId];
    }

    const performanceLevel = model.performance || 'medium';
    debugLogger.debug('AIService', `Usando configuración por performance (${performanceLevel}) para ${modelId}`);
    
    const configs = {
      low: {
        maxTokens: 4000,
        temperature: 0.7,
        maxHistory: 5,
        useStreaming: false,
        contextLimit: 2000
      },
      medium: {
        maxTokens: 6000,  // Reducido de 7000 para mejor coherencia con modelos cloud
        temperature: 0.7,
        maxHistory: 8,
        useStreaming: true,
        contextLimit: 8000  // Aumentado de 4000 para mejor contexto
      },
      high: {
        maxTokens: 8000,  // Reducido de 12000 para mantener consistencia
        temperature: 0.7,
        maxHistory: 10,
        useStreaming: true,
        contextLimit: 16000  // Aumentado de 8000 para aprovechar mejor los modelos grandes
      }
    };

    const finalConfig = configs[performanceLevel] || configs.medium;
    debugLogger.trace('AIService', `Configuración final para ${modelId}:`, finalConfig);
    return finalConfig;
  }

  /**
   * Configuración por defecto
   */
  getDefaultPerformanceConfig() {
    return {
      maxTokens: 7000,
      temperature: 0.7,
      maxHistory: 8,
      useStreaming: true,
      contextLimit: 4000
    };
  }

  /**
   * Establecer configuración manual de rendimiento
   */
  setPerformanceConfig(config) {
    this.performanceConfig = config;
    this.saveConfig();
  }

  /**
   * Obtener configuración manual de rendimiento
   */
  getPerformanceConfig() {
    return this.performanceConfig;
  }

  /**
   * Limpiar configuración manual (volver a automática)
   */
  clearPerformanceConfig() {
    this.performanceConfig = null;
    this.saveConfig();
  }

  /**
   * Activar/desactivar logging de debug detallado para AIService
   */
  setDebugLogging(enabled) {
    if (enabled) {
      debugLogger.enableModule('AIService');
    } else {
      debugLogger.disableModule('AIService');
    }
  }

  /**
   * Obtener estado del debug logging
   */
  isDebugLoggingEnabled() {
    return debugLogger.isModuleEnabled('AIService');
  }

  /**
   * Detectar modelos instalados en Ollama
   */
  async detectOllamaModels() {
    try {
      const ollamaUrl = this.getOllamaUrl();
      const response = await fetch(`${ollamaUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`No se pudo conectar con Ollama en ${ollamaUrl}`);
      }
      
      const data = await response.json();
      
      // Actualizar lista de modelos locales con los detectados
      if (data.models && Array.isArray(data.models)) {
        // Primero marcar todos los modelos como no instalados
        this.models.local.ollama.forEach(model => {
          model.downloaded = false;
        });
        this.models.local.independent.forEach(model => {
          model.downloaded = false;
        });
        
        // Luego marcar como instalados solo los que están en Ollama
        const installedModelNames = data.models.map(model => model.name);
        
        installedModelNames.forEach(modelName => {
          // Extraer el nombre base del modelo (sin tags como :latest, :8b, etc.)
          const baseModelName = modelName.split(':')[0];
          
          // Buscar en modelos de Ollama prefiriendo coincidencia exacta, luego coincidencia de nombre base
          let ollamaIndex = this.models.local.ollama.findIndex(m => m.id === modelName);
          if (ollamaIndex === -1) {
            ollamaIndex = this.models.local.ollama.findIndex(m => m.id === baseModelName);
          }
          
          if (ollamaIndex >= 0) {
            this.models.local.ollama[ollamaIndex].downloaded = true;
            // Actualizar el ID para que coincida con el nombre exacto instalado
            this.models.local.ollama[ollamaIndex].id = modelName;
            // NO actualizar el nombre para mantener el nombre configurado con el número de B
          } else {
            // Buscar en modelos independientes
            let independentIndex = this.models.local.independent.findIndex(m => m.id === modelName);
            if (independentIndex === -1) {
              independentIndex = this.models.local.independent.findIndex(m => m.id === baseModelName);
            }
            
            if (independentIndex >= 0) {
              this.models.local.independent[independentIndex].downloaded = true;
              // Actualizar el ID para que coincida con el nombre exacto instalado
              this.models.local.independent[independentIndex].id = modelName;
              // NO actualizar el nombre para mantener el nombre configurado
            } else {
              // Modelo no conocido, no agregarlo a la lista predefinida
              // Solo marcar como no disponible en la configuración
              debugLogger.debug('AIService.Models', 'Modelo detectado fuera de la configuración predefinida', {
                modelName
              });
            }
          }
        });
        
        // Limpiar duplicados - remover modelos predefinidos que ya están instalados con tags
        this.cleanDuplicateModels();
        
        // Validar que el modelo actual siga siendo válido después de la detección
        if (this.currentModel && this.modelType === 'local') {
          if (!this.validateModelAvailability(this.currentModel, this.modelType)) {
            debugLogger.warn('AIService', `El modelo actual ${this.currentModel} ya no está instalado. Limpiando selección.`);
            this.currentModel = null;
            this.modelType = 'remote';
          }
        }
        
        this.saveConfig();
        
        return installedModelNames;
      }
      
      return [];
    } catch (error) {
      console.error('Error detectando modelos de Ollama:', error);
      return [];
    }
  }

  /**
   * Limpiar modelos duplicados - remover modelos predefinidos que ya están instalados con tags
   */
  cleanDuplicateModels() {
    // Crear un mapa de modelos instalados por nombre base
    const installedBaseNames = new Set();
    this.models.local.ollama.forEach(model => {
      if (model.downloaded && model.id.includes(':')) {
        const baseName = model.id.split(':')[0];
        installedBaseNames.add(baseName);
      }
    });

    // Remover modelos predefinidos que ya están instalados con tags
    this.models.local.ollama = this.models.local.ollama.filter(model => {
      if (!model.downloaded && installedBaseNames.has(model.id)) {
        return false; // Remover modelo predefinido que ya está instalado con tag
      }
      return true;
    });
  }

  /**
   * Agregar modelo personalizado
   */
  addCustomModel(modelId, modelName = null) {
    const existingModel = this.getAllLocalModels().find(m => m.id === modelId);
    if (!existingModel) {
      this.models.local.ollama.push({
        id: modelId,
        name: modelName || modelId,
        size: 'Personalizado',
        downloaded: true,
        custom: true
      });
      this.saveConfig();
    }
  }

  /**
   * Seleccionar modelo actual
   */
  setCurrentModel(modelId, type) {
    // Validar que el modelo esté disponible antes de seleccionarlo
    if (!this.validateModelAvailability(modelId, type)) {
      const modelName = modelId || 'desconocido';
      const errorMsg = type === 'local' 
        ? `El modelo ${modelName} no está instalado. Instálalo primero en Ollama.`
        : `El modelo ${modelName} no está disponible. Configura la API Key correspondiente.`;
      debugLogger.error('AIService', 'Modelo no disponible al intentar seleccionarlo', {
        modelId,
        modelType: type,
        message: errorMsg
      });
      throw new Error(errorMsg);
    }
    
    this.currentModel = modelId;
    this.modelType = type;
    this.saveConfig();
    
    debugLogger.info('AIService', `Modelo seleccionado: ${modelId} (${type})`);
  }

  /**
   * Configurar API Key para modelos remotos
   */
  setApiKey(provider, key) {
    if (!this.apiKey) {
      this.apiKey = {};
    }
    this.apiKey[provider] = key;
    this.saveConfig();
  }

  /**
   * Obtener API Key para un provider
   */
  getApiKey(provider) {
    return this.apiKey?.[provider] || null;
  }

  /**
   * Configurar URL de Ollama remoto
   */
  setRemoteOllamaUrl(url) {
    this.remoteOllamaUrl = url;
    this.saveConfig();
  }

  /**
   * Obtener URL de Ollama (local o remoto)
   */
  getOllamaUrl() {
    return this.remoteOllamaUrl || 'http://localhost:11434';
  }

  /**
   * Enviar mensaje al modelo de IA
   */
  async sendMessage(message, options = {}) {
    if (!this.currentModel) {
      throw new Error('No se ha seleccionado ningún modelo');
    }

    // Obtener configuración de rendimiento automática
    const perfConfig = this.getModelPerformanceConfig(this.currentModel, this.modelType);
    
    // Combinar opciones con configuración automática
    const finalOptions = {
      ...perfConfig,
      ...options
    };

    // Limitar historial si es necesario
    if (this.conversationHistory.length > finalOptions.maxHistory) {
      this.conversationHistory = this.conversationHistory.slice(-finalOptions.maxHistory);
    }

    // Agregar mensaje al historial
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    try {
      let response;
      
      if (this.modelType === 'remote') {
        response = await this.sendToRemoteModel(message, finalOptions);
      } else {
        response = await this.sendToLocalModel(message, finalOptions);
      }

      // Agregar respuesta al historial
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: Date.now()
      });

      return response;
    } catch (error) {
      console.error('Error enviando mensaje a IA:', error);
      throw error;
    }
  }

  /**
   * FILTRAR tools por contexto/relevancia
   * Selecciona solo las herramientas más apropiadas para la pregunta
   */
  filterToolsByContext(tools, message = '') {
    const lowerMsg = message.toLowerCase();
    let selectedTools = [];

    // 🌐 Si es sobre WEB (URL, busca, sitio, página) → Solo Puppeteer + Filesystem
    if (lowerMsg.includes('http') || lowerMsg.includes('url') || lowerMsg.includes('busca') || 
        lowerMsg.includes('sitio') || lowerMsg.includes('página') || lowerMsg.includes('web') ||
        lowerMsg.includes('.com') || lowerMsg.includes('web search') || lowerMsg.includes('google')) {
      selectedTools = ['web_search', 'site_search', 'fetch_page', 'extract_text', 'goto_url', 'screenshot'];
      debugLogger.debug('AIService.ToolsFilter', 'Modo WEB: WebSearch nativo');
    }
    // 📁 Si es sobre ARCHIVOS → Solo Filesystem
    else if (lowerMsg.includes('archivo') || lowerMsg.includes('archivo') || lowerMsg.includes('carpeta') ||
             lowerMsg.includes('directorio') || lowerMsg.includes('leer') || lowerMsg.includes('crear archivo')) {
      selectedTools = ['read_file', 'list_directory', 'write_file'];
      debugLogger.debug('AIService.ToolsFilter', 'Modo ARCHIVOS: Filesystem solo');
    }
    // 🔧 Si es sobre COMANDOS → run_command
    else if (lowerMsg.includes('comando') || lowerMsg.includes('ejecuta') || lowerMsg.includes('run') ||
             lowerMsg.includes('script') || lowerMsg.includes('terminal') || lowerMsg.includes('shell')) {
      selectedTools = ['run_command'];
      debugLogger.debug('AIService.ToolsFilter', 'Modo COMANDOS: CLI solo');
    }
    // ❓ Por defecto: esenciales sin run_command (web prioritario)
    else {
      selectedTools = ['read_file', 'list_directory', 'write_file', 'web_search', 'site_search', 'goto_url', 'screenshot'];
      debugLogger.debug('AIService.ToolsFilter', 'Modo DEFAULT: Web + Filesystem (NO CLI)');
    }

    const filtered = tools.filter(t => {
      return selectedTools.some(st => t.name.includes(st));
    });

    debugLogger.debug('AIService.ToolsFilter', 'Tools filtrados por contexto', {
      disponibles: tools.length,
      relevantes: filtered.length
    });
    return filtered;
  }

  /**
   * Inyectar contexto MCP (tools, resources, prompts) en los mensajes
   */
  async injectMCPContext(message = '') {
    try {
      // Verificar si hay MCPs activos
      if (!mcpClient.hasActiveServers()) {
        return { tools: [], resources: [], prompts: [], hasTools: false };
      }

      // Obtener tools disponibles
      let tools = mcpClient.getAvailableTools();
      const resources = mcpClient.getAvailableResources();
      const prompts = mcpClient.getAvailablePrompts();

      // 🔍 FILTRAR TOOLS (contextual)
      tools = this.filterToolsByContext(tools, message);

      debugLogger.debug('AIService.MCP', 'Contexto MCP generado', {
        tools: tools.length,
        resources: resources.length,
        prompts: prompts.length
      });

      return {
        tools,
        resources,
        prompts,
        hasTools: tools.length > 0
      };
    } catch (error) {
      console.error('[MCP] Error obteniendo contexto MCP:', error);
      return { tools: [], resources: [], prompts: [], hasTools: false };
    }
  }

  /**
   * Obtener lista de directorios permitidos (con caché de 5 minutos)
   */
  async getAllowedDirectoriesCached() {
    try {
      const now = Date.now();
      const TTL_MS = 5 * 60 * 1000; // 5 minutos
      if (this.allowedDirectoriesCache.value && (now - this.allowedDirectoriesCache.fetchedAt) < TTL_MS) {
        return this.allowedDirectoriesCache.value;
      }

      // Llamar a la tool solo si existe en el servidor filesystem
      const tools = mcpClient.getAvailableTools() || [];
      const hasFilesystem = tools.some(t => t.name === 'list_allowed_directories');
      if (!hasFilesystem) return null;

      const result = await mcpClient.callTool('list_allowed_directories', {});
      let dirsText = null;
      if (result && result.content && Array.isArray(result.content) && result.content.length > 0) {
        const text = result.content[0].text || '';
        // Formato esperado: "Allowed directories:\nC:\\path1"
        const match = text.match(/Allowed directories:\s*([\s\S]+)/i);
        if (match) {
          dirsText = match[1].trim();
        }
      }

      this.allowedDirectoriesCache = {
        value: dirsText,
        fetchedAt: now
      };

      if (dirsText) {
        const firstLine = dirsText.split('\n').map(l => l.trim()).find(Boolean);
        if (firstLine) {
          this._setMcpDefaultDir('filesystem', firstLine);
        }
      }
      return dirsText;
    } catch (err) {
      debugLogger.warn('AIService.MCP', 'No se pudieron cachear los directorios permitidos', {
        error: err.message
      });
      return null;
    }
  }

  /**
   * Convertir tools MCP a formato function calling del proveedor
   */
  convertMCPToolsToProviderFormat(tools, provider, options = {}) {
    if (!tools || tools.length === 0) return [];

    return tools.map(tool => {
      // Formato común para function calling
      const toolDef = {
        name: (options.namespace ? `${tool.serverId}__${tool.name}` : tool.name),
        description: tool.description || `Herramienta ${tool.name} del servidor ${tool.serverId}`,
        parameters: tool.inputSchema || { type: 'object', properties: {} }
      };

      // Adaptar según el proveedor
      if (provider === 'openai') {
        return {
          type: 'function',
          function: toolDef
        };
      } else if (provider === 'anthropic') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          input_schema: toolDef.parameters
        };
      } else if (provider === 'google') {
        return {
          name: toolDef.name,
          description: toolDef.description,
          parameters: toolDef.parameters
        };
      }

      return toolDef;
    });
  }

  /**
   * Generar system prompt UNIVERSAL para MCP (modelos sin function calling)
   * - Agrupa por servidor
   * - Formato de invocación recomendado: {"server":"<serverId>","tool":"<toolName>","arguments":{}}
   * - Alternativa: {"tool":"<serverId>__<toolName>","arguments":{}}
   */
  generateUniversalMCPSystemPrompt(tools, options = {}) {
    if (!tools || tools.length === 0) return '';

    const maxPerServer = typeof options.maxPerServer === 'number' ? options.maxPerServer : 8;
    const serverHints = options.serverHints || {};

    // Agrupar tools por servidor
    const serverIdToTools = tools.reduce((acc, t) => {
      const sid = t.serverId || 'unknown';
      if (!acc[sid]) acc[sid] = [];
      acc[sid].push(t);
      return acc;
    }, {});

    let out = '';
    out += 'INSTRUCCIONES CRÍTICAS - HERRAMIENTAS MCP (Modo ReAct)\n';
    out += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';
    out += 'IMPORTANTE: Genera un PLAN de herramientas ANTES de ejecutar.\n\n';
    out += 'Si el usuario pide UNA acción → genera una herramienta:\n';
    out += '{"tool":"<serverId>__<toolName>","arguments":{...}}\n\n';
    out += 'Si el usuario pide MÚLTIPLES acciones → genera un PLAN:\n';
    out += '{"plan":[{"tool":"<name1>","arguments":{...}},{"tool":"<name2>","arguments":{...}}]}\n\n';
    out += 'REGLAS:\n';
    out += '1. Analiza la solicitud del usuario\n';
    out += '2. Identifica TODAS las acciones necesarias\n';
    out += '3. Genera el plan completo de UNA VEZ\n';
    out += '4. NO ejecutes herramientas innecesarias\n';
    out += '5. USA el directorio por defecto si no se especifica ruta\n\n';

    const serverIds = Object.keys(serverIdToTools).sort();
    serverIds.forEach((serverId, sidx) => {
      const list = serverIdToTools[serverId] || [];
      // Selección Top‑K por servidor (simple: truncar por tamaño)
      const selected = list.slice(0, Math.max(1, maxPerServer));

      out += `Servidor: ${serverId}\n`;
      out += `${'—'.repeat(10 + serverId.length)}\n`;

      // Hints específicos del servidor (p.ej., filesystem)
      const hints = serverHints[serverId] || {};
      if (hints.allowedDirsText) {
        out += 'Directorios permitidos:\n';
        // Imprimir máximo 3 líneas para no gastar tokens
        const lines = String(hints.allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean).slice(0, 3);
        lines.forEach(l => { out += `  - ${l}\n`; });
        if ((String(hints.allowedDirsText).split('\n').length) > lines.length) {
          out += '  - ...\n';
        }
        out += '\n';
      }
      if (hints.defaultRaw) {
        out += `⚠️ IMPORTANTE: Si el usuario pide "listar directorio" o similar SIN especificar ruta,\n`;
        out += `   USA AUTOMÁTICAMENTE este directorio: ${hints.defaultRaw}\n`;
        out += `   NO pidas al usuario que especifique la ruta.\n\n`;
      }

      // Acciones comunes (sólo si es filesystem)
      if (serverId === 'filesystem') {
        const names = list.map(t => t.name);
        const has = (n) => names.includes(n);
        const bullets = [];
        if (has('list_directory')) bullets.push('• "listar", "ver contenido" → list_directory { path }');
        if (has('list_directory_with_sizes')) bullets.push('• "listar con tamaños" → list_directory_with_sizes { path } [📊 Muestra tamaños, mejor para comparar]');
        if (has('read_text_file')) bullets.push('• "leer fichero" → read_text_file { path }');
        if (has('write_file')) bullets.push('• "crear/guardar fichero" → write_file { path, content }');
        if (has('edit_file')) bullets.push('• "editar parte de un fichero" → edit_file { path, edits: [{ old_text: "buscar", new_text: "reemplazar" }] }');
        if (has('create_directory')) bullets.push('• "crear carpeta" → create_directory { path }');
        if (has('move_file')) {
          // Obtener los nombres reales de parámetros de la tool move_file
          const moveTool = list.find(t => t.name === 'move_file');
          const moveSchema = moveTool?.inputSchema?.properties || {};
          const moveParams = Object.keys(moveSchema);
          const paramHint = moveParams.length >= 2 ? `{ ${moveParams[0]}, ${moveParams[1]} }` : '{ source, destination }';
          bullets.push(`• "mover" o "renombrar" → move_file ${paramHint}`);
          bullets.push(`  ⚠️ IMPORTANTE: El destino DEBE incluir el nombre del archivo completo.`);
          bullets.push(`     Ejemplo: mover "file.txt" a carpeta "Proyectos" → { source: "ruta/file.txt", destination: "ruta/Proyectos/file.txt" }`);
        }
        if (has('search_files')) bullets.push('• "buscar ficheros" → search_files { pattern: "*.txt" o "p*" o "MoonlightSetup*", path } [Busca recursivamente por patrón, la búsqueda alcanza subcarpetas]');
        if (has('get_file_info')) bullets.push('• "ver info" → get_file_info { path }');
        if (bullets.length > 0) {
          out += 'Acciones comunes (filesystem):\n';
          bullets.forEach(b => { out += `  ${b}\n`; });
          if (hints.defaultRaw) {
            out += `  • Si el usuario no indica ruta, usa ${hints.defaultRaw}\n`;
          }
          out += '  • Usa rutas dentro de los directorios permitidos; en Windows prefiere rutas absolutas.\n\n';
        }
      }

      selected.forEach((tool, tidx) => {
        const schema = tool.inputSchema || {};
        const properties = schema.properties || {};
        const required = schema.required || [];

        out += `• ${tool.name}${tool.description ? ` — ${tool.description}` : ''}\n`;

        const keys = Object.keys(properties);
        if (keys.length > 0) {
          out += '  Parámetros:\n';
          keys.forEach((p) => {
            const prop = properties[p] || {};
            const t = prop.type || 'any';
            const rq = required.includes(p) ? 'REQUERIDO' : 'opcional';
            const d = prop.description || '';
            out += `    - ${p} [${t}] (${rq})${d ? `: ${d}` : ''}\n`;
          });
        }

        // Ejemplo compacto
        const exampleArgs = {};
        keys.forEach((p) => {
          const prop = properties[p] || {};
          if (prop.type === 'string') {
            const isPathLike = /path|file|dir|directory/i.test(p);
            if (isPathLike && hints.defaultRaw) {
              const baseRaw = hints.defaultRaw;
              const needsSep = !baseRaw.endsWith('\\') && !baseRaw.endsWith('/');
              if (/dir|directory/i.test(p)) {
                exampleArgs[p] = baseRaw;
              } else {
                const sep = needsSep ? (baseRaw.includes('\\') ? '\\' : '/') : '';
                exampleArgs[p] = `${baseRaw}${sep}ejemplo.txt`;
              }
            } else {
              exampleArgs[p] = 'texto';
            }
          }
          else if (prop.type === 'number') exampleArgs[p] = 0;
          else if (prop.type === 'boolean') exampleArgs[p] = true;
          else if (prop.type === 'array') exampleArgs[p] = [];
          else if (prop.type === 'object') exampleArgs[p] = {};
          else exampleArgs[p] = 'valor';
        });

        out += '  Ejemplo:\n';
        out += `  {"server":"${serverId}","tool":"${tool.name}","arguments":${JSON.stringify(exampleArgs)}}\n`;
        out += `  // o: {"tool":"${serverId}__${tool.name}","arguments":${JSON.stringify(exampleArgs)}}\n`;
        if (tidx < selected.length - 1) out += '\n';
      });

      if (sidx < serverIds.length - 1) {
        out += `\n${'━'.repeat(70)}\n\n`;
      }
    });

    out += '\nREGLAS:\n';
    out += '• Responde SOLO con JSON (sin explicación previa).\n';
    out += '• Incluye SIEMPRE "arguments" (vacío si no hay).\n';
    out += '• Si una tool existe en varios servidores, indica "server" o usa namespacing.\n';

    return out;
  }

  /**
   * Detectar PLAN de herramientas (modo ReAct) en la respuesta
   * Retorna: { isPlan: true, tools: [{tool, arguments}, ...] } o null
   */
  _detectToolPlan(response) {
    if (!response || typeof response !== 'string') return null;
    
    // Buscar JSON con estructura de plan: {"plan": [...]}
    const jsonPattern = /\{[\s\S]*?"plan"[\s\S]*?\[[\s\S]*?\][\s\S]*?\}/g;
    const matches = response.match(jsonPattern);
    
    if (!matches) return null;
    
    for (const jsonStr of matches) {
      try {
        const data = JSON.parse(jsonStr);
        if (data.plan && Array.isArray(data.plan) && data.plan.length > 0) {
          // Validar que cada elemento del plan tenga tool
          const validTools = data.plan.filter(t => t && (t.tool || t.toolName));
          if (validTools.length > 0) {
            debugLogger.debug('AIService.MCP', 'Plan detectado con herramientas válidas', {
              herramientas: validTools.length
            });
            return {
              isPlan: true,
              tools: validTools.map(t => ({
                tool: t.tool || t.toolName,
                toolName: t.tool || t.toolName,
                arguments: t.arguments || t.args || {},
                serverId: t.serverId || t.server || null
              }))
            };
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    return null;
  }

  /**
   * Ejecutar un PLAN completo de herramientas (modo ReAct)
   */
  async _executeToolPlan(plan, callbacks = {}) {
    debugLogger.debug('AIService.MCP', 'Ejecutando plan de herramientas', {
      herramientas: plan.tools.length
    });
    
    const results = [];
    for (let i = 0; i < plan.tools.length; i++) {
      const toolSpec = plan.tools[i];
      const toolName = toolSpec.toolName || toolSpec.tool;
      const args = toolSpec.arguments || {};
      
      debugLogger.debug('AIService.MCP', 'Ejecutando herramienta del plan', {
        indice: i + 1,
        total: plan.tools.length,
        tool: toolName
      });
      
      // Normalizar y resolver serverId
      const normalized = this._normalizeFunctionCall(toolName, args);
      const serverId = normalized.serverId;
      const actualToolName = normalized.toolName;
      const callArgs = normalized.arguments;
      
      // Guardar mensaje de tool call
      conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${actualToolName}`, {
        isToolCall: true,
        toolName: actualToolName,
        toolArgs: callArgs
      });
      
      // Callback de tool ejecutada
      if (callbacks.onToolResult) {
        callbacks.onToolResult({ toolName: actualToolName, args: callArgs, result: null });
      }
      
      try {
        if (!serverId) {
          throw new Error(`No se pudo resolver el servidor para la herramienta ${actualToolName}`);
        }
        
        const result = await mcpClient.callTool(serverId, actualToolName, callArgs);
        const text = result?.content?.[0]?.text || 'OK';
        
        // Guardar resultado de la tool
        conversationService.addMessage('tool', text, {
          isToolResult: true,
          toolName: actualToolName,
          toolArgs: callArgs
        });
        
        results.push({ tool: actualToolName, success: true, result: text });
        
        // Callback de tool ejecutada con resultado
        if (callbacks.onToolResult) {
          callbacks.onToolResult({ toolName: actualToolName, args: callArgs, result });
        }
        
        debugLogger.debug('AIService.MCP', 'Herramienta del plan completada', {
          indice: i + 1,
          total: plan.tools.length,
          tool: actualToolName
        });
      } catch (error) {
        const errorMsg = `❌ Error ejecutando ${actualToolName}: ${error.message}`;
        conversationService.addMessage('tool', errorMsg, { error: true });
        results.push({ tool: actualToolName, success: false, error: error.message });
        console.error(`   ❌ [${i + 1}/${plan.tools.length}] ${actualToolName} falló:`, error.message);
      }
    }
    
    debugLogger.debug('AIService.MCP', 'Plan completado', {
      exitosas: results.filter(r => r.success).length,
      total: results.length
    });
    return 'Hecho.';
  }

  /**
   * Detectar si la respuesta del modelo solicita usar una tool
   */
  detectToolCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    
    // NUEVO: Log agresivo para ver la respuesta COMPLETA
    debugLogger.debug('AIService.MCP', 'detectToolCallInResponse entrada', {
      tipo: typeof response,
      length: response?.length,
      muestra: response?.substring(0, 200),
      incluyeTool: response?.includes('"tool"'),
      incluyeLlave: response?.includes('{')
    });
    
    try {
      // Estrategia 1: Bloques explícitos con backticks (```json...```)
      const toolCall = this._extractToolCallFromCodeBlock(response);
      if (toolCall) return toolCall;
      
      // Estrategia 2: JSON flexible en cualquier posición (con preámbulo/epilogo)
      return this._extractToolCallFromJSON(response);
      
    } catch (error) {
      // Error inesperado en detección
      if (response.trim().startsWith('{') && response.trim().endsWith('}')) {
        debugLogger.debug('AIService.MCP', 'JSON inválido detectado al buscar tool call', {
          error: error.message.substring(0, 100)
        });
      }
      return null;
    }
  }

  /**
   * Detectar solicitud de PROMPT MCP en respuesta del modelo
   * Formato esperado:
   * {"prompt": {"server":"<serverId>", "name":"<promptName>", "arguments":{...}}}
   */
  detectPromptCallInResponse(response) {
    if (!response || typeof response !== 'string') return null;
    try {
      // Buscar bloque JSON que contenga "prompt": { ... }
      const re = /\{[\s\S]*?"prompt"\s*:\s*\{[\s\S]*?\}[\s\S]*?\}/g;
      const matches = response.match(re);
      if (!matches) return null;
      for (const jsonStr of matches) {
        try {
          const data = JSON.parse(jsonStr);
          const pr = data.prompt;
          if (pr && typeof pr === 'object' && pr.name) {
            return { serverId: pr.server || pr.serverId, promptName: pr.name, arguments: pr.arguments || {} };
          }
        } catch (_) { /* ignore */ }
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  async _handlePromptCallAndContinue({ serverId, promptName, arguments: args }, messages, callbacks, options, modelId) {
    try {
      const res = await mcpClient.getPrompt(serverId, promptName, args || {});
      const promptText = res?.result?.content?.[0]?.text || res?.content?.[0]?.text || '';
      const nextMessages = [...messages, { role: 'user', content: promptText }];
      return await this.sendToLocalModelStreamingWithCallbacks(modelId, nextMessages, callbacks, { ...options, maxTokens: Math.max(800, options.maxTokens || 1500) });
    } catch (e) {
      return `Error obteniendo prompt ${promptName} de ${serverId || 'desconocido'}: ${e.message}`;
    }
  }

  /**
   * Convertir JSON Schema a el formato de parámetros de Gemini (tipos en MAYÚSCULAS)
   */
  _toGeminiSchema(schema) {
    if (!schema || typeof schema !== 'object') return { type: 'OBJECT' };

    const upper = (t) => {
      if (!t) return undefined;
      const map = {
        object: 'OBJECT',
        array: 'ARRAY',
        string: 'STRING',
        number: 'NUMBER',
        integer: 'INTEGER',
        boolean: 'BOOLEAN'
      };
      return map[String(t).toLowerCase()] || String(t).toUpperCase();
    };

    const convert = (node) => {
      if (!node || typeof node !== 'object') return node;
      const t = upper(node.type);
      if (t === 'OBJECT') {
        const props = node.properties || {};
        const outProps = {};
        Object.keys(props).forEach((k) => {
          outProps[k] = convert(props[k]);
        });
        return {
          type: 'OBJECT',
          properties: outProps,
          required: Array.isArray(node.required) ? node.required : undefined
        };
      }
      if (t === 'ARRAY') {
        return {
          type: 'ARRAY',
          items: convert(node.items || {})
        };
      }
      // Primitivos
      return { type: t };
    };

    return convert(schema);
  }

  _resolveToolInfo(toolName, serverIdHint = null) {
    const tools = mcpClient.getAvailableTools() || [];
    if (serverIdHint) {
      const match = tools.find(t => t.serverId === serverIdHint && t.name === toolName);
      if (match) {
        return { serverId: match.serverId, toolName: match.name };
      }
    }

    const exactMatches = tools.filter(t => t.name === toolName);
    if (exactMatches.length === 1) {
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    if (exactMatches.length > 1) {
      return { serverId: exactMatches[0].serverId, toolName: exactMatches[0].name };
    }

    const namespacedMatch = tools.find(t => `${t.serverId}__${t.name}` === toolName);
    if (namespacedMatch) {
      return { serverId: namespacedMatch.serverId, toolName: namespacedMatch.name };
    }

    const filesystemMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
    if (filesystemMatch) {
      return { serverId: filesystemMatch.serverId, toolName: filesystemMatch.name };
    }

    return { serverId: serverIdHint, toolName };
  }

  _normalizeFunctionCall(fullName, rawArgs) {
    debugLogger.debug('AIService.MCP', '_normalizeFunctionCall entrada', { fullName, rawArgs });
    let argsObj;
    if (!rawArgs) {
      argsObj = {};
    } else if (typeof rawArgs === 'string') {
      argsObj = { tool: rawArgs };
    } else {
      argsObj = { ...rawArgs };
    }

    let toolName = argsObj.tool || argsObj.name || fullName;
    let serverId = argsObj.server || argsObj.serverId || null;

    if (!serverId && typeof fullName === 'string' && fullName.includes('__')) {
      const idx = fullName.indexOf('__');
      if (idx >= 0) {
        serverId = fullName.slice(0, idx);
        toolName = fullName.slice(idx + 2);
      }
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      } else if (matches.length > 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!serverId) {
      const fallbackDir = this._getMcpDefaultDir('filesystem');
      if (fallbackDir) {
        serverId = 'filesystem';
      }
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const fsMatch = tools.find(t => t.serverId === 'filesystem' && t.name === toolName);
      if (fsMatch) {
        serverId = 'filesystem';
      }
    }

    if (!serverId) {
      debugLogger.warn('AIService.MCP', '_normalizeFunctionCall sin serverId resuelto', {
        fullName,
        rawArgs,
        toolName,
        argsObj
      });
    }

    // Construir argumentos limpios
    let finalArgs = argsObj.arguments || argsObj.args || argsObj.parameters;
    if (typeof finalArgs === 'string') {
      finalArgs = { tool: finalArgs };
    }

    if (!finalArgs || typeof finalArgs !== 'object' || Array.isArray(finalArgs)) {
      const copy = { ...argsObj };
      delete copy.tool;
      delete copy.name;
      delete copy.server;
      delete copy.serverId;
      delete copy.arguments;
      delete copy.args;
      delete copy.parameters;
      finalArgs = copy;
    } else {
      finalArgs = { ...finalArgs };
    }

    if (finalArgs.arguments && typeof finalArgs.arguments === 'object' && !Array.isArray(finalArgs.arguments)) {
      finalArgs = { ...finalArgs, ...finalArgs.arguments };
      delete finalArgs.arguments;
    }

    if (finalArgs.server || finalArgs.serverId) {
      serverId = serverId || finalArgs.server || finalArgs.serverId;
      delete finalArgs.server;
      delete finalArgs.serverId;
    }

    const nestedTool = finalArgs.tool || finalArgs.toolName;
    if (nestedTool) {
      toolName = nestedTool;
      delete finalArgs.tool;
      delete finalArgs.toolName;
    }

    if (!serverId) {
      const tools = mcpClient.getAvailableTools() || [];
      const matches = tools.filter(t => t.name === toolName);
      if (matches.length === 1) {
        serverId = matches[0].serverId;
      }
    }

    if (!finalArgs || typeof finalArgs !== 'object') {
      finalArgs = {};
    }

    const defaultInfo = serverId ? this._getMcpDefaultDir(serverId) : this._getMcpDefaultDir('filesystem');
    const defaultPath = defaultInfo?.raw || defaultInfo?.normalized || null;
    if (defaultPath) {
      if (['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(toolName) && !finalArgs.path) {
        finalArgs.path = defaultPath;
      }
      if (toolName === 'read_text_file' && !finalArgs.path) {
        finalArgs.path = defaultPath;
      }
    }

    const resolved = this._resolveToolInfo(toolName, serverId);
    const normalized = { serverId: resolved.serverId, toolName: resolved.toolName, arguments: finalArgs };
    debugLogger.debug('AIService.MCP', '_normalizeFunctionCall salida', normalized);
    return normalized;
  }

  async _handleRemotePostResponse(rawResponse, conversationMessages, mcpContext, callbacks, options, model) {
    let responseText = rawResponse || '';

    if (mcpContext?.hasTools) {
      if (!this._getMcpDefaultDir('filesystem')) {
        try { await this.getAllowedDirectoriesCached(); } catch (_) {}
      }
      const toolCall = this.detectToolCallInResponse(responseText);
      if (toolCall) {
        if (this.toolOrchestrator) {
          try {
            const orchestratorResult = await this.toolOrchestrator.executeLoop({
              modelId: model.id,
              initialToolCall: toolCall,
              baseProviderMessages: conversationMessages,
              detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
              callModelFn: async () => 'Hecho.',
              callbacks,
              options,
              maxIterations: 3,
              turnId: options?.turnId
            });
            return orchestratorResult;
          } catch (error) {
            console.error('[MCP] Error en loop remoto:', error);
            return `Error ejecutando herramienta: ${error.message}`;
          }
        }

        try {
          const normalized = this._normalizeFunctionCall(toolCall.toolName || toolCall.tool, toolCall.arguments || {});
          const serverId = normalized.serverId;
          const toolName = normalized.toolName;
          const callArgs = normalized.arguments;
          conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { isToolCall: true, toolName, toolArgs: callArgs });
          const result = serverId ? await mcpClient.callTool(serverId, toolName, callArgs)
                                  : await mcpClient.callTool(toolName, callArgs);
          const text = result?.content?.[0]?.text || 'OK';
          conversationService.addMessage('tool', text, { isToolResult: true, toolName, toolArgs: callArgs });
          return 'Hecho.';
        } catch (error) {
          conversationService.addMessage('tool', `❌ Error ejecutando herramienta: ${error.message}`, { error: true });
          return `Error ejecutando herramienta: ${error.message}`;
        }
      }

      const promptCall = this.detectPromptCallInResponse(responseText);
      if (promptCall) {
        return await this._handlePromptCallAndContinue(promptCall, conversationMessages, callbacks, options, model.id);
      }
    }

    return responseText;
  }

  /**
   * Inferir intención básica del usuario para Filesystem a partir del texto
   */
  _inferFilesystemIntent(text) {
    if (!text || typeof text !== 'string') return null;
    const s = text.toLowerCase();
    if (/(mover|mueve|renombrar|renombra|move|rename)/.test(s)) return 'move';
    if (/(copiar|copia|copy)/.test(s)) return 'copy';
    if (/(borrar|eliminar|borra|remove|delete)/.test(s)) return 'delete';
    if (/(crear carpeta|crear directorio|mkdir|create directory)/.test(s)) return 'mkdir';
    if (/(listar|lista|ver contenido|list)/.test(s)) return 'list';
    if (/(leer|read)/.test(s)) return 'read';
    if (/(editar|edit)/.test(s)) return 'edit';
    return null;
  }

  /**
   * Extraer tool call de bloques de código (```json...```)
   */
  _extractToolCallFromCodeBlock(response) {
    const jsonBlockRegex = /```(?:json|tool|tool_call)?\s*([\s\S]*?)```/gi;
    let match = jsonBlockRegex.exec(response);
    
    while (match) {
      try {
        const jsonContent = match[1].trim();
        const data = JSON.parse(jsonContent);
        const toolCall = this._normalizeToolCall(data);
        if (toolCall) return toolCall;
      } catch (e) {
        // Este bloque no es válido, intentar siguiente
      }
      match = jsonBlockRegex.exec(response);
    }
    
    return null;
  }

  /**
   * Extraer tool call de JSON flexible (en cualquier posición con preámbulo/epilogo)
   */
  _extractToolCallFromJSON(response) {
    // NUEVO: Log para debugging
    debugLogger.debug('AIService.MCP', 'Buscando JSON en respuesta', { length: response.length });
    
    // Buscar JSON que contenga "tool" o "use_tool"
    // Permite preámbulo y epilogo alrededor del JSON
    // FIX: Usar [\s\S]* GREEDY (sin ?) para capturar hasta el ÚLTIMO } del objeto
    const jsonPattern = /\{[\s\S]*?"(?:tool|use_tool)"[\s\S]*\}/g;
    const matches = response.match(jsonPattern);
    
    if (!matches) {
      debugLogger.debug('AIService.MCP', 'No se encontró JSON con tool/use_tool');
      return null;
    }
    
    // Intentar cada JSON encontrado (puede haber múltiples)
    for (let i = 0; i < matches.length; i++) {
      const jsonStr = matches[i];
      debugLogger.debug('AIService.MCP', 'Intentando candidato para tool call', {
        indice: i + 1,
        preview: jsonStr.substring(0, 50).replace(/\n/g, '\\n')
      });
      
      try {
        const data = JSON.parse(jsonStr);
        const toolCall = this._normalizeToolCall(data);
        if (toolCall) {
          debugLogger.debug('AIService.MCP', 'Tool call detectado', { tool: toolCall.toolName });
          return toolCall;
        }
      } catch (e) {
        debugLogger.debug('AIService.MCP', 'JSON inválido durante parseo de tool call', { error: e.message });
        continue;
      }
    }
    
    debugLogger.debug('AIService.MCP', 'Ningún candidato fue un tool call válido');
    return null;
  }

  /**
   * Validar si data es un tool call válido
   */
  _isValidToolCall(data) {
    if (!data || typeof data !== 'object') return false;
    
    const hasToolField = (data.tool && typeof data.tool === 'string') ||
                         (data.use_tool && typeof data.use_tool === 'string');
    
    return hasToolField;
  }

  /**
   * Normalizar tool call a formato estándar
   */
  _normalizeToolCall(data) {
    if (!this._isValidToolCall(data)) return null;
    
    return {
      toolName: data.tool || data.use_tool,
      arguments: data.arguments || {},
      serverId: data.serverId || data.server || null
    };
  }

  /**
   * Manejar loop de tool calls para modelos locales (system prompt)
   * Soporta múltiples iteraciones, re-inyección de resultados, y detección de loops
   */
  async handleLocalToolCallLoop(toolCall, messages, callbacks = {}, options = {}, modelId, maxIterations = 5) {
    let iteration = 0;
    let currentToolCall = toolCall;
    let conversationMessages = [...messages];
    let lastToolName = null;
    let consecutiveRepeats = 0;
    const lastUserGoal = (() => {
      try {
        const reversed = [...messages].reverse();
        const lastUser = reversed.find(m => m && m.role === 'user' && typeof m.content === 'string');
        return lastUser ? lastUser.content : null;
      } catch (_) {
        return null;
      }
    })();
    const inferredIntent = this._inferFilesystemIntent(lastUserGoal || '');
    
    debugLogger.debug('AIService.MCP', 'Iniciando loop de tool calls', { maxIterations });
    
    while (currentToolCall && iteration < maxIterations) {
      iteration++;
      
      debugLogger.debug('AIService.MCP', 'Iteración de loop tool call', {
        iteration,
        maxIterations,
        tool: currentToolCall.toolName
      });
      
      // NEW: Detect infinite loops (same tool repeated)
      if (lastToolName === currentToolCall.toolName) {
        consecutiveRepeats++;
        debugLogger.warn('AIService.MCP', 'Mismo tool repetido consecutivamente', {
          repeticiones: consecutiveRepeats,
          tool: currentToolCall.toolName
        });
        
        // Si el mismo tool se pide 2 veces seguidas (es decir, 3 veces en total), probablemente es un loop
        if (consecutiveRepeats >= 2) {
          debugLogger.warn('AIService.MCP', 'Loop infinito detectado, deteniendo ejecución', {
            tool: currentToolCall.toolName
          });
          if (callbacks.onStatus) {
            callbacks.onStatus({
              status: 'warning',
              message: `⚠️ Loop infinito detectado (${currentToolCall.toolName} repetido 3 veces)`,
              model: modelId,
              provider: 'local'
            });
          }
          
          // FIX: Return the last meaningful response instead of just breaking
          const lastMessage = conversationMessages[conversationMessages.length - 1];
          const lastContent = lastMessage?.content || '';
          
          return `⚠️ Se detectó un loop infinito con la herramienta "${currentToolCall.toolName}". El modelo solicitó esta herramienta repetidamente sin progresar.

Última respuesta del modelo:
${lastContent}

Por favor, intenta un enfoque diferente o simplifica tu solicitud.`;
        }
      } else {
        consecutiveRepeats = 0;
        lastToolName = currentToolCall.toolName;
      }
      
      // Callback de estado: ejecutando herramienta
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'tool-execution',
          message: `🔧 Ejecutando herramienta: ${currentToolCall.toolName}...`,
          model: modelId,
          provider: 'local',
          toolName: currentToolCall.toolName,
          toolArgs: currentToolCall.arguments,
          iteration,
          maxIterations
        });
      }
      
      try {
        // Ejecutar la tool via MCP (soportar serverId y nombres namespaced)
        let execResult = null;
        let baseName = currentToolCall.toolName;
        let serverIdHint = currentToolCall.serverId || null;

        if (!serverIdHint && typeof baseName === 'string' && baseName.includes('__')) {
          const idx = baseName.indexOf('__');
          const sid = baseName.slice(0, idx);
          const name = baseName.slice(idx + 2);
          if (sid && name) {
            serverIdHint = sid;
            baseName = name;
          }
        }

        // 🔧 CRITICAL FIX: Asegurar que arguments siempre sea un objeto válido
        if (!currentToolCall.arguments || typeof currentToolCall.arguments !== 'object') {
          currentToolCall.arguments = {};
        }

        const defaultInfoLocal = this._getMcpDefaultDir(serverIdHint || 'filesystem');
        const defaultPathLocal = defaultInfoLocal?.raw || defaultInfoLocal?.normalized || null;
        
        // ✅ FIXED: Inyectar path ANTES de validar
        if (defaultPathLocal) {
          if (['list_directory', 'directory_tree', 'list_directory_with_sizes'].includes(baseName) && !currentToolCall.arguments.path) {
            currentToolCall.arguments.path = defaultPathLocal;
            debugLogger.debug('AIService.MCP', 'Path inyectado para herramienta', {
              tool: baseName,
              path: defaultPathLocal
            });
          }
          if (baseName === 'read_text_file' && !currentToolCall.arguments.path) {
            currentToolCall.arguments.path = defaultPathLocal;
            debugLogger.debug('AIService.MCP', 'Path inyectado para herramienta', {
              tool: baseName,
              path: defaultPathLocal
            });
          }
        }

        // 🔍 DEBUG: Validar argumentos antes de ejecutar
        debugLogger.debug('AIService.MCP', 'Ejecutando herramienta', {
          tool: baseName,
          args: currentToolCall.arguments
        });
        
        if (!currentToolCall.arguments || Object.keys(currentToolCall.arguments).length === 0) {
          debugLogger.warn('AIService.MCP', 'Argumentos vacíos para herramienta, puede fallar', {
            tool: baseName
          });
        }

        if (serverIdHint) {
          execResult = await mcpClient.callTool(serverIdHint, baseName, currentToolCall.arguments);
        } else {
          execResult = await mcpClient.callTool(baseName, currentToolCall.arguments);
        }
        const result = (execResult && execResult.success === true && execResult.result) ? execResult.result : execResult;
        
        // Verificar si hubo error en la tool
        if (result.isError) {
          const errorText = result.content?.[0]?.text || 'Error desconocido';
          console.error(`❌ [MCP] ${currentToolCall.toolName} falló:`, errorText);
          
          // Callback de error
          if (callbacks.onStatus) {
            callbacks.onStatus({
              status: 'tool-error',
              message: `Error en herramienta ${currentToolCall.toolName}: ${errorText}`,
              model: modelId,
              provider: 'local',
              toolName: currentToolCall.toolName,
              error: errorText
            });
          }
          
          // No devolver inmediatamente, informar al modelo
          conversationMessages.push({
            role: 'user',
            content: `❌ Error ejecutando ${currentToolCall.toolName}: ${errorText}`
          });
          
          // Pedir al modelo que intente de otra forma
          const errorFollowUp = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 500, temperature: 0.3 }
          );
          
          // Detectar si hay otra tool call después del error
          currentToolCall = this.detectToolCallInResponse(errorFollowUp);
          if (!currentToolCall) {
            return errorFollowUp;
          }
          continue;
        }
        
        debugLogger.debug('AIService.MCP', 'Ejecución de herramienta completada', {
          tool: currentToolCall.toolName
        });
        
        // ✅ IMPROVED: Detectar lenguaje para archivos de texto
        let detectedLanguage = '';
        if (baseName === 'read_text_file') {
          const filePath = currentToolCall.arguments?.path || '';
          const ext = filePath.split('.').pop()?.toLowerCase() || '';
          const langMap = {
            'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
            'py': 'python', 'java': 'java', 'cpp': 'cpp', 'c': 'c', 'h': 'c', 'hpp': 'cpp',
            'cs': 'csharp', 'php': 'php', 'rb': 'ruby', 'go': 'go', 'rs': 'rust', 'swift': 'swift',
            'kt': 'kotlin', 'scala': 'scala', 'sh': 'bash', 'bash': 'bash', 'zsh': 'bash', 'fish': 'bash',
            'ps1': 'powershell', 'json': 'json', 'yaml': 'yaml', 'yml': 'yaml', 'xml': 'xml',
            'html': 'html', 'htm': 'html', 'css': 'css', 'scss': 'scss', 'sass': 'sass', 'less': 'less',
            'sql': 'sql', 'md': 'markdown', 'mdx': 'markdown', 'txt': 'text', 'log': 'text'
          };
          detectedLanguage = langMap[ext] || '';
        }
        
        // Notificar a la UI con el resultado de la tool
        if (callbacks && typeof callbacks.onToolResult === 'function') {
          try {
            callbacks.onToolResult({
              toolName: currentToolCall.toolName,
              args: currentToolCall.arguments,
              result,
              detectedLanguage,
              filePath: currentToolCall.arguments?.path
            });
          } catch (cbErr) {
            debugLogger.warn('AIService.MCP', 'onToolResult callback lanzó un error', {
              error: cbErr?.message
            });
          }
        }
        
        // Formatear resultado
        const cleanResult = (() => {
          const text = result.content?.[0]?.text || 'OK';
          
          // Operaciones de escritura/modificación
          if (text.includes('Successfully wrote') || text.includes('Successfully created')) {
            return '✅ Archivo creado correctamente';
          }
          if (text.includes('Successfully moved')) {
            return '✅ Archivo movido correctamente';
          }
          if (text.includes('DIFF INDEX') || text.includes('---') || text.includes('```diff')) {
            return '✅ Archivo editado correctamente';
          }
          
          // ✅ NO procesar aquí - dejar para AIChatPanel.js
          // Solo devolver el texto sin formateo para que renderMarkdown lo procese
          if (text.includes('[FILE]') || text.includes('[DIR]')) {
            return text;
          }
          
          // ✅ IMPROVED: Contenido de archivos - detectar lenguaje y formatear como código
          // Detectar extensión si está disponible en los metadatos o por patrones
          if (currentToolCall.toolName === 'read_text_file' || currentToolCall.toolName === 'read_file' || baseName === 'read_text_file') {
            const filePath = currentToolCall.arguments?.path || '';
            const ext = filePath.split('.').pop()?.toLowerCase() || '';
            
            // Map extensiones a lenguajes soportados en markdown
            const langMap = {
              'js': 'javascript',
              'jsx': 'javascript',
              'ts': 'typescript',
              'tsx': 'typescript',
              'py': 'python',
              'java': 'java',
              'cpp': 'cpp',
              'c': 'c',
              'h': 'c',
              'hpp': 'cpp',
              'cs': 'csharp',
              'php': 'php',
              'rb': 'ruby',
              'go': 'go',
              'rs': 'rust',
              'swift': 'swift',
              'kt': 'kotlin',
              'scala': 'scala',
              'sh': 'bash',
              'bash': 'bash',
              'zsh': 'bash',
              'fish': 'bash',
              'ps1': 'powershell',
              'json': 'json',
              'yaml': 'yaml',
              'yml': 'yaml',
              'xml': 'xml',
              'html': 'html',
              'htm': 'html',
              'css': 'css',
              'scss': 'scss',
              'sass': 'sass',
              'less': 'less',
              'sql': 'sql',
              'md': 'markdown',
              'mdx': 'markdown',
              'txt': 'text',
              'log': 'text'
            };
            
            const lang = langMap[ext] || '';
            debugLogger.debug('AIService.MCP', 'Lenguaje detectado para archivo', {
              extension: ext,
              lenguaje: lang
            });
            
            // No añadir bloques de código aquí - se manejan en AIChatPanel.js
            return text;
          }
          
          // Texto general o resultado de otros comandos
          return text;
        })();
        
        // Marcar si el filesystem fue modificado
        const finalOperations = ['write_file', 'edit_file', 'create_directory', 'move_file'];
        if (finalOperations.includes(currentToolCall.toolName)) {
          this._filesystemModified = true;
        }
        
        // NUEVO: Re-inyectar resultado en conversación para que el modelo lo vea
        debugLogger.debug('AIService.MCP', 'Reinyectando resultado en conversación');
        conversationMessages.push({
          role: 'user',
          content: `✅ Herramienta COMPLETADA: ${currentToolCall.toolName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Resultado:
${cleanResult}

⚠️ IMPORTANTE: Esta herramienta YA FUE EJECUTADA. 
No vuelvas a pedir la misma herramienta.
Si necesitas hacer algo más, solicita una herramienta DIFERENTE o responde sin herramientas.
${lastUserGoal ? `\nOBJETIVO DEL USUARIO: ${lastUserGoal}` : ''}
${inferredIntent === 'move' ? `\nPISTA: Si ya ves el archivo y el destino en el resultado anterior, usa la herramienta "move_file" con los nombres de parámetros EXACTOS del schema (por ejemplo: from/to, source/destination u old/new) y rutas dentro de los directorios permitidos.` : ''}`
        });
        
        // NUEVO: Preguntar al modelo si necesita más herramientas
        const followUp = await this.sendToLocalModelStreamingWithCallbacks(
          modelId,
          conversationMessages,
          callbacks,
          { ...options, maxTokens: 500, temperature: 0.3, contextLimit: Math.min(4096, options.contextLimit || 8000) }
        );
        
        // 🔧 NUEVO: Si la respuesta está vacía, reintentar con prompt simplificado
        if (!followUp || followUp.trim().length === 0) {
          debugLogger.warn('AIService.MCP', 'Modelo generó respuesta vacía tras ejecutar tool; reintentando con prompt simplificado');
          
          conversationMessages.push({
            role: 'user',
            content: `Por favor, responde confirmando que la operación se completó exitosamente o genera el SIGUIENTE tool-call necesario para cumplir el objetivo. ${lastUserGoal ? `Objetivo: ${lastUserGoal}. ` : ''}Recuerda responder sólo con JSON válido cuando uses herramientas.`
          });
          
          const retryResponse = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 1500, temperature: 0.6, contextLimit: Math.min(4096, options.contextLimit || 8000) }
          );
          
          if (retryResponse && retryResponse.trim().length > 0) {
            debugLogger.debug('AIService.MCP', 'Retry exitoso tras respuesta vacía');
            return retryResponse;
          } else {
            debugLogger.warn('AIService.MCP', 'Retry falló después de respuesta vacía, retornando mensaje por defecto');
            return `✅ Operación completada correctamente.`;
          }
        }
        
        // NUEVO: Detectar si hay otro tool call
        const nextToolCall = this.detectToolCallInResponse(followUp);
        
        // 🔧 CRÍTICO: Ignorar tool call si es IDÉNTICO al que acabamos de ejecutar
        // Esto previene loops infinitos cuando el modelo menciona la herramienta anterior
        if (nextToolCall) {
          const isSameTool = nextToolCall.toolName === currentToolCall.toolName;
          const isSameArgs = JSON.stringify(nextToolCall.arguments) === JSON.stringify(currentToolCall.arguments);
          
          if (isSameTool && isSameArgs) {
            debugLogger.warn('AIService.MCP', 'Tool call duplicado detectado; terminando loop', {
              tool: nextToolCall.toolName
            });
            // Retornar la respuesta sin el JSON del tool call
            const cleanResponse = followUp.replace(/\{[\s\S]*?"tool"[\s\S]*?\}/g, '').trim();
            return cleanResponse || `✅ Operación completada correctamente.`;
          }
        }
        
        currentToolCall = nextToolCall;
        
        if (!currentToolCall) {
          // No hay más tools, el modelo respondió normalmente
          debugLogger.debug('AIService.MCP', 'Loop completado, el modelo respondió sin pedir más herramientas');
          return followUp;
        }
        
        // Hay otro tool call DIFERENTE, continuar loop
        debugLogger.debug('AIService.MCP', 'Modelo solicita otra herramienta, continuando loop');
        
      } catch (error) {
        debugLogger.error('AIService.MCP', 'Error ejecutando herramienta', {
          tool: currentToolCall.toolName,
          error: error?.message
        });
        
        // Callback de error
        if (callbacks.onStatus) {
          callbacks.onStatus({
            status: 'tool-error',
            message: `Error en herramienta ${currentToolCall.toolName}: ${error.message}`,
            model: modelId,
            provider: 'local',
            toolName: currentToolCall.toolName,
            error: error.message
          });
        }
        
        // Informar error al modelo
        conversationMessages.push({
          role: 'user',
          content: `❌ Error técnico ejecutando ${currentToolCall.toolName}: ${error.message}`
        });
        
        // Dar oportunidad al modelo de responder
        try {
          const errorResponse = await this.sendToLocalModelStreamingWithCallbacks(
            modelId,
            conversationMessages,
            callbacks,
            { ...options, maxTokens: 500, temperature: 0.3, contextLimit: Math.min(2048, options.contextLimit || 8000) }
          );
          return errorResponse;
        } catch (recoveryError) {
          throw new Error(`Error ejecutando herramienta ${currentToolCall.toolName}: ${error.message}`);
        }
      }
    }
    
    // Si llegamos aquí, excedimos las iteraciones máximas
    debugLogger.warn('AIService.MCP', 'Límite de iteraciones alcanzado en loop de herramientas', {
      maxIterations
    });
    
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'warning',
        message: `Límite de herramientas alcanzado (${maxIterations} iteraciones)`,
        model: modelId,
        provider: 'local'
      });
    }
    
    // Retornar la última respuesta del modelo o mensaje por defecto
    if (conversationMessages.length > 0) {
      const lastMessage = conversationMessages[conversationMessages.length - 1];
      if (lastMessage.content) {
        return lastMessage.content;
      }
    }
    
    return 'Lo siento, alcancé el límite de uso de herramientas. Intenté ejecutar hasta ' + maxIterations + ' herramientas.';
  }

  /**
   * Enviar mensaje con callbacks de estado
   */
  async sendMessageWithCallbacks(message, callbacks = {}, options = {}) {
    if (!this.currentModel) {
      throw new Error('No se ha seleccionado ningún modelo');
    }

    // Obtener configuración de rendimiento automática
    const perfConfig = this.getModelPerformanceConfig(this.currentModel, this.modelType);
    
    // Combinar opciones con configuración automática
    const finalOptions = {
      ...perfConfig,
      ...options
    };

    // Obtener historial de la conversación actual desde ConversationService
    const currentConversation = conversationService.getCurrentConversation();
    if (!currentConversation) {
      throw new Error('No hay conversación activa');
    }

    // 🔧 VALIDACIÓN DE SINCRONIZACIÓN
    debugLogger.info('AIService.Conversation', 'Validación de conversación', {
      currentId: currentConversation.id,
      serviceId: conversationService.currentConversationId
    });
    if (currentConversation.id !== conversationService.currentConversationId) {
      debugLogger.warn('AIService.Conversation', 'Desincronización detectada', {
        currentId: currentConversation.id,
        serviceId: conversationService.currentConversationId
      });
    }

    // Obtener mensajes de la conversación actual
    const conversationMessages = currentConversation.messages || [];
    // Considerar "primera conversación" cuando solo hay 1 mensaje (el del usuario que acabamos de agregar)
    const isFirstMessage = conversationMessages.length === 1;
    
    debugLogger.debug('AIService.Conversation', 'Mensajes en conversación actual', {
      total: conversationMessages.length
    });
    
    // 🪟 VENTANA DESLIZANTE INTELIGENTE POR TOKENS (como ChatGPT/Claude)
    let limitedMessages = this.smartTokenBasedHistoryLimit(conversationMessages, finalOptions);
    debugLogger.debug('AIService.Conversation', 'Mensajes después de limitación', {
      total: limitedMessages.length
    });

    // Construir contexto efímero de archivos adjuntos (RAG ligero)
    const attachedFiles = conversationService.getAttachedFiles();
    const ephemeralContext = fileAnalysisService.buildEphemeralContext(attachedFiles, message, {
      maxChars: Math.min(3000, (finalOptions.contextLimit || 8000) / 2)
    });

    // Mensajes a enviar al proveedor (no se guardan como historial visible)
    const providerMessages = [...limitedMessages];
    
    // Si el último mensaje es del usuario, reemplazarlo para evitar duplicados
    if (providerMessages.length > 0 && providerMessages[providerMessages.length - 1].role === 'user') {
      providerMessages[providerMessages.length - 1] = { role: 'user', content: message };
    } else {
      // Si no hay mensaje del usuario al final, agregarlo
      providerMessages.push({ role: 'user', content: message });
    }
    
    // Contexto efímero de archivos adjuntos (debe ir antes del mensaje del usuario)
    // Insertar antes del último mensaje (que es el del usuario)
    if (ephemeralContext && ephemeralContext.length > 0) {
      providerMessages.splice(providerMessages.length - 1, 0, { role: 'system', content: ephemeralContext });
    }

    // Si el filesystem fue modificado, agregar nota para invalidar información anterior
    if (this._filesystemModified) {
      providerMessages.splice(providerMessages.length - 1, 0, {
        role: 'system',
        content: '⚠️ FILESYSTEM MODIFICADO. Archivos/directorios anteriores ya NO son válidos. DEBES ejecutar tools de nuevo para obtener información actualizada.'
      });
      this._filesystemModified = false; // Reset flag
    }

    // Log compacto
    debugLogger.info('AIService.Conversation', 'Enviando mensajes al modelo', {
      mensajes: providerMessages.length
    });

    // Metadatos para la UI: indicar si se usó contexto efímero y qué archivos
    const ephemeralFilesUsed = (ephemeralContext && ephemeralContext.length > 0)
      ? (attachedFiles || []).map(f => f.name)
      : [];

    const startTime = Date.now();
    
    try {
      let response;
      
      // Callback de inicio
      if (callbacks.onStart) {
        callbacks.onStart({
          model: this.currentModel,
          modelType: this.modelType,
          message: message,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }

      if (this.modelType === 'remote') {
        response = await this.sendToRemoteModelWithCallbacks(message, providerMessages, callbacks, finalOptions);
      } else {
        response = await this.sendToLocalModelWithCallbacks(message, providerMessages, callbacks, finalOptions);
      }

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Callback de finalización
      if (callbacks.onComplete) {
        callbacks.onComplete({
          response,
          latency,
          model: this.currentModel,
          modelType: this.modelType,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }

      return response;
    } catch (error) {
      const endTime = Date.now();
      const latency = endTime - startTime;
      
      // Callback de error
      if (callbacks.onError) {
        callbacks.onError({
          error,
          latency,
          model: this.currentModel,
          modelType: this.modelType,
          ephemeralContextUsed: ephemeralContext && ephemeralContext.length > 0,
          ephemeralFilesUsed
        });
      }
      
      console.error('Error enviando mensaje a IA:', error);
      throw error;
    }
  }

  /**
   * Enviar mensaje a modelo remoto
   */
  async sendToRemoteModel(message, options = {}) {
    const model = this.models.remote.find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo remoto no encontrado');
    }

    const apiKey = this.getApiKey(model.provider);
    if (!apiKey) {
      throw new Error(`API Key no configurada para ${model.provider}`);
    }

    // Preparar mensajes según el proveedor
    let requestBody;
    let headers;
    let endpointWithKey = null;

    if (model.provider === 'openai') {
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      
      requestBody = {
        model: model.id,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: options.stream || false,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000
      };
    } else if (model.provider === 'anthropic') {
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      
      requestBody = {
        model: model.id,
        messages: this.conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: options.maxTokens || 2000
      };
    } else if (model.provider === 'google') {
      headers = {
        'Content-Type': 'application/json'
      };
      
      // Gemini usa un formato diferente - necesita el API key como parámetro de query
      endpointWithKey = `${model.endpoint}?key=${apiKey}`;
      
      // Convertir historial de conversación al formato de Gemini
      const contents = this.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));
      
      requestBody = {
        contents: contents,
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 2000
        }
      };
    }

    try {
      // Usar la URL correcta según el proveedor
      const requestUrl = model.provider === 'google' ? endpointWithKey : model.endpoint;
      
      // Intentar con reintentos para errores 503 (modelo sobrecargado)
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await fetch(requestUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody),
        signal: options.signal
      });

      if (!response.ok) {
        const error = await response.json();
            const errorMessage = error.error?.message || 'Error en la API';
            
            // Si es error 503 (modelo sobrecargado) y no es el último intento, reintentar
            if (response.status === 503 && attempt < 3) {
              debugLogger.warn('AIService.RemoteModel', 'Modelo remoto sobrecargado, reintentando', {
                modelId: model.id,
                intento: attempt,
                delayMs: attempt * 2000
              });
              await new Promise(resolve => setTimeout(resolve, attempt * 2000)); // Esperar 2, 4 segundos
              continue;
            }
            
            throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Extraer respuesta según el proveedor
      if (model.provider === 'openai') {
        return data.choices[0].message.content;
      } else if (model.provider === 'anthropic') {
        return data.content[0].text;
          } else if (model.provider === 'google') {
            return data.candidates[0].content.parts[0].text;
          }
        } catch (error) {
          lastError = error;
          
          // Si es error de modelo sobrecargado y no es el último intento, reintentar
          if (error.message.includes('overloaded') && attempt < 3) {
            debugLogger.warn('AIService.RemoteModel', 'Modelo remoto sobrecargado (mensaje), reintentando', {
              modelId: model.id,
              intento: attempt,
              delayMs: attempt * 2000
            });
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          // Si no es el último intento, continuar con el siguiente intento
          if (attempt < 3) {
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    } catch (error) {
      debugLogger.error('AIService.RemoteModel', 'Error llamando a API remota', {
        modelId: model.id,
        error: error?.message
      });
      
      // Si es error de modelo sobrecargado, intentar con otro modelo del mismo proveedor
      if (error.message.includes('overloaded') || error.message.includes('503') || error.message.includes('The model is overloaded')) {
        debugLogger.warn('AIService.RemoteModel', 'Intentando fallback automático por modelo sobrecargado', {
          modelId: model.id
        });
        
        // Buscar otros modelos del mismo proveedor que no hayan sido intentados
        const alternativeModels = this.models.remote.filter(m => 
          m.provider === model.provider && 
          m.id !== model.id && 
          this.getApiKey(m.provider) // Que tenga API key configurada
        );
        
        if (alternativeModels.length > 0) {
          const fallbackModel = alternativeModels[0];
          debugLogger.info('AIService.RemoteModel', 'Cambiando a modelo fallback', {
            fallbackModel: fallbackModel.name
          });
          
          // Temporalmente cambiar el modelo actual para el fallback
          const originalModel = this.currentModel;
          this.currentModel = fallbackModel.id;
          
          try {
            const result = await this.sendToRemoteModel(message, options);
            
            // Restaurar modelo original
            this.currentModel = originalModel;
            return result;
          } catch (fallbackError) {
            // Restaurar modelo original
            this.currentModel = originalModel;
            console.error('Error en modelo fallback:', fallbackError);
            throw new Error(`Todos los modelos de ${model.provider} están sobrecargados. Por favor, intenta más tarde o cambia a otro proveedor (OpenAI, Anthropic).`);
          }
        }
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje a modelo local
   */
  async sendToLocalModel(message, options = {}) {
    const model = this.getAllLocalModels().find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo local no encontrado');
    }

    if (!model.downloaded) {
      throw new Error('El modelo local no está descargado');
    }

    // Comunicación con Ollama usando la API /api/chat
    try {
      // Preparar mensajes en el formato que espera Ollama
      const messages = this.conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }));

      const ollamaUrl = this.getOllamaUrl();
      
      // Usar streaming si está habilitado
      if (options.useStreaming) {
        return await this.sendToLocalModelStreaming(model.id, messages, options);
      } else {
        return await this.sendToLocalModelNonStreaming(model.id, messages, options);
      }
    } catch (error) {
      console.error('Error llamando a modelo local:', error);
      
      // Isajes de error más específicos
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enviar mensaje a modelo remoto con callbacks
   */
  async sendToRemoteModelWithCallbacks(message, conversationMessages, callbacks = {}, options = {}) {
    const model = this.models.remote.find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo remoto no encontrado');
    }

    const apiKey = this.getApiKey(model.provider);
    if (!apiKey) {
      throw new Error(`API Key no configurada para ${model.provider}`);
    }

    // Callback de estado: conectando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'connecting',
        message: `Conectando con ${model.name}...`,
        model: model.name,
        provider: model.provider
      });
    }

    try {
      // 🔌 Inyectar tools MCP como function-calling cuando sea posible
      const mcpEnabled = options.mcpEnabled !== false;
      let mcpContext = { tools: [], hasTools: false };
      if (mcpEnabled) {
        try {
          const ctx = await this.injectMCPContext(message);
          mcpContext = { tools: ctx.tools || [], hasTools: (ctx.tools || []).length > 0 };
        } catch (e) {
          debugLogger.warn('AIService.MCP', 'Error obteniendo contexto MCP (remote)', {
            error: e.message
          });
        }
      }
      // Preparar mensajes según el proveedor
      let requestBody;
      let headers;
      let endpointWithKey = null;

      if (model.provider === 'openai') {
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        };
        
        requestBody = {
          model: model.id,
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          stream: false,
          temperature: options.temperature || 0.7,
          max_tokens: options.maxTokens || 2000
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'openai', { namespace: true });
          if (providerTools.length > 0) {
            requestBody.tools = providerTools;
            requestBody.tool_choice = 'auto';
          }
        }
      } else if (model.provider === 'anthropic') {
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        };
        
        requestBody = {
          model: model.id,
          messages: conversationMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          max_tokens: options.maxTokens || 2000
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'anthropic', { namespace: true });
          if (providerTools.length > 0) {
            requestBody.tools = providerTools;
          }
        }
      } else if (model.provider === 'google') {
        headers = {
          'Content-Type': 'application/json'
        };
        
        endpointWithKey = `${model.endpoint}?key=${apiKey}`;
        
        const contents = conversationMessages.map(msg => ({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        }));
        
        requestBody = {
          contents: contents,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.maxTokens || 2000
          }
        };
        if (mcpContext.hasTools) {
          const providerTools = this.convertMCPToolsToProviderFormat(mcpContext.tools, 'google', { namespace: true }) || [];
          if (providerTools.length > 0) {
            // Gemini espera tools: [{ function_declarations: [ { name, description, parameters } ] }]
            const functionDecls = providerTools.map(fn => ({
              name: fn.name,
              description: fn.description,
              parameters: this._toGeminiSchema(fn.parameters)
            }));
            requestBody.tools = [{ function_declarations: functionDecls }];
            requestBody.tool_config = { function_calling_config: { mode: 'AUTO' } };

            // Inyectar prompt universal como systemInstruction con hints (filesystem)
            try {
              const serverHints = {};
              const hasFilesystem = (mcpContext.tools || []).some(t => t.serverId === 'filesystem');
              if (hasFilesystem) {
                const allowedDirsText = await this.getAllowedDirectoriesCached();
                if (allowedDirsText) {
                  const rawLines = String(allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean);
                  let first = rawLines[0] || '';
                  if (/^Allowed directories:/i.test(first)) {
                    first = first.replace(/^Allowed directories:/i, '').trim();
                  }
                  const primaryDirNormalized = first ? first.replace(/\\/g, '/') : null;
                  if (first) {
                    this._setMcpDefaultDir('filesystem', first);
                  }
                  serverHints['filesystem'] = { allowedDirsText, primaryDirNormalized, defaultRaw: first || null };
                }
              }
              const toolsPrompt = this.generateUniversalMCPSystemPrompt(mcpContext.tools, { maxPerServer: 8, serverHints });
              requestBody.systemInstruction = { role: 'system', parts: [{ text: toolsPrompt }] };
            } catch (_) {}
          }
        }
      }

      // Callback de estado: generando
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'generating',
          message: `Generando respuesta con ${model.name}...`,
          model: model.name,
          provider: model.provider
        });
      }

      // Usar la URL correcta según el proveedor
      const requestUrl = model.provider === 'google' ? endpointWithKey : model.endpoint;
      
      // Intentar con reintentos para errores 503
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // Callback de reintento si no es el primer intento
          if (attempt > 1 && callbacks.onStatus) {
            callbacks.onStatus({
              status: 'retrying',
              message: `Reintentando con ${model.name}... (${attempt}/3)`,
              model: model.name,
              provider: model.provider,
              attempt
            });
          }

          const response = await fetch(requestUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestBody),
            signal: options.signal
          });

          if (!response.ok) {
            const error = await response.json();
            const errorMessage = error.error?.message || 'Error en la API';
            
            if (response.status === 503 && attempt < 3) {
              await new Promise(resolve => setTimeout(resolve, attempt * 2000));
              continue;
            }
            
            throw new Error(errorMessage);
          }

          const data = await response.json();
          
          // Extraer respuesta y manejar tool-calls cuando aplique
          if (model.provider === 'openai') {
            const choice = data.choices?.[0]?.message || {};
            const toolCalls = choice.tool_calls || [];
            if (mcpContext.hasTools && Array.isArray(toolCalls) && toolCalls.length > 0) {
              // Ejecutar tools solicitadas y re-preguntar
              let followMessages = [...requestBody.messages];
              const executionSummaries = [];
              for (const tc of toolCalls) {
                const fn = tc.function || {};
                const fullName = fn.name || '';
                let args = {};
                try { args = fn.arguments ? JSON.parse(fn.arguments) : fn.arguments || {}; } catch (_) { args = fn.arguments || {}; }
                const normalized = this._normalizeFunctionCall(fullName, args);
                const serverId = normalized.serverId;
                const toolName = normalized.toolName;
                const callArgs = normalized.arguments;
                let result;
                try {
                  result = serverId
                    ? await mcpClient.callTool(serverId, toolName, callArgs)
                    : await mcpClient.callTool(toolName, callArgs);
                  const text = result?.content?.[0]?.text || 'OK';
                  executionSummaries.push(`• ${toolName}: ${text.substring(0, 800)}`);
                } catch (e) {
                  executionSummaries.push(`• ${toolName}: ERROR ${e.message}`);
                }
              }
              followMessages.push({ role: 'user', content: `Resultados de herramientas:\n${executionSummaries.join('\n')}\n\nSi necesitas otra herramienta, propón el siguiente tool-call en JSON.` });
              // Segunda llamada para respuesta final (con tools aún registradas)
              requestBody.messages = followMessages;
              const response2 = await fetch(requestUrl, {
                method: 'POST', headers, body: JSON.stringify(requestBody), signal: options.signal
              });
              if (!response2.ok) {
                const e2 = await response2.text();
                throw new Error(e2 || 'Error tras tool calls');
              }
              const data2 = await response2.json();
              const finalText = data2.choices?.[0]?.message?.content || '';
              return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
            }
            const finalText = choice.content || '';
            return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
          } else if (model.provider === 'anthropic') {
            // Búsqueda simple de tool_use en contenido (aprox)
            const content = data.content || [];
            const toolUse = content.find(p => p.type === 'tool_use');
            if (mcpContext.hasTools && toolUse) {
              const normalized = this._normalizeFunctionCall(toolUse.name, toolUse.input || {});
              const serverId = normalized.serverId;
              const toolName = normalized.toolName;
              const callArgs = normalized.arguments;
              try {
                const result = serverId ? await mcpClient.callTool(serverId, toolName, callArgs)
                                        : await mcpClient.callTool(toolName, callArgs);
                const text = result?.content?.[0]?.text || 'OK';
                // Re-preguntar con resultado
                const nextBody = { ...requestBody };
                nextBody.messages = [
                  ...requestBody.messages,
                  { role: 'user', content: `Resultado de ${toolName}: ${text.substring(0, 1000)}` }
                ];
                const response2 = await fetch(requestUrl, { method: 'POST', headers, body: JSON.stringify(nextBody), signal: options.signal });
                if (!response2.ok) {
                  const e2 = await response2.text();
                  throw new Error(e2 || 'Error tras tool calls (Anthropic)');
                }
                const data2 = await response2.json();
                const finalText = data2.content?.[0]?.text || '';
                return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
              } catch (e) {
                return `Error ejecutando herramienta: ${e.message}`;
              }
            }
            const finalText = data.content?.[0]?.text || '';
            return await this._handleRemotePostResponse(finalText, conversationMessages, mcpContext, callbacks, options, model);
          } else if (model.provider === 'google') {
            // Detectar functionCall y ejecutar tools si aplica
            const candidate = (data.candidates && data.candidates[0]) || {};
            const parts = candidate.content?.parts || candidate.content || [];
            const calls = Array.isArray(parts) ? parts.filter(p => p.functionCall) : [];
            if (mcpContext.hasTools && calls.length > 0) {
              // Usar toolOrchestrator para ejecutar herramientas en loop
              if (this.toolOrchestrator && calls.length === 1) {
                const firstCall = calls[0];
                const fc = firstCall.functionCall || {};
                const fullName = fc.name || '';
                const normalized = this._normalizeFunctionCall(fullName, fc.args || {});
                
                const initialToolCall = {
                  toolName: normalized.toolName,
                  arguments: normalized.arguments,
                  serverId: normalized.serverId
                };
                
                try {
                  const orchestratorResult = await this.toolOrchestrator.executeLoop({
                    modelId: model.id,
                    initialToolCall,
                    baseProviderMessages: conversationMessages,
                    detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
                    callModelFn: async (updatedMessages) => {
                      // Re-llamar a Gemini con mensajes actualizados
                      const nextBody = { ...requestBody };
                      nextBody.contents = updatedMessages.map(msg => ({
                        role: msg.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: msg.content }]
                      }));
                      const response2 = await fetch(requestUrl, { 
                        method: 'POST', 
                        headers, 
                        body: JSON.stringify(nextBody), 
                        signal: options.signal 
                      });
                      if (!response2.ok) {
                        const e2 = await response2.text();
                        throw new Error(e2 || 'Error en llamada secundaria');
                      }
                      const data2 = await response2.json();
                      const cand2 = (data2.candidates && data2.candidates[0]) || {};
                      const parts2 = cand2.content?.parts || cand2.content || [];
                      return Array.isArray(parts2) ? parts2.map(p => p.text).filter(Boolean).join('\n') : '';
                    },
                    callbacks,
                    options,
                    maxIterations: 5,
                    turnId: options?.turnId
                  });
                  return orchestratorResult;
                } catch (error) {
                  console.error('[MCP] Error en loop remoto (Gemini):', error);
                  return `Error ejecutando herramienta: ${error.message}`;
                }
              }
              
              // Fallback: ejecutar todas las tools solicitadas en secuencia
              for (const call of calls) {
                const fc = call.functionCall || {};
                const fullName = fc.name || '';
                const normalized = this._normalizeFunctionCall(fullName, fc.args || {});
                const serverId = normalized.serverId;
                const toolName = normalized.toolName;
                const callArgs = normalized.arguments;
                
                conversationService.addMessage('assistant_tool_call', `Llamando herramienta: ${toolName}`, { 
                  isToolCall: true, 
                  toolName, 
                  toolArgs: callArgs 
                });
                
                try {
                  if (!serverId) {
                    throw new Error(`No se pudo resolver el servidor para la herramienta ${toolName}`);
                  }
                  const result = await mcpClient.callTool(serverId, toolName, callArgs);
                  const text = result?.content?.[0]?.text || 'OK';
                  
                  conversationService.addMessage('tool', text, { 
                    isToolResult: true, 
                    toolName, 
                    toolArgs: callArgs 
                  });
                  
                  if (callbacks.onToolResult) {
                    callbacks.onToolResult({ toolName, args: callArgs, result });
                  }
                } catch (e) {
                  const errorMsg = `❌ Error ejecutando herramienta ${toolName}: ${e.message}`;
                  conversationService.addMessage('tool', errorMsg, { error: true });
                }
              }
              
              return 'Hecho.';
            }
            const text = Array.isArray(parts) ? parts.map(p => p.text).filter(Boolean).join('\n') : '';
            return await this._handleRemotePostResponse(text || '', conversationMessages, mcpContext, callbacks, options, model);
          }
        } catch (error) {
          lastError = error;
          
          if (error.message.includes('overloaded') && attempt < 3) {
            await new Promise(resolve => setTimeout(resolve, attempt * 2000));
            continue;
          }
          
          if (attempt < 3) {
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    } catch (error) {
      // Callback de error
      if (callbacks.onError) {
        callbacks.onError({
          error,
          model: model.name,
          provider: model.provider
        });
      }
      
      throw error;
    }
  }

  /**
   * Enviar mensaje a modelo local con callbacks
   */
  async sendToLocalModelWithCallbacks(message, conversationMessages, callbacks = {}, options = {}) {
    const model = this.getAllLocalModels().find(m => m.id === this.currentModel);
    if (!model) {
      throw new Error('Modelo local no encontrado');
    }

    if (!model.downloaded) {
      throw new Error('El modelo local no está descargado');
    }

    try {
      let messages = conversationMessages.map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : (msg.role === 'system' ? 'system' : 'user'),
        content: msg.content
      }));

      // 🔌 INYECTAR TOOLS MCP EN SYSTEM PROMPT (si no está desactivado)
      const mcpEnabled = options.mcpEnabled !== false; // Por defecto true
      let mcpContext = { tools: [], resources: [], prompts: [], hasTools: false };
      
      if (mcpEnabled) {
        mcpContext = await this.injectMCPContext(message);
        
        if (mcpContext.hasTools) {

          // Construir hints por servidor (filesystem: directorios permitidos)
          const serverHints = {};
          try {
            const hasFilesystem = (mcpContext.tools || []).some(t => t.serverId === 'filesystem');
            if (hasFilesystem) {
              const allowedDirsText = await this.getAllowedDirectoriesCached();
              if (allowedDirsText) {
                const rawLines = String(allowedDirsText).split('\n').map(l => l.trim()).filter(Boolean);
                let first = rawLines[0] || '';
                if (/^Allowed directories:/i.test(first)) {
                  first = first.replace(/^Allowed directories:/i, '').trim();
                }
                const primaryDirNormalized = first ? first.replace(/\\/g, '/') : null;
                if (first) {
                  this._setMcpDefaultDir('filesystem', first);
                }
                serverHints['filesystem'] = {
                  allowedDirsText,
                  primaryDirNormalized,
                  defaultRaw: first || null
                };
              }
            }
          } catch (e) {
            debugLogger.warn('AIService.MCP', 'No se pudieron obtener directorios permitidos', {
              error: e.message
            });
          }

          const toolsPrompt = this.generateUniversalMCPSystemPrompt(mcpContext.tools, { maxPerServer: 8, serverHints });
          
          const systemIndex = messages.findIndex(m => m.role === 'system');
          if (systemIndex >= 0) {
            messages[systemIndex].content += (messages[systemIndex].content.endsWith('\n') ? '' : '\n\n') + toolsPrompt;
          } else {
            messages.unshift({
              role: 'system',
              content: toolsPrompt
            });
          }
        }
      }

      const ollamaUrl = this.getOllamaUrl();
      
      // Callback de estado: conectando
      if (callbacks.onStatus) {
        callbacks.onStatus({
          status: 'connecting',
          message: `Conectando con ${model.name} local...`,
          model: model.name,
          provider: 'local',
          mcpEnabled: mcpContext.hasTools
        });
      }
      
      // 🔧 AJUSTE INTELIGENTE DE TOKENS: El modelo necesita espacio para razonar
      const adjustedOptions = { ...options };
      
      // Calcular tamaño aproximado del contexto actual
      const contextSize = messages.reduce((sum, m) => sum + (m.content?.length || 0), 0);
      const contextTokens = Math.ceil(contextSize / 4); // Aproximación: 4 chars = 1 token
      
      if (mcpContext.hasTools) {
        // IMPORTANTE: deepseek-r1 es un modelo de reasoning que necesita espacio para pensar
        // 800 tokens es DEMASIADO BAJO, especialmente después de múltiples tool calls
        // Aumentar según el tamaño del contexto:
        const baseTokens = options.maxTokens || 2000;
        const minTokensForTools = 1500; // Mínimo para generar tool calls + razonamiento
        const maxTokensForTools = 3000; // Máximo para evitar respuestas muy largas
        
        // Si el contexto es grande (>6000 tokens), dar más espacio al modelo
        if (contextTokens > 6000) {
          adjustedOptions.maxTokens = maxTokensForTools;
        } else if (contextTokens > 3000) {
          adjustedOptions.maxTokens = 2000;
        } else {
          adjustedOptions.maxTokens = Math.max(minTokensForTools, Math.min(baseTokens, maxTokensForTools));
        }
        
      }
      
      // Usar streaming si está habilitado
      let response;
      if (adjustedOptions.useStreaming) {
        response = await this.sendToLocalModelStreamingWithCallbacks(model.id, messages, callbacks, adjustedOptions);
      } else {
        response = await this.sendToLocalModelNonStreamingWithCallbacks(model.id, messages, callbacks, adjustedOptions);
      }
      
      
      // 🔧 RETRY AUTOMÁTICO: Si la respuesta está vacía, reintentar con prompt simplificado
      if ((!response || response.trim().length === 0) && mcpContext.hasTools) {
        debugLogger.warn('AIService.Toolchain', 'Modelo generó respuesta vacía; reintentando con prompt simplificado');
        
        // Callback de estado: reintentando
        if (callbacks.onStatus) {
          callbacks.onStatus({
            status: 'retrying',
            message: '⚠️ Reintentando solicitud...',
            model: model.name,
            provider: 'local'
          });
        }
        
        // Agregar prompt de ayuda
        const retryMessages = [
          ...messages,
          {
            role: 'user',
            content: 'Por favor, responde usando alguna de las herramientas disponibles o proporciona una respuesta textual.'
          }
        ];
        
        // Reintentar con parámetros ajustados (más tokens para dar espacio al modelo)
        try {
          const retryResponse = await this.sendToLocalModelStreamingWithCallbacks(
            model.id,
            retryMessages,
            callbacks,
            { ...adjustedOptions, maxTokens: 1500, temperature: 0.6 }
          );
          
          if (retryResponse && retryResponse.trim().length > 0) {
            debugLogger.debug('AIService.Toolchain', 'Retry de modelo exitoso', {
              respuestaLength: retryResponse.length
            });
            response = retryResponse;
          } else {
            debugLogger.warn('AIService.Toolchain', 'Retry falló, usando respuesta por defecto');
            return 'Lo siento, tuve problemas al procesar tu solicitud. Por favor, intenta reformularla.';
          }
        } catch (retryError) {
          debugLogger.error('AIService.Toolchain', 'Error durante retry de modelo', {
            error: retryError?.message
          });
          return 'Lo siento, tuve problemas al procesar tu solicitud. Por favor, intenta de nuevo.';
        }
      }
      
      // 🔧 DETECTAR SI LA RESPUESTA ES UN PLAN o TOOL CALL
      if (mcpContext.hasTools) {
        // Prioridad 1: Detectar PLAN (múltiples herramientas)
        const toolPlan = this._detectToolPlan(response);
        if (toolPlan) {
          debugLogger.debug('AIService.Toolchain', 'Plan detectado; ejecutando herramientas', {
            herramientas: toolPlan.tools.length
          });
          return await this._executeToolPlan(toolPlan, callbacks);
        }
        
        // Prioridad 2: Detectar tool call individual
        const toolCall = this.detectToolCallInResponse(response);
        if (toolCall) {
          debugLogger.info('AIService.Toolchain', 'Tool call detectado; iniciando ejecución', {
            tool: toolCall.toolName,
            structuredToolMessages: this.featureFlags?.structuredToolMessages,
            hasOrchestrator: !!this.toolOrchestrator
          });
          
          if (this.featureFlags?.structuredToolMessages && this.toolOrchestrator) {
            debugLogger.debug('AIService.Toolchain', 'Usando toolOrchestrator.executeLoop');
            const callModelFn = async (provMessages, overrides = {}) => {
              const adjusted = { ...options, ...overrides };
              return await this.sendToLocalModelStreamingWithCallbacks(
                model.id,
                provMessages,
                callbacks,
                adjusted
              );
            };
            const orchestratorResult = await this.toolOrchestrator.executeLoop({
              modelId: model.id,
              initialToolCall: toolCall,
              baseProviderMessages: messages,
              detectToolCallInResponse: (resp) => this.detectToolCallInResponse(resp),
              callModelFn,
              callbacks,
              options,
              maxIterations: 5, // 🔧 Reducido de 10 a 5 para limitar proactividad
              turnId: options?.turnId
            });
            debugLogger.debug('AIService.Toolchain', 'toolOrchestrator.executeLoop completado', {
              resultadoLength: orchestratorResult?.length || 0
            });
            return orchestratorResult;
          }
          
          debugLogger.debug('AIService.Toolchain', 'Usando handleLocalToolCallLoop');
          const loopResult = await this.handleLocalToolCallLoop(toolCall, messages, callbacks, options, model.id);
          debugLogger.debug('AIService.Toolchain', 'handleLocalToolCallLoop completado', {
            resultadoLength: loopResult?.length || 0
          });
          return loopResult;
        } else {
          // Si no hay tool, intentar detectar PROMPT MCP
          const promptCall = this.detectPromptCallInResponse(response);
          if (promptCall) {
            debugLogger.debug('AIService.MCP', 'Prompt solicitado por el modelo', {
              prompt: promptCall.promptName,
              server: promptCall.serverId || 'sin server'
            });
            const promptResult = await this._handlePromptCallAndContinue(promptCall, messages, callbacks, options, model.id);
            return promptResult;
          }
          debugLogger.debug('AIService.Toolchain', 'No se detectó tool/prompt call; retornando respuesta directa');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Error llamando a modelo local:', error);
      
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose en http://localhost:11434');
      } else if (error.message.includes('404')) {
        throw new Error('Modelo no encontrado en Ollama. Verifica que el modelo esté descargado correctamente.');
      } else {
        throw error;
      }
    }
  }

  /**
   * Enviar mensaje a modelo local sin streaming
   */
  async sendToLocalModelNonStreaming(modelId, messages, options) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones con configuración (usar valores de options directamente, sin defaults hardcodeados)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: false,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      debugLogger.error('AIService.LocalModel', 'Error de Ollama', {
        error: errorText
      });
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
    // NUEVO: Log detallado de respuesta
    debugLogger.debug('AIService.LocalModel', 'Respuesta cruda de Ollama', {
      resumida: JSON.stringify(data).substring(0, 200),
      message: data.message,
      contentLength: data.message?.content?.length || 0
    });
    
    // La respuesta de Ollama viene en data.message.content
    if (data.message && data.message.content) {
      return data.message.content;
    } else {
      debugLogger.error('AIService.LocalModel', 'Respuesta vacía o inválida de Ollama', {
        message: data.message,
        content: data.message?.content
      });
      throw new Error('Respuesta inválida del modelo local');
    }
  }

  /**
   * Enviar mensaje a modelo local con streaming
   */
  async sendToLocalModelStreaming(modelId, messages, options) {
    const ollamaUrl = this.getOllamaUrl();
    
    // ✅ NUEVO: Contexto dinámico basado en RAM disponible
    const systemMem = this.memoryService.getSystemMemory();
    const dynamicContext = this._calcDynamicContext(systemMem.freeMB);

    // Preparar opciones con configuración (usar valores de options directamente, sin defaults hardcodeados)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? dynamicContext, // ✅ Dinámico
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: true,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    // Leer el stream de respuesta
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              fullResponse += data.message.content;
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Enviar mensaje a modelo local con streaming y callbacks
   */
  async sendToLocalModelStreamingWithCallbacks(modelId, messages, callbacks = {}, options = {}) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones que se enviarán a Ollama (usar valores de options directamente)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: true,
      options: ollamaOptions
    };
    
    // Log compacto
    
    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    // Callback de estado: generando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'generating',
        message: 'Generando respuesta...',
        model: modelId,
        provider: 'local'
      });
    }

    // Leer el stream de respuesta
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message && data.message.content) {
              fullResponse += data.message.content;
              
              // Callback de streaming
              if (callbacks.onStream) {
                callbacks.onStream({
                  content: data.message.content,
                  fullResponse,
                  model: modelId,
                  provider: 'local'
                });
              }
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  /**
   * Enviar mensaje a modelo local sin streaming con callbacks
   */
  async sendToLocalModelNonStreamingWithCallbacks(modelId, messages, callbacks = {}, options = {}) {
    const ollamaUrl = this.getOllamaUrl();
    
    // Preparar opciones que se enviarán a Ollama (usar valores de options directamente)
    const ollamaOptions = {
      temperature: options.temperature ?? 0.7,
      num_predict: options.maxTokens ?? 4000,
      num_ctx: options.contextLimit ?? 8000,
      top_k: options.top_k ?? 40,
      top_p: options.top_p ?? 0.9,
      repeat_penalty: options.repeat_penalty ?? 1.1
    };
    
    // Preparar el body completo que se enviará a Ollama
    const requestBody = {
      model: modelId,
      messages: messages,
      stream: false,
      options: ollamaOptions
    };
    
    // Log compacto
    
    // Callback de estado: generando
    if (callbacks.onStatus) {
      callbacks.onStatus({
        status: 'generating',
        message: 'Generando respuesta...',
        model: modelId,
        provider: 'local'
      });
    }

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody),
      signal: options.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error de Ollama:', errorText);
      throw new Error(`Error del servidor Ollama (${response.status})`);
    }

    const data = await response.json();
    
    // La respuesta de Ollama viene en data.message.content
    if (data.message && data.message.content) {
      return data.message.content;
    } else {
      throw new Error('Respuesta inválida del modelo local');
    }
  }

  /**
   * Descargar modelo local usando Ollama
   */
  async downloadLocalModel(modelId, onProgress = null) {
    const model = this.getAllLocalModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    try {
       // Usar la API de Ollama para descargar el modelo
       const ollamaUrl = this.getOllamaUrl();
       const response = await fetch(`${ollamaUrl}/api/pull`, {
         method: 'POST',
         headers: {
           'Content-Type': 'application/json'
         },
        body: JSON.stringify({
          name: modelId,
          stream: true
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error de Ollama al descargar:', errorText);
        throw new Error(`Error descargando modelo (${response.status})`);
      }

      // Leer el stream de respuesta para mostrar progreso
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let downloadComplete = false;

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          downloadComplete = true;
          break;
        }

        // Decodificar el chunk y procesar el progreso
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            
            // Llamar callback de progreso si está disponible
            if (onProgress && data.status) {
              const progress = {
                status: data.status,
                total: data.total,
                completed: data.completed,
                percent: data.total ? (data.completed / data.total) * 100 : 0
              };
              onProgress(progress);
            }
            
            // Verificar si la descarga está completa
            if (data.status === 'success' || data.status === 'complete') {
              downloadComplete = true;
            }
          } catch (e) {
            // Ignorar líneas que no sean JSON válido
          }
        }
      }

      if (downloadComplete) {
        // Marcar como descargado
        model.downloaded = true;
        this.saveConfig();
        
        // Refrescar la lista de modelos instalados
        await this.detectOllamaModels();
        
        return true;
      } else {
        throw new Error('La descarga no se completó correctamente');
      }
    } catch (error) {
      console.error('Error descargando modelo local:', error);
      
      if (error.message.includes('Failed to fetch')) {
        throw new Error('No se pudo conectar con Ollama. Verifica que esté ejecutándose.');
      }
      
      throw error;
    }
  }

  /**
   * Eliminar modelo local
   */
  async deleteLocalModel(modelId) {
    const model = this.getAllLocalModels().find(m => m.id === modelId);
    if (!model) {
      throw new Error('Modelo no encontrado');
    }

    try {
       // Eliminar modelo usando Ollama
       const ollamaUrl = this.getOllamaUrl();
       const response = await fetch(`${ollamaUrl}/api/delete`, {
         method: 'DELETE',
         headers: {
           'Content-Type': 'application/json'
         },
        body: JSON.stringify({
          name: modelId
        })
      });

      if (!response.ok) {
        throw new Error('Error eliminando modelo');
      }

      // Marcar como no descargado
      model.downloaded = false;
      this.saveConfig();

      return true;
    } catch (error) {
      console.error('Error eliminando modelo local:', error);
      throw error;
    }
  }

  /**
   * Limpiar historial de conversación
   */
  clearHistory() {
    this.conversationHistory = [];
    this._filesystemModified = false; // Reset flag al limpiar historial
  }

  /**
   * Obtener historial de conversación
   */
  getHistory() {
    return this.conversationHistory;
  }

  /**
   * Cargar historial desde localStorage
   */
  loadHistory(conversationId) {
    try {
      const histories = JSON.parse(localStorage.getItem('ai-conversations') || '{}');
      this.conversationHistory = histories[conversationId] || [];
    } catch (error) {
      debugLogger.error('AIService.History', 'Error cargando historial', {
        error: error?.message
      });
    }
  }

  /**
   * Guardar historial en localStorage
   */
  saveHistory(conversationId) {
    try {
      const histories = JSON.parse(localStorage.getItem('ai-conversations') || '{}');
      histories[conversationId] = this.conversationHistory;
      localStorage.setItem('ai-conversations', JSON.stringify(histories));
    } catch (error) {
      debugLogger.error('AIService.History', 'Error guardando historial', {
        error: error?.message
      });
    }
  }

  /**
   * 🪟 VENTANA DESLIZANTE INTELIGENTE POR TOKENS
   * Sistema como ChatGPT/Claude - trunca automáticamente sin bloquear al usuario
   * @param {Array} messages - Todos los mensajes de la conversación
   * @param {Object} options - Configuraciones de modelo (contextLimit, etc.)
   * @returns {Array} Mensajes limitados por tokens
   */
  smartTokenBasedHistoryLimit(messages, options) {
    if (!messages || messages.length === 0) return [];

    const contextLimit = options.contextLimit || 16000; // Límite en tokens
    const reserveTokensForResponse = 2000; // Reservar espacio para la respuesta
    const targetLimit = contextLimit - reserveTokensForResponse;

    // Calcular tokens por mensaje usando función simple
    const messagesWithTokens = messages.map(msg => {
      const content = msg.content || '';
      // Detección simple de idioma español para cálculo preciso
      const hasSpanish = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/.test(content);
      const ratio = hasSpanish ? 3.5 : 4; // tokens por caracter
      const tokens = Math.ceil(content.length / ratio);
      
      return {
        ...msg,
        estimatedTokens: tokens
      };
    });

    // Calcular tokens totales
    let totalTokens = messagesWithTokens.reduce((sum, msg) => sum + msg.estimatedTokens, 0);

    // Si estamos dentro del límite, devolver todos los mensajes
    if (totalTokens <= targetLimit) {
      return messages;
    }

    // 🔪 TRUNCAMIENTO INTELIGENTE (como los grandes modelos)
    debugLogger.debug('AIService.History', 'Ventana deslizante activada', {
      totalTokens,
      targetLimit
    });

    // Estrategia: mantener los mensajes más recientes hasta alcanzar el límite
    let truncatedMessages = [];
    let runningTotal = 0;
    let truncatedCount = 0;

    // Empezar desde el final (mensajes más recientes)
    for (let i = messagesWithTokens.length - 1; i >= 0; i--) {
      const msg = messagesWithTokens[i];
      
      // Si agregar este mensaje nos pasaría del límite
      if (runningTotal + msg.estimatedTokens > targetLimit) {
        truncatedCount = i + 1; // Contar mensajes eliminados
        break;
      }
      
      runningTotal += msg.estimatedTokens;
      truncatedMessages.unshift(msg); // Agregar al principio
    }

    // Intentar preservar coherencia de pares (user-assistant)
    if (truncatedMessages.length > 0) {
      const firstMsg = truncatedMessages[0];
      
      // Si el primer mensaje es de assistant, intentar incluir el user anterior
      if (firstMsg.role === 'assistant' && truncatedCount > 0) {
        const previousMsg = messagesWithTokens[truncatedCount - 1];
        if (previousMsg.role === 'user' && 
            runningTotal + previousMsg.estimatedTokens <= targetLimit * 1.05) { // 5% de tolerancia
          truncatedMessages.unshift(previousMsg);
          truncatedCount--;
        }
      }
    }

    // Registro para transparencia (como ChatGPT - opcional y sutil)
    if (truncatedCount > 0) {
      debugLogger.debug('AIService.History', 'Contexto optimizado', {
        mensajesArchivados: truncatedCount,
        tokensLiberados: totalTokens - runningTotal
      });
      
      // Notificación sutil opcional (muy discreta, como los grandes modelos)
      this.lastContextOptimization = {
        messagesArchived: truncatedCount,
        tokensFreed: totalTokens - runningTotal,
        timestamp: Date.now()
      };
    }

    return truncatedMessages;
  }


  /**
   * Detectar archivos mencionados en la respuesta - VERSIÓN SIMPLIFICADA
   * Solo extrae bloques de código de la respuesta actual
   * 
   * 🔒 AUDITORÍA DE SEGURIDAD:
   * - SOLO procesa 'content' (respuesta actual de la IA)
   * - NUNCA incluye historial de conversaciones anteriores
   * - NUNCA busca en contenido del usuario
   * - 'userMessage' solo se usa para detectar INTENCIÓN (edición vs archivo nuevo)
   * - Flujo: AIChatPanel.js línea 326 → data.response (respuesta actual)
   * - data.response viene de sendMessageWithCallbacks (línea 981-986)
   * - sendMessageWithCallbacks retorna SOLO respuesta nueva, NO historial
   */
  detectFilesInResponse(content, userMessage = '') {
    if (!content) return [];
    
    const files = [];
    const seenFiles = new Set();
    
    // PASO 1: Extraer SOLO bloques de código formales: ```lenguaje\ncode```
    // Regex crítica: esto es lo ÚNICO que se procesa
    const codeBlockRegex = /```(\w+)?\s*\n([\s\S]*?)```/g;
    let match;
    let blockIndex = 0;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blockIndex++;
      const language = (match[1] || 'txt').trim().toLowerCase();
      const code = match[2].trim();
      const blockStartPosition = match.index;
      
      // Solo aceptar bloques con contenido real (más de 20 caracteres)
      if (code.length < 20) continue;
      
      // Solo aceptar lenguajes de programación válidos
      const validLanguages = {
        'python': 'py',
        'javascript': 'js',
        'typescript': 'ts',
        'html': 'html',
        'css': 'css',
        'jsx': 'jsx',
        'tsx': 'tsx',
        'json': 'json',
        'xml': 'xml',
        'yaml': 'yml',
        'markdown': 'md',
        'bash': 'sh',
        'shell': 'sh',
        'sh': 'sh',
        'powershell': 'ps1',
        'batch': 'bat',
        'cmd': 'cmd',
        'java': 'java',
        'cpp': 'cpp',
        'c': 'c',
        'csharp': 'cs',
        'go': 'go',
        'rust': 'rs',
        'php': 'php',
        'ruby': 'rb',
        'perl': 'pl',
        'swift': 'swift',
        'kotlin': 'kt',
        'scala': 'scala',
        'dart': 'dart',
        'lua': 'lua',
        'r': 'r',
        'julia': 'jl',
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
        'pascal': 'pas'
      };
      
      if (!(language in validLanguages)) continue;
      
      // PASO 2: PRIMERO buscar título markdown antes del bloque de código
      const titleFromMarkdown = this.extractTitleFromMarkdown(content, blockStartPosition);
      let fileName;
      
      if (titleFromMarkdown) {
        const extension = this.getLanguageExtension(language);
        fileName = `${titleFromMarkdown}.${extension}`;
      } else {
        // Si no hay título markdown, usar la lógica original
        fileName = this.generateDescriptiveFileName(code, language, blockIndex, userMessage);
      }
      
      // Si generateDescriptiveFileName retorna null, IGNORAR este bloque (ej: comandos bash simples)
      if (fileName === null) continue;
      
      // Evitar duplicados - si el nombre ya existe, agregar sufijo único
      let uniqueFileName = fileName;
      let counter = 1;
      while (seenFiles.has(uniqueFileName)) {
        const fileParts = fileName.split('.');
        const name = fileParts.slice(0, -1).join('.');
        const extension = fileParts[fileParts.length - 1];
        uniqueFileName = `${name}_${counter}.${extension}`;
        counter++;
      }
      
      files.push(uniqueFileName);
      seenFiles.add(uniqueFileName);
    }
    
    return files;
  }

  /**
   * Generar nombre simple de archivo basado en el contenido
   * Detecta si es una edición o un archivo nuevo
   */
  generateSimpleFileName(code, language, blockIndex, userMessage) {
    const extensions = {
      'python': 'py',
      'javascript': 'js',
      'typescript': 'ts',
      'html': 'html',
      'css': 'css',
      'jsx': 'jsx',
      'tsx': 'tsx',
      'json': 'json',
      'xml': 'xml',
      'bash': 'sh',
      'shell': 'sh',
      'sh': 'sh',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'rust': 'rs',
      'php': 'php',
      'ruby': 'rb',
      'sql': 'sql'
    };
    
    const ext = extensions[language] || language;
    
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
    
    // DETECTAR EDICIONES: Si es código incompleto o fragmento, probablemente es edición
    const isEditionIndicators = [
      'document.getElementById', // Edición de HTML existente
      'addEventListener', // Edición de script existente
      'querySelector', // Edición de HTML/CSS
      'fetch(', // Edición de API
      'const', // Edición de función existente
      'function ', // Nueva función en archivo existente
      'export ', // Edición de módulo
      'import ', // Edición de imports
    ];
    
    const hasEditionIndicators = isEditionIndicators.some(indicator => code.includes(indicator));
    
    // Si tiene indicadores de edición Y no es un archivo completo, es una edición
    const isCompleteFile = code.includes('<!DOCTYPE') || 
                          code.includes('if __name__') ||
                          code.includes('function main') ||
                          code.includes('package main');
    
    const isEdition = hasEditionIndicators && !isCompleteFile;
    
    // 1. Si el usuario pidió explícitamente algo, usar ese nombre
    if (userMessage) {
      const userLower = userMessage.toLowerCase();
      
      // Palabras clave que indican edición
      const editKeywords = ['añade', 'agrega', 'add', 'edit', 'modifica', 'update', 'edita', 'improve', 'mejorar', 'incluye', 'include'];
      const isEditRequest = editKeywords.some(kw => userLower.includes(kw));
      
      // Si es solicitud de edición y el código parece una edición, retornar archivo conocido
      if (isEditRequest && isEdition) {
        // Detectar qué archivo es probablemente una edición
        if (language === 'html' && code.includes('<')) return 'index.html';
        if (language === 'javascript' && code.includes('document.')) return 'index.js';
        if (language === 'javascript' && code.includes('app.on')) return 'main.js';
        if (language === 'css') return 'styles.css';
        if (language === 'json' && code.includes('"')) return 'package.json';
      }
      
      // Electron
      if (userLower.includes('electron') && language === 'javascript') {
        if (code.includes('BrowserWindow') || code.includes('app.on')) return 'main.js';
        if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'index.html';
      }
      
      // React
      if ((userLower.includes('react') || userLower.includes('componente')) && language === 'jsx') {
        return `Component.${ext}`;
      }
      
      // Package.json
      if (userLower.includes('package.json') && language === 'json') {
        return 'package.json';
      }
    }
    
    // 2. Detectar archivos especiales por contenido
    if (language === 'html' && code.includes('<!DOCTYPE')) {
      return 'index.html';
    }
    if (language === 'json' && code.includes('"name"') && code.includes('"version"')) {
      return 'package.json';
    }
    if (language === 'javascript' && code.includes('module.exports')) {
      return 'index.js';
    }
    if (language === 'css' && code.split('\n').length > 2) {
      return 'styles.css';
    }
    
    // 3. Si parece una edición pero no sabemos cuál archivo, usar nombre genérico
    if (isEdition) {
      const typeNames = {
        'python': 'script',
        'javascript': 'index',
        'typescript': 'index',
        'html': 'index',
        'css': 'styles',
        'json': 'config',
        'java': 'App',
        'cpp': 'main',
        'sql': 'query',
        'bash': 'script',
        'shell': 'script',
        'sh': 'script'
      };
      
      const baseName = typeNames[language] || 'file';
      return `${baseName}.${ext}`; // Sin números para ediciones
    }
    
    // 4. Nombre genérico basado en tipo para archivos nuevos
    const typeNames = {
      'python': 'script',
      'javascript': 'script',
      'typescript': 'script',
      'html': 'page',
      'css': 'styles',
      'json': 'config',
      'java': 'App',
      'cpp': 'main',
      'sql': 'query',
      'bash': 'script',
      'shell': 'script',
      'sh': 'script'
    };
    
    const baseName = typeNames[language] || 'file';
    return `${baseName}_${blockIndex}.${ext}`;
  }

  /**
   * Verificar si el código es significativo y merece ser un archivo
   */
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

  /**
   * ℹ️ NOTA: Validación de memoria ahora es PASIVA
   * - El monitoreo solo reporta datos
   * - Las descargas son MANUALES (widget)
   * - Sin auto-descarga automática
   */

  /**
   * ✅ NUEVO: Calcular contexto dinámico según RAM disponible
   */
  _calcDynamicContext(freeRAMMB) {
    return this.memoryService.calcDynamicContext(freeRAMMB);
  }

  /**
   * 📝 Cambiar modelo - SIN auto-descarga
   * La descarga del modelo anterior es MANUAL (widget)
   */
  async switchModel(newModelId, newModelType) {
    const oldModel = this.currentModel;
    const oldType = this.modelType;

    this.currentModel = newModelId;
    this.modelType = newModelType;

    if (oldType === 'local' && newModelType === 'local' && oldModel !== newModelId) {
      console.log(`[AIService] 📊 Cambio de modelo: ${oldModel} → ${newModelId}`);
      console.log(`[AIService] 💡 Para liberar RAM de "${oldModel}", usa Ctrl+M y haz clic en [❌ Descargar]`);
    }

    this.saveConfig();
  }
}

// Exportar instancia singleton
export const aiService = new AIService();
export default aiService;

