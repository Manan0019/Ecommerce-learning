import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const file = new URL('../src/components/layout/CategoryMegaMenu.jsx', import.meta.url);
const source = readFileSync(file, 'utf8');

test('CategoryMegaMenu normalizes category IDs without an undefined helper', () => {
  assert.match(source, /const id\s*=\s*String\(category\.id\s*\?\?\s*""\)/);
  assert.doesNotMatch(source, /\bnormalize\s*\(/, 'Do not call an undefined normalize() from MenuBranch');
});

test('CategoryMegaMenu has a bounded recursive branch and keeps router links', () => {
  assert.match(source, /ancestors\.includes\(id\)\s*\|\|\s*depth\s*>\s*14/);
  assert.match(source, /<Link\s+to=\{target\}/);
});
