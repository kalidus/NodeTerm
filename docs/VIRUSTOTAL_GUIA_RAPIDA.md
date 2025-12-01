# 🛡️ Guía Rápida: VirusTotal

## ¿Qué es VirusTotal?

VirusTotal es un servicio **GRATUITO** que analiza archivos con más de 70 motores antivirus diferentes. Es la herramienta más usada en proyectos de código abierto para verificar falsos positivos.

## 🚀 Uso Rápido

### 1. Sin API Key (Más Simple)

```bash
# Build y escanear
npm run dist:scan
```

El script te dará instrucciones para subir manualmente a VirusTotal.

### 2. Con API Key (Automático)

#### Obtener API Key (Gratis)

1. Ve a: https://www.virustotal.com/gui/join-us
2. Crea cuenta gratuita
3. Perfil → API Key → Copiar

#### Configurar API Key

**Windows PowerShell:**
```powershell
$env:VIRUSTOTAL_API_KEY = "tu-api-key"
```

**Linux/Mac:**
```bash
export VIRUSTOTAL_API_KEY="tu-api-key"
```

#### Usar

```bash
npm run dist:scan
```

## 📊 Interpretar Resultados

### ✅ Archivo Limpio
```
Total de motores: 70
Detecciones: 0
Porcentaje limpio: 100%
```
**Significado:** Ningún antivirus detectó amenazas. ✅ Perfecto.

### ⚠️ Falsos Positivos
```
Total de motores: 70
Detecciones: 2
Porcentaje limpio: 97.1%

🔴 Antivirus1: Trojan.Generic
🔴 Antivirus2: Suspicious
```
**Significado:** Algunos antivirus detectaron falsos positivos. Esto es común en aplicaciones Electron sin firma de código.

**Qué hacer:**
1. Si es < 5% de detecciones → Normal, no preocuparse
2. Si es > 10% → Considerar obtener certificado de código
3. Contactar a los proveedores que detectan falsos positivos

## 🔗 Compartir Resultados

Cada análisis genera una URL única que puedes compartir:

```
https://www.virustotal.com/gui/file/[hash]
```

**Úsalo para:**
- ✅ Mostrar a usuarios que tu app es segura
- ✅ Incluir en README.md
- ✅ Compartir en issues de GitHub
- ✅ Enviar a proveedores de antivirus

## 📝 Ejemplo de Uso en README

```markdown
## 🛡️ Seguridad

Esta aplicación ha sido verificada con VirusTotal:

[![VirusTotal](https://img.shields.io/badge/VirusTotal-Clean-green)](https://www.virustotal.com/gui/file/[hash])

- ✅ 0/70 detecciones
- ✅ 100% limpio
```

## 🔄 Automatización

### GitHub Actions

```yaml
- name: Build and Scan
  run: |
    npm run dist:scan
  env:
    VIRUSTOTAL_API_KEY: ${{ secrets.VIRUSTOTAL_API_KEY }}
```

### Pre-commit Hook

Agregar a `.git/hooks/pre-push`:

```bash
#!/bin/bash
npm run scan:virustotal || exit 1
```

## 💡 Tips

1. **Escanea siempre antes de release** - Detecta problemas temprano
2. **Comparte resultados** - Aumenta confianza de usuarios
3. **Monitorea cambios** - Si nuevas versiones tienen más detecciones, investiga
4. **Contacta proveedores** - Si hay falsos positivos consistentes, reporta

## 🆘 Problemas Comunes

### "Archivo demasiado grande"
- Límite: 32MB
- Solución: Usa la API para archivos grandes o sube manualmente

### "API rate limit exceeded"
- Límite: 4 solicitudes/minuto, 500/día
- Solución: Espera o usa cuenta premium

### "No se encontró ejecutable"
- Solución: Ejecuta `npm run dist` primero

## 📚 Más Información

- [Documentación Completa](./PREVENIR_DETECCION_VIRUS_WINDOWS.md)
- [VirusTotal Website](https://www.virustotal.com)
- [VirusTotal API Docs](https://developers.virustotal.com/reference)

