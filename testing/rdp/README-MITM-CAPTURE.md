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

En `rdp-flags.json`:

```json
{
  "NODETERM_RDP_TRACE": "1",
  "NODETERM_RDP_SELECTOR_STRIP_CLIPRDR_RDPDR": "0"
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

## 4. Criterios de éxito NodeTerm

1. `csNet` empieza por `rdpdr,rdpsnd,cliprdr`
2. Cliprdr: CAPS débil diferido → tras hop CAPS con file-clip (`0x3e`) + FORMAT/LOCK
3. Portapapeles texto ida y vuelta OK
4. Cold-start no peor que mstsc (~20s burst Session Probe)
