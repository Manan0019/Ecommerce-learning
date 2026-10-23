import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../src');
const read=(file)=>readFileSync(resolve(root,file),'utf8');
const style=read('styles/site.css');
test('Nexora uses a single source stylesheet without phase files or duplicate imports',()=>{
 assert.deepEqual(readdirSync(resolve(root,'styles')).filter(n=>n.endsWith('.css')),['site.css']);
 assert.match(read('main.jsx'),/import ['"]\.\/styles\/site\.css['"]/);
 assert.doesNotMatch(read('App.jsx'),/\.css['"]/);
 assert.doesNotMatch(read('components/customer/RelatedProducts.jsx'),/\.css['"]/);
});
test('brand and footer uploaders show chosen filename in accessible custom picker',()=>{
 const uploader=read('components/admin/FileUploadField.jsx');
 assert.match(uploader,/inputRef\.current/);
 assert.match(uploader,/disabled=\{disabled\}/);
 assert.match(uploader,/selection === undefined \? localNames : selection/);
 for(const file of ['pages/admin/AdminBranding.jsx','pages/admin/AdminFooter.jsx']){
  const source=read(file);
  assert.match(source,/FileUploadField/);
  assert.doesNotMatch(source,/<input[^>]*type="file"/);
 }
});
test('danger buttons have red affordance and hover, and hover underline does not cut through clamped text',()=>{
 assert.match(style,/--nx-danger:#be123c/);
 assert.match(style,/background:#bb1940!important/);
 assert.match(style,/\.admin-product-cell>div:last-child::after/);
 assert.match(style,/background-image:none!important;text-decoration:none!important/);
});
test('close controls and image navigation animate without hiding icon and honour reduced-motion',()=>{
 assert.match(style,/transform:rotate\(90deg\) scale\(1\.08\)!important/);
 assert.match(style,/\.nx57-gallery-arrows button/);
 assert.match(style,/\.nx29-card-arrows button/);
 assert.match(style,/@media\(prefers-reduced-motion:reduce\)/);
});
