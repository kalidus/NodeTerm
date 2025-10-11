// 🔒 SCRIPT DE VERIFICACIÓN DE ENCRIPTACIÓN NODETERM
// Copiar y pegar este archivo completo en la consola del navegador (F12)

console.clear();
console.log('%c═══════════════════════════════════════════════════', 'color: #4ec9b0; font-weight: bold');
console.log('%c🔒 VERIFICACIÓN DE ENCRIPTACIÓN NODETERM', 'color: #4ec9b0; font-weight: bold; font-size: 16px');
console.log('%c═══════════════════════════════════════════════════', 'color: #4ec9b0; font-weight: bold');
console.log('');

// 1. VERIFICAR MASTER KEY
const masterKeyData = localStorage.getItem('nodeterm_master_key');
const hasMasterKey = !!masterKeyData;

console.log('%c1️⃣  MASTER KEY', 'color: #569cd6; font-weight: bold');
console.log('   Estado:', hasMasterKey ? '✅ Configurada' : '❌ No configurada');

if (hasMasterKey) {
  try {
    const masterKeyObj = JSON.parse(masterKeyData);
    console.log('   Salt:', masterKeyObj.salt ? '✅ Presente' : '❌ Falta');
    console.log('   IV:', masterKeyObj.iv ? '✅ Presente' : '❌ Falta');
    console.log('   Data:', masterKeyObj.data ? `✅ ${masterKeyObj.data.length} bytes` : '❌ Falta');
    console.log('   Timestamp:', masterKeyObj.timestamp ? new Date(masterKeyObj.timestamp).toLocaleString() : 'N/A');
    console.log('   ¿Encriptado?:', masterKeyObj.data && Array.isArray(masterKeyObj.data) ? '✅ SÍ (array de bytes)' : '⚠️  Revisar');
  } catch (e) {
    console.log('%c   ⚠️  Error parseando master key: ' + e.message, 'color: #f48771');
  }
} else {
  console.log('%c   ⚠️  Sin master key - Los datos NO están encriptados', 'color: #dcdcaa');
}

// 2. AUTO-UNLOCK
console.log('\n%c2️⃣  AUTO-UNLOCK', 'color: #569cd6; font-weight: bold');
const rememberPassword = localStorage.getItem('nodeterm_remember_password');
console.log('   Estado:', rememberPassword === 'true' ? '✅ Activado' : '❌ Desactivado');

// 3. PASSWORDS
console.log('\n%c3️⃣  PASSWORD MANAGER', 'color: #569cd6; font-weight: bold');
const passwordsEncrypted = localStorage.getItem('passwords_encrypted');
const passwordsPlaintext = localStorage.getItem('passwordManagerNodes');

if (passwordsEncrypted) {
  try {
    const passObj = JSON.parse(passwordsEncrypted);
    console.log('%c   Estado: ✅ ENCRIPTADO', 'color: #4ec9b0');
    console.log('   Salt:', passObj.salt ? `✅ ${passObj.salt.length} bytes` : '❌ Falta');
    console.log('   IV:', passObj.iv ? `✅ ${passObj.iv.length} bytes` : '❌ Falta');
    console.log('   Data:', passObj.data ? `✅ ${passObj.data.length} bytes` : '❌ Falta');
    console.log('   Timestamp:', passObj.timestamp ? new Date(passObj.timestamp).toLocaleString() : 'N/A');
    console.log('   ¿Encriptado?:', passObj.data && Array.isArray(passObj.data) ? '✅ SÍ (array de bytes)' : '⚠️  Revisar');
  } catch (e) {
    console.log('%c   ⚠️  Error parseando passwords: ' + e.message, 'color: #f48771');
  }
} else {
  console.log('%c   Estado: ⚠️  SIN DATOS ENCRIPTADOS', 'color: #dcdcaa');
}

if (passwordsPlaintext) {
  console.log('%c   ⚠️  PELIGRO: Hay passwords sin encriptar en localStorage', 'color: #f48771; font-weight: bold');
  console.log('%c   ⚠️  Acción requerida: Configurar master key para migrar automáticamente', 'color: #f48771');
}

// 4. CONEXIONES
console.log('\n%c4️⃣  CONEXIONES SSH/RDP', 'color: #569cd6; font-weight: bold');
const connectionsEncrypted = localStorage.getItem('connections_encrypted');
const connectionsPlaintext = localStorage.getItem('basicapp2_tree_data');

if (connectionsEncrypted) {
  try {
    const connObj = JSON.parse(connectionsEncrypted);
    console.log('%c   Estado: ✅ ENCRIPTADO', 'color: #4ec9b0');
    console.log('   Salt:', connObj.salt ? `✅ ${connObj.salt.length} bytes` : '❌ Falta');
    console.log('   IV:', connObj.iv ? `✅ ${connObj.iv.length} bytes` : '❌ Falta');
    console.log('   Data:', connObj.data ? `✅ ${connObj.data.length} bytes` : '❌ Falta');
    console.log('   Timestamp:', connObj.timestamp ? new Date(connObj.timestamp).toLocaleString() : 'N/A');
    console.log('   ¿Encriptado?:', connObj.data && Array.isArray(connObj.data) ? '✅ SÍ (array de bytes)' : '⚠️  Revisar');
  } catch (e) {
    console.log('%c   ⚠️  Error parseando conexiones: ' + e.message, 'color: #f48771');
  }
} else {
  console.log('%c   Estado: ⚠️  SIN DATOS ENCRIPTADOS', 'color: #dcdcaa');
}

if (connectionsPlaintext) {
  console.log('%c   ⚠️  PELIGRO: Hay conexiones sin encriptar en localStorage', 'color: #f48771; font-weight: bold');
  console.log('%c   ⚠️  Acción requerida: Configurar master key para migrar automáticamente', 'color: #f48771');
}

// 5. RESUMEN DE SEGURIDAD
console.log('\n%c5️⃣  RESUMEN DE SEGURIDAD', 'color: #569cd6; font-weight: bold');
let securityLevel = 0;
let securityIssues = [];

if (hasMasterKey) {
  securityLevel += 2;
  console.log('%c   ✅ Master key configurada (+2)', 'color: #4ec9b0');
} else {
  securityIssues.push('No hay master key configurada');
}

if (passwordsEncrypted) {
  securityLevel += 1;
  console.log('%c   ✅ Passwords encriptados (+1)', 'color: #4ec9b0');
} else if (passwordsPlaintext) {
  securityIssues.push('Passwords en texto plano');
}

if (connectionsEncrypted) {
  securityLevel += 1;
  console.log('%c   ✅ Conexiones encriptadas (+1)', 'color: #4ec9b0');
} else if (connectionsPlaintext) {
  securityIssues.push('Conexiones en texto plano');
}

if (!passwordsPlaintext && !connectionsPlaintext) {
  securityLevel += 1;
  console.log('%c   ✅ No hay datos sin encriptar (+1)', 'color: #4ec9b0');
}

const stars = '⭐'.repeat(securityLevel);
console.log(`\n   NIVEL DE SEGURIDAD: ${stars} (${securityLevel}/5)`);

if (securityIssues.length > 0) {
  console.log('\n%c   ⚠️  PROBLEMAS DETECTADOS:', 'color: #f48771; font-weight: bold');
  securityIssues.forEach((issue, i) => {
    console.log(`%c   ${i + 1}. ${issue}`, 'color: #f48771');
  });
}

// 6. MODO OPERATIVO
console.log('\n%c6️⃣  MODO OPERATIVO', 'color: #569cd6; font-weight: bold');
let mode = '';
let modeEmoji = '';

if (!hasMasterKey) {
  mode = 'Sin Encriptación';
  modeEmoji = '🟡';
} else if (rememberPassword === 'true') {
  mode = 'Auto-Unlock + AES-256';
  modeEmoji = '🟢';
} else {
  mode = 'Unlock Manual + AES-256';
  modeEmoji = '🔵';
}

console.log(`   ${modeEmoji} MODO: ${mode}`);

// 7. VERIFICACIÓN DE ESTRUCTURA
console.log('\n%c7️⃣  VERIFICACIÓN DE ESTRUCTURA', 'color: #569cd6; font-weight: bold');

const verifyStructure = (dataStr, name) => {
  if (!dataStr) return;
  try {
    const obj = JSON.parse(dataStr);
    const hasRequiredFields = obj.salt && obj.iv && obj.data && obj.timestamp;
    console.log(`   ${name}:`, hasRequiredFields ? '✅ Estructura correcta' : '⚠️  Estructura incorrecta');
    
    if (obj.salt && !Array.isArray(obj.salt)) console.log('      ⚠️  salt no es array');
    if (obj.iv && !Array.isArray(obj.iv)) console.log('      ⚠️  iv no es array');
    if (obj.data && !Array.isArray(obj.data)) console.log('      ⚠️  data no es array');
    
    if (obj.salt && obj.salt.length !== 16) console.log(`      ⚠️  salt debería ser 16 bytes (es ${obj.salt.length})`);
    if (obj.iv && obj.iv.length !== 12) console.log(`      ⚠️  iv debería ser 12 bytes (es ${obj.iv.length})`);
  } catch (e) {
    console.log(`%c   ${name}: ⚠️  Error parseando - ${e.message}`, 'color: #f48771');
  }
};

if (hasMasterKey) verifyStructure(masterKeyData, 'Master Key');
if (passwordsEncrypted) verifyStructure(passwordsEncrypted, 'Passwords');
if (connectionsEncrypted) verifyStructure(connectionsEncrypted, 'Conexiones');

// 8. RECOMENDACIONES
console.log('\n%c8️⃣  RECOMENDACIONES', 'color: #569cd6; font-weight: bold');
if (!hasMasterKey) {
  console.log('%c   📋 1. Configurar master password en Settings > Seguridad', 'color: #dcdcaa');
  console.log('%c   📋 2. Los datos se migrarán automáticamente al encriptarse', 'color: #dcdcaa');
} else {
  if (passwordsPlaintext || connectionsPlaintext) {
    console.log('%c   📋 Reiniciar la app para que se complete la migración automática', 'color: #dcdcaa');
  } else {
    console.log('%c   ✅ Todo está correctamente configurado', 'color: #4ec9b0');
    if (rememberPassword !== 'true') {
      console.log('   💡 Considera activar Auto-Unlock en Settings para mayor comodidad');
    }
  }
}

console.log('\n%c═══════════════════════════════════════════════════', 'color: #4ec9b0; font-weight: bold');
console.log('%cVerificación completada ✅', 'color: #4ec9b0; font-weight: bold');
console.log('%c═══════════════════════════════════════════════════', 'color: #4ec9b0; font-weight: bold');
console.log('');

