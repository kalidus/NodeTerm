import React, { useRef, useEffect, useState, useCallback } from 'react';

const RDPComponent = ({ 
  tabKey, 
  rdpConfig, 
  isActive, 
  onConnectionStatusChange 
}) => {
  const canvasRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 1366, height: 768 });

  // Función para enviar eventos de mouse
  const handleMouseEvent = useCallback((e, isPressed = null) => {
    if (!connected) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvasSize.width / rect.width;
    const scaleY = canvasSize.height / rect.height;
    
    const x = Math.round((e.clientX - rect.left) * scaleX);
    const y = Math.round((e.clientY - rect.top) * scaleY);
    
    let button = 1; // Por defecto botón izquierdo
    if (e.button === 1) button = 3; // Rueda/botón medio
    else if (e.button === 2) button = 2; // Botón derecho
    
    const pressed = isPressed !== null ? isPressed : (e.type === 'mousedown');
    
    window.electron.ipcRenderer.send('rdp:mouse', {
      tabId: tabKey,
      x,
      y,
      button,
      isPressed: pressed
    });
  }, [tabKey, connected, canvasSize]);

  // Función para enviar eventos de teclado
  const handleKeyEvent = useCallback((e, isPressed) => {
    if (!connected) return;
    
    e.preventDefault();
    
    // Convertir código de tecla a scancode (simplificado)
    // En una implementación real, necesitarías un mapa más completo
    let scancode = e.keyCode;
    
    // Mapeo básico de teclas comunes
    const keyMap = {
      8: 0x0E,   // Backspace
      9: 0x0F,   // Tab
      13: 0x1C,  // Enter
      16: 0x2A,  // Shift izquierdo
      17: 0x1D,  // Ctrl izquierdo
      18: 0x38,  // Alt izquierdo
      27: 0x01,  // Escape
      32: 0x39,  // Espacio
      37: 0xCB,  // Flecha izquierda
      38: 0xC8,  // Flecha arriba
      39: 0xCD,  // Flecha derecha
      40: 0xD0,  // Flecha abajo
    };
    
    if (keyMap[e.keyCode]) {
      scancode = keyMap[e.keyCode];
    } else if (e.keyCode >= 65 && e.keyCode <= 90) {
      // Letras A-Z
      scancode = 0x1E + (e.keyCode - 65);
    } else if (e.keyCode >= 48 && e.keyCode <= 57) {
      // Números 0-9
      scancode = 0x0B + (e.keyCode - 48);
      if (scancode === 0x0B + 10) scancode = 0x0B; // 0 es 0x0B
    }

    window.electron.ipcRenderer.send('rdp:keyboard', {
      tabId: tabKey,
      scancode,
      isPressed
    });
  }, [tabKey, connected]);

  // Configurar eventos de conexión RDP
  useEffect(() => {
    if (!tabKey) return;

    let isConnecting = false;

    console.log(`Configurando RDP para tab: ${tabKey}`);

    // Listener para conexión exitosa
    const handleRdpReady = () => {
      console.log(`RDP conectado para tab: ${tabKey}`);
      setConnected(true);
      setError(null);
      isConnecting = false;
      if (onConnectionStatusChange) {
        onConnectionStatusChange(tabKey, 'connected');
      }
    };

    // Listener para errores
    const handleRdpError = (errorMsg) => {
      console.error(`Error RDP para tab ${tabKey}:`, errorMsg);
      setError(errorMsg);
      setConnected(false);
      isConnecting = false;
      if (onConnectionStatusChange) {
        onConnectionStatusChange(tabKey, 'error', errorMsg);
      }
    };

    // Listener para bitmaps (actualizaciones de pantalla)
    const handleRdpBitmap = (data) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const { bitmap } = data;
      
      try {
        // Crear ImageData a partir del bitmap
        const imageData = ctx.createImageData(bitmap.width, bitmap.height);
        
        // node-rdpjs envía datos en formato BGRA, necesitamos convertir a RGBA
        const sourceData = new Uint8Array(bitmap.data);
        const destData = imageData.data;
        
        for (let i = 0; i < sourceData.length; i += 4) {
          // Convertir BGRA a RGBA
          destData[i] = sourceData[i + 2];     // R
          destData[i + 1] = sourceData[i + 1]; // G  
          destData[i + 2] = sourceData[i];     // B
          destData[i + 3] = sourceData[i + 3]; // A
        }
        
        // Dibujar en el canvas
        ctx.putImageData(imageData, bitmap.x, bitmap.y);
        
      } catch (bitmapError) {
        console.warn('Error procesando bitmap RDP:', bitmapError);
      }
    };

    // Registrar listeners
    const unsubReady = window.electron.ipcRenderer.on(`rdp:ready:${tabKey}`, handleRdpReady);
    const unsubError = window.electron.ipcRenderer.on(`rdp:error:${tabKey}`, handleRdpError);
    const unsubBitmap = window.electron.ipcRenderer.on(`rdp:bitmap:${tabKey}`, handleRdpBitmap);

    // Iniciar conexión RDP solo si no está conectando ni conectado
    if (isActive && !connected && !isConnecting) {
      isConnecting = true;
      console.log(`Iniciando conexión RDP para tab: ${tabKey}`, rdpConfig);
      window.electron.ipcRenderer.send('rdp:connect', {
        tabId: tabKey,
        config: {
          ...rdpConfig,
          width: canvasSize.width,
          height: canvasSize.height
        }
      });
    }

    // Cleanup
    return () => {
      if (unsubReady) unsubReady();
      if (unsubError) unsubError();
      if (unsubBitmap) unsubBitmap();
      window.electron.ipcRenderer.send('rdp:disconnect', tabKey);
    };
  }, [tabKey, rdpConfig, isActive, canvasSize, onConnectionStatusChange, connected]);

  // Manejar eventos de teclado globales cuando está enfocado
  useEffect(() => {
    if (!isActive || !connected) return;

    const handleKeyDown = (e) => handleKeyEvent(e, true);
    const handleKeyUp = (e) => handleKeyEvent(e, false);

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isActive, connected, handleKeyEvent]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (connected) {
        window.electron.ipcRenderer.send('rdp:disconnect', tabKey);
      }
    };
  }, [tabKey, connected]);

  return (
    <div 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#000',
        position: 'relative'
      }}
    >
      {error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center',
          zIndex: 1000,
          maxWidth: '80%'
        }}>
          <h3>Error de conexión RDP</h3>
          <p>{error}</p>
          <button 
            onClick={() => {
              setError(null);
              window.electron.ipcRenderer.send('rdp:connect', {
                tabId: tabKey,
                config: {
                  ...rdpConfig,
                  width: canvasSize.width,
                  height: canvasSize.height
                }
              });
            }}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: 'white',
              color: '#244154',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      )}
      
      {!connected && !error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <div style={{ marginBottom: '20px' }}>
            Conectando a {rdpConfig.host}...
          </div>
          <div className="spinner" style={{
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          backgroundColor: '#000',
          cursor: connected ? 'default' : 'wait'
        }}
        onMouseDown={handleMouseEvent}
        onMouseUp={handleMouseEvent}
        onMouseMove={(e) => {
          if (e.buttons > 0) { // Solo si hay un botón presionado
            handleMouseEvent(e, true);
          } else {
            handleMouseEvent(e, false);
          }
        }}
        onContextMenu={(e) => e.preventDefault()} // Prevenir menú contextual
        tabIndex={0} // Permitir enfoque para eventos de teclado
      />

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default RDPComponent; 