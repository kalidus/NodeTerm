const os = require('os');
const path = require('path');
const { createAiCliHandler } = require('../utils/ai-cli-handler-factory');

function getDefaultHermesBinaryCandidates() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
    return [
      path.join(localAppData, 'hermes', 'bin', 'hermes.exe'),
      path.join(localAppData, 'hermes', 'bin', 'hermes.cmd')
    ];
  }
  return [
    path.join(home, '.local', 'bin', 'hermes'),
    path.join(home, '.hermes', 'bin', 'hermes')
  ];
}

const hermesCli = createAiCliHandler({
  channelPrefix: 'hermescli',
  configFileName: 'hermescli-config.json',
  binaryNamesWin: ['hermes.exe', 'hermes.cmd', 'hermes'],
  binaryNamesUnix: ['hermes'],
  installPs1Url: 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.ps1',
  installShUrl: 'https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh',
  installScriptBasename: 'hermes-install',
  getDefaultBinaryCandidates: getDefaultHermesBinaryCandidates,
  persistDiscoveredPath: true,
  uninstallMessage:
    'Hermes CLI no ofrece desinstalación automática desde NodeTerm. ' +
    'Elimina el directorio %LOCALAPPDATA%\\hermes manualmente o consulta https://hermes-agent.org/es/'
});

module.exports = {
  registerHermesCliHandlers: hermesCli.registerHandlers,
  getHermesCliConfig: hermesCli.getConfig
};
