# Vendor WASM: IronRDP EGFX + RDPSND (opt-in)

Paquete local `@devolutions/iron-remote-desktop-rdp` desde IronRDP `38b074e4`.

Ubicación: `third_party/ironrdp/wasm/` (antes `vendor/iron-remote-desktop-rdp`).

## Contrato de freeze (producción)

Este directorio **es el binario empaquetado**. Releases y CI solo hacen `npm ci` + webpack + electron-builder; **no** clonan IronRDP, **no** aplican `third_party/ironrdp/patches` y **no** ejecutan `wasm-pack`.

Contenido runtime:

- `iron-remote-desktop-rdp.js` — glue JS (sin WASM embebido)
- `iron-remote-desktop-rdp_bg.wasm` — módulo WASM binario (~4.9 MB)
- `index.d.ts`, `package.json`

Vite en library mode inlinea el `.wasm` como data URL; tras cada `ironrdp:wasm:build`, `scripts/extract-ironrdp-wasm.js` lo extrae a fichero hermano. En Electron, `build.asarUnpack` incluye `**/*.wasm`.

Dependencia raíz (obligatoria):

```json
"@devolutions/iron-remote-desktop-rdp": "file:third_party/ironrdp/wasm"
```

## Capacidades

- **Por defecto:** sin EGFX → bitmap RLE; sin audio → `NO_AUDIO_PLAYBACK`.
- **EGFX:** opción de la conexión. Con WebCodecs se anuncia hasta **V10.7** + `SMALL_CACHE`, **sin** `AVC_THINCLIENT`.
- **WebCodecs:** decodifica AVC444/AVC420 → framebuffer/GPU. FrameAcknowledge inmediato. `NODETERM_RDP_WEBCODECS=0` lo apaga.
- **Soft-Sync/UDP:** anunciado como mstsc; el socket lo abre Electron.
- **Audio RDPSND:** `rdpsndAudio(true)` + `setRdpsndWaveCallback` → PCM a Web Audio.
  - Canal estático `rdpsnd` siempre (con audio ON).
  - `AUDIO_PLAYBACK_DVC` solo con DisplayControl (bitmap). **Con EGFX no** (Graphics comparte DynVC; audio por estático).
  - **Audio no crea DynVC solo.**
- **Diario:** `userData/logs/rdp-egfx-diag.jsonl` y `rdp-egfx-last-resize.bin`.

## Versión

`0.7.0-nodeterm-egfx.41`

## Regenerar (mantenimiento raro)

Solo cuando cambiéis el patch NodeTerm **sobre el mismo** commit upstream:

```powershell
npm run ironrdp:wasm:build
```

El script ya ejecuta `extract-ironrdp-wasm.js` al final. Luego bump del sufijo (`egfx.39`, …) si hace falta, `npm run ironrdp:wasm:measure:vendor` y commit de `wasm/` (JS + `.wasm`).

## Upgrade a un IronRDP upstream nuevo

1. Elegir commit/tag en Devolutions/IronRDP.
2. Actualizar `$Commit` en `scripts/build-ironrdp-wasm.ps1`.
3. Checkout limpio en `IRONRDP_SRC` (por defecto `../IronRDP`).
4. Aplicar `third_party/ironrdp/patches/egfx-nodeterm.patch` (si falla, rebasear el patch sobre el árbol nuevo).
5. `npm run ironrdp:wasm:build` → regenera este directorio.
6. Bump versión (`0.7.0-nodeterm-egfx.N` o base nueva + `nodeterm-egfx.1`).
7. Validar: `npm run ironrdp:wasm:measure:vendor`, `npm run test:rdp`, smoke EGFX/audio.
8. Commit de `wasm/` + `patches/` + lockfile.

No uséis el paquete npm oficial como atajo de producción: pierde EGFX/rdpsnd NodeTerm.

## Comparación puntual con npm oficial (no producción)

```powershell
npm run ironrdp:wasm:npm
npm install
```

Restaurar vendor:

```powershell
npm run ironrdp:wasm:vendor
npm install
```

## Nota DynVC

Passthrough de fragmentos CHANNEL_PDU en `drdynvc` cuando WASM declara DynVC.
`AUDIO_PLAYBACK_DVC` se reenvía solo si WASM anunció `rdpsnd` (audio opt-in) y ya hay `drdynvc`.
