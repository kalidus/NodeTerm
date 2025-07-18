import React from 'react';
import SplitLayout from './SplitLayout';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { getVersionInfo } from '../version-info';
import PowerShellTerminal from './PowerShellTerminal';

const HomeTab = ({ 
  onCreateSSHConnection, 
  onCreateFolder,
  sshConnectionsCount = 0,
  foldersCount = 0 
}) => {
  const versionInfo = getVersionInfo();

  // Panel superior: contenido de bienvenida
  const topPanel = (
    <div style={{ 
      padding: '2rem', 
      height: '100%', 
      overflow: 'auto',
      background: 'var(--surface-ground, #fafafa)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '2rem'
    }}>
      {/* Header de bienvenida */}
      <div style={{ textAlign: 'center', maxWidth: '800px' }}>
        <h1 style={{ 
          color: 'var(--primary-color, #1976d2)', 
          marginBottom: '1rem',
          fontSize: '2.5rem',
          fontWeight: 'bold'
        }}>
          ¡Bienvenido a NodeTerm!
        </h1>
        <p style={{ 
          fontSize: '1.2rem', 
          color: 'var(--text-color-secondary, #666)',
          lineHeight: '1.6',
          marginBottom: '2rem'
        }}>
          Tu terminal moderno para conexiones SSH y exploración de archivos remotos.
          Conecta con servidores, explora sistemas de archivos y gestiona sesiones de forma eficiente.
        </p>
      </div>

      {/* Tarjetas de acción rápida */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1000px'
      }}>
        {/* Tarjeta de conexiones SSH */}
        <Card 
          title="Conexiones SSH"
          style={{ 
            height: '100%',
            background: 'var(--surface-card, white)',
            border: '1px solid var(--surface-border, #dee2e6)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-color-secondary, #666)' }}>
              Crea y gestiona conexiones SSH a servidores remotos.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-server" style={{ color: 'var(--primary-color, #1976d2)' }}></i>
              <span style={{ fontWeight: 'bold' }}>Conexiones activas: {sshConnectionsCount}</span>
            </div>
            <Button
              label="Nueva Conexión SSH"
              icon="pi pi-plus"
              onClick={onCreateSSHConnection}
              className="p-button-primary"
              style={{ marginTop: 'auto' }}
            />
          </div>
        </Card>

        {/* Tarjeta de organización */}
        <Card 
          title="Organización"
          style={{ 
            height: '100%',
            background: 'var(--surface-card, white)',
            border: '1px solid var(--surface-border, #dee2e6)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ color: 'var(--text-color-secondary, #666)' }}>
              Organiza tus conexiones en carpetas y grupos para un mejor flujo de trabajo.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <i className="pi pi-folder" style={{ color: 'var(--primary-color, #1976d2)' }}></i>
              <span style={{ fontWeight: 'bold' }}>Carpetas creadas: {foldersCount}</span>
            </div>
            <Button
              label="Nueva Carpeta"
              icon="pi pi-folder-plus"
              onClick={onCreateFolder}
              className="p-button-secondary"
              style={{ marginTop: 'auto' }}
            />
          </div>
        </Card>
      </div>

      <Divider />

      {/* Sección de características */}
      <div style={{ maxWidth: '800px', width: '100%' }}>
        <h2 style={{ 
          textAlign: 'center', 
          color: 'var(--text-color, #333)',
          marginBottom: '2rem'
        }}>
          Características principales
        </h2>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1.5rem'
        }}>
          {[
            {
              icon: 'pi pi-desktop',
              title: 'Terminal SSH',
              description: 'Conexiones SSH completas con soporte para múltiples sesiones y splits.'
            },
            {
              icon: 'pi pi-folder-open',
              title: 'Explorador de Archivos',
              description: 'Navega y gestiona archivos remotos de forma intuitiva.'
            },
            {
              icon: 'pi pi-th-large',
              title: 'Grupos de Pestañas',
              description: 'Organiza tus sesiones en grupos para mejor productividad.'
            },
            {
              icon: 'pi pi-palette',
              title: 'Temas Personalizables',
              description: 'Múltiples temas y opciones de personalización visual.'
            }
          ].map((feature, index) => (
            <div 
              key={index}
              style={{ 
                textAlign: 'center',
                padding: '1.5rem',
                background: 'var(--surface-card, white)',
                borderRadius: '8px',
                border: '1px solid var(--surface-border, #dee2e6)'
              }}
            >
              <i 
                className={feature.icon} 
                style={{ 
                  fontSize: '2rem', 
                  color: 'var(--primary-color, #1976d2)',
                  marginBottom: '1rem',
                  display: 'block'
                }}
              ></i>
              <h3 style={{ 
                marginBottom: '0.5rem',
                color: 'var(--text-color, #333)'
              }}>
                {feature.title}
              </h3>
              <p style={{ 
                color: 'var(--text-color-secondary, #666)',
                lineHeight: '1.4',
                margin: 0
              }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer con información de versión */}
      <div style={{ 
        textAlign: 'center',
        marginTop: 'auto',
        padding: '2rem 0',
        color: 'var(--text-color-secondary, #666)',
        fontSize: '0.9rem'
      }}>
        <p>NodeTerm v{versionInfo.version}</p>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          Desarrollado con Electron {versionInfo.electron} y React
        </p>
      </div>
    </div>
  );

  // Panel inferior: Terminal de PowerShell
  const bottomPanel = (
    <div style={{
      height: '100%',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#012456',
      overflow: 'hidden'
    }}>
      {/* Header del terminal */}
      <div style={{
        background: '#1e3a5f',
        padding: '8px 16px',
        borderBottom: '1px solid #2a4a6b',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        color: '#ffffff',
        fontWeight: '500'
      }}>
        <i className="pi pi-desktop" style={{ color: '#4fc3f7' }}></i>
        <span>PowerShell Terminal</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ff5f57'
          }}></div>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ffbd2e'
          }}></div>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#28ca42'
          }}></div>
        </div>
      </div>
      {/* Terminal component */}
      <PowerShellTerminal />
    </div>
  );

  // Usar SplitLayout para el split horizontal
  return (
    <SplitLayout
      leftTerminal={{ key: 'home_top', content: topPanel }}
      rightTerminal={{ key: 'home_bottom', content: bottomPanel }}
      orientation="horizontal"
      // No se usan sshConfig ni stats aquí
      fontFamily={''}
      fontSize={16}
      theme={{}}
      onContextMenu={() => {}}
      sshStatsByTabId={{}}
      terminalRefs={{ current: {} }}
      statusBarIconTheme="classic"
      isHomeTab={true}
    />
  );
};

export default HomeTab; 