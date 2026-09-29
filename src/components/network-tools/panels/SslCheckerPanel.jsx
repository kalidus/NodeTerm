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
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

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

const ISSUE_COLOR = {
  critical: '#dc2626',
  high: '#f59e0b',
  medium: '#60a5fa',
  low: '#94a3b8'
};

const GRADE_CAP_REASON = {
  incomplete_chain: 'Limitada por cadena incompleta',
  self_signed: 'Limitada por certificado autofirmado',
  untrusted_ca: 'Limitada por CA no confiable',
  hostname_mismatch: 'Limitada por hostname',
  expired: 'Limitada por certificado expirado',
  not_yet_valid: 'Limitada por vigencia futura',
  unknown: 'Limitada por confianza'
};

function gradeCapReason(status) {
  return GRADE_CAP_REASON[status] || null;
}

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

function scoreColor(score) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function gradeColor(grade) {
  if (grade === 'A+' || grade === 'A' || grade === 'A-') return '#22c55e';
  if (grade === 'B') return '#84cc16';
  if (grade === 'C') return '#eab308';
  if (grade === 'D') return '#f97316';
  return '#ef4444';
}

function protocolMeta(name) {
  if (name === 'TLSv1.3' || name === 'TLSv1.2') {
    return { color: '#22c55e', icon: 'pi-check-circle', status: 'SEGURO' };
  }
  if (name === 'TLSv1.1' || name === 'TLSv1.0') {
    return { color: '#f59e0b', icon: 'pi-exclamation-circle', status: 'OBSOLETO' };
  }
  return { color: '#ef4444', icon: 'pi-times-circle', status: 'INSEGURO' };
}

function listSans(certificate) {
  if (!certificate) return [];
  if (certificate.sans && certificate.sans.length) {
    return certificate.sans.map((san) => san.raw || san.value);
  }
  return certificate.subjectAltNames || [];
}

const SCORE_BREAKDOWN = [
  {
    key: 'protocol',
    label: 'Protocolo',
    hint: 'Versiones TLS del servidor',
    title: 'Puntuacion segun las versiones TLS que acepta el servidor. TLS 1.2 y 1.3 suman 100.'
  },
  {
    key: 'key',
    label: 'Clave',
    hint: 'Tipo y tamano de la clave',
    title: 'Fortaleza de la clave publica. RSA 4096 o EC 256 equivalen a 100.'
  },
  {
    key: 'cipher',
    label: 'Cipher',
    hint: 'Algoritmo de cifrado',
    title: 'Calidad de la suite de cifrado negociada. GCM o ChaCha equivalen a 100.'
  }
];

const ScoreBreakdownRow = ({ label, hint, title, value }) => {
  const numeric = Math.min(100, Math.max(0, Number(value) || 0));
  const color = scoreColor(numeric);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.35rem'
      }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.22rem',
          minWidth: 0
        }}>
          <span style={{
            fontSize: '0.62rem',
            fontWeight: 700,
            color: 'rgba(255,255,255,0.82)',
            letterSpacing: '0.02em'
          }}>
            {label}
          </span>
          <Button
            icon="pi pi-question-circle"
            className="p-button-text p-button-sm p-button-secondary"
            tooltip={title}
            tooltipOptions={{ position: 'top', showDelay: 200 }}
            tabIndex={-1}
            style={{
              width: '1.1rem',
              height: '1.1rem',
              padding: 0,
              color: 'rgba(255,255,255,0.42)'
            }}
          />
        </span>
        <span style={{ fontSize: '0.62rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
          {numeric}
        </span>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '3px',
        height: '2px',
        overflow: 'hidden',
        marginTop: '0.12rem'
      }}>
        <div style={{ background: color, height: '100%', width: `${numeric}%` }} />
      </div>
      <div style={{
        fontSize: '0.55rem',
        color: 'rgba(255,255,255,0.48)',
        marginTop: '0.08rem',
        lineHeight: 1.2
      }}>
        {hint}
      </div>
    </div>
  );
};

const SessionFact = ({ label, value, sub, color }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{
      fontSize: '0.8rem',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.92)',
      marginBottom: '0.2rem'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '0.92rem',
      fontWeight: 700,
      color: color || '#ffffff',
      lineHeight: 1.25,
      wordBreak: 'break-word'
    }}>
      {value}
    </div>
    {sub && (
      <div style={{
        fontSize: '0.7rem',
        color: 'rgba(255,255,255,0.55)',
        marginTop: '0.12rem',
        lineHeight: 1.35,
        wordBreak: 'break-word',
        fontFamily: 'monospace'
      }}>
        {sub}
      </div>
    )}
  </div>
);

const ScoreRing = ({ score, grade, breakdown, gradeReason }) => {
  const color = scoreColor(score);
  const letterColor = gradeColor(grade);
  const deg = Math.min(100, Math.max(0, Number(score) || 0)) * 3.6;
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.55rem',
      minWidth: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
        <div style={{
          width: 58,
          height: 58,
          borderRadius: '50%',
          background: `conic-gradient(${color} ${deg}deg, rgba(255,255,255,0.08) 0deg)`,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0
        }}>
          <div style={{
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#0b1220',
            display: 'grid',
            placeItems: 'center'
          }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
          </div>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            {grade && (
              <span
                title="El score mide protocolo, clave y cipher. La letra baja si falla la confianza."
                style={{ fontSize: '1.45rem', fontWeight: 800, color: letterColor, lineHeight: 1, cursor: 'help' }}
              >
                {grade}
              </span>
            )}
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.55)' }}>/100</span>
          </div>
          <div style={{
            fontSize: '0.62rem',
            color: 'rgba(255,255,255,0.48)',
            marginTop: '0.12rem'
          }}>
            Nota de cifrado
          </div>
          {gradeReason && (
            <div style={{
              fontSize: '0.62rem',
              fontWeight: 600,
              color: letterColor,
              marginTop: '0.18rem',
              lineHeight: 1.3
            }}>
              {gradeReason}
            </div>
          )}
        </div>
      </div>
      {breakdown && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.26rem' }}>
          {SCORE_BREAKDOWN.map((item) => (
            <ScoreBreakdownRow
              key={item.key}
              label={item.label}
              hint={item.hint}
              title={item.title}
              value={breakdown[item.key]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const SectionLabel = ({ icon, color, children }) => (
  <div style={{
    fontWeight: 600,
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    color: color || '#60a5fa',
    marginBottom: '0.4rem'
  }}>
    <i className={`pi ${icon}`} style={{ fontSize: '0.75rem' }} />
    {children}
  </div>
);

const ProtocolChips = ({ protocols }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
    {protocols.map((proto, idx) => {
      const meta = protocolMeta(proto.name);
      return (
        <span
          key={idx}
          title={proto.cipher?.name || proto.cipher || ''}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.7rem',
            padding: '0.22rem 0.5rem',
            borderRadius: '999px',
            background: `${meta.color}18`,
            border: `1px solid ${meta.color}66`,
            color: meta.color,
            fontWeight: 600
          }}
        >
          <i className={`pi ${meta.icon}`} style={{ fontSize: '0.68rem' }} />
          {proto.name}
          <span style={{ fontSize: '0.56rem', fontWeight: 700, opacity: 0.85 }}>{meta.status}</span>
        </span>
      );
    })}
  </div>
);

const InUseBadge = () => (
  <span style={{
    fontSize: '0.55rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#86efac',
    background: 'rgba(34, 197, 94, 0.18)',
    border: '1px solid rgba(34, 197, 94, 0.4)',
    borderRadius: '999px',
    padding: '0.08rem 0.38rem'
  }}>
    EN USO
  </span>
);

const IdentityField = ({ label, value }) => (
  <div style={{ minWidth: 0 }}>
    <div style={{
      fontSize: '0.8rem',
      fontWeight: 700,
      color: 'rgba(255,255,255,0.92)',
      marginBottom: '0.2rem'
    }}>
      {label}
    </div>
    <div style={{
      fontSize: '0.74rem',
      fontWeight: 600,
      color: '#ffffff',
      lineHeight: 1.35,
      wordBreak: 'break-word'
    }}>
      {value || 'N/A'}
    </div>
  </div>
);

const FingerprintRow = ({ label, value, onCopied }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0 }}>
    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', flexShrink: 0, width: '52px' }}>{label}</span>
    <code style={{
      fontSize: '0.66rem',
      color: 'rgba(255,255,255,0.85)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      minWidth: 0,
      flex: 1
    }} title={value}>{value}</code>
    <CopyIconButton value={value} tooltip={`Copiar ${label}`} onCopied={onCopied} />
  </div>
);

const CollapsibleBlock = ({ title, children }) => (
  <details style={{ marginTop: '0.4rem', marginBottom: '0.4rem' }}>
    <summary style={{
      cursor: 'pointer',
      fontWeight: 600,
      fontSize: '0.8rem',
      padding: '0.4rem 0.65rem',
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: '6px',
      userSelect: 'none',
      listStyle: 'none',
      display: 'flex',
      alignItems: 'center',
      gap: '0.35rem',
      color: 'rgba(255,255,255,0.9)'
    }}>
      <i className="pi pi-chevron-right" style={{ fontSize: '0.65rem' }} />
      <span>{title}</span>
    </summary>
    <div style={{ marginTop: '0.4rem' }}>{children}</div>
  </details>
);

const SslCheckerPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('ssl-check');
  const history = useNetworkToolHistory('ssl-check');
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

  const executeSslCheck = async (overrides) => {
    const trimmed = String(overrides?.host ?? sslCheckHost).trim();
    const port = overrides?.port ?? sslCheckPort ?? 443;
    if (overrides?.host != null) setSslCheckHost(String(overrides.host));
    if (overrides?.port != null) setSslCheckPort(overrides.port);
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
        port
      });

      if (response) {
        setResult(response);
        if (response.port && response.port !== port) {
          setSslCheckPort(response.port);
        }
        const grade = response.security?.grade;
        const score = response.security?.score;
        history.record({
          target: `${trimmed}:${response.port || port}`,
          params: { host: trimmed, port: response.port || port },
          result: response,
          summary: [grade, typeof score === 'number' ? `${score}/100` : null].filter(Boolean).join(' · ') || 'SSL'
        });
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
    const securityScore = typeof result.security?.score === 'number' ? result.security.score : 0;
    const securityGrade = result.security?.grade || null;
    const securityBreakdown = result.security?.breakdown || null;
    const trustStatus = result?.trust?.status
      || (result?.certificate?.isValid ? 'trusted' : 'unknown');
    const gradeReason = gradeCapReason(trustStatus);
    const negotiatedCipher = result.protocols?.cipher || '';
    const expiryNegative = typeof daysUntilExpiry === 'number' && daysUntilExpiry < 0;
    const expiryColor = expiryNegative || daysUntilExpiry < 30
      ? '#ef4444'
      : daysUntilExpiry < 90 ? '#f59e0b' : '#22c55e';
    const hostnameMatch = result.trust?.hostnameMatch;
    const matchedSan = hostnameMatch?.matchedSan;
    const cert = result.certificate;
    const keyLabel = cert?.publicKey
      ? `${cert.publicKey.type || 'N/A'}${cert.publicKey.bits ? ` ${cert.publicKey.bits}` : ''}`
      : 'N/A';
    const sans = listSans(cert);
    const issues = result.trust?.issues || [];
    const recommendations = result.security?.recommendations || [];
    const panelStyle = {
      background: 'rgba(0,0,0,0.18)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '8px',
      padding: '0.7rem 0.75rem',
      minWidth: 0
    };

    return (
      <div style={{ ...resultBoxStyle, fontFamily: 'inherit' }}>
        {actionMessage && (
          <div style={{
            marginBottom: '0.65rem',
            padding: '0.4rem 0.65rem',
            borderRadius: '6px',
            background: actionOk ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: actionOk ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid rgba(239, 68, 68, 0.35)',
            color: actionOk ? '#86efac' : '#fca5a5',
            fontSize: '0.78rem'
          }}>
            {actionMessage}
          </div>
        )}

        <div style={{
          ...panelStyle,
          marginBottom: '0.75rem',
          borderLeft: `3px solid ${trustMeta.color}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.7rem',
            marginBottom: '0.75rem',
            paddingBottom: '0.65rem',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: '8px',
              background: `${trustMeta.color}22`,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0
            }}>
              <i className={`pi ${trustMeta.icon}`} style={{ fontSize: '0.95rem', color: trustMeta.color }} />
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#ffffff',
                  lineHeight: 1.25,
                  wordBreak: 'break-all'
                }}>
                  {result.host}
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                  color: '#93c5fd',
                  background: 'rgba(96, 165, 250, 0.16)',
                  border: '1px solid rgba(96, 165, 250, 0.35)',
                  borderRadius: '999px',
                  padding: '0.12rem 0.45rem',
                  letterSpacing: '0.02em'
                }}>
                  :{result.port}
                </span>
              </div>
              <div style={{
                fontSize: '0.65rem',
                color: 'rgba(255,255,255,0.48)',
                marginTop: '0.18rem'
              }}>
                Certificado SSL/TLS
              </div>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 1fr) minmax(240px, 1fr)',
            gap: isMobile ? '0.85rem' : '1.1rem'
          }}>
            <ScoreRing
              score={securityScore}
              grade={securityGrade}
              breakdown={securityBreakdown}
              gradeReason={gradeReason}
            />
            <div style={{
              minWidth: 0,
              paddingLeft: isMobile ? 0 : '1rem',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.65rem'
              }}>
                Sesion actual
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                <SessionFact
                  label={expiryNegative ? 'Expirado hace' : 'Vigencia'}
                  value={typeof daysUntilExpiry === 'number' ? `${Math.abs(daysUntilExpiry)} dias` : 'N/A'}
                  sub={cert?.validTo ? (expiryNegative ? `el ${cert.validTo}` : `hasta ${cert.validTo}`) : ''}
                  color={expiryColor}
                />
                <SessionFact
                  label="Protocolo negociado"
                  value={result.protocols?.version || 'N/A'}
                  color="#60a5fa"
                />
                <SessionFact
                  label="Clave del certificado"
                  value={keyLabel}
                  sub={cert?.signatureAlgorithm || ''}
                  color="#c4b5fd"
                />
                <SessionFact
                  label="Cipher usado"
                  value={(
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span>{negotiatedCipher || 'N/A'}</span>
                      {negotiatedCipher ? <InUseBadge /> : null}
                    </span>
                  )}
                  color="#86efac"
                />
              </div>
            </div>
          </div>
        </div>

        <div style={{
          ...panelStyle,
          marginBottom: '0.65rem',
          borderLeft: `3px solid ${trustMeta.color}`
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 1fr) minmax(240px, 1fr)',
            gap: isMobile ? '0.85rem' : '1.1rem'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.45)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '0.65rem'
              }}>
                Certificado
              </div>
              {cert ? (
                <>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                    gap: '0.55rem 0.75rem',
                    marginBottom: '0.55rem'
                  }}>
                    <IdentityField label="Sujeto" value={cert.subjectDn || cert.subject?.CN} />
                    <IdentityField label="Emisor" value={cert.issuerDn || cert.issuer?.O || cert.issuer?.CN} />
                    <IdentityField label="Firma" value={cert.signatureAlgorithm} />
                    <IdentityField label="Clave" value={keyLabel} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', marginBottom: '0.5rem' }}>
                    {cert.fingerprint256 && (
                      <FingerprintRow
                        label="SHA-256"
                        value={cert.fingerprint256}
                        onCopied={(ok) => notify(ok, 'Fingerprint copiado', 'No se pudo copiar')}
                      />
                    )}
                    {cert.fingerprint && (
                      <FingerprintRow
                        label="SHA-1"
                        value={cert.fingerprint}
                        onCopied={(ok) => notify(ok, 'Fingerprint copiado', 'No se pudo copiar')}
                      />
                    )}
                  </div>
                  <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.45)', marginBottom: '0.3rem' }}>
                    SAN {hostnameMatch ? (hostnameMatch.matches ? '(coincide con el host)' : '(ninguno coincide con el host)') : ''}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {sans.length === 0 && (
                      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>Sin SAN</span>
                    )}
                    {sans.map((san, idx) => {
                      const isMatch = matchedSan && String(san).toLowerCase().includes(String(matchedSan).toLowerCase());
                      return (
                        <span key={idx} style={{
                          fontSize: '0.68rem',
                          fontFamily: 'monospace',
                          padding: '0.12rem 0.4rem',
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
                </>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                  Sin datos del certificado.
                </div>
              )}
            </div>

            <div style={{
              minWidth: 0,
              paddingLeft: isMobile ? 0 : '1rem',
              borderLeft: isMobile ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.4rem',
                flexWrap: 'wrap',
                marginBottom: '0.65rem'
              }}>
                <div style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.45)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Diagnostico
                </div>
                <Badge
                  value={trustMeta.badge}
                  severity={trustMeta.severity}
                  style={{
                    fontSize: '0.62rem',
                    padding: '0.18rem 0.4rem',
                    fontWeight: 700,
                    background: trustMeta.color,
                    border: 'none'
                  }}
                />
              </div>
              {issues.length > 0 ? (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  marginBottom: (result.supportedProtocols?.length || result.ciphers?.length) ? '0.75rem' : 0
                }}>
                  {issues.map((issue, idx) => {
                    const color = ISSUE_COLOR[issue.severity] || ISSUE_COLOR.high;
                    return (
                      <div key={idx} style={{
                        padding: '0.4rem 0.5rem',
                        background: 'rgba(0,0,0,0.2)',
                        borderLeft: `3px solid ${color}`,
                        borderRadius: '4px'
                      }}>
                        <div style={{ fontWeight: 700, fontSize: '0.74rem', color }}>{issue.title}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.4 }}>
                          {issue.detail}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: (result.supportedProtocols?.length || result.ciphers?.length) ? '0.75rem' : 0
                }}>
                  Sin incidencias de confianza.
                </div>
              )}
              {result.supportedProtocols?.length > 0 && (
                <div style={{ marginBottom: result.ciphers?.length ? '0.7rem' : 0 }}>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.92)',
                    marginBottom: '0.35rem'
                  }}>
                    Protocolos soportados
                  </div>
                  <ProtocolChips protocols={result.supportedProtocols} />
                </div>
              )}
              {result.ciphers?.length > 0 && (
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.92)',
                    marginBottom: '0.35rem'
                  }}>
                    Ciphers soportados
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {result.ciphers.map((cipher, idx) => {
                      const isUsed = negotiatedCipher
                        && String(cipher.name || '').toLowerCase() === String(negotiatedCipher).toLowerCase();
                      return (
                        <div key={idx} style={{
                          padding: '0.4rem 0.5rem',
                          background: isUsed ? 'rgba(34, 197, 94, 0.12)' : 'rgba(0,0,0,0.2)',
                          border: isUsed ? '1px solid rgba(34, 197, 94, 0.35)' : '1px solid transparent',
                          borderRadius: '6px'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.4rem',
                            flexWrap: 'wrap'
                          }}>
                            <span style={{
                              fontSize: '0.74rem',
                              fontWeight: 600,
                              fontFamily: 'monospace',
                              color: '#ffffff',
                              wordBreak: 'break-word'
                            }}>
                              {cipher.name}
                            </span>
                            {isUsed ? <InUseBadge /> : null}
                          </div>
                          <div style={{
                            fontSize: '0.62rem',
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '0.15rem'
                          }}>
                            {(cipher.protocols || []).join(', ') || cipher.version || ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {result.testedProtocols && result.testedProtocols.length > 0 && (
          <CollapsibleBlock title={`Todos los protocolos probados (${result.testedProtocols.length})`}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)',
              gap: '0.45rem'
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
                    padding: '0.55rem 0.65rem',
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: '6px',
                    fontSize: '0.8rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <i className={`pi ${icon}`} style={{ color, fontSize: '0.8rem' }} />
                      <strong style={{ color: '#ffffff' }}>{proto.name}</strong>
                    </div>
                    {proto.supported && proto.cipher && (
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', marginLeft: '1.3rem' }}>
                        {proto.cipher.name}
                      </div>
                    )}
                    {!proto.supported && proto.error && (
                      <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.55)', fontStyle: 'italic', marginLeft: '1.3rem' }}>
                        {proto.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleBlock>
        )}

        {result.ciphers && result.ciphers.length > 0 && (
          <CollapsibleBlock title={`Ciphers detectados (${result.ciphers.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {result.ciphers.map((cipher, idx) => (
                <div key={idx} style={{
                  padding: '0.55rem 0.65rem',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '6px',
                  borderLeft: '3px solid #3b82f6',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ fontWeight: 600, color: '#ffffff' }}>
                    {cipher.name}
                    {cipher.version && (
                      <span style={{ color: 'rgba(255,255,255,0.65)', marginLeft: '0.4rem', fontWeight: 400 }}>
                        ({cipher.version})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.65)' }}>
                    Protocolos: {(cipher.protocols || []).join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </CollapsibleBlock>
        )}

        {result.chain && result.chain.length > 0 && (
          <CollapsibleBlock title={`Cadena de certificados (${result.chain.length})`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {result.chain.map((chainCert, idx) => (
                <div key={idx} style={{
                  padding: '0.7rem',
                  background: 'rgba(0,0,0,0.2)',
                  borderRadius: '8px',
                  borderLeft: '3px solid #3b82f6',
                  fontSize: '0.8rem'
                }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.45rem', color: '#60a5fa' }}>
                    {chainCert.role || `Certificado ${idx + 1}`}
                  </div>
                  <div style={{ ...statItemStyle, color: 'rgba(255,255,255,0.9)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Sujeto:</span>
                    <strong style={{ color: '#ffffff' }}>{chainCert.subjectDn || chainCert.subject?.CN || chainCert.subject?.O || 'N/A'}</strong>
                  </div>
                  <div style={{ ...statItemStyle, color: 'rgba(255,255,255,0.9)' }}>
                    <span style={{ color: 'rgba(255,255,255,0.7)' }}>Emisor:</span>
                    <strong style={{ color: '#ffffff' }}>{chainCert.issuerDn || chainCert.issuer?.O || chainCert.issuer?.CN || 'N/A'}</strong>
                  </div>
                  {chainCert.validFrom && (
                    <div style={{ ...statItemStyle, color: 'rgba(255,255,255,0.9)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Valido desde:</span>
                      <strong style={{ color: '#ffffff' }}>{chainCert.validFrom}</strong>
                    </div>
                  )}
                  {chainCert.validTo && (
                    <div style={{ ...statItemStyle, color: 'rgba(255,255,255,0.9)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>Valido hasta:</span>
                      <strong style={{ color: '#ffffff' }}>{chainCert.validTo}</strong>
                    </div>
                  )}
                  {chainCert.fingerprint256 && (
                    <div style={{ ...statItemStyle, color: 'rgba(255,255,255,0.9)' }}>
                      <span style={{ color: 'rgba(255,255,255,0.7)' }}>SHA-256:</span>
                      <strong style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: '#ffffff' }}>{chainCert.fingerprint256}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleBlock>
        )}

        {cert?.pem && (
          <CollapsibleBlock title="PEM del certificado">
            <pre style={{
              margin: 0,
              padding: '0.65rem',
              background: 'rgba(0,0,0,0.35)',
              borderRadius: '6px',
              fontSize: '0.68rem',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              color: 'rgba(255,255,255,0.85)'
            }}>{cert.pem}</pre>
          </CollapsibleBlock>
        )}

        {recommendations.length > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
            border: '1px solid #f59e0b66',
            borderRadius: '8px',
            padding: '0.6rem 0.7rem',
            marginTop: '0.5rem'
          }}>
            <SectionLabel icon="pi-exclamation-triangle" color="#f59e0b">Recomendaciones</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recommendations.map((rec, idx) => (
                <div key={idx} style={{
                  padding: '0.4rem 0.5rem',
                  background: 'rgba(0, 0, 0, 0.18)',
                  borderLeft: '3px solid #f59e0b',
                  borderRadius: '4px',
                  fontSize: '0.74rem',
                  color: 'rgba(255,255,255,0.88)'
                }}>
                  {rec}
                </div>
              ))}
            </div>
          </div>
        )}

        {result.error && (
          <div style={{ marginTop: '0.7rem', padding: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444' }}>
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
        history={history}
        onViewHistory={(entry) => {
          setSslCheckHost(entry.params.host || entry.target);
          if (entry.params.port) setSslCheckPort(entry.params.port);
          setError(null);
          setActionMessage(null);
          setResult(entry.result || null);
        }}
        onRerunHistory={(entry) => executeSslCheck(entry.params)}
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
