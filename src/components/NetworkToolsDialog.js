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
      { id: 'http-headers', label: 'HTTP Headers', icon: 'pi pi-file', description: 'Análisis de cabeceras HTTP' }
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

const NetworkToolsDialog = ({ visible, onHide }) => {
  // Estados principales
  const [selectedCategory, setSelectedCategory] = useState('connectivity');
  const [selectedTool, setSelectedTool] = useState('ping');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [networkInterfaces, setNetworkInterfaces] = useState([]);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);
  const [liveOutput, setLiveOutput] = useState(''); // Salida en tiempo real

  // Estados de inputs para cada herramienta
  const [pingHost, setPingHost] = useState('');
  const [pingCount, setPingCount] = useState(4);
  
  const [tracerouteHost, setTracerouteHost] = useState('');
  const [tracerouteMaxHops, setTracerouteMaxHops] = useState(30);
  
  const [portScanHost, setPortScanHost] = useState('');
  const [portScanPorts, setPortScanPorts] = useState('21,22,23,25,53,80,110,143,443,993,995,3306,3389,5432,8080');
  
  const [networkScanSubnet, setNetworkScanSubnet] = useState('');
  
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

  // Cargar interfaces de red al abrir
  useEffect(() => {
    if (visible) {
      loadNetworkInterfaces();
    }
  }, [visible]);

  // Escuchar eventos de progreso en tiempo real
  useEffect(() => {
    if (!visible) return;

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
  }, [visible, selectedTool]);

  // Detectar cambios en el tamaño de la ventana y del diálogo para layout responsive
  useEffect(() => {
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

  // Handler genérico para ejecutar herramientas
  const executeTool = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setLiveOutput(''); // Limpiar salida anterior

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
          if (!networkScanSubnet.trim()) throw new Error('Subred es requerida');
          response = await ipc.invoke('network-tools:network-scan', { 
            subnet: networkScanSubnet.trim(),
            timeout: 1000 
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
      subnetCalcCidr, wolMac, wolBroadcast, liveOutput]);

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
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host / IP</label>
              <InputText
                value={pingHost}
                onChange={(e) => setPingHost(e.target.value)}
                placeholder="ejemplo.com o 192.168.1.1"
                style={commonInputStyle}
                onKeyPress={(e) => e.key === 'Enter' && executeTool()}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Número de pings</label>
              <InputNumber
                value={pingCount}
                onValueChange={(e) => setPingCount(e.value)}
                min={1}
                max={20}
                style={commonInputStyle}
              />
            </div>
          </>
        );

      case 'traceroute':
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host / IP</label>
              <InputText
                value={tracerouteHost}
                onChange={(e) => setTracerouteHost(e.target.value)}
                placeholder="ejemplo.com o 8.8.8.8"
                style={commonInputStyle}
                onKeyPress={(e) => e.key === 'Enter' && executeTool()}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Máximo de saltos</label>
              <InputNumber
                value={tracerouteMaxHops}
                onValueChange={(e) => setTracerouteMaxHops(e.value)}
                min={1}
                max={64}
                style={commonInputStyle}
              />
            </div>
          </>
        );

      case 'port-scan':
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host / IP</label>
              <InputText
                value={portScanHost}
                onChange={(e) => setPortScanHost(e.target.value)}
                placeholder="ejemplo.com o 192.168.1.1"
                style={commonInputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Puertos (ej: 80,443 o 1-100)</label>
              <InputText
                value={portScanPorts}
                onChange={(e) => setPortScanPorts(e.target.value)}
                placeholder="21,22,80,443 o 1-1024"
                style={commonInputStyle}
              />
            </div>
          </>
        );

      case 'network-scan':
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Subred (CIDR)</label>
              <InputText
                value={networkScanSubnet}
                onChange={(e) => setNetworkScanSubnet(e.target.value)}
                placeholder="192.168.1.0/24"
                style={commonInputStyle}
              />
            </div>
            {networkInterfaces.length > 0 && (
              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                <span style={{ fontWeight: '500' }}>Interfaces detectadas:</span>
                <div style={{ marginTop: '0.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {networkInterfaces.filter(i => i.family === 'IPv4').map((iface, idx) => (
                    <Badge 
                      key={idx}
                      value={`${iface.name}: ${iface.cidr || iface.address}`}
                      severity="info"
                      style={{ cursor: 'pointer' }}
                      onClick={() => iface.cidr && setNetworkScanSubnet(iface.cidr)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        );

      case 'dns-lookup':
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Dominio</label>
              <InputText
                value={dnsLookupDomain}
                onChange={(e) => setDnsLookupDomain(e.target.value)}
                placeholder="ejemplo.com"
                style={commonInputStyle}
                onKeyPress={(e) => e.key === 'Enter' && executeTool()}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Tipo de registro</label>
              <Dropdown
                value={dnsLookupType}
                onChange={(e) => setDnsLookupType(e.value)}
                options={DNS_RECORD_TYPES}
                style={{ ...commonInputStyle, width: '100%' }}
              />
            </div>
          </>
        );

      case 'reverse-dns':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>Dirección IP</label>
            <InputText
              value={reverseDnsIp}
              onChange={(e) => setReverseDnsIp(e.target.value)}
              placeholder="8.8.8.8"
              style={commonInputStyle}
              onKeyPress={(e) => e.key === 'Enter' && executeTool()}
            />
          </div>
        );

      case 'ssl-check':
        // Layout especial para SSL Checker: inputs horizontales arriba
        return null; // El formulario se renderiza en el header de la herramienta

      case 'http-headers':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>URL</label>
            <InputText
              value={httpHeadersUrl}
              onChange={(e) => setHttpHeadersUrl(e.target.value)}
              placeholder="https://ejemplo.com"
              style={commonInputStyle}
              onKeyPress={(e) => e.key === 'Enter' && executeTool()}
            />
          </div>
        );

      case 'whois':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>Dominio</label>
            <InputText
              value={whoisDomain}
              onChange={(e) => setWhoisDomain(e.target.value)}
              placeholder="ejemplo.com"
              style={commonInputStyle}
              onKeyPress={(e) => e.key === 'Enter' && executeTool()}
            />
          </div>
        );

      case 'subnet-calc':
        return (
          <div style={fieldStyle}>
            <label style={labelStyle}>CIDR (ej: 192.168.1.0/24)</label>
            <InputText
              value={subnetCalcCidr}
              onChange={(e) => setSubnetCalcCidr(e.target.value)}
              placeholder="192.168.1.0/24"
              style={commonInputStyle}
              onKeyPress={(e) => e.key === 'Enter' && executeTool()}
            />
          </div>
        );

      case 'wake-on-lan':
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Dirección MAC</label>
              <InputText
                value={wolMac}
                onChange={(e) => setWolMac(e.target.value)}
                placeholder="AA:BB:CC:DD:EE:FF"
                style={commonInputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Broadcast IP</label>
              <InputText
                value={wolBroadcast}
                onChange={(e) => setWolBroadcast(e.target.value)}
                placeholder="255.255.255.255"
                style={commonInputStyle}
              />
            </div>
          </>
        );

      default:
        return <div>Selecciona una herramienta</div>;
    }
  };

  // Renderizar resultados según la herramienta
  const renderResults = () => {
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
      return (
        <Message severity="error" text={error} style={{ width: '100%' }} />
      );
    }

    if (!result) {
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
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <strong>Red: {result.subnet}</strong>
              <Badge value={`${result.hosts?.length || 0} hosts encontrados`} severity="success" />
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.8rem' }}>
                ({(result.scanTime / 1000).toFixed(1)}s)
              </span>
            </div>
            {result.hosts && result.hosts.length > 0 ? (
              <DataTable value={result.hosts} size="small" stripedRows>
                <Column field="ip" header="IP" style={{ width: '150px' }} />
                <Column field="hostname" header="Hostname" body={(row) => row.hostname || '-'} />
                <Column field="responseTime" header="Respuesta" 
                        body={(row) => `${row.responseTime}ms`} style={{ width: '100px' }} />
              </DataTable>
            ) : (
              <Message severity="info" text="No se encontraron hosts activos" />
            )}
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
          <div style={resultBoxStyle}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              padding: '2rem'
            }}>
              <i className="pi pi-check-circle" style={{ fontSize: '3rem', color: '#22c55e', marginBottom: '1rem' }} />
              <strong style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Magic Packet Enviado</strong>
              <span style={{ color: 'var(--text-color-secondary)' }}>MAC: {result.mac}</span>
              <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.85rem' }}>
                Broadcast: {result.broadcast}:{result.port}
              </span>
            </div>
          </div>
        );

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

  return (
    <>
      <style key={isMobile ? 'mobile' : 'desktop'}>{`
        .network-tools-dialog .p-dialog {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          max-width: 100vw !important;
          max-height: 100vh !important;
          margin: 0 !important;
          border-radius: 0 !important;
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
          border: 2px solid rgba(6, 182, 212, 0.3) !important;
          border-radius: 4px !important;
          transition: all 0.2s ease !important;
          z-index: 1000 !important;
        }
        .network-tools-dialog .p-resizable-handle:hover {
          background: rgba(6, 182, 212, 0.2) !important;
          border-color: rgba(6, 182, 212, 0.6) !important;
        }
        .network-tools-dialog .p-resizable-handle-se {
          width: 20px !important;
          height: 20px !important;
          right: 0 !important;
          bottom: 0 !important;
          cursor: nwse-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-e {
          width: 8px !important;
          right: 0 !important;
          cursor: ew-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-w {
          width: 8px !important;
          left: 0 !important;
          cursor: ew-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-s {
          height: 8px !important;
          bottom: 0 !important;
          cursor: ns-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-n {
          height: 8px !important;
          top: 0 !important;
          cursor: ns-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-ne {
          width: 20px !important;
          height: 20px !important;
          top: 0 !important;
          right: 0 !important;
          cursor: nesw-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-nw {
          width: 20px !important;
          height: 20px !important;
          top: 0 !important;
          left: 0 !important;
          cursor: nwse-resize !important;
        }
        .network-tools-dialog .p-resizable-handle-sw {
          width: 20px !important;
          height: 20px !important;
          bottom: 0 !important;
          left: 0 !important;
          cursor: nesw-resize !important;
        }
      `}</style>
    <Dialog
      visible={visible}
      onHide={onHide}
      header={dialogHeader}
      className="network-tools-dialog"
      style={{ 
        width: '100vw',
        maxWidth: '100vw',
        minWidth: '100vw',
        height: '100vh',
        maxHeight: '100vh',
        margin: 0,
        top: 0,
        left: 0
      }}
      contentStyle={{ 
        padding: 0,
        paddingBottom: '1rem',
        background: 'var(--surface-ground)',
        borderRadius: '0',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 60px)',
        minHeight: 'calc(100vh - 60px)',
        maxHeight: 'calc(100vh - 60px)'
      }}
      headerStyle={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '1rem 1.5rem',
        flexShrink: 0,
        cursor: 'move'
      }}
      modal
      dismissableMask
      draggable={true}
      resizable={true}
      onResizeEnd={(e) => {
        // Actualizar el estado cuando termina el redimensionamiento
        setTimeout(() => {
          const dialogElement = document.querySelector('.network-tools-dialog .p-dialog');
          if (dialogElement) {
            const width = dialogElement.clientWidth || dialogElement.offsetWidth;
            if (width > 0) {
              setIsMobile(width < 1200);
              setWindowWidth(width);
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
              {/* Primera fila: Solo título para SSL Checker, título + botón para otros */}
              {selectedTool !== 'ssl-check' ? (
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
            </div>
          )}

          {/* Contenido: formulario y resultados */}
          <div className="network-tools-form-results">
            {/* Panel de formulario - Solo si NO es SSL Checker */}
            {selectedTool !== 'ssl-check' && (
              <div className="network-tools-form" style={{
                padding: '1rem',
                paddingBottom: '2rem',
                borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderBottom: isMobile ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {renderToolForm()}
              </div>
            )}

            {/* Panel de resultados - Full width para SSL Checker */}
            <div className="network-tools-results" style={{
              padding: '1rem',
              paddingBottom: '2rem',
              background: 'rgba(0,0,0,0.1)',
              width: selectedTool === 'ssl-check' ? '100%' : undefined
            }}>
              {selectedTool !== 'ssl-check' && (
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
