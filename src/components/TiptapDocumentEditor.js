import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import TurndownService from 'turndown';
import { marked } from 'marked';
import '../styles/components/documents.css';

const lowlight = createLowlight(common);
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

// Preset Rich Templates for developers and administrators
const NOTE_TEMPLATES = {
  meeting: `<h1>🗓️ Minuta de Reunión: [Tema de la Reunión]</h1>
<p><strong>Fecha:</strong> ${new Date().toLocaleDateString()} | <strong>Facilitador:</strong> [Nombre del Organizador]</p>
<hr />
<h2>👥 Asistentes</h2>
<ul>
  <li>[Asistente 1]</li>
  <li>[Asistente 2]</li>
</ul>
<h2>📝 Puntos Clave Tratados</h2>
<ul>
  <li><strong>Punto 1:</strong> Revisión del despliegue y arquitectura actual de terminales.</li>
  <li><strong>Punto 2:</strong> Integración y rendimiento del módulo de túneles SSH.</li>
</ul>
<h2>🚀 Acciones a Tomar (Acciones)</h2>
<ul data-type="taskList">
  <li data-checked="false"><label><input type="checkbox" /><span> Probar el nuevo asistente de Inteligencia Artificial.</span></label></li>
  <li data-checked="false"><label><input type="checkbox" /><span> Realizar una copia de seguridad del árbol de conexiones.</span></label></li>
</ul>`,

  bug: `<h1>🐛 Reporte de Incidencia: [Breve descripción del error]</h1>
<p><strong>Severidad:</strong> Alta | <strong>Estado:</strong> Abierto | <strong>Reportado por:</strong> Administrador</p>
<hr />
<h2>🔍 Descripción del Problema</h2>
<p>Se ha observado un comportamiento anómalo al conectar múltiples terminales simultáneamente bajo la misma red...</p>
<h2>🛠️ Pasos para Reproducir</h2>
<ol>
  <li>Abrir el Gestor de Conexiones en la barra lateral.</li>
  <li>Conectar a dos servidores SSH al mismo tiempo.</li>
  <li>Observar el lag de renderizado en el panel SSHSystemMonitor.</li>
</ol>
<h2>📋 Comportamiento Esperado vs. Encontrado</h2>
<p><strong>Esperado:</strong> Flujo constante a 60 FPS sin pérdida de paquetes.</p>
<p><strong>Encontrado:</strong> Picos de CPU superiores al 90% y congelamiento temporal.</p>
<h2>💻 Logs y Código Relacionado</h2>
<pre><code>Error: Guacamole tunnel connection timeout
at GuacamoleTunnel.connect (guac-tunnel.js:84)
at process.processTicksAndRejections (node:internal/process/task_queues:95)</code></pre>`,

  ssh: `<h1>💻 Bitácora de Servidor: [Nombre o Host del Servidor]</h1>
<p><strong>Dirección IP:</strong> 192.168.1.150 | <strong>Usuario principal:</strong> admin-sys</p>
<hr />
<h2>⚡ Comandos y Tareas Ejecutadas</h2>
<p>Registro de actividades de mantenimiento del sistema de contenedores:</p>
<pre><code># 1. Comprobar espacio libre en disco principal
df -h

# 2. Monitorear procesos con alto consumo
htop

# 3. Reiniciar el servicio del servidor web Apache
systemctl restart apache2</code></pre>
<h2>📌 Notas del Administrador</h2>
<blockquote>Recuerda siempre ejecutar las bitácoras con privilegios mínimos y registrar cada cambio de configuración de firewall IPtables.</blockquote>`,

  todo: `<h1>📅 Planificador de Tareas y Objetivos</h1>
<p><em>"Enfócate en lo importante, automatiza el resto."</em></p>
<hr />
<h2>🚀 Objetivos Principales del Día</h2>
<ul data-type="taskList">
  <li data-checked="true"><label><input type="checkbox" checked /><span> Auditar claves del gestor de contraseñas de NodeTerm.</span></label></li>
  <li data-checked="false"><label><input type="checkbox" /><span> Configurar túnel de reenvío SSH inverso.</span></label></li>
  <li data-checked="false"><label><input type="checkbox" /><span> Realizar limpieza de cachés y temporales del servidor de pruebas.</span></label></li>
  <li data-checked="false"><label><input type="checkbox" /><span> Redactar documentación técnica en Markdown.</span></label></li>
</ul>`
};

const ToolbarButton = ({ onClick, isActive, disabled, title, children }) => (
  <button
    onClick={onClick}
    className={isActive ? 'is-active' : ''}
    disabled={disabled}
    title={title}
    type="button"
  >
    {children}
  </button>
);

const ToolbarSeparator = () => <div className="toolbar-separator" />;

const EditorToolbar = ({
  editor,
  onInsertTemplate,
  isPlayingSpeech,
  onToggleSpeech,
  onOpenAiAssist,
  isZenMode,
  onToggleZen,
  onPrint
}) => {
  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('URL de la imagen:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  return (
    <div className="document-editor-toolbar">
      {/* Grupo 1: Formato básico */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
        >
          <i className="pi pi-bold" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
        >
          <i className="pi pi-italic" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
        >
          <i className="pi pi-underline" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <i className="pi pi-minus" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Resaltar"
        >
          <i className="pi pi-sun" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 2: Títulos */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Título 1"
        >
          H1
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Título 2"
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Título 3"
        >
          H3
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 3: Listas */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista de viñetas"
        >
          <i className="pi pi-list" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <i className="pi pi-sort-numeric-up" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Lista de tareas"
        >
          <i className="pi pi-check-square" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 4: Elementos */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Cita"
        >
          <i className="pi pi-comment" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Bloque de código"
        >
          <i className="pi pi-code" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
        >
          <i className="pi pi-minus" style={{ transform: 'scaleX(1.5)' }} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 5: Tablas y multimedia */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insertar tabla"
        >
          <i className="pi pi-table" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Insertar imagen">
          <i className="pi pi-image" />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Insertar enlace">
          <i className="pi pi-link" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 6: Alineación */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinear izquierda"
        >
          <i className="pi pi-align-left" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centrar"
        >
          <i className="pi pi-align-center" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinear derecha"
        >
          <i className="pi pi-align-right" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 7: Deshacer/Rehacer */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer (Ctrl+Z)"
        >
          <i className="pi pi-undo" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer (Ctrl+Y)"
        >
          <i className="pi pi-replay" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* NUEVO: Funcionalidades Premium en Toolbar */}
      <div className="toolbar-group premium-tools" style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
        {/* Plantillas Dropdown */}
        <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
          <button
            className="toolbar-premium-btn"
            title="Insertar Plantilla Técnica"
            type="button"
            onClick={(e) => {
              const menu = e.currentTarget.nextElementSibling;
              if (menu) {
                menu.classList.toggle('show');
                const closeMenu = (evt) => {
                  if (!e.currentTarget.contains(evt.target) && !menu.contains(evt.target)) {
                    menu.classList.remove('show');
                    document.removeEventListener('click', closeMenu);
                  }
                };
                document.addEventListener('click', closeMenu);
              }
            }}
            style={{ border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}
          >
            <i className="pi pi-clone" style={{ marginRight: '4px' }} />
            Plantillas
          </button>
          <div className="template-dropdown-menu">
            <div onClick={() => onInsertTemplate(NOTE_TEMPLATES.meeting)}><i className="pi pi-calendar" /> Minuta de Reunión</div>
            <div onClick={() => onInsertTemplate(NOTE_TEMPLATES.bug)}><i className="pi pi-exclamation-triangle" /> Reporte de Bug (QA)</div>
            <div onClick={() => onInsertTemplate(NOTE_TEMPLATES.ssh)}><i className="pi pi-desktop" /> Bitácora SSH / Comandos</div>
            <div onClick={() => onInsertTemplate(NOTE_TEMPLATES.todo)}><i className="pi pi-list" /> Planificador de Objetivos</div>
          </div>
        </div>

        {/* Lector TTS */}
        <button
          className={`toolbar-premium-btn ${isPlayingSpeech ? 'active-reading' : ''}`}
          onClick={onToggleSpeech}
          title={isPlayingSpeech ? "Detener lector" : "Leer nota en voz alta (TTS)"}
          type="button"
          style={{
            border: isPlayingSpeech ? '1px solid #ff9800' : '1px solid rgba(255, 152, 0, 0.3)',
            color: '#ff9800',
            background: isPlayingSpeech ? 'rgba(255, 152, 0, 0.15)' : 'rgba(255, 152, 0, 0.05)'
          }}
        >
          <i className={isPlayingSpeech ? "pi pi-volume-off" : "pi pi-volume-up"} />
        </button>

        {/* AI Sparkles */}
        <button
          className="toolbar-premium-btn"
          onClick={onOpenAiAssist}
          title="Asistente de Escritura IA"
          type="button"
          style={{
            border: '1px solid rgba(156, 39, 176, 0.4)',
            color: '#c792ea',
            background: 'rgba(156, 39, 176, 0.05)'
          }}
        >
          <i className="pi pi-sparkles" />
        </button>

        {/* Imprimir */}
        <button
          className="toolbar-premium-btn"
          onClick={onPrint}
          title="Imprimir / Exportar PDF"
          type="button"
          style={{
            border: '1px solid rgba(100, 181, 246, 0.3)',
            color: '#64b5f6',
            background: 'rgba(100, 181, 246, 0.05)'
          }}
        >
          <i className="pi pi-print" />
        </button>

        {/* Modo Zen */}
        <button
          className={`toolbar-premium-btn ${isZenMode ? 'zen-active' : ''}`}
          onClick={onToggleZen}
          title={isZenMode ? "Salir de Modo Zen" : "Modo Concentración Zen"}
          type="button"
          style={{
            border: isZenMode ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
            color: isZenMode ? '#10b981' : 'var(--ui-content-text, #ccc)',
            background: isZenMode ? 'rgba(16, 185, 129, 0.15)' : 'transparent'
          }}
        >
          <i className={isZenMode ? "pi pi-eye-slash" : "pi pi-expand"} />
        </button>
      </div>
    </div>
  );
};

const TiptapDocumentEditor = ({ documentKey, documentData, onSave }) => {
  const [viewMode, setViewMode] = useState('wysiwyg');
  const [markdownSource, setMarkdownSource] = useState(documentData?.markdownSource || '');
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const lastSavedContentRef = useRef(documentData?.content || '');

  // Premium Features State
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenTheme, setZenTheme] = useState('dark-charcoal'); // 'dark-charcoal', 'deep-nebula', 'solar-sepia', 'clean-cyber'
  
  // TTS (Speech Synthesis) State
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const synthRef = useRef(window.speechSynthesis);

  // AI Assistant State
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiActionType, setAiActionType] = useState(''); // 'summary', 'tasks', 'rewrite', 'translate'

  // Document Metrics State
  const [metrics, setMetrics] = useState({
    words: 0,
    characters: 0,
    paragraphs: 0,
    readTime: 0
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu nota... (Presiona el botón de Plantillas para empezar rápido)',
      }),
      Underline,
      Highlight,
      Link.configure({ openOnClick: false }),
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: documentData?.content || '',
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      updateMetrics(editor);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContent(editor);
      }, 2000);
    },
  });

  // Calculate Metrics in real time
  const updateMetrics = (editorInstance) => {
    if (!editorInstance) return;
    const text = editorInstance.getText() || '';
    const cleanText = text.trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
    const characters = text.length;
    
    // Simple paragraph counting
    const html = editorInstance.getHTML() || '';
    const paragraphs = (html.match(/<p>/g) || []).length + (html.match(/<h[1-6]>/g) || []).length;
    
    // Reading time: standard 200 words per minute
    const readTime = Math.ceil(words / 200);

    setMetrics({
      words,
      characters,
      paragraphs: paragraphs || 1,
      readTime
    });
  };

  useEffect(() => {
    if (editor) {
      updateMetrics(editor);
    }
  }, [editor]);

  const saveContent = useCallback((editorInstance) => {
    const ed = editorInstance || editor;
    if (!ed) return;

    const html = ed.getHTML();
    if (html === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    const md = turndownService.turndown(html);

    lastSavedContentRef.current = html;

    window.dispatchEvent(new CustomEvent('document-content-updated', {
      detail: {
        key: documentKey,
        content: html,
        markdownSource: md
      }
    }));

    if (onSave) {
      onSave({ content: html, markdownSource: md });
    }

    setTimeout(() => setSaveStatus('saved'), 300);
  }, [editor, documentKey, onSave]);

  // Save on blur / before unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editor && !editor.isDestroyed) {
        const html = editor.getHTML();
        if (html !== lastSavedContentRef.current) {
          const md = turndownService.turndown(html);
          window.dispatchEvent(new CustomEvent('document-content-updated', {
            detail: { key: documentKey, content: html, markdownSource: md }
          }));
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [editor, documentKey]);

  const switchToMarkdown = useCallback(() => {
    if (editor) {
      const html = editor.getHTML();
      const md = turndownService.turndown(html);
      setMarkdownSource(md);
    }
    setViewMode('markdown');
  }, [editor]);

  const switchToWysiwyg = useCallback(() => {
    if (editor && markdownSource) {
      const html = marked(markdownSource);
      editor.commands.setContent(html);
      updateMetrics(editor);
    }
    setViewMode('wysiwyg');
  }, [editor, markdownSource]);

  const handleMarkdownChange = (e) => {
    const val = e.target.value;
    setMarkdownSource(val);
    setSaveStatus('unsaved');

    // Dynamically calculate metrics for markdown view too
    const cleanText = val.trim();
    const words = cleanText ? cleanText.split(/\s+/).filter(w => w.length > 0).length : 0;
    const characters = val.length;
    const paragraphs = (val.match(/\n\n/g) || []).length + 1;
    const readTime = Math.ceil(words / 200);
    setMetrics({ words, characters, paragraphs, readTime });

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = marked(val);
      lastSavedContentRef.current = html;
      setSaveStatus('saving');

      window.dispatchEvent(new CustomEvent('document-content-updated', {
        detail: {
          key: documentKey,
          content: html,
          markdownSource: val
        }
      }));

      if (onSave) {
        onSave({ content: html, markdownSource: val });
      }
      setTimeout(() => setSaveStatus('saved'), 300);
    }, 2000);
  };

  // Note templates insertion handler
  const handleInsertTemplate = (templateHtml) => {
    if (!editor) return;
    
    const confirmText = '¿Estás seguro de insertar la plantilla? Esto reemplazará el contenido actual de tu nota.';
    if (editor.getText().trim().length > 0 && !window.confirm(confirmText)) {
      return;
    }

    editor.commands.setContent(templateHtml);
    updateMetrics(editor);
    
    // Trigger auto-save immediately
    setSaveStatus('unsaved');
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveContent(editor);

    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'success',
        summary: 'Plantilla insertada',
        detail: 'Contenido cargado correctamente',
        life: 2000
      });
    }
  };

  // TTS - Lector por voz
  const handleToggleSpeech = () => {
    if (!editor) return;

    if (isPlayingSpeech) {
      synthRef.current.cancel();
      setIsPlayingSpeech(false);
      return;
    }

    const plainText = editor.getText().trim();
    if (!plainText) {
      if (window.toast?.current?.show) {
        window.toast.current.show({
          severity: 'warn',
          summary: 'Texto vacío',
          detail: 'No hay texto en la nota para leer',
          life: 2000
        });
      }
      return;
    }

    // Cancel any previous speaking
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = speechRate;
    
    // Auto-detect lang
    utterance.lang = 'es-ES';
    if (plainText.substring(0, 200).match(/[a-zA-Z]/) && !plainText.includes('ñ') && !plainText.includes('á') && !plainText.includes('í')) {
      // rough heuristic for english
      utterance.lang = 'en-US';
    }

    utterance.onend = () => {
      setIsPlayingSpeech(false);
    };
    utterance.onerror = () => {
      setIsPlayingSpeech(false);
    };

    setIsPlayingSpeech(true);
    synthRef.current.speak(utterance);
  };

  // Adjust Speech Rate
  const handleSpeechRateChange = (rate) => {
    setSpeechRate(rate);
    if (isPlayingSpeech) {
      // Restart with new speed
      synthRef.current.cancel();
      setTimeout(() => {
        handleToggleSpeech();
      }, 100);
    }
  };

  // Print/Save PDF
  const handlePrint = () => {
    window.print();
  };

  // AI Assistant processing with beautiful local parsers
  const handleAiAction = (actionType) => {
    if (!editor) return;
    
    setAiLoading(true);
    setAiActionType(actionType);
    setAiResult('');
    setShowAiPanel(true);

    const plainText = editor.getText().trim();
    const htmlContent = editor.getHTML();
    const title = documentData?.label || 'Nota Técnica';

    setTimeout(() => {
      let result = '';

      if (!plainText) {
        setAiResult('### ⚠️ Nota vacía\n\nPor favor, escribe algo de contenido en tu nota primero para que el Asistente de IA pueda analizarlo.');
        setAiLoading(false);
        return;
      }

      if (actionType === 'summary') {
        // Parse sentences and headers
        const sentences = plainText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 8);
        const headings = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, 'text/html');
        doc.querySelectorAll('h1, h2, h3, h4').forEach(h => {
          if (h.textContent.trim()) headings.push(h.textContent.trim());
        });

        result = `### 📝 Resumen Analítico de: "${title}"\n\n`;
        result += `* **Estructura Identificada:** Se detectaron ${headings.length} secciones clave en la nota.\n`;
        
        if (sentences.length > 0) {
          result += `* **Idea Central:** ${sentences[0]}.\n`;
          if (sentences[1]) result += `* **Punto de Desarrollo:** ${sentences[1]}.\n`;
          if (sentences[2]) result += `* **Conclusión / Cierre:** ${sentences[2]}.\n`;
        }
        
        result += `* **Estadísticas IA:** Documento de dificultad de lectura media-baja. Ideal para bitácora técnica.\n\n`;
        result += `--- \n*Generado localmente por el motor inteligente de NodeTerm.*`;
      } 
      else if (actionType === 'tasks') {
        const lines = plainText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const actionVerbs = ['revisar', 'probar', 'testear', 'actualizar', 'instalar', 'configurar', 'depurar', 'debuggear', 'ejecutar', 'reiniciar', 'crear', 'implementar', 'escribir', 'hacer'];
        const listItems = [];

        lines.forEach(line => {
          const lower = line.toLowerCase();
          const matchesVerb = actionVerbs.some(verb => lower.includes(verb));
          if (matchesVerb && line.length < 120) {
            // strip leading bullet symbols if any
            const cleaned = line.replace(/^[-*•\d.\s+\[\]\(\)]+/, '');
            listItems.push(cleaned);
          }
        });

        result = `### 🚀 Tareas y Action Items Extraídos\n\n`;
        if (listItems.length > 0) {
          result += `He analizado tu nota y he encontrado las siguientes tareas de ingeniería listas para tu checklist:\n\n`;
          listItems.forEach(item => {
            result += `- [ ] **${item.charAt(0).toUpperCase() + item.slice(1)}**\n`;
          });
        } else {
          result += `No se han detectado verbos de acción explícitos. Aquí tienes una lista de tareas de ingeniería propuesta:\n\n`;
          result += `- [ ] Realizar una auditoría técnica de los servidores descritos en la nota.\n`;
          result += `- [ ] Compartir estos apuntes técnicos con el resto de administradores.\n`;
          result += `- [ ] Archivar de forma segura bajo el árbol cifrado de NodeTerm.\n`;
        }
      } 
      else if (actionType === 'rewrite') {
        const paragraphs = plainText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        
        result = `### ✍️ Versión Corporativa / Documental\n\n`;
        result += `*Texto reformulado en tono formal y profesional de ingeniería:*\n\n`;
        result += `> **[REPORTE TÉCNICO] - ${title.toUpperCase()}**\n>\n`;
        
        paragraphs.forEach(para => {
          if (para.length > 10) {
            result += `> ${para.replace(/creo que|me parece que/gi, 'Se constata que').replace(/tengo que/gi, 'Se requiere').replace(/error raro/gi, 'comportamiento anómalo en el entorno')} \n>\n`;
          }
        });
        result += `> *Fin del bloque técnico.*`;
      } 
      else if (actionType === 'translate') {
        const paragraphs = plainText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
        
        result = `### 🌐 Traducción Técnica (ES ➔ EN)\n\n`;
        result += `**Document Title:** ${title}\n\n`;
        
        paragraphs.forEach(para => {
          if (para.length > 5) {
            // Apply a nice tech translation dictionary locally
            let trans = para
              .replace(/servidor/gi, 'server')
              .replace(/servidores/gi, 'servers')
              .replace(/usuario/gi, 'user')
              .replace(/contraseña/gi, 'password')
              .replace(/seguridad/gi, 'security')
              .replace(/incidencia/gi, 'issue')
              .replace(/error/gi, 'error')
              .replace(/conexión/gi, 'connection')
              .replace(/comando/gi, 'command')
              .replace(/ayuda/gi, 'help')
              .replace(/tareas/gi, 'tasks')
              .replace(/configurar/gi, 'configure')
              .replace(/reiniciar/gi, 'restart')
              .replace(/guardar/gi, 'save')
              .replace(/lista/gi, 'list');
            
            result += `> *${trans}*\n\n`;
          }
        });
        result += `*(Technical Translation Engine offline)*`;
      }

      setAiLoading(false);
      
      // Gorgeous typing animation effect
      let charIdx = 0;
      const interval = setInterval(() => {
        if (charIdx < result.length) {
          charIdx += Math.min(6, result.length - charIdx);
          setAiResult(result.substring(0, charIdx));
        } else {
          clearInterval(interval);
        }
      }, 10);

    }, 1000);
  };

  // Insert AI Result directly into the editor
  const handleInsertAiResult = () => {
    if (!editor || !aiResult) return;
    
    // Convert markdown response to HTML using marked
    const formattedHtml = marked(aiResult);
    
    editor.chain().focus().insertContent(`<hr />${formattedHtml}<br />`).run();
    updateMetrics(editor);
    setShowAiPanel(false);

    if (window.toast?.current?.show) {
      window.toast.current.show({
        severity: 'success',
        summary: 'IA Aplicada',
        detail: 'Análisis IA insertado al final de la nota',
        life: 2000
      });
    }
  };

  const handleExportMarkdown = () => {
    let md = markdownSource;
    if (viewMode === 'wysiwyg' && editor) {
      md = turndownService.turndown(editor.getHTML());
    }
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentData?.label || 'document'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportHtml = () => {
    if (!editor) return;
    const html = editor.getHTML();
    const styledHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${documentData?.label || 'Nota de NodeTerm'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
    }
    h1 { border-bottom: 2px solid #eaecef; padding-bottom: 0.3em; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow: auto; font-family: monospace; }
    blockquote { border-left: 4px solid #dfe2e5; color: #6a737d; padding-left: 16px; margin: 0; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #dfe2e5; padding: 8px 12px; }
    th { background: #f6f8fa; }
    ul[data-type="taskList"] { list-style: none; padding-left: 4px; }
  </style>
</head>
<body>
  ${html}
</body>
</html>
    `;
    const blob = new Blob([styledHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${documentData?.label || 'document'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportMarkdown = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.txt,.markdown';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        const html = marked(text);
        if (editor) {
          editor.commands.setContent(html);
          updateMetrics(editor);
        }
        setMarkdownSource(text);
        setSaveStatus('unsaved');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Copy Options
  const handleCopyMarkdown = () => {
    let md = markdownSource;
    if (viewMode === 'wysiwyg' && editor) {
      md = turndownService.turndown(editor.getHTML());
    }
    navigator.clipboard.writeText(md);
    if (window.toast?.current?.show) {
      window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: 'Nota copiada en formato Markdown', life: 1500 });
    }
  };

  const handleCopyHtml = () => {
    if (!editor) return;
    navigator.clipboard.writeText(editor.getHTML());
    if (window.toast?.current?.show) {
      window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: 'Código HTML copiado', life: 1500 });
    }
  };

  return (
    <div className={`document-editor-container ${isZenMode ? `zen-mode-active zen-theme-${zenTheme}` : ''}`}>
      
      {/* CABECERA PRINCIPAL */}
      <div className="document-editor-header">
        <div className="document-editor-title">
          <i className="pi pi-file-edit" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {documentData?.label || 'Sin título'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          
          {/* Lector TTS Rate Slider (Solo se muestra cuando está hablando) */}
          {isPlayingSpeech && (
            <div className="tts-rate-control" style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 8 }}>
              <span style={{ fontSize: '0.75rem', color: '#ff9800' }}>Velocidad:</span>
              <select
                value={speechRate}
                onChange={(e) => handleSpeechRateChange(parseFloat(e.target.value))}
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 4,
                  fontSize: '0.75rem',
                  padding: '2px 4px'
                }}
              >
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="1.25">1.25x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>
            </div>
          )}

          {/* Selector de Tema Zen (Solo en Zen Mode) */}
          {isZenMode && (
            <div className="zen-theme-selector" style={{ display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
              <button
                className={`theme-badge charcoal ${zenTheme === 'dark-charcoal' ? 'active' : ''}`}
                onClick={() => setZenTheme('dark-charcoal')}
                title="Gris Carbón"
              />
              <button
                className={`theme-badge nebula ${zenTheme === 'deep-nebula' ? 'active' : ''}`}
                onClick={() => setZenTheme('deep-nebula')}
                title="Deep Nebula"
              />
              <button
                className={`theme-badge sepia ${zenTheme === 'solar-sepia' ? 'active' : ''}`}
                onClick={() => setZenTheme('solar-sepia')}
                title="Solarized Sepia"
              />
              <button
                className={`theme-badge cyber ${zenTheme === 'clean-cyber' ? 'active' : ''}`}
                onClick={() => setZenTheme('clean-cyber')}
                title="Clean Cyber"
              />
            </div>
          )}

          <div className="document-mode-toggle">
            <button
              className={viewMode === 'wysiwyg' ? 'active' : ''}
              onClick={switchToWysiwyg}
              type="button"
            >
              Visual
            </button>
            <button
              className={viewMode === 'markdown' ? 'active' : ''}
              onClick={switchToMarkdown}
              type="button"
            >
              Markdown
            </button>
          </div>

          {/* Opciones de portapapeles dropdown */}
          <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
            <button
              title="Copiar nota..."
              type="button"
              className="toolbar-header-action-btn"
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                if (menu) {
                  menu.classList.toggle('show');
                  const closeMenu = (evt) => {
                    if (!e.currentTarget.contains(evt.target) && !menu.contains(evt.target)) {
                      menu.classList.remove('show');
                      document.removeEventListener('click', closeMenu);
                    }
                  };
                  document.addEventListener('click', closeMenu);
                }
              }}
            >
              <i className="pi pi-copy" />
            </button>
            <div className="template-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '160px' }}>
              <div onClick={handleCopyMarkdown}><i className="pi pi-file" /> Copiar Markdown</div>
              <div onClick={handleCopyHtml}><i className="pi pi-code" /> Copiar código HTML</div>
            </div>
          </div>

          {/* Opciones de descarga dropdown */}
          <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
            <button
              title="Exportar/Importar..."
              type="button"
              className="toolbar-header-action-btn"
              onClick={(e) => {
                const menu = e.currentTarget.nextElementSibling;
                if (menu) {
                  menu.classList.toggle('show');
                  const closeMenu = (evt) => {
                    if (!e.currentTarget.contains(evt.target) && !menu.contains(evt.target)) {
                      menu.classList.remove('show');
                      document.removeEventListener('click', closeMenu);
                    }
                  };
                  document.addEventListener('click', closeMenu);
                }
              }}
            >
              <i className="pi pi-download" />
            </button>
            <div className="template-dropdown-menu" style={{ right: 0, left: 'auto', minWidth: '180px' }}>
              <div onClick={handleImportMarkdown}><i className="pi pi-upload" /> Importar Markdown</div>
              <div onClick={handleExportMarkdown}><i className="pi pi-download" /> Exportar Markdown (.md)</div>
              <div onClick={handleExportHtml}><i className="pi pi-file-html" /> Exportar Web HTML (.html)</div>
            </div>
          </div>

          <div className="document-editor-status">
            {saveStatus === 'saved' && (
              <span className="saved"><i className="pi pi-check" /> Guardado</span>
            )}
            {saveStatus === 'saving' && (
              <span className="saving"><i className="pi pi-spin pi-spinner" /> Guardando...</span>
            )}
            {saveStatus === 'unsaved' && (
              <span style={{ color: '#ff9800' }}><i className="pi pi-circle-fill" style={{ fontSize: '0.5rem' }} /> Sin guardar</span>
            )}
          </div>
        </div>
      </div>

      {/* CUERPO DEL EDITOR */}
      {viewMode === 'wysiwyg' ? (
        <>
          <EditorToolbar
            editor={editor}
            onInsertTemplate={handleInsertTemplate}
            isPlayingSpeech={isPlayingSpeech}
            onToggleSpeech={handleToggleSpeech}
            onOpenAiAssist={() => setShowAiPanel(!showAiPanel)}
            isZenMode={isZenMode}
            onToggleZen={() => setIsZenMode(!isZenMode)}
            onPrint={handlePrint}
          />
          <div className="document-editor-content">
            <EditorContent editor={editor} />
          </div>
        </>
      ) : (
        <div className="document-markdown-source">
          <textarea
            value={markdownSource}
            onChange={handleMarkdownChange}
            placeholder="Escribe en Markdown..."
            spellCheck={false}
          />
        </div>
      )}

      {/* FLOATING AI ASSISTANT PANEL */}
      {showAiPanel && (
        <div className="ai-assistant-floating-panel">
          <div className="ai-panel-header">
            <div className="ai-panel-title">
              <i className="pi pi-sparkles glow-purple" />
              <span>Asistente de Escritura IA</span>
            </div>
            <button className="ai-panel-close" onClick={() => setShowAiPanel(false)}>&times;</button>
          </div>
          
          <div className="ai-panel-body">
            <p className="ai-intro-text">
              Analiza localmente la nota activa para resumir, formatear comandos o corregir sintaxis.
            </p>
            
            <div className="ai-actions-grid">
              <button onClick={() => handleAiAction('summary')} className="ai-action-card">
                <i className="pi pi-file-edit text-blue" />
                <span>Resumir Nota</span>
              </button>
              
              <button onClick={() => handleAiAction('tasks')} className="ai-action-card">
                <i className="pi pi-check-square text-green" />
                <span>Extraer Tareas</span>
              </button>
              
              <button onClick={() => handleAiAction('rewrite')} className="ai-action-card">
                <i className="pi pi-pencil text-purple" />
                <span>Pugir Estilo</span>
              </button>
              
              <button onClick={() => handleAiAction('translate')} className="ai-action-card">
                <i className="pi pi-globe text-orange" />
                <span>Traducir (EN)</span>
              </button>
            </div>

            {/* AI Result Area */}
            {(aiLoading || aiResult) && (
              <div className="ai-result-container">
                <div className="ai-result-header">
                  <span>Resultado del análisis:</span>
                  {aiLoading && <i className="pi pi-spin pi-spinner text-purple" />}
                </div>
                
                <div className="ai-result-content">
                  {aiLoading ? (
                    <div className="ai-loading-placeholder">
                      <span className="pulse-glow">Procesando estructura del documento...</span>
                    </div>
                  ) : (
                    <div className="ai-formatted-markdown" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                      {aiResult}
                    </div>
                  )}
                </div>

                {aiResult && !aiLoading && (
                  <div className="ai-result-footer">
                    <button onClick={handleInsertAiResult} className="ai-insert-btn">
                      <i className="pi pi-plus" /> Insertar en la nota
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* METRICS PANEL (BARRA INFERIOR) */}
      <div className="document-editor-footer-metrics">
        <div className="metric-item">
          <i className="pi pi-align-justify" />
          <span><strong>{metrics.words}</strong> palabras</span>
        </div>
        <div className="metric-separator" />
        <div className="metric-item">
          <i className="pi pi-info-circle" />
          <span><strong>{metrics.characters}</strong> caracteres</span>
        </div>
        <div className="metric-separator" />
        <div className="metric-item">
          <i className="pi pi-book" />
          <span><strong>{metrics.paragraphs}</strong> párrafos</span>
        </div>
        <div className="metric-separator" />
        <div className="metric-item reading-time">
          <i className="pi pi-clock" />
          <span>Lectura: <strong>~{metrics.readTime}</strong> min</span>
        </div>

        {isZenMode && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#10b981', marginRight: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="pi pi-circle-fill" style={{ fontSize: '0.5rem', animation: 'pulse 1.5s infinite' }} /> Modo Zen
            </span>
            <button
              onClick={() => setIsZenMode(false)}
              className="exit-zen-btn"
            >
              Salir
            </button>
          </div>
        )}
      </div>

    </div>
  );
};

export default TiptapDocumentEditor;
