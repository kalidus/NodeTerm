import React, { useState, useEffect, useMemo } from 'react';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Dialog } from 'primereact/dialog';
import { InputText } from 'primereact/inputtext';
import { Tag } from 'primereact/tag';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Message } from 'primereact/message';
import { themeManager } from '../../utils/themeManager';

const RecentVulnsPanel = () => {
  const [range, setRange] = useState('1M'); // Rango seleccionado por defecto: 1 Mes
  const [minScore, setMinScore] = useState(9.0);
  const [vulnerabilities, setVulnerabilities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedVuln, setSelectedVuln] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [themeVersion, setThemeVersion] = useState(0);
  const [isFromCache, setIsFromCache] = useState(false);

  // Opciones de rango de búsqueda
  const rangeOptions = useMemo(() => [
    { label: '1 Mes', value: '1M', days: 30 },
    { label: '3 Meses', value: '3M', days: 90 },
    { label: '6 Meses', value: '6M', days: 180 },
    { label: '1 Año', value: '1Y', days: 365 },
    { label: '2 Años', value: '2Y', days: 730 },
    { label: '3 Años', value: '3Y', days: 1095 },
    { label: '5 Años', value: '5Y', days: 1825 }
  ], []);

  const selectedRangeObj = useMemo(() => {
    return rangeOptions.find(o => o.value === range) || rangeOptions[3];
  }, [range, rangeOptions]);

  // Escuchar cambios de tema
  useEffect(() => {
    const handleThemeChange = () => setThemeVersion(v => v + 1);
    window.addEventListener('theme-changed', handleThemeChange);
    return () => window.removeEventListener('theme-changed', handleThemeChange);
  }, []);

  const currentTheme = useMemo(() => {
    return themeManager.getCurrentTheme() || {};
  }, [themeVersion]);

  // Colores y estilos premium basados en el tema actual (forzando cyberpunk oscuro)
  const themeColors = useMemo(() => {
    const colors = currentTheme.colors || {};
    return {
      background: 'rgba(10, 12, 18, 0.98)',
      cardBackground: 'rgba(20, 24, 33, 0.75)',
      textPrimary: '#ffffff',
      textSecondary: '#94a3b8',
      borderColor: 'rgba(6, 182, 212, 0.2)',
      primary: colors.primaryColor || '#06b6d4',
      primaryHover: '#0891b2',
      danger: '#ef4444',
      warning: '#f97316',
      success: '#22c55e'
    };
  }, [currentTheme]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setIsFromCache(false);
    try {
      if (window.electron?.ipcRenderer) {
        const response = await window.electron.ipcRenderer.invoke('network-tools:get-recent-vulns', {
          minScore,
          days: selectedRangeObj.days
        });
        if (response && response.success) {
          setVulnerabilities(response.vulnerabilities || []);
          setIsFromCache(!!response.fromCache);
        } else {
          setError(response?.error || 'Error al obtener la lista de vulnerabilidades de NVD.');
        }
      } else {
        setError('El entorno de Electron (IPC) no está disponible.');
      }
    } catch (err) {
      console.error('Error fetching recent CVEs:', err);
      setError(err?.message || 'Error desconocido al invocar la API.');
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos por defecto al iniciar o al cambiar el rango
  useEffect(() => {
    handleSearch();
  }, [range]);

  const stats = useMemo(() => {
    const total = vulnerabilities.length;
    const avgScore = total > 0 
      ? (vulnerabilities.reduce((acc, curr) => acc + curr.score, 0) / total).toFixed(2)
      : '0.00';
    const criticalCount = vulnerabilities.filter(v => v.score >= 9.0).length;
    const highCount = vulnerabilities.filter(v => v.score >= 7.0 && v.score < 9.0).length;

    return { total, avgScore, criticalCount, highCount };
  }, [vulnerabilities]);

  // Formateadores
  const severityTemplate = (rowData) => {
    const score = rowData.score;
    let severity = 'success';
    let value = 'Baja';
    
    if (score >= 9.0) {
      severity = 'danger';
      value = 'CRÍTICA';
    } else if (score >= 7.0) {
      severity = 'warning';
      value = 'ALTA';
    } else if (score >= 4.0) {
      severity = 'info';
      value = 'MEDIA';
    }

    return (
      <Tag 
        value={value} 
        severity={severity}
        style={{
          boxShadow: score >= 9.0 ? '0 0 8px rgba(239, 68, 68, 0.5)' : 'none',
          fontWeight: '700',
          letterSpacing: '0.5px',
          padding: '0.25rem 0.5rem',
          borderRadius: '4px'
        }}
      />
    );
  };

  const scoreTemplate = (rowData) => {
    const score = rowData.score;
    const color = score >= 9.0 ? '#ef4444' : score >= 7.0 ? '#f97316' : '#eab308';
    return (
      <span style={{ color, fontWeight: '800', fontFamily: 'monospace', fontSize: '0.95rem' }}>
        {score.toFixed(1)}
      </span>
    );
  };

  const cveTemplate = (rowData) => {
    return (
      <span 
        style={{ 
          color: themeColors.primary, 
          fontWeight: '700', 
          cursor: 'pointer',
          textDecoration: 'underline',
          fontFamily: 'monospace',
          fontSize: '0.9rem'
        }}
        onClick={() => {
          setSelectedVuln(rowData);
          setDetailsVisible(true);
        }}
      >
        {rowData.cve}
      </span>
    );
  };

  const dateTemplate = (rowData) => {
    if (!rowData.published) return 'Desconocida';
    try {
      const date = new Date(rowData.published);
      return date.toLocaleDateString();
    } catch {
      return rowData.published;
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '0.75rem',
      height: '100%',
      color: themeColors.textPrimary
    }}>
      {/* Inyección de estilos CSS personalizados para forzar el tema oscuro en PrimeReact */}
      <style>{`
        .recent-vulns-table .p-datatable-header {
          background: rgba(15, 20, 30, 0.95) !important;
          border-color: rgba(6, 182, 212, 0.15) !important;
          padding: 0.5rem 0.75rem !important;
        }
        .recent-vulns-table .p-datatable-thead > tr > th {
          background: rgba(22, 28, 38, 0.95) !important;
          color: #94a3b8 !important;
          border-color: rgba(6, 182, 212, 0.15) !important;
          font-weight: 700 !important;
          font-size: 0.82rem !important;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .recent-vulns-table .p-datatable-tbody > tr {
          background: rgba(13, 16, 23, 0.6) !important;
          color: #e2e8f0 !important;
          transition: background 0.2s;
        }
        .recent-vulns-table .p-datatable-tbody > tr:hover {
          background: rgba(6, 182, 212, 0.08) !important;
        }
        .recent-vulns-table .p-datatable-tbody > tr > td {
          border-color: rgba(6, 182, 212, 0.1) !important;
          padding: 0.5rem 0.75rem !important;
          font-size: 0.82rem !important;
        }
        .recent-vulns-table .p-paginator {
          background: rgba(15, 20, 30, 0.95) !important;
          border-color: rgba(6, 182, 212, 0.15) !important;
          padding: 0.4rem !important;
        }
        .recent-vulns-table .p-paginator .p-paginator-page,
        .recent-vulns-table .p-paginator .p-paginator-next,
        .recent-vulns-table .p-paginator .p-paginator-last,
        .recent-vulns-table .p-paginator .p-paginator-first,
        .recent-vulns-table .p-paginator .p-paginator-prev {
          color: #94a3b8 !important;
          border-radius: 4px !important;
          min-width: 1.8rem !important;
          height: 1.8rem !important;
          font-size: 0.8rem !important;
        }
        .recent-vulns-table .p-paginator .p-paginator-page.p-highlight {
          background: rgba(6, 182, 212, 0.25) !important;
          color: #06b6d4 !important;
          font-weight: 700 !important;
          border: 1px solid rgba(6, 182, 212, 0.4) !important;
        }
        .cyberpunk-dialog .p-dialog-header {
          background: rgba(15, 20, 30, 0.98) !important;
          border-bottom: 1px solid rgba(6, 182, 212, 0.25) !important;
          color: #fff !important;
        }
        .cyberpunk-dialog .p-dialog-content {
          background: rgba(10, 12, 18, 0.98) !important;
          color: #cbd5e1 !important;
        }
        .cyberpunk-dialog .p-dialog-header .p-dialog-header-icon {
          color: #94a3b8 !important;
        }
        .cyberpunk-dialog .p-dialog-header .p-dialog-header-icon:hover {
          color: #fff !important;
          background: rgba(255,255,255,0.05) !important;
        }
        /* Custom scrollbar para la tabla scrollable */
        .recent-vulns-table .p-datatable-wrapper::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .recent-vulns-table .p-datatable-wrapper::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }
        .recent-vulns-table .p-datatable-wrapper::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.3);
          border-radius: 3px;
        }
        .recent-vulns-table .p-datatable-wrapper::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.5);
        }
        
        /* Dropdown custom dark styling */
        .cyber-dropdown {
          background: rgba(0, 0, 0, 0.4) !important;
          border: 1px solid rgba(6, 182, 212, 0.3) !important;
          border-radius: 4px !important;
        }
        .cyber-dropdown .p-inputtext {
          color: #fff !important;
          font-size: 0.78rem !important;
          padding: 0.15rem 0.5rem !important;
          display: flex;
          alignItems: center;
        }
        .cyber-dropdown .p-dropdown-trigger {
          color: #06b6d4 !important;
          width: 2rem !important;
        }
        .cyber-dropdown-panel {
          background: rgba(15, 20, 30, 0.98) !important;
          border: 1px solid rgba(6, 182, 212, 0.3) !important;
          box-shadow: 0 4px 15px rgba(0,0,0,0.5) !important;
        }
        .cyber-dropdown-panel .p-dropdown-items .p-dropdown-item {
          color: #cbd5e1 !important;
          font-size: 0.78rem !important;
          padding: 0.4rem 0.6rem !important;
        }
        .cyber-dropdown-panel .p-dropdown-items .p-dropdown-item.p-highlight {
          background: rgba(6, 182, 212, 0.25) !important;
          color: #06b6d4 !important;
        }
        .cyber-dropdown-panel .p-dropdown-items .p-dropdown-item:not(.p-highlight):not(.p-disabled):hover {
          background: rgba(255, 255, 255, 0.05) !important;
          color: #fff !important;
        }
      `}</style>

      {/* Controles de Configuración */}
      <div style={{
        background: themeColors.cardBackground,
        border: `1px solid ${themeColors.borderColor}`,
        borderRadius: '8px',
        padding: '0.75rem 1rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="pi pi-shield" style={{ color: themeColors.danger }}></i>
              Base de Datos Global de Vulnerabilidades Críticas
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.72rem', color: themeColors.textSecondary }}>
              Consulta en tiempo real la base de datos de NVD (National Vulnerability Database)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>Periodo:</span>
              <Dropdown 
                value={range} 
                options={rangeOptions} 
                onChange={(e) => setRange(e.value)} 
                className="cyber-dropdown"
                panelClassName="cyber-dropdown-panel"
                style={{ 
                  height: '26px', 
                  width: '110px'
                }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: themeColors.textSecondary }}>CVSS Mín:</span>
              <InputNumber 
                value={minScore} 
                onValueChange={(e) => setMinScore(Math.max(7.0, Math.min(10.0, e.value || 9.0)))} 
                min={7.0} 
                max={10.0} 
                minFractionDigits={1}
                maxFractionDigits={1}
                step={0.1}
                showButtons 
                buttonLayout="horizontal" 
                decrementButtonClassName="p-button-secondary" 
                incrementButtonClassName="p-button-secondary" 
                incrementButtonIcon="pi pi-plus" 
                decrementButtonIcon="pi pi-minus"
                inputStyle={{ width: '36px', textAlign: 'center', background: 'rgba(0,0,0,0.3)', border: `1px solid ${themeColors.borderColor}`, color: '#fff', padding: '0.15rem', height: '26px', fontSize: '0.78rem' }}
                style={{ height: '26px' }}
              />
            </div>

            <Button 
              label={loading ? 'Buscando...' : 'Buscar'} 
              icon={loading ? 'pi pi-spin pi-spinner' : 'pi pi-search'} 
              onClick={() => handleSearch()} 
              disabled={loading}
              style={{ 
                background: `linear-gradient(135deg, ${themeColors.primary} 0%, #0891b2 100%)`,
                border: 'none',
                borderRadius: '4px',
                padding: '0 0.75rem',
                height: '26px',
                fontSize: '0.72rem',
                fontWeight: '600'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '0.75rem'
      }}>
        <div style={{
          background: themeColors.cardBackground,
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '6px',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="pi pi-shield" style={{ color: themeColors.primary, fontSize: '0.9rem' }}></i>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: themeColors.textSecondary }}>Vulnerabilidades</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{stats.total}</div>
          </div>
        </div>

        <div style={{
          background: themeColors.cardBackground,
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '6px',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="pi pi-exclamation-triangle" style={{ color: themeColors.danger, fontSize: '0.9rem' }}></i>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: themeColors.textSecondary }}>Score Promedio</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{stats.avgScore}</div>
          </div>
        </div>

        <div style={{
          background: themeColors.cardBackground,
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '6px',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="pi pi-bolt" style={{ color: themeColors.warning, fontSize: '0.9rem' }}></i>
          </div>
          <div>
            <div style={{ fontSize: '0.68rem', color: themeColors.textSecondary }}>Críticas &ge; 9.0</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#fff' }}>{stats.criticalCount}</div>
          </div>
        </div>
      </div>

      {isFromCache && !loading && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.08)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '4px',
          padding: '0.35rem 0.6rem',
          fontSize: '0.7rem',
          color: '#4ade80',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <i className="pi pi-info-circle"></i>
          Resultados cargados desde caché local.
        </div>
      )}

      {error && (
        <Message severity="error" text={error} style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.78rem' }} />
      )}

      {/* Contenedor de la Tabla */}
      <div style={{
        flex: 1,
        background: themeColors.cardBackground,
        border: `1px solid ${themeColors.borderColor}`,
        borderRadius: '8px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        minHeight: 0
      }}>
        {/* Filtro de la Tabla */}
        <div style={{
          padding: '0.4rem 0.6rem',
          borderBottom: `1px solid ${themeColors.borderColor}`,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          background: 'rgba(15, 20, 30, 0.5)'
        }}>
          <span className="p-input-icon-left" style={{ display: 'flex', alignItems: 'center', width: '200px' }}>
            <i className="pi pi-search" style={{ marginRight: '6px', color: themeColors.textSecondary, fontSize: '0.75rem' }} />
            <InputText 
              value={globalFilter} 
              onChange={(e) => setGlobalFilter(e.target.value)} 
              placeholder="Filtrar por CVE..." 
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(6, 182, 212, 0.2)',
                borderRadius: '4px',
                color: '#fff',
                padding: '0.2rem 0.4rem 0.2rem 1.6rem',
                fontSize: '0.75rem',
                height: '24px'
              }}
            />
          </span>
        </div>

        {loading ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '2rem' }}>
            <ProgressSpinner style={{ width: '32px', height: '32px' }} />
            <div style={{ color: themeColors.textSecondary, fontSize: '0.78rem' }}>
              Realizando llamadas secuenciales a la base de datos de NVD...
            </div>
            <div style={{ color: '#0891b2', fontSize: '0.68rem', fontFamily: 'monospace' }}>
              (Esto puede tomar unos segundos para evitar el límite de tasa de la API)
            </div>
          </div>
        ) : (
          <DataTable 
            value={vulnerabilities} 
            paginator 
            rows={10} 
            globalFilter={globalFilter}
            emptyMessage="No se encontraron vulnerabilidades críticas para este rango de fechas."
            className="p-datatable-sm recent-vulns-table"
            scrollable
            scrollHeight="360px"
            rowHover
          >
            <Column field="cve" header="Identificador CVE" body={cveTemplate} sortable style={{ width: '130px', fontWeight: 'bold' }} />
            <Column field="score" header="Score CVSS" body={scoreTemplate} sortable style={{ width: '90px', textAlign: 'center' }} />
            <Column field="severity" header="Severidad" body={severityTemplate} style={{ width: '100px' }} />
            <Column field="published" header="Publicado" body={dateTemplate} sortable style={{ width: '110px' }} />
            <Column field="description" header="Descripción" style={{ whiteSpace: 'normal', minWidth: '350px', lineHeight: '1.4' }} />
          </DataTable>
        )}
      </div>

      {/* Diálogo de Detalles de Vulnerabilidad */}
      <Dialog 
        header={selectedVuln ? `Detalle de Vulnerabilidad - ${selectedVuln.cve}` : 'Detalles'} 
        visible={detailsVisible} 
        onHide={() => setDetailsVisible(false)}
        style={{ width: '550px' }}
        modal
        draggable={false}
        resizable={false}
        className="cyberpunk-dialog"
      >
        {selectedVuln && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '0.25rem 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: themeColors.textSecondary }}>CVSS Score</span>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: selectedVuln.score >= 9.0 ? '#ef4444' : '#f97316' }}>
                  {selectedVuln.score.toFixed(1)} / 10
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.72rem', color: themeColors.textSecondary, display: 'block', textAlign: 'right' }}>Fecha Publicación</span>
                <span style={{ fontWeight: '600', color: '#fff', fontSize: '0.85rem' }}>{new Date(selectedVuln.published).toLocaleDateString()}</span>
              </div>
            </div>

            <div>
              <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: themeColors.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Descripción de la Vulnerabilidad
              </h3>
              <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.5', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(6, 182, 212, 0.1)' }}>
                {selectedVuln.description}
              </p>
            </div>

            {selectedVuln.references && selectedVuln.references.length > 0 && (
              <div>
                <h3 style={{ margin: '0 0 0.4rem 0', fontSize: '0.85rem', color: themeColors.primary, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Enlaces de Referencia / Advisory
                </h3>
                <ul style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedVuln.references.map((url, i) => (
                    <li key={i}>
                      <a 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          if (window.electron?.ipcRenderer) {
                            window.electron.ipcRenderer.send('window:open-external-url', url);
                          } else {
                            window.open(url, '_blank');
                          }
                        }} 
                        style={{ color: themeColors.primary, textDecoration: 'none', wordBreak: 'break-all' }}
                      >
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};

export default RecentVulnsPanel;
