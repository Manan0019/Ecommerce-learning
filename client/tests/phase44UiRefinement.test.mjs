import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const css = src('../src/styles/site.css');
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
test("header wishlist and cart share a hit area and SVG dimensions", () => {
  const header=p88('src/components/layout/StoreHeader.jsx');const ui=p88('src/styles/modules/foundation/design-system.css');assert.match(header,/IconButton/);assert.match(header,/cart-link/);assert.match(ui,/nx-ui-icon-button/);assert.match(ui,/--nx-icon-size/);
});
test('legacy Phase44 banner spacing remains available for older layouts', () => {
  assert.match(css, /\.nx37-promotion-home \+ \.store-section/);
  assert.match(carousel, /nx37-promotion-image-frame/);
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
