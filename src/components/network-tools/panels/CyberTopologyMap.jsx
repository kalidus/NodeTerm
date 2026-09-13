/**
 * CyberTopologyMap.jsx - Visualizador Cyberpunk HUD y Mapa de Topología de Red SVG
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { ProgressSpinner } from 'primereact/progressspinner';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';

const CYBER_SCAN_PORTS = '21,22,23,25,53,80,110,135,139,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017';

const CyberTopologyMap = ({
  result,
  liveOutput = '',
  isScanning = false,
  networkScanSubnet = '',
  isMobile = false,
  viewingSavedScan = null
}) => {
  // Estados internos del visualizador Cyberpunk
  const [selectedCyberHost, setSelectedCyberHost] = useState(null);
  const [cyberPortsCache, setCyberPortsCache] = useState({});
  const [cyberPortsScanning, setCyberPortsScanning] = useState({});
  const cyberPortsScanningRef = useRef(new Set());
  const [cyberVulnsCache, setCyberVulnsCache] = useState({});
  const [cyberVulnsScanning, setCyberVulnsScanning] = useState({});
  const cyberVulnsScanningRef = useRef(new Set());
  const [cyberActiveTab, setCyberActiveTab] = useState('details');
  const [cyberPingResults, setCyberPingResults] = useState([]);
  const [cyberScanType, setCyberScanType] = useState('radar');
  const [cyberPingActive, setCyberPingActive] = useState(false);
  const cyberConsoleRef = useRef(null);
  const cyberPingIntervalRef = useRef(null);

  // Auto-scroll para la consola cyberpunk
  useEffect(() => {
    if (cyberConsoleRef.current) {
      cyberConsoleRef.current.scrollTop = cyberConsoleRef.current.scrollHeight;
    }
  }, [liveOutput]);

  // Escaneo de puertos del host seleccionado
  const cyberScanPorts = useCallback(async (hostIp, switchToPortsTab = false) => {
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

  // Escaneo de vulnerabilidades del host seleccionado
  const cyberScanVulns = useCallback(async (hostIp, activeHostRef = null) => {
    if (!hostIp || cyberVulnsScanningRef.current.has(hostIp)) return;
    cyberVulnsScanningRef.current.add(hostIp);
    setCyberVulnsScanning(prev => ({ ...prev, [hostIp]: true }));

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

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

      const hostVulnResponse = await ipc.invoke('network-tools:host-vuln-scan', {
        host: hostIp,
        ports: portsToScan,
        timeout: 5000,
        useOnline: true
      });

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

  // Cyber Live Ping
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


  return (
    <>
      <style>{cyberpunkStyles}</style>
      {renderCyberpunkHUD(isScanning)}
    </>
  );
};

export default CyberTopologyMap;
