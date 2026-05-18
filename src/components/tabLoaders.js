/**
 * Carga diferida de componentes de pestaña para reducir el bundle inicial.
 */
import React from 'react';

const lazy = (factory) => React.lazy(factory);

export const LazyHomeTab = lazy(() => import('./HomeTab'));
export const LazyFileExplorer = lazy(() => import('./FileExplorer'));
export const LazySplitLayout = lazy(() => import('./SplitLayout'));
export const LazyRdpSessionTab = lazy(() => import('./RdpSessionTab'));
export const LazyGuacamoleTerminal = lazy(() => import('./GuacamoleTerminal'));
export const LazyGuacamoleTab = lazy(() => import('./GuacamoleTab'));
export const LazyTerminalComponent = lazy(() => import('./TerminalComponent'));
export const LazyPowerShellTerminal = lazy(() => import('./PowerShellTerminal'));
export const LazyWSLTerminal = lazy(() => import('./WSLTerminal'));
export const LazyUbuntuTerminal = lazy(() => import('./UbuntuTerminal'));
export const LazyCygwinTerminal = lazy(() => import('./CygwinTerminal'));
export const LazyDockerTerminal = lazy(() => import('./DockerTerminal'));
export const LazyClaudeTerminal = lazy(() => import('./ClaudeTerminal'));
export const LazyOpenCodeTerminal = lazy(() => import('./OpenCodeTerminal'));
export const LazyGeminiCliTerminal = lazy(() => import('./GeminiCliTerminal'));
export const LazyCodexCliTerminal = lazy(() => import('./CodexCliTerminal'));
export const LazyAuditTab = lazy(() => import('./AuditTab'));
export const LazyRecordingPlayerTab = lazy(() => import('./RecordingPlayerTab'));
export const LazyGlobalAuditTab = lazy(() => import('./GlobalAuditTab'));
export const LazyAnythingLLMTab = lazy(() => import('./AnythingLLMTab'));
export const LazyOpenWebUITab = lazy(() => import('./OpenWebUITab'));
export const LazyLibreChatTab = lazy(() => import('./LibreChatTab'));
export const LazyAgentZeroTab = lazy(() => import('./AgentZeroTab'));
export const LazyOpenClawTab = lazy(() => import('./OpenClawTab'));
export const LazyOpenNotebookTab = lazy(() => import('./OpenNotebookTab'));
export const LazySSHTunnelTab = lazy(() => import('./SSHTunnelTab'));
export const LazyNetworkToolTab = lazy(() => import('./NetworkToolTab'));
export const LazyTiptapDocumentEditor = lazy(() => import('./TiptapDocumentEditor'));

export const TabChunkFallback = () => (
  <div
    className="tab-chunk-loading"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      minHeight: 120,
      opacity: 0.7,
      color: 'var(--ui-text-secondary, #94a3b8)',
      fontSize: 14
    }}
  >
    <i className="pi pi-spin pi-spinner" style={{ marginRight: 8 }} />
    Cargando…
  </div>
);
