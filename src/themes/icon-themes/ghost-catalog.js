/**
 * Variantes de color del trazo Ghost UI. Sin SVG, para que el catálogo
 * no arrastre el pack de iconos.
 */
export const ghostCatalog = [
  { id: 'ghostCyan', name: 'Ghost Cyan', group: 'Ghost', color: '#67e8f9' },
  { id: 'ghostAmber', name: 'Ghost Ámbar', group: 'Ghost', color: '#fbbf24' },
  { id: 'ghostEmerald', name: 'Ghost Esmeralda', group: 'Ghost', color: '#34d399' },
  { id: 'ghostCrimson', name: 'Ghost Carmesí', group: 'Ghost', color: '#fb7185' },
  { id: 'ghostViolet', name: 'Ghost Violeta', group: 'Ghost', color: '#c084fc' },
  { id: 'ghostArctic', name: 'Ghost Ártico', group: 'Ghost', color: '#7dd3fc' },
  { id: 'ghostSakura', name: 'Ghost Sakura', group: 'Ghost', color: '#f9a8d4' },
  { id: 'ghostOcean', name: 'Ghost Océano', group: 'Ghost', color: '#38bdf8' },
  { id: 'ghostToxic', name: 'Ghost Tóxico', group: 'Ghost', color: '#a3e635' },
  { id: 'ghostCopper', name: 'Ghost Cobre', group: 'Ghost', color: '#fb923c' },
  { id: 'ghostLemon', name: 'Ghost Limón', group: 'Ghost', color: '#facc15' },
  { id: 'ghostLagoon', name: 'Ghost Laguna', group: 'Ghost', color: '#2dd4bf' }
];

export const ghostIconMeta = ghostCatalog.map(({ id, name, group }) => ({ id, name, group }));
