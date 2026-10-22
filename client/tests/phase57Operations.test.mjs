import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = f => readFileSync(new URL(`../${f}`,import.meta.url),'utf8');
test('admin orders table and details keep fulfillment/refund controls',()=>{
 const s=read('src/pages/admin/AdminOrders.jsx');
 assert.match(s,/nx57-orders-table/);assert.match(s,/size="order"/);assert.match(s,/nx59-order-detail/);
 assert.match(s,/requestRazorpayRefund/);assert.match(s,/confirmCodCollection/);
 assert.match(s,/openAssignmentPicker/);assert.match(s,/setOrderPage/);
});
test('customer gallery drops main image counter and adds thumbnail scroller',()=>{
 const s=read('src/components/customer/ProductMediaGallery.jsx');
 assert.match(s,/nx57-gallery-arrows/);assert.match(s,/nx57-thumbnail-track/);
 assert.match(s,/scrollBy/);assert.doesNotMatch(s,/<span aria-live="polite">\{index \+ 1\}/);
});
test('catalogue defaults to parent product view but retains color/configuration views',()=>{
 const s=read('src/pages/customer/ProductList.jsx');
 assert.match(s,/if \(!params\.has\("view"\)\) params\.set\("view", "products"\)/);
 assert.match(s,/value="variants"/);assert.match(s,/value="colors"/);
});
test('delivery workspace has admin-style left navigation',()=>{
 const s=read('src/pages/delivery/DeliveryDashboard.jsx');
 assert.match(s,/nx57-delivery-sidebar/);assert.match(s,/setTab\(key\)/);
 assert.match(s,/getDeliverySession/);assert.match(s,/getMyAssignments/);
});
test('tax display and config are connected',()=>{
 assert.match(read('src/pages/admin/AdminCheckoutSettings.jsx'),/tax_pricing_mode/);
 assert.match(read('src/pages/customer/Checkout.jsx'),/taxPricingMode/);
 assert.match(read('src/App.jsx'),/phase57\.css/);
});
