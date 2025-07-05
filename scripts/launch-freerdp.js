const { spawn } = require('child_process');

const width = process.argv[2] || '1280';
const height = process.argv[3] || '720';
const arg3 = process.argv[4];
const arg4 = process.argv[5];
let smartSizing = '';
if (arg3 && arg4) {
  smartSizing = `/smart-sizing:${arg3}x${arg4}`;
} else if (arg3 === 'smart') {
  smartSizing = '/smart-sizing';
}
const cmd = 'cmd.exe';
const args = ['/c', `resources\\freerdp\\wfreerdp.exe /v:192.168.10.52 /u:kalidus /p:Ronaldi$1024 /size:${width}x${height} ${smartSizing} /cert:ignore`];

console.log('Lanzando FreeRDP con CMD:', args[1]);
const child = spawn(cmd, args, { stdio: 'inherit' }); 