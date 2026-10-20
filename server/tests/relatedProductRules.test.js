import test from 'node:test';
import assert from 'node:assert/strict';
import { relatedGroup, rankRelatedCandidates, bestRelatedCover } from '../services/relatedProductRules.js';

test('nearest category outranks same brand from unrelated category', () => {
  const data = [
    {id:'7',categoryDistance:null,brandMatch:true,stock:10},
    {id:'2',categoryDistance:2,brandMatch:false,stock:3},
    {id:'3',categoryDistance:0,brandMatch:false,stock:4},
  ];
  assert.deepEqual(rankRelatedCandidates(data,'1').map(x=>x.id),['3','2','7']);
  assert.equal(relatedGroup(data[0]),3);
});

test('stock availability ranks ahead within the same relevance group', () => {
  const data = [
    {id:'2',categoryDistance:0,stock:0},
    {id:'3',categoryDistance:0,stock:2},
  ];
  assert.deepEqual(rankRelatedCandidates(data,'1').map(x=>x.id),['3','2']);
});

test('no self-recommendations or duplicated products; bounded output', () => {
  const products = Array.from({length:20},(_,i)=>({id:String(i+1),categoryDistance:0,stock:1}));
  const out=rankRelatedCandidates([...products,products[3]],'1',8);
  assert.equal(out.length,8);
  assert.equal(new Set(out.map(x=>x.id)).size,8);
  assert.ok(!out.some(x=>x.id==='1'));
});

test('image cover excludes a different variant or colour', () => {
  const card={imageUrl:'/old-cover.jpg',selectedVariantId:'11',selectedAttributes:{color:'Blue'}};
  const media=[
    {id:1,media_type:'image',media_url:'/red.jpg',option_key:'color',option_value:'Red',sort_order:0},
    {id:2,media_type:'image',media_url:'/blue.jpg',option_key:'color',option_value:'Blue',sort_order:1},
    {id:3,media_type:'image',media_url:'/other.jpg',variant_id:12,sort_order:0},
  ];
  assert.equal(bestRelatedCover(card,media),'/blue.jpg');
});

test('shared gallery is a valid fallback and simple products work', () => {
 const card={id:'5',imageUrl:'/parent.jpg'};
 assert.equal(bestRelatedCover(card,[{id:1,media_type:'image',media_url:'/shared.jpg',sort_order:0}]),'/shared.jpg');
 assert.equal(bestRelatedCover(card,[]),'/parent.jpg');
});

test('specific SKU cover takes precedence over a marked shared image', () => {
 const card={selectedVariantId:'11',selectedAttributes:{color:'Blue'},imageUrl:'/old.jpg'};
 const media=[
  {id:1,media_type:'image',media_url:'/shared.jpg',is_card_cover:true,sort_order:0},
  {id:2,media_type:'image',media_url:'/exact.jpg',variant_id:11,sort_order:2},
 ];
 assert.equal(bestRelatedCover(card,media),'/exact.jpg');
});
