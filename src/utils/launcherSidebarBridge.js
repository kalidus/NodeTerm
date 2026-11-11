import { useSyncExternalStore } from 'react';

export const LAUNCHER_SESSION_OPENED_EVENT = 'nodeterm-session-opened';

export function notifyLauncherSessionOpened() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(LAUNCHER_SESSION_OPENED_EVENT));
}

let snapshot = null;
const listeners = new Set();

export function setLauncherSidebarProps(next) {
  if (snapshot === next) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

export function getLauncherSidebarProps() {
  return snapshot;
}

export function subscribeLauncherSidebarProps(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLauncherSidebarProps() {
  return useSyncExternalStore(
    subscribeLauncherSidebarProps,
    getLauncherSidebarProps,
    getLauncherSidebarProps
  );
}
