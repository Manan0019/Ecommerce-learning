// Local to this browser. Never sent to the Nexora API or analytics.
const KEY = 'nexora_recent_searches_v1';
function scopedKey(scope = 'guest') {
  const safe = String(scope).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 60) || 'guest';
  return `${KEY}:${safe}`;
}
const MAX_ITEMS = 6;
function browserStorage() { try { return globalThis.localStorage; } catch { return null; } }
export function cleanSearchTerm(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : '';
}
export function readRecentSearches(storage = browserStorage(), scope = 'guest') {
  try {
    const stored = JSON.parse(storage?.getItem(scopedKey(scope)) || '[]');
    return Array.isArray(stored) ? stored.filter(item => typeof item === 'string').map(cleanSearchTerm).filter(Boolean).slice(0, MAX_ITEMS) : [];
  } catch { return []; }
}
export function rememberSearch(value, storage = browserStorage(), scope = 'guest') {
  const q = cleanSearchTerm(value);
  if (q.length < 2) return readRecentSearches(storage, scope);
  const next = [q, ...readRecentSearches(storage, scope).filter(item => item.toLocaleLowerCase() !== q.toLocaleLowerCase())].slice(0,MAX_ITEMS);
  try { storage?.setItem(scopedKey(scope), JSON.stringify(next)); } catch { /* Private browsing may block storage. */ }
  return next;
}
export function clearRecentSearches(storage = browserStorage(), scope = 'guest') {
  try { storage?.removeItem(scopedKey(scope)); } catch { /* No storage permission: no history to clear. */ }
  return [];
}
