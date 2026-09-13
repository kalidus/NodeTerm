/**
 * WebSecurityScanPanel.jsx - Auditoría de Seguridad Web, Headers y Cookies
 */

import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const WebSecurityScanPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('web-security-scan');
  const [webSecurityUrl, setWebSecurityUrl] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const toggleSection = (id) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const executeWebSecScan = async () => {
    let url = webSecurityUrl.trim();
    if (!url) {
      setError('Por favor, introduce una URL.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
      setWebSecurityUrl(url);
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:web-security-scan', {
        url,
        timeout: 15000
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos del escáner web');
      }
    } catch (err) {
      setError(err.message || 'Error al ejecutar análisis de seguridad web');
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

  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        extraActions={
          result && (
            <Button
              icon="pi pi-trash"
              className="p-button-text p-button-sm p-button-secondary"
              tooltip="Limpiar resultados"
              onClick={clearResults}
              style={{ padding: '0.35rem 0.5rem' }}
            />
          )
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
            URL:
          </span>
          <InputText
            value={webSecurityUrl}
            onChange={(e) => setWebSecurityUrl(e.target.value)}
            placeholder="https://ejemplo.com"
            style={{
              width: isMobile ? '100%' : '280px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeWebSecScan()}
          />
          <Button
            label={loading ? 'Auditando...' : 'Auditar Web'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-globe'}
            onClick={executeWebSecScan}
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
      </NetworkToolHeader>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.1)' }}>
        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '6px', color: '#ef4444' }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {!result && !loading && !error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: 'var(--text-color-secondary)' }}>
            <i className="pi pi-globe" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#ef4444' }} />
            <span>Introduce una URL web para analizar la configuración de cookies seguras, cabeceras CSP/HSTS y nivel de riesgo.</span>
          </div>
        )}

        {renderResults()}
      </div>
    </div>
  );
};

export default WebSecurityScanPanel;
