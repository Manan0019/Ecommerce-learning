import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const src = (name) => readFileSync(new URL(name,import.meta.url),'utf8');
test('product admin table navigates from row, image, name, and preview link',()=>{
 const p=src('../src/pages/admin/AdminProducts.jsx');
 assert.match(p,/className="nx50-product-row"/);
 assert.match(p,/onClick=\{event => openProductPreview\(event, product\)\}/);
 assert.match(p,/event.target.closest\("a, button, input, select, textarea"\)/);
 assert.match(p,/to=\{`\/admin\/products\/\$\{product.id\}\/preview`\}/);
 assert.match(p,/setEditor\(\{ id: product.id, name: product.name \}\)/);
});
test('shared editor popup keeps original product editor and tabs',()=>{
 const p=src('../src/components/admin/AdminProductEditDialog.jsx');
 assert.match(p,/\<Modal/); assert.match(p,/ProductEditorWorkspace/);assert.match(p,/initialTab=\{initialTab\}/);
 const editor=src('../src/components/admin/ProductEditorWorkspace.jsx');
 for (const tab of ['details','variants','gallery']) assert.match(editor,new RegExp(`id: "${tab}"`));
});
test('admin preview gives product edit control and does not add private products to recent browsing',()=>{
 const p=src('../src/pages/customer/ProductDetails.jsx');
 assert.match(p,/onClick=\{\(\)=>setEditTab\("details"\)\}/);
 assert.match(p,/adminPreview&&editTab&&<AdminProductEditDialog/);
 assert.match(p,/if \(!adminPreview\) rememberProduct\(data.product\)/);
 assert.match(p,/\{!adminPreview&&<>\<WishlistButton/);
 assert.match(p,/setPreviewVersion\(old => old \+ 1\)/);
});
test('stock editor, featured image previews and backward-compatible edit route',()=>{
 const inv=src('../src/pages/admin/AdminInventory.jsx');
 assert.match(inv,/Update stock <UiIcon/);assert.match(inv,/initialTab=\{editor.tab\}/);
 assert.match(inv,/AdminProductEditDialog/);
 const featured=src('../src/pages/admin/AdminFeatured.jsx');
 assert.match(featured,/nx50-feature-thumb/);assert.match(featured,/Preview \$\{item.name\}/);
 const legacy=src('../src/pages/admin/EditProduct.jsx');
 assert.match(legacy,/preview\?edit=\$\{tab\}/);
});
test('Phase 50 styles and common pencil icon loaded',()=>{
 assert.match(src('../src/App.jsx'),/phase50.css/);
 assert.match(src('../src/components/common/UiIcon.jsx'),/edit: <\>/);
 assert.match(src('../src/styles/phase50.css'),/nx50-preview-toolbar/);
});
