import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cartStorageKey, sanitizeCart } from '../src/services/cartIdentity.js';
import { notificationDestination, notificationKind } from '../src/services/notificationTarget.js';
const read = file => fs.readFileSync(new URL('../src/'+file,import.meta.url),'utf8');
test('cart storage must differ for guest, customer accounts, and staff',()=>{
  assert.notEqual(cartStorageKey({role:'customer',id:'7'}),cartStorageKey({role:'customer',id:'8'}));
  assert.notEqual(cartStorageKey({role:'customer',id:'7'}),cartStorageKey(null));
  assert.equal(cartStorageKey({role:'admin',id:'1'}),'nexora_cart_v2_staff_empty');
  assert.equal(cartStorageKey({role:'delivery',id:'1'}),'nexora_cart_v2_staff_empty');
  assert.equal(cartStorageKey({role:'customer',id:'bad'}),cartStorageKey(null));
  assert.deepEqual(sanitizeCart([{productId:'1',quantity:1},{productId:'1',quantity:2},{productId:'2',quantity:0},{productId:'2',quantity:3}]),[{productId:'1',quantity:1},{productId:'2',quantity:3}]);
  assert.doesNotMatch(read('context/CartProvider.jsx'),/ecommerce_cart_v1/);
  assert.match(read('context/CartProvider.jsx'),/nexora:auth-changed/);
});
test('notifications deep-link to specific customer and admin order',()=>{
  assert.equal(notificationDestination({path:'/orders',message:'Delivery update for order #8.'}),'/orders?order=8');
  assert.equal(notificationDestination({path:'/admin/orders',message:'New Cash on Delivery order #9 was placed.'}),'/admin/orders?order=9');
  assert.equal(notificationDestination({path:'/admin/delivery',message:'Order #9 failed delivery'}),'/admin/delivery');
  assert.equal(notificationDestination({path:'https://evil.test/',message:'Order #9'}),'/');
  assert.equal(notificationKind('refund'),'refund');
  assert.equal(notificationKind('script'),'general');
  assert.match(read('pages/admin/AdminOrders.jsx'),/linkedOrderId/);
  assert.match(read('pages/customer/Orders.jsx'),/deepLinkedOrder/);
});
test('coupon field does not silently mutate server validated quote',()=>{
 const page=read('pages/customer/Checkout.jsx');
 assert.match(page,/nx73-coupon-code/);
 assert.match(page,/couponCode:appliedCoupon/);
 assert.match(page,/Coupon savings/);
 assert.match(page,/setEstimateFor\(''\)/);
 assert.match(page,/estimateCodOrder/);
 assert.match(page,/acceptedQuote:estimate/);
});
test('one stylesheet contains targeted UI fixes',()=>{
 const css=read('styles/site.css');
 for(const selector of ['nx73-assignment-table','nx73-notification-delivery','nx73-notification-refund','nx73-coupon-field','nx37-account-bottom'])assert.ok(css.includes(selector));
});
