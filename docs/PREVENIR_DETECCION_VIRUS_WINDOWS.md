# 🛡️ Prevenir Detección como Virus en Windows

Esta guía explica cómo evitar que Windows Defender y otros antivirus detecten tu aplicación Electron como un virus o malware.

## 📋 Índice

1. [Problema Común](#problema-común)
2. [Soluciones Implementadas](#soluciones-implementadas)
3. [VirusTotal - Análisis Automático](#virustotal---análisis-automático) ⭐ **NUEVO**
4. [Firma de Código (Recomendado)](#firma-de-código-recomendado)
5. [Enviar a Microsoft para Análisis](#enviar-a-microsoft-para-análisis)
6. [Configuración Local (Desarrollo)](#configuración-local-desarrollo)
7. [Mejores Prácticas](#mejores-prácticas)

---

## 🔴 Problema Común

Las aplicaciones Electron sin firma de código son frecuentemente marcadas como sospechosas por Windows Defender y otros antivirus porque:

- ❌ No tienen firma digital verificable
- ❌ Acceden a recursos del sistema (archivos, red, procesos)
- ❌ Empaquetan ejecutables nativos (node-pty, ssh2, etc.)
- ❌ No tienen metadatos completos del desarrollador

---

## ✅ Soluciones Implementadas

### 1. Metadatos Mejorados en `package.json`

Se han agregado los siguientes metadatos a la configuración de electron-builder:

```json
{
  "copyright": "Copyright © 2024",
  "compression": "maximum",
  "win": {
    "publisherName": "NodeTerm",
    "verifyUpdateCodeSignature": false,
    "requestedExecutionLevel": "asInvoker"
  },
  "nsis": {
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "NodeTerm"
  }
}
```

**Beneficios:**
- ✅ Información del publicador visible en propiedades del archivo
- ✅ Nivel de ejecución apropiado (no requiere elevación)
- ✅ Atajos del sistema configurados correctamente

### 2. Configuración de NSIS Mejorada

El instalador NSIS ahora incluye:
- Iconos personalizados en todas las etapas
- Configuración de atajos del sistema
- Información del instalador más completa

---

## 🛡️ VirusTotal - Análisis Automático ⭐

**VirusTotal es una herramienta GRATUITA** que analiza tu ejecutable con más de 70 motores antivirus diferentes. Es muy común en repositorios de código abierto y es una excelente forma de:

- ✅ Verificar qué antivirus detectan falsos positivos
- ✅ Obtener whitelisting de múltiples proveedores
- ✅ Monitorear la reputación de tu aplicación
- ✅ Automatizar el proceso de verificación

### Configuración Rápida

#### 1. Obtener API Key (Opcional pero Recomendado)

1. Ve a https://www.virustotal.com/gui/join-us
2. Crea una cuenta gratuita
3. Ve a tu perfil → API Key
4. Copia tu API key

**Límites de la API gratuita:**
- 4 solicitudes por minuto
- 500 solicitudes por día
- Suficiente para desarrollo y releases

#### 2. Configurar API Key

**Windows PowerShell:**
```powershell
# Temporal (solo esta sesión)
$env:VIRUSTOTAL_API_KEY = "tu-api-key-aqui"

# Permanente (para el usuario)
[System.Environment]::SetEnvironmentVariable('VIRUSTOTAL_API_KEY', 'tu-api-key-aqui', 'User')
```

**Linux/Mac:**
```bash
# Temporal
export VIRUSTOTAL_API_KEY="tu-api-key-aqui"

# Permanente (agregar a ~/.bashrc o ~/.zshrc)
echo 'export VIRUSTOTAL_API_KEY="tu-api-key-aqui"' >> ~/.bashrc
```

**O crear archivo `.env` (NO subir a Git):**
```
VIRUSTOTAL_API_KEY=tu-api-key-aqui
```

### Uso Automático

#### Opción 1: Después de Build

```bash
# Build y escanear automáticamente
npm run dist:scan
```

#### Opción 2: Escanear Manualmente

```bash
# Escanear el ejecutable más reciente
npm run scan:virustotal

# O especificar archivo
node scripts/virustotal-scan.js "ruta/al/ejecutable.exe"
```

**PowerShell:**
```powershell
.\scripts\virustotal-scan.ps1
# O con archivo específico
.\scripts\virustotal-scan.ps1 "ruta\al\ejecutable.exe"
```

### Resultados

El script mostrará:

```
═══════════════════════════════════════════════════
📊 RESULTADOS DE VIRUSTOTAL
═══════════════════════════════════════════════════
   Total de motores: 70
   Detecciones: 2
   Porcentaje limpio: 97.1%

⚠️  Se detectaron falsos positivos:
   🔴 Antivirus1: Trojan.Generic
   🔴 Antivirus2: Suspicious

💡 Recomendaciones:
   1. Si es un falso positivo, contacta a los proveedores
   2. Considera obtener un certificado de código
   3. Envía a Microsoft Defender para análisis

🔗 URL completa: https://www.virustotal.com/gui/file/...
```

### Sin API Key (Método Manual)

Si no configuras la API key, el script te dará instrucciones para subir manualmente:

1. Ve a https://www.virustotal.com/gui/home/upload
2. Sube tu ejecutable
3. Espera el análisis (1-2 minutos)
4. Revisa los resultados

### Ventajas de VirusTotal

✅ **Gratis**: No requiere pago
✅ **Múltiples motores**: 70+ antivirus diferentes
✅ **Reputación**: Mejora la confianza de los usuarios
✅ **Automatizable**: Se integra en CI/CD
✅ **Historial**: Mantiene historial de análisis
✅ **Compartible**: Puedes compartir el enlace con usuarios

### Integración en CI/CD

Ejemplo para GitHub Actions:

```yaml
- name: Scan with VirusTotal
  run: |
    npm run dist
    npm run scan:virustotal
  env:
    VIRUSTOTAL_API_KEY: ${{ secrets.VIRUSTOTAL_API_KEY }}
```

### Contactar Proveedores de Antivirus

Si VirusTotal muestra falsos positivos:

1. **Identifica el antivirus** que detecta tu aplicación
2. **Visita su sitio web** de reporte de falsos positivos
3. **Envía tu ejecutable** con información sobre tu aplicación
4. **Proporciona el hash SHA256** de VirusTotal

**Enlaces útiles:**
- Windows Defender: https://www.microsoft.com/en-us/wdsi/filesubmission
- Avast: https://www.avast.com/false-positive-file-form.php
- AVG: https://www.avg.com/en-us/false-positive-file-form
- Kaspersky: https://opentip.kaspersky.com/

### Monitoreo Continuo

Puedes verificar periódicamente la reputación de tu aplicación:

```bash
# Verificar hash específico
node scripts/virustotal-scan.js --hash SHA256_HASH
```

---

## 🔐 Firma de Código (Recomendado)

**Esta es la solución MÁS EFECTIVA** para evitar falsos positivos.

### ¿Qué es la Firma de Código?

La firma de código es un certificado digital que verifica la identidad del desarrollador y garantiza que el ejecutable no ha sido modificado.

### Opciones de Certificados

#### Opción 1: Certificado Comercial (Recomendado para Producción)

**Proveedores:**
- **DigiCert**: https://www.digicert.com/code-signing/
- **Sectigo (Comodo)**: https://sectigo.com/ssl-certificates-tls/code-signing
- **GlobalSign**: https://www.globalsign.com/en/code-signing-certificate
- **Certum**: https://www.certum.eu/en/cert_offer_code_signing/

**Precio aproximado:** $200-400 USD/año

**Ventajas:**
- ✅ Máxima confianza de Windows Defender
- ✅ Reconocimiento inmediato
- ✅ Sin advertencias de "Publicador desconocido"

#### Opción 2: Certificado EV (Extended Validation)

**Precio aproximado:** $300-600 USD/año

**Ventajas:**
- ✅ Máxima confianza
- ✅ Sin advertencias de SmartScreen
- ✅ Verificación instantánea

### Configurar Firma de Código en electron-builder

Una vez que tengas el certificado (archivo `.pfx` o `.p12`):

#### 1. Guardar Certificado de Forma Segura

**Opción A: Variable de Entorno (Recomendado)**

```powershell
# En PowerShell (solo para esta sesión)
$env:CSC_LINK="C:\ruta\a\tu\certificado.pfx"
$env:CSC_KEY_PASSWORD="tu_contraseña_del_certificado"
```

**Opción B: Archivo de Configuración (No Recomendado - Inseguro)**

Crear archivo `.env` (NO subir a Git):
```
CSC_LINK=C:\ruta\a\tu\certificado.pfx
CSC_KEY_PASSWORD=tu_contraseña_del_certificado
```

#### 2. Actualizar `package.json`

```json
{
  "build": {
    "win": {
      "certificateFile": "path/to/certificate.pfx",
      "certificatePassword": "password",
      "signingHashAlgorithms": ["sha256"],
      "sign": "signtool.exe"
    }
  }
}
```

**⚠️ IMPORTANTE:** Nunca subas el certificado o contraseña a Git.

#### 3. Compilar con Firma

```bash
npm run dist
```

Electron-builder automáticamente firmará el ejecutable y el instalador.

---

## 📤 Enviar a Microsoft para Análisis

Si no puedes obtener un certificado, puedes enviar tu aplicación a Microsoft para que la analicen y la agreguen a su whitelist.

### Proceso de Envío

1. **Preparar el Ejecutable**
   ```bash
   npm run dist
   ```

2. **Subir a Windows Defender Security Intelligence**

   **URL:** https://www.microsoft.com/en-us/wdsi/filesubmission

   **Pasos:**
   - Selecciona "Submit a file for malware analysis"
   - Sube el archivo `.exe` o `.msi` generado
   - Selecciona "This file is not malware"
   - Proporciona información sobre tu aplicación
   - Espera 1-3 días hábiles para respuesta

3. **Subir a VirusTotal (Opcional)**

   **URL:** https://www.virustotal.com/

   - Sube tu ejecutable
   - Revisa qué antivirus lo detectan
   - Usa los resultados para mejorar

### Información a Proporcionar

```
Nombre de la aplicación: NodeTerm
Versión: 1.6.1
Descripción: Aplicación de terminal multiplataforma con soporte SSH, RDP, y gestión de conexiones
Sitio web: https://github.com/kalidus/NodeTerm
Tipo de aplicación: Electron/Node.js
```

---

## 🏠 Configuración Local (Desarrollo)

Para desarrollo local, puedes agregar exclusiones en Windows Defender.

### Agregar Exclusión en Windows Defender

#### Método 1: Interfaz Gráfica

1. Abre **Configuración de Windows**
2. Ve a **Privacidad y seguridad** → **Seguridad de Windows**
3. Haz clic en **Protección contra virus y amenazas**
4. Haz clic en **Administrar configuración** (bajo "Configuración de protección contra virus y amenazas")
5. Desplázate a **Exclusiones**
6. Haz clic en **Agregar o quitar exclusiones**
7. Haz clic en **Agregar una exclusión** → **Carpeta**
8. Selecciona la carpeta donde compilas (ej: `C:\Users\kalid\Documents\Cursor\NodeTerm\dist`)

#### Método 2: PowerShell (Administrador)

```powershell
# Agregar exclusión para carpeta de build
Add-MpPreference -ExclusionPath "C:\Users\kalid\Documents\Cursor\NodeTerm\dist"

# Agregar exclusión para carpeta de instaladores
Add-MpPreference -ExclusionPath "C:\Users\kalid\Documents\Cursor\NodeTerm\release"

# Ver exclusiones actuales
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath
```

#### Método 3: Política de Grupo (Solo Empresas)

Si estás en un entorno empresarial, contacta al administrador de TI para agregar exclusiones a nivel de dominio.

---

## 🎯 Mejores Prácticas

### 1. Mantener Metadatos Actualizados

Asegúrate de que `package.json` tenga:
- ✅ `author`: Tu nombre o empresa
- ✅ `description`: Descripción clara de la aplicación
- ✅ `license`: Tipo de licencia
- ✅ `repository`: URL del repositorio (si es público)

### 2. Usar Versiones Consistentes

- Incrementa el número de versión en cada release
- Usa versionado semántico (MAJOR.MINOR.PATCH)

### 3. Probar en Múltiples Sistemas

Antes de distribuir:
- ✅ Probar en Windows 10/11 limpio
- ✅ Probar con Windows Defender activo
- ✅ Probar con otros antivirus (Avast, AVG, Kaspersky)

### 4. Documentar Comportamientos Legítimos

Si tu aplicación:
- Accede a la red → Documenta por qué
- Lee/escribe archivos → Explica el propósito
- Ejecuta procesos → Justifica la necesidad

### 5. Compresión y Optimización

```json
{
  "build": {
    "compression": "maximum"
  }
}
```

Esto reduce el tamaño y puede ayudar con la detección.

### 6. Evitar Comportamientos Sospechosos

❌ **NO hacer:**
- Modificar archivos del sistema sin permiso
- Conectarse a servidores desconocidos
- Ocultar procesos o archivos
- Modificar el registro sin necesidad

✅ **SÍ hacer:**
- Pedir permisos explícitos al usuario
- Documentar todas las acciones
- Usar APIs oficiales de Electron
- Mantener código abierto cuando sea posible

---

## 🔍 Verificar Firma de Código

Para verificar si un ejecutable está firmado:

```powershell
# Verificar firma de un ejecutable
Get-AuthenticodeSignature -FilePath "NodeTerm-Setup-1.6.1.exe"

# Ver detalles del certificado
signtool verify /pa /v "NodeTerm-Setup-1.6.1.exe"
```

**Salida esperada (con firma válida):**
```
Status: Valid
SignerCertificate: [Certificado]
```

---

## 📊 Estadísticas de Falsos Positivos

Según estudios:
- **Sin firma:** ~60-80% de detecciones falsas
- **Con firma comercial:** ~5-10% de detecciones falsas
- **Con firma EV:** ~1-2% de detecciones falsas

---

## 🆘 Solución de Problemas

### Problema: "Windows Defender sigue detectando la app"

**Soluciones:**
1. Verifica que los metadatos estén completos
2. Considera obtener un certificado de código
3. Envía a Microsoft para análisis
4. Revisa si hay comportamientos sospechosos en el código

### Problema: "No puedo obtener un certificado"

**Alternativas:**
1. Usar certificados gratuitos de organizaciones de código abierto (limitados)
2. Enviar a Microsoft para whitelisting
3. Distribuir desde GitHub Releases (mayor confianza)
4. Usar Microsoft Store (requiere certificado pero Microsoft lo gestiona)

### Problema: "El certificado expiró"

**Solución:**
- Renueva el certificado antes de que expire
- Re-firma todas las versiones anteriores si es necesario
- Notifica a los usuarios sobre la renovación

---

## 📚 Recursos Adicionales

- [Documentación de electron-builder - Code Signing](https://www.electron.build/code-signing)
- [Microsoft - Code Signing Best Practices](https://docs.microsoft.com/en-us/windows/win32/seccrypto/cryptography-tools)
- [Windows Defender Submission Portal](https://www.microsoft.com/en-us/wdsi/filesubmission)
- [VirusTotal](https://www.virustotal.com/)

---

## ✅ Checklist Pre-Release

Antes de distribuir tu aplicación:

- [ ] Metadatos completos en `package.json`
- [ ] Versión actualizada
- [ ] Icono de aplicación configurado
- [ ] Certificado de código configurado (si aplica)
- [ ] Probado en Windows limpio
- [ ] Verificado con Windows Defender
- [ ] Enviado a Microsoft (si no hay certificado)
- [ ] Documentación actualizada
- [ ] Changelog actualizado

---

**Última actualización:** 2024
**Versión de NodeTerm:** 1.6.1

