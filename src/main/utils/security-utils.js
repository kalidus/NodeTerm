/**
 * Utilidades de seguridad para el proceso principal
 */

/**
 * Máscara campos sensibles en un objeto para logging seguro
 * @param {Object} data - El objeto a enmascarar
 * @param {Array} sensitiveFields - Lista de campos a enmascarar (opcional)
 * @returns {Object} - Copia del objeto con campos sensibles enmascarados
 */
function maskSensitiveData(data, sensitiveFields = []) {
  if (!data || typeof data !== 'object') return data;

  const defaultSensitiveFields = [
    'password', 'passwordssh', 'sshpassword', 'ssh_password',
    'key', 'privatekey', 'private_key', 'privatekeypath', 'private_key_path',
    'token', 'api_key', 'apikey', 'secret', 'secret_key', 'secretkey',
    'passphrase', 'auth_token', 'authtoken', 'credentials', 'manualpassword'
  ];

  const fieldsToMask = [...new Set([...defaultSensitiveFields, ...sensitiveFields])];
  
  // Manejar arrays
  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, sensitiveFields));
  }

  const masked = { ...data };

  for (const key of Object.keys(masked)) {
    const lowerKey = key.toLowerCase();
    
    if (fieldsToMask.some(field => lowerKey.includes(field))) {
      if (typeof masked[key] === 'string' && masked[key].length > 0) {
        masked[key] = '********';
      } else if (masked[key] !== undefined && masked[key] !== null) {
        masked[key] = '********';
      }
    } else if (typeof masked[key] === 'object' && masked[key] !== null) {
      masked[key] = maskSensitiveData(masked[key], sensitiveFields);
    }
  }

  return masked;
}

module.exports = {
  maskSensitiveData
};
