import React, { useState, useEffect, useRef } from 'react';

const RDPComponent = ({ 
  tabKey, 
  rdpConfig: initialConfig, 
  isActive, 
  onConnectionStatusChange 
}) => {
  // Estados para la UI
  const [connectionForm, setConnectionForm] = useState({
    host: initialConfig?.host || '',
    user: initialConfig?.user || '',
    password: initialConfig?.password || '',
    port: initialConfig?.port || 3389,
    width: 1280,
    height: 800
  });

  const [sessionState, setSessionState] = useState({
    isConnected: false,
    isConnecting: false,
    sessionId: null,
    pid: null,
    error: null,
    logs: []
  });

  const [activeSessions, setActiveSessions] = useState([]);
  const [rdpAvailable, setRdpAvailable] = useState(false);
  const logsRef = useRef(null);

  // Función para agregar logs
  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = { timestamp, message, type };
    
    setSessionState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-50), logEntry] // Mantener solo últimos 50 logs
    }));
  };

  // Verificar disponibilidad de RDP al cargar
  useEffect(() => {
    const checkRdpAvailability = async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke('rdp:check-available');
        setRdpAvailable(result.available);
        if (!result.available) {
          addLog(`RDP no disponible: ${result.error}`, 'error');
        }
      } catch (error) {
        setRdpAvailable(false);
        addLog(`Error verificando RDP: ${error.message}`, 'error');
      }
    };

    checkRdpAvailability();
  }, []);

  // Función para iniciar sesión RDP
  const handleConnect = async () => {
    if (!rdpAvailable) {
      addLog('Sidecar RDP no disponible', 'error');
      return;
    }

    if (sessionState.isConnecting || sessionState.isConnected) {
      addLog('Ya hay una conexión en progreso o activa', 'warning');
      return;
    }

    // Validar campos
    if (!connectionForm.host || !connectionForm.user || !connectionForm.password) {
      addLog('Por favor, complete todos los campos requeridos', 'error');
      return;
    }

    setSessionState(prev => ({ ...prev, isConnecting: true, error: null }));
    addLog(`Iniciando conexión a ${connectionForm.user}@${connectionForm.host}:${connectionForm.port}...`);

    try {
      const sessionId = `rdp_${tabKey}_${Date.now()}`;
      
      // Configurar la sesión RDP
      const sessionConfig = {
        ...connectionForm,
        sessionId,
        // Los callbacks ya no son necesarios aquí ya que manejamos todo por IPC
      };

      // Iniciar sesión RDP usando IPC
      const result = await window.electron.ipcRenderer.invoke('rdp:start-session', sessionConfig);
      
      addLog(`Sesión iniciada exitosamente - PID: ${result.pid}`, 'success');
      setSessionState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        sessionId: result.sessionId,
        pid: result.pid,
        error: null
      }));

      if (onConnectionStatusChange) {
        onConnectionStatusChange(tabKey, 'connected');
      }

      updateActiveSessions();

    } catch (error) {
      addLog(`Error al iniciar sesión: ${error.message}`, 'error');
      setSessionState(prev => ({
        ...prev,
        isConnecting: false,
        error: error.message
      }));

      if (onConnectionStatusChange) {
        onConnectionStatusChange(tabKey, 'error', error.message);
      }
    }
  };

  // Función para desconectar sesión
  const handleDisconnect = async () => {
    if (!sessionState.sessionId) {
      addLog('No hay sesión activa para desconectar', 'warning');
      return;
    }

    try {
      await window.electron.ipcRenderer.invoke('rdp:stop-session', sessionState.sessionId);
      addLog(`Desconectando sesión ${sessionState.sessionId}...`, 'info');
      
      setSessionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        sessionId: null,
        pid: null
      }));

      if (onConnectionStatusChange) {
        onConnectionStatusChange(tabKey, 'disconnected');
      }

      updateActiveSessions();
    } catch (error) {
      addLog(`Error al desconectar: ${error.message}`, 'error');
    }
  };

  // Función para actualizar lista de sesiones activas
  const updateActiveSessions = async () => {
    try {
      const sessions = await window.electron.ipcRenderer.invoke('rdp:get-active-sessions');
      setActiveSessions(sessions);
    } catch (error) {
      console.error('Error al obtener sesiones activas:', error);
    }
  };

  // Actualizar sesiones activas periódicamente
  useEffect(() => {
    const interval = setInterval(updateActiveSessions, 2000);
    updateActiveSessions(); // Actualizar inmediatamente
    
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [sessionState.logs]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (sessionState.sessionId) {
        // No usar await en cleanup, hacer la llamada async sin esperar
        window.electron.ipcRenderer.invoke('rdp:stop-session', sessionState.sessionId)
          .catch(error => {
            console.error('Error al limpiar sesión:', error);
          });
      }
    };
  }, [sessionState.sessionId]);

  return (
    <div style={{ 
      padding: '20px', 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      gap: '20px',
      backgroundColor: '#1a1a1a',
      color: '#ffffff'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        <h2 style={{ margin: 0, color: '#4CAF50' }}>🖥️ Sesión RDP - FreeRDP Sidecar</h2>
        <p style={{ margin: '5px 0 0 0', color: '#888', fontSize: '14px' }}>
          Tab: {tabKey} | Sesiones activas: {activeSessions.length}
        </p>
      </div>

      {/* Formulario de conexión */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        padding: '20px', 
        borderRadius: '8px',
        border: '1px solid #333'
      }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#FFA726' }}>Configuración de Conexión</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Host/IP:</label>
            <input
              type="text"
              value={connectionForm.host}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, host: e.target.value }))}
              placeholder="192.168.1.100"
              disabled={sessionState.isConnected || sessionState.isConnecting}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Puerto:</label>
            <input
              type="number"
              value={connectionForm.port}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, port: parseInt(e.target.value) || 3389 }))}
              disabled={sessionState.isConnected || sessionState.isConnecting}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Usuario:</label>
            <input
              type="text"
              value={connectionForm.user}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, user: e.target.value }))}
              placeholder="usuario"
              disabled={sessionState.isConnected || sessionState.isConnecting}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Contraseña:</label>
            <input
              type="password"
              value={connectionForm.password}
              onChange={(e) => setConnectionForm(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              disabled={sessionState.isConnected || sessionState.isConnecting}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Resolución:</label>
            <select
              value={`${connectionForm.width}x${connectionForm.height}`}
              onChange={(e) => {
                const [width, height] = e.target.value.split('x').map(Number);
                setConnectionForm(prev => ({ ...prev, width, height }));
              }}
              disabled={sessionState.isConnected || sessionState.isConnecting}
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '4px',
                border: '1px solid #555',
                backgroundColor: '#333',
                color: '#fff'
              }}
            >
              <option value="1024x768">1024x768</option>
              <option value="1280x800">1280x800</option>
              <option value="1280x1024">1280x1024</option>
              <option value="1366x768">1366x768</option>
              <option value="1440x900">1440x900</option>
              <option value="1920x1080">1920x1080</option>
            </select>
          </div>
        </div>

        {/* Botones */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
          <button
            onClick={handleConnect}
            disabled={sessionState.isConnected || sessionState.isConnecting}
            style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: sessionState.isConnected ? '#666' : '#4CAF50',
              color: '#fff',
              cursor: sessionState.isConnected || sessionState.isConnecting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {sessionState.isConnecting ? '🔄 Conectando...' : sessionState.isConnected ? '✅ Conectado' : '🚀 Conectar'}
          </button>
          
          <button
            onClick={handleDisconnect}
            disabled={!sessionState.isConnected}
            style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: sessionState.isConnected ? '#f44336' : '#666',
              color: '#fff',
              cursor: sessionState.isConnected ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            🛑 Desconectar
          </button>
          
          <button
            onClick={updateActiveSessions}
            style={{
              padding: '10px 20px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: '#2196F3',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🔄 Actualizar
          </button>
        </div>

        {/* Estado actual */}
        {sessionState.isConnected && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#2e7d32', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            ✅ Sesión activa - PID: {sessionState.pid} | ID: {sessionState.sessionId}
          </div>
        )}

        {sessionState.error && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#d32f2f', 
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            ❌ {sessionState.error}
          </div>
        )}
      </div>

      {/* Logs */}
      <div style={{ 
        backgroundColor: '#2a2a2a', 
        border: '1px solid #333',
        borderRadius: '8px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h3 style={{ margin: '0', padding: '15px 20px 10px', color: '#FFA726', borderBottom: '1px solid #333' }}>
          📋 Logs de Sesión
        </h3>
        <div
          ref={logsRef}
          style={{
            flex: 1,
            padding: '10px 20px',
            overflowY: 'auto',
            fontSize: '13px',
            fontFamily: 'monospace',
            lineHeight: '1.4'
          }}
        >
          {sessionState.logs.length === 0 ? (
            <div style={{ color: '#666', fontStyle: 'italic' }}>Sin logs disponibles...</div>
          ) : (
            sessionState.logs.map((log, index) => (
              <div key={index} style={{ 
                marginBottom: '2px',
                color: log.type === 'error' ? '#f44336' : 
                      log.type === 'success' ? '#4CAF50' :
                      log.type === 'warning' ? '#FF9800' : '#ccc'
              }}>
                <span style={{ color: '#666' }}>[{log.timestamp}]</span> {log.message}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lista de sesiones activas */}
      {activeSessions.length > 0 && (
        <div style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '15px', 
          borderRadius: '8px',
          border: '1px solid #333'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#FFA726' }}>🔗 Sesiones Activas ({activeSessions.length})</h3>
          {activeSessions.map((session, index) => (
            <div key={index} style={{ 
              padding: '8px', 
              backgroundColor: '#333', 
              borderRadius: '4px', 
              marginBottom: '5px',
              fontSize: '13px'
            }}>
              <strong>{session.sessionId}</strong> - PID: {session.pid} | 
              Uptime: {Math.floor(session.uptime / 1000)}s | 
              {session.config.user}@{session.config.host}:{session.config.port}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RDPComponent; 