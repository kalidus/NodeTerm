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
export const LazyGuacamoleTab = lazy(() => getChunk('GuacamoleTab', () => import('./GuacamoleTab')));
export const LazyTerminalComponent = lazy(() => getChunk('TerminalComponent', () => import('./TerminalComponent')));
export const LazyPowerShellTerminal = lazy(() => getChunk('PowerShellTerminal', () => import('./PowerShellTerminal')));
export const LazyWSLTerminal = lazy(() => getChunk('WSLTerminal', () => import('./WSLTerminal')));
export const LazyUbuntuTerminal = lazy(() => getChunk('UbuntuTerminal', () => import('./UbuntuTerminal')));
export const LazyCygwinTerminal = lazy(() => getChunk('CygwinTerminal', () => import('./CygwinTerminal')));
export const LazyDockerTerminal = lazy(() => getChunk('DockerTerminal', () => import('./DockerTerminal')));
export const LazyClaudeTerminal = lazy(() => getChunk('ClaudeTerminal', () => import('./ClaudeTerminal')));
export const LazyOpenCodeTerminal = lazy(() => getChunk('OpenCodeTerminal', () => import('./OpenCodeTerminal')));
export const LazyGeminiCliTerminal = lazy(() => getChunk('GeminiCliTerminal', () => import('./GeminiCliTerminal')));
export const LazyCodexCliTerminal = lazy(() => getChunk('CodexCliTerminal', () => import('./CodexCliTerminal')));
export const LazyAntigravityCliTerminal = lazy(() => getChunk('AntigravityCliTerminal', () => import('./AntigravityCliTerminal')));
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

const PRIORITY_CHUNK_KEYS = [
  'TerminalComponent',
  'PowerShellTerminal',
  'WSLTerminal',
  'UbuntuTerminal',
  'SplitLayout',
  'RdpSessionTab',
  'FileExplorer',
];

const SECONDARY_CHUNK_KEYS = [
  'GuacamoleTab',
  'GuacamoleTerminal',
  'CygwinTerminal',
  'DockerTerminal',
  'ClaudeTerminal',
  'OpenCodeTerminal',
  'GeminiCliTerminal',
  'CodexCliTerminal',
  'AntigravityCliTerminal',
  'SSHTunnelTab',
];

const CHUNK_LOADERS = {
  HomeTab: () => import('./HomeTab'),
  FileExplorer: () => import('./FileExplorer'),
  SplitLayout: () => import('./SplitLayout'),
  RdpSessionTab: () => import('./RdpSessionTab'),
  GuacamoleTerminal: () => import('./GuacamoleTerminal'),
  GuacamoleTab: () => import('./GuacamoleTab'),
  TerminalComponent: () => import('./TerminalComponent'),
  PowerShellTerminal: () => import('./PowerShellTerminal'),
  WSLTerminal: () => import('./WSLTerminal'),
  UbuntuTerminal: () => import('./UbuntuTerminal'),
  CygwinTerminal: () => import('./CygwinTerminal'),
  DockerTerminal: () => import('./DockerTerminal'),
  ClaudeTerminal: () => import('./ClaudeTerminal'),
  OpenCodeTerminal: () => import('./OpenCodeTerminal'),
  GeminiCliTerminal: () => import('./GeminiCliTerminal'),
  CodexCliTerminal: () => import('./CodexCliTerminal'),
  AntigravityCliTerminal: () => import('./AntigravityCliTerminal'),
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
};

let tabChunksPreloadStarted = false;
let tabChunksPriorityReady = false;

export function arePriorityTabChunksReady() {
  return tabChunksPriorityReady;
}

/**
 * Precalienta chunks de pestaña. Fase 1 inmediata; fase 2 en idle.
 */
export function preloadHeavyTabChunks() {
  if (tabChunksPreloadStarted) {
    return Promise.resolve();
  }
  tabChunksPreloadStarted = true;

  const loadKeys = (keys) =>
    Promise.all(keys.map((key) => getChunk(key, CHUNK_LOADERS[key])));

  return loadKeys(PRIORITY_CHUNK_KEYS).then(() => {
    tabChunksPriorityReady = true;
    const scheduleSecondary =
      typeof requestIdleCallback === 'function'
        ? (fn) => requestIdleCallback(fn, { timeout: 2000 })
        : (fn) => setTimeout(fn, 50);
    scheduleSecondary(() => {
      loadKeys(SECONDARY_CHUNK_KEYS).catch((err) => {
        console.warn('[tabLoaders] Precalentado secundario:', err);
      });
    });
  });
}

/** Inicia precalentado en cuanto se carga este módulo (App ya importó TabContentRenderer). */
if (typeof window !== 'undefined') {
  queueMicrotask(() => {
    preloadHeavyTabChunks().catch(() => {});
    import('../utils/xtermLoader').then(({ loadXtermModules }) => loadXtermModules()).catch(() => {});
  });
}

export const TabChunkFallback = () => null;
