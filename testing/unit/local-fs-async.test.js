const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const os = require('os');

const {
  listFiles,
  createDirectory,
  deleteFile,
  renameFile,
  copyFile,
  sanitizeLocalPath
} = require('../../src/main/handlers/local-fs-handlers');

describe('H-17: Asynchronous Local FS Handlers', () => {
  const testBaseDir = path.join(os.tmpdir(), `nodeterm-fs-test-${Date.now()}`);

  before(async () => {
    await fs.promises.mkdir(testBaseDir, { recursive: true });
  });

  after(async () => {
    try {
      await fs.promises.rm(testBaseDir, { recursive: true, force: true });
    } catch (_) { }
  });

  describe('listFiles', () => {
    it('debe retornar error si el directorio no existe', async () => {
      const nonExistentPath = path.join(testBaseDir, 'no-such-directory-12345');
      const result = await listFiles(nonExistentPath);
      assert.strictEqual(result.success, false);
      assert.strictEqual(result.error, 'Directorio no encontrado');
    });

    it('debe listar archivos y carpetas de forma asíncrona con el formato esperado', async () => {
      const subDir = path.join(testBaseDir, 'subdir');
      const testFile = path.join(testBaseDir, 'sample.txt');
      await fs.promises.mkdir(subDir, { recursive: true });
      await fs.promises.writeFile(testFile, 'Hello NodeTerm FS async test');

      const result = await listFiles(testBaseDir);
      assert.strictEqual(result.success, true);
      assert.ok(Array.isArray(result.files));
      assert.ok(result.files.length >= 2);

      const dirItem = result.files.find(f => f.name === 'subdir');
      assert.ok(dirItem, 'subdir debe estar presente');
      assert.strictEqual(dirItem.type, 'directory');

      const fileItem = result.files.find(f => f.name === 'sample.txt');
      assert.ok(fileItem, 'sample.txt debe estar presente');
      assert.strictEqual(fileItem.type, 'file');
      assert.strictEqual(fileItem.size, 28);
      assert.ok(typeof fileItem.modified === 'string');
    });
  });

  describe('createDirectory, copyFile, renameFile, deleteFile', () => {
    it('debe crear un nuevo directorio de forma asíncrona', async () => {
      const newFolder = path.join(testBaseDir, 'created-folder', 'nested');
      const res = await createDirectory(newFolder);
      assert.strictEqual(res.success, true);

      const exists = fs.existsSync(newFolder);
      assert.strictEqual(exists, true);
    });

    it('debe copiar un archivo de forma asíncrona', async () => {
      const srcFile = path.join(testBaseDir, 'original.txt');
      const destFile = path.join(testBaseDir, 'copied.txt');
      await fs.promises.writeFile(srcFile, 'Async copy payload');

      const res = await copyFile(srcFile, destFile);
      assert.strictEqual(res.success, true);

      const content = await fs.promises.readFile(destFile, 'utf8');
      assert.strictEqual(content, 'Async copy payload');
    });

    it('debe renombrar un archivo de forma asíncrona', async () => {
      const srcFile = path.join(testBaseDir, 'before-rename.txt');
      const destFile = path.join(testBaseDir, 'after-rename.txt');
      await fs.promises.writeFile(srcFile, 'Renamed content');

      const res = await renameFile(srcFile, destFile);
      assert.strictEqual(res.success, true);
      assert.strictEqual(fs.existsSync(srcFile), false);
      assert.strictEqual(fs.existsSync(destFile), true);
    });

    it('debe eliminar archivos y carpetas de forma asíncrona', async () => {
      const fileToDelete = path.join(testBaseDir, 'to-delete.txt');
      const dirToDelete = path.join(testBaseDir, 'dir-to-delete');
      await fs.promises.writeFile(fileToDelete, 'bye');
      await fs.promises.mkdir(dirToDelete, { recursive: true });

      const delFileRes = await deleteFile(fileToDelete, false);
      assert.strictEqual(delFileRes.success, true);
      assert.strictEqual(fs.existsSync(fileToDelete), false);

      const delDirRes = await deleteFile(dirToDelete, true);
      assert.strictEqual(delDirRes.success, true);
      assert.strictEqual(fs.existsSync(dirToDelete), false);
    });
  });
});
