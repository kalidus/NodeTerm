import { useCallback, useEffect, useRef, useState } from 'react';
import { loadDocumentTree } from '../utils/documentStore';
import { buildSearchCatalog } from './appSearchCatalog';
import { createSearchIndex, emptySearchResult } from './appSearchIndex';

function readPlainTree(key) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function loadPasswordTree(secureStorage, masterKey) {
  if (masterKey && secureStorage) {
    const encryptedData = localStorage.getItem('passwords_encrypted');
    if (encryptedData) {
      const decrypted = await secureStorage.decryptStorageKeyCached('passwords_encrypted', masterKey);
      return Array.isArray(decrypted) ? decrypted : [];
    }
    return readPlainTree('passwordManagerNodes');
  }
  return readPlainTree('passwordManagerNodes');
}

function vaultNeedsUnlock(masterKey) {
  if (masterKey) return false;
  try {
    return !!(localStorage.getItem('passwords_encrypted') || localStorage.getItem('documents_encrypted'));
  } catch {
    return false;
  }
}

export function useAppSearchIndex({ allNodes, masterKey, secureStorage }) {
  const [passwordNodes, setPasswordNodes] = useState([]);
  const [documentNodes, setDocumentNodes] = useState([]);
  const [vaultLocked, setVaultLocked] = useState(false);
  const [ready, setReady] = useState(false);
  const [indexVersion, setIndexVersion] = useState(0);
  const indexRef = useRef(null);
  const nodesRef = useRef(new Map());

  useEffect(() => {
    let cancelled = false;
    let timer = 0;

    const load = async () => {
      try {
        const [passwords, documents] = await Promise.all([
          loadPasswordTree(secureStorage, masterKey),
          loadDocumentTree(secureStorage, masterKey)
        ]);
        if (cancelled) return;
        setPasswordNodes(Array.isArray(passwords) ? passwords : []);
        setDocumentNodes(Array.isArray(documents) ? documents : []);
        setVaultLocked(vaultNeedsUnlock(masterKey));
      } catch (error) {
        if (cancelled) return;
        if (error?.name !== 'OperationError') {
          console.error('Error cargando vault para la búsqueda:', error);
        }
        setPasswordNodes([]);
        setDocumentNodes([]);
        setVaultLocked(vaultNeedsUnlock(masterKey));
      }
    };

    const schedule = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!cancelled) load();
      }, 400);
    };

    const onStorage = (event) => {
      const key = event?.key;
      if (
        !key
        || key === 'passwords_encrypted'
        || key === 'passwordManagerNodes'
        || key === 'documents_encrypted'
        || key === 'documentManagerNodes'
      ) {
        schedule();
      }
    };

    load();
    window.addEventListener('password-vault-changed', schedule);
    window.addEventListener('documents-vault-changed', schedule);
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('password-vault-changed', schedule);
      window.removeEventListener('documents-vault-changed', schedule);
      window.removeEventListener('storage', onStorage);
    };
  }, [masterKey, secureStorage]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    let idleId = 0;

    const run = () => {
      if (cancelled) return;
      try {
        const built = buildSearchCatalog({
          connections: allNodes,
          passwords: passwordNodes,
          documents: documentNodes
        });
        indexRef.current = createSearchIndex(built.docs);
        nodesRef.current = built.nodesById;
        setReady(true);
        setIndexVersion((version) => version + 1);
      } catch (error) {
        console.error('Error actualizando el índice de búsqueda:', error);
      }
    };

    timer = setTimeout(() => {
      if (typeof requestIdleCallback === 'function') {
        idleId = requestIdleCallback(run, { timeout: 500 });
      } else {
        run();
      }
    }, 150);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (idleId && typeof cancelIdleCallback === 'function') {
        cancelIdleCallback(idleId);
      }
    };
  }, [allNodes, passwordNodes, documentNodes]);

  const search = useCallback((query, category = 'all') => {
    if (!indexRef.current) return emptySearchResult(query, category);
    return indexRef.current.search(query, category);
  }, [indexVersion]);

  const getNode = useCallback((id) => nodesRef.current.get(id) || null, [indexVersion]);

  return { search, getNode, ready, vaultLocked, indexVersion };
}
