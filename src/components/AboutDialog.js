import React, { useState, useEffect } from 'react';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { getVersionInfo, getElectronVersionInfo } from '../version-info';

const AboutDialog = ({ visible, onHide }) => {
  const [versionInfo, setVersionInfo] = useState(getVersionInfo());

  useEffect(() => {
    // Intentar obtener información más detallada de Electron
    const loadElectronInfo = async () => {
      const electronInfo = await getElectronVersionInfo();
      setVersionInfo(prev => ({
        ...prev,
        ...electronInfo
      }));
    };

    if (visible) {
      loadElectronInfo();
    }
  }, [visible]);

  const {
    appVersion,
    appName,
    buildDate,
    electronVersion,
    nodeVersion,
    chromeVersion
  } = versionInfo;

  return (
    <Dialog
      header={
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-info-circle" style={{ fontSize: '1.5rem', color: 'var(--primary-color)' }}></i>
          <span>Acerca de {appName}</span>
        </div>
      }
      visible={visible}
      style={{ width: '450px' }}
      onHide={onHide}
      modal
      footer={
        <div>
          <Button 
            label="Cerrar" 
            icon="pi pi-times" 
            onClick={onHide} 
            className="p-button-text" 
          />
        </div>
      }
    >
      <div style={{ textAlign: 'center', padding: '1rem 0' }}>
        {/* Logo o Icono de la App */}
        <div style={{ marginBottom: '1rem' }}>
          <i 
            className="pi pi-desktop" 
            style={{ 
              fontSize: '4rem', 
              color: 'var(--primary-color)',
              background: 'var(--surface-100)',
              padding: '1rem',
              borderRadius: '50%',
              width: '6rem',
              height: '6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}
          ></i>
        </div>

        {/* Información Principal */}
        <h2 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-color)' }}>
          {appName}
        </h2>
        <p style={{ 
          margin: '0 0 1rem 0', 
          color: 'var(--text-color-secondary)',
          fontSize: '0.9rem'
        }}>
          Terminal SSH multiplataforma con gestión avanzada de pestañas
        </p>

        {/* Versión Principal */}
        <div style={{ 
          background: 'var(--primary-color)', 
          color: 'white', 
          padding: '0.5rem 1rem', 
          borderRadius: '20px', 
          display: 'inline-block',
          fontWeight: 'bold',
          fontSize: '1.1rem',
          marginBottom: '1.5rem'
        }}>
          v{appVersion}
        </div>

        <Divider />

        {/* Información Técnica */}
        <div style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
            <i className="pi pi-cog" style={{ marginRight: '0.5rem' }}></i>
            Información Técnica
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.9rem' }}>
            <div>
              <strong>Electron:</strong>
              <br />
              <span style={{ color: 'var(--text-color-secondary)' }}>v{electronVersion}</span>
            </div>
            <div>
              <strong>Node.js:</strong>
              <br />
              <span style={{ color: 'var(--text-color-secondary)' }}>v{nodeVersion}</span>
            </div>
            <div>
              <strong>Chromium:</strong>
              <br />
              <span style={{ color: 'var(--text-color-secondary)' }}>v{chromeVersion}</span>
            </div>
            <div>
              <strong>Compilación:</strong>
              <br />
              <span style={{ color: 'var(--text-color-secondary)' }}>{buildDate}</span>
            </div>
          </div>
        </div>

        <Divider />

        {/* Funcionalidades */}
        <div style={{ textAlign: 'left', marginTop: '1rem' }}>
          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--text-color)' }}>
            <i className="pi pi-star" style={{ marginRight: '0.5rem' }}></i>
            Características Principales
          </h4>
          
          <div style={{ fontSize: '0.85rem', color: 'var(--text-color-secondary)' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
              Conexiones SSH múltiples con pestañas
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
              Explorador de archivos remoto integrado
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
              Drag & drop para organización de pestañas
            </div>
            <div style={{ marginBottom: '0.5rem' }}>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
              Iconos automáticos por distribución Linux
            </div>
            <div>
              <i className="pi pi-check" style={{ color: 'var(--green-500)', marginRight: '0.5rem' }}></i>
              Sistema de overflow inteligente para pestañas
            </div>
          </div>
        </div>

        <Divider />

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-color-secondary)' }}>
          <p style={{ margin: '0' }}>
            © 2025 NodeTerm - Desarrollado con ❤️ usando Electron y React
          </p>
        </div>
      </div>
    </Dialog>
  );
};

export default AboutDialog; 