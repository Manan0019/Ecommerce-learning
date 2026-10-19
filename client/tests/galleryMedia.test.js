import test from 'node:test';
import assert from 'node:assert/strict';
import {visibleProductMedia} from '../src/components/customer/galleryMedia.js';
const items=[
 {id:'s1',order:2}, {id:'c1',order:0,optionKey:'color',optionValue:'Midnight'},
 {id:'c2',order:1,optionKey:'color',optionValue:'Midnight'}, {id:'s2',order:4},
 {id:'c3',order:3,optionKey:'color',optionValue:'Midnight'},
 {id:'silver',order:1,optionKey:'color',optionValue:'Silver'},
 {id:'sku',order:5,variantId:'80'}
];
test('shared and color images interleave by GLOBAL order',()=>{
 assert.deepEqual(visibleProductMedia(items,'80',{color:'Midnight'}).map(x=>x.id), ['c1','c2','s1','c3','s2','sku']);
});
test('other color and SKU media do not leak',()=>{
 assert.deepEqual(visibleProductMedia(items,'81',{color:'Silver'}).map(x=>x.id),['silver','s1','s2']);
});
