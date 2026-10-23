import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quickViewPictures } from '../src/components/customer/quickViewGallery.js';
const root=resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const source=path=>readFileSync(resolve(root,path),'utf8');
const media=[
  {id:1,type:'image',url:'/shared.jpg',order:2},
  {id:2,type:'image',url:'/blue.jpg',variantId:10,order:1},
  {id:3,type:'image',url:'/black.jpg',variantId:11,order:3},
  {id:4,type:'image',url:'/blue.jpg',variantId:12,order:4},
  {id:5,type:'image',url:'/red.jpg',optionKey:'color',optionValue:'Red',order:5},
  {id:6,type:'video',url:'/promo.mp4',order:6},
];
test('quick view without selection browses all unique product gallery photographs in saved order',()=>{
 const pics=quickViewPictures(media,null,true,'/cover.jpg');
 assert.deepEqual(pics.map(p=>p.url),['/blue.jpg','/shared.jpg','/black.jpg','/red.jpg']);
});
test('selected SKU uses only its own photos plus shared ones, not a different colour',()=>{
 const pics=quickViewPictures(media,{id:10,attributes:{color:'Blue'}},true,'/cover.jpg');
 assert.deepEqual(pics.map(p=>p.url),['/blue.jpg','/shared.jpg']);
 const missing=quickViewPictures(media,{id:99,attributes:{color:'Purple'}},true,'/cover.jpg');
 assert.deepEqual(missing.map(p=>p.url),['/shared.jpg']);
});
test('cover is neutral fallback before choosing options, never after choosing an unsupported configuration',()=>{
 assert.deepEqual(quickViewPictures([],null,true,'/cover.jpg').map(p=>p.url),['/cover.jpg']);
 assert.deepEqual(quickViewPictures([],{id:5,attributes:{}},true,'/cover.jpg'),[]);
});
test('quick view resolves gallery through helper and resets index when variant changes',()=>{
 const src=source('components/customer/ProductQuickView.jsx');
 assert.match(src,/quickViewPictures\(media,selected,variants\.length>0,data\.imageUrl\)/);
 assert.match(src,/setSelectedId\(id\);setImageIndex\(0\)/);
 assert.match(src,/nx66-gallery-context/);
});
test('decorative catalogue arrows are gone while clickable controls and current category states remain',()=>{
 const src=source('pages/customer/ProductList.jsx');
 assert.match(src,/aria-pressed=\{isActive\}/);
 assert.doesNotMatch(src,/nx49-department-arrow/);
 assert.match(src,/nx66-department-accent/);
 const card=source('components/common/ProductCard.jsx');
 assert.match(card,/name="chevron-left"/);
 assert.match(card,/name="chevron-right"/);
 assert.match(card,/nx66-product-price/);
});
test('timeline has aligned rail and consistent numeric typography with reduced-motion safeguards',()=>{
 const css=source('styles/site.css');
 assert.match(css,/\.nx38-history ol::before/);
 assert.match(css,/\.nx38-history ol li::before/);
 assert.match(css,/font-variant-numeric:tabular-nums/);
 assert.match(css,/prefers-reduced-motion:reduce/);
});
