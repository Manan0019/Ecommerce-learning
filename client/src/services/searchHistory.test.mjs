import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSearchTerm, readRecentSearches, rememberSearch, clearRecentSearches } from './searchHistory.js';
function fakeStorage() {
  const entries = new Map();
  return {getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
}
test('history normalizes, deduplicates and keeps the most recent six searches', () => {
  const storage = fakeStorage();
  for(const term of ['  iPhone   17 ','tablet','laptop','watch','beauty','shirt','headphones']) rememberSearch(term, storage);
  assert.deepEqual(readRecentSearches(storage),['headphones','shirt','beauty','watch','laptop','tablet']);
  rememberSearch(' LAPTOP ', storage);
  assert.deepEqual(readRecentSearches(storage),['LAPTOP','headphones','shirt','beauty','watch','tablet']);
  clearRecentSearches(storage);
  assert.deepEqual(readRecentSearches(storage),[]);
});
test('history ignores empty or one-letter entries and survives unavailable storage', () => {
  const storage = {getItem(){throw Error('disabled')},setItem(){throw Error('disabled')},removeItem(){throw Error('disabled')}};
  assert.deepEqual(rememberSearch('a', fakeStorage()),[]);
  assert.deepEqual(readRecentSearches(storage), []);
  assert.deepEqual(rememberSearch('Samsung', storage), ['Samsung']);
  assert.deepEqual(clearRecentSearches(storage), []);
  assert.equal(cleanSearchTerm('   hello   world  '), 'hello world');
});
