export const NOTES_LAYOUT_STORAGE_KEY = 'documents_sidebar_layout';

export const NOTES_LAYOUTS = [
  {
    id: 'tree',
    name: 'Árbol',
    description: 'Jerarquía con carpetas anidadas'
  },
  {
    id: 'shelf',
    name: 'Estantería',
    description: 'Carpetas como lomos en una estantería'
  },
  {
    id: 'index',
    name: 'Índice',
    description: 'Tabla de contenidos numerada, estilo manual'
  },
  {
    id: 'cards',
    name: 'Fichas',
    description: 'Título, preview y fecha'
  },
  {
    id: 'timeline',
    name: 'Línea temporal',
    description: 'Hoy, esta semana y anteriores'
  },
  {
    id: 'tags',
    name: 'Etiquetas',
    description: 'Agrupa las notas por tag'
  },
  {
    id: 'list',
    name: 'Lista',
    description: 'Filas compactas con título y fecha'
  }
];

const NOTES_LAYOUT_IDS = NOTES_LAYOUTS.map((item) => item.id);

export function isNotesLayout(value) {
  return NOTES_LAYOUT_IDS.includes(value);
}

export function readSavedNotesLayout() {
  try {
    const saved = localStorage.getItem(NOTES_LAYOUT_STORAGE_KEY);
    return isNotesLayout(saved) ? saved : 'tree';
  } catch {
    return 'tree';
  }
}
