import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {canonicalIndianState,INDIAN_STATES} from '../src/constants/indianStates.js';
const read=path=>fs.readFileSync(new URL(path,import.meta.url),'utf8');
const settings=read('../src/pages/admin/AdminCheckoutSettings.jsx');
const addr=read('../src/components/customer/AddressFields.jsx');
const checkout=read('../src/pages/customer/Checkout.jsx');
const css=read('../src/styles/site.css');
const picker=read('../src/components/common/IndianStatePicker.jsx');
test('admin and customer both use the same search-as-you-type Indian state picker',()=>{
 assert.equal(INDIAN_STATES.length,36);assert.equal(canonicalIndianState('MH'),'Maharashtra');
 assert.match(settings,/<IndianStatePicker/);assert.match(addr,/<IndianStatePicker/);
 assert.match(picker,/aria-autocomplete="list"/);assert.match(picker,/ArrowDown/);assert.match(picker,/role="listbox"/);
});
test('shipping rules present correct regional preview and opt-out for free delivery',()=>{
 assert.match(settings,/Shipping rules preview/);assert.match(settings,/free_shipping_above:e.target.checked/);
 assert.match(settings,/Other states/);assert.match(settings,/thresholdApplied/);
 assert.match(checkout,/shippingReason==='threshold'/);
});
test('product names lose underline while view details retains it',()=>{
 assert.match(css,/Phase 75: state-assisted shipping/);assert.match(css,/product-info h3 a[\s\S]*?background:none!important/);
 assert.match(css,/nx48-recent-cta[\s\S]*?background-size:0% 2px!important/);
});
test('categories use inwards lavender fill and hide legacy accent streaks',()=>{
 assert.match(css,/\.nx48-department-track\{padding-bottom:7px;scrollbar-width:none/);
 assert.match(css,/\.nx66-department-accent\{display:none!important/);
 assert.match(css,/background-size:50% 100%,50% 100%!important/);
 assert.match(css,/nx37-category-bottom span:first-child::after/);
});
test('product image progress has reserved spacing outside picture',()=>{
 assert.match(css,/\.nx29-card-stage\{padding-bottom:16px!important/);
 assert.match(css,/\.nx29-card-stage \.nx56-card-preview-track\{/);
});
