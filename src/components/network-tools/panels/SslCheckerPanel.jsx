/**
 * SslCheckerPanel.jsx - Verificación y Auditoría de Certificados SSL/TLS
 */

import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';

const SslCheckerPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('ssl-check');
  const [sslCheckHost, setSslCheckHost] = useState('');
  const [sslCheckPort, setSslCheckPort] = useState(443);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const executeSslCheck = async () => {
    const trimmed = sslCheckHost.trim();
    if (!trimmed) {
      setError('Por favor, introduce un host o dominio.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:ssl-check', {
        host: trimmed,
        port: sslCheckPort || 443
      });

      if (response) {
        setResult(response);
      } else {
        setError('No se recibieron datos del certificado SSL');
      }
    } catch (err) {
      setError(err.message || 'Error al verificar SSL');
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

  const renderSslResults = () => {
    if (!result) return null;
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
            background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.12) 0%, rgba(6, 182, 212, 0.04) 100%)',
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1.5px solid rgba(6, 182, 212, 0.35)',
            width: 'fit-content',
            maxWidth: '100%',
            boxShadow: '0 2px 12px rgba(6, 182, 212, 0.15)',
            flexWrap: isMobile ? 'wrap' : 'nowrap'
          }}
        >
          <span style={{ color: '#06b6d4', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Host:
          </span>
          <InputText
            value={sslCheckHost}
            onChange={(e) => setSslCheckHost(e.target.value)}
            placeholder="ejemplo.com"
            style={{
              width: isMobile ? '100%' : '240px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeSslCheck()}
          />
          <span style={{ color: '#06b6d4', fontSize: '0.78rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
            Puerto:
          </span>
          <InputNumber
            value={sslCheckPort}
            onValueChange={(e) => setSslCheckPort(e.value)}
            min={1}
            max={65535}
            inputStyle={{
              width: '70px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '6px',
              color: 'var(--text-color)',
              padding: '0.35rem 0.5rem',
              fontSize: '0.8rem',
              height: '30px'
            }}
            onKeyDown={(e) => e.key === 'Enter' && executeSslCheck()}
          />
          <Button
            label={loading ? 'Verificando...' : 'Verificar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-shield'}
            onClick={executeSslCheck}
            disabled={loading}
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
              border: 'none',
              borderRadius: '6px',
              padding: '0.35rem 0.75rem',
              height: '30px',
              fontSize: '0.75rem',
              fontWeight: '600',
              boxShadow: '0 2px 8px rgba(6, 182, 212, 0.3)'
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
            <i className="pi pi-lock" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#06b6d4' }} />
            <span>Introduce un host o dominio para auditar la validez, protocolos y cadena de confianza del certificado SSL/TLS.</span>
          </div>
        )}

        {renderSslResults()}
      </div>
    </div>
  );
};

export default SslCheckerPanel;
