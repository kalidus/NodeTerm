let until = 0;

export function beginSessionHandoff(ms = 5000) {
  until = Date.now() + ms;
}

export function endSessionHandoff() {
  until = 0;
}

export function isSessionHandoff() {
  return Date.now() < until;
}
