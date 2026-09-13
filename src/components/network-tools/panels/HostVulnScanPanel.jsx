/**
 * HostVulnScanPanel.jsx - Escáner de Vulnerabilidades y CVEs en Hosts y Servicios
 */

import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const DEFAULT_VULN_PORTS = '21,22,23,25,53,80,110,143,443,445,993,995,1433,1521,3306,3389,5432,5900,6379,8080,8443,27017';

const HostVulnScanPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('host-vuln-scan');
  const [hostVulnHost, setHostVulnHost] = useState('');
  const [hostVulnPorts, setHostVulnPorts] = useState(DEFAULT_VULN_PORTS);
  const [hostVulnUseOnline, setHostVulnUseOnline] = useState(true);
  const [showConfig, setShowConfig] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const executeHostVulnScan = async () => {
    const trimmed = hostVulnHost.trim();
    if (!trimmed) {
      setError('Por favor, introduce un host o dirección IP.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:host-vuln-scan', {
        host: trimmed,
        ports: hostVulnPorts.trim() || DEFAULT_VULN_PORTS,
        timeout: 5000,
        useOnline: hostVulnUseOnline
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos del escáner de vulnerabilidades');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar escáner de vulnerabilidades');
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setResult(null);
    setError(null);
  };

  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const renderResults = () => {
    if (!result) return null;
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

  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        extraActions={
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <Button
              icon="pi pi-cog"
              className={`p-button-text p-button-sm ${showConfig ? 'p-button-danger' : 'p-button-secondary'}`}
              tooltip="Configuración de puertos"
              onClick={() => setShowConfig(!showConfig)}
              style={{ padding: '0.35rem 0.5rem' }}
            />
            {result && (
              <Button
                icon="pi pi-trash"
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Limpiar resultados"
                onClick={clearResults}
                style={{ padding: '0.35rem 0.5rem' }}
              />
            )}
          </div>
        }
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(239, 68, 68, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(239, 68, 68, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(239, 68, 68, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#ef4444', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Host:
          </span>
          <InputText
            value={hostVulnHost}
            onChange={(e) => setHostVulnHost(e.target.value)}
            placeholder="ejemplo.com o 192.168.1.1"
            style={{
              width: isMobile ? '100%' : '260px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeHostVulnScan()}
          />
          <Button
            label={loading ? 'Analizando...' : 'Escanear CVEs'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-shield'}
            onClick={executeHostVulnScan}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)'
            }}
          />
        </div>

        {showConfig && (
          <div
            style={{
              width: '100%',
              padding: '0.6rem 0.8rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
              fontSize: '0.75rem'
            }}
          >
            <span style={{ color: 'var(--text-color-secondary)' }}>Puertos a auditar:</span>
            <InputText
              value={hostVulnPorts}
              onChange={e => setHostVulnPorts(e.target.value)}
              style={{ flex: 1, minWidth: '200px', height: '26px', fontSize: '0.75rem' }}
            />
            <Button
              label={hostVulnUseOnline ? 'Base CVE Online: ON' : 'Base CVE Online: OFF'}
              className={`p-button-sm ${hostVulnUseOnline ? 'p-button-success' : 'p-button-secondary'}`}
              onClick={() => setHostVulnUseOnline(!hostVulnUseOnline)}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', height: '26px' }}
            />
          </div>
        )}
      </NetworkToolHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-exclamation-triangle" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#ef4444' }} />
            <span>Introduce un host o IP para auditar sus servicios, banners y detectar vulnerabilidades conocidas (CVEs).</span>
          </div>
        )}

        {renderResults()}
      </div>
    </div>
  );
};

export default HostVulnScanPanel;
