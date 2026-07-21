/**
 * Verificacion local del gate de prompts de password (sin Electron).
 */
import {
  assertPasswordPrompt,
  markPromptConsumed,
  clearAllConsumedPrompts,
  stripAnsi
} from '../src/services/passwordPromptGate.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

clearAllConsumedPrompts();

const sudoBuf = 'amunoz@debian-bots:~$ sudo su\n[sudo] contrasena para amunoz: ';
let r = assertPasswordPrompt(sudoBuf, 100, 't1');
assert(r.ok === true, 'sudo ES prompt debe pasar');
assert(r.matchedPrompt === 'sudo_password' || r.matchedPrompt === 'generic_password_prompt' || r.matchedPrompt === 'contrasena_colon',
  `matched inesperado: ${r.matchedPrompt}`);

markPromptConsumed('t1', 100, r.matchedPrompt);
r = assertPasswordPrompt(sudoBuf, 100, 't1');
assert(r.ok === false && r.error === 'password_prompt_already_consumed', 'one-shot debe bloquear mismo offset');

r = assertPasswordPrompt('amunoz@host:~$ ls\nfile1\n', 200, 't2');
assert(r.ok === false && r.error === 'password_prompt_required', 'shell normal no es prompt');

const mysqlBuf = 'Enter password: ';
r = assertPasswordPrompt(mysqlBuf, 10, 't3');
assert(r.ok === true, 'mysql Enter password debe pasar');

const ansiBuf = '\x1b[01;32muser\x1b[00m\nPassword: ';
assert(stripAnsi(ansiBuf).includes('Password:'), 'stripAnsi debe quitar CSI');
r = assertPasswordPrompt(ansiBuf, 11, 't4');
assert(r.ok === true, 'Password: con ANSI debe pasar');

const oldPrompt = 'Password: \nok\nuser@host:~$ ';
r = assertPasswordPrompt(oldPrompt, 50, 't5');
assert(r.ok === false, 'prompt viejo fuera de ventana final no debe pasar');

console.log('OK verify-password-prompt-gate');
