# Captura MITM mstsc vs NodeTerm (selector Wallix)

## Baseline mstsc (ya validado)

Tras MITM opaco + parche `SC_CORE.clientRequestedProtocols`:

| Trace | Rol |
|-------|-----|
| `traces/mstsc-selector-frio-ok.jsonl` | Selector en frío hasta escritorio |
| `traces/mstsc-selector-clipboard.jsonl` | Mismo path + portapapeles bidireccional |

**CS_NET nativo mstsc:** `[rdpdr, rdpsnd, cliprdr, drdynvc]` (cliprdr ≈ MCS 1006).

**Cliprdr:** CAPS `0x2` + READY en menú → tras hop CAPS `0x3e` + READY + LOCK/UNLOCK + FORMAT_LIST.

**Hueco ~11s DynVC / ~20s burst gráfico:** Session Probe Wallix (también en mstsc; no se elimina quitando canales).

NodeTerm alinea el inject por defecto a ese orden (`RDP_INJECTED_CHANNELS = { before: ['rdpdr','rdpsnd'] }`). El stub `rdp-rdpdr.js` cierra el Device List en 0 ms.

## 1. Captura mstsc

```powershell
node testing/rdp/mitm-capture.js --out testing/rdp/traces/mstsc-selector-frio.jsonl
```

El script genera `testing/rdp/wallix-selector-mitm.rdp`. Ábrelo con mstsc (o apunta mstsc a `127.0.0.1:3390`).

- Acepta el aviso del certificado autofirmado.
- CredSSP anunciado (`enablecredsspsupport:i:1`); el MITM fuerza **SSL only** hacia Wallix y restaura `clientRequestedProtocols` en SC_CORE.
- `negotiate security layer:i:1`, `redirectclipboard:i:1`.
- Ajusta el `username` a tu cadena Wallix de **selector** (sin `:APP:` / `:RDP:`).
- Entra al menú, elige destino, prueba copy/paste si es captura clipboard, cierra.

## 2. Captura NodeTerm

`NODETERM_RDP_TRACE` es solo para capturas A/B (no uso diario). En `rdp-flags.json` (gitignored; vacío `{}` en normal):

```json
{
  "NODETERM_RDP_TRACE": "1"
}
```

Reinicia `npm run dev`, misma conexión selector en frío, mismo destino, copy/paste bidireccional, cierra.

En consola: `[Bridge] PDU trace ON -> testing/rdp/traces/nodeterm-...jsonl`

Comprueba en el log de MCS: `CS_NET=[rdpdr,rdpsnd,cliprdr,...]`.

## 3. Diff

```powershell
node testing/rdp/trace-diff.js testing/rdp/traces/mstsc-selector-frio-ok.jsonl testing/rdp/traces/nodeterm-....jsonl
```

Compara CS_NET, hueco post-banner y diálogo cliprdr. Si NodeTerm no empieza por `rdpdr,rdpsnd,cliprdr`, el script sale con código 2.

Gate unitario (sin sesión live):

```powershell
node --test testing/rdp/mstsc-baseline-align.test.js testing/rdp/cs-net-inject.test.js
```

## 3b. Trazas de cable fieles (NodeTerm)

Con `NODETERM_RDP_TRACE=1` el bridge escribe:

| `dir` | Significado |
|-------|-------------|
| `s2c` | CABLE: lo que envia Wallix, antes de cualquier filtro/stub (comparable con mstsc MITM) |
| `c2s` | CABLE: todo lo que sale hacia Wallix; `src=client` (reenvio del WASM) o `synth` (stubs/joins del bridge). Input FastPath como `tipo=FastPath INPUT` |
| `s2c-wasm` | Lo que ve el WASM tras el filtro (rewrites/remaps/drops) |
| `c2s-wasm` | Lo que envia el WASM antes del filtro |

Los primeros 40 frames de cada direccion (y todo CS_NET) llevan `hex` completo ademas de `hex64`.
`node testing/rdp/trace-diff.js mstsc.jsonl nodeterm.jsonl` imprime hitos por canal, generaciones cliprdr y input -> rafaga.

## 3c. Matriz de capturas (Fase 1)

Guardar en `testing/rdp/traces/matrix/` con el nombre `<cliente>-<escenario>-<estado>-<n>.jsonl`:

- cliente: `mstsc` (via `mitm-capture.js --out ...`) o `nodeterm` (`NODETERM_RDP_TRACE_FILE=<ruta>` en `rdp-flags.json`)
- escenario: `selector` (usuario sin `:APP:`/`:RDP:`), `rdp` (`:RDP:`), `app` (`:APP:`)
- estado: `frio` (primera sesion tras arrancar) o `solape` (con otra sesion bastion abierta)
- n: 1..3 repeticiones, mismo bastion y destino

En cada captura: esperar al banner, pulsar el banner, esperar al escritorio, marcar "Portapapeles" en el dialogo Wallix, copiar/pegar en ambos sentidos, cerrar.

Informe: `node testing/rdp/matrix-report.js` (exit 2 si hay diferencias de canal/cliprdr o falta un lado).

## 4. Criterios de éxito NodeTerm

1. `csNet` empieza por `rdpdr,rdpsnd,cliprdr`
2. Cliprdr: CAPS débil diferido → tras hop CAPS con file-clip (`0x3e`) + FORMAT/LOCK
3. Portapapeles texto ida y vuelta OK
4. Cold-start no peor que mstsc (~20s burst Session Probe)

## 3d. Capa de canales `virtual` y A/B de latencia (Fases 3-6)

Flag: `NODETERM_RDP_CHANNELS=virtual|legacy` (env o `rdp-flags.json`; **default `virtual`**).

- `virtual` (default): CS_NET = mstsc en los 3 escenarios (APP sin `rail`); SC_NET recortado al WASM con IDs
  reales por nombre tambien en bastion; el bridge hace los Channel Join de rdpdr/rdpsnd al llegar el
  Attach User Confirm y absorbe sus Join Confirm. Log de arranque: `[Bridge] Capa de canales: virtual`.
- Kill-switch: `NODETERM_RDP_CHANNELS=legacy` (env o `rdp-flags.json`) restaura zip por indice + heuristicas.
- A/B: capturar cada escenario (selector / rdp / app, frio y solape) con `legacy` y con `virtual`
  (`NODETERM_RDP_TRACE=1`), copiar a `traces/matrix/nodeterm-<escenario>-<frio|solape>-<n>.jsonl` y
  ejecutar `node testing/rdp/matrix-report.js`. Hitos a mirar: `inputToBurst` (clic banner -> escritorio),
  gen1/gen2 cliprdr y `clientAnswerMs`. `node testing/rdp/handshake-diff.js <mstsc> <nodeterm>` compara
  CS_CORE/CS_NET del Connect Initial (requiere trazas nuevas con `hex` completo).
