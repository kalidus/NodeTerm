# Vendor: IronRDP WASM con EGFX + RDPSND audio (opt-in)

Paquete local `@devolutions/iron-remote-desktop-rdp` desde IronRDP `38b074e4`.

- **Por defecto:** sin EGFX → bitmap RLE; sin audio → `NO_AUDIO_PLAYBACK`.
- **EGFX:** opción de la conexión. Con WebCodecs se anuncia **V10.6** (como mstsc; AVC444 disponible).
- **WebCodecs:** decodifica AVC444/AVC420 → framebuffer/GPU. FrameAcknowledge inmediato. `NODETERM_RDP_WEBCODECS=0` lo apaga.
- **Soft-Sync/UDP:** anunciado como mstsc; el socket lo abre Electron.
- **Audio RDPSND:** `rdpsndAudio(true)` + `setRdpsndWaveCallback` → PCM a Web Audio.
  - Canal estático `rdpsnd` siempre (con audio ON).
  - `AUDIO_PLAYBACK_DVC` solo con DisplayControl (bitmap). **Con EGFX no** (Graphics comparte DynVC; audio por estático).
  - **Audio no crea DynVC solo.**
- **Diario:** `userData/logs/rdp-egfx-diag.jsonl` y `rdp-egfx-last-resize.bin`.

## Versión

`0.7.0-nodeterm-egfx.37`

## Regenerar

```powershell
.\scripts\build-ironrdp-wasm.ps1
```

## Kill-switch npm 0.7.0

```powershell
npm run ironrdp:wasm:npm
npm install
```

## Nota DynVC

Passthrough de fragmentos CHANNEL_PDU en `drdynvc` cuando WASM declara DynVC.
`AUDIO_PLAYBACK_DVC` se reenvía solo si WASM anunció `rdpsnd` (audio opt-in) y ya hay `drdynvc`.
