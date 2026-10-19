import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStorefrontCards} from '../services/storefrontVariantCards.js';
const product = {id:'7',name:'Notebook',price:'999',stock:3,imageUrl:'/parent.webp'};
const variants = [
  {id:'1',product_id:'7',attributes:{color:'Midnight',ram:'16GB',storage:'512GB'},price:'1250',mrp:'1500',stock:4,is_active:true},
  {id:'2',product_id:'7',attributes:{color:'Midnight',ram:'24GB',storage:'1TB'},price:'1550',mrp:'1800',stock:0,is_active:true},
  {id:'3',product_id:'7',attributes:{color:'Silver',ram:'16GB',storage:'512GB'},price:'1350',mrp:'1600',stock:2,is_active:true}
];
const media=[
  {id:'11',product_id:'7',media_type:'image',media_url:'/shared.webp',sort_order:0},
  {id:'12',product_id:'7',media_type:'image',media_url:'/midnight.webp',option_key:'color',option_value:'Midnight',sort_order:1,is_card_cover:true},
  {id:'13',product_id:'7',media_type:'image',media_url:'/silver.webp',option_key:'color',option_value:'Silver',sort_order:2,is_card_cover:false},
];
test('one admin parent appears as two public color cards, not six RAM/storage cards',()=>{
  const cards=makeStorefrontCards([product],variants,media);
  assert.equal(cards.length,2);
  assert.deepEqual(cards.map(c=>c.colorLabel),['Midnight','Silver']);
  assert.deepEqual(cards.map(c=>c.selectedVariantId),['1','3']);
  assert.deepEqual(cards.map(c=>c.price),['1250','1350']);
  assert.deepEqual(cards.map(c=>c.stock),[4,2]);
  assert.deepEqual(cards.map(c=>c.imageUrl),['/midnight.webp','/silver.webp']);
});
test('a parent without color variants remains one card',()=>{
 assert.equal(makeStorefrontCards([product],variants.map(v=>({...v,attributes:{ram:'16GB'}})),media).length,1);
 assert.equal(makeStorefrontCards([product],[],media)[0].imageUrl,'/parent.webp');
});
test('inactive variants are ignored, no image from another color leaks',()=>{
 const cards=makeStorefrontCards([product],variants.map(v=>v.id==='3'?{...v,is_active:false}:v),media);
 assert.equal(cards.length,1); assert.equal(cards[0].imageUrl,'/midnight.webp');
});
