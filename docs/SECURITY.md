# Seguridad, Criptografía y Empaquetado

Este documento resume la arquitectura criptográfica, la gestión del baúl de credenciales y las directrices para distribución segura en Windows.

---

## 1. Arquitectura Criptográfica del Vault

### Cifrado de Datos
- **Algoritmo**: `AES-256-GCM` con autenticación mediante auth tag.
- **Derivación de Clave (KDF)**:
  - `PBKDF2` con SHA-512 y 100.000 iteraciones (o `Argon2id` según plataforma) utilizando un salt criptográfico único por instalación generado aleatoriamente.
- **Almacenamiento Seguro**:
  - En Windows: Integración opcional con DPAPI (`safeStorage` de Electron).
  - En macOS: macOS Keychain.
  - En Linux: Secret Service API / libsecret.

### Clave Maestra y Backups
- La base de datos de conexiones, contraseñas y notas privadas reside en un fichero cifrado localmente.
- Los backups cifrados pueden exportarse protegidos por una contraseña elegida por el usuario con KDF reforzado, impidiendo la lectura directa si el archivo es trasladado a otra máquina.

---

## 2. Prevención de Falsos Positivos de Antivirus en Windows

Los ejecutables empaquetados con Electron / Node.js que ejecutan PTYs y shells locales a menudo disparan heurísticas en Windows Defender o VirusTotal. Para mitigar esto:

1. **Firma de Código (Code Signing)**:
   - Uso de certificados de firma de código en las releases de producción para construir reputación en SmartScreen.
2. **Exclusión de Binarios Sospechosos**:
   - Compilación limpia de dependencias nativas (`node-pty`) en entornos CI/CD transparentes (GitHub Actions).
3. **Metadatos del Ejecutable**:
   - `CompanyName`, `FileDescription`, `LegalCopyright` y `ProductName` completamente declarados en `electron-builder.json`.
4. **Envío de Falsos Positivos**:
   - En caso de detección por heurística genérica (`Win32/Wacatac` o similar), someter la muestra a [Microsoft Security Intelligence](https://www.microsoft.com/en-us/wdsi/filesubmission) indicando la naturaleza de cliente de terminal de código abierto.

