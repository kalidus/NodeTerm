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
import Bold from '@tiptap/extension-bold';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { mergeAttributes } from '@tiptap/core';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { ContextMenu } from 'primereact/contextmenu';
import { common, createLowlight } from 'lowlight';
import TurndownService from 'turndown';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { FaBold, FaItalic, FaUnderline } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import '../styles/components/documents.css';
import { appConfirm } from './ui/AppConfirm';
import { appPrompt } from './ui/AppPrompt';
import NoteFindBar from './notes/NoteFindBar';
import NoteOutlinePanel from './notes/NoteOutlinePanel';
import NoteTagsBar from './notes/NoteTagsBar';
import NoteBubbleMenu from './notes/NoteBubbleMenu';
import NoteSearchHighlight, { collectSearchMatches } from '../extensions/NoteSearchHighlight';
import connectionStore from '../utils/connectionStore';

/** Bold con toDOM clásico + clase visible (el JSX de TipTap 3 a veces no pinta en Electron). */
const NoteBold = Bold.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {
        class: 'note-mark-bold'
      }
    };
  },
  renderHTML({ HTMLAttributes }) {
    // Sin style inline: evita choques al anidar italic/underline
    return [
      'strong',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'note-mark-bold'
      }),
      0
    ];
  }
});

const lowlight = createLowlight(common);
const turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
const TEXT_COLORS = ['#e2e8f0', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'];

function writeClipboardText(text) {
  if (text == null) return Promise.resolve();
  const value = String(text);
  if (window.electron?.clipboard?.writeText) {
    return window.electron.clipboard.writeText(value).catch(() => {
      try { navigator.clipboard.writeText(value); } catch { /* ignore */ }
    });
  }
  try {
    return navigator.clipboard.writeText(value);
  } catch {
    return Promise.resolve();
  }
}

function readClipboardText() {
  if (window.electron?.clipboard?.readText) {
    return window.electron.clipboard.readText()
      .then((res) => (typeof res === 'string' ? res : (res?.text || '')))
      .catch(() => '');
  }
  try {
    return navigator.clipboard.readText().catch(() => '');
  } catch {
    return Promise.resolve('');
  }
}

/** Aplica/quita una mark sin tocar las demás (bold+italic pueden coexistir). */
function toggleSchemaMark(editor, markName) {
  if (!editor || editor.isDestroyed || !editor.view) return false;
  const markType = editor.state.schema.marks[markName];
  if (!markType) {
    console.error(`[NotesEditor] schema sin mark ${markName}`);
    return false;
  }

  const { state, view } = editor;
  const { from, to, empty } = state.selection;
  const mark = markType.create();
  let tr = state.tr;

  if (empty) {
    const stored = state.storedMarks || state.selection.$from.marks();
    if (markType.isInSet(stored)) {
      tr = tr.removeStoredMark(markType);
    } else {
      tr = tr.addStoredMark(mark);
    }
  } else if (editor.isActive(markName)) {
    tr = tr.removeMark(from, to, markType);
  } else {
    tr = tr.addMark(from, to, mark);
  }

  view.dispatch(tr.scrollIntoView());
  return true;
}

function toggleBoldMark(editor) {
  return toggleSchemaMark(editor, 'bold');
}

/** Restaura un rango y aplica un comando TipTap (focus + selección + acción). */
function runOnEditorRange(editor, from, to, commandName) {
  if (!editor || editor.isDestroyed || !editor.view) return false;
  try {
    const dom = editor.view.dom;
    if (dom && typeof dom.focus === 'function') {
      dom.focus({ preventScroll: true });
    }

    const docSize = editor.state.doc.content.size;
    let a = Math.max(0, Math.min(from ?? 0, docSize));
    let b = Math.max(0, Math.min(to ?? 0, docSize));
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }

    if (commandName === 'selectAll') {
      return editor.chain().focus().selectAll().run();
    }

    if (a !== b) {
      editor.commands.setTextSelection({ from: a, to: b });
    }

    if (typeof commandName === 'string') {
      if (commandName === 'bold') return toggleSchemaMark(editor, 'bold');
      if (commandName === 'italic') return toggleSchemaMark(editor, 'italic');
      if (commandName === 'underline') return toggleSchemaMark(editor, 'underline');
      if (commandName === 'strike') return toggleSchemaMark(editor, 'strike');
      if (commandName === 'highlight') {
        let chain = editor.chain().focus();
        if (a !== b) chain = chain.setTextSelection({ from: a, to: b });
        return chain.toggleHighlight().run();
      }
      if (commandName === 'delete') {
        let chain = editor.chain().focus();
        if (a !== b) chain = chain.setTextSelection({ from: a, to: b });
        return chain.deleteSelection().run();
      }
      return false;
    }

    let chain = editor.chain().focus();
    if (a !== b) chain = chain.setTextSelection({ from: a, to: b });
    if (typeof commandName === 'function') {
      commandName(editor, chain);
      return true;
    }
    return chain.run();
  } catch (err) {
    console.error('[NotesEditor] runOnEditorRange:', err);
    return false;
  }
}

function extractHeadingsFromEditor(editorInstance) {
  if (!editorInstance || editorInstance.isDestroyed) return [];
  const headings = [];
  editorInstance.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level <= 3) {
      headings.push({
        level: node.attrs.level,
        text: node.textContent || '',
        pos
      });
    }
  });
  return headings;
}

/** Nueva instancia de extensiones por editor (nunca reutilizar singletons entre pestañas). */
function createNoteEditorExtensions() {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: false,
      underline: false,
      bold: false,
    }),
    NoteBold.configure({}),
    Placeholder.configure({
      placeholder: 'Empieza a escribir tu nota... (Presiona el botón de Plantillas para empezar rápido)',
    }),
    Underline.configure({}),
    Highlight.configure({ multicolor: false }),
    TextStyle.configure({}),
    Color.configure({}),
    Link.configure({ openOnClick: false, autolink: true }),
    Image.configure({ allowBase64: true }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Table.configure({ resizable: true }),
    TableRow.configure({}),
    TableCell.configure({}),
    TableHeader.configure({}),
    TaskList.configure({}),
    TaskItem.configure({ nested: true }),
    CodeBlockLowlight.configure({ lowlight }),
    NoteSearchHighlight.configure({}),
  ];
}

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
    type="button"
    className={isActive ? 'is-active' : ''}
    disabled={disabled}
    title={title}
    onMouseDown={(e) => {
      // Evita perder la selección Y ejecuta aquí (en Electron el click a veces no llega tras preventDefault)
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      if (typeof onClick === 'function') onClick(e);
    }}
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

  const addImage = async () => {
    const url = await appPrompt({
      header: 'Insertar imagen',
      message: 'URL de la imagen:',
      defaultValue: 'https://',
      placeholder: 'https://...'
    });
    if (url) editor.chain().focus().setImage({ src: url.trim() }).run();
  };

  const addLink = async () => {
    const prev = editor.getAttributes('link').href || 'https://';
    const url = await appPrompt({
      header: 'Insertar enlace',
      message: 'URL del enlace (vacío para quitar):',
      defaultValue: prev,
      placeholder: 'https://...'
    });
    if (url === null) return;
    if (url.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
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
          onClick={() => {
            try {
              editor.view?.dom?.focus?.({ preventScroll: true });
              toggleBoldMark(editor);
            } catch (err) {
              console.error('[NotesEditor] bold:', err);
            }
          }}
          isActive={editor.isActive('bold')}
          title="Negrita (Ctrl+B)"
        >
          <FaBold size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            editor.view?.dom?.focus?.({ preventScroll: true });
            toggleSchemaMark(editor, 'italic');
          }}
          isActive={editor.isActive('italic')}
          title="Cursiva (Ctrl+I)"
        >
          <FaItalic size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            editor.view?.dom?.focus?.({ preventScroll: true });
            toggleSchemaMark(editor, 'underline');
          }}
          isActive={editor.isActive('underline')}
          title="Subrayado (Ctrl+U)"
        >
          <FaUnderline size={11} />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => {
            editor.view?.dom?.focus?.({ preventScroll: true });
            toggleSchemaMark(editor, 'strike');
          }}
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
        <div className="toolbar-template-dropdown" style={{ position: 'relative' }}>
          <button
            className="toolbar-dropdown-btn"
            title="Color de texto"
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveDropdown(activeDropdown === 'color' ? null : 'color')}
            style={{ display: 'flex', gap: '2px', width: '28px', alignItems: 'center', justifyContent: 'center' }}
          >
            <i className="pi pi-palette" style={{ fontSize: '0.75rem', color: editor.getAttributes('textStyle').color || undefined }} />
          </button>
          <div
            className={`template-dropdown-menu note-color-palette ${activeDropdown === 'color' ? 'show' : ''}`}
            style={{ minWidth: '148px', left: 0 }}
          >
            {TEXT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => {
                  e.preventDefault();
                  editor.chain().focus().setColor(c).run();
                  setActiveDropdown(null);
                }}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 4,
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: c,
                  cursor: 'pointer',
                  padding: 0
                }}
              />
            ))}
            <button
              type="button"
              className="note-find-action"
              style={{ width: '100%', marginTop: 4 }}
              onMouseDown={(e) => {
                e.preventDefault();
                editor.chain().focus().unsetColor().run();
                setActiveDropdown(null);
              }}
            >
              Quitar color
            </button>
          </div>
        </div>
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
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setParagraph().run(); setActiveDropdown(null); }} className={!editor.isActive('heading') ? 'active-item' : ''}>Normal</div>
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 1 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 1 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 1</div>
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 2 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 2</div>
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); setActiveDropdown(null); }} className={editor.isActive('heading', { level: 3 }) ? 'active-item' : ''} style={{ fontWeight: 'bold' }}>Título 3</div>
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
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('left').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'left' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' })) ? 'active-item' : ''}><i className="pi pi-align-left" style={{ marginRight: '6px' }} /> Izquierda</div>
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('center').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'center' }) ? 'active-item' : ''}><i className="pi pi-align-center" style={{ marginRight: '6px' }} /> Centro</div>
            <div onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().setTextAlign('right').run(); setActiveDropdown(null); }} className={editor.isActive({ textAlign: 'right' }) ? 'active-item' : ''}><i className="pi pi-align-right" style={{ marginRight: '6px' }} /> Derecha</div>
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

const NOTE_HTML_SANITIZE = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target']
};

const sanitizeContent = (content) => {
  if (!content || typeof content !== 'string') return content || '';
  // Placeholder neutro (sin borde morado) para recursos Evernote inaccesibles
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="56" viewBox="0 0 280 56"><rect width="100%" height="100%" rx="6" fill="#1a1f2a" stroke="#334155" stroke-dasharray="4 3"/><text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="11" font-family="system-ui,sans-serif">Imagen no disponible</text></svg>`;
  const evernotePlaceholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const replaced = content
    .replace(/en-cache:\/\/[^\s"'>\)]*/gi, evernotePlaceholder)
    // Sustituye placeholders antiguos con borde índigo / texto Evernote ya incrustados
    .replace(/data:image\/svg\+xml;charset=utf-8,[^"'>\s]*Recurso%20de%20Evernote[^"'>\s]*/gi, evernotePlaceholder)
    .replace(/data:image\/svg\+xml;charset=utf-8,[^"'>\s]*4f46e5[^"'>\s]*/gi, evernotePlaceholder);
  return DOMPurify.sanitize(replaced, NOTE_HTML_SANITIZE);
};

/** Convierte markdown a HTML sanitizado antes de insertar en el editor / persistir. */
const markedToSafeHtml = (markdown) => {
  const raw = marked(markdown || '');
  return DOMPurify.sanitize(typeof raw === 'string' ? raw : String(raw), NOTE_HTML_SANITIZE);
};

const TiptapDocumentEditor = ({ documentKey, documentData, onSave }) => {
  const [viewMode, setViewMode] = useState('wysiwyg');
  const [markdownSource, setMarkdownSource] = useState(sanitizeContent(documentData?.markdownSource || ''));
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const lastSavedContentRef = useRef(
    `${sanitizeContent(documentData?.content || '')}::${JSON.stringify(
      Array.isArray(documentData?.tags) ? documentData.tags : []
    )}`
  );
  const markdownTextareaRef = useRef(null);
  const editorRef = useRef(null);
  const saveContentRef = useRef(() => {});

  // Title & Icon Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(documentData?.label || 'Sin título');
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Find / outline / tags / context menu
  const editorContextMenuRef = useRef(null);
  const [editorContextItems, setEditorContextItems] = useState([]);
  const [findVisible, setFindVisible] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [findReplaceText, setFindReplaceText] = useState('');
  const [findMatches, setFindMatches] = useState([]);
  const [findIndex, setFindIndex] = useState(0);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [headings, setHeadings] = useState([]);
  const [noteTags, setNoteTags] = useState(() =>
    Array.isArray(documentData?.tags) ? [...documentData.tags] : []
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const noteTagsRef = useRef(noteTags);
  noteTagsRef.current = noteTags;

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

  const scheduleMarkdownSave = useCallback((val) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = markedToSafeHtml(val);
      const tags = noteTagsRef.current || [];
      lastSavedContentRef.current = `${html}::${JSON.stringify(tags)}`;
      setSaveStatus('saving');
      window.dispatchEvent(new CustomEvent('document-content-updated', {
        detail: {
          key: documentKey,
          content: html,
          markdownSource: val,
          tags
        }
      }));
      if (onSave) {
        onSave({ content: html, markdownSource: val, tags });
      }
      setTimeout(() => setSaveStatus('saved'), 300);
    }, 800);
  }, [documentKey, onSave]);

  // Última selección no vacía (sobrevive al blur del clic derecho / toolbar)
  const savedSelectionRef = useRef({ from: 0, to: 0, text: '', mdStart: 0, mdEnd: 0 });

  const rememberSelection = useCallback((from, to, text, mdStart = 0, mdEnd = 0) => {
    if (from === to && !(text && text.length)) return;
    savedSelectionRef.current = { from, to, text: text || '', mdStart, mdEnd };
  }, []);

  const captureWysiwygSelection = useCallback((view) => {
    if (!view) return;
    const { from, to } = view.state.selection;
    const text = view.state.doc.textBetween(from, to, '\n');
    rememberSelection(from, to, text);
  }, [rememberSelection]);

  const openEditorContextMenu = useCallback((event, mode) => {
    event.preventDefault();
    event.stopPropagation();

    const ed = editorRef.current;
    let selFrom = 0;
    let selTo = 0;
    let mdSelStart = 0;
    let mdSelEnd = 0;
    let selectedText = '';

    if (mode === 'wysiwyg' && ed && !ed.isDestroyed) {
      captureWysiwygSelection(ed.view);
      const saved = savedSelectionRef.current;
      const curFrom = ed.state.selection.from;
      const curTo = ed.state.selection.to;
      const curText = ed.state.doc.textBetween(curFrom, curTo, '\n');

      if (curText && curFrom !== curTo) {
        selFrom = curFrom;
        selTo = curTo;
        selectedText = curText;
      } else if (saved.text && saved.from !== saved.to) {
        selFrom = saved.from;
        selTo = saved.to;
        selectedText = saved.text;
      } else {
        const domText = window.getSelection?.()?.toString?.() || '';
        if (domText) {
          selectedText = domText;
          selFrom = saved.from || curFrom;
          selTo = saved.to || curTo;
        }
      }
    } else {
      const ta = markdownTextareaRef.current;
      if (ta) {
        mdSelStart = ta.selectionStart;
        mdSelEnd = ta.selectionEnd;
        selectedText = ta.value.substring(mdSelStart, mdSelEnd);
        if (!selectedText && savedSelectionRef.current.text) {
          selectedText = savedSelectionRef.current.text;
          mdSelStart = savedSelectionRef.current.mdStart;
          mdSelEnd = savedSelectionRef.current.mdEnd;
        }
      }
    }

    const items = [
      {
        label: 'Cortar',
        icon: 'pi pi-scissors',
        shortcut: 'Ctrl+X',
        command: () => {
          const s = savedSelectionRef.current;
          const text = s.text || selectedText;
          if (!text) return;
          writeClipboardText(text);
          if (mode === 'wysiwyg') {
            runOnEditorRange(editorRef.current, s.from || selFrom, s.to || selTo, 'delete');
          } else {
            const ta = markdownTextareaRef.current;
            if (!ta) return;
            const start = s.mdStart || mdSelStart;
            const end = s.mdEnd || mdSelEnd;
            const next = ta.value.slice(0, start) + ta.value.slice(end);
            setMarkdownSource(next);
            setSaveStatus('unsaved');
            scheduleMarkdownSave(next);
          }
        }
      },
      {
        label: 'Copiar',
        icon: 'pi pi-copy',
        shortcut: 'Ctrl+C',
        command: () => {
          const text = savedSelectionRef.current.text || selectedText;
          if (!text) return;
          writeClipboardText(text);
        }
      },
      {
        label: 'Pegar',
        icon: 'pi pi-clone',
        shortcut: 'Ctrl+V',
        command: () => {
          readClipboardText().then((text) => {
            if (!text) return;
            const s = savedSelectionRef.current;
            if (mode === 'wysiwyg') {
              runOnEditorRange(editorRef.current, s.from || selFrom, s.to || selTo, (editor, chain) => {
                chain.insertContent(text).run();
              });
            } else {
              const ta = markdownTextareaRef.current;
              if (!ta) return;
              const start = s.mdStart || mdSelStart;
              const end = s.mdEnd || mdSelEnd;
              const next = ta.value.slice(0, start) + text + ta.value.slice(end);
              setMarkdownSource(next);
              setSaveStatus('unsaved');
              scheduleMarkdownSave(next);
            }
          });
        }
      },
      {
        label: 'Seleccionar todo',
        icon: 'pi pi-stop',
        shortcut: 'Ctrl+A',
        command: () => {
          if (mode === 'wysiwyg') {
            const ok = runOnEditorRange(editorRef.current, 0, 0, 'selectAll');
            if (!ok && editorRef.current) {
              const ed = editorRef.current;
              ed.view.dom.focus();
              ed.commands.setTextSelection({ from: 0, to: ed.state.doc.content.size });
            }
          } else {
            markdownTextareaRef.current?.focus();
            markdownTextareaRef.current?.select();
          }
        }
      }
    ];

    if (mode === 'wysiwyg') {
      items.push(
        { separator: true },
        {
          label: 'Negrita',
          icon: 'pi pi-minus',
          command: () => {
            const s = savedSelectionRef.current;
            const from = s.from || selFrom;
            const to = s.to || selTo;
            runOnEditorRange(editorRef.current, from, to, 'bold');
          }
        },
        {
          label: 'Cursiva',
          icon: 'pi pi-info-circle',
          command: () => {
            const s = savedSelectionRef.current;
            runOnEditorRange(editorRef.current, s.from || selFrom, s.to || selTo, 'italic');
          }
        },
        {
          label: 'Subrayado',
          icon: 'pi pi-underline',
          command: () => {
            const s = savedSelectionRef.current;
            runOnEditorRange(editorRef.current, s.from || selFrom, s.to || selTo, 'underline');
          }
        },
        {
          label: 'Resaltar',
          icon: 'pi pi-sun',
          command: () => {
            const s = savedSelectionRef.current;
            runOnEditorRange(editorRef.current, s.from || selFrom, s.to || selTo, 'highlight');
          }
        },
        {
          label: 'Enlace',
          icon: 'pi pi-link',
          command: async () => {
            const s = savedSelectionRef.current;
            const from = s.from || selFrom;
            const to = s.to || selTo;
            const current = editorRef.current;
            if (!current || current.isDestroyed) return;
            runOnEditorRange(current, from, to, (editor, chain) => {
              chain.run();
            });
            const ed = editorRef.current;
            if (!ed || ed.isDestroyed) return;
            const prev = ed.getAttributes('link').href || 'https://';
            const url = await appPrompt({
              header: 'Insertar enlace',
              message: 'URL del enlace (vacío para quitar):',
              defaultValue: prev,
              placeholder: 'https://...'
            });
            if (url === null) return;
            if (url.trim() === '') {
              ed.chain().focus().extendMarkRange('link').unsetLink().run();
              return;
            }
            runOnEditorRange(ed, from, to, (editor) => {
              editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
            });
          }
        },
        { separator: true },
        {
          label: 'Copiar como Markdown',
          icon: 'pi pi-file',
          command: () => {
            const current = editorRef.current;
            if (!current || current.isDestroyed) return;
            writeClipboardText(turndownService.turndown(current.getHTML()));
          }
        },
        {
          label: 'Buscar...',
          icon: 'pi pi-search',
          shortcut: 'Ctrl+F',
          command: () => {
            setFindVisible(true);
            setFindReplaceMode(false);
          }
        }
      );
    } else {
      items.push(
        { separator: true },
        {
          label: 'Buscar...',
          icon: 'pi pi-search',
          shortcut: 'Ctrl+F',
          command: () => {
            setFindVisible(true);
            setFindReplaceMode(false);
          }
        }
      );
    }

    setEditorContextItems(items);
    // Misma API PrimeReact que el árbol de documentos (fiable en Electron)
    requestAnimationFrame(() => {
      editorContextMenuRef.current?.show(event);
    });
  }, [scheduleMarkdownSave, captureWysiwygSelection]);

  const openEditorContextMenuRef = useRef(openEditorContextMenu);
  openEditorContextMenuRef.current = openEditorContextMenu;
  const captureWysiwygSelectionRef = useRef(captureWysiwygSelection);
  captureWysiwygSelectionRef.current = captureWysiwygSelection;

  const editor = useEditor({
    // React 19 / Electron: evita warnings y estados a medias al montar
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: createNoteEditorExtensions(),
    content: sanitizeContent(documentData?.content || ''),
    editable: true,
    editorProps: {
      attributes: {
        class: 'tiptap tiptap-note-editor ProseMirror',
        spellcheck: 'false'
      },
      handleDOMEvents: {
        mousedown: (view, event) => {
          if (event.button === 2) {
            captureWysiwygSelectionRef.current(view);
          }
          return false;
        },
        contextmenu: (_view, event) => {
          openEditorContextMenuRef.current(event, 'wysiwyg');
          return true;
        }
      }
    },
    onUpdate: ({ editor: ed }) => {
      setSaveStatus('unsaved');
      updateMetrics(ed);
      setHeadings(extractHeadingsFromEditor(ed));
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContentRef.current(ed);
      }, 2000);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      try {
        const { from, to } = ed.state.selection;
        if (from === to) return;
        const text = ed.state.doc.textBetween(from, to, '\n');
        if (text) {
          savedSelectionRef.current = { from, to, text, mdStart: 0, mdEnd: 0 };
        }
      } catch { /* ignore */ }
    }
  });

  editorRef.current = editor;

  useEffect(() => {
    if (editor && !editor.isDestroyed && editor.schema) {
      updateMetrics(editor);
      setHeadings(extractHeadingsFromEditor(editor));
    }
  }, [editor]);

  useEffect(() => {
    setNoteTags(Array.isArray(documentData?.tags) ? [...documentData.tags] : []);
  }, [documentKey, documentData?.tags]);

  useEffect(() => {
    const noteConnection = {
      id: documentKey,
      type: documentData?.type || 'document',
      name: documentData?.label || tempTitle,
      ...(documentData || {})
    };
    setIsFavorite(connectionStore.isFavorite(noteConnection));
  }, [documentKey, documentData, tempTitle]);

  const saveContent = useCallback((editorInstance) => {
    const ed = editorInstance || editor;
    if (!ed || ed.isDestroyed || !ed.schema) return;

    const html = ed.getHTML();
    const tags = noteTagsRef.current || [];
    const contentKey = `${html}::${JSON.stringify(tags)}`;
    if (contentKey === lastSavedContentRef.current) {
      setSaveStatus('saved');
      return;
    }

    setSaveStatus('saving');
    const md = turndownService.turndown(html);

    lastSavedContentRef.current = contentKey;

    window.dispatchEvent(new CustomEvent('document-content-updated', {
      detail: {
        key: documentKey,
        content: html,
        markdownSource: md,
        tags
      }
    }));

    if (onSave) {
      onSave({ content: html, markdownSource: md, tags });
    }

    setTimeout(() => setSaveStatus('saved'), 300);
  }, [editor, documentKey, onSave]);

  saveContentRef.current = saveContent;

  const persistTags = useCallback((nextTags) => {
    setNoteTags(nextTags);
    noteTagsRef.current = nextTags;
    setSaveStatus('unsaved');
    const ed = editorRef.current;
    if (ed && !ed.isDestroyed) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => saveContent(ed), 400);
    } else {
      window.dispatchEvent(new CustomEvent('document-content-updated', {
        detail: {
          key: documentKey,
          content: documentData?.content || '',
          markdownSource: markdownSource || documentData?.markdownSource || '',
          tags: nextTags
        }
      }));
      setTimeout(() => setSaveStatus('saved'), 300);
    }
  }, [documentKey, documentData, markdownSource, saveContent]);

  // Save on blur / before unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (editor && !editor.isDestroyed && editor.schema) {
        const html = editor.getHTML();
        const tags = noteTagsRef.current || [];
        const contentKey = `${html}::${JSON.stringify(tags)}`;
        if (contentKey !== lastSavedContentRef.current) {
          const md = turndownService.turndown(html);
          window.dispatchEvent(new CustomEvent('document-content-updated', {
            detail: { key: documentKey, content: html, markdownSource: md, tags }
          }));
        }
      }
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, [editor, documentKey]);

  const collectMarkdownMatches = useCallback((source, query) => {
    if (!query) return [];
    const matches = [];
    const lower = source.toLowerCase();
    const q = query.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(q, from);
      if (idx === -1) break;
      matches.push({ from: idx, to: idx + query.length });
      from = idx + Math.max(query.length, 1);
    }
    return matches;
  }, []);

  const applyFindHighlight = useCallback((query, index, matches) => {
    const ed = editorRef.current;
    if (viewMode === 'wysiwyg' && ed && !ed.isDestroyed) {
      ed.commands.setSearchHighlight(query, index);
      const match = matches[index];
      if (match) {
        ed.chain().focus().setTextSelection({ from: match.from, to: match.to }).run();
        const dom = ed.view.domAtPos(match.from);
        const el = dom?.node?.nodeType === 1 ? dom.node : dom?.node?.parentElement;
        el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      }
    } else if (viewMode === 'markdown') {
      const ta = markdownTextareaRef.current;
      const match = matches[index];
      if (ta && match) {
        ta.focus();
        ta.setSelectionRange(match.from, match.to);
      }
    }
  }, [viewMode]);

  const runFind = useCallback((query, preferredIndex = 0) => {
    const q = query || '';
    let matches = [];
    if (viewMode === 'wysiwyg') {
      const ed = editorRef.current;
      if (ed && !ed.isDestroyed) {
        matches = collectSearchMatches(ed.state.doc, q);
      }
    } else {
      matches = collectMarkdownMatches(markdownSource, q);
    }
    const idx = matches.length ? Math.min(Math.max(preferredIndex, 0), matches.length - 1) : 0;
    setFindMatches(matches);
    setFindIndex(idx);
    if (viewMode === 'wysiwyg') {
      const ed = editorRef.current;
      if (ed && !ed.isDestroyed) {
        ed.commands.setSearchHighlight(q, idx);
      }
    }
    if (matches.length) {
      applyFindHighlight(q, idx, matches);
    }
    return { matches, idx };
  }, [viewMode, markdownSource, collectMarkdownMatches, applyFindHighlight]);

  const handleFindQueryChange = useCallback((q) => {
    setFindQuery(q);
    runFind(q, 0);
  }, [runFind]);

  const handleFindNext = useCallback(() => {
    if (!findMatches.length) {
      runFind(findQuery, 0);
      return;
    }
    const next = (findIndex + 1) % findMatches.length;
    setFindIndex(next);
    applyFindHighlight(findQuery, next, findMatches);
    if (viewMode === 'wysiwyg') {
      editorRef.current?.commands.setSearchHighlight(findQuery, next);
    }
  }, [findMatches, findIndex, findQuery, applyFindHighlight, runFind, viewMode]);

  const handleFindPrev = useCallback(() => {
    if (!findMatches.length) {
      runFind(findQuery, 0);
      return;
    }
    const prev = (findIndex - 1 + findMatches.length) % findMatches.length;
    setFindIndex(prev);
    applyFindHighlight(findQuery, prev, findMatches);
    if (viewMode === 'wysiwyg') {
      editorRef.current?.commands.setSearchHighlight(findQuery, prev);
    }
  }, [findMatches, findIndex, findQuery, applyFindHighlight, runFind, viewMode]);

  const handleFindClose = useCallback(() => {
    setFindVisible(false);
    setFindReplaceMode(false);
    editorRef.current?.commands.clearSearchHighlight();
  }, []);

  const handleReplaceOne = useCallback(() => {
    if (!findQuery || !findMatches.length) return;
    if (viewMode === 'wysiwyg') {
      const ed = editorRef.current;
      const match = findMatches[findIndex];
      if (!ed || !match) return;
      ed.chain()
        .focus()
        .setTextSelection({ from: match.from, to: match.to })
        .insertContent(findReplaceText)
        .run();
      requestAnimationFrame(() => runFind(findQuery, findIndex));
    } else {
      const match = findMatches[findIndex];
      if (!match) return;
      const next =
        markdownSource.slice(0, match.from) + findReplaceText + markdownSource.slice(match.to);
      setMarkdownSource(next);
      setSaveStatus('unsaved');
      scheduleMarkdownSave(next);
      requestAnimationFrame(() => {
        const matches = collectMarkdownMatches(next, findQuery);
        setFindMatches(matches);
        const idx = Math.min(findIndex, Math.max(matches.length - 1, 0));
        setFindIndex(idx);
        const ta = markdownTextareaRef.current;
        if (ta && matches[idx]) {
          ta.setSelectionRange(matches[idx].from, matches[idx].to);
        }
      });
    }
  }, [
    findQuery,
    findMatches,
    findIndex,
    findReplaceText,
    viewMode,
    markdownSource,
    runFind,
    collectMarkdownMatches,
    scheduleMarkdownSave
  ]);

  const handleReplaceAll = useCallback(() => {
    if (!findQuery) return;
    if (viewMode === 'wysiwyg') {
      const ed = editorRef.current;
      if (!ed || ed.isDestroyed) return;
      const matches = collectSearchMatches(ed.state.doc, findQuery);
      if (!matches.length) return;
      let tr = ed.state.tr;
      for (let i = matches.length - 1; i >= 0; i -= 1) {
        const m = matches[i];
        tr = tr.insertText(findReplaceText, m.from, m.to);
      }
      ed.view.dispatch(tr);
      runFind(findQuery, 0);
    } else {
      if (!findQuery) return;
      const escaped = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const next = markdownSource.replace(new RegExp(escaped, 'gi'), findReplaceText);
      setMarkdownSource(next);
      setSaveStatus('unsaved');
      scheduleMarkdownSave(next);
      const matches = collectMarkdownMatches(next, findQuery);
      setFindMatches(matches);
      setFindIndex(0);
    }
  }, [findQuery, findReplaceText, viewMode, markdownSource, runFind, collectMarkdownMatches, scheduleMarkdownSave]);

  useEffect(() => {
    const onKeyDown = (e) => {
      const isMod = e.ctrlKey || e.metaKey;
      if (isMod && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setFindVisible(true);
        setFindReplaceMode(false);
        return;
      }
      if (isMod && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setFindVisible(true);
        setFindReplaceMode(true);
        return;
      }
      if (e.key === 'F3') {
        e.preventDefault();
        if (!findVisible) setFindVisible(true);
        if (e.shiftKey) handleFindPrev();
        else handleFindNext();
        return;
      }
      if (e.key === 'Escape' && findVisible) {
        e.preventDefault();
        handleFindClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [findVisible, handleFindNext, handleFindPrev, handleFindClose]);

  const switchToMarkdown = useCallback(() => {
    if (editor && !editor.isDestroyed && editor.schema) {
      const html = editor.getHTML();
      const md = turndownService.turndown(html);
      setMarkdownSource(md);
    }
    setViewMode('markdown');
    editor?.commands.clearSearchHighlight();
  }, [editor]);

  const switchToWysiwyg = useCallback(() => {
    if (editor && !editor.isDestroyed && editor.schema && markdownSource) {
      const html = markedToSafeHtml(markdownSource);
      editor.commands.setContent(html);
      updateMetrics(editor);
      setHeadings(extractHeadingsFromEditor(editor));
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
      const html = markedToSafeHtml(val);
      const tags = noteTagsRef.current || [];
      lastSavedContentRef.current = `${html}::${JSON.stringify(tags)}`;
      setSaveStatus('saving');

      window.dispatchEvent(new CustomEvent('document-content-updated', {
        detail: {
          key: documentKey,
          content: html,
          markdownSource: val,
          tags
        }
      }));

      if (onSave) {
        onSave({ content: html, markdownSource: val, tags });
      }
      setTimeout(() => setSaveStatus('saved'), 300);
    }, 2000);
  };

  // Note templates insertion handler
  const handleInsertTemplate = async (templateHtml) => {
    if (!editor || editor.isDestroyed || !editor.schema) return;
    
    const confirmText = '¿Estás seguro de insertar la plantilla? Esto reemplazará el contenido actual de tu nota.';
    if (editor.getText().trim().length > 0) {
      const ok = await appConfirm({
        message: confirmText,
        header: 'Confirmar',
        severity: 'warn',
        acceptLabel: 'Aceptar',
        rejectLabel: 'Cancelar'
      });
      if (!ok) return;
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
    
    // Convert markdown response to HTML using marked + DOMPurify
    const formattedHtml = markedToSafeHtml(aiResult);
    
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
        const html = markedToSafeHtml(text);
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

            {/* Outline */}
            <button
              className={`toolbar-premium-btn ${outlineOpen ? 'zen-active' : ''}`}
              onClick={() => setOutlineOpen((v) => !v)}
              title="Outline / índice (H1–H3)"
              type="button"
              style={{
                border: outlineOpen ? '1px solid #64b5f6' : '1px solid rgba(255, 255, 255, 0.15)',
                color: outlineOpen ? '#64b5f6' : 'var(--ui-content-text, #ccc)',
                background: outlineOpen ? 'rgba(100, 181, 246, 0.12)' : 'transparent',
                width: '30px',
                height: '28px',
                padding: 0,
                justifyContent: 'center'
              }}
            >
              <i className="pi pi-list" style={{ fontSize: '0.8rem' }} />
            </button>

            {/* Buscar */}
            <button
              className={`toolbar-premium-btn ${findVisible ? 'zen-active' : ''}`}
              onClick={() => {
                setFindVisible(true);
                setFindReplaceMode(false);
              }}
              title="Buscar en la nota (Ctrl+F)"
              type="button"
              style={{
                border: findVisible ? '1px solid #f59e0b' : '1px solid rgba(255, 255, 255, 0.15)',
                color: findVisible ? '#f59e0b' : 'var(--ui-content-text, #ccc)',
                background: findVisible ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                width: '30px',
                height: '28px',
                padding: 0,
                justifyContent: 'center'
              }}
            >
              <i className="pi pi-search" style={{ fontSize: '0.8rem' }} />
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

      <NoteFindBar
        visible={findVisible}
        replaceMode={findReplaceMode}
        query={findQuery}
        replaceText={findReplaceText}
        matchCount={findMatches.length}
        currentIndex={findIndex}
        onQueryChange={handleFindQueryChange}
        onReplaceTextChange={setFindReplaceText}
        onClose={handleFindClose}
        onNext={handleFindNext}
        onPrev={handleFindPrev}
        onReplace={handleReplaceOne}
        onReplaceAll={handleReplaceAll}
        onToggleReplace={() => setFindReplaceMode((v) => !v)}
      />

      <NoteTagsBar
        tags={noteTags}
        createdAt={documentData?.createdAt}
        updatedAt={documentData?.updatedAt}
        isFavorite={isFavorite}
        onAddTag={(tag) => {
          if (noteTags.includes(tag)) return;
          persistTags([...noteTags, tag]);
        }}
        onRemoveTag={(tag) => persistTags(noteTags.filter((t) => t !== tag))}
        onToggleFavorite={() => {
          const noteConnection = {
            id: documentKey,
            type: documentData?.type || 'document',
            name: documentData?.label || tempTitle,
            ...(documentData || {})
          };
          connectionStore.toggleFavorite(noteConnection);
          setIsFavorite(connectionStore.isFavorite(noteConnection));
        }}
      />

      {/* CUERPO DEL EDITOR */}
      <div className="document-editor-body-row">
        {viewMode === 'wysiwyg' ? (
          <div className="document-editor-content">
            {editor && !editor.isDestroyed && (
              <>
                <NoteBubbleMenu editor={editor} />
                <EditorContent editor={editor} />
              </>
            )}
          </div>
        ) : (
          <div className="document-markdown-source">
            <textarea
              ref={markdownTextareaRef}
              value={markdownSource}
              onChange={handleMarkdownChange}
              onMouseDown={(e) => {
                if (e.button !== 2) return;
                const ta = e.currentTarget;
                savedSelectionRef.current = {
                  from: 0,
                  to: 0,
                  text: ta.value.substring(ta.selectionStart, ta.selectionEnd),
                  mdStart: ta.selectionStart,
                  mdEnd: ta.selectionEnd
                };
              }}
              onContextMenu={(e) => openEditorContextMenu(e, 'markdown')}
              placeholder="Escribe en Markdown..."
              spellCheck={false}
            />
          </div>
        )}

        <NoteOutlinePanel
          open={outlineOpen}
          headings={headings}
          onClose={() => setOutlineOpen(false)}
          onNavigate={(h) => {
            const ed = editorRef.current;
            if (!ed || ed.isDestroyed) return;
            if (viewMode !== 'wysiwyg') {
              switchToWysiwyg();
            }
            requestAnimationFrame(() => {
              const current = editorRef.current;
              if (!current) return;
              current.chain().focus().setTextSelection(h.pos + 1).run();
              const dom = current.view.nodeDOM(h.pos);
              if (dom && typeof dom.scrollIntoView === 'function') {
                dom.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            });
          }}
        />
      </div>

      <ContextMenu
        model={editorContextItems}
        ref={editorContextMenuRef}
        breakpoint="767px"
      />

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
