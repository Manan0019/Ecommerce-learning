import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const source = path => readFileSync(resolve(root, path), 'utf8');

test('miniature category artwork favors admin-provided menu icon then category image', () => {
  const src = source('components/customer/CategoryMiniArtwork.jsx');
  assert.match(src, /category\?\.menuIconUrl \|\| category\?\.imageUrl/);
  assert.match(src, /apiAssetUrl\(url\)/);
  assert.match(src, /onError=\{\(\) => setFailedUrl\(url\)\}/);
});
test('search suggestions display correct matching category artwork with text fallback', () => {
  const src = source('components/layout/StoreHeader.jsx');
  assert.match(src, /getCategories\(controller\.signal\)/);
  assert.match(src, /categoryArtwork\[c\.slug\] \|\| c/);
  assert.match(src, /CategoryMiniArtwork/);
  assert.doesNotMatch(src, /nx47-category-search-glyph/);
});
test('department cards display category icons and a small multi-category all-products image', () => {
  const src = source('pages/customer/ProductList.jsx');
  assert.match(src, /<CategoryMiniArtwork category=\{item\}/);
  assert.match(src, /nx49-all-departments-mosaic/);
  assert.match(src, /nx49-department-arrow/);
});
test('nested category chevrons remain interactive but no longer drift on hover', () => {
  const menu = source('components/layout/CategoryMegaMenu.jsx');
  const styles = source('styles/phase49.css');
  assert.match(menu, /aria-expanded=\{expanded\}/);
  assert.match(styles, /\.nx35-category-expand \.nx47-icon/);
  assert.match(styles, /transform:none!important/);
  assert.match(styles, /place-items:center/);
});
test('phase49 is imported and promotion playback button has a hover label', () => {
  assert.match(source('App.jsx'), /styles\/phase49\.css/);
  assert.match(source('components/customer/PromotionCarousel.jsx'), /title=\{userPaused\?"Resume slideshow":"Pause slideshow"\}/);
});
