# Cygwin portable en NodeTerm (instalacion bajo demanda)

Cygwin **no** se incluye en el instalador de NodeTerm. Se instala desde **Ajustes > Apps > Cygwin** usando el setup oficial de [cygwin.com](https://cygwin.com/).

## Flujo de usuario

1. Instalar NodeTerm (sin Cygwin embebido).
2. Abrir **Ajustes > Apps > Cygwin**.
3. Elegir nivel: **Minimal**, **Medium** (recomendado) o **Full**.
4. Instalar: descarga `setup-x86_64.exe` y paquetes desde el mirror oficial.
5. Destino: `%APPDATA%\nodeterm\cygwin64`.

## Niveles

| Tier | Contenido | Tamano aprox. |
|------|-----------|---------------|
| Minimal | bash, coreutils, grep, sed, gawk, findutils, which, less, ncurses | ~50-100 MB |
| Medium | Minimal + wget, curl, git, openssh, vim, nano, tar, rsync, zip... | ~150-300 MB |
| Full | Medium + gcc, g++, make, cmake, autoconf, binutils... | ~500-800 MB |

## Arquitectura

| Pieza | Rol |
|-------|-----|
| `CygwinDownloader.js` | Descarga setup oficial, ejecuta instalacion quiet, meta de tier |
| `CygwinService.js` | Detecta AppData (prod) o `resources/cygwin64` (dev) |
| `AppsTab.js` | UI con selector de nivel + progreso |
| IPC | `cygwin:detect`, `cygwin:install` `{ tier }`, `cygwin:uninstall`, `cygwin:install-status` |

Mirror por defecto: `https://mirrors.kernel.org/sourceware/cygwin/`

## Desarrollo local (opcional)

Para generar un arbol en `resources/cygwin64` (fallback en dev):

```powershell
.\scripts\create-cygwin-portable.ps1
```

## Notas

- La primera instalacion requiere internet y puede tardar varios minutos (sobre todo Full).
- Desinstalar desde Apps borra `%APPDATA%\nodeterm\cygwin64`.
- Ya no se usa un ZIP en GitHub Releases para la instalacion del usuario.
