import React, { useEffect, useRef, useState } from 'react';
import { FaBold, FaItalic, FaUnderline } from 'react-icons/fa';

/**
 * Toolbar flotante al seleccionar texto (sin BubbleMenu oficial de TipTap).
 */
const NoteBubbleMenu = ({ editor }) => {
  const [pos, setPos] = useState(null);
  const rangeRef = useRef({ from: 0, to: 0 });

  useEffect(() => {
    if (!editor || editor.isDestroyed) return undefined;

    const update = () => {
      try {
        if (editor.isDestroyed || !editor.view) {
          setPos(null);
          return;
        }
        const { state, view } = editor;
        const { empty, from, to } = state.selection;
        if (empty || from === to) {
          setPos(null);
          return;
        }
        rangeRef.current = { from, to };
        const start = view.coordsAtPos(from);
        const end = view.coordsAtPos(to);
        setPos({
          left: (start.left + end.left) / 2,
          top: Math.min(start.top, end.top) - 8
        });
      } catch {
        setPos(null);
      }
    };

    const clear = () => setPos(null);

    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('blur', clear);
    editor.on('focus', update);
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);

    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('blur', clear);
      editor.off('focus', update);
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [editor]);

  if (!editor || editor.isDestroyed || !pos) return null;

  const apply = (commandName) => {
    const { from, to } = rangeRef.current;
    try {
      editor.view.focus();
      let chain = editor.chain().focus();
      if (from !== to) {
        chain = chain.setTextSelection({ from, to });
      }
      if (commandName === 'bold') {
        const boldType = editor.state.schema.marks.bold;
        if (boldType) {
          const { from: a, to: b, empty } = editor.state.selection;
          let tr = editor.state.tr;
          if (empty) {
            const stored = editor.state.storedMarks || editor.state.selection.$from.marks();
            if (boldType.isInSet(stored)) tr = tr.removeStoredMark(boldType);
            else tr = tr.addStoredMark(boldType.create());
          } else if (editor.isActive('bold')) {
            tr = tr.removeMark(a, b, boldType);
          } else {
            tr = tr.addMark(a, b, boldType.create());
          }
          editor.view.dispatch(tr.scrollIntoView());
        }
      } else if (commandName === 'italic') chain.toggleItalic().run();
      else if (commandName === 'underline') chain.toggleUnderline().run();
      else if (commandName === 'highlight') chain.toggleHighlight().run();
      else if (typeof commandName === 'function') commandName(editor);
      rangeRef.current = {
        from: editor.state.selection.from,
        to: editor.state.selection.to
      };
    } catch (err) {
      console.error('[NoteBubbleMenu] apply:', err);
    }
  };

  return (
    <div
      className="note-bubble-menu"
      style={{
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        transform: 'translate(-50%, -100%)',
        zIndex: 10050
      }}
    >
      <button
        type="button"
        className={editor.isActive('bold') ? 'active' : ''}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); apply('bold'); }}
        title="Negrita"
      >
        <FaBold size={11} />
      </button>
      <button
        type="button"
        className={editor.isActive('italic') ? 'active' : ''}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); apply('italic'); }}
        title="Cursiva"
      >
        <FaItalic size={11} />
      </button>
      <button
        type="button"
        className={editor.isActive('underline') ? 'active' : ''}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); apply('underline'); }}
        title="Subrayado"
      >
        <FaUnderline size={11} />
      </button>
      <button
        type="button"
        className={editor.isActive('highlight') ? 'active' : ''}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); apply('highlight'); }}
        title="Resaltar"
      >
        <i className="pi pi-sun" style={{ fontSize: '0.75rem' }} />
      </button>
      <button
        type="button"
        className={editor.isActive('link') ? 'active' : ''}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          apply((ed) => {
            const prev = ed.getAttributes('link').href;
            const url = window.prompt('URL del enlace', prev || 'https://');
            if (url === null) return;
            if (url === '') {
              ed.chain().focus().extendMarkRange('link').unsetLink().run();
              return;
            }
            ed.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
          });
        }}
        title="Enlace"
      >
        <i className="pi pi-link" style={{ fontSize: '0.75rem' }} />
      </button>
    </div>
  );
};

export default NoteBubbleMenu;
