import test from 'node:test';
import assert from 'node:assert/strict';
import { selectOrderImage, attachOrderImages } from '../services/orderImages.js';

const pictures=[
 {id:1,product_id:9,variant_id:null,option_key:null,option_value:null,media_url:'/uploads/products/generic.webp',sort_order:2,is_card_cover:false},
 {id:2,product_id:9,variant_id:11,option_key:null,option_value:null,media_url:'/uploads/products/blue.webp',sort_order:1,is_card_cover:true},
 {id:3,product_id:9,variant_id:12,option_key:null,option_value:null,media_url:'/uploads/products/red.webp',sort_order:0,is_card_cover:true},
 {id:4,product_id:9,variant_id:null,option_key:'Color',option_value:'Blue',media_url:'/uploads/products/blue-alt.webp',sort_order:0,is_card_cover:true},
];
test('selected SKU picture wins over generic and other colors',()=>{
 assert.equal(selectOrderImage({productId:'9',variantId:'11',attributes:{Color:'Blue'}},pictures),'/uploads/products/blue.webp');
});
test('selected color picture wins when there is no exact SKU photo',()=>{
 assert.equal(selectOrderImage({productId:'9',variantId:'23',attributes:{colour:'blue'}},pictures),'/uploads/products/blue-alt.webp');
});
test('an unselected color is never used for another SKU',()=>{
 assert.equal(selectOrderImage({productId:'9',variantId:'50',attributes:{Color:'Green'}},pictures),'/uploads/products/generic.webp');
 assert.equal(selectOrderImage({productId:'3',variantId:'50',attributes:{Color:'Green'}},pictures,'/uploads/products/old.webp'),'/uploads/products/old.webp');
});
test('legacy order images preserve snapshots, fetch fallback only for missing',async()=>{
 const seen=[];
 const fake={query:async(sql,params)=>{
  seen.push(sql);
  if(sql.includes('FROM product_media'))return {rows:pictures};
  return {rows:[{id:9,image_url:null}]};
 }};
 const rows=[{productId:'9',variantId:'11',attributes:{Color:'Blue'},imageUrl:null},{productId:'9',variantId:'12',attributes:{Color:'Red'},imageUrl:'/uploads/products/old-snapshot.webp'}];
 const resolved=await attachOrderImages(fake,rows,{preserveSnapshots:true});
 assert.equal(resolved[0].imageUrl,'/uploads/products/blue.webp');
 assert.equal(resolved[1].imageUrl,'/uploads/products/old-snapshot.webp');
 assert.equal(seen.length,2);
});
test('no image fetch needed when all historical order snapshots already exist',async()=>{
 const rows=[{productId:'9',imageUrl:'/uploads/products/retained.webp'}];
 const result=await attachOrderImages({query(){throw Error('unnecessary query')}},rows,{preserveSnapshots:true});
 assert.equal(result,rows);
});
