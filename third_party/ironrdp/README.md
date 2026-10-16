# IronRDP NodeTerm (`third_party/ironrdp`)

Todo el material IronRDP custom de NodeTerm vive aquí (no en `src/`).

```
third_party/ironrdp/
  wasm/       Paquete npm congelado (runtime / releases)
  patches/    Parches para regenerar el WASM (mantenimiento)
```

## Runtime (producción)

El binario empaquetado es [`wasm/`](wasm/). Releases y CI solo hacen `npm ci` + webpack + electron-builder.

Dependencia raíz:

```json
"@devolutions/iron-remote-desktop-rdp": "file:third_party/ironrdp/wasm"
```

Versión actual: ver `wasm/package.json` (`0.7.0-nodeterm-egfx.*`).

## Regenerar / upgrade

Ver detalles en [`wasm/README.md`](wasm/README.md). Resumen:

1. Actualizar `$Commit` en `scripts/build-ironrdp-wasm.ps1` si cambia upstream.
2. Aplicar `patches/*.patch` (rebase si hace falta).
3. `npm run ironrdp:wasm:build` → escribe en `wasm/`.
4. Bump versión + `npm run ironrdp:wasm:measure:vendor` + tests RDP.
