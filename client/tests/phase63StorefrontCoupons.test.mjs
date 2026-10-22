import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('phase63 admin sidebar is independently scrollable',()=>{const css=read('../src/styles/phase63.css');assert.match(css,/\.admin-shell \.admin-sidebar\{[^}]*overflow-y:auto/);assert.match(css,/height:100dvh/);});
test('phase63 editable storefront route and public copy are connected',()=>{const app=read('../src/App.jsx');const header=read('../src/components/layout/StoreHeader.jsx');const home=read('../src/pages/customer/Home.jsx');assert.match(app,/\/admin\/storefront-copy/);assert.match(header,/storeCopy\?\.ribbonLabel/);assert.match(home,/copy\?\.featuredTitle/);assert.match(home,/copy\?\.categoryTitle/);});
test('phase63 coupon form offers product category and total targets',()=>{const coupon=read('../src/pages/admin/AdminCoupons.jsx');for(const text of ['Whole order','Selected products','Selected categories','Minimum eligible product price','Uses per customer','Coupon code'])assert.ok(coupon.includes(text));});
test('phase63 decorative arrows removed from homepage and department cards',()=>{const home=read('../src/pages/customer/Home.jsx');const categories=read('../src/components/customer/CategoryTile.jsx');assert.ok(!home.includes('name="right"'));assert.ok(!categories.includes('name="chevron-right"'));});
