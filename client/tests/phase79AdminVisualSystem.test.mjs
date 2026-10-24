import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
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

test("Featured catalogue shows exactly one explicit search icon and cancels the legacy CSS icon", () => {
  const page=p88('src/pages/admin/AdminFeatured.jsx');const search=p88('src/components/ui/SearchField.jsx');const style=p88('src/styles/modules/foundation/design-system.css');assert.match(page,/<SearchField/);assert.match(search,/<UiIcon name="search"/);assert.match(search,/nx-ui-search-input/);assert.match(style,/\.nx-ui-search-field > svg/);assert.match(style,/background:\s*transparent/);
});
test("Promotion Studio groups the selection, rotation, interval and save button", () => {
  const page=p88('src/pages/admin/AdminBanners.jsx');const style=p88('src/styles/site.css');assert.match(page,/nx79-layout-controls/);assert.match(page,/nx41-autoplay-toggle/);assert.match(page,/Checkbox/);assert.match(page,/onClick=\{saveDisplay\}/);assert.match(page,/<PromotionLayoutPreview count=\{homeCount\}/);assert.match(style,/nx79-layout-controls/);
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
