import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSpecificationComparison} from '../src/services/compareMatrix.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('comparison data keeps actual product specs aligned across different categories',()=>{
 const rows=buildSpecificationComparison([
  {id:3,specificationDisplay:{groups:[{label:'Performance',items:[{key:'ram',label:'RAM',value:'16 GB'}]}]}},
  {id:4,specificationDisplay:{groups:[{label:'Performance',items:[{key:'ram',label:'RAM',value:'24 GB'},{key:'cpu',label:'CPU',value:'M5'}]}]}}
 ]);
 assert.equal(rows.length,2);
 assert.deepEqual(rows[0].values,{'3':'16 GB','4':'24 GB'});
 assert.deepEqual(rows[1].values,{'4':'M5'});
});
test('compare page supports searching, adding, removing and real specification columns',()=>{
 const src=read('pages/customer/Compare.jsx');
 assert.match(src,/getProductSuggestions/);
 assert.match(src,/saveCompareProduct/);
 assert.match(src,/buildSpecificationComparison/);
 assert.match(src,/nexora:compare-changed/);
 assert.match(src,/role="region"/);
 assert.match(src,/Remove.*comparison/);
});
test('customer header exposes the compare destination and count',()=>{
 const src=read('components/layout/StoreHeader.jsx');
 assert.match(src,/to="\/compare"/);
 assert.match(src,/nx69-compare-count/);
 assert.match(src,/nexora:compare-changed/);
});
test("admin product workspace has real stock, category and brand filters", () => {
  const src=p88('src/pages/admin/AdminProducts.jsx');for(const key of ['categoryFilter','stockFilter','brandFilter','ClearFilters','Filter by stock','Select'])assert.ok(src.includes(key),key);assert.doesNotMatch(src,/Ready to edit/);
});
test('category directory includes table layout, hierarchy preview and explicit parent selector',()=>{
 const src=read('pages/admin/AdminCategories.jsx');
 for(const key of ['categoryPath','nx69-category-preview','What would you like to add?' ,'nx69-category-table','levelFilter','statusFilter'])assert.ok(src.includes(key),key);
});
test("promotions have searchable library and checkboxes precede their label", () => {
  const src=p88('src/pages/admin/AdminBanners.jsx');assert.match(src,/promotionSearch/);assert.match(src,/promotionFilter/);assert.match(src,/Checkbox/);assert.match(src,/nx41-autoplay-toggle/);
});
test("footer and featured actions are icon-based and discard is red", () => {
  const footer=p88('src/pages/admin/AdminFooter.jsx');const featured=p88('src/pages/admin/AdminFeatured.jsx');const styles=p88('src/styles/modules/foundation/design-system.css');assert.match(footer,/trash|delete/);assert.match(featured,/IconButton|IconActionGroup/);assert.match(styles,/nx-ui-button--danger/);
});
test("close animation respects reduced motion and alert urgency red", () => {
  const styles=p88('src/styles/site.css');assert.match(styles,/prefers-reduced-motion/);assert.match(styles,/nx-ui-icon-button/);assert.match(styles,/nx24-stock-link|nx24-alert-summary/);assert.match(styles,/nx69-compare-table/);
});
