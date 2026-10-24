import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { deliveryTabMatch, deliveryAttentionPriority } from '../src/services/deliveryViewRules.js';
const read = file => fs.readFileSync(new URL('../src/'+file,import.meta.url), 'utf8');
test('product cards expose a full-card accessible link alongside the existing gallery actions', () => {
  for (const file of ['components/common/ProductCard.jsx','components/customer/RecentlyViewed.jsx']) {
    assert.match(read(file),/nx74-card-hit-area/);
    assert.match(read(file),/aria-label=\{`Open/);
  }
  assert.match(read('components/common/ProductCard.jsx'),/StorefrontCardActions/);
});
test('hover underline is unified and never removes photo gallery arrows', () => {
  const css=read('styles/site.css');
  assert.match(css,/nx74-link-card.*product-info h3 a/);
  assert.match(css,/background-size:0 2px/);
  assert.match(css,/\.nx48-department\.is-active \.nx66-department-accent/);
  assert.match(read('components/common/ProductCard.jsx'),/nx29-card-arrows/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
test("admin customer search is backed by API query and stays read only", () => {
  const page=p88('src/pages/admin/AdminCustomers.jsx');const api=p88('src/services/adminService.js');assert.match(page,/getCustomers\(controller\.signal, serverQuery, page\)/);assert.match(page,/setServerQuery/);assert.match(page,/Search name, email or ID/);assert.doesNotMatch(page,/admin-readonly-badge/);assert.match(page,/SearchField/);assert.match(api,/params\.set\("q", query\.trim\(\)\)/);
});
test('delivered orders are ranked after active assignments without loosening permissions', () => {
  assert.ok(deliveryAttentionPriority({deliveryStatus:'out_for_delivery'}) < deliveryAttentionPriority({deliveryStatus:'assigned'}));
  assert.ok(deliveryAttentionPriority({deliveryStatus:'assigned'}) < deliveryAttentionPriority({deliveryStatus:'delivered'}));
  assert.equal(deliveryTabMatch({deliveryStatus:'delivered'},'active'),false);
  assert.equal(deliveryTabMatch({deliveryStatus:'out_for_delivery'},'active'),true);
  assert.equal(deliveryTabMatch({deliveryStatus:'assigned'},'active'),true);
  assert.equal(deliveryTabMatch({deliveryStatus:'delivered'},'all'),true);
});
test('courier quick-access actions retain OTP and issue protections',()=>{
  const page=read('pages/delivery/DeliveryDashboard.jsx');
  assert.match(page,/focusNextDelivery/);
  assert.match(page,/nx74-delivery-queue-summary/);
  assert.match(page,/deliveryAttentionPriority/);
  assert.match(page,/confirmDeliveryCode/);
  assert.match(page,/pendingIssue/);
  assert.match(page,/resendHandoverCode/);
});
test('order management action has smooth hover treatment',()=>{
  const css=read('styles/site.css');
  assert.match(css,/admin-shell \.nx57-open-order:hover/);
  assert.match(css,/\.nx57-open-order::after/);
});
