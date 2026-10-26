export const VAULT_LAYOUT_STORAGE_KEY = 'passwords_sidebar_layout';

export const VAULT_LAYOUTS = [
  {
    id: 'tree',
    name: 'Árbol',
    description: 'Jerarquía con carpetas anidadas'
  },
  {
    id: 'icons',
    name: 'Iconos grandes',
    description: 'Rejilla de dos columnas, como el Finder'
  },
  {
    id: 'list',
    name: 'Lista',
    description: 'Filas con icono y nombre, sin sangría'
  },
  {
    id: 'detail',
    name: 'Detalle',
    description: 'Nombre y, debajo, usuario o tipo'
  },
  {
    id: 'cards',
    name: 'Tarjetas',
    description: 'Ficha con icono, nombre y tipo'
  },
  {
    id: 'sections',
    name: 'Secciones',
    description: 'Agrupa carpetas y secretos por tipo'
  }
];

const VAULT_LAYOUT_IDS = VAULT_LAYOUTS.map((item) => item.id);

export function isVaultLayout(value) {
  return VAULT_LAYOUT_IDS.includes(value);
}

export function readSavedVaultLayout() {
  try {
    const saved = localStorage.getItem(VAULT_LAYOUT_STORAGE_KEY);
    return isVaultLayout(saved) ? saved : 'tree';
  } catch {
    return 'tree';
  }
}
