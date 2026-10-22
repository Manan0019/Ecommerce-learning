import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=(path)=>readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8');

test('order management organizes customer, price and line items into separate cells',()=>{
 const s=source('pages/admin/AdminOrders.jsx');
 assert.match(s,/nx65-order-overview/);
 assert.match(s,/nx65-customer-details/);
 assert.match(s,/nx65-total-details/);
 assert.match(s,/nx65-order-items/);
 assert.match(s,/nx65-order-product/);
 assert.match(s,/Qty \{item\.quantity\}/);
 assert.match(s,/item\.imageUrl/);
 assert.match(source('styles/phase65.css'),/grid-template-columns:minmax\(0,1fr\) minmax\(160px,max-content\)/);
});
test('picker keeps focus rings visible and cards inside scrollable list',()=>{
 const s=source('styles/phase65.css');
 assert.match(s,/\.nx-modal-assignment \.nx53-team-list \{padding:/);
 assert.match(s,/\.nx-modal-assignment \.nx53-team-card:has\(input:focus-visible\)/);
 assert.match(s,/\.nx-modal-assignment \{width:min\(760px,calc\(100vw - 32px\)\)\}/);
});
test('close buttons use centrally aligned cross with new nonrotating hover effect',()=>{
 const modal=source('components/common/Modal.jsx'),css=source('styles/phase65.css');
 assert.match(modal,/nx-icon-button nx65-close-control/);
 assert.match(css,/\.nx65-close-control::before/);
 assert.match(css,/rotate\(0deg\)!important/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
test('catalogue loading shimmer is real-request bound and accessible',()=>{
 const product=source('components/common/ProductLoadingSkeleton.jsx');
 const list=source('pages/customer/ProductList.jsx');
 assert.match(product,/nx65-skeleton-action/);
 assert.match(list,/\{loading && \(/);
 assert.match(list,/aria-busy="true"/);
 assert.match(source('styles/phase65.css'),/nx65-loading-row/);
});
test('checkout stages follow real payment callback state and never fake a percent',()=>{
 const s=source('components/customer/CheckoutProcessStatus.jsx');
 assert.match(s,/const activeStep=complete\?2:phase==='verifying'\?1:0/);
 assert.match(s,/phase==='provider'/);
 assert.match(s,/aria-current=\{index===activeStep&&!complete\?'step'/);
 assert.doesNotMatch(s,/setTimeout|setInterval|requestAnimationFrame/);
 assert.match(source('pages/customer/Checkout.jsx'),/if\(confirmed\.paid\)/);
});
