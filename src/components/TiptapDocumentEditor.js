import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
import { FaBold, FaItalic, FaUnderline } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import '../styles/components/documents.css';

const lowlight = createLowlight(common);
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

const TIPTAP_EXTENSIONS = [
  StarterKit.configure({
    codeBlock: false,
    link: false,
    underline: false,
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
];

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

const EditorToolbar = ({ editor }) => {
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.toolbar-template-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideClick, true);
    };
  }, []);

  if (!editor || editor.isDestroyed || !editor.schema) return null;

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

  const getActiveHeadingLabel = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Título 1';
    if (editor.isActive('heading', { level: 2 })) return 'Título 2';
    if (editor.isActive('heading', { level: 3 })) return 'Título 3';
    return 'Normal';
  };

  const getActiveAlignIcon = () => {
    if (editor.isActive({ textAlign: 'center' })) return 'pi pi-align-center';
    if (editor.isActive({ textAlign: 'right' })) return 'pi pi-align-right';
    return 'pi pi-align-left';
  };

  return (
    <div className="document-editor-toolbar-items">
      {/* Grupo 1: Formato básico */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
        >
          <FaBold size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
        >
          <FaItalic size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
        >
          <FaUnderline size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Tachado"
        >
          <i className="pi pi-minus" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Resaltar"
        >
          <i className="pi pi-sun" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 2: Títulos (Desplegable) */}
      <div className="toolbar-group">
        <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
          <button
            className="toolbar-dropdown-btn"
            title="Estilos de texto"
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'styles' ? null : 'styles')}
            style={{ display: 'flex', gap: '2px', width: '30px' }}
          >
            <i className="pi pi-text" style={{ fontSize: '0.75rem' }} />
            <i className="pi pi-chevron-down" style={{ fontSize: '0.55rem', opacity: 0.7 }} />
          </button>
          <div className={`template-dropdown-menu ${activeDropdown === 'styles' ? 'show' : ''}`} style={{ minWidth: '130px', left: 0 }}>
            <div onClick={() => { editor.chain().focus().setParagraph().run(); setActiveDropdown(null); }} className={!editor.isActive('heading') ? 'active-item' : ''}>Normal</div>
            <div onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 1 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 1</div>
            <div onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 2 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 2</div>
            <div onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 3 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 3</div>
          </div>
        </div>
      </div>

      <ToolbarSeparator />

      {/* Grupo 3: Listas */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista de viñetas"
        >
          <i className="pi pi-list" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista numerada"
        >
          <i className="pi pi-sort-numeric-up" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive('taskList')}
          title="Lista de tareas"
        >
          <i className="pi pi-check-square" style={{ fontSize: '0.75rem' }} />
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
          <i className="pi pi-comment" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Bloque de código"
        >
          <i className="pi pi-code" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Línea horizontal"
        >
          <i className="pi pi-minus" style={{ transform: 'scaleX(1.3)', fontSize: '0.75rem' }} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 5: Tablas y multimedia */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insertar tabla"
        >
          <i className="pi pi-table" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Insertar imagen">
          <i className="pi pi-image" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton onClick={addLink} isActive={editor.isActive('link')} title="Insertar enlace">
          <i className="pi pi-link" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Grupo 6: Alineación (Desplegable) */}
      <div className="toolbar-group">
        <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
          <button
            className="toolbar-dropdown-btn"
            title="Alineación"
            type="button"
            onClick={() => setActiveDropdown(activeDropdown === 'align' ? null : 'align')}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ui-content-text, #94a3b8)',
              cursor: 'pointer',
              padding: '0 4px',
              height: '26px',
              display: 'flex',
              alignItems: 'center',
              gap: '2px'
            }}
          >
            <i className={getActiveAlignIcon()} style={{ fontSize: '0.75rem' }} />
            <i className="pi pi-chevron-down" style={{ fontSize: '0.55rem', opacity: 0.7 }} />
          </button>
          <div className={`template-dropdown-menu ${activeDropdown === 'align' ? 'show' : ''}`} style={{ minWidth: '120px', left: 0 }}>
            <div onClick={() => { editor.chain().focus().setTextAlign('left').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' })) ? 'active-item' : ''}><i className="pi pi-align-left" style={{ marginRight: '6px' }} /> Izquierda</div>
            <div onClick={() => { editor.chain().focus().setTextAlign('center').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'center' }) ? 'active-item' : ''}><i className="pi pi-align-center" style={{ marginRight: '6px' }} /> Centro</div>
            <div onClick={() => { editor.chain().focus().setTextAlign('right').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'right' }) ? 'active-item' : ''}><i className="pi pi-align-right" style={{ marginRight: '6px' }} /> Derecha</div>
          </div>
        </div>
      </div>

      <ToolbarSeparator />

      {/* Grupo 7: Deshacer/Rehacer */}
      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Deshacer (Ctrl+Z)"
        >
          <i className="pi pi-undo" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Rehacer (Ctrl+Y)"
        >
          <i className="pi pi-replay" style={{ fontSize: '0.75rem' }} />
        </ToolbarButton>
      </div>
    </div>
  );
};

const sanitizeContent = (content) => {
  if (!content || typeof content !== 'string') return content || '';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="350" height="80" viewBox="0 0 350 80" style="background:#1e1e2f; border:1px dashed #4f46e5; border-radius:8px; font-family:system-ui,-apple-system,sans-serif;"><rect width="100%" height="100%" fill="none"/><text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" fill="#9ca3af" font-size="12" font-weight="600">📌 Recurso de Evernote</text><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-size="10">Imagen privada no disponible sin sesion</text></svg>`;
  const evernotePlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return content.replace(/en-cache:\/\/[^\s"'>\)]*/gi, evernotePlaceholder);
};

const TiptapDocumentEditor = ({ documentKey, documentData, onSave }) => {
  const [viewMode, setViewMode] = useState('wysiwyg');
  const [markdownSource, setMarkdownSource] = useState(sanitizeContent(documentData?.markdownSource || ''));
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const lastSavedContentRef = useRef(sanitizeContent(documentData?.content || ''));

  // Title & Icon Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentData?.label || 'Sin título');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const emojiPresets = [
    '📝', '📄', '📃', '📑', '📓', '📔',
    '📕', '📗', '📘', '📙', '📚', '🗒️',
    '✍️', '✏️', '✒️', '🖋️', '📌', '📎',
    '💡', '⚡', '📅', '🐞', '🔒', '🔑',
    '💻', '⚙️', '📂', '🏷️', '🎯', '🚀'
  ];

  useEffect(() => {
    const handleOutsideIconClick = (e) => {
      if (!e.target.closest('.document-icon-container')) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('click', handleOutsideIconClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideIconClick, true);
    };
  }, []);

  const handleSelectIcon = (emoji) => {
    setShowIconPicker(false);
    window.dispatchEvent(new CustomEvent('document-icon-updated', {
      detail: {
        key: documentKey,
        icon: emoji
      }
    }));
  };

  useEffect(() => {
    if (documentData?.label) {
      setTempTitle(documentData.label);
    }
  }, [documentData?.label]);

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== documentData?.label) {
      window.dispatchEvent(new CustomEvent('document-title-updated', {
        detail: {
          key: documentKey,
          label: trimmed
        }
      }));
    } else {
      setTempTitle(documentData?.label || 'Sin título');
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleBlur();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setTempTitle(documentData?.label || 'Sin título');
      setIsEditingTitle(false);
    }
  };

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

  // Dropdown States and handlers
  const [activeDropdown, setActiveDropdown] = useState(null); // 'templates' | 'more' | null

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.toolbar-template-dropdown')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleOutsideClick, true);
    return () => {
      document.removeEventListener('click', handleOutsideClick, true);
    };
  }, []);

  // Document Metrics State
  const [metrics, setMetrics] = useState({
    words: 0,
    characters: 0,
    paragraphs: 0,
    readTime: 0
  });

  // Calculate Metrics in real time
  const updateMetrics = (editorInstance) => {
    if (!editorInstance || editorInstance.isDestroyed || !editorInstance.schema) return;
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

  const editor = useEditor({
    extensions: TIPTAP_EXTENSIONS,
    content: sanitizeContent(documentData?.content || ''),
    onUpdate: ({ editor }) => {
      setSaveStatus('unsaved');
      updateMetrics(editor);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContent(editor);
      }, 2000);
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema) {
      updateMetrics(editor);
    }
  }, [editor]);

  const saveContent = useCallback((editorInstance) => {
    const ed = editorInstance || editor;
    if (!ed || ed.isDestroyed || !ed.schema) return;

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
      if (editor && !editor.isDestroyed && editor.schema) {
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
    if (editor && !editor.isDestroyed && editor.schema) {
      const html = editor.getHTML();
      const md = turndownService.turndown(html);
      setMarkdownSource(md);
    }
    setViewMode('markdown');
  }, [editor]);

  const switchToWysiwyg = useCallback(() => {
    if (editor && !editor.isDestroyed && editor.schema && markdownSource) {
      const html = marked(markdownSource);
      editor.commands.setContent(sanitizeContent(html));
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
    if (!editor || editor.isDestroyed || !editor.schema) return;
    
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
    if (!editor || editor.isDestroyed || !editor.schema) return;

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
    if (!editor || editor.isDestroyed || !editor.schema) return;
    
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
    if (!editor || editor.isDestroyed || !editor.schema || !aiResult) return;
    
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
    if (viewMode === 'wysiwyg' && editor && !editor.isDestroyed && editor.schema) {
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
    if (!editor || editor.isDestroyed || !editor.schema) return;
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
        if (editor && !editor.isDestroyed && editor.schema) {
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
    if (viewMode === 'wysiwyg' && editor && !editor.isDestroyed && editor.schema) {
      md = turndownService.turndown(editor.getHTML());
    }
    navigator.clipboard.writeText(md);
    if (window.toast?.current?.show) {
      window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: 'Nota copiada en formato Markdown', life: 1500 });
    }
  };

  const handleCopyHtml = () => {
    if (!editor || editor.isDestroyed || !editor.schema) return;
    navigator.clipboard.writeText(editor.getHTML());
    if (window.toast?.current?.show) {
      window.toast.current.show({ severity: 'success', summary: 'Copiado', detail: 'Código HTML copiado', life: 1500 });
    }
  };

  return (
    <div className={`document-editor-container ${isZenMode ? `zen-mode-active zen-theme-${zenTheme}` : ''}`}>
      
      {/* CABECERA PRINCIPAL UNIFICADA */}
      <div className="document-editor-header">
        <div className="document-editor-title-container" style={{ maxWidth: '280px' }}>
          <div className="document-editor-title">
            <div className="document-icon-container" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <span
                onClick={() => setShowIconPicker(!showIconPicker)}
                style={{
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '4px',
                  borderRadius: '6px',
                  marginRight: '4px',
                  width: '24px',
                  height: '24px',
                  transition: 'background 0.2s',
                  userSelect: 'none'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                title="Cambiar icono de nota"
              >
                {documentData?.icon && documentData.icon.length <= 4 ? documentData.icon : '📄'}
              </span>
              {showIconPicker && (
                <div
                  className="document-icon-picker-popover"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '8px',
                    background: 'rgba(30, 30, 38, 0.98)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(6, 1fr)',
                    gap: '6px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                    zIndex: 1000,
                    width: '190px',
                    boxSizing: 'border-box'
                  }}
                >
                  {emojiPresets.map(emoji => (
                    <button
                      key={emoji}
                      onClick={() => handleSelectIcon(emoji)}
                      type="button"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.1rem',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background 0.2s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => handleSelectIcon(null)}
                    type="button"
                    style={{
                      gridColumn: 'span 6',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: 'none',
                      color: 'var(--ui-content-text, #f1f5f9)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      padding: '5px 10px',
                      borderRadius: '5px',
                      marginTop: '4px',
                      transition: 'background 0.2s',
                      fontWeight: '600'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                  >
                    Restaurar por defecto
                  </button>
                </div>
              )}
            </div>
            {isEditingTitle ? (
              <input
                type="text"
                className="document-editor-title-input"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                style={{
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--ui-button-primary, #3b82f6)',
                  borderRadius: '4px',
                  color: 'var(--ui-content-text, #f1f5f9)',
                  fontFamily: 'inherit',
                  fontSize: '0.88rem',
                  fontWeight: '600',
                  padding: '2px 6px',
                  outline: 'none',
                  width: '180px',
                }}
              />
            ) : (
              <span
                className="title-text"
                onClick={() => setIsEditingTitle(true)}
                title="Haga clic para editar el título"
                style={{ cursor: 'pointer' }}
              >
                {documentData?.label || 'Sin título'}
              </span>
            )}
          </div>
          <div className={`document-editor-status-dot ${saveStatus}`} title={
            saveStatus === 'saved' ? 'Guardado' : saveStatus === 'saving' ? 'Guardando...' : 'Sin guardar'
          }>
            <span className="dot" />
          </div>
        </div>

        {/* Barra de Formato Central (Solo en Visual) */}
        {viewMode === 'wysiwyg' && (
          <div className="document-editor-toolbar-center">
            <EditorToolbar editor={editor} />
          </div>
        )}

        <div className="document-editor-actions-container">
          
          {/* Lector TTS Rate Slider (Solo se muestra cuando está hablando) */}
          {isPlayingSpeech && (
            <div className="tts-rate-control">
              <span className="tts-label">Velocidad:</span>
              <select
                value={speechRate}
                onChange={(e) => handleSpeechRateChange(parseFloat(e.target.value))}
                className="tts-select"
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
            <div className="zen-theme-selector">
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

          {/* Selector de Modo */}
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

          {/* Herramientas Premium */}
          <div className="header-premium-actions-group">
            {/* Plantillas Dropdown */}
            <div className="toolbar-template-dropdown">
              <button
                className="toolbar-premium-btn"
                title="Insertar Plantilla Técnica"
                type="button"
                onClick={() => setActiveDropdown(activeDropdown === 'templates' ? null : 'templates')}
                style={{ border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', background: 'rgba(16, 185, 129, 0.05)' }}
              >
                <i className="pi pi-clone" />
                <span className="premium-btn-text">Plantillas</span>
              </button>
              <div className={`template-dropdown-menu ${activeDropdown === 'templates' ? 'show' : ''}`}>
                <div onClick={() => { handleInsertTemplate(NOTE_TEMPLATES.meeting); setActiveDropdown(null); }}><i className="pi pi-calendar" /> Minuta de Reunión</div>
                <div onClick={() => { handleInsertTemplate(NOTE_TEMPLATES.bug); setActiveDropdown(null); }}><i className="pi pi-exclamation-triangle" /> Reporte de Bug (QA)</div>
                <div onClick={() => { handleInsertTemplate(NOTE_TEMPLATES.ssh); setActiveDropdown(null); }}><i className="pi pi-desktop" /> Bitácora SSH / Comandos</div>
                <div onClick={() => { handleInsertTemplate(NOTE_TEMPLATES.todo); setActiveDropdown(null); }}><i className="pi pi-list" /> Planificador de Objetivos</div>
              </div>
            </div>

            {/* AI Sparkles */}
            <button
              className="toolbar-premium-btn"
              onClick={() => setShowAiPanel(!showAiPanel)}
              title="Asistente de Escritura IA"
              type="button"
              style={{
                border: '1px solid rgba(156, 39, 176, 0.4)',
                color: '#c792ea',
                background: 'rgba(156, 39, 176, 0.05)',
                width: '30px',
                height: '28px',
                padding: 0,
                justifyContent: 'center'
              }}
            >
              <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><HiSparkles size={13} /></i>
            </button>

            {/* Modo Zen */}
            <button
              className={`toolbar-premium-btn ${isZenMode ? 'zen-active' : ''}`}
              onClick={() => setIsZenMode(!isZenMode)}
              title={isZenMode ? "Salir de Modo Zen" : "Modo Concentración Zen"}
              type="button"
              style={{
                border: isZenMode ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                color: isZenMode ? '#10b981' : 'var(--ui-content-text, #ccc)',
                background: isZenMode ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                width: '30px',
                height: '28px',
                padding: 0,
                justifyContent: 'center'
              }}
            >
              <i style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {isZenMode ? <FiMinimize2 size={13} /> : <FiMaximize2 size={13} />}
              </i>
            </button>
          </div>

          {/* Menú de Más Acciones (...) */}
          <div className="toolbar-template-dropdown">
            <button
              title="Más opciones..."
              type="button"
              className="toolbar-header-action-btn"
              onClick={() => setActiveDropdown(activeDropdown === 'more' ? null : 'more')}
              style={{ width: '30px', height: '28px' }}
            >
              <i className="pi pi-ellipsis-v" />
            </button>
            <div className={`template-dropdown-menu ${activeDropdown === 'more' ? 'show' : ''}`} style={{ right: 0, left: 'auto', minWidth: '200px' }}>
              <div onClick={() => { handleToggleSpeech(); setActiveDropdown(null); }}>
                <i className={isPlayingSpeech ? "pi pi-volume-off" : "pi pi-volume-up"} style={{ color: '#ff9800', marginRight: '6px' }} />
                <span>{isPlayingSpeech ? "Detener lector" : "Leer en voz alta (TTS)"}</span>
              </div>
              <div onClick={() => { handlePrint(); setActiveDropdown(null); }}>
                <i className="pi pi-print" style={{ color: '#64b5f6', marginRight: '6px' }} />
                <span>Imprimir / PDF</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
              <div onClick={() => { handleCopyMarkdown(); setActiveDropdown(null); }}>
                <i className="pi pi-copy" style={{ marginRight: '6px' }} />
                <span>Copiar Markdown</span>
              </div>
              <div onClick={() => { handleCopyHtml(); setActiveDropdown(null); }}>
                <i className="pi pi-code" style={{ marginRight: '6px' }} />
                <span>Copiar HTML</span>
              </div>
              <hr style={{ border: 'none', borderTop: '1px solid rgba(255, 255, 255, 0.08)', margin: '4px 0' }} />
              <div onClick={() => { handleImportMarkdown(); setActiveDropdown(null); }}>
                <i className="pi pi-upload" style={{ marginRight: '6px' }} />
                <span>Importar Markdown</span>
              </div>
              <div onClick={() => { handleExportMarkdown(); setActiveDropdown(null); }}>
                <i className="pi pi-download" style={{ marginRight: '6px' }} />
                <span>Exportar Markdown (.md)</span>
              </div>
              <div onClick={() => { handleExportHtml(); setActiveDropdown(null); }}>
                <i className="pi pi-file" style={{ marginRight: '6px' }} />
                <span>Exportar Web HTML (.html)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* CUERPO DEL EDITOR */}
      {viewMode === 'wysiwyg' ? (
        <div className="document-editor-content">
          <EditorContent editor={editor} />
        </div>
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
              <i className="glow-purple" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <HiSparkles size={15} />
              </i>
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
