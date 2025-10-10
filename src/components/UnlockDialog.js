import React, { useState } from 'react';
import { Dialog } from 'primereact/dialog';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Message } from 'primereact/message';
import { Checkbox } from 'primereact/checkbox';

const UnlockDialog = ({ visible, onSuccess, secureStorage }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);

  const handleUnlock = async () => {
    setLoading(true);
    setError('');

    try {
      // Cargar la master key guardada (usa device fingerprint)
      const savedMasterKey = await secureStorage.loadMasterKey();
      
      if (!savedMasterKey) {
        setError('Error al cargar la clave guardada');
        setLoading(false);
        return;
      }

      // Verificar que el password introducido es correcto
      // comparándolo con el masterKey guardado
      if (password !== savedMasterKey) {
        setError('Contraseña incorrecta');
        setLoading(false);
        return;
      }

      // Password correcto - guardar preferencia de recordar
      if (rememberPassword) {
        localStorage.setItem('nodeterm_remember_password', 'true');
      } else {
        localStorage.removeItem('nodeterm_remember_password');
      }

      // Devolver la master key
      onSuccess(savedMasterKey);
    } catch (err) {
      setError('Error al desbloquear la aplicación');
      setLoading(false);
    }
  };

  return (
    <Dialog
      header="🔓 Desbloquear NodeTerm"
      visible={visible}
      style={{ width: '400px' }}
      modal
      closable={false}
    >
      <div className="p-fluid">
        {error && <Message severity="error" text={error} className="mb-3" />}

        <Message 
          severity="info" 
          text="Introduce tu contraseña maestra para desbloquear la aplicación"
          className="mb-3"
        />

        <div className="field mb-3">
          <label htmlFor="unlock-password">Contraseña Maestra</label>
          <Password
            id="unlock-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            toggleMask
            feedback={false}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && password && handleUnlock()}
          />
        </div>

        <div className="field-checkbox mb-3">
          <Checkbox
            inputId="remember-password"
            checked={rememberPassword}
            onChange={(e) => setRememberPassword(e.checked)}
          />
          <label htmlFor="remember-password" className="ml-2">
            Recordar contraseña en este dispositivo
          </label>
        </div>

        <Button
          label="Desbloquear"
          icon="pi pi-unlock"
          onClick={handleUnlock}
          loading={loading}
          disabled={!password}
          className="w-full"
        />
      </div>
    </Dialog>
  );
};

export default UnlockDialog;

