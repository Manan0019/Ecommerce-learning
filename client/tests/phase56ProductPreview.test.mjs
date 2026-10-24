import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root = new URL('../src/', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('product cards have no numeric badges or pagination dots', () => {
  const src = read('components/common/ProductCard.jsx');
  assert.doesNotMatch(src, /nx48-card-image-index|nx29-card-dots|padStart\(2/);
  assert.match(src, /nx56-card-preview-track/);
  assert.match(src, /aria-hidden="true"/);
  assert.match(src, /nx56-card-preview-fill/);
});

test('manual browsing, hover cycling and touch swipe are preserved', () => {
  const src = read('components/common/ProductCard.jsx');
  for (const expression of [/startPreview\(\)/, /onPointerLeave=\{\(\) => \{ stopPreview\(true\); manuallyNavigated\.current = false; \}\}/, /choose\(active - 1\)/, /choose\(active \+ 1\)/, /onTouchStart/, /onTouchEnd/, /aria-label=\{`Previous image/, /aria-label=\{`Next image/]) {
    assert.match(src, expression);
  }
});

test('preview indicator is a small unobtrusive line accessible on touch and keyboard', () => {
  const src = read('styles/site.css');
  for (const declaration of ['.nx56-card-preview-track', '.nx56-card-preview-fill', ':focus-within', '@media (hover: none)', '@media (prefers-reduced-motion: reduce)']) {
    assert.ok(src.includes(declaration), declaration);
  }
  assert.match(read('main.jsx'), /import ['"]\.\/styles\/site\.css['"]/ );
});
