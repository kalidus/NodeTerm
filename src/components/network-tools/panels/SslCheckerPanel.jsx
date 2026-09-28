/**
 * SslCheckerPanel.jsx - Auditoria de certificados SSL/TLS
 */

import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle, getStatItemStyle } from '../toolRegistry';
import { sslReportService } from '../../../services/reports/SslReportService';

const TRUST_META = {
  trusted: { badge: 'VALIDO', color: '#22c55e', icon: 'pi-lock', severity: 'success' },
  self_signed: { badge: 'AUTOFIRMADO', color: '#f59e0b', icon: 'pi-lock-open', severity: 'warning' },
  untrusted_ca: { badge: 'CA NO CONFIABLE', color: '#f59e0b', icon: 'pi-lock-open', severity: 'warning' },
  incomplete_chain: { badge: 'CADENA INCOMPLETA', color: '#f59e0b', icon: 'pi-link', severity: 'warning' },
  hostname_mismatch: { badge: 'HOSTNAME NO COINCIDE', color: '#dc2626', icon: 'pi-times-circle', severity: 'danger' },
  expired: { badge: 'EXPIRADO', color: '#dc2626', icon: 'pi-calendar', severity: 'danger' },
  not_yet_valid: { badge: 'AUN NO VIGENTE', color: '#dc2626', icon: 'pi-clock', severity: 'danger' },
  unknown: { badge: 'NO CONFIABLE', color: '#ef4444', icon: 'pi-lock-open', severity: 'danger' }
};

const RISK_COLOR = {
  CRITICO: '#dc2626',
  ALTO: '#ef4444',
  MEDIO: '#f59e0b',
  BAJO: '#22c55e'
};

const ISSUE_COLOR = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#60a5fa',
  low: '#94a3b8'
};

function getTrustMeta(result) {
  const status = result?.trust?.status
    || (result?.certificate?.isValid ? 'trusted' : 'unknown');
  return TRUST_META[status] || TRUST_META.unknown;
}

async function copyText(value) {
  if (!value) return false;
  try {
    if (window?.electron?.clipboard?.writeText) {
      await window.electron.clipboard.writeText(value);
      return true;
    }
  } catch (_) {
    /* fallback */
  }
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

const CopyIconButton = ({ value, tooltip, onCopied }) => (
  <Button
    icon="pi pi-copy"
    className="p-button-text p-button-sm p-button-secondary"
    tooltip={tooltip || 'Copiar'}
    onClick={async () => {
      const ok = await copyText(value);
      if (onCopied) onCopied(ok);
    }}
    disabled={!value}
    style={{ padding: '0.15rem 0.35rem', width: '1.7rem', height: '1.7rem' }}
  />
);

const SslCheckerPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('ssl-check');
  const [sslCheckHost, setSslCheckHost] = useState('');
  const [sslCheckPort, setSslCheckPort] = useState(443);
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [actionOk, setActionOk] = useState(true);

  const notify = (ok, okText, failText) => {
    setActionOk(Boolean(ok));
    setActionMessage(ok ? okText : (failText || 'No se pudo completar la accion'));
    setTimeout(() => setActionMessage(null), 2200);
  };

  const executeSslCheck = async () => {
    const trimmed = sslCheckHost.trim();
    if (!trimmed) {
      setError('Por favor, introduce un host o dominio.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setActionMessage(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:ssl-check', {
        host: trimmed,
        port: sslCheckPort || 443
      });

      if (response) {
        setResult(response);
        if (response.port && response.port !== sslCheckPort) {
          setSslCheckPort(response.port);
        }
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
    setActionMessage(null);
  };

  const handleCopyJson = async () => {
    const ok = await copyText(JSON.stringify(result, null, 2));
    notify(ok, 'Informe JSON copiado', 'No se pudo copiar el JSON');
  };

  const handleCopyPem = async () => {
    const pem = result?.certificate?.pem;
    const ok = await copyText(pem);
    notify(ok, 'PEM copiado', 'PEM no disponible');
  };

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const html = sslReportService.createHtml({
        ...result,
        generatedAt: new Date().toISOString()
      });
      const safeHost = String(result.host || 'host').replace(/[^a-z0-9.-]+/gi, '-');
      const name = `ssl-check-${safeHost}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const res = await ipc.invoke('network-tools:save-report-pdf', {
        html,
        suggestedName: name,
        title: 'Guardar informe SSL Checker (PDF)'
      });
      if (res?.success) notify(true, 'Informe PDF exportado');
      else if (res?.error && res.error !== 'Operacion cancelada.' && res.error !== 'Operación cancelada.') {
        notify(false, null, res.error);
      }
    } catch (err) {
      notify(false, null, err.message || 'No se pudo exportar PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  const resultBoxStyle = getResultBoxStyle(isMobile);
  const statItemStyle = getStatItemStyle(isMobile);

  const renderSslResults = () => {
    if (!result) return null;

    const trustMeta = getTrustMeta(result);
    const daysUntilExpiry = result.certificate?.daysUntilExpiry;
    const supportedCount = result.supportedProtocols?.length || 0;
    const deprecatedCount = result.supportedProtocols?.filter((p) => p.deprecated)?.length || 0;
    const secureProtocols = result.supportedProtocols?.filter((p) => !p.deprecated)?.length || 0;
    const securityScore = typeof result.security?.score === 'number'
      ? result.security.score
      : ((result.trust?.authorized || result.certificate?.isValid) ? 40 : 0)
        + (daysUntilExpiry > 90 ? 20 : daysUntilExpiry > 30 ? 10 : 0)
        + (secureProtocols > 0 ? 20 : 0)
        + (deprecatedCount === 0 && supportedCount > 0 ? 20 : 0);
    const riskLevel = result.security?.riskLevel || 'ALTO';
    const riskColor = RISK_COLOR[riskLevel] || '#f59e0b';
    const expiryNegative = typeof daysUntilExpiry === 'number' && daysUntilExpiry < 0;
    const expiryColor = expiryNegative || daysUntilExpiry < 30
      ? '#ef4444'
      : daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e';
    const hostnameMatch = result.trust?.hostnameMatch;
    const matchedSan = hostnameMatch?.matchedSan;

    return (
      <div style={resultBoxStyle}>
        {actionMessage && (
          <div style={{
            marginBottom: '0.75rem',
            padding: '0.45rem 0.7rem',
            borderRadius: '6px',
            background: actionOk ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: actionOk ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
            color: actionOk ? '#86efac' : '#fca5a5',
            fontSize: '0.8rem'
          }}>
            {actionMessage}
          </div>
        )}

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              <i className={`pi ${trustMeta.icon}`}
                style={{ color: trustMeta.color, fontSize: '1.5rem' }}
              />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.2rem', color: '#ffffff' }}>
                  {result.host}:{result.port}
                </div>
                <Badge
                  value={trustMeta.badge}
                  severity={trustMeta.severity}
                  style={{
                    fontSize: '0.7rem',
                    padding: '0.25rem 0.5rem',
                    fontWeight: '600',
                    background: trustMeta.color,
                    border: 'none'
                  }}
                />
                {result.trust?.summary && (
                  <div style={{
                    marginTop: '0.35rem',
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.4,
                    maxWidth: '520px'
                  }}>
                    {result.trust.summary}
                  </div>
                )}
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

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '0.5rem',
            marginTop: '0.75rem'
          }}>
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                {expiryNegative ? 'Expirado hace' : 'Expira en'}
              </div>
              <div style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: expiryColor,
                marginBottom: '0.25rem'
              }}>
                {typeof daysUntilExpiry === 'number' ? `${Math.abs(daysUntilExpiry)} dias` : 'N/A'}
              </div>
              <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px', height: '4px', overflow: 'hidden' }}>
                <div style={{
                  background: expiryColor,
                  height: '100%',
                  width: `${Math.min(100, Math.max(0, (daysUntilExpiry / 365) * 100))}%`
                }} />
              </div>
            </div>

            {result.protocols && (
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.8)', marginBottom: '0.25rem' }}>
                  Conexion
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.15rem', color: '#60a5fa' }}>
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

            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '0.5rem 0.75rem' }}>
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

        {result.trust?.issues?.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#f59e0b',
              marginBottom: '0.6rem'
            }}>
              <i className="pi pi-info-circle" style={{ fontSize: '0.9rem' }} />
              Diagnostico de confianza
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {result.trust.issues.map((issue, idx) => {
                const color = ISSUE_COLOR[issue.severity] || ISSUE_COLOR.high;
                return (
                  <div key={idx} style={{
                    padding: '0.6rem 0.75rem',
                    background: 'rgba(0,0,0,0.2)',
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontWeight: '700', fontSize: '0.8rem', color, marginBottom: '0.2rem' }}>
                      {issue.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.45 }}>
                      {issue.detail}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {result.certificate && (
          <div style={{
            marginBottom: '1rem',
            padding: '0.75rem',
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.25)',
            borderRadius: '8px'
          }}>
            <div style={{
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#60a5fa',
              marginBottom: '0.5rem'
            }}>
              <i className="pi pi-id-card" style={{ fontSize: '0.9rem' }} />
              Identidad del certificado
            </div>
            <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Sujeto:</span>
              <strong style={{ color: '#ffffff' }}>{result.certificate.subjectDn || result.certificate.subject?.CN || 'N/A'}</strong>
            </div>
            <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Emisor:</span>
              <strong style={{ color: '#ffffff' }}>{result.certificate.issuerDn || result.certificate.issuer?.O || result.certificate.issuer?.CN || 'N/A'}</strong>
            </div>
            <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>Vigencia:</span>
              <strong style={{ color: '#ffffff' }}>{result.certificate.validFrom} — {result.certificate.validTo}</strong>
            </div>
            {result.certificate.signatureAlgorithm && (
              <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>Firma:</span>
                <strong style={{ color: '#ffffff' }}>{result.certificate.signatureAlgorithm}</strong>
              </div>
            )}
            {result.certificate.publicKey && (
              <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>Clave publica:</span>
                <strong style={{ color: '#ffffff' }}>
                  {result.certificate.publicKey.type || 'N/A'}
                  {result.certificate.publicKey.bits ? ` (${result.certificate.publicKey.bits} bits)` : ''}
                </strong>
              </div>
            )}
            {result.certificate.fingerprint256 && (
              <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>SHA-256:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                  <strong style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#ffffff', wordBreak: 'break-all' }}>
                    {result.certificate.fingerprint256}
                  </strong>
                  <CopyIconButton
                    value={result.certificate.fingerprint256}
                    tooltip="Copiar SHA-256"
                    onCopied={(ok) => notify(ok, 'Fingerprint copiado', 'No se pudo copiar')}
                  />
                </span>
              </div>
            )}
            {result.certificate.fingerprint && (
              <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                <span style={{ color: 'rgba(255,255,255,0.8)' }}>SHA-1:</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
                  <strong style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#ffffff', wordBreak: 'break-all' }}>
                    {result.certificate.fingerprint}
                  </strong>
                  <CopyIconButton
                    value={result.certificate.fingerprint}
                    tooltip="Copiar SHA-1"
                    onCopied={(ok) => notify(ok, 'Fingerprint copiado', 'No se pudo copiar')}
                  />
                </span>
              </div>
            )}
            <div style={{ marginTop: '0.6rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.35rem' }}>
                SAN {hostnameMatch ? (hostnameMatch.matches ? '(coincide con el host)' : '(ninguno coincide con el host)') : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {(result.certificate.sans || result.certificate.subjectAltNames || []).length === 0 && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>Sin SAN</span>
                )}
                {(result.certificate.sans && result.certificate.sans.length
                  ? result.certificate.sans.map((san) => san.raw || san.value)
                  : (result.certificate.subjectAltNames || [])
                ).map((san, idx) => {
                  const isMatch = matchedSan && String(san).toLowerCase().includes(String(matchedSan).toLowerCase());
                  return (
                    <span key={idx} style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      padding: '0.15rem 0.45rem',
                      borderRadius: '999px',
                      background: isMatch ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isMatch ? '#22c55e' : 'rgba(255,255,255,0.12)'}`,
                      color: isMatch ? '#86efac' : 'rgba(255,255,255,0.85)'
                    }}>
                      {san}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {result.supportedProtocols && result.supportedProtocols.length > 0 && (
          <>
            <div style={{
              marginTop: '0.25rem',
              marginBottom: '0.75rem',
              fontWeight: '600',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: '#60a5fa'
            }}>
              <i className="pi pi-shield" style={{ fontSize: '0.9rem' }} />
              Protocolos soportados
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {result.supportedProtocols.map((proto, idx) => {
                let bgColor;
                let borderColor;
                let iconClass;
                let statusText;
                if (proto.name === 'TLSv1.3' || proto.name === 'TLSv1.2') {
                  bgColor = 'rgba(34, 197, 94, 0.1)';
                  borderColor = '#22c55e';
                  iconClass = 'pi-check-circle';
                  statusText = 'SEGURO';
                } else if (proto.name === 'TLSv1.1' || proto.name === 'TLSv1.0') {
                  bgColor = 'rgba(245, 158, 11, 0.1)';
                  borderColor = '#f59e0b';
                  iconClass = 'pi-exclamation-circle';
                  statusText = 'OBSOLETO';
                } else {
                  bgColor = 'rgba(239, 68, 68, 0.1)';
                  borderColor = '#ef4444';
                  iconClass = 'pi-times-circle';
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
                      <i className={`pi ${iconClass}`} style={{ color: borderColor, fontSize: '0.95rem' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.15rem', color: borderColor }}>
                          {proto.name}
                        </div>
                        {proto.cipher && (
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' }}>
                            {proto.cipher.name}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      value={statusText}
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

        {result.testedProtocols && result.testedProtocols.length > 0 && (
          <details style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
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
              <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem' }} />
              <span>Todos los protocolos probados ({result.testedProtocols.length})</span>
            </summary>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.5rem',
              marginTop: '0.5rem'
            }}>
              {result.testedProtocols.map((proto, idx) => {
                let icon = 'pi-circle';
                let color = '#94a3b8';
                if (proto.supported) {
                  icon = proto.deprecated ? 'pi-exclamation-circle' : 'pi-check-circle';
                  color = proto.deprecated ? '#f59e0b' : '#22c55e';
                } else if (proto.protocolUnavailable) {
                  icon = 'pi-minus-circle';
                  color = '#64748b';
                } else {
                  icon = 'pi-times-circle';
                  color = '#ef4444';
                }
                return (
                  <div key={idx} style={{
                    padding: '0.75rem',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    fontSize: '0.85rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <i className={`pi ${icon}`} style={{ color, fontSize: '0.85rem' }} />
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

        {result.ciphers && result.ciphers.length > 0 && (
          <details style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
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
              <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem' }} />
              <span>Ciphers detectados ({result.ciphers.length})</span>
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
                    {cipher.version && (
                      <span style={{ color: 'rgba(255,255,255,0.7)', marginLeft: '0.5rem', fontWeight: '400' }}>
                        ({cipher.version})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>
                    Protocolos: {(cipher.protocols || []).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {result.chain && result.chain.length > 0 && (
          <details style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
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
              <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem' }} />
              <span>Cadena de certificados ({result.chain.length})</span>
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
                    {chainCert.role || `Certificado ${idx + 1}`}
                  </div>
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Sujeto:</span>
                    <strong style={{ color: '#ffffff' }}>{chainCert.subjectDn || chainCert.subject?.CN || chainCert.subject?.O || 'N/A'}</strong>
                  </div>
                  <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                    <span style={{ color: 'rgba(255,255,255,0.8)' }}>Emisor:</span>
                    <strong style={{ color: '#ffffff' }}>{chainCert.issuerDn || chainCert.issuer?.O || chainCert.issuer?.CN || 'N/A'}</strong>
                  </div>
                  {chainCert.validFrom && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Valido desde:</span>
                      <strong style={{ color: '#ffffff' }}>{chainCert.validFrom}</strong>
                    </div>
                  )}
                  {chainCert.validTo && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>Valido hasta:</span>
                      <strong style={{ color: '#ffffff' }}>{chainCert.validTo}</strong>
                    </div>
                  )}
                  {chainCert.fingerprint256 && (
                    <div style={{...statItemStyle, color: 'rgba(255,255,255,0.9)'}}>
                      <span style={{ color: 'rgba(255,255,255,0.8)' }}>SHA-256:</span>
                      <strong style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#ffffff' }}>{chainCert.fingerprint256}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {result.certificate?.pem && (
          <details style={{ marginTop: '0.5rem', marginBottom: '0.75rem' }}>
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
              <i className="pi pi-chevron-right" style={{ fontSize: '0.7rem' }} />
              <span>PEM del certificado</span>
            </summary>
            <pre style={{
              margin: 0,
              padding: '0.75rem',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: '6px',
              fontSize: '0.7rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: 'rgba(255,255,255,0.85)'
            }}>{result.certificate.pem}</pre>
          </details>
        )}

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
              Recomendaciones de seguridad
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Button
                icon="pi pi-copy"
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Copiar JSON"
                onClick={handleCopyJson}
                style={{ padding: '0.35rem 0.5rem' }}
              />
              <Button
                icon="pi pi-key"
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Copiar PEM"
                onClick={handleCopyPem}
                disabled={!result?.certificate?.pem}
                style={{ padding: '0.35rem 0.5rem' }}
              />
              <Button
                icon={exportingPdf ? 'pi pi-spin pi-spinner' : 'pi pi-file-pdf'}
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Exportar PDF"
                onClick={handleExportPdf}
                disabled={exportingPdf}
                style={{ padding: '0.35rem 0.5rem' }}
              />
              <Button
                icon="pi pi-trash"
                className="p-button-text p-button-sm p-button-secondary"
                tooltip="Limpiar resultados"
                onClick={clearResults}
                style={{ padding: '0.35rem 0.5rem' }}
              />
            </div>
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
            placeholder="ejemplo.com o 10.0.0.1"
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
            <span>Introduce un host, IP o dominio para auditar confianza, protocolos y cadena del certificado SSL/TLS.</span>
          </div>
        )}

        {renderSslResults()}
      </div>
    </div>
  );
};

export default SslCheckerPanel;
