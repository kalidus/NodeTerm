/**
 * Carga diferida de componentes de pestaña para reducir el bundle inicial.
 * Cada lazy() comparte la misma promesa que preloadHeavyTabChunks() para evitar
 * un segundo fetch y un frame de Suspense cuando el chunk ya está listo.
 */
import React from 'react';

const lazy = (factory) => React.lazy(factory);

const chunkPromises = new Map();

function getChunk(key, loader) {
  if (!chunkPromises.has(key)) {
    chunkPromises.set(key, loader());
  }
  return chunkPromises.get(key);
}

export const LazyHomeTab = lazy(() => getChunk('HomeTab', () => import('./HomeTab')));
export const LazyFileExplorer = lazy(() => getChunk('FileExplorer', () => import('./FileExplorer')));
export const LazySplitLayout = lazy(() => getChunk('SplitLayout', () => import('./SplitLayout')));
export const LazyRdpSessionTab = lazy(() => getChunk('RdpSessionTab', () => import('./RdpSessionTab')));
export const LazyGuacamoleTerminal = lazy(() => getChunk('GuacamoleTerminal', () => import('./GuacamoleTerminal')));
export const LazyIronRdpCanvasTab = lazy(() => getChunk('IronRdpCanvasTab', () => import('./IronRdpCanvasTab')));
export const LazyVncCanvasTab = lazy(() => getChunk('VncCanvasTab', () => import('./VncCanvasTab')));
export const LazyGuacamoleTab = lazy(() => getChunk('GuacamoleTab', () => import('./GuacamoleTab')));
export const LazyTerminalComponent = lazy(() => getChunk('TerminalComponent', () => import('./TerminalComponent')));
export const LazyPowerShellTerminal = lazy(() => getChunk('PowerShellTerminal', () => import('./PowerShellTerminal')));
export const LazyWSLTerminal = lazy(() => getChunk('WSLTerminal', () => import('./WSLTerminal')));
export const LazyUbuntuTerminal = lazy(() => getChunk('UbuntuTerminal', () => import('./UbuntuTerminal')));
export const LazyCygwinTerminal = lazy(() => getChunk('CygwinTerminal', () => import('./CygwinTerminal')));
export const LazyDockerTerminal = lazy(() => getChunk('DockerTerminal', () => import('./DockerTerminal')));
export const LazyClaudeTerminal = lazy(() => getChunk('ClaudeTerminal', () => import('./ClaudeTerminal')));
export const LazyOpenCodeTerminal = lazy(() => getChunk('OpenCodeTerminal', () => import('./OpenCodeTerminal')));
export const LazyCodexCliTerminal = lazy(() => getChunk('CodexCliTerminal', () => import('./CodexCliTerminal')));
export const LazyAntigravityCliTerminal = lazy(() => getChunk('AntigravityCliTerminal', () => import('./AntigravityCliTerminal')));
export const LazyHermesCliTerminal = lazy(() => getChunk('HermesCliTerminal', () => import('./HermesCliTerminal')));
export const LazyAuditTab = lazy(() => getChunk('AuditTab', () => import('./AuditTab')));
export const LazyRecordingPlayerTab = lazy(() => getChunk('RecordingPlayerTab', () => import('./RecordingPlayerTab')));
export const LazyGlobalAuditTab = lazy(() => getChunk('GlobalAuditTab', () => import('./GlobalAuditTab')));
export const LazyAnythingLLMTab = lazy(() => getChunk('AnythingLLMTab', () => import('./AnythingLLMTab')));
export const LazyOpenWebUITab = lazy(() => getChunk('OpenWebUITab', () => import('./OpenWebUITab')));
export const LazyLibreChatTab = lazy(() => getChunk('LibreChatTab', () => import('./LibreChatTab')));
export const LazyAgentZeroTab = lazy(() => getChunk('AgentZeroTab', () => import('./AgentZeroTab')));
export const LazyOpenClawTab = lazy(() => getChunk('OpenClawTab', () => import('./OpenClawTab')));
export const LazyOpenNotebookTab = lazy(() => getChunk('OpenNotebookTab', () => import('./OpenNotebookTab')));
export const LazySSHTunnelTab = lazy(() => getChunk('SSHTunnelTab', () => import('./SSHTunnelTab')));
export const LazyNetworkToolTab = lazy(() => getChunk('NetworkToolTab', () => import('./NetworkToolTab')));
export const LazyTiptapDocumentEditor = lazy(() => getChunk('TiptapDocumentEditor', () => import('./TiptapDocumentEditor')));
export const LazySettingsContent = lazy(() => getChunk('SettingsContent', () => import('./SettingsDialog').then(m => ({ default: m.SettingsContent }))));
export const LazyBrowserTab = lazy(() => getChunk('BrowserTab', () => import('./BrowserTab')));

const IDLE_PRELOAD_KEYS = [
  'TerminalComponent',
];

const CHUNK_LOADERS = {
  HomeTab: () => import('./HomeTab'),
  FileExplorer: () => import('./FileExplorer'),
  SplitLayout: () => import('./SplitLayout'),
  RdpSessionTab: () => import('./RdpSessionTab'),
  GuacamoleTerminal: () => import('./GuacamoleTerminal'),
  VncCanvasTab: () => import('./VncCanvasTab'),
  GuacamoleTab: () => import('./GuacamoleTab'),
  TerminalComponent: () => import('./TerminalComponent'),
  PowerShellTerminal: () => import('./PowerShellTerminal'),
  WSLTerminal: () => import('./WSLTerminal'),
  UbuntuTerminal: () => import('./UbuntuTerminal'),
  CygwinTerminal: () => import('./CygwinTerminal'),
  DockerTerminal: () => import('./DockerTerminal'),
  ClaudeTerminal: () => import('./ClaudeTerminal'),
  OpenCodeTerminal: () => import('./OpenCodeTerminal'),
  CodexCliTerminal: () => import('./CodexCliTerminal'),
  AntigravityCliTerminal: () => import('./AntigravityCliTerminal'),
  HermesCliTerminal: () => import('./HermesCliTerminal'),
  AuditTab: () => import('./AuditTab'),
  RecordingPlayerTab: () => import('./RecordingPlayerTab'),
  GlobalAuditTab: () => import('./GlobalAuditTab'),
  AnythingLLMTab: () => import('./AnythingLLMTab'),
  OpenWebUITab: () => import('./OpenWebUITab'),
  LibreChatTab: () => import('./LibreChatTab'),
  AgentZeroTab: () => import('./AgentZeroTab'),
  OpenClawTab: () => import('./OpenClawTab'),
  OpenNotebookTab: () => import('./OpenNotebookTab'),
  SSHTunnelTab: () => import('./SSHTunnelTab'),
  NetworkToolTab: () => import('./NetworkToolTab'),
  TiptapDocumentEditor: () => import('./TiptapDocumentEditor'),
  SettingsContent: () => import('./SettingsDialog').then(m => ({ default: m.SettingsContent })),
  BrowserTab: () => import('./BrowserTab'),
};

let tabChunksPreloadStarted = false;
let tabChunksPriorityReady = false;

export function arePriorityTabChunksReady() {
  return tabChunksPriorityReady;
}

/**
 * Precalienta solo el chunk de terminal SSH en idle (sin Guacamole/CLI/Browser).
 */
export function preloadHeavyTabChunks() {
  if (tabChunksPreloadStarted) {
    return Promise.resolve();
  }
  tabChunksPreloadStarted = true;

  const scheduleIdle =
    typeof requestIdleCallback === 'function'
      ? (fn) => requestIdleCallback(fn, { timeout: 8000 })
      : (fn) => setTimeout(fn, 1500);

  return new Promise((resolve) => {
    scheduleIdle(() => {
      Promise.all(IDLE_PRELOAD_KEYS.map((key) => getChunk(key, CHUNK_LOADERS[key])))
        .then(() => {
          tabChunksPriorityReady = true;
          resolve();
        })
        .catch((err) => {
          console.warn('[tabLoaders] Precalentado TerminalComponent:', err);
          resolve();
        });
    });
  });
}

export const TabChunkFallback = () => null;
