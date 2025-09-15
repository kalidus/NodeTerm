import React from 'react';

/**
 * Componente selector de color para carpetas
 * Ofrece una paleta predefinida de colores atractivos
 */
export const ColorSelector = ({ 
  selectedColor, 
  onColorChange, 
  label = "Color de la carpeta",
  className = "" 
}) => {
  // Paleta de colores predefinida
  const colorPalette = [
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
