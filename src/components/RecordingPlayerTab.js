/**
 * RecordingPlayerTab - Reproductor de grabaciones de sesiones SSH
 * Usa xterm.js para renderizar la reproducción en formato asciicast
 */
import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const RecordingPlayerTab = ({ recording, fontFamily, fontSize, theme }) => {
  const terminalRef = useRef(null);
  const terminalInstance = useRef(null);
  const fitAddon = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    speed: 1
  });
  
  const playbackData = useRef({
    events: [],
    currentEventIndex: 0,
    startTime: 0,
    timeout: null,
    isPaused: false,
    isDragging: false,
    lastSeekTime: 0
  });

  useEffect(() => {
    initializeTerminal();
    loadRecording();

    return () => {
      cleanup();
    };
  }, []);

  useEffect(() => {
    // Actualizar tema cuando cambie
    if (terminalInstance.current && theme) {
      terminalInstance.current.options.theme = theme;
    }
  }, [theme]);

  const initializeTerminal = () => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      fontFamily: fontFamily || 'Consolas, Courier New, monospace',
      fontSize: fontSize || 14,
      theme: theme || {
        background: '#1e1e1e',
        foreground: '#d4d4d4'
      },
      cursorBlink: false,
      disableStdin: true, // Deshabilitar entrada durante reproducción
      rows: recording?.metadata?.height || 24,
      cols: recording?.metadata?.width || 80,
      allowTransparency: true,
      scrollback: 10000
    });

    fitAddon.current = new FitAddon();
    term.loadAddon(fitAddon.current);
    term.open(terminalRef.current);
    
    try {
      fitAddon.current.fit();
    } catch (e) {
      console.warn('Error fitting terminal:', e);
    }

    terminalInstance.current = term;

    // Habilitar copiado con Ctrl+C cuando hay texto seleccionado
    const handleKeyDown = (event) => {
      // Solo procesar si es Ctrl+C o Cmd+C
      if ((event.ctrlKey || event.metaKey) && (event.key === 'c' || event.key === 'C')) {
        const selection = term.getSelection();
        if (selection && selection.length > 0) {
          console.log('🔑 Ctrl+C detectado, copiando:', selection.substring(0, 50) + '...');
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          
          if (window.electron?.clipboard?.writeText) {
            window.electron.clipboard.writeText(selection);
            console.log('✅ Texto copiado al portapapeles');
          } else {
            console.warn('⚠️ clipboard.writeText no disponible');
          }
          return false;
        }
      }
    };

    // Añadir listener a nivel del documento con captura
    document.addEventListener('keydown', handleKeyDown, true);
    
    // También añadir al contenedor del terminal como respaldo
    terminalRef.current.addEventListener('keydown', handleKeyDown, true);

    // Añadir menú contextual para copiar
    const handleContextMenu = (event) => {
      const selection = term.getSelection();
      if (selection) {
        event.preventDefault();
        // Crear menú contextual simple
        const menu = document.createElement('div');
        menu.style.position = 'fixed';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;
        menu.style.background = 'var(--ui-dialog-bg)';
        menu.style.border = '1px solid var(--ui-content-border)';
        menu.style.borderRadius = '4px';
        menu.style.padding = '4px 0';
        menu.style.zIndex = '10000';
        menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.3)';
        
        const copyOption = document.createElement('div');
        copyOption.textContent = '📋 Copiar';
        copyOption.style.padding = '8px 16px';
        copyOption.style.cursor = 'pointer';
        copyOption.style.color = 'var(--ui-dialog-text)';
        copyOption.onmouseover = () => copyOption.style.background = 'var(--ui-sidebar-hover)';
        copyOption.onmouseout = () => copyOption.style.background = 'transparent';
        copyOption.onclick = () => {
          if (window.electron?.clipboard?.writeText) {
            window.electron.clipboard.writeText(selection);
            console.log('Texto copiado desde menú contextual');
          }
          document.body.removeChild(menu);
        };
        
        menu.appendChild(copyOption);
        document.body.appendChild(menu);
        
        // Cerrar menú al hacer clic fuera
        const closeMenu = (e) => {
          if (!menu.contains(e.target)) {
            document.body.removeChild(menu);
            document.removeEventListener('click', closeMenu);
          }
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
      }
    };

    terminalRef.current.addEventListener('contextmenu', handleContextMenu);

    // Guardar las referencias para limpiarlas después
    term._customKeyHandler = handleKeyDown;
    term._contextMenuHandler = handleContextMenu;

    // Mensaje inicial
    term.writeln('\x1b[1;36m╔═══════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║       REPRODUCTOR DE GRABACIONES SSH         ║\x1b[0m');
    term.writeln('\x1b[1;36m╚═══════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[33mCargando grabación...\x1b[0m');
  };

  const loadRecording = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Cargar contenido de la grabación
      const result = await window.electron.ipcRenderer.invoke('recording:load', {
        recordingId: recording.id
      });

      if (!result.success) {
        throw new Error(result.error || 'Error cargando grabación');
      }

      // Parsear formato asciicast
      const lines = result.recording.content.trim().split('\n');
      if (lines.length < 1) {
        throw new Error('Archivo de grabación vacío');
      }

      // Primera línea: header
      const header = JSON.parse(lines[0]);
      
      // Resto: eventos [time, type, data]
      const events = lines.slice(1).map(line => JSON.parse(line));

      playbackData.current.events = events;
      
      const duration = events.length > 0 ? events[events.length - 1][0] : 0;
      setPlaybackState(prev => ({ ...prev, duration }));

      // Limpiar terminal y mostrar info
      if (terminalInstance.current) {
        terminalInstance.current.clear();
        terminalInstance.current.writeln('\x1b[1;32m✓ Grabación cargada correctamente\x1b[0m');
        terminalInstance.current.writeln('');
        terminalInstance.current.writeln(`\x1b[36mTítulo:\x1b[0m ${header.title || 'Sin título'}`);
        terminalInstance.current.writeln(`\x1b[36mFecha:\x1b[0m ${new Date(header.timestamp * 1000).toLocaleString()}`);
        terminalInstance.current.writeln(`\x1b[36mDuración:\x1b[0m ${formatDuration(duration)}`);
        terminalInstance.current.writeln(`\x1b[36mEventos:\x1b[0m ${events.length}`);
        terminalInstance.current.writeln('');
        terminalInstance.current.writeln('\x1b[33mPresiona el botón PLAY para iniciar la reproducción\x1b[0m');
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error cargando grabación:', err);
      setError(err.message);
      setIsLoading(false);
    }
  };

  const play = () => {
    if (!terminalInstance.current || playbackData.current.events.length === 0) return;

    // Si estamos en pausa, reanudar desde donde estábamos
    if (playbackData.current.isPaused) {
      playbackData.current.isPaused = false;
      
      // Ajustar startTime para continuar desde el tiempo actual
      const currentTimeMs = playbackState.currentTime * 1000;
      playbackData.current.startTime = Date.now() - (currentTimeMs / playbackState.speed);
      
      setPlaybackState(prev => ({ ...prev, isPlaying: true }));
      scheduleNextEvent();
      return;
    }

    // Si ya terminó, reiniciar
    if (playbackData.current.currentEventIndex >= playbackData.current.events.length) {
      restart();
      return;
    }

    // Si no está pausado y no ha terminado, comenzar desde el principio
    // (esto solo debería pasar si se llama play() cuando no está reproduciendo)
    terminalInstance.current.clear();
    playbackData.current.startTime = Date.now();
    playbackData.current.currentEventIndex = 0;
    playbackData.current.isPaused = false;
    
    setPlaybackState(prev => ({ ...prev, isPlaying: true, currentTime: 0 }));
    
    scheduleNextEvent();
  };

  const pause = () => {
    if (playbackData.current.timeout) {
      clearTimeout(playbackData.current.timeout);
      playbackData.current.timeout = null;
    }
    playbackData.current.isPaused = true;
    setPlaybackState(prev => ({ ...prev, isPlaying: false }));
  };

  const stop = () => {
    if (playbackData.current.timeout) {
      clearTimeout(playbackData.current.timeout);
      playbackData.current.timeout = null;
    }
    playbackData.current.currentEventIndex = 0;
    playbackData.current.isPaused = false;
    
    if (terminalInstance.current) {
      terminalInstance.current.clear();
      terminalInstance.current.writeln('\x1b[33mReproducción detenida\x1b[0m');
    }
    
    setPlaybackState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }));
  };

  const restart = () => {
    stop();
    setTimeout(() => play(), 100);
  };

  const changeSpeed = (newSpeed) => {
    setPlaybackState(prev => ({ ...prev, speed: newSpeed }));
  };

  /**
   * Salta a un tiempo específico en la grabación
   * @param {number} targetTime - Tiempo objetivo en segundos
   */
  const seekTo = (targetTime) => {
    if (!terminalInstance.current || playbackData.current.events.length === 0) return;
    
    // Limpiar timeout actual
    if (playbackData.current.timeout) {
      clearTimeout(playbackData.current.timeout);
      playbackData.current.timeout = null;
    }
    
    // Asegurar que el tiempo está dentro del rango válido
    const clampedTime = Math.max(0, Math.min(targetTime, playbackState.duration));
    
    // Encontrar el índice del evento más cercano al tiempo objetivo
    let targetIndex = 0;
    for (let i = 0; i < playbackData.current.events.length; i++) {
      const [eventTime] = playbackData.current.events[i];
      if (eventTime <= clampedTime) {
        targetIndex = i;
      } else {
        break;
      }
    }
    
    // Limpiar terminal y reconstruir estado hasta el punto objetivo
    terminalInstance.current.clear();
    
    // Reproducir todos los eventos hasta el índice objetivo
    for (let i = 0; i < targetIndex; i++) {
      const [eventTime, eventType, eventData] = playbackData.current.events[i];
      if (eventType === 'o' && terminalInstance.current) {
        terminalInstance.current.write(eventData);
      }
    }
    
    // Actualizar estado
    playbackData.current.currentEventIndex = targetIndex;
    
    // Actualizar tiempo actual
    setPlaybackState(prev => ({ ...prev, currentTime: clampedTime }));
    
    // Si estaba reproduciendo, continuar desde aquí
    if (playbackState.isPlaying && !playbackData.current.isPaused) {
      playbackData.current.startTime = Date.now() - (clampedTime * 1000 / playbackState.speed);
      scheduleNextEvent();
    } else {
      // Si está pausado o no está reproduciendo, solo actualizar el tiempo
      // El startTime se ajustará cuando se reanude
      playbackData.current.isPaused = playbackState.isPlaying ? false : playbackData.current.isPaused;
    }
  };

  const scheduleNextEvent = () => {
    const { events, currentEventIndex, startTime, isPaused } = playbackData.current;
    
    if (isPaused || currentEventIndex >= events.length) {
      if (currentEventIndex >= events.length) {
        setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        if (terminalInstance.current) {
          terminalInstance.current.writeln('');
          terminalInstance.current.writeln('\x1b[1;32m✓ Reproducción finalizada\x1b[0m');
        }
      }
      return;
    }

    const event = events[currentEventIndex];
    const [eventTime, eventType, eventData] = event;

    const elapsedTime = (Date.now() - startTime) / 1000;
    const adjustedEventTime = eventTime / playbackState.speed;
    const delay = Math.max(0, (adjustedEventTime - elapsedTime) * 1000);

    playbackData.current.timeout = setTimeout(() => {
      // Escribir evento en terminal
      if (eventType === 'o' && terminalInstance.current) {
        terminalInstance.current.write(eventData);
      }

      // Actualizar tiempo actual
      setPlaybackState(prev => ({ ...prev, currentTime: eventTime }));

      // Siguiente evento
      playbackData.current.currentEventIndex++;
      scheduleNextEvent();
    }, delay);
  };

  const cleanup = () => {
    if (playbackData.current.timeout) {
      clearTimeout(playbackData.current.timeout);
    }
    
    // Remover event listeners
    if (terminalInstance.current) {
      if (terminalInstance.current._customKeyHandler) {
        // Remover del documento
        document.removeEventListener('keydown', terminalInstance.current._customKeyHandler, true);
        
        // Remover del contenedor del terminal si existe
        if (terminalRef.current) {
          terminalRef.current.removeEventListener('keydown', terminalInstance.current._customKeyHandler, true);
        }
      }
      
      if (terminalInstance.current._contextMenuHandler && terminalRef.current) {
        terminalRef.current.removeEventListener('contextmenu', terminalInstance.current._contextMenuHandler);
      }
      
      terminalInstance.current.dispose();
    }
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--ui-content-bg)'
    }}>
      {/* Header con controles */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--ui-dialog-bg)',
        borderBottom: '1px solid var(--ui-content-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Título */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--ui-dialog-text)' }}>
            {recording?.metadata?.title || recording?.title || 'Grabación'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--ui-dialog-text)', opacity: 0.6 }}>
            {recording?.metadata?.username || recording?.username}@{recording?.metadata?.host || recording?.host}
          </div>
        </div>

        {/* Controles de reproducción */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {!playbackState.isPlaying ? (
            <button
              onClick={play}
              disabled={isLoading || error}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--ui-button-primary)',
                color: 'var(--ui-button-primary-text)',
                cursor: isLoading || error ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isLoading || error ? 0.5 : 1
              }}
            >
              <span className="pi pi-play"></span>
              {playbackData.current.currentEventIndex > 0 ? 'Reanudar' : 'Play'}
            </button>
          ) : (
            <button
              onClick={pause}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: 'var(--ui-button-primary)',
                color: 'var(--ui-button-primary-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span className="pi pi-pause"></span>
              Pausar
            </button>
          )}

          <button
            onClick={stop}
            disabled={!playbackState.isPlaying && playbackData.current.currentEventIndex === 0}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: 'pointer'
            }}
            title="Detener"
          >
            <span className="pi pi-stop"></span>
          </button>

          <button
            onClick={restart}
            disabled={isLoading || error}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: 'pointer'
            }}
            title="Reiniciar"
          >
            <span className="pi pi-refresh"></span>
          </button>

          <button
            onClick={() => {
              if (terminalInstance.current) {
                const selection = terminalInstance.current.getSelection();
                if (selection && window.electron?.clipboard?.writeText) {
                  window.electron.clipboard.writeText(selection);
                  // Mostrar feedback visual temporal
                  const btn = document.activeElement;
                  if (btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '<span class="pi pi-check"></span>';
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                    }, 1000);
                  }
                }
              }
            }}
            disabled={isLoading || error}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: 'pointer'
            }}
            title="Copiar texto seleccionado (Ctrl+C)"
          >
            <span className="pi pi-copy"></span>
          </button>

          {/* Selector de velocidad */}
          <select
            value={playbackState.speed}
            onChange={(e) => changeSpeed(Number(e.target.value))}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--ui-content-border)',
              background: 'var(--ui-button-secondary)',
              color: 'var(--ui-button-secondary-text)',
              cursor: 'pointer'
            }}
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={1.5}>1.5x</option>
            <option value={2}>2x</option>
            <option value={3}>3x</option>
          </select>

          {/* Tiempo */}
          <div style={{
            padding: '8px 12px',
            borderRadius: '6px',
            background: 'var(--ui-content-bg)',
            color: 'var(--ui-dialog-text)',
            fontSize: '13px',
            fontFamily: 'monospace',
            minWidth: '90px',
            textAlign: 'center'
          }}>
            {formatDuration(playbackState.currentTime)} / {formatDuration(playbackState.duration)}
          </div>
        </div>
      </div>

      {/* Barra de progreso interactiva */}
      <div 
        data-progress-bar
        style={{
          height: '12px',
          background: 'var(--ui-content-bg)',
          position: 'relative',
          cursor: 'pointer',
          userSelect: 'none'
        }}
        onMouseDown={(e) => {
          if (!playbackState.duration) return;
          
          e.preventDefault();
          playbackData.current.isDragging = true;
          
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percentage = Math.max(0, Math.min(1, clickX / rect.width));
          const targetTime = percentage * playbackState.duration;
          
          playbackData.current.lastSeekTime = targetTime;
          seekTo(targetTime);
          
          // Agregar listeners globales para arrastre fluido
          const handleGlobalMouseMove = (moveEvent) => {
            if (!playbackData.current.isDragging) return;
            
            const progressBar = document.querySelector('[data-progress-bar]');
            if (progressBar) {
              const barRect = progressBar.getBoundingClientRect();
              const mouseX = moveEvent.clientX - barRect.left;
              const newPercentage = Math.max(0, Math.min(1, mouseX / barRect.width));
              const newTargetTime = newPercentage * playbackState.duration;
              
              // Actualizar solo si hay cambio significativo para evitar llamadas excesivas
              if (Math.abs(newTargetTime - playbackData.current.lastSeekTime) > 0.05) {
                playbackData.current.lastSeekTime = newTargetTime;
                seekTo(newTargetTime);
              }
            }
          };

          const handleGlobalMouseUp = () => {
            playbackData.current.isDragging = false;
            document.removeEventListener('mousemove', handleGlobalMouseMove);
            document.removeEventListener('mouseup', handleGlobalMouseUp);
          };

          document.addEventListener('mousemove', handleGlobalMouseMove);
          document.addEventListener('mouseup', handleGlobalMouseUp);
        }}
        onMouseMove={(e) => {
          // Actualizar tiempo mientras se arrastra dentro del área
          if (playbackData.current.isDragging && playbackState.duration) {
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, mouseX / rect.width));
            const targetTime = percentage * playbackState.duration;
            
            // Actualizar inmediatamente
            if (Math.abs(targetTime - playbackData.current.lastSeekTime) > 0.05) {
              playbackData.current.lastSeekTime = targetTime;
              seekTo(targetTime);
            }
          }
        }}
        title={`Click o arrastra para navegar. Tiempo actual: ${formatDuration(playbackState.currentTime)} / ${formatDuration(playbackState.duration)}`}
      >
        <div style={{
          height: '100%',
          width: `${playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0}%`,
          background: 'var(--ui-button-primary)',
          transition: playbackState.isPlaying ? 'width 0.1s linear' : 'none',
          position: 'relative'
        }}>
          {/* Indicador de posición */}
          <div style={{
            position: 'absolute',
            right: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--ui-button-primary-text)',
            boxShadow: '0 0 4px rgba(0,0,0,0.3)'
          }}></div>
        </div>
      </div>

      {/* Terminal */}
      <div 
        ref={terminalRef}
        style={{
          flex: 1,
          overflow: 'hidden',
          padding: '8px',
          background: theme?.background || '#1e1e1e'
        }}
      />

      {/* Error display */}
      {error && (
        <div style={{
          padding: '16px',
          background: 'rgba(211, 47, 47, 0.1)',
          border: '1px solid #d32f2f',
          borderRadius: '6px',
          margin: '16px',
          color: '#d32f2f'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
};

export default RecordingPlayerTab;

