const SENTINEL_Z = 900000;

let seq = 0;

export function noteHomePanelZ(z) {
  const n = Number(z);
  if (!Number.isFinite(n) || n >= SENTINEL_Z) return seq;
  if (n > seq) seq = n;
  return seq;
}

export function allocHomePanelZ() {
  seq += 1;
  return seq;
}
