import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('customer order previews resolve uploaded images against backend assets',()=>{
 const jsx=read('src/pages/customer/Orders.jsx');
 assert.match(jsx,/import \{ isAuthenticationError, apiAssetUrl \}/);
 assert.match(jsx,/src=\{apiAssetUrl\(item\.imageUrl\)\}/);
 assert.match(jsx,/nx59-image-placeholder/);
});
test('orders have searchable status filters without deleting the pending-payment recovery',()=>{
 const jsx=read('src/pages/customer/Orders.jsx');
 assert.match(jsx,/nx60-order-filters/);
 assert.match(jsx,/Find order or product/);
 assert.match(jsx,/razorpay_pending/);
 assert.match(jsx,/retryRazorpayCheckout/);
 assert.match(jsx,/requestOrderCancellation/);
});
test('homepage spacing changes only apply to its own main wrapper',()=>{
 const jsx=read('src/pages/customer/Home.jsx');
 const css=read('src/styles/phase60.css');
 assert.match(jsx,/mainClassName="nx60-home"/);
 assert.match(css,/main\.nx60-home > \.store-section/);
 assert.match(read('src/main.jsx'),/phase60\.css/);
});
