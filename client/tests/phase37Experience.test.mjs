import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = name => readFileSync(new URL('../src/' + name, import.meta.url), 'utf8');
const store = new Map();
globalThis.window = {
  localStorage: { getItem:k => store.get(k) ?? null, setItem:(k,v) => store.set(k,v), removeItem:k => store.delete(k) },
  dispatchEvent:() => {}
};
globalThis.Event = class Event { constructor(type) { this.type = type; } };
const { readRecentlyViewed, rememberProduct, clearRecentlyViewed } = await import('../src/services/recentlyViewed.js');

test('recently viewed saves at most eight unique public product records', () => {
  clearRecentlyViewed();
  for (let i=1;i<=12;i++) rememberProduct({ id:String(i),name:`Product ${i}`,imageUrl:'/uploads/products/x.webp' });
  assert.equal(readRecentlyViewed().length, 8);
  assert.equal(readRecentlyViewed()[0].id, '12');
  rememberProduct({id:'7',name:'Updated 7'});
  assert.equal(readRecentlyViewed()[0].name, 'Updated 7');
  assert.equal(readRecentlyViewed().filter(p => p.id==='7').length, 1);
});
test('recently viewed safely ignores malformed and illegal product ids', () => {
  rememberProduct({id:'anything',name:'Injection'});
  assert.equal(readRecentlyViewed().length, 8);
  store.set('nexora_recently_viewed_v1','{invalid');
  assert.deepEqual(readRecentlyViewed(),[]);
  clearRecentlyViewed();
  assert.equal(readRecentlyViewed().length,0);
});
test('promotion grid shows multiple panels without changing banner destination', () => {
  const t = src('components/customer/PromotionCarousel.jsx');
  assert.match(t, /Math\.min\(banners\.length,\s*position\s*===\s*"home"\s*\?\s*homeVisibleCount\s*:\s*2\)/);
  assert.match(t, /setHomeVisibleCount/);
  assert.match(t, /banner\.linkUrl/);
  assert.match(t, /showText === false/);
  assert.match(t, /getBanners\(position/);
  assert.match(t, /overflow|scrollTo/);
});
test('customer signup no longer accepts a profile image', () => {
  const signup = src('pages/auth/CustomerSignup.jsx');
  assert.doesNotMatch(signup, /type="file"|profileImage/);
  const api = readFileSync(new URL('../../server/routes/authRoutes.js',import.meta.url),'utf8');
  assert.doesNotMatch(api, /profileImageUrl: user\.profile_image_url/);
  assert.match(api, /pending\.mobile_number,\s*null,\s*pending\.password_hash/);
});
test('account hub is connected to existing orders, addresses and wishlist', () => {
  const profile = src('pages/customer/CustomerDashboard.jsx');
  for (const path of ['/orders','/addresses','/wishlist']) assert.ok(profile.includes(path));
  assert.match(profile,/updateCustomerPassword/);
  assert.match(profile,/updateCustomerName/);
});
test('phase37 styling follows phase36 with mobile layouts', () => {
  const app = src('App.jsx');
  assert.ok(app.indexOf('phase36.css') < app.indexOf('phase37.css'));
  const css=src('styles/phase37.css');
  assert.match(css, /nx37-promotion-grid/);
  assert.match(css, /max-width:720px/);
  assert.match(css, /nx37-category-card/);
  assert.match(css, /prefers-reduced-motion/);
});

test('render errors have a visible recovery path and navigation restores scroll', () => {
  const boundary=src('components/common/StoreErrorBoundary.jsx');
  assert.match(boundary,/getDerivedStateFromError/);
  assert.match(boundary,/Try again/);
  const route=src('components/common/RouteExperience.jsx');
  assert.match(route,/useLocation/);
  assert.match(route,/pathname/);
});
