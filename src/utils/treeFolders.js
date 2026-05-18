/**
 * Recorre el árbol de conexiones y devuelve opciones { label, value } para selects de carpeta.
 */
export function getAllFolders(nodes, prefix = '') {
  let folders = [];
  for (const node of nodes) {
    if (node.droppable) {
      folders.push({ label: prefix + node.label, value: node.key });
      if (node.children && node.children.length > 0) {
        folders = folders.concat(getAllFolders(node.children, `${prefix}${node.label} / `));
      }
    }
  }
  return folders;
}
