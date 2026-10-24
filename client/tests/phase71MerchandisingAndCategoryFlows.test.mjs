import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=path.resolve(root,'../../server');
const serverRead=p=>fs.readFileSync(path.join(server,p),'utf8');
test('Phase 71 stylesheet loads after Phase 70 without removing earlier features',()=>{
 const s=read('main.jsx');assert.match(s,/styles\/site\.css/);
 const css=read('styles/site.css');
 assert.ok(css.indexOf('legacy layer 70.css') < css.indexOf('legacy layer 71.css'));
 assert.equal(fs.readdirSync(path.join(root,'styles')).filter(name=>name.endsWith('.css')).join(','),'site.css');
});
test('dashboard low-stock cards use stable product and SKU columns',()=>{
 assert.match(read('pages/admin/AdminDashboard.jsx'),/nx71-inventory-health/);
 const css=read('styles/site.css');assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto/);
 assert.match(css,/\.nx71-stock-detail small/);
});
test('featured products refresh the available list without reload and support server-side pagination',()=>{
 const s=read('pages/admin/AdminFeatured.jsx');for(const term of ['setRevision(x=>x+1)','setPage(1)','nx71-featured-table','nx71-featured-card','searchFeaturedCandidates','categoryOptions'])assert.ok(s.includes(term),term);
 const controller=serverRead('controllers/featuredController.js');assert.match(controller,/COUNT\(\*\)::integer AS total/);assert.match(controller,/LIMIT \$3 OFFSET \$4/);
});
test("full catalogue is server-paged and filtered, dashboard still receives default API", () => {
  const controller=p88('server/controllers/productController.js');const page=p88('src/pages/admin/AdminProducts.jsx');assert.match(controller,/req\.query\.paged==='1'/);assert.match(controller,/allowedSort/);assert.match(page,/<Pagination/);assert.match(page,/pageSize=\{10\}/);assert.match(p88('src/services/productService.js'),/filters=null/);
});
test('category creation requires selected depth and exact parent path',()=>{
 const create=read('pages/admin/AdminCategories.jsx');assert.match(create,/setCreatingLevel/);assert.match(create,/categoryDepth\(categories,parentId\)!==creatingLevel-1/);
 assert.match(create,/CategoryPathSelector/);
 const form=read('components/admin/CategoryPicker.jsx');assert.match(form,/CategoryPathSelector/);
});
test('file upload field is shared and native input is still accessible',()=>{
 const s=read('components/admin/FileUploadField.jsx');assert.match(s,/type="file"/);assert.match(s,/htmlFor=\{id\}/);assert.match(s,/onDrop/);
 for(const p of ['pages/admin/AddProduct.jsx','pages/admin/AdminCategories.jsx','components/admin/ProductEditorWorkspace.jsx'])assert.match(read(p),/FileUploadField/);
});
test("sale off state has no line-through", () => {
  const style=p88('src/styles/site.css');const button=p88('src/components/ui/Button.jsx');assert.match(style,/nx69-sale-action|nx70-sale-off/);assert.match(button,/nx-ui-button/);assert.match(p88('src/styles/modules/foundation/design-system.css'),/text-decoration:\s*none/);
});
test('rounded half-star view uses consistent SVG and half-width clipping',()=>{
 const s=read('components/customer/RatingStars.jsx');assert.match(s,/StarShape/);assert.match(s,/index-\.5/);assert.match(s,/nx71-star-fill/);
});
test("CTA hover contrast and reflection respect reduced motion", () => {
  const style=p88('src/styles/site.css');assert.match(style,/\.nx46-welcome-actions/);assert.match(style,/nx-ui-button--primary|admin-primary-action/);assert.match(style,/prefers-reduced-motion/);
});
