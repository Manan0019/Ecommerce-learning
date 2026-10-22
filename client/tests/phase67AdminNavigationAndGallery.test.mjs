import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=(name)=>fs.readFileSync(path.join(root,name),'utf8');

test('admin-to-admin routes avoid the shared forced scroll-to-top behavior',()=>{
  const src=read('components/common/RouteExperience.jsx');
  assert.match(src,/last\?\.startsWith\("\/admin"\) && pathname\.startsWith\("\/admin"\)/);
  assert.match(src,/return;[\s\S]*window\.scrollTo/);
});
test('admin layout reuses validated session and checks authentication again',()=>{
  const src=read('components/layout/AdminLayout.jsx');
  assert.match(src,/lastVerifiedAdmin/);
  assert.match(src,/getAdmin\(controller\.signal\)/);
  assert.match(src,/lastVerifiedAdmin = null/);
});
test('admin sidebar restores its own scroll between pages',()=>{
  const src=read('components/layout/AdminSidebar.jsx');
  assert.match(src,/rememberedAdminNavScroll/);
  assert.match(src,/scrollRef\.current\.scrollTop = rememberedAdminNavScroll/);
  assert.match(src,/onScroll=\{event => \{/);
});
test('dashboard order rows are keyboard-operable and manage orders without a route change',()=>{
  const dash=read('pages/admin/AdminDashboard.jsx');
  const orders=read('pages/admin/AdminOrders.jsx');
  assert.match(dash,/className="nx67-order-table-row"/);
  assert.match(dash,/className="nx67-dashboard-order-open"/);
  assert.match(dash,/setOpenDashboardOrder\(o.id\)/);
  assert.match(dash,/AdminOrders embeddedOrderId=\{openDashboardOrder\}/);
  assert.match(orders,/onOrdersChanged\?\.\(\)/);
  assert.match(orders,/embeddedOrderId && loading/);
  assert.match(orders,/onEmbeddedClose\?\.\(\)/);
  assert.match(orders,/OrderActionDialog/);
  assert.match(orders,/DeliveryExecutivePicker/);
});
test('gallery arrows are restored on cards only and manual navigation pauses preview timer',()=>{
  const src=read('components/common/ProductCard.jsx');
  const css=read('styles/phase67.css');
  assert.match(src,/name="chevron-left"/);
  assert.match(src,/name="chevron-right"/);
  assert.match(src,/function choose\(index\) \{\s*stopPreview\(\)/);
  assert.match(css,/\.nx29-preview-card \.nx29-card-arrows button/);
  assert.match(css,/border-radius:50%!important/);
});
test('clear viewed items offers accessible hover animation and still clears list immediately',()=>{
  const src=read('components/customer/RecentlyViewed.jsx');
  const css=read('styles/phase67.css');
  assert.match(src,/nx67-clear-history/);
  assert.match(src,/clearRecentlyViewed\(\); setItems\(\[\]\);/);
  assert.match(css,/nx67-clear-history::after/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});
