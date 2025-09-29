import React from 'react';
import { iconThemes } from '../themes/icon-themes';

/**
 * Componente selector de color para carpetas
 * Ofrece una paleta predefinida de colores atractivos
 */
export const ColorSelector = ({ 
  selectedColor, 
  onColorChange, 
  label = "Color de la carpeta",
  className = "",
  iconTheme = 'material'
}) => {
  // Función para obtener el color por defecto del tema actual
  const getThemeDefaultColor = (themeName) => {
    const theme = iconThemes[themeName];
    if (!theme || !theme.icons || !theme.icons.folder) return '#5e81ac'; // Nord color por defecto
    
    const folderIcon = theme.icons.folder;
    
    // Si el SVG tiene fill y no es "none", usar ese color
    if (folderIcon.props && folderIcon.props.fill && folderIcon.props.fill !== 'none') {
      return folderIcon.props.fill;
    }
    
    // Si el SVG tiene stroke, usar ese color (para temas como linea que usan stroke)
    if (folderIcon.props && folderIcon.props.stroke) {
      return folderIcon.props.stroke;
    }
    
    // Fallback: buscar en los children del SVG
    if (folderIcon.props && folderIcon.props.children) {
      const children = Array.isArray(folderIcon.props.children) 
        ? folderIcon.props.children 
        : [folderIcon.props.children];
      
      for (const child of children) {
        if (child.props && child.props.fill && child.props.fill !== 'none') {
          return child.props.fill;
        }
        if (child.props && child.props.stroke) {
          return child.props.stroke;
        }
      }
    }
    
    return '#5e81ac'; // Nord color por defecto
  };

  const themeDefaultColor = getThemeDefaultColor(iconTheme);

  // Paleta de colores predefinida con el color del tema al inicio
  const colorPalette = [
    { name: 'Tema', value: themeDefaultColor, icon: '🎨', isTheme: true },
    { name: 'Azul', value: '#007ad9', icon: '🔵' },
    { name: 'Verde', value: '#28a745', icon: '🟢' },
    { name: 'Rojo', value: '#dc3545', icon: '🔴' },
    { name: 'Naranja', value: '#fd7e14', icon: '🟠' },
    { name: 'Púrpura', value: '#6f42c1', icon: '🟣' },
    { name: 'Rosa', value: '#e83e8c', icon: '🩷' },
    { name: 'Amarillo', value: '#ffc107', icon: '🟡' },
    { name: 'Cian', value: '#17a2b8', icon: '🔵' },
    { name: 'Gris', value: '#6c757d', icon: '⚫' },
    { name: 'Índigo', value: '#6610f2', icon: '🟣' },
    { name: 'Turquesa', value: '#20c997', icon: '🟢' },
    { name: 'Coral', value: '#ff6b6b', icon: '🟠' }
  ];

  return (
    <div className={`color-selector ${className}`}>
      <label className="color-selector-label">
        {label}
      </label>
      <div className="color-palette">
        {colorPalette.map((color) => (
          <button
            key={color.value}
            type="button"
            className={`color-option ${selectedColor === color.value ? 'selected' : ''}`}
            style={{ 
              backgroundColor: color.value,
              border: selectedColor === color.value ? '3px solid #fff' : '2px solid transparent',
              boxShadow: selectedColor === color.value ? '0 0 0 2px #007ad9' : 'none'
            }}
            onClick={() => onColorChange(color.value)}
            title={color.name}
            aria-label={`Seleccionar color ${color.name}`}
          >
            <span className="color-icon">{color.icon}</span>
          </button>
        ))}
      </div>
      {selectedColor && (
        <div className="selected-color-info">
          <span 
            className="selected-color-preview" 
            style={{ backgroundColor: selectedColor }}
          ></span>
          <span className="selected-color-text">
            Color seleccionado: {colorPalette.find(c => c.value === selectedColor)?.name || 'Personalizado'}
          </span>
        </div>
      )}
    </div>
  );
};

export default ColorSelector;
