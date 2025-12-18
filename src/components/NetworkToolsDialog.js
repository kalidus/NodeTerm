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

import React, { useState, useEffect, useCallback } from 'react';
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

  // Cargar interfaces de red al abrir
  useEffect(() => {
    if (visible) {
      loadNetworkInterfaces();
    }
  }, [visible]);

  const loadNetworkInterfaces = async () => {
    try {
      if (window?.electron?.ipcRenderer) {
        const result = await window.electron.ipcRenderer.invoke('network-tools:get-interfaces');
        if (result.success) {
          setNetworkInterfaces(result.interfaces);
          // Auto-fill subnet for network scan based on first interface
          if (result.interfaces.length > 0) {
            const firstInterface = result.interfaces.find(i => i.family === 'IPv4');
            if (firstInterface && firstInterface.cidr) {
              setNetworkScanSubnet(firstInterface.cidr);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading network interfaces:', err);
    }
  };

  // Handler genérico para ejecutar herramientas
  const executeTool = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);

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

      if (response.success) {
        setResult(response);
      } else {
        setError(response.error || 'Error desconocido');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedTool, pingHost, pingCount, tracerouteHost, tracerouteMaxHops, 
      portScanHost, portScanPorts, networkScanSubnet, dnsLookupDomain, dnsLookupType,
      reverseDnsIp, sslCheckHost, sslCheckPort, httpHeadersUrl, whoisDomain,
      subnetCalcCidr, wolMac, wolBroadcast]);

  // Cambiar herramienta seleccionada
  const handleToolSelect = (categoryId, toolId) => {
    setSelectedCategory(categoryId);
    setSelectedTool(toolId);
    setResult(null);
    setError(null);
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
        return (
          <>
            <div style={fieldStyle}>
              <label style={labelStyle}>Host</label>
              <InputText
                value={sslCheckHost}
                onChange={(e) => setSslCheckHost(e.target.value)}
                placeholder="ejemplo.com"
                style={commonInputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Puerto</label>
              <InputNumber
                value={sslCheckPort}
                onValueChange={(e) => setSslCheckPort(e.value)}
                min={1}
                max={65535}
                style={commonInputStyle}
              />
            </div>
          </>
        );

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
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <ProgressSpinner style={{ width: '40px', height: '40px' }} />
          <span style={{ marginTop: '1rem', color: 'var(--text-color-secondary)' }}>Ejecutando...</span>
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
      padding: '1rem',
      fontFamily: 'monospace',
      fontSize: '0.85rem',
      lineHeight: '1.6',
      color: 'var(--text-color)',
      maxHeight: '400px',
      overflow: 'auto'
    };

    const statItemStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      borderBottom: '1px solid rgba(255,255,255,0.1)'
    };

    switch (selectedTool) {
      case 'ping':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={`pi ${result.success ? 'pi-check-circle' : 'pi-times-circle'}`} 
                 style={{ color: result.success ? '#22c55e' : '#ef4444' }} />
              <strong>{result.host}</strong>
              <Badge value={result.success ? 'Activo' : 'Inactivo'} 
                     severity={result.success ? 'success' : 'danger'} />
            </div>
            <div style={statItemStyle}>
              <span>Paquetes enviados:</span>
              <strong>{result.sent}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes recibidos:</span>
              <strong style={{ color: '#22c55e' }}>{result.received}</strong>
            </div>
            <div style={statItemStyle}>
              <span>Paquetes perdidos:</span>
              <strong style={{ color: result.lost > 0 ? '#ef4444' : '#22c55e' }}>{result.lost} ({result.lossPercent}%)</strong>
            </div>
            {result.avg && (
              <>
                <div style={statItemStyle}>
                  <span>Tiempo mínimo:</span>
                  <strong>{result.min?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo promedio:</span>
                  <strong style={{ color: '#3b82f6' }}>{result.avg?.toFixed(2)} ms</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Tiempo máximo:</span>
                  <strong>{result.max?.toFixed(2)} ms</strong>
                </div>
              </>
            )}
          </div>
        );

      case 'traceroute':
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem' }}>
              <strong>Traceroute a {result.host}</strong>
              <span style={{ marginLeft: '1rem', color: 'var(--text-color-secondary)' }}>
                ({result.hops?.length || 0} saltos)
              </span>
            </div>
            {result.hops && result.hops.length > 0 ? (
              <DataTable value={result.hops} size="small" stripedRows 
                         style={{ fontSize: '0.8rem' }}
                         emptyMessage="Sin datos">
                <Column field="hop" header="#" style={{ width: '50px' }} />
                <Column field="host" header="Host" body={(row) => row.host || '*'} />
                <Column field="avgTime" header="Tiempo" 
                        body={(row) => row.avgTime ? `${row.avgTime.toFixed(2)} ms` : '*'} 
                        style={{ width: '100px' }} />
              </DataTable>
            ) : (
              <Message severity="warn" text="No se pudieron obtener saltos" />
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
        return (
          <div style={resultBoxStyle}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className={`pi ${result.certificate?.isValid ? 'pi-lock' : 'pi-lock-open'}`} 
                 style={{ color: result.certificate?.isValid ? '#22c55e' : '#ef4444' }} />
              <strong>{result.host}:{result.port}</strong>
              <Badge 
                value={result.certificate?.isValid ? 'Válido' : 'Inválido'} 
                severity={result.certificate?.isValid ? 'success' : 'danger'} 
              />
            </div>
            {result.certificate && (
              <>
                <div style={statItemStyle}>
                  <span>Sujeto:</span>
                  <strong>{result.certificate.subject?.CN || 'N/A'}</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Emisor:</span>
                  <strong>{result.certificate.issuer?.O || result.certificate.issuer?.CN || 'N/A'}</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Válido desde:</span>
                  <strong>{result.certificate.validFrom}</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Válido hasta:</span>
                  <strong>{result.certificate.validTo}</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Días hasta expiración:</span>
                  <strong style={{ 
                    color: result.certificate.daysUntilExpiry < 30 ? '#ef4444' : 
                           result.certificate.daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e' 
                  }}>
                    {result.certificate.daysUntilExpiry} días
                  </strong>
                </div>
                <div style={statItemStyle}>
                  <span>Protocolo:</span>
                  <strong>{result.protocols?.version || 'N/A'}</strong>
                </div>
                <div style={statItemStyle}>
                  <span>Cifrado:</span>
                  <strong>{result.protocols?.cipher || 'N/A'}</strong>
                </div>
              </>
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
    <Dialog
      visible={visible}
      onHide={onHide}
      header={dialogHeader}
      style={{ width: '900px', maxWidth: '95vw' }}
      contentStyle={{ 
        padding: 0,
        background: 'var(--surface-ground)',
        borderRadius: '0 0 12px 12px'
      }}
      headerStyle={{
        background: 'var(--surface-card)',
        borderBottom: '1px solid var(--surface-border)',
        padding: '1rem 1.5rem'
      }}
      modal
      dismissableMask
      draggable={false}
    >
      <div style={{ 
        display: 'flex', 
        height: '600px',
        maxHeight: '75vh'
      }}>
        {/* Sidebar de categorías */}
        <div style={{
          width: '200px',
          background: 'rgba(0,0,0,0.2)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          overflowY: 'auto',
          flexShrink: 0
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
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header de herramienta seleccionada */}
          {currentTool && (
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(0,0,0,0.1)'
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
                  justifyContent: 'center'
                }}>
                  <i className={currentTool.icon} style={{ color: currentTool.categoryColor, fontSize: '0.9rem' }} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>{currentTool.label}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
                    {currentTool.description}
                  </span>
                </div>
              </div>
              <Button
                label="Ejecutar"
                icon="pi pi-play"
                onClick={executeTool}
                disabled={loading}
                style={{
                  background: `linear-gradient(135deg, ${currentTool.categoryColor} 0%, ${currentTool.categoryColor}cc 100%)`,
                  border: 'none',
                  borderRadius: '8px'
                }}
              />
            </div>
          )}

          {/* Contenido: formulario y resultados */}
          <div style={{ 
            flex: 1, 
            display: 'flex', 
            overflow: 'hidden'
          }}>
            {/* Panel de formulario */}
            <div style={{
              width: '280px',
              padding: '1.25rem',
              borderRight: '1px solid rgba(255,255,255,0.1)',
              overflowY: 'auto',
              flexShrink: 0
            }}>
              {renderToolForm()}
            </div>

            {/* Panel de resultados */}
            <div style={{
              flex: 1,
              padding: '1.25rem',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.1)'
            }}>
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
              {renderResults()}
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

export default NetworkToolsDialog;
