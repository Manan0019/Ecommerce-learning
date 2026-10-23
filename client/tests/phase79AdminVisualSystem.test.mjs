import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL(`../${p}`,import.meta.url),'utf8');
const css=file('src/styles/modules/admin/metric-cards-and-layout.css');
const pages={
  featured:file('src/pages/admin/AdminFeatured.jsx'),
  banners:file('src/pages/admin/AdminBanners.jsx'),
  dashboard:file('src/pages/admin/AdminDashboard.jsx'),
  products:file('src/pages/admin/AdminProducts.jsx'),
  orders:file('src/pages/admin/AdminOrders.jsx'),
  delivery:file('src/pages/admin/AdminDelivery.jsx'),
  inventory:file('src/pages/admin/AdminInventory.jsx'),
};

test('Featured catalogue shows exactly one explicit search icon and cancels the legacy CSS icon',()=>{
  assert.match(pages.featured, /className="nx71-search-field"><UiIcon name="search"/);
  assert.match(css, /\.nx71-search-field input\[type="search"\]/);
  assert.match(css,/background-image:none!important/);
  assert.match(css,/padding-left:0!important/);
});
test('Promotion Studio groups the selection, rotation, interval and save button',()=>{
  assert.match(pages.banners,/className="nx39-layout-panel nx79-banner-layout"/);
  assert.match(pages.banners,/className="nx79-layout-controls"/);
  assert.match(pages.banners,/<label className="nx41-autoplay-toggle"><input type="checkbox"/);
  assert.match(pages.banners,/onClick=\{saveDisplay\}/);
  assert.match(pages.banners,/<PromotionLayoutPreview count=\{homeCount\}\/>/);
  assert.match(css,/\.nx79-layout-controls\{\s*display:grid/);
  assert.match(css,/@media\(max-width:680px\)/);
});
test('One shared metric palette styles all six admin sections without duplicating page-specific colors',()=>{
  for (const name of ['.nx-admin-summary','.nx39-metrics','.nx46-metrics','.nx24-alert-summary','.nx46-dashboard-priorities']){
    assert.ok(css.includes(name),`missing metric selector ${name}`);
  }
  for(const name of ['dashboard','products','orders','delivery','inventory','banners']){
    assert.match(pages[name],/(nx-admin-summary|nx39-metrics|nx46-metrics|nx24-alert-summary)/);
  }
  for (const tone of ['purple','blue','amber','mint'])assert.match(css,new RegExp(`--nx79-card-${tone}:`));
  assert.match(css, /\.nx24-alert-summary>div:nth-child\(2\)/);
});
test('Visual changes keep product/admin navigation and promotion saving enabled',()=>{
  assert.match(pages.dashboard,/className="nx46-metric-link"/);
  assert.match(pages.products,/getAdminProducts/);
  assert.match(pages.delivery,/getAdminAssignments/);
  assert.match(pages.orders,/updateCodStatus/);
  assert.match(pages.banners,/setPromotionDisplayCount\(homeCount,homeAutoplay,homeRotateSeconds\)/);
});
test('Accessibility and reduced-motion remain supported',()=>{
  assert.match(pages.banners,/aria-label="Homepage promotion layout"/);
  assert.match(pages.banners,/aria-label="Automatically rotate promotion banners"/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
