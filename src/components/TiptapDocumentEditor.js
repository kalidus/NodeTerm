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

      <div className="toolbar-group">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista"
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
    </div>
  );
};

const TiptapDocumentEditor = ({ documentKey, documentData, onSave }) => {
  const [viewMode, setViewMode] = useState('wysiwyg');
  const [markdownSource, setMarkdownSource] = useState(documentData?.markdownSource || '');
  const [saveStatus, setSaveStatus] = useState('saved');
  const saveTimerRef = useRef(null);
  const lastSavedContentRef = useRef(documentData?.content || '');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      Placeholder.configure({
        placeholder: 'Empieza a escribir tu documento...',
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
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveContent(editor);
      }, 2000);
    },
  });

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
    }
    setViewMode('wysiwyg');
  }, [editor, markdownSource]);

  const handleMarkdownChange = (e) => {
    setMarkdownSource(e.target.value);
    setSaveStatus('unsaved');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const html = marked(e.target.value);
      lastSavedContentRef.current = html;
      setSaveStatus('saving');

      window.dispatchEvent(new CustomEvent('document-content-updated', {
        detail: {
          key: documentKey,
          content: html,
          markdownSource: e.target.value
        }
      }));

      if (onSave) {
        onSave({ content: html, markdownSource: e.target.value });
      }
      setTimeout(() => setSaveStatus('saved'), 300);
    }, 2000);
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
        }
        setMarkdownSource(text);
        setSaveStatus('unsaved');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="document-editor-container">
      <div className="document-editor-header">
        <div className="document-editor-title">
          <i className="pi pi-file-edit" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {documentData?.label || 'Sin título'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

          <button
            onClick={handleImportMarkdown}
            title="Importar Markdown"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ui-content-text, #ccc)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <i className="pi pi-upload" style={{ fontSize: '0.85rem' }} />
          </button>
          <button
            onClick={handleExportMarkdown}
            title="Exportar como Markdown"
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ui-content-text, #ccc)',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 4,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <i className="pi pi-download" style={{ fontSize: '0.85rem' }} />
          </button>

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

      {viewMode === 'wysiwyg' ? (
        <>
          <EditorToolbar editor={editor} />
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
    </div>
  );
};

export default TiptapDocumentEditor;
