import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { guardNumberKey, guardNumericPaste, guardNumericBeforeInput } from '../src/components/admin/formValidation.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../src');
const load=(p)=>fs.readFileSync(path.join(root,p),'utf8');

test('category directory navigates through React Router instead of reloading the application',()=>{
 const body=load('pages/customer/Categories.jsx');
 assert.match(body,/import \{ Link \} from "react-router-dom"/);
 assert.match(body,/to=\{`\/categories\/\$\{encodeURIComponent\(child.slug\)\}`\}/);
 assert.doesNotMatch(body,/href=\{`\/categories\//);
});
test('category artwork has a stable contained frame and image loading fallback',()=>{
 const jsx=load('components/customer/CategoryArtwork.jsx');
 const css=load('styles/site.css');
 assert.match(jsx,/onError=\{\(\) => setFailedUrl\(url\)\}/);
 assert.match(css,/\.nx17-subcategory-shelf a>\.nx34-category-artwork/);
 assert.match(css,/object-fit:contain/);
});
test('wishlist is an icon-only labelled action, not visible Wishlist text',()=>{
 const src=load('components/layout/StoreHeader.jsx');
 assert.match(src,/aria-label="View wishlist"/);
 assert.match(src,/<HeartIcon\s*\/>/);
 assert.doesNotMatch(src,/\<span\>Wishlist\<\/span\>/);
});
test('admin required marker follows label text, and modal has consistent form capture',()=>{
 const add=load('pages/admin/AddProduct.jsx');
 const modal=load('components/common/Modal.jsx');
 const style=load('styles/site.css');
 assert.match(add,/Product name <b className="nx34-required"/);
 assert.match(add,/Full description <b className="nx34-required"/);
 assert.match(modal,/onPasteCapture=\{guardNumericPaste\}/);
 assert.match(style,/content:none!important/);
});
test('non numeric paste and exponent/negative typing are rejected on number inputs',()=>{
 for(const invalid of ['abc','12e4','-8','1,999','45x']){
  let prevented=false;guardNumericPaste({target:{tagName:'INPUT',type:'number',step:'0.01'},clipboardData:{getData:()=>invalid},preventDefault(){prevented=true}});
  assert.equal(prevented,true,invalid);
 }
 let blocked=false;
 guardNumericBeforeInput({target:{tagName:'INPUT',type:'number',step:'1'},data:'abc',nativeEvent:{isComposing:false},preventDefault(){blocked=true}});
 assert.equal(blocked,true);
 blocked=false;
 guardNumberKey({target:{tagName:'INPUT',type:'number',step:'0.01'},key:'e',preventDefault(){blocked=true}});
 assert.equal(blocked,true);
});
test('order lines expose name, quantity and line total separately, and subtotal is correctly named',()=>{
 const src=load('pages/admin/AdminOrders.jsx');
 assert.match(src,/nx34-order-line-info/);
 assert.match(src,/Qty \{item.quantity\}/);
 assert.match(src,/money\(item.lineTotal/);
 assert.match(src,/Items subtotal/);
 assert.doesNotMatch(src,/Items \{money\(o.subtotal\)\}/);
});
test('inventory notification refreshes on a timer, focus and explicit stock changes',()=>{
 const src=load('components/layout/AdminLayout.jsx');
 assert.match(src,/window.setInterval\(refresh, 60000\)/);
 assert.match(src,/nexora:inventory-updated/);
 const order=load('pages/admin/AdminOrders.jsx');
 assert.match(order,/dispatchEvent\(new Event\("nexora:inventory-updated"\)\)/);
});
test('public category cache is invalidated after every successful admin category mutation',()=>{
 const src=load('services/categoryService.js');
 const invalidations=src.match(/invalidatePublicCategoryCache\(\); return result;/g) || [];
 assert.equal(invalidations.length,4);
});
