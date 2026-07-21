/**
 * Verificacion de politica endurecida de inject_secret (sin Electron).
 */
import {
  clearAllPolicy,
  recordAgentCommand,
  assertCommandAllowsSecret,
  tryIssueTicketAfterWait,
  consumePromptTicket,
  assertInjectRateLimit,
  noteInjectAttempt,
  RATE_LIMIT_COUNT,
  extractCommandFromWritePayload,
  getAudit
} from '../src/services/secretInjectPolicy.js';
import { assertPasswordPrompt, clearAllConsumedPrompts } from '../src/services/passwordPromptGate.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

clearAllPolicy();
clearAllConsumedPrompts();

assert(assertCommandAllowsSecret('sudo su') === true, 'sudo allow');
assert(assertCommandAllowsSecret('cd /tmp && git pull') === true, 'git via && allow');
assert(assertCommandAllowsSecret('ls -la') === false, 'ls deny');

const tid = 'term-test-1';
const sudoBuf = 'user@host:~$ sudo su\n[sudo] password for user: ';

// Sin comando correlacionado: no ticket
let issued = tryIssueTicketAfterWait(tid, sudoBuf, 100);
assert(issued.promptTicket == null, 'sin comando no ticket');
assert(issued.gateError === 'command_correlation_required', 'error correlacion');

recordAgentCommand(tid, 'sudo su');
issued = tryIssueTicketAfterWait(tid, sudoBuf, 100);
assert(!!issued.promptTicket, 'con sudo debe emitir ticket');
assert(issued.matchedPrompt === 'sudo_password' || issued.matchedPrompt === 'generic_password_prompt',
  `matched=${issued.matchedPrompt}`);

const ticket = issued.promptTicket;

// inject sin ticket
let c = consumePromptTicket(tid, null, 100, issued.matchedPrompt);
assert(c.ok === false && c.error === 'prompt_ticket_required', 'ticket required');

// ticket invalido
c = consumePromptTicket(tid, 'deadbeef', 100, issued.matchedPrompt);
assert(c.ok === false && c.error === 'prompt_ticket_invalid', 'ticket invalid');

// ticket ok
c = consumePromptTicket(tid, ticket, 100, issued.matchedPrompt);
assert(c.ok === true, 'consume ok');

// reutilizar falla
c = consumePromptTicket(tid, ticket, 100, issued.matchedPrompt);
assert(c.ok === false, 'reuse fails');

// write payload extract
assert(extractCommandFromWritePayload('sudo su', ['enter']) === 'sudo su', 'extract enter');
assert(extractCommandFromWritePayload('sudo su\n', null) === 'sudo su', 'extract nl');
assert(extractCommandFromWritePayload('sudo su', null) === null, 'sin enter no extract');

// rate limit
clearAllPolicy();
clearAllConsumedPrompts();
recordAgentCommand(tid, 'git pull');
const gitBuf = "Password for 'https://salesfocus@bitbucket.org': ";
for (let i = 0; i < RATE_LIMIT_COUNT; i++) {
  noteInjectAttempt(tid);
}
const rate = assertInjectRateLimit(tid);
assert(rate.ok === false && rate.error === 'rate_limited', 'rate limited');

// gate password still works
const gate = assertPasswordPrompt(gitBuf, 50, 't-gate');
assert(gate.ok === true, 'git password gate');

const audit = getAudit(20);
assert(Array.isArray(audit), 'audit array');

console.log('OK verify-secret-inject-policy');
