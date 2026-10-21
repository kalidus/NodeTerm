/**
 * Menú contextual DOM para el editor de notas.
 * Delegación de eventos en capture sobre el propio menú (antes que listeners globales).
 */

const MENU_CLASS = 'notes-editor-context-menu';

function removeExisting() {
  document.querySelectorAll(`.${MENU_CLASS}`).forEach((el) => el.remove());
}

/**
 * @param {{ clientX: number, clientY: number }} point
 * @param {Array<{ label?: string, icon?: string, shortcut?: string, separator?: boolean, disabled?: boolean, command?: Function }>} items
 */
export function showNotesEditorContextMenu(point, items) {
  removeExisting();

  const menu = document.createElement('div');
  menu.className = `app-menu-surface ${MENU_CLASS}`;
  menu.setAttribute('role', 'menu');
  menu.style.cssText = `
    position: fixed;
    left: ${Math.round(point.clientX || 0)}px;
    top: ${Math.round(point.clientY || 0)}px;
    z-index: 2147483000;
    min-width: 220px;
    background: var(--ui-context-bg, #1e222d);
    border: 1px solid var(--ui-context-border, rgba(255,255,255,0.12));
    box-shadow: 0 8px 24px var(--ui-context-shadow, rgba(0,0,0,0.45));
    border-radius: 8px;
    padding: 4px 0;
    font-size: var(--ui-font-size, 13px);
    color: var(--ui-context-text, #e2e8f0);
    user-select: none;
    pointer-events: auto;
  `;

  const commands = [];

  items.forEach((item, index) => {
    if (item.separator) {
      const sep = document.createElement('div');
      sep.style.cssText = 'height:1px;margin:4px 8px;background:var(--ui-context-border,rgba(255,255,255,0.1));';
      menu.appendChild(sep);
      return;
    }

    commands[index] = item;

    const row = document.createElement('button');
    row.type = 'button';
    row.setAttribute('role', 'menuitem');
    row.dataset.cmdIndex = String(index);
    row.disabled = !!item.disabled;
    row.style.cssText = `
      width: 100%;
      border: none;
      background: transparent;
      text-align: left;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: ${item.disabled ? 'not-allowed' : 'pointer'};
      opacity: ${item.disabled ? 0.45 : 1};
      color: inherit;
      font: inherit;
      pointer-events: auto;
    `;

    row.innerHTML = `
      <i class="${item.icon || 'pi pi-circle'}" style="width:16px;text-align:center;pointer-events:none;"></i>
      <span style="flex:1;pointer-events:none;">${item.label || ''}</span>
      ${item.shortcut ? `<span style="opacity:0.45;font-size:0.75em;margin-left:12px;pointer-events:none;">${item.shortcut}</span>` : ''}
    `;

    row.addEventListener('mouseenter', () => {
      if (!item.disabled) row.style.background = 'var(--ui-context-hover, rgba(255,255,255,0.1))';
    });
    row.addEventListener('mouseleave', () => {
      row.style.background = 'transparent';
    });

    menu.appendChild(row);
  });

  const close = () => {
    removeExisting();
    document.removeEventListener('pointerdown', onOutside, true);
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', close);
  };

  const execute = (index) => {
    const item = commands[index];
    if (!item || item.disabled || typeof item.command !== 'function') return;
    close();
    // Ejecutar tras cerrar, con el editor libre para recibir foco
    window.requestAnimationFrame(() => {
      try {
        item.command();
      } catch (err) {
        console.error('[notesEditorContextMenu]', err);
      }
    });
  };

  // Capture en el menú: gana a cualquier listener global de document
  menu.addEventListener('pointerdown', (e) => {
    const btn = e.target?.closest?.('[data-cmd-index]');
    if (!btn || !menu.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    execute(Number(btn.dataset.cmdIndex));
  }, true);

  // Fallback click (por si el entorno ignora pointerdown)
  menu.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-cmd-index]');
    if (!btn || !menu.contains(btn)) return;
    e.preventDefault();
    e.stopPropagation();
    execute(Number(btn.dataset.cmdIndex));
  });

  const onOutside = (e) => {
    if (menu.contains(e.target)) return;
    close();
  };

  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  document.body.appendChild(menu);

  const rect = menu.getBoundingClientRect();
  let left = point.clientX || 0;
  let top = point.clientY || 0;
  const margin = 8;
  if (left + rect.width > window.innerWidth - margin) {
    left = window.innerWidth - rect.width - margin;
  }
  if (top + rect.height > window.innerHeight - margin) {
    top = window.innerHeight - rect.height - margin;
  }
  menu.style.left = `${Math.max(margin, Math.round(left))}px`;
  menu.style.top = `${Math.max(margin, Math.round(top))}px`;

  // Fuera: solo después de un frame, y sin interferir con el item (capture del menú gana)
  window.setTimeout(() => {
    if (!document.body.contains(menu)) return;
    document.addEventListener('pointerdown', onOutside, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close);
  }, 100);
}

export default showNotesEditorContextMenu;
