/**
 * NetworkToolsDialog - Diálogo de herramientas de red y seguridad
 * 
 * Proporciona una interfaz gráfica para:
 * - Ping, Traceroute
 * - Port Scanner, Network Scanner
 * - DNS Lookup, Reverse DNS
 * - SSL/TLS Checker, HTTP Headers
 * - WHOIS, Subnet Calculator, Wake on LAN
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Dropdown } from 'primereact/dropdown';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ScrollPanel } from 'primereact/scrollpanel';
import { Badge } from 'primereact/badge';
import { Tooltip } from 'primereact/tooltip';
import { themeManager } from '../utils/themeManager';
import { uiThemes } from '../themes/ui-themes';
import CvssCalculatorPanel from './network-tools/CvssCalculatorPanel';
import localStorageSyncService from '../services/LocalStorageSyncService';

// Categorías de herramientas
const TOOL_CATEGORIES = [
  {
    id: 'connectivity',
    label: 'Conectividad',
    icon: 'pi pi-wifi',
    color: '#22c55e',
    tools: [
      { id: 'ping', label: 'Ping', icon: 'pi pi-clock', description: 'Test de conectividad con estadísticas' },
      { id: 'traceroute', label: 'Traceroute', icon: 'pi pi-sitemap', description: 'Trazado de rutas de red' }
    ]
  },
  {
    id: 'scanning',
    label: 'Escaneo',
    icon: 'pi pi-search',
    color: '#f59e0b',
    tools: [
      { id: 'port-scan', label: 'Port Scanner', icon: 'pi pi-th-large', description: 'Escaneo de puertos TCP' },
      { id: 'network-scan', label: 'Network Scan', icon: 'pi pi-globe', description: 'Descubrimiento de hosts en red' }
    ]
  },
  {
    id: 'dns',
    label: 'DNS',
    icon: 'pi pi-database',
    color: '#3b82f6',
    tools: [
      { id: 'dns-lookup', label: 'DNS Lookup', icon: 'pi pi-search-plus', description: 'Resolución de registros DNS' },
      { id: 'reverse-dns', label: 'Reverse DNS', icon: 'pi pi-replay', description: 'DNS inverso (IP a hostname)' }
    ]
  },
  {
    id: 'security',
    label: 'Seguridad',
    icon: 'pi pi-shield',
    color: '#ef4444',
    tools: [
      { id: 'ssl-check', label: 'SSL Checker', icon: 'pi pi-lock', description: 'Verificación de certificados SSL/TLS' },
      { id: 'http-headers', label: 'HTTP Headers', icon: 'pi pi-file', description: 'Análisis de cabeceras HTTP' },
      { id: 'host-vuln-scan', label: 'Host Vuln Scanner', icon: 'pi pi-exclamation-triangle', description: 'Detecta vulnerabilidades y CVEs en servicios' },
      { id: 'web-security-scan', label: 'Web Security', icon: 'pi pi-globe', description: 'Analiza seguridad web, headers y cookies' },
      { id: 'cvss-calculator', label: 'CVSS Calculator', icon: 'pi pi-chart-bar', description: 'Calcula CVSS 3.1 y 4.0 · Templates · Reportes HTML/PDF' }
    ]
  },
  {
    id: 'utilities',
    label: 'Utilidades',
    icon: 'pi pi-cog',
    color: '#8b5cf6',
    tools: [
      { id: 'whois', label: 'WHOIS', icon: 'pi pi-id-card', description: 'Información de dominio' },
      { id: 'subnet-calc', label: 'Subnet Calculator', icon: 'pi pi-calculator', description: 'Calculadora de subredes' },
      { id: 'wake-on-lan', label: 'Wake on LAN', icon: 'pi pi-power-off', description: 'Despertar equipos en red' }
    ]
  }
];

// Tipos de registros DNS
const DNS_RECORD_TYPES = [
  { label: 'A (IPv4)', value: 'A' },
  { label: 'AAAA (IPv6)', value: 'AAAA' },
  { label: 'MX (Mail)', value: 'MX' },
  { label: 'TXT', value: 'TXT' },
  { label: 'NS (Name Servers)', value: 'NS' },
  { label: 'SOA (Authority)', value: 'SOA' },
  { label: 'CNAME', value: 'CNAME' },
  { label: 'Todos', value: 'ALL' }
];

// Helper to convert hex colors to rgba with opacity
const hexToRgba = (hex, alpha) => {
  if (!hex) return 'transparent';
  hex = hex.replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const NetworkToolsDialog = ({ visible, onHide, standalone = false, toolId = null }) => {
  // Estados principales
  const [selectedCategory, setSelectedCategory] = useState(() => {
    if (standalone && toolId) {
      const cat = TOOL_CATEGORIES.find(c => c.tools.some(t => t.id === toolId));
      return cat?.id || 'connectivity';
    }
    return 'connectivity';
  });
  const [selectedTool, setSelectedTool] = useState(() => {
    if (standalone && toolId) return toolId;
    return 'ping';
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);
  const [liveOutput, setLiveOutput] = useState(''); // Salida en tiempo real
  
  // Estados para tamaño y posición del diálogo
  const [dialogSize, setDialogSize] = useState(() => {
    try {
      const saved = localStorage.getItem('network-tools-dialog-size');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          width: Math.max(800, Math.min(window.innerWidth * 0.95, parsed.width || window.innerWidth * 0.9)),
          height: Math.max(600, Math.min(window.innerHeight * 0.95, parsed.height || window.innerHeight * 0.85))
        };
      }
    } catch (e) {
      console.warn('Error loading dialog size:', e);
    }
    return {
      width: window.innerWidth * 0.9,
      height: window.innerHeight * 0.85
    };
  });

  // Estados de inputs para cada herramienta
  const [pingHost, setPingHost] = useState('');
  const [pingCount, setPingCount] = useState(4);
  
  const [tracerouteHost, setTracerouteHost] = useState('');
  const [tracerouteMaxHops, setTracerouteMaxHops] = useState(30);
  
  const [portScanHost, setPortScanHost] = useState('');
  const [portScanPorts, setPortScanPorts] = useState('21,22,23,25,53,80,110,143,443,993,995,3306,3389,5432,8080');
  
  const [networkScanSubnet, setNetworkScanSubnet] = useState('');

  // Configuración de escaneo de red
  const [showScanConfig, setShowScanConfig] = useState(false);
  const [scanPingTimeout, setScanPingTimeout] = useState(1000);
  const [scanConcurrency, setScanConcurrency] = useState(50);
  const [scanPortsToScan, setScanPortsToScan] = useState('22,80,135,139,443,445,3389,548,5357');
  const [scanNmapEnabled, setScanNmapEnabled] = useState(true);
  const [scanNetbiosEnabled, setScanNetbiosEnabled] = useState(true);
  
  // Cyberpunk Network Scan states
  const [cyberpunkMode, setCyberpunkMode] = useState(true);
  const [selectedCyberHost, setSelectedCyberHost] = useState(null);
  const [cyberPortsCache, setCyberPortsCache] = useState({});
  const [cyberPortsScanning, setCyberPortsScanning] = useState({});
  const cyberPortsScanningRef = React.useRef(new Set());
  const [cyberVulnsCache, setCyberVulnsCache] = useState({});
  const [cyberVulnsScanning, setCyberVulnsScanning] = useState({});
  const cyberVulnsScanningRef = React.useRef(new Set());
  const [cyberActiveTab, setCyberActiveTab] = useState('details');
  const [cyberPingResults, setCyberPingResults] = useState([]);
  const [cyberScanType, setCyberScanType] = useState('radar');
  const cyberConsoleRef = React.useRef(null);

  // Auto-scroll para la consola cyberpunk
  useEffect(() => {
    if (cyberpunkMode && cyberConsoleRef.current) {
      cyberConsoleRef.current.scrollTop = cyberConsoleRef.current.scrollHeight;
    }
  }, [liveOutput, cyberpunkMode]);
  
  const [dnsLookupDomain, setDnsLookupDomain] = useState('');
  const [dnsLookupType, setDnsLookupType] = useState('A');
  
  const [reverseDnsIp, setReverseDnsIp] = useState('');
  
  const [sslCheckHost, setSslCheckHost] = useState('');
  const [sslCheckPort, setSslCheckPort] = useState(443);
  
  const [httpHeadersUrl, setHttpHeadersUrl] = useState('');
  
  const [whoisDomain, setWhoisDomain] = useState('');
  
  const [subnetCalcCidr, setSubnetCalcCidr] = useState('');
  
  const [wolMac, setWolMac] = useState('');
  const [wolBroadcast, setWolBroadcast] = useState('255.255.255.255');
  const [isSavingDevice, setIsSavingDevice] = useState(false);
  const [saveDeviceName, setSaveDeviceName] = useState('');
  const [wolDevices, setWolDevices] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_wol_devices');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading WoL devices:', e);
      return [];
    }
  });
  const [saveDeviceIp, setSaveDeviceIp] = useState('');
  const [deviceStatuses, setDeviceStatuses] = useState({});

  useEffect(() => {
    try {
      const serialized = JSON.stringify(wolDevices);
      localStorage.setItem('nodeterm_wol_devices', serialized);
      localStorageSyncService.debouncedSync({ nodeterm_wol_devices: serialized });
    } catch (e) {
      console.error('Error saving WoL devices:', e);
    }
  }, [wolDevices]);

  // Estados para Network Scan guardados
  const [isSavingScan, setIsSavingScan] = useState(false);
  const [saveScanName, setSaveScanName] = useState('');
  const [savedScans, setSavedScans] = useState(() => {
    try {
      const saved = localStorage.getItem('nodeterm_saved_network_scans');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading saved network scans:', e);
      return [];
    }
  });
  const [viewingSavedScan, setViewingSavedScan] = useState(null);

  useEffect(() => {
    try {
      const serialized = JSON.stringify(savedScans);
      localStorage.setItem('nodeterm_saved_network_scans', serialized);
      localStorageSyncService.debouncedSync({ nodeterm_saved_network_scans: serialized });
    } catch (e) {
      console.error('Error saving network scans:', e);
    }
  }, [savedScans]);

  // Escuchar actualizaciones externas de settings (sincronización entre instancias)
  useEffect(() => {
    const handleSettingsUpdated = () => {
      try {
        const savedWol = localStorage.getItem('nodeterm_wol_devices');
        if (savedWol) {
          const parsed = JSON.parse(savedWol);
          setWolDevices(prev => {
            if (JSON.stringify(prev) !== savedWol) {
              return parsed;
            }
            return prev;
          });
        }
        
        const savedScansData = localStorage.getItem('nodeterm_saved_network_scans');
        if (savedScansData) {
          const parsedScans = JSON.parse(savedScansData);
          setSavedScans(prev => {
            if (JSON.stringify(prev) !== savedScansData) {
              return parsedScans;
            }
            return prev;
          });
        }
      } catch (err) {
        console.error('Error reloading network tools data from localStorage on settings-updated:', err);
      }
    };

    window.addEventListener('settings-updated', handleSettingsUpdated);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdated);
    };
  }, []);
  
  // Host Vulnerability Scanner
  const [hostVulnHost, setHostVulnHost] = useState('');
  const [hostVulnPorts, setHostVulnPorts] = useState('21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017');
  const [hostVulnUseOnline, setHostVulnUseOnline] = useState(true);
  
  // Web Security Scanner
  const [webSecurityUrl, setWebSecurityUrl] = useState('');
  
  // Estados para secciones expandibles en resultados
  const [expandedSections, setExpandedSections] = useState({});
  
  const [themeVersion, setThemeVersion] = useState(0);

  // Escuchar cambios en el tema
  useEffect(() => {
    const onThemeChanged = () => {
      setThemeVersion(v => v + 1);
    };
    window.addEventListener('theme-changed', onThemeChanged);
    return () => window.removeEventListener('theme-changed', onThemeChanged);
  }, []);

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

  // Cargar interfaces de red al abrir y centrar el diálogo
  useEffect(() => {
    if (standalone) {
      loadNetworkInterfaces();
      return;
    }
    if (visible) {
      loadNetworkInterfaces();
      
      // Centrar el diálogo cuando se abre
      setTimeout(() => {
        const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
        if (dialogElement) {
          // Aplicar tamaño guardado o por defecto
          dialogElement.style.width = `${dialogSize.width}px`;
          dialogElement.style.height = `${dialogSize.height}px`;
          
          // Centrar el diálogo
          const left = (window.innerWidth - dialogSize.width) / 2;
          const top = (window.innerHeight - dialogSize.height) / 2;
          dialogElement.style.left = `${Math.max(0, left)}px`;
          dialogElement.style.top = `${Math.max(0, top)}px`;
          
          // Actualizar estado de mobile
          setIsMobile(dialogSize.width < 1200);
          setWindowWidth(dialogSize.width);
        }
      }, 100);
    }
  }, [visible, dialogSize, standalone]);

  // Escuchar eventos de progreso en tiempo real
  useEffect(() => {
    if (!standalone && !visible) return;

    const handleProgress = (data) => {
      const { tool, data: outputData } = data;
      // Solo actualizar si es la herramienta actual
      if (tool === selectedTool) {
        setLiveOutput(prev => prev + outputData);
      }
    };

    const ipc = window?.electron?.ipcRenderer;
    if (ipc && ipc.on) {
      const unsubscribe = ipc.on('network-tools:progress', handleProgress);
      
      return () => {
        if (unsubscribe && typeof unsubscribe === 'function') {
          unsubscribe();
        } else if (ipc.off) {
          ipc.off('network-tools:progress', handleProgress);
        }
      };
    }
  }, [visible, selectedTool, standalone]);

  // Detectar cambios en el tamaño de la ventana y del diálogo para layout responsive
  useEffect(() => {
    if (standalone) return;
    if (!visible) return;

    // Función para actualizar el estado según el ancho del diálogo
    const updateLayout = () => {
      const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
      if (dialogElement) {
        const width = dialogElement.clientWidth || dialogElement.offsetWidth;
        if (width > 0) {
          setWindowWidth(width);
          setIsMobile(width < 1200);
        }
      }
    };

    // Observar el diálogo cuando esté visible
    let resizeObserver = null;
    let checkInterval = null;
    let mouseMoveHandler = null;
    let mouseUpHandler = null;

    const setupObserver = () => {
      const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
      if (dialogElement && !resizeObserver) {
        resizeObserver = new ResizeObserver((entries) => {
          for (const entry of entries) {
            const width = entry.contentRect.width || entry.target.clientWidth;
            if (width > 0) {
              setWindowWidth(width);
              setIsMobile(width < 1200);
            }
          }
        });
        resizeObserver.observe(dialogElement);

        // Añadir listeners de mouse para detectar redimensionamiento manual
        mouseMoveHandler = () => {
          updateLayout();
        };
        mouseUpHandler = () => {
          updateLayout();
        };

        // Escuchar eventos de mouse en los handles de redimensionamiento
        const handles = dialogElement.querySelectorAll('.p-resizable-handle');
        handles.forEach(handle => {
          handle.addEventListener('mousemove', mouseMoveHandler);
          handle.addEventListener('mouseup', mouseUpHandler);
        });

        // También escuchar en el diálogo completo durante redimensionamiento
        dialogElement.addEventListener('mousemove', mouseMoveHandler);
        dialogElement.addEventListener('mouseup', mouseUpHandler);
      }
    };

    // Intentar configurar el observer inmediatamente
    setTimeout(setupObserver, 100);

    // También intentar periódicamente por si el diálogo se monta después
    checkInterval = setInterval(() => {
      if (!resizeObserver) {
        setupObserver();
      }
    }, 200);

    // Listener para redimensionamiento de ventana
    const handleWindowResize = () => {
      updateLayout();
    };

    window.addEventListener('resize', handleWindowResize);
    updateLayout(); // Llamar una vez al montar

    return () => {
      window.removeEventListener('resize', handleWindowResize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (checkInterval) {
        clearInterval(checkInterval);
      }
      if (mouseMoveHandler) {
        const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
        if (dialogElement) {
          const handles = dialogElement.querySelectorAll('.p-resizable-handle');
          handles.forEach(handle => {
            handle.removeEventListener('mousemove', mouseMoveHandler);
            handle.removeEventListener('mouseup', mouseUpHandler);
          });
          dialogElement.removeEventListener('mousemove', mouseMoveHandler);
          dialogElement.removeEventListener('mouseup', mouseUpHandler);
        }
      }
    };
  }, [visible]);

  const loadNetworkInterfaces = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('network-tools:get-interfaces');
        
        // Validar que result existe y es un objeto
        if (!result || typeof result !== 'object') {
          console.warn('No se pudieron cargar las interfaces de red: Respuesta inválida del servidor');
          setNetworkInterfaces([]);
          return;
        }
        
        // Si hay interfaces (incluso si success es false), usarlas
        if (Array.isArray(result.interfaces)) {
          setNetworkInterfaces(result.interfaces);
          // Auto-fill subnet for network scan based on first interface
          if (result.interfaces.length > 0) {
            const firstInterface = result.interfaces.find(i => i.family === 'IPv4');
            if (firstInterface && firstInterface.cidr) {
              setNetworkScanSubnet(firstInterface.cidr);
            }
          }
        } else {
          setNetworkInterfaces([]);
        }
        
        // Log warning si hay error pero no bloquear la funcionalidad
        if (result.success === false && result.error) {
          console.warn('Advertencia al cargar interfaces de red:', result.error);
        }
      } else {
        console.warn('IPC no disponible para cargar interfaces de red');
        setNetworkInterfaces([]);
      }
    } catch (err) {
      console.error('Error loading network interfaces:', err);
      setNetworkInterfaces([]);
    }
  };

  // Guardar escaneo de red en localStorage
  const handleSaveScan = () => {
    if (!saveScanName.trim()) {
      return;
    }
    if (!networkScanSubnet.trim()) {
      return;
    }

    const currentScanResults = (result && selectedTool === 'network-scan' && result.subnet === networkScanSubnet.trim())
      ? {
          hosts: result.hosts || [],
          scanMode: result.scanMode || 'quick',
          scanTime: result.scanTime || 0,
          timestamp: Date.now()
        }
      : null;

    const newScan = {
      id: Date.now().toString(),
      name: saveScanName.trim(),
      subnet: networkScanSubnet.trim(),
      lastResult: currentScanResults
    };

    setSavedScans(prev => {
      const filtered = prev.filter(s => s.subnet !== newScan.subnet);
      return [...filtered, newScan];
    });

    setIsSavingScan(false);
    setSaveScanName('');
  };

  // Cargar un escaneo guardado
  const handleLoadScan = (scan) => {
    setNetworkScanSubnet(scan.subnet);
    if (scan.lastResult) {
      setResult({
        subnet: scan.subnet,
        hosts: scan.lastResult.hosts,
        scanMode: scan.lastResult.scanMode,
        scanTime: scan.lastResult.scanTime,
        cached: true,
        timestamp: scan.lastResult.timestamp
      });
      setViewingSavedScan(scan);
      setError(null);
    } else {
      setResult(null);
      setViewingSavedScan(null);
    }
  };

  // Eliminar un escaneo guardado
  const handleDeleteSavedScan = (id) => {
    setSavedScans(prev => prev.filter(s => s.id !== id));
    if (viewingSavedScan && viewingSavedScan.id === id) {
      setViewingSavedScan(null);
      setResult(null);
    }
  };

  // Iniciar un escaneo inmediato desde la subred de un escaneo guardado
  const handleQuickScan = (scan, mode = 'quick') => {
    setNetworkScanSubnet(scan.subnet);
    setViewingSavedScan(null);
    executeTool({ subnet: scan.subnet, networkScanMode: mode });
  };

  // Guardar dispositivo WoL en localStorage
  const handleSaveDevice = () => {
    if (!saveDeviceName.trim()) {
      return;
    }
    if (!wolMac.trim()) {
      return;
    }
    
    const cleanMac = wolMac.replace(/[:-]/g, '').toUpperCase();
    if (!/^[0-9A-F]{12}$/.test(cleanMac)) {
      setError('Formato de MAC inválido. Use XX:XX:XX:XX:XX:XX');
      setIsSavingDevice(false);
      return;
    }

    const newDevice = {
      name: saveDeviceName.trim(),
      mac: wolMac.trim(),
      broadcast: wolBroadcast.trim() || '255.255.255.255',
      ip: saveDeviceIp.trim(),
      port: 9
    };

    setWolDevices(prev => {
      const filtered = prev.filter(d => d.mac.replace(/[:-]/g, '').toUpperCase() !== cleanMac);
      return [...filtered, newDevice];
    });

    setIsSavingDevice(false);
    setSaveDeviceName('');
    setSaveDeviceIp('');
  };

  // Cargar un dispositivo guardado en los inputs
  const handleLoadDevice = (device) => {
    setWolMac(device.mac);
    setWolBroadcast(device.broadcast || '255.255.255.255');
    setSaveDeviceIp(device.ip || '');
  };

  // Eliminar un dispositivo guardado
  const handleDeleteDevice = (mac) => {
    setWolDevices(prev => prev.filter(d => d.mac !== mac));
    setDeviceStatuses(prev => {
      const next = { ...prev };
      delete next[mac];
      return next;
    });
  };

  // Despertar un dispositivo directamente desde la lista
  const handleQuickWake = async (device) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveOutput('');
    
    // Cargar en inputs para que el usuario vea qué se está ejecutando
    setWolMac(device.mac);
    setWolBroadcast(device.broadcast || '255.255.255.255');
    setSaveDeviceIp(device.ip || '');
    
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) {
        throw new Error('IPC no disponible');
      }
      
      const response = await ipc.invoke('network-tools:wake-on-lan', {
        mac: device.mac,
        broadcast: device.broadcast || '255.255.255.255',
        port: device.port || 9
      });
      
      if (response && response.success) {
        setResult(response);
        // Esperar un par de segundos y verificar el estado
        setTimeout(() => {
          checkDeviceStatus(device);
        }, 3000);
      } else {
        setError(response?.error || 'No se pudo enviar el magic packet');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar Wake on LAN');
    } finally {
      setLoading(false);
    }
  };

  // Verificar el estado de un dispositivo individual (ping)
  const checkDeviceStatus = async (device) => {
    setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'checking' }));
    
    let targetIp = device.ip || '';
    const ipc = window?.electron?.ipcRenderer;
    
    if (!targetIp && ipc) {
      try {
        const arpResult = await ipc.invoke('network-tools:resolve-mac-ip', { mac: device.mac });
        if (arpResult && arpResult.success && arpResult.ip) {
          targetIp = arpResult.ip;
        }
      } catch (e) {
        console.warn('Error resolviendo IP por ARP:', e);
      }
    }
    
    if (!targetIp || !ipc) {
      setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'unknown' }));
      return;
    }
    
    try {
      const pingResult = await ipc.invoke('network-tools:ping', {
        host: targetIp,
        count: 1,
        timeout: 1
      });
      
      const isOnline = pingResult && pingResult.success && pingResult.received > 0;
      setDeviceStatuses(prev => ({
        ...prev,
        [device.mac]: isOnline ? 'online' : 'offline'
      }));
    } catch (e) {
      setDeviceStatuses(prev => ({ ...prev, [device.mac]: 'offline' }));
    }
  };

  // Verificar el estado de todos los dispositivos
  const checkAllDevicesStatus = useCallback(() => {
    if (selectedTool !== 'wake-on-lan' || wolDevices.length === 0) return;
    wolDevices.forEach(device => {
      checkDeviceStatus(device);
    });
  }, [selectedTool, wolDevices]);

  // Ejecutar verificación de estado periódica
  useEffect(() => {
    if (selectedTool === 'wake-on-lan') {
      checkAllDevicesStatus();
      
      const interval = setInterval(() => {
        checkAllDevicesStatus();
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [selectedTool, wolDevices]);

  // Renderizar la etiqueta de estado online/offline
  const renderStatusBadge = (mac) => {
    const status = deviceStatuses[mac] || 'unknown';
    
    switch (status) {
      case 'online':
        return (
          <span style={{
            background: 'rgba(34, 197, 94, 0.1)',
            color: '#4ade80',
            border: '1px solid rgba(34, 197, 94, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span className="wol-status-dot online" />
            Activo
          </span>
        );
      case 'offline':
        return (
          <span style={{
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span className="wol-status-dot offline" />
            Inactivo
          </span>
        );
      case 'checking':
        return (
          <span style={{
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#60a5fa',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '20px',
            padding: '2px 8px',
            fontSize: '0.65rem',
            fontWeight: '600',
            marginLeft: '0.5rem',
            whiteSpace: 'nowrap',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <i className="pi pi-spin pi-spinner" style={{ fontSize: '0.6rem' }} />
            Verificando
          </span>
        );
      case 'unknown':
      default:
        return null;
    }
  };

  // Renderizar la lista de escaneos de red guardados
  const renderSavedScansList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '1rem' }}>
        <style>{`
          .scan-card {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            background: rgba(30, 25, 45, 0.18) !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.12)} !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
            border-radius: 10px;
            padding: 0.85rem 1rem;
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
          }
          .scan-card:hover {
            transform: translateY(-2px);
            border-color: ${hexToRgba(themeColors.primaryColor, 0.4)} !important;
            box-shadow: 0 8px 24px ${hexToRgba(themeColors.primaryColor, 0.15)} !important;
            background: linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.06)} 0%, rgba(30, 25, 45, 0.02) 100%) !important;
          }
          .scan-action-btn {
            background: ${hexToRgba(themeColors.primaryColor, 0.08)} !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.25)} !important;
            color: ${themeColors.primaryColor} !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .scan-action-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${hexToRgba(themeColors.primaryColor, 0.8)} 100%) !important;
            border-color: transparent !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px ${hexToRgba(themeColors.primaryColor, 0.35)} !important;
          }
        `}</style>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
          <i className="pi pi-globe" style={{ color: themeColors.primaryColor, fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color-secondary)' }}>
            Escaneos guardados
          </span>
          <span style={{ 
            background: hexToRgba(themeColors.primaryColor, 0.08), 
            color: themeColors.primaryColor, 
            border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.2)}`,
            borderRadius: '12px',
            padding: '1px 5px',
            fontSize: '0.65rem',
            fontWeight: '600',
            lineHeight: 1
          }}>
            {savedScans.length}
          </span>
        </div>

        {savedScans.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            background: 'rgba(255,255,255,0.02)',
            border: `1px dashed ${hexToRgba(themeColors.primaryColor, 0.25)}`,
            borderRadius: '8px',
            color: 'var(--text-color-secondary)',
            textAlign: 'center'
          }}>
            <i className="pi pi-info-circle" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: themeColors.primaryColor, opacity: 0.6 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>No hay escaneos guardados</span>
            <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.6, maxWidth: '320px' }}>
              Escribe una subred arriba, realiza un escaneo y haz clic en "Guardar Escaneo" para conservarlo y ver su historial.
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {savedScans.map((scan) => {
              const dateStr = scan.lastResult?.timestamp 
                ? new Date(scan.lastResult.timestamp).toLocaleString()
                : 'Nunca escaneado';
              const hostsCount = scan.lastResult?.hosts?.length ?? 0;
              const isCurrentlyViewing = viewingSavedScan?.id === scan.id;

              return (
                <div 
                  key={scan.id}
                  className="scan-card"
                  style={{
                    border: isCurrentlyViewing ? `1.5px solid ${themeColors.primaryColor}` : undefined,
                    boxShadow: isCurrentlyViewing ? `0 0 12px ${hexToRgba(themeColors.primaryColor, 0.3)}` : undefined
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '75%', overflow: 'hidden' }}>
                      <i className="pi pi-folder" style={{ color: themeColors.primaryColor, fontSize: '0.85rem', opacity: 0.9 }} />
                      <span 
                        style={{ 
                          fontWeight: '600', 
                          fontSize: '0.85rem', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis', 
                          whiteSpace: 'nowrap',
                          color: '#ffffff'
                        }}
                        title={scan.name}
                      >
                        {scan.name}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                      <Button 
                        icon="pi pi-pencil" 
                        onClick={() => {
                          setNetworkScanSubnet(scan.subnet);
                          setViewingSavedScan(null);
                        }}
                        className="wol-control-btn"
                        tooltip="Cargar subred"
                        tooltipOptions={{ position: 'top' }}
                      />
                      <Button 
                        icon="pi pi-trash" 
                        onClick={() => handleDeleteSavedScan(scan.id)}
                        className="wol-control-btn wol-control-btn-danger"
                        tooltip="Eliminar"
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>
                  </div>

                  <div style={{ 
                    fontSize: '0.7rem', 
                    color: 'var(--text-color-secondary)', 
                    fontFamily: 'monospace', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '0.25rem', 
                    borderTop: '1px solid rgba(255,255,255,0.05)', 
                    paddingTop: '0.5rem',
                    marginTop: '0.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>Subred:</span>
                      <span style={{ color: themeColors.textPrimary, fontWeight: '500' }}>{scan.subnet}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>Último escaneo:</span>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>{dateStr}</span>
                    </div>
                    {scan.lastResult && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'rgba(255,255,255,0.45)' }}>Dispositivos:</span>
                        <span style={{ 
                          color: '#22c55e', 
                          fontWeight: 'bold',
                          background: 'rgba(34, 197, 94, 0.1)',
                          padding: '1px 6px',
                          borderRadius: '10px',
                          fontSize: '0.65rem'
                        }}>
                          {hostsCount} activos
                        </span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                    {scan.lastResult && (
                      <Button 
                        label={isCurrentlyViewing ? "Viendo caché" : "Ver caché"}
                        icon="pi pi-eye"
                        onClick={() => handleLoadScan(scan)}
                        disabled={isCurrentlyViewing}
                        style={{
                          borderRadius: '6px',
                          padding: '0.35rem 0.5rem',
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          flex: 1,
                          justifyContent: 'center',
                          height: '28px',
                          background: isCurrentlyViewing ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.08)',
                          border: isCurrentlyViewing ? `1px solid ${hexToRgba(themeColors.primaryColor, 0.4)}` : '1px solid rgba(255,255,255,0.15)',
                          color: isCurrentlyViewing ? themeColors.primaryColor : 'var(--text-color)'
                        }}
                      />
                    )}
                    <Button 
                      label="Escanear"
                      icon="pi pi-play"
                      onClick={() => handleQuickScan(scan, 'quick')}
                      disabled={loading}
                      style={{
                        borderRadius: '6px',
                        padding: '0.35rem 0.5rem',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        flex: 1,
                        justifyContent: 'center',
                        height: '28px'
                      }}
                      className="scan-action-btn"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Renderizar la lista de dispositivos WoL guardados
  const renderWolDevicesList = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
        <style>{`
          .wol-device-card {
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
            background: rgba(30, 25, 45, 0.18) !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.12)} !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
          }
          .wol-device-card:hover {
            transform: translateY(-2px);
            border-color: ${hexToRgba(themeColors.primaryColor, 0.4)} !important;
            box-shadow: 0 8px 24px ${hexToRgba(themeColors.primaryColor, 0.15)} !important;
            background: linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.06)} 0%, rgba(30, 25, 45, 0.02) 100%) !important;
          }
          .wol-action-btn {
            background: ${hexToRgba(themeColors.primaryColor, 0.08)} !important;
            border: 1px solid ${hexToRgba(themeColors.primaryColor, 0.25)} !important;
            color: ${themeColors.primaryColor} !important;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
          }
          .wol-action-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${hexToRgba(themeColors.primaryColor, 0.8)} 100%) !important;
            border-color: transparent !important;
            color: #ffffff !important;
            box-shadow: 0 4px 12px ${hexToRgba(themeColors.primaryColor, 0.35)} !important;
          }
          .wol-control-btn {
            color: rgba(255, 255, 255, 0.4) !important;
            transition: all 0.2s ease !important;
            border-radius: 6px !important;
            width: 26px !important;
            height: 26px !important;
            border: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
          .wol-control-btn:hover {
            background: rgba(255, 255, 255, 0.08) !important;
            color: var(--text-color) !important;
          }
          .wol-control-btn-danger:hover {
            background: rgba(239, 68, 68, 0.12) !important;
            color: #f87171 !important;
          }
          .wol-refresh-btn {
            transition: all 0.2s ease !important;
            color: var(--text-color-secondary) !important;
            border: none !important;
            background: transparent !important;
            width: 22px !important;
            height: 22px !important;
            padding: 0 !important;
          }
          .wol-refresh-btn:hover:not(:disabled) {
            color: ${themeColors.primaryColor} !important;
            background: rgba(255, 255, 255, 0.05) !important;
          }
          @keyframes wol-pulse-green {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 5px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
          @keyframes wol-pulse-red {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70% { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          .wol-status-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            display: inline-block;
          }
          .wol-status-dot.online {
            background-color: #22c55e;
            animation: wol-pulse-green 2s infinite;
          }
          .wol-status-dot.offline {
            background-color: #ef4444;
            animation: wol-pulse-red 2s infinite;
          }
        `}</style>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
          <i className="pi pi-server" style={{ color: themeColors.primaryColor, fontSize: '0.85rem' }} />
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-color-secondary)' }}>
            Dispositivos guardados
          </span>
          <span style={{ 
            background: hexToRgba(themeColors.primaryColor, 0.08), 
            color: themeColors.primaryColor, 
            border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.2)}`,
            borderRadius: '12px',
            padding: '1px 5px',
            fontSize: '0.65rem',
            fontWeight: '600',
            lineHeight: 1
          }}>
            {wolDevices.length}
          </span>
          <Button 
            icon="pi pi-refresh" 
            onClick={checkAllDevicesStatus} 
            className="wol-refresh-btn" 
            tooltip="Refrescar estados"
            tooltipOptions={{ position: 'right' }}
          />
        </div>

        {wolDevices.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2.5rem',
            background: 'rgba(255,255,255,0.02)',
            border: `1px dashed ${hexToRgba(themeColors.primaryColor, 0.25)}`,
            borderRadius: '8px',
            color: 'var(--text-color-secondary)',
            textAlign: 'center'
          }}>
            <i className="pi pi-info-circle" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: themeColors.primaryColor, opacity: 0.6 }} />
            <span style={{ fontSize: '0.8rem', fontWeight: '500' }}>No hay dispositivos guardados</span>
            <span style={{ fontSize: '0.7rem', marginTop: '0.25rem', opacity: 0.6, maxWidth: '280px' }}>
              Introduce una MAC, IP y Broadcast arriba y haz clic en "Guardar" para conservarla.
            </span>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: '1rem'
          }}>
            {wolDevices.map((device, idx) => (
              <div 
                key={idx}
                style={{
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                }}
                className="wol-device-card"
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '75%', overflow: 'hidden' }}>
                    <i className="pi pi-desktop" style={{ color: themeColors.primaryColor, fontSize: '0.85rem', opacity: 0.9 }} />
                    <span 
                      style={{ 
                        fontWeight: '600', 
                        fontSize: '0.85rem', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        color: '#ffffff'
                      }}
                      title={device.name}
                    >
                      {device.name}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                    <Button 
                      icon="pi pi-pencil" 
                      onClick={() => handleLoadDevice(device)}
                      className="wol-control-btn"
                      tooltip="Cargar"
                      tooltipOptions={{ position: 'top' }}
                    />
                    <Button 
                      icon="pi pi-trash" 
                      onClick={() => handleDeleteDevice(device.mac)}
                      className="wol-control-btn wol-control-btn-danger"
                      tooltip="Eliminar"
                      tooltipOptions={{ position: 'top' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', minHeight: '22px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>Estado:</span>
                  {renderStatusBadge(device.mac) || (
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)', marginLeft: '0.5rem', fontStyle: 'italic' }}>
                      Sin verificar
                    </span>
                  )}
                </div>

                <div style={{ 
                  fontSize: '0.7rem', 
                  color: 'var(--text-color-secondary)', 
                  fontFamily: 'monospace', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.25rem', 
                  borderTop: '1px solid rgba(255,255,255,0.05)', 
                  paddingTop: '0.5rem',
                  marginTop: '0.25rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>MAC:</span>
                    <span style={{ color: themeColors.textPrimary, fontWeight: '500' }}>{device.mac}</span>
                  </div>
                  {device.ip && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.45)' }}>IP/Host:</span>
                      <span style={{ color: '#ffffff' }}>{device.ip}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'rgba(255,255,255,0.45)' }}>Broadcast:</span>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>{device.broadcast || '255.255.255.255'}</span>
                  </div>
                </div>

                <Button 
                  label="Despertar"
                  icon="pi pi-power-off"
                  onClick={() => handleQuickWake(device)}
                  disabled={loading}
                  style={{
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    marginTop: '0.4rem',
                    width: '100%',
                    justifyContent: 'center',
                    height: '30px'
                  }}
                  className="wol-action-btn"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Cyberpunk Scan Auto-detect & Scan trigger
  const autoDetectAndScan = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveOutput('');
    setSelectedCyberHost(null);
    setCyberPortsCache({});
    setCyberPortsScanning({});
    cyberPortsScanningRef.current.clear();
    setCyberVulnsCache({});
    setCyberVulnsScanning({});
    cyberVulnsScanningRef.current.clear();
    
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      
      const result = await ipc.invoke('network-tools:get-interfaces');
      let targetSubnet = networkScanSubnet;
      
      if (result && Array.isArray(result.interfaces) && result.interfaces.length > 0) {
        setNetworkInterfaces(result.interfaces);
        // Buscar primera interfaz IPv4 activa y no interna
        const activeInterface = result.interfaces.find(i => i.family === 'IPv4' && !i.internal) || result.interfaces.find(i => i.family === 'IPv4');
        if (activeInterface && activeInterface.cidr) {
          targetSubnet = activeInterface.cidr;
          setNetworkScanSubnet(activeInterface.cidr);
        }
      }
      
      if (!targetSubnet) {
        throw new Error('No se pudo detectar una interfaz de red local IPv4 activa. Por favor, escribe la subred manualmente.');
      }
      
      setCyberpunkMode(true);
      
      // Iniciar el escaneo con el IPC
      const response = await ipc.invoke('network-tools:network-scan', { 
        subnet: targetSubnet.trim(),
        timeout: 400,
        mode: 'quick'
      });
      
      if (!response || response.success === false) {
        throw new Error(response?.error || 'Error ejecutando el escaneo de red');
      }
      
      setResult(response);
    } catch (err) {
      console.error('Error in autoDetectAndScan:', err);
      setError(err?.message || 'Error al autodetectar e iniciar el escaneo');
    } finally {
      setLoading(false);
    }
  };

  const CYBER_SCAN_PORTS = '21,22,23,25,53,80,110,135,139,143,443,445,1433,3306,3389,8080';

  // Cyberpunk Sub-scan: Port Scan (con caché por host)
  const cyberScanPorts = useCallback(async (hostIp, { switchToPortsTab = false } = {}) => {
    if (!hostIp || cyberPortsScanningRef.current.has(hostIp)) return;
    cyberPortsScanningRef.current.add(hostIp);
    setCyberPortsScanning(prev => ({ ...prev, [hostIp]: true }));
    if (switchToPortsTab) setCyberActiveTab('ports');
    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      
      const response = await ipc.invoke('network-tools:port-scan', { 
        host: hostIp, 
        ports: CYBER_SCAN_PORTS,
        timeout: 1000
      });
      setCyberPortsCache(prev => ({ ...prev, [hostIp]: response }));
    } catch (err) {
      console.error(err);
      setCyberPortsCache(prev => ({ ...prev, [hostIp]: { success: false, error: err.message } }));
    } finally {
      cyberPortsScanningRef.current.delete(hostIp);
      setCyberPortsScanning(prev => {
        const next = { ...prev };
        delete next[hostIp];
        return next;
      });
    }
  }, []);

  const scanCyberPortsForHosts = useCallback(async (hosts) => {
    if (!hosts?.length) return;
    const ips = [...new Set(hosts.map(h => h.ip).filter(Boolean))];
    const concurrency = 2;
    for (let i = 0; i < ips.length; i += concurrency) {
      await Promise.all(
        ips.slice(i, i + concurrency).map(ip => cyberScanPorts(ip))
      );
    }
  }, [cyberScanPorts]);

  const cyberScanVulns = useCallback(async (hostIp, activeHostRef = null) => {
    if (!hostIp || cyberVulnsScanningRef.current.has(hostIp)) return;
    cyberVulnsScanningRef.current.add(hostIp);
    setCyberVulnsScanning(prev => ({ ...prev, [hostIp]: true }));

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      // Determine ports to scan
      const knownPorts = [];
      if (activeHostRef?.openPorts) {
        knownPorts.push(...activeHostRef.openPorts);
      }
      const cachedPortsObj = cyberPortsCache[hostIp];
      if (cachedPortsObj?.success && cachedPortsObj.openPorts) {
        knownPorts.push(...cachedPortsObj.openPorts.map(p => p.port));
      }
      const uniquePorts = [...new Set(knownPorts)];
      const portsToScan = uniquePorts.length > 0 ? uniquePorts.map(Number).join(',') : '21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017';

      // 1. Run Host Vulnerability Scan
      const hostVulnResponse = await ipc.invoke('network-tools:host-vuln-scan', {
        host: hostIp,
        ports: portsToScan,
        timeout: 5000,
        useOnline: true
      });

      // 2. Check if web scan is applicable
      let webSecurityResponse = null;
      const hasWebPorts = uniquePorts.map(Number).some(p => p === 80 || p === 443 || p === 8080 || p === 8443);
      if (hasWebPorts) {
        const protocol = uniquePorts.map(Number).some(p => p === 443 || p === 8443) ? 'https' : 'http';
        webSecurityResponse = await ipc.invoke('network-tools:web-security-scan', {
          url: `${protocol}://${hostIp}`,
          timeout: 10000
        });
      }

      setCyberVulnsCache(prev => ({
        ...prev,
        [hostIp]: {
          success: true,
          vulns: hostVulnResponse,
          webSecurity: webSecurityResponse
        }
      }));
    } catch (err) {
      console.error('Error scanning vulnerabilities:', err);
      setCyberVulnsCache(prev => ({
        ...prev,
        [hostIp]: {
          success: false,
          error: err.message
        }
      }));
    } finally {
      cyberVulnsScanningRef.current.delete(hostIp);
      setCyberVulnsScanning(prev => {
        const next = { ...prev };
        delete next[hostIp];
        return next;
      });
    }
  }, [cyberPortsCache]);

  // Cyberpunk Sub-scan: Live Ping
  const [cyberPingActive, setCyberPingActive] = useState(false);
  const cyberPingIntervalRef = React.useRef(null);

  const toggleCyberPing = (hostIp) => {
    if (cyberPingActive) {
      if (cyberPingIntervalRef.current) {
        clearInterval(cyberPingIntervalRef.current);
        cyberPingIntervalRef.current = null;
      }
      setCyberPingActive(false);
    } else {
      setCyberPingActive(true);
      setCyberActiveTab('ping');
      setCyberPingResults([]);
      
      const pingFn = async () => {
        try {
          const ipc = window?.electron?.ipcRenderer;
          if (!ipc) return;
          const start = Date.now();
          const response = await ipc.invoke('network-tools:ping', { 
            host: hostIp, 
            count: 1, 
            timeout: 2 
          });
          const time = Date.now() - start;
          const latency = response && response.success && response.times && response.times.length > 0 
            ? response.times[0] 
            : (response.success ? time : null);
            
          setCyberPingResults(prev => {
            const next = [...prev, latency === null ? -1 : latency];
            if (next.length > 15) next.shift();
            return next;
          });
        } catch (e) {
          setCyberPingResults(prev => {
            const next = [...prev, -1];
            if (next.length > 15) next.shift();
            return next;
          });
        }
      };
      
      pingFn();
      cyberPingIntervalRef.current = setInterval(pingFn, 1500);
    }
  };

  // Limpieza de intervalos
  useEffect(() => {
    return () => {
      if (cyberPingIntervalRef.current) {
        clearInterval(cyberPingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (cyberPingIntervalRef.current) {
      clearInterval(cyberPingIntervalRef.current);
      cyberPingIntervalRef.current = null;
      setCyberPingActive(false);
    }
    setCyberActiveTab('details');
    setCyberPingResults([]);
    if (selectedCyberHost?.ip) {
      if (!cyberPortsCache[selectedCyberHost.ip] && !cyberPortsScanningRef.current.has(selectedCyberHost.ip)) {
        cyberScanPorts(selectedCyberHost.ip);
      }
      
      const isFull = result && (result.scanMode === 'full' || (viewingSavedScan && viewingSavedScan.lastResult?.scanMode === 'full'));
      if (isFull && !cyberVulnsCache[selectedCyberHost.ip] && !cyberVulnsScanningRef.current.has(selectedCyberHost.ip)) {
        const currentHosts = result ? (result.hosts || []) : [];
        const activeHostObj = currentHosts.find(h => h.ip === selectedCyberHost.ip) || selectedCyberHost;
        cyberScanVulns(selectedCyberHost.ip, activeHostObj);
      }
    }
  }, [selectedCyberHost, cyberScanPorts, cyberPortsCache, result, viewingSavedScan, cyberVulnsCache, cyberScanVulns]);

  // Handler genérico para ejecutar herramientas
  const executeTool = useCallback(async (options = {}) => {
    const networkScanMode = options.networkScanMode === 'full' ? 'full' : 'quick';
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveOutput(''); // Limpiar salida anterior
    if (selectedTool === 'network-scan') {
      setCyberPortsCache({});
      setCyberPortsScanning({});
      cyberPortsScanningRef.current.clear();
      setCyberVulnsCache({});
      setCyberVulnsScanning({});
      cyberVulnsScanningRef.current.clear();
      setSelectedCyberHost(null);
    }

    try {
      let response;
      const ipc = window?.electron?.ipcRenderer;
      
      if (!ipc) {
        throw new Error('IPC no disponible');
      }

      switch (selectedTool) {
        case 'ping':
          if (!pingHost.trim()) throw new Error('Host es requerido');
          response = await ipc.invoke('network-tools:ping', { 
            host: pingHost.trim(), 
            count: pingCount,
            timeout: 5 
          });
          break;

        case 'traceroute':
          if (!tracerouteHost.trim()) throw new Error('Host es requerido');
          response = await ipc.invoke('network-tools:traceroute', { 
            host: tracerouteHost.trim(), 
            maxHops: tracerouteMaxHops 
          });
          break;

        case 'port-scan':
          if (!portScanHost.trim()) throw new Error('Host es requerido');
          response = await ipc.invoke('network-tools:port-scan', { 
            host: portScanHost.trim(), 
            ports: portScanPorts,
            timeout: 2000 
          });
          break;

        case 'network-scan':
          const subnetToScan = (options.subnet || networkScanSubnet).trim();
          if (!subnetToScan) throw new Error('Subred es requerida');
          response = await ipc.invoke('network-tools:network-scan', { 
            subnet: subnetToScan,
            timeout: networkScanMode === 'quick' ? 400 : (options.pingTimeout || scanPingTimeout),
            mode: networkScanMode,
            pingTimeout: networkScanMode === 'quick' ? undefined : (options.pingTimeout || scanPingTimeout),
            concurrency: networkScanMode === 'quick' ? undefined : (options.concurrency || scanConcurrency),
            portsToScan: networkScanMode === 'quick' ? undefined : (options.portsToScan !== undefined ? options.portsToScan : scanPortsToScan),
            nmapEnabled: networkScanMode === 'quick' ? undefined : (options.nmapEnabled !== undefined ? options.nmapEnabled : scanNmapEnabled),
            netbiosEnabled: networkScanMode === 'quick' ? undefined : (options.netbiosEnabled !== undefined ? options.netbiosEnabled : scanNetbiosEnabled)
          });
          break;

        case 'dns-lookup':
          if (!dnsLookupDomain.trim()) throw new Error('Dominio es requerido');
          response = await ipc.invoke('network-tools:dns-lookup', { 
            domain: dnsLookupDomain.trim(), 
            type: dnsLookupType 
          });
          break;

        case 'reverse-dns':
          if (!reverseDnsIp.trim()) throw new Error('IP es requerida');
          response = await ipc.invoke('network-tools:reverse-dns', { 
            ip: reverseDnsIp.trim() 
          });
          break;

        case 'ssl-check':
          if (!sslCheckHost.trim()) throw new Error('Host es requerido');
          response = await ipc.invoke('network-tools:ssl-check', { 
            host: sslCheckHost.trim(), 
            port: sslCheckPort 
          });
          break;

        case 'http-headers':
          if (!httpHeadersUrl.trim()) throw new Error('URL es requerida');
          response = await ipc.invoke('network-tools:http-headers', { 
            url: httpHeadersUrl.trim() 
          });
          break;

        case 'host-vuln-scan':
          if (!hostVulnHost.trim()) throw new Error('Host es requerido');
          response = await ipc.invoke('network-tools:host-vuln-scan', { 
            host: hostVulnHost.trim(),
            ports: hostVulnPorts.trim(),
            timeout: 5000,
            useOnline: hostVulnUseOnline
          });
          break;

        case 'web-security-scan':
          if (!webSecurityUrl.trim()) throw new Error('URL es requerida');
          response = await ipc.invoke('network-tools:web-security-scan', { 
            url: webSecurityUrl.trim(),
            timeout: 15000
          });
          break;

        case 'whois':
          if (!whoisDomain.trim()) throw new Error('Dominio es requerido');
          response = await ipc.invoke('network-tools:whois', { 
            domain: whoisDomain.trim() 
          });
          break;

        case 'subnet-calc':
          if (!subnetCalcCidr.trim()) throw new Error('CIDR es requerido');
          response = await ipc.invoke('network-tools:subnet-calc', { 
            cidr: subnetCalcCidr.trim() 
          });
          break;

        case 'wake-on-lan':
          if (!wolMac.trim()) throw new Error('MAC es requerida');
          response = await ipc.invoke('network-tools:wake-on-lan', { 
            mac: wolMac.trim(),
            broadcast: wolBroadcast.trim() || '255.255.255.255'
          });
          break;

        case 'cvss-calculator':
          return;

        default:
          throw new Error('Herramienta no reconocida');
      }

      // Verificar que la respuesta existe y tiene la estructura esperada
      if (!response || typeof response !== 'object') {
        throw new Error('No se recibió respuesta válida del servidor');
      }

      // Verificar si hay un error explícito
      if (response.success === false || response.error) {
        setError(response.error || 'Error desconocido');
        setResult(null);
      } else {
        // Si success es true o undefined (algunas herramientas pueden no tener success)
        // Asegurar que la salida en tiempo real esté incluida si no está en rawOutput
        const finalResult = { ...response };
        if (liveOutput && (!finalResult.rawOutput || finalResult.rawOutput.trim().length === 0)) {
          finalResult.rawOutput = liveOutput;
        } else if (liveOutput && finalResult.rawOutput) {
          // Si hay ambas, usar la más completa
          finalResult.rawOutput = liveOutput.length > finalResult.rawOutput.length ? liveOutput : finalResult.rawOutput;
        }
        setResult(finalResult);
        setError(null);

        // Actualizar la caché de escaneos guardados si esta subred está guardada
        if (selectedTool === 'network-scan') {
          const scannedSubnet = (finalResult.subnet || options.subnet || networkScanSubnet).trim();
          setSavedScans(prev => {
            return prev.map(s => {
              if (s.subnet === scannedSubnet) {
                return {
                  ...s,
                  lastResult: {
                    hosts: finalResult.hosts || [],
                    scanMode: finalResult.scanMode || networkScanMode,
                    scanTime: finalResult.scanTime || 0,
                    timestamp: Date.now()
                  }
                };
              }
              return s;
            });
          });
        }

        if (
          selectedTool === 'network-scan' &&
          finalResult.hosts?.length > 0 &&
          (finalResult.scanMode || networkScanMode) === 'full'
        ) {
          scanCyberPortsForHosts(finalResult.hosts);
        }
      }
    } catch (err) {
      console.error('Error ejecutando herramienta:', err);
      setError(err.message || 'Error desconocido al ejecutar la herramienta');
      setResult(null);
    } finally {
      setLoading(false);
      // Si hay salida en tiempo real, asegurarse de que esté en el resultado
      if (liveOutput && result && !result.rawOutput) {
        setResult(prev => prev ? { ...prev, rawOutput: liveOutput } : prev);
      }
    }
  }, [selectedTool, pingHost, pingCount, tracerouteHost, tracerouteMaxHops, 
      portScanHost, portScanPorts, networkScanSubnet, dnsLookupDomain, dnsLookupType,
      reverseDnsIp, sslCheckHost, sslCheckPort, httpHeadersUrl, whoisDomain,
      subnetCalcCidr, wolMac, wolBroadcast, liveOutput,
      hostVulnHost, hostVulnPorts, hostVulnUseOnline, webSecurityUrl, scanCyberPortsForHosts]);

  // Cambiar herramienta seleccionada
  const handleToolSelect = (categoryId, toolId) => {
    setSelectedCategory(categoryId);
    setSelectedTool(toolId);
    setResult(null);
    setError(null);
    setLiveOutput(''); // Limpiar salida en tiempo real al cambiar de herramienta
  };

  // Renderizar el formulario de la herramienta seleccionada
  const renderToolForm = () => {
    const commonInputStyle = {
      width: '100%',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: '8px',
      color: 'var(--text-color)'
    };

    const labelStyle = {
      display: 'block',
      marginBottom: '0.5rem',
      color: 'var(--text-color-secondary)',
      fontSize: '0.85rem',
      fontWeight: '500'
    };

    const fieldStyle = {
      marginBottom: '1rem'
    };

    switch (selectedTool) {
      case 'ping':
        // Layout especial: formulario en el header
        return null;

      case 'traceroute':
        // Layout especial: formulario en el header
        return null;

      case 'port-scan':
        // Layout especial: formulario en el header
        return null;

      case 'network-scan':
        // Layout especial: formulario en el header
        return null;

      case 'dns-lookup':
        // Layout especial: formulario en el header
        return null;

      case 'reverse-dns':
        // Layout especial: formulario en el header
        return null;

      case 'ssl-check':
        // Layout especial para SSL Checker: inputs horizontales arriba
        return null; // El formulario se renderiza en el header de la herramienta

      case 'http-headers':
        // Layout especial: formulario en el header
        return null;

      case 'host-vuln-scan':
        // Layout especial: formulario en el header
        return null;

      case 'web-security-scan':
        return null;

      case 'cvss-calculator':
        return null;

      case 'whois':
        // Layout especial: formulario en el header
        return null;

      case 'subnet-calc':
        // Layout especial: formulario en el header
        return null;

      case 'wake-on-lan':
        // Layout especial: formulario en el header
        return null;

      default:
        return <div>Selecciona una herramienta</div>;
    }
  };

  // Estilos CSS para el Modo Cyberpunk
  const cyberpunkStyles = `
    @keyframes cyber-flicker {
      0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% { opacity: 0.99; filter: drop-shadow(0 0 8px rgba(0, 240, 255, 0.8)); }
      20%, 24%, 55% { opacity: 0.4; filter: none; }
    }
    @keyframes cyber-radar-sweep {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    @keyframes pulse-green {
      0% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 3px #39ff14); }
      50% { transform: scale(1.3); opacity: 0.8; filter: drop-shadow(0 0 10px #39ff14); }
      100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 3px #39ff14); }
    }
    @keyframes pulse-pink {
      0% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 3px #ff007f); }
      50% { transform: scale(1.3); opacity: 0.8; filter: drop-shadow(0 0 10px #ff007f); }
      100% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 3px #ff007f); }
    }
    @keyframes scanline-anim {
      0% { transform: translateY(-100%); }
      100% { transform: translateY(100%); }
    }
    @keyframes cyber-link-flow {
      0% { stroke-dashoffset: 24; opacity: 0.35; }
      50% { opacity: 0.85; }
      100% { stroke-dashoffset: 0; opacity: 0.35; }
    }
    @keyframes cyber-node-glow {
      0%, 100% { filter: drop-shadow(0 0 4px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor); }
    }
    .cyber-topology-map {
      width: 100%;
      height: 100%;
      min-height: 320px;
      max-height: min(72vh, 620px);
      border: 1px solid rgba(0, 240, 255, 0.2);
      background: radial-gradient(ellipse at center, rgba(0, 40, 60, 0.35) 0%, rgba(0, 5, 12, 0.9) 70%);
      border-radius: 6px;
      overflow: auto;
      padding: 4px;
      box-sizing: border-box;
    }
    .cyber-topology-map svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .cyber-hud {
      font-family: 'Courier New', Courier, monospace;
      background-color: #03080e;
      color: #00f0ff;
      position: relative;
      overflow: hidden;
      border: 2px solid #00f0ff;
      border-radius: 8px;
      box-shadow: 0 0 20px rgba(0, 240, 255, 0.25);
    }
    .cyber-hud::before {
      content: " ";
      display: block;
      position: absolute;
      top: 0; left: 0; bottom: 0; right: 0;
      background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%);
      background-size: 100% 4px;
      z-index: 99;
      pointer-events: none;
    }
    .cyber-scanline {
      position: absolute;
      top: 0; left: 0; right: 0; height: 3px;
      background: rgba(0, 240, 255, 0.3);
      box-shadow: 0 0 8px #00f0ff;
      animation: scanline-anim 6s linear infinite;
      pointer-events: none;
      z-index: 99;
    }
    .cyber-grid-container {
      background-image: 
        linear-gradient(rgba(0, 240, 255, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 240, 255, 0.05) 1px, transparent 1px);
      background-size: 30px 30px;
    }
    .cyber-text-neon {
      color: #00f0ff;
      text-shadow: 0 0 8px rgba(0, 240, 255, 0.7);
      animation: cyber-flicker 5s infinite;
    }
    .cyber-text-green {
      color: #39ff14;
      text-shadow: 0 0 8px rgba(57, 255, 20, 0.7);
    }
    .cyber-text-pink {
      color: #ff007f;
      text-shadow: 0 0 8px rgba(255, 0, 127, 0.7);
    }
    .cyber-card {
      background: rgba(4, 15, 26, 0.75);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 4px;
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
      overflow: visible;
      box-sizing: border-box;
      flex-shrink: 0;
    }
    .cyber-card:hover {
      background: rgba(6, 28, 48, 0.9);
      border-color: #00f0ff;
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.4);
      transform: translateY(-1px);
    }
    .cyber-card-active {
      background: rgba(30, 6, 20, 0.85) !important;
      border-color: #ff007f !important;
      box-shadow: 0 0 12px rgba(255, 0, 127, 0.4) !important;
    }
    .cyber-host-card {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.65rem;
      min-height: unset;
      padding: 6px 12px;
    }
    .cyber-host-card-body {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
      line-height: 1.35;
      padding-top: 1px;
    }
    .cyber-host-ip {
      font-size: 0.8rem;
      font-weight: bold;
      line-height: 1.45;
      word-break: break-all;
    }
    .cyber-host-name {
      font-size: 0.72rem;
      color: rgba(255, 255, 255, 0.65);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cyber-host-meta {
      font-size: 0.65rem;
      color: rgba(0, 240, 255, 0.55);
      line-height: 1.35;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .cyber-host-mac {
      font-size: 0.62rem;
      color: rgba(0, 240, 255, 0.4);
      line-height: 1.35;
      font-family: 'Courier New', Courier, monospace;
      word-break: break-all;
    }
    .cyber-host-latency {
      flex-shrink: 0;
      align-self: center;
      padding: 3px 7px;
      border: 1px solid;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: bold;
      font-family: 'Courier New', Courier, monospace;
      background: rgba(0, 0, 0, 0.45);
      white-space: nowrap;
    }
    .cyber-card::after {
      content: '';
      position: absolute;
      bottom: 0; right: 0;
      width: 6px; height: 6px;
      background: #00f0ff;
      clip-path: polygon(100% 0, 0 100%, 100% 100%);
      pointer-events: none;
    }
    .cyber-card-active::after {
      background: #ff007f;
    }
    .cyber-panel-border {
      border: 1px solid rgba(0, 240, 255, 0.3);
      background: rgba(0, 5, 10, 0.6);
      position: relative;
    }
    .cyber-console-logs {
      background: #010408;
      border: 1px solid rgba(0, 240, 255, 0.25);
      font-family: 'Courier New', Courier, monospace;
      font-size: 0.75rem;
      color: #39ff14;
      overflow-y: auto;
      padding: 0.5rem;
      white-space: pre-wrap;
      text-shadow: 0 0 3px rgba(57, 255, 20, 0.3);
    }
    .cyber-corner-accent::before {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 10px; height: 2px; background: #00f0ff;
    }
    .cyber-corner-accent::after {
      content: '';
      position: absolute;
      top: 0; left: 0; width: 2px; height: 10px; background: #00f0ff;
    }
  `;

  // Parser para extraer hosts del liveOutput en tiempo real
  const parseActiveHostsFromLiveOutput = (outputText) => {
    if (!outputText) return [];
    const lines = outputText.split('\n');
    const hosts = [];
    lines.forEach(line => {
      // Formato: "✓ 192.168.1.1 - ACTIVO (2ms) [1/254] 0.4%"
      const matchActive = line.match(/✓\s+(\d+\.\d+\.\d+\.\d+)\s+-\s+ACTIVO\s+\((\d+)ms\)/);
      if (matchActive) {
        const ip = matchActive[1];
        const responseTime = parseInt(matchActive[2]);
        if (!hosts.some(h => h.ip === ip)) {
          hosts.push({ ip, responseTime, hostname: null });
        }
      }
      
      // Formato: "  192.168.1.1 -> hostname" o "  192.168.1.1 → name | MAC | OS"
      const matchHostname = line.match(/\s+(\d+\.\d+\.\d+\.\d+)\s+(?:->|→)\s+(.+)/);
      if (matchHostname) {
        const ip = matchHostname[1];
        const info = matchHostname[2].trim();
        const parts = info.split('|').map(s => s.trim());
        const hostname = parts[0] && parts[0] !== 'sin nombre' ? parts[0] : null;
        const existing = hosts.find(h => h.ip === ip);
        const macPart = parts.find(p => /^MAC\s/i.test(p));
        const osPart = parts.length > 1 ? parts[parts.length - 1] : null;
        const vendorPart = parts.find(p => p && !/^MAC\s/i.test(p) && p !== hostname && p !== osPart && !/^(sin nombre|Desconocido)/i.test(p));
        if (existing) {
          if (hostname) existing.hostname = hostname;
          if (macPart) existing.mac = macPart.replace(/^MAC\s*/i, '').trim();
          if (vendorPart) existing.vendor = vendorPart;
          if (osPart && osPart !== hostname) existing.os = osPart;
        } else {
          hosts.push({
            ip,
            responseTime: 0,
            hostname,
            mac: macPart ? macPart.replace(/^MAC\s*/i, '').trim() : null,
            vendor: vendorPart || null,
            os: osPart && osPart !== hostname ? osPart : null
          });
        }
      }
    });
    return hosts;
  };

  // Renderizador de Gráfica de Latencia ASCII para Ping Continuo
  const renderPingGraph = () => {
    if (cyberPingResults.length === 0) {
      return <div style={{ color: 'rgba(0, 240, 255, 0.4)', fontStyle: 'italic', padding: '0.5rem' }}>Esperando señales de ping...</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '5px', border: '1px dashed rgba(0, 240, 255, 0.25)', background: '#02060b', borderRadius: '4px' }}>
        {cyberPingResults.map((t, idx) => {
          if (t === -1) {
            return (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#ff0055' }}>
                <span>TRACE #{idx+1}:</span>
                <span>LOST / REQUEST TIMEOUT</span>
              </div>
            );
          }
          const barCount = Math.min(15, Math.max(1, Math.round(t / 10)));
          const bars = "█".repeat(barCount) + "░".repeat(15 - barCount);
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: t < 15 ? '#39ff14' : t < 60 ? '#00f0ff' : '#ffb700' }}>
              <span>TRACE #{idx+1}: {t}ms</span>
              <span style={{ fontFamily: 'monospace' }}>|{bars}|</span>
            </div>
          );
        })}
      </div>
    );
  };

  const getCyberDeviceKind = (host, isGateway = false) => {
    if (isGateway) return 'gateway';
    const os = `${host.os || ''}`.toLowerCase();
    const vendor = `${host.vendor || ''}`.toLowerCase();
    const name = `${host.hostname || host.netbiosName || ''}`.toLowerCase();
    if (os.includes('windows') || name.includes('desktop') || name.includes('pc-')) return 'windows';
    if (os.includes('android') || name.includes('pixel') || name.includes('phone') || vendor.includes('google')) return 'mobile';
    if (os.includes('linux') || os.includes('unix') || name.includes('kepler') || name.includes('server')) return 'server';
    if (name.includes('nest') || name.includes('audio') || name.includes('iot') || vendor.includes('nest')) return 'iot';
    if (vendor.includes('asus') || vendor.includes('router') || vendor.includes('netgear') || name.includes('rt-')) return 'router';
    return 'device';
  };

  const getCyberLatencyColor = (ms) => {
    if (!ms || ms <= 0) return '#6b7b8a';
    if (ms < 50) return '#39ff14';
    if (ms < 120) return '#00f0ff';
    if (ms < 250) return '#ffb700';
    return '#ff5a5a';
  };

  const renderCyberDeviceIcon = (kind, x, y, size, color) => {
    const s = size;
    const icons = {
      gateway: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} stroke={color} strokeWidth="1.2" fill="rgba(0, 240, 255, 0.15)">
          <polygon points={`${s / 2},2 ${s - 2},${s / 2} ${s / 2},${s - 2} 2,${s / 2}`} />
          <line x1={s / 2} y1={s / 2} x2={s / 2} y2={s - 4} stroke={color} />
        </g>
      ),
      router: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill="none" stroke={color} strokeWidth="1.2">
          <rect x="3" y="6" width={s - 6} height={s - 10} rx="2" />
          <line x1="6" y1="4" x2="6" y2="6" /><line x1={s / 2} y1="4" x2={s / 2} y2="6" /><line x1={s - 6} y1="4" x2={s - 6} y2="6" />
        </g>
      ),
      server: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill="none" stroke={color} strokeWidth="1.2">
          <rect x="4" y="3" width={s - 8} height={s - 6} rx="1" />
          <line x1="6" y1="7" x2={s - 6} y2="7" /><line x1="6" y1="11" x2={s - 6} y2="11" />
        </g>
      ),
      windows: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill={color} opacity="0.85">
          <rect x="3" y="3" width={(s - 5) / 2} height={(s - 5) / 2} />
          <rect x={s / 2 + 1} y="3" width={(s - 5) / 2} height={(s - 5) / 2} />
          <rect x="3" y={s / 2 + 1} width={(s - 5) / 2} height={(s - 5) / 2} />
          <rect x={s / 2 + 1} y={s / 2 + 1} width={(s - 5) / 2} height={(s - 5) / 2} />
        </g>
      ),
      mobile: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill="none" stroke={color} strokeWidth="1.2">
          <rect x="5" y="2" width={s - 10} height={s - 4} rx="2" />
          <circle cx={s / 2} cy={s - 5} r="1.2" fill={color} />
        </g>
      ),
      iot: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill="none" stroke={color} strokeWidth="1.2">
          <circle cx={s / 2} cy={s / 2} r={s / 2 - 3} />
          <circle cx={s / 2} cy={s / 2} r="2" fill={color} />
        </g>
      ),
      device: (
        <g transform={`translate(${x - s / 2}, ${y - s / 2})`} fill="none" stroke={color} strokeWidth="1.2">
          <rect x="4" y="5" width={s - 8} height={s - 9} rx="3" />
        </g>
      )
    };
    return icons[kind] || icons.device;
  };

  const computeCyberTopologyLayout = (peripheralHosts, nodeW, nodeH, gwW, gwH) => {
    const n = peripheralHosts.length;
    const sorted = [...peripheralHosts].sort((a, b) => {
      const ao = parseInt(a.ip.split('.').pop(), 10) || 0;
      const bo = parseInt(b.ip.split('.').pop(), 10) || 0;
      return ao - bo;
    });

    const nodeR = Math.hypot(nodeW, nodeH) / 2 + 18;
    const gwR = Math.hypot(gwW, gwH) / 2 + 22;
    const originX = 0;
    const originY = 0;
    const ringCount = n <= 5 ? 1 : n <= 11 ? 2 : 3;
    const rings = Array.from({ length: ringCount }, () => []);

    if (ringCount === 1) {
      rings[0] = sorted;
    } else if (ringCount === 2) {
      const innerN = Math.ceil(n / 2);
      rings[0] = sorted.slice(0, innerN);
      rings[1] = sorted.slice(innerN);
    } else {
      const chunk = Math.ceil(n / 3);
      rings[0] = sorted.slice(0, chunk);
      rings[1] = sorted.slice(chunk, chunk * 2);
      rings[2] = sorted.slice(chunk * 2);
    }

    const particles = [];
    let prevRingRadius = gwR + nodeR + 28;

    rings.forEach((ringHosts, ringIdx) => {
      const count = ringHosts.length;
      if (!count) return;
      const arcRadius = count === 1 ? 100 : (count * (nodeW + 44)) / (2 * Math.PI);
      const ringRadius = Math.max(arcRadius, prevRingRadius + (ringIdx > 0 ? nodeR * 2.5 + 32 : 0));
      prevRingRadius = ringRadius;
      const angleOffset = ringIdx % 2 === 1 ? Math.PI / count : 0;
      ringHosts.forEach((host, i) => {
        const angle = angleOffset + (i / count) * Math.PI * 2 - Math.PI / 2;
        particles.push({
          host,
          x: originX + ringRadius * Math.cos(angle),
          y: originY + ringRadius * Math.sin(angle),
          r: nodeR,
          ringRadius
        });
      });
    });

    const gateway = { x: originX, y: originY, r: gwR, fixed: true };

    const resolveCollisions = () => {
      let moved = false;
      const all = [gateway, ...particles];
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i];
          const b = all[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.max(Math.hypot(dx, dy), 1);
          const overlap = a.r + b.r + 14 - dist;
          if (overlap > 0) {
            const ux = dx / dist;
            const uy = dy / dist;
            const push = overlap * 0.52;
            if (!a.fixed) {
              a.x -= ux * push;
              a.y -= uy * push;
              moved = true;
            }
            if (!b.fixed) {
              b.x += ux * push;
              b.y += uy * push;
              moved = true;
            }
          }
        }
      }
      return moved;
    };

    for (let pass = 0; pass < 6; pass++) {
      for (let iter = 0; iter < 80; iter++) {
        if (!resolveCollisions() && iter > 24) break;
      }
      particles.forEach((p) => {
        const dx = p.x - originX;
        const dy = p.y - originY;
        const dist = Math.max(Math.hypot(dx, dy), 1);
        const pull = (dist - p.ringRadius) * 0.07;
        p.x -= (dx / dist) * pull;
        p.y -= (dy / dist) * pull;
      });
    }

    const halfW = nodeW / 2 + 8;
    const halfH = nodeH / 2 + 8;
    let minX = -gwR;
    let maxX = gwR;
    let minY = -gwR;
    let maxY = gwR;
    particles.forEach((p) => {
      minX = Math.min(minX, p.x - halfW);
      maxX = Math.max(maxX, p.x + halfW);
      minY = Math.min(minY, p.y - halfH);
      maxY = Math.max(maxY, p.y + halfH);
    });

    const pad = 36;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const vb = Math.ceil(Math.max(440, Math.max(contentW, contentH) + pad * 2 + 24));
    const shiftX = pad - minX + (vb - contentW - pad * 2) / 2;
    const shiftY = pad - minY + (vb - contentH - pad * 2 - 18) / 2;

    return {
      vb,
      pad,
      cx: originX + shiftX,
      cy: originY + shiftY,
      orbitRadii: [...new Set(particles.map((p) => p.ringRadius))].sort((a, b) => a - b),
      positions: particles.map((p) => ({
        host: p.host,
        x: p.x + shiftX,
        y: p.y + shiftY
      }))
    };
  };

  // Renderizador de la vista de topología física de red interactiva
  const renderTopologyView = () => {
    const currentHosts = result ? (result.hosts || []) : parseActiveHostsFromLiveOutput(liveOutput);
    if (currentHosts.length === 0) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: '200px', color: 'rgba(0, 240, 255, 0.4)', fontStyle: 'italic' }}>
          [NO ACTIVE NODES DETECTED]
        </div>
      );
    }

    const activeSubnet = result ? result.subnet : networkScanSubnet;
    const gatewayIp = activeSubnet.replace(/\/\d+$/, '').split('.').slice(0, 3).join('.') + '.1';
    const gatewayHost = currentHosts.find(h => h.ip === gatewayIp) || { ip: gatewayIp, responseTime: 1, hostname: 'Gateway' };
    const peripheralHosts = currentHosts.filter(h => h.ip !== gatewayIp);

    const nodeW = 96;
    const nodeH = 52;
    const gwW = 76;
    const gwH = 54;
    const { vb, pad, cx, cy, positions: hostPositions, orbitRadii } = computeCyberTopologyLayout(
      peripheralHosts,
      nodeW,
      nodeH,
      gwW,
      gwH
    );

    const truncateLabel = (text, max = 14) => {
      if (!text) return '';
      return text.length > max ? `${text.slice(0, max)}…` : text;
    };

    const renderNetworkNode = (host, x, y, isGateway = false) => {
      const isSelected = selectedCyberHost?.ip === host.ip;
      const kind = getCyberDeviceKind(host, isGateway);
      const latencyColor = getCyberLatencyColor(host.responseTime);
      const accent = isSelected ? '#ff007f' : latencyColor;
      const lastOctet = host.ip.split('.').pop();
      const displayName = truncateLabel(host.hostname || host.netbiosName || host.vendor, 14);
      const w = isGateway ? gwW : nodeW;
      const h = isGateway ? gwH : nodeH;
      const latencyLabel = host.responseTime > 0 ? `${host.responseTime}ms` : '—';

      return (
        <g
          key={`node-${host.ip}`}
          style={{ cursor: 'pointer' }}
          onClick={() => setSelectedCyberHost(host)}
          transform={`translate(${x - w / 2}, ${y - h / 2})`}
        >
          {isSelected && (
            <rect x="-5" y="-5" width={w + 10} height={h + 10} rx="8" fill="none" stroke="#ff007f" strokeWidth="1.5" opacity="0.55" />
          )}
          <rect
            x="0" y="0" width={w} height={h} rx="7"
            fill={isSelected ? 'rgba(40, 8, 28, 0.95)' : 'rgba(4, 18, 32, 0.94)'}
            stroke={accent}
            strokeWidth={isSelected ? 2 : 1.2}
          />
          <rect x="1" y="1" width={w - 2} height="4" rx="3" fill={accent} opacity="0.9" />
          {isGateway ? (
            <>
              {renderCyberDeviceIcon(kind, w / 2, 22, 24, accent)}
              <text x={w / 2} y={38} textAnchor="middle" fill="#00f0ff" fontSize="9" fontWeight="bold" fontFamily="monospace" dominantBaseline="middle">
                GATEWAY ·{lastOctet}
              </text>
            </>
          ) : (
            <>
              {renderCyberDeviceIcon(kind, 20, h / 2 + 4, 20, accent)}
              <text x={38} y={22} textAnchor="start" fill="#00f0ff" fontSize="9" fontWeight="bold" fontFamily="monospace" dominantBaseline="middle">
                ·{lastOctet}
              </text>
              <text x={38} y={38} textAnchor="start" fill="#e8f4ff" fontSize="8" fontFamily="monospace" dominantBaseline="middle">
                {displayName || host.ip}
              </text>
            </>
          )}
          {host.responseTime > 0 && (
            <>
              <rect
                x={isGateway ? (w - 40) / 2 : w - 44}
                y={h - 18}
                width="40"
                height="14"
                rx="4"
                fill="rgba(0, 8, 16, 0.85)"
                stroke={latencyColor}
                strokeWidth="0.8"
              />
              <text
                x={isGateway ? w / 2 : w - 24}
                y={h - 9}
                textAnchor="middle"
                fill={latencyColor}
                fontSize="7"
                fontWeight="bold"
                fontFamily="monospace"
                dominantBaseline="middle"
              >
                {latencyLabel}
              </text>
            </>
          )}
        </g>
      );
    };

    return (
      <div className="cyber-topology-map">
        <svg viewBox={`0 0 ${vb} ${vb}`} preserveAspectRatio="xMidYMid meet">
          <defs>
            <radialGradient id="cyber-topo-bg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(0, 80, 120, 0.12)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
            <filter id="cyber-link-glow">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <rect x={pad / 2} y={pad / 2} width={vb - pad} height={vb - pad - 14} fill="url(#cyber-topo-bg)" rx="8" />
          {orbitRadii.map((r, i) => (
            <circle
              key={`orbit-${r}-${i}`}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={i === 0 ? 'rgba(0, 240, 255, 0.1)' : 'rgba(0, 240, 255, 0.05)'}
              strokeWidth="1"
              strokeDasharray={i === 0 ? '4 6' : '3 8'}
            />
          ))}
          <circle cx={cx} cy={cy} r="4" fill="#00f0ff" opacity="0.35" />

          {hostPositions.map(({ host, x, y }) => {
            const isSelected = selectedCyberHost?.ip === host.ip;
            const linkColor = isSelected ? '#ff007f' : 'rgba(0, 240, 255, 0.35)';
            return (
              <line
                key={`link-${host.ip}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke={linkColor}
                strokeWidth={isSelected ? 2 : 1}
                strokeDasharray={isSelected ? '6 4' : 'none'}
                style={isSelected ? { animation: 'cyber-link-flow 1.5s linear infinite' } : undefined}
              />
            );
          })}

          {renderNetworkNode(gatewayHost, cx, cy, true)}
          {hostPositions.map(({ host, x, y }) => renderNetworkNode(host, x, y, false))}

          <text x={cx} y={vb - pad + 4} textAnchor="middle" fill="rgba(0, 240, 255, 0.45)" fontSize="8" fontFamily="monospace">
            {peripheralHosts.length} NODO{peripheralHosts.length !== 1 ? 'S' : ''} · CLICK PARA INSPECCIONAR
          </text>
        </svg>
      </div>
    );
  };

  // Renderizador principal del HUD Cyberpunk (utilizado tanto en ejecución como en resultados finales)
  const renderCyberpunkHUD = (isScanning) => {
    const currentHosts = result ? (result.hosts || []) : parseActiveHostsFromLiveOutput(liveOutput);
    const activeHost = selectedCyberHost?.ip
      ? (currentHosts.find(h => h.ip === selectedCyberHost.ip) || selectedCyberHost)
      : null;

    const formatHostSubtitle = (host) => {
      if (host.hostname) return host.hostname;
      if (host.netbiosName) return host.netbiosName;
      if (host.os && host.os !== 'Desconocido') return host.os;
      if (host.vendor) return host.vendor;
      return 'Desconocido';
    };
    
    let progressPercent = 0;
    if (isScanning && liveOutput) {
      const matchPercent = liveOutput.match(/(\d+\.\d+)%/g);
      if (matchPercent && matchPercent.length > 0) {
        const last = matchPercent[matchPercent.length - 1];
        progressPercent = parseFloat(last);
      }
    } else if (!isScanning) {
      progressPercent = 100;
    }

    return (
      <div className="cyber-hud cyber-grid-container" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '480px',
        padding: '1rem',
        gap: '1rem',
        position: 'relative',
        boxSizing: 'border-box'
      }}>
        <style>{cyberpunkStyles}</style>
        
        <div className="cyber-scanline"></div>
        
        {/* Cabecera del Cyber HUD */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid rgba(0, 240, 255, 0.4)',
          paddingBottom: '0.5rem',
          flexShrink: 0
        }}>
          <div>
            <span className="cyber-text-neon" style={{ fontWeight: 'bold', fontSize: '1.1rem', letterSpacing: '2px' }}>
              NET_DECRYPTOR // SUBNET_MAP: {result ? result.subnet : networkScanSubnet}
            </span>
            <div style={{ fontSize: '0.65rem', color: 'rgba(0, 240, 255, 0.6)', marginTop: '2px' }}>
              STATUS: {isScanning ? 'DECRYPTING_RANGE...' : 'SYSTEMS_RESOLVED_SECURE'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(0, 240, 255, 0.6)' }}>FOUND_NODES</div>
              <span className="cyber-text-green" style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                {currentHosts.length} ACTIVE
              </span>
            </div>
            {isScanning && (
              <div style={{
                width: '60px',
                height: '4px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid #00f0ff',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{ width: `${progressPercent}%`, height: '100%', background: '#00f0ff', boxShadow: '0 0 5px #00f0ff' }}></div>
              </div>
            )}
          </div>
        </div>

        {/* Grid de Contenidos */}
        <div style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: '1rem',
          flex: 1,
          minHeight: 0
        }}>
          {/* Columna Izquierda: Radar / Topología */}
          <div className="cyber-panel-border cyber-corner-accent" style={{
            flex: cyberScanType === 'topology' ? '1.6' : '1.2',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.75rem',
            position: 'relative',
            minHeight: cyberScanType === 'topology' ? '420px' : '260px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.5rem',
              borderBottom: '1px dashed rgba(0, 240, 255, 0.2)',
              paddingBottom: '0.25rem',
              flexShrink: 0
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00f0ff' }}>
                [SENSORS_FEED: {cyberScanType.toUpperCase()}]
              </span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button 
                  onClick={() => setCyberScanType('radar')} 
                  style={{ 
                    background: cyberScanType === 'radar' ? '#00f0ff' : 'transparent',
                    color: cyberScanType === 'radar' ? '#000' : '#00f0ff',
                    border: '1px solid #00f0ff',
                    padding: '2px 6px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    borderRadius: '3px'
                  }}
                >
                  RADAR
                </button>
                <button 
                  onClick={() => setCyberScanType('topology')} 
                  style={{ 
                    background: cyberScanType === 'topology' ? '#00f0ff' : 'transparent',
                    color: cyberScanType === 'topology' ? '#000' : '#00f0ff',
                    border: '1px solid #00f0ff',
                    padding: '2px 6px',
                    fontSize: '0.65rem',
                    cursor: 'pointer',
                    borderRadius: '3px'
                  }}
                >
                  MAPA
                </button>
              </div>
            </div>
            
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'stretch',
              justifyContent: 'center',
              minHeight: cyberScanType === 'topology' ? '380px' : 0
            }}>
              {cyberScanType === 'radar' ? (
                <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%', maxWidth: '240px', maxHeight: '240px', margin: 'auto' }}>
                  <defs>
                    <radialGradient id="cyber-radar-fill" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="rgba(0, 240, 255, 0.08)" />
                      <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                    </radialGradient>
                  </defs>
                  <circle cx="100" cy="100" r="90" fill="url(#cyber-radar-fill)" stroke="rgba(0, 240, 255, 0.2)" strokeWidth="1" />
                  <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
                  <circle cx="100" cy="100" r="30" fill="none" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
                  <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
                  <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(0, 240, 255, 0.15)" strokeWidth="1" />
                  <path d="M 100 100 L 100 10 A 90 90 0 0 1 190 100 Z" fill="rgba(0, 240, 255, 0.06)" style={{ transformOrigin: '100px 100px', animation: 'cyber-radar-sweep 4s linear infinite' }} />
                  <line x1="100" y1="100" x2="100" y2="10" stroke="#00f0ff" strokeWidth="1.5" style={{ transformOrigin: '100px 100px', animation: 'cyber-radar-sweep 4s linear infinite' }} />

                  {currentHosts.map((host) => {
                    const lastOctet = parseInt(host.ip.split('.').pop()) || 1;
                    const angle = (lastOctet * 17.5) * (Math.PI / 180);
                    const radius = 25 + (lastOctet % 5) * 12;
                    const x = 100 + radius * Math.cos(angle);
                    const y = 100 + radius * Math.sin(angle);
                    const isSelected = selectedCyberHost?.ip === host.ip;
                    const dotColor = isSelected ? '#ff007f' : getCyberLatencyColor(host.responseTime);
                    const label = host.hostname || host.netbiosName;
                    return (
                      <g key={host.ip} style={{ cursor: 'pointer' }} onClick={() => setSelectedCyberHost(host)}>
                        <circle cx={x} cy={y} r={isSelected ? 7 : 4} fill={dotColor} style={{ animation: isSelected ? 'pulse-pink 2s infinite' : 'pulse-green 2s infinite' }} />
                        <circle cx={x} cy={y} r="12" fill="transparent" />
                        {(isSelected || label) && (
                          <text
                            x={x}
                            y={y - 10}
                            textAnchor="middle"
                            fill={isSelected ? '#ff007f' : '#e8f4ff'}
                            fontSize="7"
                            fontFamily="monospace"
                            opacity={isSelected ? 1 : 0.75}
                          >
                            .{lastOctet}{label ? ` ${String(label).slice(0, 8)}` : ''}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              ) : (
                renderTopologyView()
              )}
            </div>
          </div>

          {/* Columna Central: Lista de Hosts y Terminal Logs */}
          <div style={{
            flex: '1.5',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            minHeight: '260px'
          }}>
            <div className="cyber-panel-border" style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '0.75rem',
              overflow: 'hidden'
            }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#00f0ff', marginBottom: '0.5rem', borderBottom: '1px dashed rgba(0, 240, 255, 0.2)', paddingBottom: '0.25rem', flexShrink: 0 }}>
                [DETECTED_HOSTS]
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: '2px' }}>
                {currentHosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(0, 240, 255, 0.4)', fontStyle: 'italic', fontSize: '0.8rem' }}>
                    {isScanning ? 'Buscando dispositivos activos...' : 'No se encontraron hosts activos en la red.'}
                  </div>
                ) : (
                  currentHosts.map(host => {
                    const isSelected = selectedCyberHost?.ip === host.ip;
                    const latencyColor = getCyberLatencyColor(host.responseTime);
                    return (
                      <div
                        key={host.ip}
                        className={`cyber-card cyber-host-card ${isSelected ? 'cyber-card-active' : ''}`}
                        onClick={() => setSelectedCyberHost(host)}
                      >
                        <div className="cyber-host-card-body">
                          <div className="cyber-host-ip" style={{ color: isSelected ? '#ff007f' : '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>IP: {host.ip}</span>
                            {host.mac && (
                              <span className="cyber-host-mac" style={{ color: isSelected ? 'rgba(255, 0, 127, 0.65)' : 'rgba(0, 240, 255, 0.55)', fontSize: '0.65rem' }}>
                                ({host.mac})
                              </span>
                            )}
                          </div>
                          <div className="cyber-host-name" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '500' }}>{formatHostSubtitle(host)}</span>
                            {host.os && host.os !== 'Desconocido' && host.os !== formatHostSubtitle(host) && (
                              <span className="cyber-host-meta" style={{ fontSize: '0.65rem' }}>({host.os})</span>
                            )}
                            {host.vendor && host.vendor !== 'Desconocido' && host.vendor !== formatHostSubtitle(host) && (
                              <span className="cyber-host-meta" style={{ fontSize: '0.65rem' }}>[{host.vendor}]</span>
                            )}
                          </div>
                        </div>
                        <span
                          className="cyber-host-latency"
                          style={{ borderColor: latencyColor, color: latencyColor }}
                        >
                          {host.responseTime > 0 ? `${host.responseTime} ms` : '—'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div style={{ height: '110px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
              <div style={{ fontSize: '0.65rem', color: '#39ff14', marginBottom: '2px', fontWeight: 'bold' }}>
                LIVE_FEED:
              </div>
              <div ref={cyberConsoleRef} className="cyber-console-logs" style={{ flex: 1 }}>
                {liveOutput || 'LOG_PROBE: Esperando señales de red...'}
              </div>
            </div>
          </div>

          {/* Columna Derecha: Inspector / Panel Lateral de Control */}
          <div className="cyber-panel-border" style={{
            flex: '1.3',
            display: 'flex',
            flexDirection: 'column',
            padding: '0.75rem',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            background: 'rgba(4, 12, 22, 0.8)',
            minHeight: '260px'
          }}>
            {!activeHost ? (
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(0, 240, 255, 0.45)',
                fontSize: '0.75rem',
                textAlign: 'center',
                padding: '1rem',
                border: '1px dashed rgba(0, 240, 255, 0.2)'
              }}>
                <i className="pi pi-lock" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: 'cyber-flicker 4s infinite' }} />
                <span>SELECCIONA UN NODO DE RED</span>
                <span style={{ fontSize: '0.6rem', marginTop: '5px', opacity: 0.8 }}>[AGUARDANDO ANALIZADOR HUD]</span>
              </div>
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ borderBottom: '1px solid rgba(0, 240, 255, 0.3)', paddingBottom: '0.5rem', marginBottom: '0.5rem', flexShrink: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="cyber-text-pink" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>
                      NODE_INSPECTION
                    </span>
                    <button 
                      onClick={() => setSelectedCyberHost(null)} 
                      style={{ background: 'transparent', border: 'none', color: '#ff007f', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Cerrar
                    </button>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#ffffff', marginTop: '0.25rem', fontFamily: 'monospace' }}>
                    {activeHost.ip}
                  </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid rgba(0, 240, 255, 0.2)', marginBottom: '0.5rem', flexShrink: 0 }}>
                  {(() => {
                    const tabs = ['details', 'ports', 'ping'];
                    const isFullScan = result && (result.scanMode === 'full' || (viewingSavedScan && viewingSavedScan.lastResult?.scanMode === 'full'));
                    if (isFullScan) {
                      tabs.push('vulns');
                    }
                    return tabs.map(tab => (
                      <button
                        key={tab}
                        onClick={() => {
                          setCyberActiveTab(tab);
                          if (tab === 'vulns' && activeHost?.ip && !cyberVulnsCache[activeHost.ip] && !cyberVulnsScanning[activeHost.ip]) {
                            cyberScanVulns(activeHost.ip, activeHost);
                          }
                        }}
                        style={{
                          flex: 1,
                          background: cyberActiveTab === tab ? 'rgba(0, 240, 255, 0.15)' : 'transparent',
                          border: 'none',
                          borderBottom: cyberActiveTab === tab ? '2px solid #00f0ff' : 'none',
                          color: cyberActiveTab === tab ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)',
                          padding: '4px 0',
                          fontSize: '0.65rem',
                          cursor: 'pointer',
                          fontWeight: 'bold'
                        }}
                      >
                        {tab === 'vulns' ? 'VULNS' : tab.toUpperCase()}
                      </button>
                    ));
                  })()}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', fontSize: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                  {cyberActiveTab === 'details' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                        <div style={{ color: 'rgba(0, 240, 255, 0.6)', fontSize: '0.6rem' }}>RESOLVED_HOSTNAME</div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.8rem' }}>
                          {activeHost.hostname || activeHost.netbiosName || '[NONE]'}
                        </div>
                        {activeHost.hostnames?.length > 1 && (
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                            {activeHost.hostnames.filter(n => n !== activeHost.hostname).join(', ')}
                          </div>
                        )}
                      </div>

                      <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                        <div style={{ color: 'rgba(0, 240, 255, 0.6)', fontSize: '0.6rem' }}>MAC_ADDRESS</div>
                        <div style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.75rem', fontFamily: 'monospace' }}>
                          {activeHost.mac || '[NO RESUELTA]'}
                        </div>
                        {activeHost.vendor && (
                          <div style={{ fontSize: '0.6rem', color: '#ffb700', marginTop: '2px' }}>{activeHost.vendor}</div>
                        )}
                      </div>

                      <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                        <div style={{ color: 'rgba(0, 240, 255, 0.6)', fontSize: '0.6rem' }}>OPERATING_SYSTEM</div>
                        <div style={{ fontWeight: 'bold', color: '#39ff14', fontSize: '0.8rem' }}>{activeHost.os || 'Desconocido'}</div>
                        {activeHost.deviceType && (
                          <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{activeHost.deviceType}</div>
                        )}
                        {(activeHost.osDetails || activeHost.osSignals?.length > 0) && (
                          <div style={{ fontSize: '0.55rem', color: 'rgba(0, 240, 255, 0.4)', marginTop: '4px', lineHeight: 1.3 }}>
                            {activeHost.osDetails || activeHost.osSignals.join(' · ')}
                          </div>
                        )}
                      </div>

                      {(activeHost.netbiosName || activeHost.netbiosGroup || activeHost.ttl) && (
                        <div style={{ background: 'rgba(255, 0, 127, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(255, 0, 127, 0.15)' }}>
                          <div style={{ color: 'rgba(255, 0, 127, 0.6)', fontSize: '0.6rem' }}>NET_IDENTITY</div>
                          {activeHost.netbiosName && (
                            <div style={{ fontSize: '0.7rem', color: '#fff' }}>NetBIOS: {activeHost.netbiosName}</div>
                          )}
                          {activeHost.netbiosGroup && (
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>Grupo: {activeHost.netbiosGroup}</div>
                          )}
                          {activeHost.ttl != null && (
                            <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>TTL: {activeHost.ttl}</div>
                          )}
                        </div>
                      )}
                      
                      <div style={{ background: 'rgba(0, 240, 255, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(0, 240, 255, 0.15)' }}>
                        <div style={{ color: 'rgba(0, 240, 255, 0.6)', fontSize: '0.6rem' }}>LATENCY_HEALTH</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '3px' }}>
                          <span style={{ fontWeight: 'bold', color: activeHost.responseTime < 30 ? '#39ff14' : '#ffb700' }}>
                            {activeHost.responseTime}ms
                          </span>
                          <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${Math.max(5, 100 - activeHost.responseTime)}%`, 
                              height: '100%', 
                              background: activeHost.responseTime < 30 ? '#39ff14' : '#ffb700' 
                            }}></div>
                          </div>
                        </div>
                      </div>

                      {activeHost.openPorts?.length > 0 && (
                        <div style={{ background: 'rgba(57, 255, 20, 0.05)', padding: '0.5rem', borderRadius: '4px', border: '1px solid rgba(57, 255, 20, 0.15)' }}>
                          <div style={{ color: 'rgba(57, 255, 20, 0.6)', fontSize: '0.6rem' }}>QUICK_PROBE_PORTS</div>
                          <div style={{ fontSize: '0.65rem', color: '#39ff14', fontFamily: 'monospace' }}>
                            {activeHost.openPorts.join(', ')}
                          </div>
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        <Button 
                          label="Analizar Puertos 🔓" 
                          icon="pi pi-shield" 
                          onClick={() => cyberScanPorts(activeHost.ip, { switchToPortsTab: true })}
                          disabled={!!cyberPortsScanning[activeHost.ip]}
                          style={{
                            background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '0.4rem',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            color: '#000',
                            width: '100%',
                            boxShadow: '0 0 5px rgba(0, 240, 255, 0.3)'
                          }}
                        />
                        
                        <Button 
                          label={cyberPingActive ? "Detener Ping ⏹" : "Ping Continuo ⚡"} 
                          icon={cyberPingActive ? "pi pi-stop" : "pi pi-play"} 
                          onClick={() => toggleCyberPing(activeHost.ip)}
                          style={{
                            background: cyberPingActive ? '#ff007f' : 'rgba(255,255,255,0.06)',
                            border: cyberPingActive ? 'none' : '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '4px',
                            padding: '0.4rem',
                            fontSize: '0.7rem',
                            fontWeight: 'bold',
                            color: '#fff',
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {cyberActiveTab === 'ports' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {cyberPortsScanning[activeHost.ip] ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#00f0ff' }}>
                          <ProgressSpinner style={{ width: '20px', height: '20px', marginBottom: '0.5rem' }} />
                          <div>DESENCRIPTANDO PUERTOS...</div>
                        </div>
                      ) : cyberPortsCache[activeHost.ip] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          <div style={{ fontSize: '0.65rem', color: '#ff007f', fontWeight: 'bold' }}>
                            [OPEN_TCP_PORTS_FOUND]
                          </div>
                          {cyberPortsCache[activeHost.ip].success && cyberPortsCache[activeHost.ip].openPorts?.length > 0 ? (
                            cyberPortsCache[activeHost.ip].openPorts.map(p => (
                              <div key={p.port} style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                padding: '4px 6px', 
                                background: 'rgba(57, 255, 20, 0.08)', 
                                border: '1px solid rgba(57, 255, 20, 0.2)',
                                borderRadius: '3px',
                                color: '#39ff14'
                              }}>
                                <span>PORT {p.port}</span>
                                <span style={{ fontWeight: 'bold' }}>{p.service.toUpperCase()}</span>
                              </div>
                            ))
                          ) : (
                            <div style={{ 
                              padding: '8px', 
                              background: 'rgba(255, 0, 127, 0.08)', 
                              border: '1px solid rgba(255, 0, 127, 0.2)',
                              borderRadius: '3px',
                              color: '#ff007f',
                              textAlign: 'center',
                              fontStyle: 'italic'
                            }}>
                              [NO OPEN PORTS DETECTED]
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                          {loading || Object.keys(cyberPortsScanning).length > 0
                            ? 'Escaneando puertos de los hosts detectados...'
                            : 'No hay datos de puertos para este nodo.'}
                        </div>
                      )}
                    </div>
                  )}

                  {cyberActiveTab === 'ping' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px', borderBottom: '1px dashed rgba(0, 240, 255, 0.2)', paddingBottom: '3px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#00f0ff', fontWeight: 'bold' }}>[LATENCY_TRACE_HUD]</span>
                        <span style={{ fontSize: '0.65rem', color: '#ff007f', cursor: 'pointer' }} onClick={() => toggleCyberPing(activeHost.ip)}>
                          {cyberPingActive ? '[DETENER]' : '[PROBAR]'}
                        </span>
                      </div>
                      {renderPingGraph()}
                    </div>
                  )}

                  {cyberActiveTab === 'vulns' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {cyberVulnsScanning[activeHost.ip] ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1rem', flex: 1 }}>
                          <ProgressSpinner style={{ width: '20px', height: '20px' }} />
                          <div style={{ color: '#00f0ff', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textAlign: 'center' }}>
                            ANALIZANDO VULNERABILIDADES...
                          </div>
                          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem', fontStyle: 'italic', textAlign: 'center' }}>
                            Analizando puertos y consultando base de datos de CVEs
                          </div>
                        </div>
                      ) : cyberVulnsCache[activeHost.ip] ? (
                        (() => {
                          const data = cyberVulnsCache[activeHost.ip];
                          if (!data.success) {
                            return (
                              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
                                <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Error al escanear:</div>
                                <div>{data.error || 'Error desconocido'}</div>
                                <Button
                                  label="Reintentar escaneo"
                                  icon="pi pi-refresh"
                                  onClick={() => cyberScanVulns(activeHost.ip, activeHost)}
                                  style={{
                                    marginTop: '0.75rem',
                                    width: '100%',
                                    fontSize: '0.7rem',
                                    padding: '0.3rem',
                                    background: 'transparent',
                                    border: '1px solid #ef4444',
                                    color: '#ef4444'
                                  }}
                                />
                              </div>
                            );
                          }

                          const vulnRes = data.vulns || {};
                          const webSecRes = data.webSecurity || {};
                          const vulnSummary = vulnRes.summary || {};
                          const vulnIssues = vulnSummary.vulnerabilities || {};
                          const webSummary = webSecRes.summary || {};

                          const riskColors = {
                            0: '#22c55e',
                            25: '#84cc16',
                            50: '#f59e0b',
                            75: '#ef4444',
                            100: '#991b1b'
                          };
                          const getRiskColor = (score) => {
                            if (score <= 25) return riskColors[0];
                            if (score <= 50) return riskColors[25];
                            if (score <= 75) return riskColors[50];
                            return riskColors[75];
                          };

                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
                              {/* Risk Score & Web security Grade Row */}
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {/* Risk Score Card */}
                                <div style={{
                                  flex: 1,
                                  background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
                                  borderRadius: '8px',
                                  padding: '0.5rem',
                                  textAlign: 'center',
                                  border: `1px solid ${getRiskColor(vulnSummary.riskScore || 0)}40`
                                }}>
                                  <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>SCORE RIESGO</div>
                                  <div style={{ 
                                    fontSize: '1.4rem', 
                                    fontWeight: 'bold', 
                                    color: getRiskColor(vulnSummary.riskScore || 0),
                                    lineHeight: 1
                                  }}>
                                    {vulnSummary.riskScore || 0}
                                  </div>
                                  <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>/ 100</div>
                                </div>

                                {/* Web security Grade Card */}
                                {webSecRes.success && (
                                  <div style={{
                                    flex: 1,
                                    background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
                                    borderRadius: '8px',
                                    padding: '0.5rem',
                                    textAlign: 'center',
                                    border: '1px solid rgba(0, 240, 255, 0.2)'
                                  }}>
                                    <div style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.15rem' }}>GRADO WEB</div>
                                    <div style={{ 
                                      fontSize: '1.4rem', 
                                      fontWeight: 'bold', 
                                      color: webSummary.grade === 'A' || webSummary.grade === 'B' ? '#22c55e' : webSummary.grade === 'C' ? '#eab308' : '#ef4444',
                                      lineHeight: 1
                                    }}>
                                      {webSummary.grade || 'F'}
                                    </div>
                                    <div style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>Score: {webSummary.score || 0}</div>
                                  </div>
                                )}
                              </div>

                              {/* Vulnerabilities Count Indicators */}
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(4, 1fr)', 
                                gap: '0.25rem',
                                background: 'rgba(0,0,0,0.15)',
                                padding: '0.4rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.05)'
                              }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.5rem', color: '#ef4444' }}>CRIT</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: vulnIssues.critical > 0 ? '#ef4444' : '#666' }}>
                                    {vulnIssues.critical || 0}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.5rem', color: '#f97316' }}>ALTA</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: vulnIssues.high > 0 ? '#f97316' : '#666' }}>
                                    {vulnIssues.high || 0}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.5rem', color: '#eab308' }}>MED</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: vulnIssues.medium > 0 ? '#eab308' : '#666' }}>
                                    {vulnIssues.medium || 0}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '0.5rem', color: '#22c55e' }}>BAJA</div>
                                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: vulnIssues.low > 0 ? '#22c55e' : '#666' }}>
                                    {vulnIssues.low || 0}
                                  </div>
                                </div>
                              </div>

                              {/* Open Ports details */}
                              {vulnRes.ports && vulnRes.ports.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#00f0ff', fontWeight: 'bold', borderBottom: '1px dashed rgba(0, 240, 255, 0.2)', paddingBottom: '2px' }}>
                                    [VULNERABILIDADES_POR_PUERTO]
                                  </div>
                                  {vulnRes.ports.map((port, pIdx) => {
                                    const hasVulns = port.vulnerabilities && port.vulnerabilities.length > 0;
                                    return (
                                      <div key={pIdx} style={{ 
                                        background: 'rgba(255,255,255,0.02)', 
                                        border: '1px solid rgba(255,255,255,0.05)', 
                                        borderRadius: '4px',
                                        padding: '0.4rem'
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                                          <span style={{ fontWeight: 'bold', color: '#fff', fontSize: '0.7rem' }}>
                                            PORT {port.port} ({port.service})
                                          </span>
                                          {port.version && (
                                            <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>
                                              v{port.version}
                                            </span>
                                          )}
                                        </div>

                                        {hasVulns ? (
                                          port.vulnerabilities.map((vuln, vIdx) => (
                                            <div key={vIdx} style={{
                                              padding: '0.3rem',
                                              background: vuln.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.12)' : 
                                                         vuln.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.12)' :
                                                         vuln.severity === 'MEDIUM' ? 'rgba(234, 179, 8, 0.12)' : 'rgba(34, 197, 94, 0.08)',
                                              borderLeft: `2px solid ${vuln.severity === 'CRITICAL' ? '#ef4444' : vuln.severity === 'HIGH' ? '#f97316' : vuln.severity === 'MEDIUM' ? '#eab308' : '#22c55e'}`,
                                              borderRadius: '2px',
                                              marginBottom: '0.25rem',
                                              fontSize: '0.65rem'
                                            }}>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                                <span style={{ fontWeight: 'bold', color: '#fff' }}>{vuln.cve}</span>
                                                <span style={{ 
                                                  fontWeight: 'bold', 
                                                  color: vuln.severity === 'CRITICAL' ? '#ef4444' : vuln.severity === 'HIGH' ? '#f97316' : vuln.severity === 'MEDIUM' ? '#eab308' : '#22c55e'
                                                }}>
                                                  {vuln.severity} ({vuln.score || 'N/A'})
                                                </span>
                                              </div>
                                              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', lineHeight: '1.2' }}>
                                                {vuln.description}
                                              </div>
                                            </div>
                                          ))
                                        ) : (
                                          <div style={{ fontSize: '0.6rem', color: '#22c55e', fontStyle: 'italic' }}>
                                            ✓ Sin vulnerabilidades conocidas
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ textAlign: 'center', padding: '1rem', color: '#22c55e', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '4px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                                  ✓ Sin puertos vulnerables activos.
                                </div>
                              )}

                              {/* Web Security Expanded Details */}
                              {webSecRes.success && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#00f0ff', fontWeight: 'bold', borderBottom: '1px dashed rgba(0, 240, 255, 0.2)', paddingBottom: '2px' }}>
                                    [ANÁLISIS_SEGURIDAD_WEB]
                                  </div>

                                  {/* SSL/TLS Details */}
                                  {webSecRes.ssl && webSecRes.ssl.success && (
                                    <details style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem', color: '#00f0ff', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>🔒 CERTIFICADO SSL/TLS</span>
                                        <span style={{ color: webSecRes.ssl.certificate?.isValid ? '#22c55e' : '#ef4444' }}>
                                          {webSecRes.ssl.certificate?.isValid ? 'VÁLIDO' : 'INVÁLIDO'}
                                        </span>
                                      </summary>
                                      <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem' }}>
                                        {webSecRes.ssl.certificate && (
                                          <>
                                            <div><strong>Emisor:</strong> {webSecRes.ssl.certificate.issuer?.O || webSecRes.ssl.certificate.issuer?.CN || (typeof webSecRes.ssl.certificate.issuer === 'string' ? webSecRes.ssl.certificate.issuer : 'N/A')}</div>
                                            <div><strong>Expira:</strong> {webSecRes.ssl.certificate.validTo || 'N/A'} ({webSecRes.ssl.certificate.daysUntilExpiry || 0} días restantes)</div>
                                            <div><strong>Sujeto:</strong> {webSecRes.ssl.certificate.subject?.CN || webSecRes.ssl.certificate.subject?.O || (typeof webSecRes.ssl.certificate.subject === 'string' ? webSecRes.ssl.certificate.subject : 'N/A')}</div>
                                          </>
                                        )}
                                        {webSecRes.ssl.supportedProtocols && webSecRes.ssl.supportedProtocols.length > 0 && (
                                          <div style={{ marginTop: '3px' }}>
                                            <strong>Protocolos Soportados:</strong>{' '}
                                            {webSecRes.ssl.supportedProtocols.map((p, idx) => (
                                              <Badge 
                                                key={idx} 
                                                value={p.name} 
                                                severity={p.deprecated ? 'danger' : 'success'} 
                                                style={{ fontSize: '0.5rem', marginRight: '2px', padding: '0.1rem 0.25rem' }} 
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </details>
                                  )}

                                  {/* HTTP Headers */}
                                  {webSecRes.headers && Object.keys(webSecRes.headers).length > 0 && (
                                    <details style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem', color: '#00f0ff', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>📋 CABECERAS HTTP DETECTADAS</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                                          {Object.keys(webSecRes.headers).length}
                                        </span>
                                      </summary>
                                      <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.5rem', maxHeight: '150px', overflowY: 'auto' }}>
                                        {Object.entries(webSecRes.headers).map(([key, val]) => (
                                          <div key={key} style={{ borderBottom: '1px dashed rgba(255,255,255,0.03)', paddingBottom: '2px', wordBreak: 'break-all' }}>
                                            <strong style={{ color: '#ffb700' }}>{key}:</strong> {String(val)}
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}

                                  {/* Cookies Security */}
                                  {webSecRes.cookies && webSecRes.cookies.length > 0 && (
                                    <details style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem', color: '#00f0ff', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>🍪 COOKIES DE SESIÓN</span>
                                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>{webSecRes.cookies.length}</span>
                                      </summary>
                                      <div style={{ marginTop: '0.4rem', fontSize: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingLeft: '0.5rem' }}>
                                        {webSecRes.cookies.map((cookie, idx) => (
                                          <div key={idx} style={{ background: 'rgba(0,0,0,0.15)', padding: '0.25rem', borderRadius: '3px' }}>
                                            <div style={{ fontWeight: 'bold', color: '#fff' }}>{cookie.name}</div>
                                            <div style={{ display: 'flex', gap: '0.25rem', marginTop: '2px' }}>
                                              <Badge value="HttpOnly" severity={cookie.httpOnly ? 'success' : 'danger'} style={{ fontSize: '0.5rem', padding: '0.1rem 0.25rem' }} />
                                              <Badge value="Secure" severity={cookie.secure ? 'success' : 'danger'} style={{ fontSize: '0.5rem', padding: '0.1rem 0.25rem' }} />
                                              {cookie.sameSite && <Badge value={`SameSite: ${cookie.sameSite}`} severity="info" style={{ fontSize: '0.5rem', padding: '0.1rem 0.25rem' }} />}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </details>
                                  )}

                                  {/* Failed Checks (Score Deductions) */}
                                  {webSecRes.checks && webSecRes.checks.length > 0 && (
                                    <details open style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '4px', padding: '0.4rem' }}>
                                      <summary style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '0.65rem', color: '#ef4444', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>⚠️ ALERTAS DE SEGURIDAD WEB</span>
                                        <span>{webSecRes.checks.filter(c => c.status !== 'PASS').length} alertas</span>
                                      </summary>
                                      <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {webSecRes.checks.filter(c => c.status !== 'PASS').slice(0, 5).map((check, cIdx) => (
                                          <div key={cIdx} style={{
                                            padding: '0.4rem',
                                            background: check.status === 'FAIL' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(234, 179, 8, 0.08)',
                                            border: `1px solid ${check.status === 'FAIL' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(234, 179, 8, 0.2)'}`,
                                            borderRadius: '4px',
                                            fontSize: '0.65rem'
                                          }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: check.status === 'FAIL' ? '#ef4444' : '#eab308', marginBottom: '2px' }}>
                                              <span>{check.check}</span>
                                              <Badge 
                                                value={check.severity.toUpperCase()} 
                                                severity={check.severity === 'critical' || check.severity === 'high' ? 'danger' : 'warning'} 
                                                style={{ fontSize: '0.55rem', padding: '0.1rem 0.3rem' }}
                                              />
                                            </div>
                                            <div style={{ color: 'rgba(255, 255, 255, 0.75)', fontSize: '0.6rem', lineHeight: '1.2' }}>
                                              {check.details}
                                            </div>
                                            {check.recommendation && (
                                              <div style={{ color: '#fbbf24', fontSize: '0.55rem', marginTop: '3px', fontStyle: 'italic' }}>
                                                💡 {check.recommendation}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                        {webSecRes.checks.filter(c => c.status !== 'PASS').length === 0 && (
                                          <div style={{ fontSize: '0.65rem', color: '#22c55e', fontStyle: 'italic' }}>
                                            ✓ Aprobó todos los checks de cabeceras/cookies.
                                          </div>
                                        )}
                                      </div>
                                    </details>
                                  )}
                                </div>
                              )}

                              {/* Recommendations */}
                              {vulnRes.recommendations && vulnRes.recommendations.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                                  <div style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 'bold', borderBottom: '1px dashed rgba(251, 191, 36, 0.2)', paddingBottom: '2px' }}>
                                    [RECOMENDACIONES_SEGURIDAD]
                                  </div>
                                  {vulnRes.recommendations.slice(0, 3).map((rec, rIdx) => (
                                    <div key={rIdx} style={{
                                      padding: '0.3rem',
                                      background: 'rgba(251, 191, 36, 0.06)',
                                      border: '1px solid rgba(251, 191, 36, 0.15)',
                                      borderRadius: '4px',
                                      fontSize: '0.6rem',
                                      color: 'rgba(255,255,255,0.85)'
                                    }}>
                                      <strong style={{ color: '#fbbf24' }}>[{rec.priority}]</strong> {rec.text}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Manual Scan button */}
                              <Button 
                                label="Volver a Analizar 🔄" 
                                icon="pi pi-shield" 
                                onClick={() => cyberScanVulns(activeHost.ip, activeHost)}
                                disabled={!!cyberVulnsScanning[activeHost.ip]}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid rgba(0, 240, 255, 0.4)',
                                  borderRadius: '4px',
                                  padding: '0.4rem',
                                  fontSize: '0.65rem',
                                  fontWeight: 'bold',
                                  color: '#00f0ff',
                                  width: '100%',
                                  marginTop: '0.5rem',
                                  cursor: 'pointer'
                                }}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '1rem', flex: 1, border: '1px dashed rgba(0, 240, 255, 0.2)', borderRadius: '6px' }}>
                          <i className="pi pi-shield" style={{ fontSize: '1.5rem', color: '#00f0ff' }} />
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>
                            No se han analizado las vulnerabilidades para este nodo.
                          </div>
                          <Button 
                            label="Analizar Vulnerabilidades 🔓" 
                            icon="pi pi-shield" 
                            onClick={() => cyberScanVulns(activeHost.ip, activeHost)}
                            style={{
                              background: 'linear-gradient(135deg, #00f0ff 0%, #0072ff 100%)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.4rem 0.8rem',
                              fontSize: '0.7rem',
                              fontWeight: 'bold',
                              color: '#000',
                              cursor: 'pointer'
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar resultados según la herramienta
  const renderResults = () => {
    // El panel CVSS gestiona su propio estado, no depende de executeTool
    if (selectedTool === 'cvss-calculator') {
      return <CvssCalculatorPanel />;
    }

    // Mostrar salida en tiempo real mientras se ejecuta
    if (loading) {
      const liveOutputStyle = {
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '8px',
        padding: '1rem',
        fontFamily: 'monospace',
        fontSize: isMobile ? '0.75rem' : '0.85rem',
        lineHeight: '1.6',
        color: 'var(--text-color)',
        maxHeight: isMobile ? '400px' : '500px',
        overflow: 'auto',
        wordBreak: 'break-word',
        overflowWrap: 'break-word',
        whiteSpace: 'pre-wrap',
        border: '1px solid rgba(6, 182, 212, 0.3)'
      };

      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem' }}>
            <ProgressSpinner style={{ width: '24px', height: '24px' }} />
            <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.9rem' }}>
              Ejecutando... {liveOutput.length > 0 && <span style={{ color: '#06b6d4' }}>(Mostrando salida en tiempo real)</span>}
            </span>
          </div>
          {liveOutput && (
            <div style={liveOutputStyle}>
              <div style={{ 
                marginBottom: '0.5rem', 
                fontSize: '0.75rem', 
                color: 'var(--text-color-secondary)',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                Salida en tiempo real:
              </div>
              <div style={{ 
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {liveOutput || <span style={{ color: 'var(--text-color-secondary)', fontStyle: 'italic' }}>Esperando salida...</span>}
              </div>
            </div>
          )}
          {!liveOutput && (
            <div style={{ 
              textAlign: 'center', 
              padding: '2rem',
              color: 'var(--text-color-secondary)',
              fontStyle: 'italic'
            }}>
              Iniciando ejecución...
            </div>
          )}
        </div>
      );
    }

    if (error) {
      if (selectedTool === 'wake-on-lan') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            <Message severity="error" text={error} style={{ width: '100%' }} />
            {renderWolDevicesList()}
          </div>
        );
      }
      if (selectedTool === 'network-scan') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            <Message severity="error" text={error} style={{ width: '100%' }} />
            {renderSavedScansList()}
          </div>
        );
      }
      return (
        <Message severity="error" text={error} style={{ width: '100%' }} />
      );
    }

    if (!result) {
      if (selectedTool === 'wake-on-lan') {
        return renderWolDevicesList();
      }
      if (selectedTool === 'network-scan') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '2rem',
              color: 'var(--text-color-secondary)',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.01)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              <i className="pi pi-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
              <span>Configura los parámetros y haz clic en "Ejecutar"</span>
            </div>
            {renderSavedScansList()}
          </div>
        );
      }
      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem',
          color: 'var(--text-color-secondary)',
          textAlign: 'center'
        }}>
          <i className="pi pi-info-circle" style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.5 }} />
          <span>Configura los parámetros y haz clic en "Ejecutar"</span>
        </div>
      );
    }

    const resultBoxStyle = {
      background: 'rgba(0,0,0,0.2)',
      borderRadius: '8px',
      padding: isMobile ? '0.75rem' : '1rem',
      fontFamily: 'monospace',
      fontSize: isMobile ? '0.75rem' : '0.85rem',
      lineHeight: '1.6',
      color: 'rgba(255,255,255,0.95)',
      overflow: 'visible',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      width: '100%'
    };

    const statItemStyle = {
      display: 'flex',
      flexDirection: isMobile ? 'column' : 'row',
      justifyContent: isMobile ? 'flex-start' : 'space-between',
      alignItems: isMobile ? 'flex-start' : 'center',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.1)',
      gap: isMobile ? '0.25rem' : '0'
    };

    switch (selectedTool) {
      case 'ping':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <i className={`pi ${result.success ? 'pi-check-circle' : 'pi-times-circle'}`} 
                 style={{ color: result.success ? '#22c55e' : '#ef4444', fontSize: '1.2rem' }} />
              <strong style={{ fontSize: '1rem' }}>{result.host}</strong>
              <Badge value={result.success ? 'Activo' : 'Inactivo'} 
                     severity={result.success ? 'success' : 'danger'} />
              {result.duration && (
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  ({(result.duration / 1000).toFixed(2)}s)
                </span>
              )}
            </div>
            <div style={statItemStyle}>
              <span>Paquetes enviados:</span>
              <strong>{result.sent || 0}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes recibidos:</span>
              <strong style={{ color: '#22c55e' }}>{result.received || 0}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes perdidos:</span>
              <strong style={{ color: (result.lost || 0) > 0 ? '#ef4444' : '#22c55e' }}>
                {result.lost || 0} ({result.lossPercent || 0}%)
              </strong>
            </div>
            {result.times && result.times.length > 0 && (
              <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Tiempos de respuesta:
              </div>
            )}
            {result.times && result.times.length > 0 && (
              <div style={{ marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {result.times.map((time, idx) => (
                  <Badge 
                    key={idx}
                    value={`${time.toFixed ? time.toFixed(2) : time}ms`}
                    severity="info"
                  />
                ))}
              </div>
            )}
            {(result.min !== null && result.min !== undefined) && (
              <>
                <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                  Estadísticas:
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo mínimo:</span>
                  <strong>{result.min?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo promedio:</span>
                  <strong style={{ color: '#3b82f6', fontSize: '1.05rem' }}>{result.avg?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo máximo:</span>
                  <strong>{result.max?.toFixed(2)} ms</strong>
                </div>
              </>
            )}
            {result.error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
            {result.rawOutput && (
              <details style={{ marginTop: '1rem' }}>
                <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
                  Ver salida completa
                </summary>
                <pre style={{ 
                  marginTop: '0.5rem', 
                  whiteSpace: 'pre-wrap', 
                  fontSize: '0.7rem',
                  color: 'var(--text-color-secondary)',
                  background: 'rgba(0,0,0,0.2)',
                  padding: '0.5rem',
                  borderRadius: '4px',
                  overflow: 'auto',
                  maxHeight: '200px'
                }}>
                  {result.rawOutput}
                </pre>
              </details>
            )}
          </div>
        );

      case 'traceroute':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <strong style={{ fontSize: '1rem' }}>Traceroute a {result.host}</strong>
              <Badge value={`${result.hops?.length || 0} saltos`} severity={result.success ? "info" : "warning"} />
              {!result.success && result.error && (
                <Badge value="Error" severity="danger" />
              )}
            </div>
            {result.hops && result.hops.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <DataTable 
                  value={result.hops} 
                  size="small" 
                  stripedRows 
                  style={{ fontSize: '0.8rem', minWidth: '400px' }}
                  emptyMessage="Sin datos"
                  scrollable
                  scrollHeight="400px"
                >
                  <Column field="hop" header="#" style={{ width: '50px', textAlign: 'center' }} />
                  <Column 
                    field="host" 
                    header="Host / IP" 
                    body={(row) => (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span>{row.host || '*'}</span>
                        {row.ip && row.ip !== row.host && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)' }}>{row.ip}</span>
                        )}
                      </div>
                    )}
                    style={{ minWidth: '200px' }}
                  />
                  <Column 
                    field="times" 
                    header="Tiempos" 
                    body={(row) => {
                      if (row.timeout) return <span style={{ color: '#ef4444' }}>* * *</span>;
                      if (row.times && row.times.length > 0) {
                        return (
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {row.times.map((t, i) => (
                              <Badge key={i} value={`${t.toFixed(2)}ms`} severity="info" />
                            ))}
                          </div>
                        );
                      }
                      return <span>*</span>;
                    }}
                    style={{ minWidth: '150px' }}
                  />
                  <Column 
                    field="avgTime" 
                    header="Promedio" 
                    body={(row) => row.avgTime ? (
                      <strong style={{ color: '#3b82f6' }}>{row.avgTime.toFixed(2)} ms</strong>
                    ) : (
                      <span style={{ color: '#ef4444' }}>*</span>
                    )} 
                    style={{ width: '100px', textAlign: 'right' }} 
                  />
                </DataTable>
              </div>
            ) : (
              <div>
                <Message severity="warn" text={result.error || "No se pudieron obtener saltos"} style={{ marginBottom: '1rem' }} />
                {result.rawOutput && result.rawOutput.trim().length > 0 && (
                  <details style={{ marginTop: '1rem' }} open={!result.success}>
                    <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                      {result.success ? 'Ver salida completa' : 'Ver salida del comando (útil para depuración)'}
                    </summary>
                    <pre style={{ 
                      marginTop: '0.5rem', 
                      whiteSpace: 'pre-wrap', 
                      fontSize: '0.7rem',
                      color: 'var(--text-color-secondary)',
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      overflow: 'auto',
                      maxHeight: '400px',
                      fontFamily: 'monospace'
                    }}>
                      {result.rawOutput}
                    </pre>
                  </details>
                )}
                {!result.rawOutput || result.rawOutput.trim().length === 0 ? (
                  <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444', marginTop: '1rem' }}>
                    <strong>Nota:</strong> El comando no produjo ninguna salida. Verifica que el comando traceroute/tracert esté instalado y disponible en tu sistema.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        );

      case 'port-scan':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <strong>Escaneo de {result.host}</strong>
              <Badge value={`${result.openPorts?.length || 0} abiertos`} severity="success" />
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                ({result.scanTime}ms)
              </span>
            </div>
            {result.openPorts && result.openPorts.length > 0 ? (
              <DataTable value={result.openPorts} size="small" stripedRows>
                <Column field="port" header="Puerto" style={{ width: '100px' }} />
                <Column field="service" header="Servicio" />
              </DataTable>
            ) : (
              <Message severity="info" text="No se encontraron puertos abiertos" />
            )}
          </div>
        );

      case 'network-scan':
        if (cyberpunkMode) {
          return renderCyberpunkHUD(false);
        }
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            {viewingSavedScan && (
              <div style={{
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.3)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                color: '#64b5f6'
              }}>
                <span>
                  <i className="pi pi-info-circle" style={{ marginRight: '0.5rem' }} />
                  Mostrando resultados guardados de <strong>{viewingSavedScan.name}</strong> ({new Date(viewingSavedScan.lastResult.timestamp).toLocaleString()})
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button 
                    label="Escanear ahora" 
                    icon="pi pi-refresh" 
                    onClick={() => handleQuickScan(viewingSavedScan, 'quick')}
                    className="p-button-text p-button-sm"
                    style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#64b5f6', background: 'transparent', border: 'none' }}
                  />
                  <Button 
                    icon="pi pi-times" 
                    onClick={() => {
                      setViewingSavedScan(null);
                      setResult(null);
                    }}
                    className="p-button-text p-button-sm p-button-secondary"
                    style={{ padding: '2px', fontSize: '0.75rem', width: '24px', height: '24px', background: 'transparent', border: 'none' }}
                  />
                </div>
              </div>
            )}
            <div style={resultBoxStyle}>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <strong>Red: {result.subnet}</strong>
                <Badge
                  value={result.scanMode === 'quick' ? 'Escaneo rápido' : 'Escaneo completo'}
                  severity={result.scanMode === 'quick' ? 'info' : 'warning'}
                />
                {result.cached && <Badge value="Caché" severity="secondary" />}
                <Badge value={`${result.hosts?.length || 0} hosts encontrados`} severity="success" />
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                  ({(result.scanTime / 1000).toFixed(1)}s)
                </span>
              </div>
              {result.hosts && result.hosts.length > 0 ? (
                <DataTable value={result.hosts} size="small" stripedRows>
                  <Column field="ip" header="IP" style={{ width: '130px' }} />
                  <Column field="hostname" header="Hostname" body={(row) => row.hostname || row.netbiosName || '-'} />
                  <Column field="mac" header="MAC" body={(row) => row.mac || '-'} style={{ width: '140px' }} />
                  <Column field="vendor" header="Fabricante" body={(row) => row.vendor || '-'} style={{ width: '110px' }} />
                  <Column field="os" header="Sistema" body={(row) => row.os || '-'} style={{ width: '120px' }} />
                  <Column field="responseTime" header="Respuesta" 
                          body={(row) => `${row.responseTime}ms`} style={{ width: '90px' }} />
                </DataTable>
              ) : (
                <Message severity="info" text="No se encontraron hosts activos" />
              )}
            </div>
          </div>
        );

      case 'dns-lookup':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>DNS: {result.domain}</strong>
              <span style={{ marginLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                Tipo: {result.type}
              </span>
            </div>
            {result.records && result.records.length > 0 ? (
              <DataTable value={result.records} size="small" stripedRows>
                <Column field="type" header="Tipo" style={{ width: '80px' }} />
                <Column field="value" header="Valor" />
                <Column field="priority" header="Prioridad" style={{ width: '100px' }}
                        body={(row) => row.priority !== undefined ? row.priority : '-'} />
              </DataTable>
            ) : (
              <Message severity="warn" text="No se encontraron registros" />
            )}
          </div>
        );

      case 'reverse-dns':
        return (
          <div style={resultBoxStyle}>
            <div style={statItemStyle}>
              <span>IP:</span>
              <strong>{result.ip}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Hostnames:</span>
              <div style={{ textAlign: 'right' }}>
                {result.hostnames && result.hostnames.length > 0 
                  ? result.hostnames.map((h, i) => <div key={i}><strong>{h}</strong></div>)
                  : <strong style={{ color: 'var(--text-color-secondary)' }}>No encontrado</strong>
                }
              </div>
            </div>
            <div style={statItemStyle}>
              <span>Tiempo de consulta:</span>
              <strong>{result.queryTime}ms</strong>
            </div>
          </div>
        );

      case 'ssl-check':
        // Calcular métricas para el dashboard
        const certValid = result.certificate?.isValid || false;
        const daysUntilExpiry = result.certificate?.daysUntilExpiry || 0;
        const supportedCount = result.supportedProtocols?.length || 0;
        const deprecatedCount = result.supportedProtocols?.filter(p => p.deprecated)?.length || 0;
        const secureProtocols = result.supportedProtocols?.filter(p => !p.deprecated)?.length || 0;
        
        // Calcular score de seguridad (0-100)
        let securityScore = 0;
        if (certValid) securityScore += 40;
        if (daysUntilExpiry > 90) securityScore += 20;
        else if (daysUntilExpiry > 30) securityScore += 10;
        if (secureProtocols > 0) securityScore += 20;
        if (deprecatedCount === 0) securityScore += 20;
        
        // Determinar nivel de riesgo
        let riskLevel = 'BAJO';
        let riskColor = '#22c55e';
        if (!certValid || daysUntilExpiry < 0) {
          riskLevel = 'CRÍTICO';
          riskColor = '#dc2626';
        } else if (deprecatedCount > 2 || daysUntilExpiry < 30) {
          riskLevel = 'ALTO';
          riskColor = '#ef4444';
        } else if (deprecatedCount > 0 || daysUntilExpiry < 90) {
          riskLevel = 'MEDIO';
          riskColor = '#f59e0b';
        }

        return (
          <div style={resultBoxStyle}>
            {/* RESUMEN EJECUTIVO - COMPACTO */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                marginBottom: '0.75rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <i className={`pi ${certValid ? 'pi-lock' : 'pi-lock-open'}`} 
                     style={{ 
                       color: certValid ? '#22c55e' : '#ef4444', 
                       fontSize: '1.5rem'
                     }} 
                  />
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.15rem', color: '#ffffff' }}>
                      {result.host}:{result.port}
                    </div>
                    <Badge 
                      value={certValid ? '✓ VÁLIDO' : '✗ INVÁLIDO'} 
                      severity={certValid ? 'success' : 'danger'}
                      style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.25rem 0.5rem',
                        fontWeight: '600'
                      }}
                    />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.15rem' }}>
                    Score
                  </div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '700',
                    color: securityScore >= 80 ? '#22c55e' : securityScore >= 60 ? '#f59e0b' : '#ef4444',
                    lineHeight: 1
                  }}>
                    {securityScore}
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>/100</span>
                  </div>
                </div>
              </div>

              {/* Métricas clave - COMPACTAS (sin Protocolos) */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
                gap: '0.5rem',
                marginTop: '0.75rem'
              }}>
                {/* Días hasta expiración */}
                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                    Expira en
                  </div>
                  <div style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '700',
                    color: daysUntilExpiry < 30 ? '#ef4444' : daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e',
                    marginBottom: '0.25rem'
                  }}>
                    {daysUntilExpiry} días
                  </div>
                  <div style={{ 
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '3px',
                    height: '4px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      background: daysUntilExpiry < 30 ? '#ef4444' : daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e',
                      height: '100%',
                      width: `${Math.min(100, (daysUntilExpiry / 365) * 100)}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </div>
                </div>

                {/* Conexión por Defecto */}
                {result.protocols && (
                  <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem'
                  }}>
                    <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                      Conexión
                    </div>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600',
                      marginBottom: '0.15rem',
                      color: '#60a5fa'
                    }}>
                      {result.protocols.version || 'N/A'}
                    </div>
                    <div style={{ 
                      fontSize: '0.65rem', 
                      color: 'rgba(255,255,255,0.7)',
                      fontFamily: 'monospace',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {result.protocols.cipher || 'N/A'}
                    </div>
                  </div>
                )}

                {/* Nivel de riesgo */}
                <div style={{
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem'
                }}>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                    Riesgo
                  </div>
                  <div style={{ 
                    fontSize: '1rem', 
                    fontWeight: '700',
                    color: riskColor,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <i className="pi pi-exclamation-triangle" style={{ fontSize: '0.9rem' }} />
                    {riskLevel}
                  </div>
                </div>
              </div>
            </div>

            {/* Protocolos soportados - COMPACTO */}
            {result.supportedProtocols && result.supportedProtocols.length > 0 && (
              <>
                <div style={{ 
                  marginTop: '1rem', 
                  marginBottom: '0.75rem', 
                  fontWeight: '600', 
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: '#60a5fa'
                }}>
                  <i className="pi pi-shield" style={{ fontSize: '0.9rem' }} />
                  Protocolos Soportados
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {result.supportedProtocols.map((proto, idx) => {
                    // Determinar color según seguridad del protocolo
                    let bgColor, borderColor, iconColor, statusIcon, statusText;
                    
                    if (proto.name === 'TLSv1.3' || proto.name === 'TLSv1.2') {
                      bgColor = 'rgba(34, 197, 94, 0.1)';
                      borderColor = '#22c55e';
                      iconColor = '#22c55e';
                      statusIcon = '🟢';
                      statusText = 'SEGURO';
                    } else if (proto.name === 'TLSv1.1' || proto.name === 'TLSv1.0') {
                      bgColor = 'rgba(245, 158, 11, 0.1)';
                      borderColor = '#f59e0b';
                      iconColor = '#f59e0b';
                      statusIcon = '🟠';
                      statusText = 'OBSOLETO';
                    } else {
                      bgColor = 'rgba(239, 68, 68, 0.1)';
                      borderColor = '#ef4444';
                      iconColor = '#ef4444';
                      statusIcon = '🔴';
                      statusText = 'INSEGURO';
                    }

                    return (
                      <div key={idx} style={{
                        background: bgColor,
                        border: `1.5px solid ${borderColor}`,
                        borderRadius: '6px',
                        padding: '0.5rem 0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.5rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '150px' }}>
                          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>
                            {statusIcon}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              fontSize: '0.85rem', 
                              fontWeight: '600',
                              marginBottom: '0.15rem',
                              color: iconColor
                            }}>
                              {proto.name}
                            </div>
                            {proto.cipher && (
                              <div style={{ 
                                fontSize: '0.7rem', 
                                color: 'rgba(255,255,255,0.7)',
                                fontFamily: 'monospace'
                              }}>
                                {proto.cipher.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge 
                          value={statusText}
                          severity={proto.deprecated ? 'warning' : 'success'}
                          style={{ 
                            fontSize: '0.65rem', 
                            padding: '0.2rem 0.5rem',
                            fontWeight: '600',
                            background: borderColor,
                            border: 'none'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Todos los protocolos probados - Colapsable COMPACTO */}
            {result.testedProtocols && result.testedProtocols.length > 0 && (
              <details style={{ marginTop: '1rem', marginBottom: '0.75rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  <i className="pi pi-chevron-right" style={{ 
                    fontSize: '0.7rem', 
                    transition: 'transform 0.2s',
                    display: 'inline-block'
                  }} />
                  <span>Todos los Protocolos Probados ({result.testedProtocols.length})</span>
                </summary>
                <div style={{ 
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
                  gap: '0.5rem',
                  marginTop: '0.5rem'
                }}>
                {result.testedProtocols.map((proto, idx) => {
                  let statusIcon = '⚫';
                  let bgColor = 'rgba(0,0,0,0.1)';
                  
                  if (proto.supported) {
                    if (proto.deprecated) {
                      statusIcon = '🟠';
                      bgColor = 'rgba(245, 158, 11, 0.1)';
                    } else {
                      statusIcon = '🟢';
                      bgColor = 'rgba(34, 197, 94, 0.1)';
                    }
                  } else if (proto.protocolUnavailable) {
                    statusIcon = '⚪';
                    bgColor = 'rgba(100, 116, 139, 0.1)';
                  } else {
                    statusIcon = '🔴';
                    bgColor = 'rgba(239, 68, 68, 0.1)';
                  }

                  return (
                    <div key={idx} style={{ 
                      padding: '0.75rem',
                      background: bgColor,
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '1rem' }}>{statusIcon}</span>
                        <strong style={{ color: '#ffffff' }}>{proto.name}</strong>
                      </div>
                      {proto.supported && proto.cipher && (
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginLeft: '1.5rem' }}>
                          {proto.cipher.name}
                        </div>
                      )}
                      {!proto.supported && proto.error && (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontStyle: 'italic', marginLeft: '1.5rem' }}>
                          {proto.error}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              </details>
            )}

            {/* Ciphers únicos - Colapsable COMPACTO */}
            {result.ciphers && result.ciphers.length > 0 && (
              <details style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  <i className="pi pi-chevron-right" style={{ 
                    fontSize: '0.7rem', 
                    transition: 'transform 0.2s',
                    display: 'inline-block'
                  }} />
                  <span>Ciphers Detectados ({result.ciphers.length})</span>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {result.ciphers.map((cipher, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.75rem', 
                      background: 'rgba(59, 130, 246, 0.1)', 
                      borderRadius: '6px',
                      borderLeft: '3px solid #3b82f6',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#ffffff' }}>
                        {cipher.name}
                        {cipher.version && <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '0.5rem', fontWeight: '400' }}>({cipher.version})</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                        Protocolos: {cipher.protocols.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Información del certificado - Desplegable COMPACTO */}
            {result.certificate && (
              <details style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  <i className="pi pi-chevron-right" style={{ 
                    fontSize: '0.7rem', 
                    transition: 'transform 0.2s',
                    display: 'inline-block'
                  }} />
                  <span>Información del Certificado</span>
                </summary>
                <div style={{ marginTop: '0.5rem', paddingLeft: '0.5rem' }}>
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Sujeto:</span>
                    <strong style={{ color: '#ffffff' }}>{result.certificate.subject?.CN || result.certificate.subject?.O || 'N/A'}</strong>
                  </div>
                  {result.certificate.subject?.O && result.certificate.subject?.O !== result.certificate.subject?.CN && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Organización:</span>
                      <strong style={{ color: '#ffffff' }}>{result.certificate.subject.O}</strong>
                    </div>
                  )}
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Emisor:</span>
                    <strong style={{ color: '#ffffff' }}>{result.certificate.issuer?.O || result.certificate.issuer?.CN || 'N/A'}</strong>
                  </div>
                  {result.certificate.serialNumber && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Número de serie:</span>
                      <strong style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: '#ffffff' }}>{result.certificate.serialNumber}</strong>
                    </div>
                  )}
                  {result.certificate.signatureAlgorithm && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Algoritmo de firma:</span>
                      <strong style={{ color: '#ffffff' }}>{result.certificate.signatureAlgorithm}</strong>
                    </div>
                  )}
                  {result.certificate.publicKey && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Clave pública:</span>
                      <strong style={{ color: '#ffffff' }}>{result.certificate.publicKey.type || 'N/A'} {result.certificate.publicKey.bits ? `(${result.certificate.publicKey.bits} bits)` : ''}</strong>
                    </div>
                  )}
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Válido desde:</span>
                    <strong style={{ color: '#ffffff' }}>{result.certificate.validFrom}</strong>
                  </div>
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Válido hasta:</span>
                    <strong style={{ color: '#ffffff' }}>{result.certificate.validTo}</strong>
                  </div>
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Días hasta expiración:</span>
                    <strong style={{ 
                      color: result.certificate.daysUntilExpiry < 30 ? '#ef4444' : 
                             result.certificate.daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e' 
                    }}>
                      {result.certificate.daysUntilExpiry} días
                    </strong>
                  </div>
                  {result.certificate.fingerprint && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Fingerprint (SHA1):</span>
                      <strong style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#ffffff' }}>{result.certificate.fingerprint}</strong>
                    </div>
                  )}
                  {result.certificate.fingerprint256 && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Fingerprint (SHA256):</span>
                      <strong style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#ffffff' }}>{result.certificate.fingerprint256}</strong>
                    </div>
                  )}
                  {result.certificate.subjectAltNames && result.certificate.subjectAltNames.length > 0 && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Nombres alternativos (SAN):</span>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        {result.certificate.subjectAltNames.map((san, idx) => (
                          <strong key={idx} style={{ fontSize: '0.85rem', color: '#ffffff' }}>{san}</strong>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}

            {/* Cadena de certificados - Colapsable COMPACTO */}
            {result.chain && result.chain.length > 0 && (
              <details style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  marginBottom: '0.5rem',
                  userSelect: 'none',
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  color: 'rgba(255,255,255,0.9)'
                }}>
                  <i className="pi pi-chevron-right" style={{ 
                    fontSize: '0.7rem', 
                    transition: 'transform 0.2s',
                    display: 'inline-block'
                  }} />
                  <span>Cadena de Certificados ({result.chain.length})</span>
                </summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  {result.chain.map((chainCert, idx) => (
                    <div key={idx} style={{ 
                      padding: '1rem', 
                      background: 'rgba(0,0,0,0.2)', 
                      borderRadius: '8px',
                      borderLeft: '3px solid #3b82f6',
                      fontSize: '0.85rem'
                    }}>
                      <div style={{ fontWeight: '700', marginBottom: '0.75rem', fontSize: '0.95rem', color: '#60a5fa' }}>
                        Certificado {idx + 1} {idx === 0 ? '(Servidor)' : idx === result.chain.length - 1 ? '(Root CA)' : '(Intermediate CA)'}
                      </div>
                      <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>Sujeto:</span>
                        <strong style={{ color: '#ffffff' }}>{chainCert.subject?.CN || chainCert.subject?.O || 'N/A'}</strong>
                      </div>
                      <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                        <span style={{ color: 'rgba(255,255,255,0.8)' }}>Emisor:</span>
                        <strong style={{ color: '#ffffff' }}>{chainCert.issuer?.O || chainCert.issuer?.CN || 'N/A'}</strong>
                      </div>
                      {chainCert.validFrom && (
                        <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>Válido desde:</span>
                          <strong style={{ color: '#ffffff' }}>{chainCert.validFrom}</strong>
                        </div>
                      )}
                      {chainCert.validTo && (
                        <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                          <span style={{ color: 'rgba(255,255,255,0.8)' }}>Válido hasta:</span>
                          <strong style={{ color: '#ffffff' }}>{chainCert.validTo}</strong>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Recomendaciones de seguridad - COMPACTO */}
            {result.security && result.security.recommendations && result.security.recommendations.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%)',
                border: '1.5px solid #f59e0b',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                marginTop: '1rem'
              }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.75rem',
                  color: '#f59e0b'
                }}>
                  <i className="pi pi-exclamation-triangle" style={{ fontSize: '1rem' }} />
                  Recomendaciones de Seguridad
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {result.security.recommendations.map((rec, idx) => (
                    <div key={idx} style={{ 
                      padding: '0.6rem 0.75rem', 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      borderLeft: '3px solid #f59e0b',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem'
                    }}>
                      <i className="pi pi-info-circle" style={{ color: '#f59e0b', fontSize: '0.85rem', marginTop: '0.1rem', flexShrink: 0 }} />
                      <span style={{ flex: 1, color: 'rgba(255,255,255,0.9)' }}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}
          </div>
        );

      case 'http-headers':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <strong>HTTP {result.statusCode}</strong>
              <Badge 
                value={result.statusMessage} 
                severity={result.statusCode < 400 ? 'success' : 'danger'} 
              />
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                ({result.timing?.responseTime}ms)
              </span>
            </div>
            
            <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Cabeceras de Seguridad:
            </div>
            {Object.entries(result.securityHeaders || {}).map(([key, value]) => (
              <div key={key} style={statItemStyle}>
                <span>{key}:</span>
                <Badge 
                  value={value ? 'Presente' : 'Ausente'} 
                  severity={value ? 'success' : 'warning'}
                />
              </div>
            ))}
            
            <div style={{ marginTop: '1rem', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Todas las cabeceras:
            </div>
            {Object.entries(result.headers || {}).map(([key, value]) => (
              <div key={key} style={{ ...statItemStyle, fontSize: '0.75rem' }}>
                <span style={{ color: '#3b82f6' }}>{key}:</span>
                <span style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {String(value)}
                </span>
              </div>
            ))}
          </div>
        );

      case 'host-vuln-scan':
        // Dashboard de vulnerabilidades del host
        const vulnSummary = result.summary || {};
        const vulnIssues = vulnSummary.vulnerabilities || {};
        const riskColors = {
          0: '#22c55e',   // Verde - bajo riesgo
          25: '#84cc16',  // Lima
          50: '#f59e0b',  // Naranja
          75: '#ef4444',  // Rojo
          100: '#991b1b'  // Rojo oscuro - crítico
        };
        const getRiskColor = (score) => {
          if (score <= 25) return riskColors[0];
          if (score <= 50) return riskColors[25];
          if (score <= 75) return riskColors[50];
          return riskColors[75];
        };

        return (
          <div style={{ ...resultBoxStyle, padding: 0, background: 'transparent' }}>
            {/* Dashboard Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {/* Score de Riesgo */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                border: `2px solid ${getRiskColor(vulnSummary.riskScore || 0)}40`
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', marginBottom: '0.25rem' }}>RISK SCORE</div>
                <div style={{ 
                  fontSize: '2rem', 
                  fontWeight: 'bold', 
                  color: getRiskColor(vulnSummary.riskScore || 0),
                  lineHeight: 1
                }}>
                  {vulnSummary.riskScore || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>/100</div>
              </div>

              {/* Puertos Abiertos */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginBottom: '0.25rem' }}>PUERTOS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', lineHeight: 1 }}>
                  {vulnSummary.openPorts || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>abiertos</div>
              </div>

              {/* Vulnerabilidades Críticas */}
              <div style={{
                background: `linear-gradient(135deg, rgba(239, 68, 68, ${vulnIssues.critical > 0 ? '0.2' : '0.05'}) 0%, rgba(239, 68, 68, 0.02) 100%)`,
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginBottom: '0.25rem' }}>CRÍTICAS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: vulnIssues.critical > 0 ? '#ef4444' : 'var(--text-color-secondary)', lineHeight: 1 }}>
                  {vulnIssues.critical || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>🔴</div>
              </div>

              {/* Vulnerabilidades Altas */}
              <div style={{
                background: `linear-gradient(135deg, rgba(249, 115, 22, ${vulnIssues.high > 0 ? '0.15' : '0.05'}) 0%, rgba(249, 115, 22, 0.02) 100%)`,
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#f97316', marginBottom: '0.25rem' }}>ALTAS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: vulnIssues.high > 0 ? '#f97316' : 'var(--text-color-secondary)', lineHeight: 1 }}>
                  {vulnIssues.high || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>🟠</div>
              </div>

              {/* Vulnerabilidades Medias */}
              <div style={{
                background: `linear-gradient(135deg, rgba(234, 179, 8, ${vulnIssues.medium > 0 ? '0.15' : '0.05'}) 0%, rgba(234, 179, 8, 0.02) 100%)`,
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#eab308', marginBottom: '0.25rem' }}>MEDIAS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: vulnIssues.medium > 0 ? '#eab308' : 'var(--text-color-secondary)', lineHeight: 1 }}>
                  {vulnIssues.medium || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>🟡</div>
              </div>

              {/* Vulnerabilidades Bajas */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#22c55e', marginBottom: '0.25rem' }}>BAJAS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: vulnIssues.low > 0 ? '#22c55e' : 'var(--text-color-secondary)', lineHeight: 1 }}>
                  {vulnIssues.low || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>🟢</div>
              </div>
            </div>

            {/* Recomendaciones */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fbbf24', marginBottom: '0.5rem' }}>
                  ⚡ Recomendaciones Prioritarias
                </div>
                {result.recommendations.slice(0, 3).map((rec, idx) => (
                  <div key={idx} style={{
                    fontSize: '0.75rem',
                    color: 'var(--text-color)',
                    padding: '0.4rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    marginBottom: '0.3rem',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.5rem'
                  }}>
                    <Badge 
                      value={rec.priority} 
                      severity={rec.priority === 'CRITICAL' ? 'danger' : rec.priority === 'HIGH' ? 'warning' : 'info'}
                      style={{ fontSize: '0.6rem', padding: '0.15rem 0.4rem' }}
                    />
                    <span>{rec.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Lista de Puertos y Vulnerabilidades */}
            {result.ports && result.ports.length > 0 && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: '0.75rem'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  📡 Servicios Detectados ({result.ports.length})
                </div>
                {result.ports.map((port, idx) => (
                  <details key={idx} style={{ marginBottom: '0.5rem' }}>
                    <summary style={{
                      cursor: 'pointer',
                      padding: '0.5rem',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.8rem'
                    }}>
                      <Badge value={port.port} severity="info" style={{ minWidth: '50px' }} />
                      <span style={{ fontWeight: '600' }}>{port.service}</span>
                      {port.version && <span style={{ color: 'var(--text-color-secondary)' }}>v{port.version}</span>}
                      {port.vulnerabilities && port.vulnerabilities.length > 0 && (
                        <Badge 
                          value={`${port.vulnerabilities.length} CVE${port.vulnerabilities.length > 1 ? 's' : ''}`}
                          severity="danger"
                          style={{ marginLeft: 'auto' }}
                        />
                      )}
                    </summary>
                    <div style={{ padding: '0.5rem', paddingLeft: '1rem' }}>
                      {port.banner && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', marginBottom: '0.5rem' }}>
                          <strong>Banner:</strong> {port.banner.substring(0, 150)}...
                        </div>
                      )}
                      {port.vulnerabilities && port.vulnerabilities.length > 0 ? (
                        port.vulnerabilities.map((vuln, vidx) => (
                          <div key={vidx} style={{
                            padding: '0.4rem',
                            background: vuln.severity === 'CRITICAL' ? 'rgba(239, 68, 68, 0.15)' : 
                                       vuln.severity === 'HIGH' ? 'rgba(249, 115, 22, 0.15)' :
                                       vuln.severity === 'MEDIUM' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '4px',
                            marginBottom: '0.3rem',
                            fontSize: '0.7rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                              <Badge 
                                value={vuln.severity} 
                                severity={vuln.severity === 'CRITICAL' ? 'danger' : vuln.severity === 'HIGH' ? 'warning' : 'info'}
                                style={{ fontSize: '0.6rem' }}
                              />
                              <strong style={{ color: '#3b82f6' }}>{vuln.cve}</strong>
                              {vuln.score && <span style={{ color: 'var(--text-color-secondary)' }}>Score: {vuln.score}</span>}
                              <Badge value={vuln.source} style={{ fontSize: '0.55rem', marginLeft: 'auto' }} />
                            </div>
                            <div style={{ color: 'var(--text-color-secondary)' }}>{vuln.description}</div>
                          </div>
                        ))
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓ Sin vulnerabilidades conocidas detectadas</div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}

            {/* Info del escaneo */}
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.7rem', 
              color: 'var(--text-color-secondary)',
              textAlign: 'right'
            }}>
              Host: {result.host} | Tiempo: {((result.scanTime || 0) / 1000).toFixed(2)}s
            </div>
          </div>
        );

      case 'web-security-scan':
        // Dashboard de seguridad web
        const webSummary = result.summary || {};
        const gradeColors = {
          'A': '#22c55e',
          'B': '#84cc16',
          'C': '#eab308',
          'D': '#f97316',
          'E': '#ef4444',
          'F': '#991b1b'
        };

        return (
          <div style={{ ...resultBoxStyle, padding: 0, background: 'transparent' }}>
            {/* Score y Grado */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem'
            }}>
              {/* Grado */}
              <div style={{
                background: `linear-gradient(135deg, ${gradeColors[webSummary.grade] || '#666'}25 0%, ${gradeColors[webSummary.grade] || '#666'}10 100%)`,
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center',
                border: `2px solid ${gradeColors[webSummary.grade] || '#666'}40`
              }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-color-secondary)', marginBottom: '0.25rem' }}>GRADO</div>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 'bold', 
                  color: gradeColors[webSummary.grade] || '#666',
                  lineHeight: 1
                }}>
                  {webSummary.grade || 'F'}
                </div>
              </div>

              {/* Score */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.05) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#3b82f6', marginBottom: '0.25rem' }}>SCORE</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#3b82f6', lineHeight: 1 }}>
                  {webSummary.score || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>/100</div>
              </div>

              {/* Checks Pasados */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#22c55e', marginBottom: '0.25rem' }}>PASADOS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#22c55e', lineHeight: 1 }}>
                  {webSummary.passed || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>checks</div>
              </div>

              {/* Checks Fallidos */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '0.7rem', color: '#ef4444', marginBottom: '0.25rem' }}>FALLIDOS</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ef4444', lineHeight: 1 }}>
                  {webSummary.failed || 0}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-color-secondary)' }}>checks</div>
              </div>

              {/* Issues por severidad */}
              {['critical', 'high', 'medium', 'low'].map((sev) => (
                <div key={sev} style={{
                  background: sev === 'critical' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%)' :
                             sev === 'high' ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(249, 115, 22, 0.05) 100%)' :
                             sev === 'medium' ? 'linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(234, 179, 8, 0.05) 100%)' :
                             'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                  borderRadius: '12px',
                  padding: '0.75rem',
                  textAlign: 'center'
                }}>
                  <div style={{ 
                    fontSize: '0.65rem', 
                    color: sev === 'critical' ? '#ef4444' : sev === 'high' ? '#f97316' : sev === 'medium' ? '#eab308' : '#22c55e',
                    textTransform: 'uppercase'
                  }}>
                    {sev === 'critical' ? '🔴' : sev === 'high' ? '🟠' : sev === 'medium' ? '🟡' : '🟢'} {sev}
                  </div>
                  <div style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 'bold', 
                    color: (webSummary.issues?.[sev] || 0) > 0 ? 
                           (sev === 'critical' ? '#ef4444' : sev === 'high' ? '#f97316' : sev === 'medium' ? '#eab308' : '#22c55e') : 
                           'var(--text-color-secondary)'
                  }}>
                    {webSummary.issues?.[sev] || 0}
                  </div>
                </div>
              ))}
            </div>

            {/* Recomendaciones */}
            {result.recommendations && result.recommendations.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(251, 191, 36, 0.02) 100%)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                border: '1px solid rgba(251, 191, 36, 0.3)'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#fbbf24', marginBottom: '0.5rem' }}>
                  ⚡ Recomendaciones
                </div>
                {result.recommendations.map((rec, idx) => (
                  <div key={idx} style={{
                    fontSize: '0.75rem',
                    padding: '0.4rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '4px',
                    marginBottom: '0.3rem'
                  }}>
                    <Badge 
                      value={rec.priority} 
                      severity={rec.priority === 'CRITICAL' ? 'danger' : 'warning'}
                      style={{ fontSize: '0.6rem', marginRight: '0.5rem' }}
                    />
                    <strong>{rec.check}:</strong> {rec.text}
                  </div>
                ))}
              </div>
            )}

            {/* Checks Detallados por Categoría */}
            {result.checks && result.checks.length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {['SSL/TLS', 'Headers', 'Cookies', 'CORS', 'Information Disclosure'].map((category) => {
                  const categoryChecks = result.checks.filter(c => c.category === category);
                  if (categoryChecks.length === 0) return null;
                  
                  return (
                    <details key={category} style={{ marginBottom: '0.5rem' }} open={category === 'SSL/TLS' || category === 'Headers'}>
                      <summary style={{
                        cursor: 'pointer',
                        padding: '0.5rem',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.8rem'
                      }}>
                        {category} ({categoryChecks.filter(c => c.status === 'PASS').length}/{categoryChecks.length} ✓)
                      </summary>
                      <div style={{ padding: '0.5rem' }}>
                        {categoryChecks.map((check, idx) => (
                          <div key={idx} style={{
                            padding: '0.4rem',
                            background: check.status === 'PASS' ? 'rgba(34, 197, 94, 0.1)' : 
                                       check.status === 'FAIL' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(234, 179, 8, 0.1)',
                            borderRadius: '4px',
                            marginBottom: '0.3rem',
                            fontSize: '0.75rem'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span>{check.status === 'PASS' ? '✅' : check.status === 'FAIL' ? '❌' : '⚠️'}</span>
                              <strong>{check.check}</strong>
                              <Badge 
                                value={check.severity.toUpperCase()} 
                                severity={check.severity === 'critical' ? 'danger' : check.severity === 'high' ? 'warning' : 'info'}
                                style={{ fontSize: '0.55rem', marginLeft: 'auto' }}
                              />
                            </div>
                            <div style={{ color: 'var(--text-color-secondary)', marginLeft: '1.5rem', fontSize: '0.7rem' }}>
                              {check.details}
                            </div>
                            {check.recommendation && check.status !== 'PASS' && (
                              <div style={{ 
                                marginLeft: '1.5rem', 
                                marginTop: '0.25rem', 
                                fontSize: '0.65rem', 
                                color: '#fbbf24',
                                fontStyle: 'italic'
                              }}>
                                💡 {check.recommendation}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}

            {/* Tecnologías Detectadas */}
            {result.technologies && result.technologies.length > 0 && (
              <div style={{
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                  🔧 Tecnologías Detectadas
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {result.technologies.map((tech, idx) => (
                    <Badge key={idx} value={`${tech.type}: ${tech.value}`} severity="info" />
                  ))}
                </div>
              </div>
            )}

            {/* Cookies */}
            {result.cookies && result.cookies.length > 0 && (
              <details style={{ marginBottom: '0.5rem' }}>
                <summary style={{
                  cursor: 'pointer',
                  padding: '0.5rem',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.8rem'
                }}>
                  🍪 Cookies Detectadas ({result.cookies.length})
                </summary>
                <div style={{ padding: '0.5rem' }}>
                  {result.cookies.map((cookie, idx) => (
                    <div key={idx} style={{
                      padding: '0.4rem',
                      background: cookie.issues?.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                      borderRadius: '4px',
                      marginBottom: '0.3rem',
                      fontSize: '0.7rem'
                    }}>
                      <strong>{cookie.name}</strong>
                      <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <Badge value={cookie.flags?.httpOnly ? 'HttpOnly ✓' : 'HttpOnly ✗'} severity={cookie.flags?.httpOnly ? 'success' : 'danger'} style={{ fontSize: '0.55rem' }} />
                        <Badge value={cookie.flags?.secure ? 'Secure ✓' : 'Secure ✗'} severity={cookie.flags?.secure ? 'success' : 'danger'} style={{ fontSize: '0.55rem' }} />
                        <Badge value={cookie.flags?.sameSite ? `SameSite=${cookie.flags.sameSite}` : 'SameSite ✗'} severity={cookie.flags?.sameSite ? 'info' : 'warning'} style={{ fontSize: '0.55rem' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Info del escaneo */}
            <div style={{ 
              marginTop: '1rem', 
              fontSize: '0.7rem', 
              color: 'var(--text-color-secondary)',
              textAlign: 'right'
            }}>
              URL: {result.url} | Tiempo: {((result.scanTime || 0) / 1000).toFixed(2)}s
            </div>
          </div>
        );

      case 'whois':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>WHOIS: {result.domain}</strong>
            </div>
            {result.parsed && Object.keys(result.parsed).length > 0 && (
              <div style={{ marginBottom: '1rem' }}>
                {result.parsed.registrar && (
                  <div style={statItemStyle}>
                    <span>Registrar:</span>
                    <strong>{result.parsed.registrar}</strong>
                  </div>
                )}
                {result.parsed.creationDate && (
                  <div style={statItemStyle}>
                    <span>Fecha de creación:</span>
                    <strong>{result.parsed.creationDate}</strong>
                  </div>
                )}
                {result.parsed.expirationDate && (
                  <div style={statItemStyle}>
                    <span>Fecha de expiración:</span>
                    <strong>{result.parsed.expirationDate}</strong>
                  </div>
                )}
                {result.parsed.nameServers && (
                  <div style={statItemStyle}>
                    <span>Name Servers:</span>
                    <div style={{ textAlign: 'right' }}>
                      {result.parsed.nameServers.map((ns, i) => (
                        <div key={i}><strong>{ns}</strong></div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <details>
              <summary style={{ cursor: 'pointer', color: 'var(--text-color-secondary)' }}>
                Ver datos completos
              </summary>
              <pre style={{ 
                marginTop: '0.5rem', 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.7rem',
                color: 'var(--text-color-secondary)'
              }}>
                {result.rawData}
              </pre>
            </details>
          </div>
        );

      case 'subnet-calc':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Subred: {result.input}</strong>
              <Badge value={`Clase ${result.ipClass}`} severity="info" style={{ marginLeft: '1rem' }} />
              {result.isPrivate && <Badge value="Privada" severity="success" style={{ marginLeft: '0.5rem' }} />}
            </div>
            <div style={statItemStyle}>
              <span>Dirección de red:</span>
              <strong>{result.networkAddress}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Dirección de broadcast:</span>
              <strong>{result.broadcastAddress}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Máscara de subred:</span>
              <strong>{result.subnetMask}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Wildcard mask:</span>
              <strong>{result.wildcardMask}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Primer host:</span>
              <strong>{result.firstHost}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Último host:</span>
              <strong>{result.lastHost}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Total de hosts:</span>
              <strong>{result.totalHosts?.toLocaleString()}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Hosts utilizables:</span>
              <strong style={{ color: '#22c55e' }}>{result.usableHosts?.toLocaleString()}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Prefijo:</span>
              <strong>/{result.prefix}</strong>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-color-secondary)' }}>
              <span>Máscara binaria:</span>
              <div style={{ fontFamily: 'monospace', marginTop: '0.25rem' }}>{result.binaryMask}</div>
            </div>
          </div>
        );

      case 'wake-on-lan':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
            <div style={resultBoxStyle}>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                padding: '1.5rem 1rem'
              }}>
                <i className="pi pi-check-circle" style={{ fontSize: '2.5rem', color: '#22c55e', marginBottom: '0.75rem' }} />
                <strong style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: '#22c55e' }}>Magic Packet Enviado</strong>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>MAC: {result.mac}</span>
                <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  Broadcast: {result.broadcast} · Puerto: {result.port}
                </span>
                
                {result.details && Array.isArray(result.details) && (
                  <details style={{ 
                    marginTop: '0.75rem', 
                    fontSize: '0.75rem', 
                    color: 'var(--text-color-secondary)', 
                    width: '100%', 
                    borderTop: '1px solid rgba(255,255,255,0.06)', 
                    paddingTop: '0.5rem',
                    textAlign: 'left'
                  }}>
                    <summary style={{ 
                      fontWeight: '600', 
                      marginBottom: '0.35rem', 
                      color: 'var(--text-color)', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}>
                      Detalles del envío por interfaz (Click para expandir)
                    </summary>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', fontFamily: 'monospace', marginTop: '0.5rem' }}>
                      {result.details.map((d, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.1rem 0' }}>
                          <span>{d.localIp} → {d.broadcastIp}</span>
                          <span style={{ color: d.success ? '#22c55e' : '#ef4444' }}>{d.success ? '✓ Éxito' : '✗ Fallo'}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
            {renderWolDevicesList()}
          </div>
        );

      case 'cvss-calculator':
        return <CvssCalculatorPanel />;

      default:
        return <div>Resultados no disponibles</div>;
    }
  };

  // Obtener la herramienta actual
  const getCurrentTool = () => {
    for (const cat of TOOL_CATEGORIES) {
      const tool = cat.tools.find(t => t.id === selectedTool);
      if (tool) return { ...tool, categoryColor: cat.color };
    }
    return null;
  };

  const currentTool = getCurrentTool();

  // Header del diálogo
  const dialogHeader = (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.75rem',
      padding: '0.5rem 0'
    }}>
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <i className="pi pi-wifi" style={{ color: '#06b6d4', fontSize: '1.2rem' }} />
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Herramientas de Red</h3>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
          Diagnóstico y análisis de red
        </span>
      </div>
    </div>
  );

  // Render en modo standalone (dentro de una pestaña)
  if (standalone) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: themeColors.background, color: themeColors.textPrimary }}>
        <style>{`
          .network-tools-sidebar::-webkit-scrollbar,
          .network-tools-form::-webkit-scrollbar,
          .network-tools-results::-webkit-scrollbar { width: 6px; }
          .network-tools-sidebar::-webkit-scrollbar-track,
          .network-tools-form::-webkit-scrollbar-track,
          .network-tools-results::-webkit-scrollbar-track { background: transparent; }
          .network-tools-sidebar::-webkit-scrollbar-thumb,
          .network-tools-form::-webkit-scrollbar-thumb,
          .network-tools-results::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 3px; }
          .network-tools-standalone .network-tools-main {
            display: flex;
            flex-direction: column;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          }
          .network-tools-standalone .network-tools-form-results {
            display: flex;
            flex: 1;
            min-height: 0;
            overflow: hidden;
          }
          .network-tools-standalone .network-tools-results {
            flex: 1;
            overflow-y: auto;
          }
        `}</style>
        <div className="network-tools-standalone" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          <div className="network-tools-main" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {currentTool && (
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                background: 'rgba(0,0,0,0.1)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${currentTool.categoryColor}30 0%, ${currentTool.categoryColor}15 100%)`,
                    border: `1px solid ${currentTool.categoryColor}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className={currentTool.icon} style={{ color: currentTool.categoryColor, fontSize: '0.9rem' }} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{currentTool.label}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>{currentTool.description}</span>
                  </div>
                </div>
                {/* Formularios inline de cada herramienta */}
                {selectedTool === 'ssl-check' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: '600' }}>Host:</span>
                    <InputText value={sslCheckHost} onChange={(e) => setSslCheckHost(e.target.value)} placeholder="ejemplo.com" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '200px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <span style={{ color: '#06b6d4', fontSize: '0.75rem', fontWeight: '600' }}>Puerto:</span>
                    <InputNumber value={sslCheckPort} onValueChange={(e) => setSslCheckPort(e.value)} min={1} max={65535} showButtons={false} inputStyle={{ width: '60px', padding: '0.35rem', height: '30px', fontSize: '0.8rem', textAlign: 'center', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: '6px', color: 'var(--text-color)' }} />
                    <Button label="Ejecutar" icon="pi pi-play" onClick={executeTool} disabled={loading} style={{ background: `linear-gradient(135deg, ${currentTool.categoryColor} 0%, ${currentTool.categoryColor}cc 100%)`, border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'ping' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600' }}>Host:</span>
                    <InputText value={pingHost} onChange={(e) => setPingHost(e.target.value)} placeholder="ejemplo.com o 192.168.1.1" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '280px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Ejecutar" icon="pi pi-play" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'traceroute' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600' }}>Host:</span>
                    <InputText value={tracerouteHost} onChange={(e) => setTracerouteHost(e.target.value)} placeholder="ejemplo.com o 8.8.8.8" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '280px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Ejecutar" icon="pi pi-play" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'port-scan' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Host:</span>
                    <InputText value={portScanHost} onChange={(e) => setPortScanHost(e.target.value)} placeholder="ejemplo.com o 192.168.1.1" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '280px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Puertos:</span>
                    <InputText value={portScanPorts} onChange={(e) => setPortScanPorts(e.target.value)} placeholder="80,443,22" style={{ width: '220px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Escanear" icon="pi pi-search" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'network-scan' && isSavingScan && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    background: 'rgba(245, 158, 11, 0.1)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '6px',
                    border: '1px solid rgba(245, 158, 11, 0.2)'
                  }}>
                    <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Nombre:</span>
                    <InputText value={saveScanName} onChange={(e) => setSaveScanName(e.target.value)} placeholder="Ej: Red Hogar" style={{ width: '130px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} autoFocus onKeyPress={(e) => e.key === 'Enter' && handleSaveScan()} />
                    <Button label="Guardar" icon="pi pi-check" onClick={handleSaveScan} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem', fontWeight: '600' }} />
                    <Button label="Cancelar" icon="pi pi-times" onClick={() => setIsSavingScan(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem', color: 'var(--text-color)' }} />
                  </div>
                )}
                {selectedTool === 'network-scan' && !isSavingScan && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Subred:</span>
                      <InputText value={networkScanSubnet} onChange={(e) => setNetworkScanSubnet(e.target.value)} placeholder="192.168.1.0/24" onKeyPress={(e) => e.key === 'Enter' && executeTool({ networkScanMode: 'quick' })} style={{ width: '160px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                      <Button label="Rápido" icon="pi pi-bolt" onClick={() => executeTool({ networkScanMode: 'quick' })} disabled={loading} title="Descubre hosts activos (ARP + DNS). Mucho más rápido." style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                      <Button label="Completo" icon="pi pi-search" onClick={() => executeTool({ networkScanMode: 'full' })} disabled={loading} title="Incluye nmap, NetBIOS, SO y sondeo de puertos por host." style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                      <Button 
                        icon="pi pi-cog" 
                        onClick={() => setShowScanConfig(!showScanConfig)} 
                        style={{ 
                          background: showScanConfig ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)',
                          border: showScanConfig ? '1px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px', 
                          padding: '0.35rem', 
                          height: '30px', 
                          width: '30px',
                          fontSize: '0.75rem', 
                          color: showScanConfig ? '#f59e0b' : 'var(--text-color-secondary)'
                        }} 
                        title="Configuración de escaneo completo"
                      />
                      <Button label="Cyber ⚡" icon="pi pi-bolt" onClick={autoDetectAndScan} disabled={loading} title="Auto-detecta subred y escaneo rápido en vista cyber." style={{ background: 'linear-gradient(135deg, #00f0ff 0%, #ff007f 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem', fontWeight: 'bold', boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)', color: '#fff' }} />
                      <Button 
                        label={cyberpunkMode ? "Cyber: ON 🕶️" : "Cyber: OFF 🕶️"} 
                        icon={cyberpunkMode ? "pi pi-eye" : "pi pi-eye-slash"}
                        onClick={() => setCyberpunkMode(!cyberpunkMode)} 
                        style={{ 
                          background: cyberpunkMode ? 'linear-gradient(135deg, rgba(255,0,127,0.2) 0%, rgba(124,0,255,0.2) 100%)' : 'rgba(255,255,255,0.06)',
                          border: cyberpunkMode ? '1px solid #ff007f' : '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '6px', 
                          padding: '0.35rem 0.6rem', 
                          height: '30px', 
                          fontSize: '0.75rem',
                          color: cyberpunkMode ? '#ff007f' : 'var(--text-color-secondary)',
                          boxShadow: cyberpunkMode ? '0 0 8px rgba(255,0,127,0.2)' : 'none'
                        }} 
                      />
                      <Button 
                        label="Guardar" 
                        icon="pi pi-bookmark" 
                        onClick={() => {
                          if (!networkScanSubnet.trim()) return;
                          setSaveScanName('');
                          setIsSavingScan(true);
                        }} 
                        disabled={loading || !networkScanSubnet.trim()} 
                        style={{ 
                          background: 'rgba(245,158,11,0.08)', 
                          border: '1px solid rgba(245,158,11,0.3)', 
                          borderRadius: '6px', 
                          padding: '0.35rem 0.6rem', 
                          height: '30px', 
                          fontSize: '0.75rem', 
                          color: '#f59e0b'
                        }} 
                      />
                      {result && (
                        <Button 
                          label="Ver Guardados" 
                          icon="pi pi-list" 
                          onClick={() => {
                            setResult(null);
                            setViewingSavedScan(null);
                          }}
                          style={{ 
                            background: 'rgba(255,255,255,0.06)', 
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: '6px', 
                            padding: '0.35rem 0.6rem', 
                            height: '30px', 
                            fontSize: '0.75rem', 
                            color: 'var(--text-color-secondary)',
                            marginLeft: '0.25rem'
                          }} 
                        />
                      )}
                    </div>
                    {showScanConfig && (
                      <div style={{
                        marginTop: '0.5rem',
                        background: 'rgba(30, 25, 45, 0.4)',
                        border: '1px solid rgba(245,158,11,0.2)',
                        borderRadius: '8px',
                        padding: '0.75rem 1rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        width: '100%',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>Puertos a sondear:</span>
                          <InputText 
                            value={scanPortsToScan} 
                            onChange={(e) => setScanPortsToScan(e.target.value)} 
                            placeholder="Ej: 22,80,443" 
                            style={{ 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid rgba(255,255,255,0.15)', 
                              borderRadius: '6px', 
                              color: 'var(--text-color)', 
                              padding: '0.35rem 0.5rem', 
                              fontSize: '0.75rem',
                              height: '28px'
                            }} 
                          />
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-color-secondary)' }}>Lista o rango (ej: 1-1024). Vacío para ninguno.</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>Timeout Ping (ms):</span>
                          <InputNumber 
                            value={scanPingTimeout} 
                            onValueChange={(e) => setScanPingTimeout(e.value || 1000)} 
                            min={100}
                            max={10000}
                            showButtons={false}
                            inputStyle={{ 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid rgba(255,255,255,0.15)', 
                              borderRadius: '6px', 
                              color: 'var(--text-color)', 
                              padding: '0.35rem 0.5rem', 
                              fontSize: '0.75rem',
                              height: '28px',
                              width: '100%'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f59e0b' }}>Concurrencia (hosts):</span>
                          <InputNumber 
                            value={scanConcurrency} 
                            onValueChange={(e) => setScanConcurrency(e.value || 50)} 
                            min={1}
                            max={254}
                            showButtons={false}
                            inputStyle={{ 
                              background: 'rgba(255,255,255,0.05)', 
                              border: '1px solid rgba(255,255,255,0.15)', 
                              borderRadius: '6px', 
                              color: 'var(--text-color)', 
                              padding: '0.35rem 0.5rem', 
                              fontSize: '0.75rem',
                              height: '28px',
                              width: '100%'
                            }} 
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: '#e8f4ff' }}>
                            <input 
                              type="checkbox" 
                              checked={scanNmapEnabled} 
                              onChange={(e) => setScanNmapEnabled(e.checked ?? e.target.checked)} 
                              style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                            />
                            Detección avanzada SO (Nmap)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: '#e8f4ff' }}>
                            <input 
                              type="checkbox" 
                              checked={scanNetbiosEnabled} 
                              onChange={(e) => setScanNetbiosEnabled(e.checked ?? e.target.checked)} 
                              style={{ accentColor: '#f59e0b', cursor: 'pointer' }}
                            />
                            Resolución NetBIOS
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {selectedTool === 'dns-lookup' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600' }}>Dominio:</span>
                    <InputText value={dnsLookupDomain} onChange={(e) => setDnsLookupDomain(e.target.value)} placeholder="ejemplo.com" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '220px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600' }}>Tipo:</span>
                    <Dropdown value={dnsLookupType} options={DNS_RECORD_TYPES} onChange={(e) => setDnsLookupType(e.value)} style={{ height: '30px', border: '1px solid rgba(59,130,246,0.3)', background: 'rgba(255,255,255,0.08)', fontSize: '0.8rem', minWidth: '130px' }} />
                    <Button label="Consultar" icon="pi pi-search" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'reverse-dns' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600' }}>IP:</span>
                    <InputText value={reverseDnsIp} onChange={(e) => setReverseDnsIp(e.target.value)} placeholder="8.8.8.8" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '200px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Consultar" icon="pi pi-search" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'http-headers' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>URL:</span>
                    <InputText value={httpHeadersUrl} onChange={(e) => setHttpHeadersUrl(e.target.value)} placeholder="https://ejemplo.com" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '320px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Analizar" icon="pi pi-search" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'whois' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600' }}>Dominio:</span>
                    <InputText value={whoisDomain} onChange={(e) => setWhoisDomain(e.target.value)} placeholder="ejemplo.com" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '220px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Consultar" icon="pi pi-search" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'subnet-calc' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600' }}>CIDR:</span>
                    <InputText value={subnetCalcCidr} onChange={(e) => setSubnetCalcCidr(e.target.value)} placeholder="192.168.1.0/24" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '200px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Calcular" icon="pi pi-calculator" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                 {selectedTool === 'wake-on-lan' && isSavingDevice && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: `linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.15)} 0%, rgba(30, 25, 45, 0.6) 100%)`,
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                    width: 'fit-content',
                    maxWidth: '850px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Nombre:</span>
                    <InputText value={saveDeviceName} onChange={(e) => setSaveDeviceName(e.target.value)} placeholder="Ej: NAS" style={{ width: '130px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`, borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '32px' }} autoFocus />
                    <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>IP / Host (opcional):</span>
                    <InputText value={saveDeviceIp} onChange={(e) => setSaveDeviceIp(e.target.value)} placeholder="Ej: 192.168.1.50" onKeyPress={(e) => e.key === 'Enter' && handleSaveDevice()} style={{ width: '150px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`, borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '32px' }} />
                    <Button label="Guardar" icon="pi pi-check" onClick={handleSaveDevice} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '32px', fontSize: '0.75rem', fontWeight: '600', boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)' }} />
                    <Button label="Cancelar" icon="pi pi-times" onClick={() => setIsSavingDevice(false)} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '32px', fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-color)' }} />
                  </div>
                )}
                {selectedTool === 'wake-on-lan' && !isSavingDevice && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    background: `linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.15)} 0%, rgba(30, 25, 45, 0.6) 100%)`,
                    padding: '0.6rem 1rem',
                    borderRadius: '10px',
                    border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                    width: 'fit-content',
                    maxWidth: '850px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>MAC:</span>
                    <InputText value={wolMac} onChange={(e) => setWolMac(e.target.value)} placeholder="AA:BB:CC:DD:EE:FF" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '180px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`, borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '32px' }} />
                    <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>Broadcast:</span>
                    <InputText value={wolBroadcast} onChange={(e) => setWolBroadcast(e.target.value)} placeholder="255.255.255.255" style={{ width: '150px', background: 'rgba(255,255,255,0.06)', border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`, borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '32px' }} />
                    <Button label="Enviar" icon="pi pi-power-off" onClick={executeTool} disabled={loading} style={{ background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${hexToRgba(themeColors.primaryColor, 0.8)} 100%)`, border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '32px', fontSize: '0.75rem', fontWeight: '600', boxShadow: `0 2px 8px ${hexToRgba(themeColors.primaryColor, 0.35)}`, marginLeft: '0.25rem' }} />
                    <Button label="Guardar" icon="pi pi-bookmark" onClick={() => {
                      if (!wolMac.trim()) return;
                      setSaveDeviceName('');
                      setIsSavingDevice(true);
                    }} disabled={loading || !wolMac.trim()} style={{ background: hexToRgba(themeColors.primaryColor, 0.08), border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.3)}`, borderRadius: '6px', padding: '0.35rem 0.75rem', height: '32px', fontSize: '0.75rem', fontWeight: '600', color: themeColors.primaryColor, marginLeft: '0.25rem' }} />
                  </div>
                )}
                {selectedTool === 'host-vuln-scan' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600' }}>Host:</span>
                    <InputText value={hostVulnHost} onChange={(e) => setHostVulnHost(e.target.value)} placeholder="192.168.1.1" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '200px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Escanear" icon="pi pi-exclamation-triangle" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
                {selectedTool === 'web-security-scan' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600' }}>URL:</span>
                    <InputText value={webSecurityUrl} onChange={(e) => setWebSecurityUrl(e.target.value)} placeholder="https://ejemplo.com" onKeyPress={(e) => e.key === 'Enter' && executeTool()} style={{ width: '320px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: '6px', color: 'var(--text-color)', padding: '0.35rem 0.5rem', fontSize: '0.8rem', height: '30px' }} />
                    <Button label="Analizar" icon="pi pi-shield" onClick={executeTool} disabled={loading} style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem', height: '30px', fontSize: '0.75rem' }} />
                  </div>
                )}
              </div>
            )}
            <div className="network-tools-form-results" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
              {!['ssl-check', 'ping', 'traceroute', 'port-scan', 'network-scan', 'dns-lookup', 'reverse-dns', 'http-headers', 'whois', 'subnet-calc', 'wake-on-lan', 'host-vuln-scan', 'web-security-scan', 'cvss-calculator'].includes(selectedTool) && (
                <div className="network-tools-form" style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  {renderToolForm()}
                </div>
              )}
              <div className="network-tools-results" style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
                {renderResults()}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style key={isMobile ? 'mobile' : 'desktop'}>{`
        .network-tools-dialog .p-dialog {
          position: fixed !important;
          max-width: 95vw !important;
          max-height: 95vh !important;
          min-width: 800px !important;
          min-height: 600px !important;
          margin: 0 !important;
          border-radius: 8px !important;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5) !important;
          transition: width 0.2s ease, height 0.2s ease !important;
        }
        .network-tools-dialog .p-dialog-mask {
          background-color: rgba(0, 0, 0, 0.9) !important;
        }
        /* Scrollbar personalizado con tema */
        .network-tools-sidebar::-webkit-scrollbar,
        .network-tools-form::-webkit-scrollbar,
        .network-tools-results::-webkit-scrollbar {
          width: 8px !important;
          height: 8px !important;
        }
        .network-tools-sidebar::-webkit-scrollbar-track,
        .network-tools-form::-webkit-scrollbar-track,
        .network-tools-results::-webkit-scrollbar-track {
          background: ${themeColors.background} !important;
          border-radius: 4px !important;
        }
        .network-tools-sidebar::-webkit-scrollbar-thumb,
        .network-tools-form::-webkit-scrollbar-thumb,
        .network-tools-results::-webkit-scrollbar-thumb {
          background: ${themeColors.borderColor} !important;
          border-radius: 4px !important;
          opacity: 0.6 !important;
        }
        .network-tools-sidebar::-webkit-scrollbar-thumb:hover,
        .network-tools-form::-webkit-scrollbar-thumb:hover,
        .network-tools-results::-webkit-scrollbar-thumb:hover {
          background: ${themeColors.textSecondary} !important;
          opacity: 0.8 !important;
        }
        /* Firefox scrollbar */
        .network-tools-sidebar,
        .network-tools-form,
        .network-tools-results {
          scrollbar-width: thin !important;
          scrollbar-color: ${themeColors.borderColor} ${themeColors.background} !important;
        }
        /* Estilos para details/summary desplegable */
        .network-tools-results details summary {
          list-style: none !important;
        }
        .network-tools-results details summary::-webkit-details-marker {
          display: none !important;
        }
        .network-tools-results details summary .pi-chevron-right {
          transition: transform 0.2s ease !important;
        }
        .network-tools-results details[open] summary .pi-chevron-right {
          transform: rotate(90deg) !important;
        }
        .network-tools-results details summary:hover {
          background: rgba(59, 130, 246, 0.15) !important;
        }
        .network-tools-dialog .p-dialog-content {
          display: flex !important;
          flex-direction: column !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .network-tools-dialog-content {
          display: flex;
          flex-direction: ${isMobile ? 'column' : 'row'};
          flex: 1;
          min-height: 0;
          overflow: hidden;
          width: 100%;
        }
        .network-tools-sidebar {
          width: ${isMobile ? '100%' : '240px'};
          min-width: ${isMobile ? 'auto' : '200px'};
          max-width: ${isMobile ? '100%' : '280px'};
          flex-shrink: 0;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: ${isMobile ? '200px' : 'none'};
        }
        .network-tools-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
        }
        .network-tools-form-results {
          flex: 1;
          display: flex;
          flex-direction: ${isMobile ? 'column' : 'row'};
          min-height: 0;
          overflow: hidden;
        }
        .network-tools-form {
          width: ${isMobile ? '100%' : '320px'};
          min-width: ${isMobile ? 'auto' : '280px'};
          max-width: ${isMobile ? '100%' : '400px'};
          flex-shrink: 0;
          overflow-y: auto;
          overflow-x: hidden;
          max-height: ${isMobile ? '300px' : 'none'};
        }
        .network-tools-results {
          flex: 1;
          min-width: 0;
          overflow-y: auto;
          overflow-x: hidden;
          min-height: ${isMobile ? '300px' : 0};
          max-height: 100%;
        }
        .network-tools-dialog .p-dialog-header {
          cursor: move !important;
          user-select: none !important;
        }
        .network-tools-dialog .p-dialog-header:active {
          cursor: grabbing !important;
        }
        .network-tools-dialog .p-resizable-handle {
          background: transparent !important;
          border: 2px solid rgba(6, 182, 212, 0.4) !important;
          border-radius: 4px !important;
          transition: all 0.15s ease !important;
          z-index: 1000 !important;
        }
        .network-tools-dialog .p-resizable-handle:hover {
          background: rgba(6, 182, 212, 0.3) !important;
          border-color: rgba(6, 182, 212, 0.8) !important;
          border-width: 3px !important;
        }
        .network-tools-dialog .p-resizable-handle:active {
          background: rgba(6, 182, 212, 0.5) !important;
          border-color: rgba(6, 182, 212, 1) !important;
        }
        .network-tools-dialog .p-resizable-handle-se {
          width: 24px !important;
          height: 24px !important;
          right: -2px !important;
          bottom: -2px !important;
          cursor: nwse-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-e {
          width: 12px !important;
          right: -2px !important;
          cursor: ew-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-w {
          width: 12px !important;
          left: -2px !important;
          cursor: ew-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-s {
          height: 12px !important;
          bottom: -2px !important;
          cursor: ns-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-n {
          height: 12px !important;
          top: -2px !important;
          cursor: ns-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-ne {
          width: 24px !important;
          height: 24px !important;
          top: -2px !important;
          right: -2px !important;
          cursor: nesw-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-nw {
          width: 24px !important;
          height: 24px !important;
          top: -2px !important;
          left: -2px !important;
          cursor: nwse-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-sw {
          width: 24px !important;
          height: 24px !important;
          bottom: -2px !important;
          left: -2px !important;
          cursor: nesw-resize !important;
        }
      `}</style>
    <Dialog
      visible={visible}
      onHide={onHide}
      header={dialogHeader}
      className="network-tools-dialog"
      style={{ 
        width: `${dialogSize.width}px`,
        maxWidth: '95vw',
        minWidth: '800px',
        height: `${dialogSize.height}px`,
        maxHeight: '95vh',
        minHeight: '600px',
        margin: 0
      }}
      contentStyle={{ 
        padding: 0,
        paddingBottom: '1rem',
        background: themeColors.background,
        color: themeColors.textPrimary,
        borderRadius: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: `calc(${dialogSize.height}px - 60px)`,
        minHeight: 'calc(600px - 60px)',
        maxHeight: 'calc(95vh - 60px)'
      }}
      headerStyle={{
        background: themeColors.cardBackground,
        borderBottom: '1px solid ' + themeColors.borderColor,
        color: themeColors.textPrimary,
        padding: '1rem 1.5rem',
        flexShrink: 0,
        cursor: 'move'
      }}
      modal
      dismissableMask
      draggable={true}
      resizable={true}
      onResize={(e) => {
        // Actualizar el estado durante el redimensionamiento para mejor respuesta
        const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
        if (dialogElement) {
          const width = dialogElement.clientWidth || dialogElement.offsetWidth;
          if (width > 0) {
            setIsMobile(width < 1200);
            setWindowWidth(width);
          }
        }
      }}
      onResizeEnd={(e) => {
        // Actualizar el estado cuando termina el redimensionamiento
        setTimeout(() => {
          const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
          if (dialogElement) {
            const width = dialogElement.clientWidth || dialogElement.offsetWidth;
            const height = dialogElement.clientHeight || dialogElement.offsetHeight;
            if (width > 0 && height > 0) {
              // Asegurar que el diálogo no se salga de los límites de la pantalla
              const maxWidth = window.innerWidth * 0.95;
              const maxHeight = window.innerHeight * 0.95;
              const minWidth = 800;
              const minHeight = 600;
              
              const finalWidth = Math.max(minWidth, Math.min(maxWidth, width));
              const finalHeight = Math.max(minHeight, Math.min(maxHeight, height));
              
              dialogElement.style.width = `${finalWidth}px`;
              dialogElement.style.height = `${finalHeight}px`;
              
              // Asegurar que el diálogo no se salga de la pantalla
              const rect = dialogElement.getBoundingClientRect();
              if (rect.left < 0) {
                dialogElement.style.left = '0px';
              }
              if (rect.top < 0) {
                dialogElement.style.top = '0px';
              }
              if (rect.right > window.innerWidth) {
                dialogElement.style.left = `${window.innerWidth - finalWidth}px`;
              }
              if (rect.bottom > window.innerHeight) {
                dialogElement.style.top = `${window.innerHeight - finalHeight}px`;
              }
              
              // Guardar tamaño para próxima vez
              const newSize = { width: finalWidth, height: finalHeight };
              setDialogSize(newSize);
              try {
                localStorage.setItem('network-tools-dialog-size', JSON.stringify(newSize));
              } catch (e) {
                console.warn('Error saving dialog size:', e);
              }
              
              setIsMobile(finalWidth < 1200);
              setWindowWidth(finalWidth);
            }
          }
        }, 50);
      }}
    >
      <div className="network-tools-dialog-content">
        {/* Sidebar de categorías */}
        <div className="network-tools-sidebar" style={{
          background: 'rgba(0,0,0,0.2)',
          paddingBottom: '1rem',
          borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
        }}>
          {TOOL_CATEGORIES.map(category => (
            <div key={category.id}>
              {/* Header de categoría */}
              <div style={{
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: selectedCategory === category.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                borderLeft: `3px solid ${selectedCategory === category.id ? category.color : 'transparent'}`,
                color: category.color,
                fontWeight: '600',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <i className={category.icon} style={{ fontSize: '0.9rem' }} />
                {category.label}
              </div>
              
              {/* Herramientas de la categoría */}
              {category.tools.map(tool => (
                <div
                  key={tool.id}
                  onClick={() => handleToolSelect(category.id, tool.id)}
                  style={{
                    padding: '0.6rem 1rem 0.6rem 2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: selectedTool === tool.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                    borderLeft: `3px solid ${selectedTool === tool.id ? category.color : 'transparent'}`,
                    transition: 'all 0.15s ease',
                    color: selectedTool === tool.id ? 'var(--text-color)' : 'var(--text-color-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTool !== tool.id) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTool !== tool.id) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <i className={tool.icon} style={{ fontSize: '0.85rem', opacity: 0.8 }} />
                  <span style={{ fontSize: '0.85rem' }}>{tool.label}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Panel principal */}
        <div className="network-tools-main">
          {/* Header de herramienta seleccionada */}
          {currentTool && (
            <div style={{
              padding: isMobile ? '0.75rem 1rem' : '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'rgba(0,0,0,0.1)',
              flexShrink: 0
            }}>
              {/* Primera fila: Solo título para herramientas con header especial, título + botón para otros */}
              {!['ssl-check', 'ping', 'traceroute', 'port-scan', 'network-scan', 'dns-lookup', 'reverse-dns', 'http-headers', 'whois', 'subnet-calc', 'wake-on-lan', 'host-vuln-scan', 'web-security-scan', 'cvss-calculator'].includes(selectedTool) ? (
                <div style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  alignItems: isMobile ? 'flex-start' : 'center',
                  justifyContent: 'space-between',
                  gap: isMobile ? '0.75rem' : '0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${currentTool.categoryColor}30 0%, ${currentTool.categoryColor}15 100%)`,
                      border: `1px solid ${currentTool.categoryColor}50`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <i className={currentTool.icon} style={{ color: currentTool.categoryColor, fontSize: '0.9rem' }} />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentTool.label}</h4>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', display: isMobile ? 'none' : 'block' }}>
                        {currentTool.description}
                      </span>
                    </div>
                  </div>
                  <Button
                    label={isMobile ? undefined : "Ejecutar"}
                    icon="pi pi-play"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: `linear-gradient(135deg, ${currentTool.categoryColor} 0%, ${currentTool.categoryColor}cc 100%)`,
                      border: 'none',
                      borderRadius: '8px',
                      flexShrink: 0
                    }}
                  />
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${currentTool.categoryColor}30 0%, ${currentTool.categoryColor}15 100%)`,
                    border: `1px solid ${currentTool.categoryColor}50`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <i className={currentTool.icon} style={{ color: currentTool.categoryColor, fontSize: '0.9rem' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{currentTool.label}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)', display: isMobile ? 'none' : 'block' }}>
                      {currentTool.description}
                    </span>
                  </div>
                </div>
              )}

              {/* Card refinada y compacta para SSL Checker */}
              {selectedTool === 'ssl-check' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(6, 182, 212, 0.35)',
                  width: 'fit-content',
                  maxWidth: '650px',
                  boxShadow: '0 2px 12px rgba(6, 182, 212, 0.15)'
                }}>
                  {/* Host */}
                  <span style={{ 
                    color: '#06b6d4', 
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}>
                    Host:
                  </span>
                  <InputText
                    value={sslCheckHost}
                    onChange={(e) => setSslCheckHost(e.target.value)}
                    placeholder="ejemplo.com"
                    style={{
                      width: '180px',
                      minWidth: '180px',
                      maxWidth: '250px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Puerto */}
                  <span style={{ 
                    color: '#06b6d4', 
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    marginLeft: '0.25rem'
                  }}>
                    Puerto:
                  </span>
                  <InputNumber
                    value={sslCheckPort}
                    onValueChange={(e) => setSslCheckPort(e.value)}
                    min={1}
                    max={65535}
                    placeholder="443"
                    showButtons={false}
                    style={{
                      width: '60px',
                      minWidth: '60px',
                      maxWidth: '60px'
                    }}
                    inputStyle={{
                      padding: '0.35rem 0.4rem',
                      height: '30px',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      width: '100%',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(6, 182, 212, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)'
                    }}
                  />
                  
                  {/* Botón Ejecutar compacto - sin gap extra */}
                  <Button
                    label="Ejecutar"
                    icon="pi pi-play"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: `linear-gradient(135deg, ${currentTool.categoryColor} 0%, ${currentTool.categoryColor}cc 100%)`,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      transition: 'all 0.2s ease',
                      minWidth: 'auto',
                      marginLeft: '0.25rem'
                    }}
                    iconPos="left"
                  />
                </div>
              )}

              {/* Card para Ping */}
              {selectedTool === 'ping' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(34, 197, 94, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.15)'
                }}>
                  {/* Host */}
                  <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Host:
                  </span>
                  <InputText
                    value={pingHost}
                    onChange={(e) => setPingHost(e.target.value)}
                    placeholder="ejemplo.com o 192.168.1.1"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Ejecutar */}
                  <Button
                    label="Ejecutar"
                    icon="pi pi-play"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Traceroute */}
              {selectedTool === 'traceroute' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(34, 197, 94, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.15)'
                }}>
                  {/* Host */}
                  <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Host:
                  </span>
                  <InputText
                    value={tracerouteHost}
                    onChange={(e) => setTracerouteHost(e.target.value)}
                    placeholder="ejemplo.com o 8.8.8.8"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Ejecutar */}
                  <Button
                    label="Ejecutar"
                    icon="pi pi-play"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Port Scanner */}
              {selectedTool === 'port-scan' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(245, 158, 11, 0.15)'
                }}>
                  {/* Host */}
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Host:
                  </span>
                  <InputText
                    value={portScanHost}
                    onChange={(e) => setPortScanHost(e.target.value)}
                    placeholder="ejemplo.com o 192.168.1.1"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Ejecutar */}
                  <Button
                    label="Escanear"
                    icon="pi pi-search"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Network Scan */}
              {selectedTool === 'network-scan' && isSavingScan && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  width: 'fit-content',
                  maxWidth: '750px',
                  boxShadow: '0 2px 12px rgba(245, 158, 11, 0.15)'
                }}>
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600' }}>Nombre:</span>
                  <InputText 
                    value={saveScanName} 
                    onChange={(e) => setSaveScanName(e.target.value)} 
                    placeholder="Ej: Red Hogar" 
                    style={{ 
                      width: '180px', 
                      background: 'rgba(255,255,255,0.08)', 
                      border: '1px solid rgba(245, 158, 11, 0.3)', 
                      borderRadius: '6px', 
                      color: 'var(--text-color)', 
                      padding: '0.35rem 0.5rem', 
                      fontSize: '0.8rem', 
                      height: '30px' 
                    }} 
                    autoFocus 
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveScan()} 
                  />
                  <Button 
                    label="Guardar" 
                    icon="pi pi-check" 
                    onClick={handleSaveScan} 
                    style={{ 
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', 
                      border: 'none', 
                      borderRadius: '6px', 
                      padding: '0.35rem 0.75rem', 
                      height: '30px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      marginLeft: '0.25rem'
                    }} 
                  />
                  <Button 
                    label="Cancelar" 
                    icon="pi pi-times" 
                    onClick={() => setIsSavingScan(false)} 
                    style={{ 
                      background: 'rgba(255,255,255,0.08)', 
                      border: '1px solid rgba(255, 255, 255, 0.15)', 
                      borderRadius: '6px', 
                      padding: '0.35rem 0.75rem', 
                      height: '30px', 
                      fontSize: '0.75rem', 
                      color: 'var(--text-color)',
                      marginLeft: '0.25rem'
                    }} 
                  />
                </div>
              )}
              {selectedTool === 'network-scan' && !isSavingScan && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  width: 'fit-content',
                  maxWidth: '850px',
                  boxShadow: '0 2px 12px rgba(245, 158, 11, 0.15)'
                }}>
                  {/* Subred */}
                  <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Subred:
                  </span>
                  <InputText
                    value={networkScanSubnet}
                    onChange={(e) => setNetworkScanSubnet(e.target.value)}
                    placeholder="192.168.1.0/24"
                    style={{
                      width: '200px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool({ networkScanMode: 'quick' })}
                  />
                  
                  <Button
                    label="Rápido"
                    icon="pi pi-bolt"
                    onClick={() => executeTool({ networkScanMode: 'quick' })}
                    disabled={loading}
                    title="Descubre hosts activos (ARP + DNS). Mucho más rápido."
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />

                  <Button
                    label="Completo"
                    icon="pi pi-search"
                    onClick={() => executeTool({ networkScanMode: 'full' })}
                    disabled={loading}
                    title="Incluye nmap, NetBIOS, SO y sondeo de puertos por host."
                    style={{
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />

                  <Button
                    label="Cyber ⚡"
                    icon="pi pi-bolt"
                    onClick={autoDetectAndScan}
                    disabled={loading}
                    title="Auto-detecta subred y escaneo rápido en vista cyber."
                    style={{
                      background: 'linear-gradient(135deg, #00f0ff 0%, #ff007f 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      boxShadow: '0 0 10px rgba(0, 240, 255, 0.4)',
                      color: '#fff',
                      marginLeft: '0.25rem'
                    }}
                  />
                  
                  <Button 
                    label={cyberpunkMode ? "Cyber: ON 🕶️" : "Cyber: OFF 🕶️"} 
                    icon={cyberpunkMode ? "pi pi-eye" : "pi pi-eye-slash"}
                    onClick={() => setCyberpunkMode(!cyberpunkMode)} 
                    style={{ 
                      background: cyberpunkMode ? 'linear-gradient(135deg, rgba(255,0,127,0.2) 0%, rgba(124,0,255,0.2) 100%)' : 'rgba(255,255,255,0.06)',
                      border: cyberpunkMode ? '1px solid #ff007f' : '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px', 
                      padding: '0.35rem 0.6rem', 
                      height: '30px', 
                      fontSize: '0.75rem',
                      color: cyberpunkMode ? '#ff007f' : 'var(--text-color-secondary)',
                      boxShadow: cyberpunkMode ? '0 0 8px rgba(255,0,127,0.2)' : 'none',
                      marginLeft: '0.25rem'
                    }} 
                  />

                  <Button 
                    label="Guardar" 
                    icon="pi pi-bookmark" 
                    onClick={() => {
                      if (!networkScanSubnet.trim()) return;
                      setSaveScanName('');
                      setIsSavingScan(true);
                    }} 
                    disabled={loading || !networkScanSubnet.trim()} 
                    style={{ 
                      background: 'rgba(245,158,11,0.08)', 
                      border: '1px solid rgba(245,158,11,0.3)', 
                      borderRadius: '6px', 
                      padding: '0.35rem 0.75rem', 
                      height: '30px', 
                      fontSize: '0.75rem', 
                      fontWeight: '600',
                      color: '#f59e0b',
                      marginLeft: '0.25rem'
                    }} 
                  />
                  {result && (
                    <Button 
                      label="Ver Guardados" 
                      icon="pi pi-list" 
                      onClick={() => {
                        setResult(null);
                        setViewingSavedScan(null);
                      }}
                      style={{ 
                        background: 'rgba(255,255,255,0.06)', 
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: '6px', 
                        padding: '0.35rem 0.75rem', 
                        height: '30px', 
                        fontSize: '0.75rem', 
                        fontWeight: '600',
                        color: 'var(--text-color-secondary)',
                        marginLeft: '0.25rem'
                      }} 
                    />
                  )}
                </div>
              )}

              {/* Card para DNS Lookup */}
              {selectedTool === 'dns-lookup' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(59, 130, 246, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(59, 130, 246, 0.15)'
                }}>
                  {/* Dominio */}
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Dominio:
                  </span>
                  <InputText
                    value={dnsLookupDomain}
                    onChange={(e) => setDnsLookupDomain(e.target.value)}
                    placeholder="ejemplo.com"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Buscar */}
                  <Button
                    label="Buscar"
                    icon="pi pi-search"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Reverse DNS */}
              {selectedTool === 'reverse-dns' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(59, 130, 246, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(59, 130, 246, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(59, 130, 246, 0.15)'
                }}>
                  {/* IP */}
                  <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    IP:
                  </span>
                  <InputText
                    value={reverseDnsIp}
                    onChange={(e) => setReverseDnsIp(e.target.value)}
                    placeholder="8.8.8.8"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Buscar */}
                  <Button
                    label="Buscar"
                    icon="pi pi-search"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para HTTP Headers */}
              {selectedTool === 'http-headers' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(239, 68, 68, 0.15)'
                }}>
                  {/* URL */}
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    URL:
                  </span>
                  <InputText
                    value={httpHeadersUrl}
                    onChange={(e) => setHttpHeadersUrl(e.target.value)}
                    placeholder="https://ejemplo.com"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Analizar */}
                  <Button
                    label="Analizar"
                    icon="pi pi-file"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para WHOIS */}
              {selectedTool === 'whois' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(139, 92, 246, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(139, 92, 246, 0.15)'
                }}>
                  {/* Dominio */}
                  <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Dominio:
                  </span>
                  <InputText
                    value={whoisDomain}
                    onChange={(e) => setWhoisDomain(e.target.value)}
                    placeholder="ejemplo.com"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Buscar */}
                  <Button
                    label="Buscar"
                    icon="pi pi-search"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Subnet Calculator */}
              {selectedTool === 'subnet-calc' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(139, 92, 246, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(139, 92, 246, 0.15)'
                }}>
                  {/* CIDR */}
                  <span style={{ color: '#8b5cf6', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    CIDR:
                  </span>
                  <InputText
                    value={subnetCalcCidr}
                    onChange={(e) => setSubnetCalcCidr(e.target.value)}
                    placeholder="192.168.1.0/24"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Calcular */}
                  <Button
                    label="Calcular"
                    icon="pi pi-calculator"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(139, 92, 246, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Wake on LAN */}
              {selectedTool === 'wake-on-lan' && isSavingDevice && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.15)} 0%, rgba(30, 25, 45, 0.6) 100%)`,
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                  width: 'fit-content',
                  maxWidth: '850px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Nombre:
                  </span>
                  <InputText
                    value={saveDeviceName}
                    onChange={(e) => setSaveDeviceName(e.target.value)}
                    placeholder="Ej: NAS"
                    style={{
                      width: '130px',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '32px'
                    }}
                    autoFocus
                  />
                  <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    IP / Host (opcional):
                  </span>
                  <InputText
                    value={saveDeviceIp}
                    onChange={(e) => setSaveDeviceIp(e.target.value)}
                    placeholder="Ej: 192.168.1.50"
                    style={{
                      width: '150px',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '32px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleSaveDevice()}
                  />
                  <Button
                    label="Guardar"
                    icon="pi pi-check"
                    onClick={handleSaveDevice}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '32px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                    }}
                  />
                  <Button
                    label="Cancelar"
                    icon="pi pi-times"
                    onClick={() => setIsSavingDevice(false)}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '32px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: 'var(--text-color)'
                    }}
                  />
                </div>
              )}
              {selectedTool === 'wake-on-lan' && !isSavingDevice && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: `linear-gradient(135deg, ${hexToRgba(themeColors.primaryColor, 0.15)} 0%, rgba(30, 25, 45, 0.6) 100%)`,
                  padding: '0.6rem 1rem',
                  borderRadius: '10px',
                  border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                  width: 'fit-content',
                  maxWidth: '850px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                  flexWrap: 'wrap'
                }}>
                  {/* MAC */}
                  <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    MAC:
                  </span>
                  <InputText
                    value={wolMac}
                    onChange={(e) => setWolMac(e.target.value)}
                    placeholder="AA:BB:CC:DD:EE:FF"
                    style={{
                      width: '180px',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '32px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Broadcast */}
                  <span style={{ color: themeColors.primaryColor, fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Broadcast:
                  </span>
                  <InputText
                    value={wolBroadcast}
                    onChange={(e) => setWolBroadcast(e.target.value)}
                    placeholder="255.255.255.255"
                    style={{
                      width: '150px',
                      background: 'rgba(255,255,255,0.06)',
                      border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.25)}`,
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '32px'
                    }}
                  />
                  
                  {/* Botón Enviar */}
                  <Button
                    label="Enviar"
                    icon="pi pi-power-off"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${hexToRgba(themeColors.primaryColor, 0.8)} 100%)`,
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '32px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: `0 2px 8px ${hexToRgba(themeColors.primaryColor, 0.35)}`,
                      marginLeft: '0.25rem'
                    }}
                  />

                  {/* Botón Guardar */}
                  <Button
                    label="Guardar"
                    icon="pi pi-bookmark"
                    onClick={() => {
                      if (!wolMac.trim()) return;
                      setSaveDeviceName('');
                      setIsSavingDevice(true);
                    }}
                    disabled={loading || !wolMac.trim()}
                    style={{
                      background: hexToRgba(themeColors.primaryColor, 0.08),
                      border: `1px solid ${hexToRgba(themeColors.primaryColor, 0.3)}`,
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '32px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      color: themeColors.primaryColor,
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}

              {/* Card para Host Vulnerability Scanner */}
              {selectedTool === 'host-vuln-scan' && (
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(239, 68, 68, 0.35)',
                  width: '100%',
                  maxWidth: '900px',
                  boxShadow: '0 2px 12px rgba(239, 68, 68, 0.15)'
                }}>
                  {/* Host */}
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Host:
                  </span>
                  <InputText
                    value={hostVulnHost}
                    onChange={(e) => setHostVulnHost(e.target.value)}
                    placeholder="192.168.1.1 o ejemplo.com"
                    style={{
                      width: '180px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Puertos */}
                  <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    Puertos:
                  </span>
                  <InputText
                    value={hostVulnPorts}
                    onChange={(e) => setHostVulnPorts(e.target.value)}
                    placeholder="22,80,443..."
                    style={{
                      width: '200px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                  />
                  
                  {/* Checkbox Online */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <input
                      type="checkbox"
                      checked={hostVulnUseOnline}
                      onChange={(e) => setHostVulnUseOnline(e.target.checked)}
                      style={{ width: '14px', height: '14px', accentColor: '#ef4444' }}
                    />
                    <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.7rem' }}>
                      NVD Online
                    </span>
                  </div>
                  
                  {/* Botón Escanear */}
                  <Button
                    label="Escanear"
                    icon="pi pi-search"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
                      marginLeft: 'auto'
                    }}
                  />
                </div>
              )}

              {/* Card para Web Security Scanner */}
              {selectedTool === 'web-security-scan' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.12) 0%, rgba(34, 197, 94, 0.04) 100%)',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: '1.5px solid rgba(34, 197, 94, 0.35)',
                  width: 'fit-content',
                  maxWidth: '700px',
                  boxShadow: '0 2px 12px rgba(34, 197, 94, 0.15)'
                }}>
                  {/* URL */}
                  <span style={{ color: '#22c55e', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                    URL:
                  </span>
                  <InputText
                    value={webSecurityUrl}
                    onChange={(e) => setWebSecurityUrl(e.target.value)}
                    placeholder="https://ejemplo.com"
                    style={{
                      width: '300px',
                      background: 'rgba(255,255,255,0.08)',
                      border: '1px solid rgba(34, 197, 94, 0.3)',
                      borderRadius: '6px',
                      color: 'var(--text-color)',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.8rem',
                      height: '30px'
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && executeTool()}
                  />
                  
                  {/* Botón Analizar */}
                  <Button
                    label="Analizar"
                    icon="pi pi-shield"
                    onClick={executeTool}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.35rem 0.75rem',
                      height: '30px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                      marginLeft: '0.25rem'
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Contenido: formulario y resultados */}
          <div className="network-tools-form-results">
            {/* Panel de formulario - Solo si NO es tool con header especial */}
            {!['ssl-check', 'ping', 'traceroute', 'port-scan', 'network-scan', 'dns-lookup', 'reverse-dns', 'http-headers', 'whois', 'subnet-calc', 'wake-on-lan', 'host-vuln-scan', 'web-security-scan', 'cvss-calculator'].includes(selectedTool) && (
              <div className="network-tools-form" style={{
                padding: '1rem',
                paddingBottom: '2rem',
                borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {renderToolForm()}
              </div>
            )}

            {/* Panel de resultados - Full width para tools con header especial */}
            <div className="network-tools-results" style={{
              padding: '1rem',
              paddingBottom: '2rem',
              background: 'rgba(0,0,0,0.1)',
              width: ['ssl-check', 'ping', 'traceroute', 'port-scan', 'network-scan', 'dns-lookup', 'reverse-dns', 'http-headers', 'whois', 'subnet-calc', 'wake-on-lan', 'host-vuln-scan', 'web-security-scan', 'cvss-calculator'].includes(selectedTool) ? '100%' : undefined
            }}>
              {!['ssl-check', 'ping', 'traceroute', 'port-scan', 'network-scan', 'dns-lookup', 'reverse-dns', 'http-headers', 'whois', 'subnet-calc', 'wake-on-lan', 'host-vuln-scan', 'web-security-scan', 'cvss-calculator'].includes(selectedTool) && (
                <div style={{
                  marginBottom: '0.75rem',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  color: 'var(--text-color-secondary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  Resultados
                </div>
              )}
              {renderResults()}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
    </>
  );
};

export default NetworkToolsDialog;
