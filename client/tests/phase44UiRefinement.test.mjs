import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = src('../src/styles/phase44.css');
const header = src('../src/components/layout/StoreHeader.jsx');
const orders = src('../src/pages/admin/AdminOrders.jsx');
const dialog = src('../src/components/admin/OrderActionDialog.jsx');
const carousel = src('../src/components/customer/PromotionCarousel.jsx');

test('header search uses one container-focused ring and keeps functional search input', () => {
  assert.match(css, /\.nx-nav-search:focus-within/);
  assert.match(css, /\.nx-nav-search input:focus-visible/);
  assert.match(css, /outline:\s*none/);
  assert.match(header, /role="search"/);
  assert.match(header, /getProductSuggestions/);
});
test('header wishlist and cart share a hit area and SVG dimensions', () => {
  assert.match(css, /\.nx34-wishlist-icon,\s*\n\.storefront \.nx34-header \.cart-link/);
  assert.match(css, /\.nx34-wishlist-icon svg,\s*\n\.storefront \.nx34-header \.cart-link svg/);
});
test('promotion image-only mode preserves full artwork with decorative edge fill', () => {
  assert.match(carousel, /imageOnly && <img className="nx44-promotion-backdrop"/);
  assert.match(css, /\.nx37-promotion-card\.is-image-only .*img/);
  assert.match(css, /object-fit:\s*contain/);
  assert.match(css, /\.nx37-promotion-home \+ \.store-section/);
});
test('full-refund request uses an in-app reason and acknowledgement dialog, not browser popups', () => {
  assert.match(orders, /<OrderActionDialog/);
  assert.doesNotMatch(orders, /window\.(?:prompt|confirm|alert)\s*\(/);
  assert.match(dialog, /role="dialog" aria-modal="true"/);
  assert.match(dialog, /minLength=\{10\} maxLength=\{200\}/);
  assert.match(dialog, /acknowledged/);
  assert.match(dialog, /aria-labelledby=/);
  assert.match(dialog, /event\.key !== "Tab"/);
});
