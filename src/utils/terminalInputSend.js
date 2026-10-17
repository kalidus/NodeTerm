/**
 * Envío de input de terminal estilo clientes modernos:
 * - tecla suelta: IPC inmediato
 * - paste/ráfaga: un solo IPC (xterm ya entrega el paste en uno o pocos onData)
 * - sin setState en el hot path
 */

/**
 * @param {(payload: { tabId: string, data: string }) => void} sendSshData
 * @param {string} tabId
 * @param {string} data
 */
export function sendSshUserInput(sendSshData, tabId, data) {
  if (!data || !tabId || typeof sendSshData !== 'function') return;
  sendSshData({ tabId, data });
}

/**
 * @param {(channel: string, data: string) => void} sendChannel
 * @param {string} channel
 * @param {string} data
 */
export function sendPtyUserInput(sendChannel, channel, data) {
  if (!data || !channel || typeof sendChannel !== 'function') return;
  sendChannel(channel, data);
}

/**
 * Diferir trabajo no crítico (broadcast) fuera del hot path de tipado.
 */
export function deferNonCritical(fn) {
  if (typeof fn !== 'function') return;
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(fn);
  } else {
    setTimeout(fn, 0);
  }
}
