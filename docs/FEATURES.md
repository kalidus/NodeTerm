# Funcionalidades Principales de NodeTerm

Resumen de las características clave del ecosistema de NodeTerm.

---

## 1. Importación y Exportación de Sesiones

NodeTerm soporta migración y respaldo de conexiones desde múltiples orígenes:
- **Formatos nativos**: Exportación e importación en formato JSON cifrado o plano.
- **Importadores de terceros**:
  - PuTTY / KiTTY (claves de registro de Windows / sesiones guardadas).
  - MobaXterm (ficheros `.mxtpro` / `.ini`).
  - SecureCRT (carpetas de configuración XML/INI).
  - OpenSSH config (`~/.ssh/config`).

---

## 2. Auditoría y Grabación de Sesiones

- **Formato Asciinema**: Grabación nativa de sesiones de terminal en formato compatible con asciinema v2 (`.cast`).
- **Reproducción integrada**: Visor de grabaciones integrado para auditar comandos ejecutados y respuestas en tiempo real.
- **Exportación**: Facilidad de exportar grabaciones para análisis forense o documentación técnica.

---

## 3. Detección Inteligente de Archivos y Rutas

- Detección automática en pantalla de:
  - Rutas de ficheros absolutas y relativas.
  - Enlaces HTTP/HTTPS interactivos (click para abrir en navegador por defecto).
  - Hashes, IPs y direcciones MAC para copiado rápido o acciones contextuales.

---

## 4. Tipografías y Personalización Visual

- Soporte nativo para fuentes modernas con ligaduras de código y Nerd Fonts (Fira Code, JetBrains Mono, Cascadia Code, MesloLGS NF).
- Múltiples temas integrados (Dark+, OneDark, Dracula, Nord, Monokai, Light).
- Quick Appearance Panel para cambiar fuente, tamaño, tema y opacidad en caliente sin reiniciar la aplicación.

---

## 5. Internacionalización (i18n)

- Arquitectura de localización basada en diccionarios JSON modulares (`src/i18n/`).
- Detección automática del idioma del sistema operativo con opción de selector manual en ajustes.

