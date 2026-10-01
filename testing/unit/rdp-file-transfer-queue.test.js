'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  createPendingDownloadId,
  seedPendingDownloads,
  activatePendingDownload,
  applyDownloadProgress,
  cancelTransferEntry,
  discardPendingDownloads,
  shouldAcceptCompletion,
  listPendingDownloadIds,
  hasFileTransferWork,
  getTransferOverlayHeader,
  formatTransferSize,
  isDownloadableFile,
  abortProviderDownload,
  installDownloadAbortGuard
} = require('../../src/utils/rdpFileTransferQueue');

function isoFile(name, size) {
  return { name, size, lastModified: 0 };
}

describe('Cola de transferencias Iron RDP', () => {
  it('copiar 2 ISO solo siembra pendientes y no marca active', () => {
    const files = [
      isoFile('bastion-12.0.0.17.iso', 4 * 1024 * 1024 * 1024),
      isoFile('bastion-12.0.0.17-copy.iso', 4 * 1024 * 1024 * 1024)
    ];
    const next = seedPendingDownloads({}, files);
    const ids = listPendingDownloadIds(next);
    assert.equal(ids.length, 2);
    assert.equal(ids[0], createPendingDownloadId(0));
    assert.equal(next[ids[0]].status, 'pending');
    assert.equal(next[ids[1]].status, 'pending');
    assert.equal(next[ids[0]].type, 'download');
    assert.ok(!Object.values(next).some((entry) => entry.status === 'active'));
    assert.equal(getTransferOverlayHeader(next).headerLabel, 'Archivos listos para descargar');
  });

  it('descargar uno no arranca el otro', () => {
    const files = [isoFile('a.iso', 100), isoFile('b.iso', 200)];
    const seeded = seedPendingDownloads({}, files);
    const firstId = createPendingDownloadId(0);
    const secondId = createPendingDownloadId(1);
    const next = activatePendingDownload(seeded, firstId, 41);
    assert.equal(next[41].status, 'active');
    assert.equal(next[41].name, 'a.iso');
    assert.equal(next[secondId].status, 'pending');
    assert.equal(next[secondId].name, 'b.iso');
    assert.equal(listPendingDownloadIds(next).length, 1);
    assert.ok(!next[firstId]);
  });

  it('descartar pendiente no genera start ni transferId activo', () => {
    const files = [isoFile('a.iso', 100), isoFile('b.iso', 200)];
    const seeded = seedPendingDownloads({}, files);
    const aborted = new Set();
    const firstId = createPendingDownloadId(0);
    const next = cancelTransferEntry(seeded, firstId, aborted);
    assert.ok(!next[firstId]);
    assert.equal(aborted.size, 0);
    assert.equal(listPendingDownloadIds(next).length, 1);
    assert.ok(!Object.values(next).some((entry) => entry.status === 'active'));
  });

  it('completion de un transferId abortado no se acepta', () => {
    const aborted = new Set();
    const files = [isoFile('a.iso', 100)];
    const seeded = seedPendingDownloads({}, files);
    const pendingId = createPendingDownloadId(0);
    const started = activatePendingDownload(seeded, pendingId, 77);
    const afterCancel = cancelTransferEntry(started, 77, aborted);
    assert.ok(!afterCancel[77]);
    assert.ok(aborted.has(77));
    assert.equal(shouldAcceptCompletion(aborted, 77), false);
    assert.equal(shouldAcceptCompletion(aborted, 78), true);
    const progressed = applyDownloadProgress(afterCancel, {
      transferId: 77,
      fileName: 'a.iso',
      percentage: 40
    }, aborted);
    assert.deepEqual(progressed, afterCancel);
  });

  it('ignora directorios y reemplaza pendientes al copiar de nuevo', () => {
    const first = seedPendingDownloads({}, [
      isoFile('old.iso', 10),
      { name: 'folder', size: 0, isDirectory: true, lastModified: 0 }
    ]);
    assert.equal(listPendingDownloadIds(first).length, 1);
    assert.equal(isDownloadableFile({ name: 'folder', isDirectory: true }), false);

    const withActive = activatePendingDownload(first, createPendingDownloadId(0), 9);
    const second = seedPendingDownloads(withActive, [isoFile('new.iso', 20)]);
    assert.equal(second[9].status, 'active');
    assert.equal(second[createPendingDownloadId(0)].name, 'new.iso');
    assert.equal(second[createPendingDownloadId(0)].status, 'pending');
  });

  it('Descartar todos quita pendientes y deja el resto', () => {
    const seeded = seedPendingDownloads({
      3: { name: 'up.txt', type: 'upload', status: 'ready', percentage: 0 }
    }, [isoFile('a.iso', 1), isoFile('b.iso', 2)]);
    const next = discardPendingDownloads(seeded);
    assert.equal(listPendingDownloadIds(next).length, 0);
    assert.equal(next[3].status, 'ready');
    assert.equal(hasFileTransferWork(next), true);
    assert.equal(hasFileTransferWork(discardPendingDownloads({
      [createPendingDownloadId(0)]: { type: 'download', status: 'pending' }
    })), false);
  });

  it('cancelar con id string no revive el progreso numerico', () => {
    const files = [isoFile('a.iso', 100)];
    const seeded = seedPendingDownloads({}, files);
    const started = activatePendingDownload(seeded, createPendingDownloadId(0), 77);
    const aborted = new Set();
    const afterCancel = cancelTransferEntry(started, '77', aborted);
    assert.equal(shouldAcceptCompletion(aborted, 77), false);
    assert.equal(shouldAcceptCompletion(aborted, '77'), false);
    const progressed = applyDownloadProgress(afterCancel, {
      transferId: 77,
      fileName: 'a.iso',
      percentage: 55
    }, aborted);
    assert.ok(!progressed[77]);
    assert.ok(!progressed['77']);
  });

  it('abortProviderDownload corta el stream del provider', () => {
    const rejected = [];
    const provider = {
      activeDownloads: new Map([
        [5, { chunks: [1], reject: (err) => rejected.push(err.message) }]
      ])
    };
    assert.equal(abortProviderDownload(provider, '5'), true);
    assert.equal(provider.activeDownloads.size, 0);
    assert.equal(rejected[0], 'Transferencia cancelada');
  });

  it('el guard de CLIPRDR no pide mas chunks si esta abortado', () => {
    let called = false;
    const provider = {
      activeDownloads: new Map(),
      handleFileContentsResponse() { called = true; }
    };
    const aborted = new Set(['3']);
    installDownloadAbortGuard(provider, aborted);
    provider.handleFileContentsResponse({ streamId: 3 });
    assert.equal(called, false);
  });

  it('formatea tamanos y cabeceras de overlay', () => {
    assert.equal(formatTransferSize(0), '');
    assert.equal(formatTransferSize(512), '512 B');
    assert.ok(formatTransferSize(5 * 1024 * 1024 * 1024).includes('GB'));
    const pasting = getTransferOverlayHeader({
      1: { status: 'pasting', type: 'upload' }
    });
    assert.equal(pasting.headerLabel, 'Pegando en el remoto');
    const ready = getTransferOverlayHeader({
      1: { status: 'ready', type: 'upload' }
    });
    assert.equal(ready.headerLabel, 'Listo para pegar');
  });
});
