import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync,existsSync } from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../src');
const file=relative=>readFileSync(resolve(root,relative),'utf8');
test('app includes delivery dashboard source so App import resolves',()=>{
  assert.ok(existsSync(resolve(root,'pages/delivery/DeliveryDashboard.jsx')));
  assert.match(file('App.jsx'),/import DeliveryDashboard from ['"]\.\/pages\/delivery\/DeliveryDashboard['"]/);
  assert.match(file('App.jsx'),/styles\/phase48\.css/);
});
test('catalogue keeps one global header search, not duplicated search input',()=>{
  assert.match(file('components/layout/StoreHeader.jsx'),/id="nav-search-input"/);
  assert.doesNotMatch(file('pages/customer/ProductList.jsx'),/id="catalogue-search"|<CatalogueSearch/);
  assert.match(file('pages/customer/ProductList.jsx'),/nx48-departments/);
});
test('category explorer respects active root/descendant selection and preserves category navigation',()=>{
  const src=file('pages/customer/ProductList.jsx');
  assert.match(src,/rootCategories\(categories\)/);
  assert.match(src,/ancestors\.some/);
  assert.match(src,/chooseCategory\(item\.slug\)/);
});
test('media carousel has actual prev next controls and non-dot slide index',()=>{
  const src=file('components/common/ProductCard.jsx');
  assert.match(src,/nx48-card-image-index/);
  assert.doesNotMatch(src,/nx29-card-dots/);
  assert.match(src,/choose\(active - 1\)/);
  assert.match(src,/choose\(active \+ 1\)/);
});
test('recent history is accessible in separated product cards and has no technical storage note',()=>{
 const src=file('components/customer/RecentlyViewed.jsx');
 assert.match(src,/nx48-recent-image/);
 assert.match(src,/nx48-recent-copy/);
 assert.doesNotMatch(src,/Saved only in this browser/);
});
test('outdated demo-only claims on About and Contact are removed',()=>{
 assert.doesNotMatch(file('pages/public/About.jsx'),/Orders, payment collection, delivery and reviews are not enabled/);
 assert.doesNotMatch(file('pages/public/Contact.jsx'),/checkout and payments are intentionally unavailable/);
});
test('phase48 style has responsive search/department/media/recent sections',()=>{
 const css=file('styles/phase48.css');
 for(const c of ['.nx-nav-search','.nx48-departments','.nx48-card-image-index','.nx48-recent-card','@media(max-width:580px)'])assert.ok(css.includes(c),c);
});
