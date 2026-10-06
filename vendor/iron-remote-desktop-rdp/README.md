# Vendor: IronRDP WASM con EGFX (opt-in)

Paquete local `@devolutions/iron-remote-desktop-rdp` desde IronRDP `38b074e4`.

- **Por defecto:** sin EGFX → bitmap RLE.
- **EGFX:** opción de la conexión. RemoteFX Progressive. H.264 no se anuncia.
- **WebCodecs:** apagado. `NODETERM_RDP_WEBCODECS=1` lo enciende.
- **Diario:** `userData/logs/rdp-egfx-diag.jsonl` y `rdp-egfx-last-resize.bin`.

## Versión

`0.7.0-nodeterm-egfx.14`

## Regenerar

```powershell
.\scripts\build-ironrdp-wasm.ps1
```

## Kill-switch npm 0.7.0

```powershell
npm run ironrdp:wasm:npm
npm install
```

## Nota sobre pantalla negra / framing DynVC

El bridge ahora hace **passthrough de fragmentos CHANNEL_PDU** en `drdynvc`
cuando WASM declara DynVC (CREATE ajenos como Audio siguen en reject 0 ms).
Los Cmd MS-RDPEDYC están alineados: Create REQ/RSP=`0x01`, DataFirst=`0x02`,
Data=`0x03`, Close=`0x04` (antes DataFirst se confundía con CREATE_RSP).
Sin eso, Middle/Last o DataFirst mal clasificados dejaban ZGFX/GFX basura
(`skipping undecodable GFX PDU`, remaining≈1590).

RFX progressive: si un TILE_UPGRADE falla (`MissingTerminator` SRL), el WASM
hace **soft-fail** (skip frame) en lugar de tumbar la sesión.

Smoke opt-in: `localStorage.setItem('NODETERM_RDP_EGFX', '1')` +
`NODETERM_RDP_DEBUG=1`, reconectar directo (p.ej. 192.168.10.52). Esperado:
escritorio visible, logs `[Bridge] DynVC->WASM` con frag F/L, sin tumbar por RFX.
