import { useCallback, useState } from 'react';
import networkToolsHistoryService from '../services/NetworkToolsHistoryService';

export function useNetworkToolHistory(toolId) {
  const [items, setItems] = useState(() => networkToolsHistoryService.list(toolId));

  const refresh = useCallback(() => {
    setItems(networkToolsHistoryService.list(toolId));
  }, [toolId]);

  const record = useCallback((entry) => {
    networkToolsHistoryService.record({ ...entry, toolId });
    refresh();
  }, [toolId, refresh]);

  const togglePin = useCallback((id) => {
    networkToolsHistoryService.togglePin(id);
    refresh();
  }, [refresh]);

  const remove = useCallback((id) => {
    networkToolsHistoryService.remove(id);
    refresh();
  }, [refresh]);

  return { items, record, togglePin, remove };
}
