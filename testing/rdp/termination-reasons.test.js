const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { mapTerminationReason } = require('../../src/utils/rdpTerminationReasons');

describe('mapTerminationReason', () => {
  test('detecta timeout por inactividad desde razón de WASM o RDP PDU', () => {
    const res = mapTerminationReason('DisconnectReason::IdleTimeout (code 3)', null, true);
    assert.equal(res.category, 'INACTIVITY_TIMEOUT');
    assert.equal(res.severity, 'warn');
    assert.match(res.title, /inactividad/i);
    assert.match(res.description, /tiempo límite de inactividad/i);
    assert.equal(res.icon, 'pi pi-hourglass');
  });

  test('detecta timeout por inactividad desde backend reason', () => {
    const res = mapTerminationReason(null, 'Conexión cortada por inactividad o timeout', true);
    assert.equal(res.category, 'INACTIVITY_TIMEOUT');
    assert.match(res.title, /inactividad/i);
  });

  test('detecta logon timeout', () => {
    const res = mapTerminationReason('ERRINFO_LOGON_TIMEOUT', null, false);
    assert.equal(res.category, 'LOGON_TIMEOUT');
    assert.match(res.title, /inicio de sesión agotado/i);
    assert.equal(res.icon, 'pi pi-clock');
  });

  test('detecta sesión desplazada por otra conexión', () => {
    const res = mapTerminationReason('DisconnectedByOtherConnection', null, true);
    assert.equal(res.category, 'DISPLACED_SESSION');
    assert.match(res.title, /otra conexión/i);
    assert.equal(res.icon, 'pi pi-users');
  });

  test('detecta logoff normal por parte del usuario', () => {
    const res = mapTerminationReason('UserInitiated logoff', null, true);
    assert.equal(res.category, 'USER_LOGOFF');
    assert.match(res.title, /finalizada/i);
    assert.equal(res.icon, 'pi pi-check-circle');
  });

  test('detecta reinicio o apagado del servidor remoto', () => {
    const res = mapTerminationReason('ERRINFO_SERVER_STATUS_DISCONNECTED reboot', null, true);
    assert.equal(res.category, 'SERVER_SHUTDOWN');
    assert.match(res.title, /reiniciado/i);
    assert.equal(res.icon, 'pi pi-server');
  });

  test('detecta fallo de autenticación / credenciales incorrectas', () => {
    const res = mapTerminationReason('Contraseña o usuario incorrecto (1)', null, false);
    assert.equal(res.category, 'AUTH_FAILED');
    assert.equal(res.severity, 'danger');
    assert.match(res.title, /autenticación/i);
    assert.equal(res.icon, 'pi pi-lock');
  });

  test('en sesión activa, clasifica corte con inactividad como INACTIVITY_TIMEOUT', () => {
    const res = mapTerminationReason(null, 'Conexión cortada por el servidor remoto o la red (posible inactividad)', true, new Error('read ECONNRESET'));
    assert.equal(res.category, 'INACTIVITY_TIMEOUT');
    assert.equal(res.severity, 'warn');
    assert.match(res.title, /inactividad/i);
    assert.match(res.description, /tiempo límite de inactividad/i);
    assert.equal(res.icon, 'pi pi-hourglass');
  });

  test('en sesión activa, clasifica corte genérico de socket como CONNECTION_LOST', () => {
    const res = mapTerminationReason(null, 'Cerrado por el servidor remoto', true, new Error('read ECONNRESET'));
    assert.equal(res.category, 'CONNECTION_LOST');
    assert.equal(res.severity, 'warn');
    assert.match(res.title, /servidor remoto o la red/i);
    assert.equal(res.icon, 'pi pi-wifi');
  });

  test('en arranque (sin haberse conectado), clasifica como CONNECT_ERROR', () => {
    const res = mapTerminationReason(null, null, false, new Error('ECONNREFUSED'));
    assert.equal(res.category, 'CONNECT_ERROR');
    assert.equal(res.severity, 'danger');
    assert.match(res.title, /Error al establecer sesión/i);
  });
});
