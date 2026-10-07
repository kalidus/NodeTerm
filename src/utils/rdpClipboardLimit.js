'use strict';

/**
 * El puente cierra el WebSocket con el codigo 1009 si un mensaje supera 64 MB.
 * CLIPRDR envia el texto en UTF-16, asi que el tope en caracteres queda muy
 * por debajo: un portapapeles enorme no puede llevarse la sesion por delante.
 * Los ficheros no usan este tope: van por trozos de 64 KB.
 */
const RDP_CLIPBOARD_TEXT_MAX_CHARS = 1024 * 1024;

function clipRdpClipboardText(text) {
  const value = typeof text === 'string' ? text : '';
  if (value.length <= RDP_CLIPBOARD_TEXT_MAX_CHARS) {
    return { text: value, dropped: false, length: value.length };
  }
  return { text: '', dropped: true, length: value.length };
}

module.exports = {
  clipRdpClipboardText,
  RDP_CLIPBOARD_TEXT_MAX_CHARS
};
