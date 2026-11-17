const os = require('os');
const path = require('path');
const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

function getDefaultAgyBinaryCandidates() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      path.join(localAppData, 'agy', 'bin', 'agy.exe'),
      path.join(localAppData, 'agy', 'bin', 'agy.cmd')
    ];
  }
  return [
    path.join(home, '.local', 'bin', 'agy'),
    path.join(home, '.agy', 'bin', 'agy')
  ];
}

const antigravityCli = createAiCliHandler({
  channelPrefix: 'antigravitycli',
  configFileName: 'antigravitycli-config.json',
  binaryNamesWin: ['agy.cmd', 'agy.exe', 'agy', 'antigravity.cmd', 'antigravity.exe', 'antigravity'],
  binaryNamesUnix: ['agy', 'antigravity'],
  installPs1Url: 'https://antigravity.google/cli/install.ps1',
  installShUrl: 'https://antigravity.google/cli/install.sh',
  installScriptBasename: 'antigravity-install',
  getDefaultBinaryCandidates: getDefaultAgyBinaryCandidates,
  persistDiscoveredPath: true,
  uninstallMessage:
    'Antigravity CLI no ofrece desinstalación automática desde NodeTerm. ' +
    'Elimina el binario manualmente o consulta https://antigravity.google/docs/cli-features'
});

module.exports = {
  registerAntigravityCliHandlers: antigravityCli.registerHandlers,
  getAntigravityCliConfig: antigravityCli.getConfig
};
