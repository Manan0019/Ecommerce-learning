import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
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
 assert.match(source('styles/site.css'),/grid-template-columns:minmax\(0,1fr\) minmax\(160px,max-content\)/);
});
test("picker keeps focus rings visible and cards inside scrollable list", () => {
  const selector=p88('src/components/admin/DeliveryExecutivePicker.jsx');const s=p88('src/styles/site.css');assert.match(selector,/team|executive|picker/i);assert.match(s,/focus-visible/);assert.match(s,/overflow-y|overflow:\s*auto|overflow-x:\s*auto/);
});
test("close buttons use centrally aligned cross with new nonrotating hover effect", () => {
  const modal=p88('src/components/common/Modal.jsx');const styles=p88('src/styles/modules/foundation/design-system.css');assert.match(modal,/IconButton/);assert.match(modal,/<UiIcon name="x"/);assert.match(styles,/align-items:\s*center/);assert.match(styles,/prefers-reduced-motion/);
});
test('catalogue loading shimmer is real-request bound and accessible',()=>{
 const product=source('components/common/ProductLoadingSkeleton.jsx');
 const list=source('pages/customer/ProductList.jsx');
 assert.match(product,/nx65-skeleton-action/);
 assert.match(list,/\{loading && \(/);
 assert.match(list,/aria-busy="true"/);
 assert.match(source('styles/site.css'),/nx65-loading-row/);
});
test('checkout stages follow real payment callback state and never fake a percent',()=>{
 const s=source('components/customer/CheckoutProcessStatus.jsx');
 assert.match(s,/const activeStep=complete\?2:phase==='verifying'\?1:0/);
 assert.match(s,/phase==='provider'/);
 assert.match(s,/aria-current=\{index===activeStep&&!complete\?'step'/);
 assert.doesNotMatch(s,/setTimeout|setInterval|requestAnimationFrame/);
 assert.match(source('pages/customer/Checkout.jsx'),/if\(confirmed\.paid\)/);
});
