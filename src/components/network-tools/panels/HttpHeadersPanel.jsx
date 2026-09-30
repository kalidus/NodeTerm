import React, { useState } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Badge } from 'primereact/badge';
import NetworkToolHeader from '../common/NetworkToolHeader';
import { findToolMetadata, getResultBoxStyle } from '../toolRegistry';
import { httpHeadersReportService } from '../../../services/reports/HttpHeadersReportService';
import { useNetworkToolHistory } from '../../../hooks/useNetworkToolHistory';

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

function hostFromUrl(url) {
  try {
    return new URL(url).hostname || 'host';
  } catch {
    return String(url || 'host').replace(/[^a-z0-9.-]+/gi, '-');
  }
}

function scoreColor(present, total) {
  if (!total) return '#94a3b8';
  const ratio = present / total;
  if (ratio >= 0.85) return '#22c55e';
  if (ratio >= 0.6) return '#f59e0b';
  return '#ef4444';
}

const StatusChip = ({ present }) => (
  <span
    style={{
      display: 'inline-block',
      flexShrink: 0,
      fontSize: '0.62rem',
      fontWeight: 700,
      letterSpacing: '0.03em',
      padding: '0.08rem 0.4rem',
      borderRadius: '999px',
      background: present ? 'rgba(34, 197, 94, 0.18)' : 'rgba(245, 158, 11, 0.18)',
      color: present ? '#86efac' : '#fbbf24',
      border: present
        ? '1px solid rgba(34, 197, 94, 0.35)'
        : '1px solid rgba(245, 158, 11, 0.35)',
      whiteSpace: 'nowrap'
    }}
  >
    {present ? 'Presente' : 'Ausente'}
  </span>
);

const HttpHeadersPanel = ({ isMobile = false }) => {
  const tool = findToolMetadata('http-headers');
  const history = useNetworkToolHistory('http-headers');
  const [httpHeadersUrl, setHttpHeadersUrl] = useState('');
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

  const executeHttpHeaders = async (overrides) => {
    let url = String(overrides?.url ?? httpHeadersUrl).trim();
    if (!url) {
      setError('Por favor, introduce una URL.');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setHttpHeadersUrl(url);

    setLoading(true);
    setError(null);
    setResult(null);
    setActionMessage(null);

    try {
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');

      const response = await ipc.invoke('network-tools:http-headers', {
        url
      });

      if (!response) {
        setError('No se recibieron cabeceras HTTP de la URL.');
        return;
      }

      const failedWithoutStatus = response.success === false && !response.statusCode;
      if (failedWithoutStatus) {
        setError(response.error || 'No se pudieron obtener las cabeceras HTTP.');
        setResult(null);
        history.record({
          target: url,
          params: { url },
          result: response,
          summary: 'Error'
        });
        return;
      }

      setResult(response);
      history.record({
        target: url,
        params: { url },
        result: response,
        summary: response.statusCode ? `HTTP ${response.statusCode}` : 'Headers'
      });
    } catch (err) {
      setError(err.message || 'Error al analizar cabeceras HTTP');
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

  const handleExportPdf = async () => {
    if (!result) return;
    setExportingPdf(true);
    try {
      const html = httpHeadersReportService.createHtml({
        ...result,
        generatedAt: new Date().toISOString()
      });
      const safeHost = hostFromUrl(result.finalUrl || result.url).replace(/[^a-z0-9.-]+/gi, '-');
      const name = `http-headers-${safeHost}-${new Date().toISOString().slice(0, 10)}.pdf`;
      const ipc = window?.electron?.ipcRenderer;
      if (!ipc) throw new Error('IPC no disponible');
      const res = await ipc.invoke('network-tools:save-report-pdf', {
        html,
        suggestedName: name,
        title: 'Guardar informe HTTP Headers (PDF)'
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
  const securityEntries = Object.entries(result?.securityHeaders || {});
  const headerEntries = Object.entries(result?.headers || {});
  const presentCount = securityEntries.filter(([, value]) => Boolean(value)).length;
  const totalCount = securityEntries.length;
  const securityScoreColor = scoreColor(presentCount, totalCount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <NetworkToolHeader
        tool={tool}
        isMobile={isMobile}
        history={history}
        onViewHistory={(entry) => {
          setHttpHeadersUrl(entry.params.url || entry.target);
          setError(null);
          setResult(entry.result || null);
          setActionMessage(null);
        }}
        onRerunHistory={(entry) => executeHttpHeaders(entry.params)}
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
            value={httpHeadersUrl}
            onChange={(e) => setHttpHeadersUrl(e.target.value)}
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
            onKeyDown={(e) => e.key === 'Enter' && executeHttpHeaders()}
          />
          <Button
            label={loading ? 'Analizando...' : 'Analizar'}
            icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-file'}
            onClick={executeHttpHeaders}
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
            <i className="pi pi-file" style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.4, color: '#ef4444' }} />
            <span>Introduce una URL HTTP/HTTPS para inspeccionar sus cabeceras de respuesta y evaluar las directivas de seguridad.</span>
          </div>
        )}

        {result && (
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.6rem',
              flexWrap: 'wrap',
              marginBottom: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap', minWidth: 0 }}>
                <strong style={{ fontSize: '0.9rem' }}>
                  {result.statusCode != null ? `HTTP ${result.statusCode}` : 'HTTP'}
                </strong>
                {result.statusCode != null && (
                  <Badge
                    value={result.statusMessage || (result.statusCode < 400 ? 'OK' : 'Error')}
                    severity={result.statusCode < 400 ? 'success' : 'danger'}
                  />
                )}
                {result.method && (
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    color: 'var(--text-color-secondary)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '999px',
                    padding: '0.08rem 0.45rem'
                  }}>
                    {result.method}
                  </span>
                )}
                {result.timing?.responseTime != null && (
                  <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.75rem' }}>
                    {result.timing.responseTime}ms
                  </span>
                )}
              </div>
              {totalCount > 0 && (
                <span style={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: securityScoreColor,
                  background: `${securityScoreColor}18`,
                  border: `1px solid ${securityScoreColor}55`,
                  borderRadius: '999px',
                  padding: '0.12rem 0.55rem',
                  whiteSpace: 'nowrap'
                }}>
                  {presentCount}/{totalCount} seguridad
                </span>
              )}
            </div>

            {result.finalUrl && result.finalUrl !== result.url && (
              <div style={{
                fontSize: '0.72rem',
                color: 'var(--text-color-secondary)',
                marginBottom: '0.65rem',
                wordBreak: 'break-all'
              }}>
                URL final: {result.finalUrl}
              </div>
            )}

            {result.error && (
              <div style={{
                marginBottom: '0.75rem',
                padding: '0.5rem 0.65rem',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '6px',
                color: '#ef4444',
                fontSize: '0.78rem'
              }}>
                <strong>Error:</strong> {result.error}
              </div>
            )}

            <div style={{
              marginBottom: '0.4rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.88)'
            }}>
              Cabeceras de seguridad
            </div>
            {securityEntries.length === 0 ? (
              <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.75rem', marginBottom: '0.65rem' }}>
                No hay cabeceras de seguridad para mostrar.
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: '0.4rem',
                marginBottom: '0.85rem'
              }}>
                {securityEntries.map(([key, value]) => {
                  const present = Boolean(value);
                  return (
                    <div
                      key={key}
                      title={present ? String(value) : `${key} ausente`}
                      style={{
                        padding: '0.4rem 0.5rem',
                        borderRadius: '6px',
                        background: 'rgba(255,255,255,0.035)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderLeft: `3px solid ${present ? '#22c55e' : '#f59e0b'}`,
                        minWidth: 0
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.4rem',
                        marginBottom: present ? '0.2rem' : 0
                      }}>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.92)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {key}
                        </span>
                        <StatusChip present={present} />
                      </div>
                      {present && (
                        <div style={{
                          fontSize: '0.68rem',
                          color: 'var(--text-color-secondary)',
                          lineHeight: 1.35,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-all'
                        }}>
                          {String(value)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{
              marginBottom: '0.4rem',
              fontWeight: 700,
              fontSize: '0.78rem',
              color: 'rgba(255,255,255,0.88)'
            }}>
              Todas las cabeceras HTTP
            </div>
            {headerEntries.length === 0 ? (
              <div style={{ color: 'var(--text-color-secondary)', fontSize: '0.75rem' }}>
                No se recibieron cabeceras HTTP.
              </div>
            ) : (
              <div style={{
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                {headerEntries.map(([key, value], index) => (
                  <div
                    key={key}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '180px 1fr',
                      gap: isMobile ? '0.1rem' : '0.6rem',
                      padding: '0.32rem 0.5rem',
                      background: index % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
                      fontSize: '0.75rem',
                      alignItems: 'start'
                    }}
                  >
                    <span style={{
                      color: '#3b82f6',
                      fontWeight: 600,
                      wordBreak: 'break-all'
                    }}>
                      {key}
                    </span>
                    <span
                      title={String(value)}
                      style={{
                        color: 'rgba(255,255,255,0.88)',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                        fontFamily: 'Consolas, Courier New, monospace',
                        fontSize: '0.7rem',
                        lineHeight: 1.4
                      }}
                    >
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HttpHeadersPanel;
