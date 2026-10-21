import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { deliveryTabMatch, deliveryNextAction, mapSearchUrl, cleanPhone } from '../src/services/deliveryViewRules.js';
const read = path => readFileSync(new URL(`../src/${path}`, import.meta.url),'utf8');

test('courier status tabs never accept unknown states', () => {
 const assigned={deliveryStatus:'assigned'},route={deliveryStatus:'out_for_delivery'},done={deliveryStatus:'delivered'};
 assert.equal(deliveryTabMatch(assigned,'ready'),true);
 assert.equal(deliveryTabMatch(route,'ready'),false);
 assert.equal(deliveryTabMatch(route,'route'),true);
 assert.equal(deliveryTabMatch(done,'delivered'),true);
 assert.equal(deliveryTabMatch(done,'other'),false);
});
test('client actions require dispatched order and correct status', () => {
 assert.deepEqual(deliveryNextAction({orderStatus:'shipped', deliveryStatus:'assigned'}), {status:'out_for_delivery',label:'Start delivery'});
 assert.deepEqual(deliveryNextAction({orderStatus:'shipped', deliveryStatus:'out_for_delivery'}), {status:'delivered',label:'Confirm delivered'});
 assert.equal(deliveryNextAction({orderStatus:'placed',deliveryStatus:'assigned'}),null);
 assert.equal(deliveryNextAction({orderStatus:'shipped',deliveryStatus:'delivered'}),null);
});
test('delivery map URLs encode user data and phone links are validated', () => {
 assert.match(mapSearchUrl({addressLine1:'A & B',city:'Surat'}), /A%20%26%20B%2C%20Surat/);
 assert.equal(mapSearchUrl({}), '');
 assert.equal(cleanPhone('+91 87993 15529'),'+918799315529');
 assert.equal(cleanPhone('javascript:alert(1)'), '');
});
test('delivery account sign in has backend-verified session and route', () => {
 assert.match(read('pages/delivery/DeliveryLogin.jsx'), /getDeliverySession\(\)/);
 assert.match(read('pages/delivery/DeliveryDashboard.jsx'), /getDeliverySession\(controller.signal\)/);
 assert.match(read('pages/auth/CustomerLogin.jsx'), /await getDeliverySession\(\)/);
 assert.match(read('App.jsx'), /path="\/delivery\/login"/);
 assert.match(read('components/layout/StoreHeader.jsx'), /role === "delivery"/);
});
test('promotion selection uses browsable hierarchy with separate select and drill buttons', () => {
 const picker=read('components/admin/PromotionCategorySelect.jsx');
 assert.match(picker,/nx52-category-breadcrumbs/);
 assert.match(picker,/nx52-category-pick/);
 assert.match(picker,/nx52-category-drill/);
 assert.match(picker,/categoryPaths\(categories\)/);
 assert.match(picker,/setParentId\(id\)/);
});
test('promotion navigation is minimal and accessible without numbered pills',()=>{
 const carousel=read('components/customer/PromotionCarousel.jsx');
 assert.match(carousel,/nx52-promotion-progress/);
 assert.match(carousel,/aria-label=\{`Show promotion: /);
 assert.doesNotMatch(carousel,/Collection \{String\(active\+1\)/);
 assert.doesNotMatch(carousel,/nx47-promotion-segments/);
 assert.match(carousel,/onTouchStart=\{touchStart\}/);
 assert.match(carousel,/nx47-autoplay-toggle/);
});
