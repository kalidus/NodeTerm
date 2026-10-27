import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadSidebarSectionAppearance,
  resolveSectionAppearance,
  saveSidebarSectionAppearance,
  sectionHasAppearanceOverride,
  withSectionField
} from '../utils/sidebarSectionAppearance';

export function useSidebarSectionAppearance({ treeTheme = 'cursorCompact', iconTheme = 'nord' } = {}) {
  const [overrides, setOverrides] = useState(() => loadSidebarSectionAppearance());
  const skipPersistRef = useRef(true);

  useEffect(() => {
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    saveSidebarSectionAppearance(overrides);
  }, [overrides]);

  useEffect(() => {
    const reload = () => {
      const next = loadSidebarSectionAppearance();
      setOverrides((prev) => {
        if (JSON.stringify(prev) === JSON.stringify(next)) return prev;
        skipPersistRef.current = true;
        return next;
      });
    };
    window.addEventListener('storage', reload);
    window.addEventListener('settings-updated', reload);
    window.addEventListener('localstorage-sync-ready', reload);
    return () => {
      window.removeEventListener('storage', reload);
      window.removeEventListener('settings-updated', reload);
      window.removeEventListener('localstorage-sync-ready', reload);
    };
  }, []);

  const resolve = useCallback((sectionId) => (
    resolveSectionAppearance(overrides, sectionId, { treeTheme, iconTheme })
  ), [overrides, treeTheme, iconTheme]);

  const setSectionTreeTheme = useCallback((sectionId, value) => {
    setOverrides((prev) => withSectionField(prev, sectionId, 'treeTheme', value));
  }, []);

  const setSectionIconTheme = useCallback((sectionId, value) => {
    setOverrides((prev) => withSectionField(prev, sectionId, 'iconTheme', value));
  }, []);

  const resetSection = useCallback((sectionId) => {
    setOverrides((prev) => {
      if (!prev[sectionId]) return prev;
      const next = { ...prev };
      delete next[sectionId];
      return next;
    });
  }, []);

  const hasOverride = useCallback((sectionId) => (
    sectionHasAppearanceOverride(overrides, sectionId)
  ), [overrides]);

  return {
    overrides,
    resolve,
    setSectionTreeTheme,
    setSectionIconTheme,
    resetSection,
    hasOverride
  };
}
