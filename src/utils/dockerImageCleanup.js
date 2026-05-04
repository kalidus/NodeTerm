const util = require('util');
const { exec } = require('child_process');

const execAsync = util.promisify(exec);

/**
 * Tras `docker pull`, el tag apunta a la imagen nueva y la anterior suele quedar como `<none>`.
 * Elimina la imagen sustituida por ID solo si ya no es la que lleva el tag (y no es la misma digest).
 * Debe llamarse cuando el contenedor que usaba la imagen anterior ya no existe (p. ej. tras `rm`).
 *
 * @param {(args: string) => string} buildDockerCommand - p. ej. this.buildDockerCommand.bind(this)
 * @param {string} imageName - referencia con tag usada en pull
 * @param {string|null|undefined} imageIdBeforePull - salida de `image inspect` antes del pull
 */
async function removeReplacedImageAfterUpdate(buildDockerCommand, imageName, imageIdBeforePull) {
  if (!imageIdBeforePull || !imageName) return;
  let idNow;
  try {
    const { stdout } = await execAsync(buildDockerCommand(`image inspect ${imageName} --format "{{.Id}}"`));
    idNow = stdout.trim();
  } catch (_) {
    return;
  }
  if (!idNow || imageIdBeforePull === idNow) return;
  try {
    await execAsync(buildDockerCommand(`rmi ${imageIdBeforePull}`));
  } catch (_) {
    // Otro contenedor, capas compartidas o ya eliminada
  }
}

module.exports = { removeReplacedImageAfterUpdate };
