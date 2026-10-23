import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=path.resolve(root,'../../server');
const serverRead=p=>fs.readFileSync(path.join(server,p),'utf8');
test('Phase 71 stylesheet loads after Phase 70 without removing earlier features',()=>{
 const s=read('main.jsx');assert.ok(s.indexOf('phase71.css')>s.indexOf('phase70.css'));
 for(const p of ['styles/phase70.css','styles/phase69.css','styles/phase71.css'])assert.ok(fs.existsSync(path.join(root,p)));
});
test('dashboard low-stock cards use stable product and SKU columns',()=>{
 assert.match(read('pages/admin/AdminDashboard.jsx'),/nx71-inventory-health/);
 const css=read('styles/phase71.css');assert.match(css,/grid-template-columns:minmax\(0,1fr\) auto/);
 assert.match(css,/\.nx71-stock-detail small/);
});
test('featured products refresh the available list without reload and support server-side pagination',()=>{
 const s=read('pages/admin/AdminFeatured.jsx');for(const term of ['setRevision(x=>x+1)','setPage(1)','nx71-featured-table','nx71-featured-card','searchFeaturedCandidates','categoryOptions'])assert.ok(s.includes(term),term);
 const controller=serverRead('controllers/featuredController.js');assert.match(controller,/COUNT\(\*\)::integer AS total/);assert.match(controller,/LIMIT \$3 OFFSET \$4/);
});
test('full catalogue is server-paged and filtered, dashboard still receives default API',()=>{
 const s=serverRead('controllers/productController.js');assert.match(s,/req\.query\.paged==='1'/);assert.match(s,/allowedSort/);
 assert.match(read('pages/admin/AdminProducts.jsx'),/nx71-product-pagination/);
 assert.match(read('services/productService.js'),/filters=null/);
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
test('sale off state has no line-through',()=>{
 assert.match(read('styles/phase71.css'),/nx69-sale-action\.nx70-sale-off\{text-decoration:none!important/);
});
test('rounded half-star view uses consistent SVG and half-width clipping',()=>{
 const s=read('components/customer/RatingStars.jsx');assert.match(s,/StarShape/);assert.match(s,/index-\.5/);assert.match(s,/nx71-star-fill/);
});
test('CTA hover contrast and reflection respect reduced motion',()=>{
 const s=read('styles/phase71.css');assert.match(s,/\.nx46-welcome-actions a\+a:hover/);assert.match(s,/\.admin-primary-action:is\(:hover,:focus-visible\)/);assert.match(s,/@media\(prefers-reduced-motion:reduce\)/);
});
