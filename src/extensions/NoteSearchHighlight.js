import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const noteSearchPluginKey = new PluginKey('noteSearchHighlight');

function buildDecorations(doc, query, currentIndex) {
  if (!query) return DecorationSet.empty;
  const decorations = [];
  const lowerQuery = query.toLowerCase();
  let matchIndex = 0;

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text;
    const lower = text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(lowerQuery, from);
      if (idx === -1) break;
      const start = pos + idx;
      const end = start + query.length;
      const isCurrent = matchIndex === currentIndex;
      decorations.push(
        Decoration.inline(start, end, {
          class: isCurrent ? 'note-search-match note-search-match-current' : 'note-search-match'
        })
      );
      matchIndex += 1;
      from = idx + Math.max(query.length, 1);
    }
  });

  return DecorationSet.create(doc, decorations);
}

export function collectSearchMatches(doc, query) {
  if (!query) return [];
  const matches = [];
  const lowerQuery = query.toLowerCase();

  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const lower = node.text.toLowerCase();
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(lowerQuery, from);
      if (idx === -1) break;
      matches.push({ from: pos + idx, to: pos + idx + query.length });
      from = idx + Math.max(query.length, 1);
    }
  });

  return matches;
}

const NoteSearchHighlight = Extension.create({
  name: 'noteSearchHighlight',

  addStorage() {
    return {
      query: '',
      currentIndex: 0
    };
  },

  addCommands() {
    return {
      setSearchHighlight:
        (query, currentIndex = 0) =>
        ({ editor }) => {
          this.storage.query = query || '';
          this.storage.currentIndex = currentIndex;
          const tr = editor.state.tr.setMeta(noteSearchPluginKey, {
            query: this.storage.query,
            currentIndex: this.storage.currentIndex
          });
          editor.view.dispatch(tr);
          return true;
        },
      clearSearchHighlight:
        () =>
        ({ editor }) => {
          this.storage.query = '';
          this.storage.currentIndex = 0;
          const tr = editor.state.tr.setMeta(noteSearchPluginKey, {
            query: '',
            currentIndex: 0
          });
          editor.view.dispatch(tr);
          return true;
        }
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: noteSearchPluginKey,
        state: {
          init() {
            return DecorationSet.empty;
          },
          apply(tr, oldDeco) {
            const meta = tr.getMeta(noteSearchPluginKey);
            if (meta) {
              return buildDecorations(tr.doc, meta.query, meta.currentIndex);
            }
            if (tr.docChanged && extension.storage.query) {
              return buildDecorations(
                tr.doc,
                extension.storage.query,
                extension.storage.currentIndex
              );
            }
            if (!oldDeco) return DecorationSet.empty;
            return oldDeco.map(tr.mapping, tr.doc);
          }
        },
        props: {
          decorations(state) {
            return this.getState(state);
          }
        }
      })
    ];
  }
});

export default NoteSearchHighlight;
