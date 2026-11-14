import { createLocalPtyTerminal } from '../utils/localPtyTerminalFactory';

const WSLTerminal = createLocalPtyTerminal('wsl');

export default WSLTerminal;
