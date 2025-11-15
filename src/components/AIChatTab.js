import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import AIChatPanel from './AIChatPanel';
import ConversationHistory from './ConversationHistory';
import TabbedTerminal from './TabbedTerminal';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';

const AIChatTab = ({
  tab,
  isActiveTab,
  localFontFamily,
  localFontSize,
  localPowerShellTheme,
  localLinuxTerminalTheme
}) => {
  const [showHistory, setShowHistory] = useState(true);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [themeVersion, setThemeVersion] = useState(0);
  const [showLocalTerminal, setShowLocalTerminal] = useState(false);
  const [terminalState, setTerminalState] = useState('normal');
  const [terminalHeight, setTerminalHeight] = useState(250);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);
  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

  // Sincronizar con cambios de pestaña activa
  useEffect(() => {
    if (!isActiveTab && showLocalTerminal) {
      setShowLocalTerminal(false);
    }
  }, [isActiveTab, showLocalTerminal]);

  useEffect(() => {
    if (!showLocalTerminal) {
      setTerminalState('normal');
    }
  }, [showLocalTerminal]);

  const tabbedTerminalRef = useRef(null);
  const pendingCommandRef = useRef(null);
  
  // 🖥️ Función para ejecutar comando en terminal (definida primero)
  const executeCommandInTerminal = useCallback((commandData) => {
    const { command, workingDir, hostId, toolType } = commandData;
    
    console.log('🖥️ executeCommandInTerminal called:', {
      command,
      workingDir,
      hostId,
      toolType,
      hasRef: !!tabbedTerminalRef.current
    });
    
    if (!tabbedTerminalRef.current) {
      console.error('❌ TabbedTerminal ref no está disponible, reintentando...');
      // Reintentar hasta 3 veces con delays incrementales
      const retryCount = commandData._retryCount || 0;
      if (retryCount < 3) {
        const delay = 500 * (retryCount + 1); // 500ms, 1000ms, 1500ms
        console.log(`⏳ Reintento ${retryCount + 1}/3 en ${delay}ms`);
        setTimeout(() => {
          executeCommandInTerminal({ ...commandData, _retryCount: retryCount + 1 });
        }, delay);
      } else {
        console.error('❌ TabbedTerminal no disponible después de 3 reintentos');
      }
      return;
    }
    
    // 🔍 Detectar tipo de comando y determinar el terminal apropiado
    const isUnixCommand = /^(ls|cd|pwd|cat|grep|find|echo|mkdir|rm|cp|mv|touch|vi|vim|nano|ssh|scp|rsync|tar|gzip|gunzip|bzip2|zip|unzip|wget|curl|ps|top|htop|kill|killall|chmod|chown|chgrp|free|df|du|uptime|whoami|uname|which|whereis|man|info|awk|sed|head|tail|less|more|wc|sort|uniq|cut|paste|tee|xargs|basename|dirname|realpath|readlink|ln|file|stat|diff|patch|git|svn|make|gcc|g\+\+|python|python3|perl|ruby|node|npm|yarn|pip|apt|yum|dnf|zypper|pacman|systemctl|service|journalctl|dmesg|lsof|netstat|ss|ip|ifconfig|ping|traceroute|nslookup|dig|host|route|iptables|firewall-cmd|useradd|userdel|usermod|groupadd|groupdel|passwd|su|sudo|crontab|at|batch|watch|tmux|screen|env|export|alias|unalias|history|jobs|fg|bg|nohup|time|strace|ldd|nm|objdump|readelf|hexdump|od|strings|xxd|md5sum|sha1sum|sha256sum|sha512sum|base64|tr|iconv|dos2unix|unix2dos)(\s|$)/.test(command);
    
    console.log('🔍 Detección de comando:', { command, isUnixCommand });
    
    // Obtener el tipo de terminal activo actual
    const activeTabType = tabbedTerminalRef.current.getSelectedTerminalType?.();
    console.log('🎯 Terminal actualmente activo:', activeTabType);
    
    // Determinar el tipo de terminal a usar
    let targetTerminalType = activeTabType || 'powershell';
    
    // Si es un comando Unix y el terminal activo es PowerShell, cambiar a Cygwin
    if (isUnixCommand && targetTerminalType === 'powershell') {
      targetTerminalType = 'cygwin';
      console.log('🔄 Comando Unix detectado, cambiando de PowerShell a Cygwin');
    }
    
    // Construir el comando completo
    let fullCommand = '';
    
    if (toolType === 'execute_ssh' && hostId) {
      // Para SSH, usar el comando ssh directamente (terminal local puede hacer ssh)
      fullCommand = command;
    } else {
      // Para comandos locales
      // 🔧 Convertir rutas de Windows a Cygwin/WSL si es necesario
      let effectiveWorkingDir = workingDir;
      
      if (workingDir && workingDir.includes(':') && (targetTerminalType === 'cygwin' || targetTerminalType === 'wsl' || targetTerminalType === 'ubuntu')) {
        // Es una ruta de Windows (C:\...) y vamos a usar un terminal Unix
        // Convertir a formato Cygwin/WSL: C:\path -> /cygdrive/c/path (Cygwin) o /mnt/c/path (WSL)
        const drive = workingDir.charAt(0).toLowerCase();
        const pathWithoutDrive = workingDir.substring(2).replace(/\\/g, '/');
        
        if (targetTerminalType === 'cygwin') {
          effectiveWorkingDir = `/cygdrive/${drive}${pathWithoutDrive}`;
        } else {
          effectiveWorkingDir = `/mnt/${drive}${pathWithoutDrive}`;
        }
        
        console.log('🔄 Ruta convertida:', { 
          original: workingDir, 
          converted: effectiveWorkingDir,
          terminalType: targetTerminalType 
        });
      }
      
      if (effectiveWorkingDir) {
        fullCommand = `cd "${effectiveWorkingDir}" && ${command}`;
      } else {
        fullCommand = command;
      }
    }
    
    console.log('🎯 Creando/cambiando a terminal:', { 
      targetTerminalType, 
      command: fullCommand 
    });
    
    // Crear o cambiar a la pestaña correcta y ejecutar el comando
    if (tabbedTerminalRef.current.createAndSwitchToTerminal) {
      tabbedTerminalRef.current.createAndSwitchToTerminal(targetTerminalType, fullCommand);
      console.log('✅ Terminal creado/activado y comando enviado');
    } else {
      console.error('❌ createAndSwitchToTerminal no está disponible');
    }
  }, []); // Sin dependencias para evitar recreaciones
  
  // 🎯 Callback reusable para ejecutar comandos en terminal
  const handleExecuteCommandInTerminal = useCallback((commandData) => {
    console.log('🎯 [CALLBACK] AIChatTab.handleExecuteCommandInTerminal llamado:', {
      commandData,
      hasTerminalRef: !!tabbedTerminalRef.current,
      showLocalTerminal,
      terminalState,
      timestamp: new Date().toISOString()
    });
    
    // Guardar comando pendiente
    pendingCommandRef.current = commandData;
    console.log('💾 Comando guardado en pendingCommandRef:', commandData);
    
    // Abrir terminal si está cerrada
    setShowLocalTerminal(prev => {
      console.log('🖥️ [CALLBACK] setShowLocalTerminal: prev =', prev, '-> nuevo estado: true');
      if (!prev) {
        // Se va a abrir, el comando se ejecutará en el useEffect
        console.log('✅ Terminal cerrada, se abrirá y ejecutará en useEffect');
        return true;
      } else {
        // Ya está abierta, ejecutar comando directamente
        console.log('✅ Terminal ya abierta, ejecutando comando directamente en 200ms');
        setTimeout(() => {
          console.log('⏰ Timeout ejecutado, llamando executeCommandInTerminal');
          executeCommandInTerminal(commandData);
        }, 200);
        return true;
      }
    });
    console.log('✅ [CALLBACK] handleExecuteCommandInTerminal completado');
  }, [showLocalTerminal, terminalState, executeCommandInTerminal]);

  useEffect(() => {
    const handleToggleLocalTerminal = (event) => {
      const targetTabKey = event?.detail?.tabKey;
      if (targetTabKey && tab?.key && targetTabKey !== tab.key) return;
      if (!isActiveTab) return;
      setShowLocalTerminal(prev => !prev);
    };

    // 🖥️ NUEVO: Manejar comando a ejecutar en terminal (fallback si no hay callback)
    const handleExecuteCommandFromWindowEvent = (event) => {
      const { command, workingDir, hostId, toolType } = event.detail || {};
      console.log('🖥️ AIChatTab recibió evento window (fallback):', { 
        hasDetail: !!event.detail,
        command, 
        workingDir, 
        hostId, 
        toolType,
        isActiveTab,
        tabKey: tab?.key
      });
      
      if (!command) {
        console.error('❌ Comando vacío recibido');
        return;
      }
      
      // Usar el callback principal
      handleExecuteCommandInTerminal({ command, workingDir, hostId, toolType });
    };

    window.addEventListener('ai-chat-toggle-local-terminal', handleToggleLocalTerminal);
    window.addEventListener('ai-chat-execute-command-in-terminal', handleExecuteCommandFromWindowEvent);
    
    console.log('🖥️ AIChatTab listeners registrados:', { tabKey: tab?.key, isActiveTab });
    
    return () => {
      window.removeEventListener('ai-chat-toggle-local-terminal', handleToggleLocalTerminal);
      window.removeEventListener('ai-chat-execute-command-in-terminal', handleExecuteCommandFromWindowEvent);
      console.log('🖥️ AIChatTab listeners removidos:', { tabKey: tab?.key });
    };
  }, [tab?.key, isActiveTab, handleExecuteCommandInTerminal]); // 🔧 Agregado handleExecuteCommandInTerminal
  
  // 🖥️ Ejecutar comando pendiente cuando la terminal se abre
  useEffect(() => {
    if (showLocalTerminal && pendingCommandRef.current) {
      const commandData = pendingCommandRef.current;
      pendingCommandRef.current = null;
      
      console.log('🖥️ Terminal abierta, ejecutando comando pendiente:', commandData);
      
      // Esperar a que TabbedTerminal esté montado y listo
      setTimeout(() => {
        executeCommandInTerminal(commandData);
      }, 1000); // Aumentado a 1000ms para dar más tiempo
    }
  }, [showLocalTerminal, executeCommandInTerminal]);

  // Obtener el tema actual
  const currentTheme = useMemo(() => {
    return themeManager.getCurrentTheme() || uiThemes['Light'];
  }, [themeVersion]);

  const themeColors = useMemo(() => {
    return {
      background: currentTheme.colors?.contentBackground || '#fafafa',
      cardBackground: currentTheme.colors?.dialogBackground || 'rgba(16, 20, 28, 0.6)',
      textPrimary: currentTheme.colors?.sidebarText || currentTheme.colors?.tabText || '#ffffff',
      textSecondary: currentTheme.colors?.sidebarText || '#9E9E9E',
      borderColor: currentTheme.colors?.sidebarBorder || currentTheme.colors?.contentBorder || 'rgba(255,255,255,0.1)',
      primaryColor: currentTheme.colors?.buttonPrimary || currentTheme.colors?.primaryColor || '#2196f3',
      hoverBackground: currentTheme.colors?.sidebarHover || 'rgba(255,255,255,0.1)',
    };
  }, [currentTheme]);

  const handleConversationSelect = (conversationId) => {
    setCurrentConversationId(conversationId);
    window.dispatchEvent(new CustomEvent('load-conversation', { 
      detail: { conversationId } 
    }));
  };

  const handleNewConversation = () => {
    window.dispatchEvent(new CustomEvent('new-conversation'));
  };

  const handleTerminalMinimize = () => {
    setShowLocalTerminal(false);
  };

  const handleTerminalMaximize = () => {
    setTerminalState(prev => (prev === 'maximized' ? 'normal' : 'maximized'));
  };

  // Manejo del resize del terminal
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newHeight = containerRect.bottom - e.clientY;
      
      // Límites: mínimo 150px, máximo 80% del contenedor
      const minHeight = 150;
      const maxHeight = containerRect.height * 0.8;
      
      setTerminalHeight(Math.max(minHeight, Math.min(newHeight, maxHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  // Definir colores antes de usarlos
  const resolvedBackground = themeColors.background && themeColors.background !== 'transparent'
    ? themeColors.background
    : '#10141c';
  const resolvedCardBackground = currentTheme.colors?.contentBackground || themeColors.cardBackground || resolvedBackground;

  // Sin terminal local o terminal maximizada
  if (!showLocalTerminal) {
    return (
      <>
        <style>
          {`
            /* Scrollbar con colores del tema */
            .conversation-list::-webkit-scrollbar {
              width: 6px !important;
              height: 6px !important;
            }
            .conversation-list::-webkit-scrollbar-track {
              background: var(--ui-sidebar-bg, #1e1e1e) !important;
            }
            .conversation-list::-webkit-scrollbar-thumb {
              background: var(--ui-sidebar-border, #3e3e42) !important;
              border-radius: 3px !important;
              opacity: 0.6 !important;
            }
            .conversation-list::-webkit-scrollbar-thumb:hover {
              background: var(--ui-sidebar-text, #cccccc) !important;
              opacity: 0.8 !important;
            }

            /* Scrollbar para área de mensajes */
            .ai-scrollbar::-webkit-scrollbar {
              width: 6px !important;
              height: 6px !important;
            }
            .ai-scrollbar::-webkit-scrollbar-track {
              background: var(--ui-sidebar-bg, #1e1e1e) !important;
            }
            .ai-scrollbar::-webkit-scrollbar-thumb {
              background: var(--ui-sidebar-border, #3e3e42) !important;
              border-radius: 3px !important;
              opacity: 0.6 !important;
            }
            .ai-scrollbar::-webkit-scrollbar-thumb:hover {
              background: var(--ui-sidebar-text, #cccccc) !important;
              opacity: 0.8 !important;
            }
          `}
        </style>
        <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        background: resolvedBackground,
        overflow: 'hidden'
      }}>
        {showHistory && (
          <div style={{
            width: '300px',
            height: '100%',
            borderRight: `1px solid ${themeColors.borderColor}`,
            background: themeColors.background,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            <ConversationHistory
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              currentConversationId={currentConversationId}
            />
          </div>
        )}

        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: themeColors.background,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <AIChatPanel 
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
            onExecuteCommandInTerminal={handleExecuteCommandInTerminal}
          />
        </div>
      </div>
        </>
    );
  }

  // Terminal maximizada
  if (terminalState === 'maximized') {
    return (
      <>
        <style>
          {`
            .conversation-list::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
            .conversation-list::-webkit-scrollbar-track { background: var(--ui-sidebar-bg, #1e1e1e) !important; }
            .conversation-list::-webkit-scrollbar-thumb { background: var(--ui-sidebar-border, #3e3e42) !important; border-radius: 3px !important; opacity: 0.6 !important; }
            .conversation-list::-webkit-scrollbar-thumb:hover { background: var(--ui-sidebar-text, #cccccc) !important; opacity: 0.8 !important; }
            .ai-scrollbar::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
            .ai-scrollbar::-webkit-scrollbar-track { background: var(--ui-sidebar-bg, #1e1e1e) !important; }
            .ai-scrollbar::-webkit-scrollbar-thumb { background: var(--ui-sidebar-border, #3e3e42) !important; border-radius: 3px !important; opacity: 0.6 !important; }
            .ai-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--ui-sidebar-text, #cccccc) !important; opacity: 0.8 !important; }
          `}
        </style>
        <div style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: resolvedBackground,
        overflow: 'hidden'
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          borderTop: `1px solid ${themeColors.borderColor}`,
          background: resolvedCardBackground,
          overflow: 'hidden'
        }}>
          <TabbedTerminal
            ref={tabbedTerminalRef}
            onMinimize={handleTerminalMinimize}
            onMaximize={handleTerminalMaximize}
            terminalState={terminalState}
            localFontFamily={localFontFamily}
            localFontSize={localFontSize}
            localPowerShellTheme={localPowerShellTheme}
            localLinuxTerminalTheme={localLinuxTerminalTheme}
          />
        </div>
      </div>
      </>
    );
  }

  // Terminal normal con resize
  return (
    <>
      <style>
        {`
          .conversation-list::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
          .conversation-list::-webkit-scrollbar-track { background: var(--ui-sidebar-bg, #1e1e1e) !important; }
          .conversation-list::-webkit-scrollbar-thumb { background: var(--ui-sidebar-border, #3e3e42) !important; border-radius: 3px !important; opacity: 0.6 !important; }
          .conversation-list::-webkit-scrollbar-thumb:hover { background: var(--ui-sidebar-text, #cccccc) !important; opacity: 0.8 !important; }
          .ai-scrollbar::-webkit-scrollbar { width: 6px !important; height: 6px !important; }
          .ai-scrollbar::-webkit-scrollbar-track { background: var(--ui-sidebar-bg, #1e1e1e) !important; }
          .ai-scrollbar::-webkit-scrollbar-thumb { background: var(--ui-sidebar-border, #3e3e42) !important; border-radius: 3px !important; opacity: 0.6 !important; }
          .ai-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--ui-sidebar-text, #cccccc) !important; opacity: 0.8 !important; }
        `}
      </style>
    <div 
      ref={containerRef}
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: resolvedBackground,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Área del chat */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'row',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {showHistory && (
          <div style={{
            width: '300px',
            height: '100%',
            borderRight: `1px solid ${themeColors.borderColor}`,
            background: themeColors.background,
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0
          }}>
            <ConversationHistory
              onConversationSelect={handleConversationSelect}
              onNewConversation={handleNewConversation}
              currentConversationId={currentConversationId}
            />
          </div>
        )}

        <div style={{
          flex: 1,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: themeColors.background,
          minWidth: 0,
          overflow: 'hidden'
        }}>
          <AIChatPanel 
            showHistory={showHistory}
            onToggleHistory={() => setShowHistory(!showHistory)}
            onExecuteCommandInTerminal={handleExecuteCommandInTerminal}
          />
        </div>
      </div>

      {/* Separador redimensionable */}
      <div
        onMouseDown={handleMouseDown}
        style={{
          height: '6px',
          width: '100%',
          background: themeColors.borderColor,
          cursor: 'row-resize',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10,
          userSelect: 'none'
        }}
      >
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '40px',
          height: '4px',
          background: themeColors.primaryColor,
          borderRadius: '2px',
          opacity: 0.6
        }} />
      </div>

      {/* Terminal local */}
      <div style={{
        height: `${terminalHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        borderTop: `1px solid ${themeColors.borderColor}`,
        background: resolvedCardBackground,
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        <TabbedTerminal
          ref={tabbedTerminalRef}
          onMinimize={handleTerminalMinimize}
          onMaximize={handleTerminalMaximize}
          terminalState={terminalState}
          localFontFamily={localFontFamily}
          localFontSize={localFontSize}
          localPowerShellTheme={localPowerShellTheme}
          localLinuxTerminalTheme={localLinuxTerminalTheme}
        />
      </div>
    </div>
    </>
  );
};

export default AIChatTab;
