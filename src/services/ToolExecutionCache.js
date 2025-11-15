const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutos

const cacheByConversation = new Map();

const stableStringify = (obj) => {
  try {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    const sorted = {};
    Object.keys(obj).sort().forEach((key) => {
      sorted[key] = obj[key];
    });
    return JSON.stringify(sorted);
  } catch (_err) {
    return JSON.stringify(obj);
  }
};

const makeKey = (toolName, args = {}) => `${toolName || 'tool'}::${stableStringify(args || {})}`;

const getConversationCache = (conversationId) => {
  if (!conversationId) return null;
  if (!cacheByConversation.has(conversationId)) {
    cacheByConversation.set(conversationId, new Map());
  }
  return cacheByConversation.get(conversationId);
};

const prune = (conversationCache) => {
  const now = Date.now();
  for (const [key, entry] of conversationCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      conversationCache.delete(key);
    }
  }
};

export const rememberToolExecution = (conversationId, toolName, args = {}, data = {}) => {
  const conversationCache = getConversationCache(conversationId);
  if (!conversationCache) return;
  prune(conversationCache);
  const key = makeKey(toolName, args);
  conversationCache.set(key, {
    summary: data.summary || '',
    rawText: data.rawText || '',
    isError: Boolean(data.isError),
    timestamp: Date.now()
  });
};

export const getRecentToolExecution = (conversationId, toolName, args = {}) => {
  const conversationCache = getConversationCache(conversationId);
  if (!conversationCache) return null;
  prune(conversationCache);
  const key = makeKey(toolName, args);
  return conversationCache.get(key) || null;
};

export const clearToolExecutions = (conversationId) => {
  if (!conversationId) return;
  cacheByConversation.delete(conversationId);
};


