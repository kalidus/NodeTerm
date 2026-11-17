import { createLocalPtyTerminal } from '../utils/localPtyTerminalFactory';

const DockerTerminal = createLocalPtyTerminal('docker');

export default DockerTerminal;
