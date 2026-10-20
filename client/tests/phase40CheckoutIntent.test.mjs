import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutIntentKey, checkoutAcceptable } from '../src/services/checkoutIntent.js';
const a=[{productId:'7',variantId:'12',quantity:1},{productId:'8',variantId:null,quantity:2}];
const address={fullName:'Test Customer',city:'Surat',pincode:'395003'};
test('same cart in different item order keeps same checkout intent (safe retry)',()=>{
 assert.equal(checkoutIntentKey(a,'new',address),checkoutIntentKey([...a].reverse(),'new',address));
});
test('cart quantity/SKU/address changes cannot reuse previous acceptance and key',()=>{
 const original=checkoutIntentKey(a,'new',address);
 assert.notEqual(original,checkoutIntentKey([{...a[0],quantity:3},a[1]],'new',address));
 assert.notEqual(original,checkoutIntentKey(a,'new',{...address,pincode:'395004'}));
 assert.notEqual(original,checkoutIntentKey(a,'19',address));
});
test('saved-address intent does not depend on hidden new-address form input',()=>{
 assert.equal(checkoutIntentKey(a,'19',address),checkoutIntentKey(a,'19',{...address,pincode:'999999'}));
});
test('never accept an estimate for an outdated cart, address or active request',()=>{
 const intentKey='current';
 const valid={estimate:{total:'10.00'},estimateFor:intentKey,intentKey,cartValid:true,codEnabled:true,posting:false,estimating:false};
 assert.equal(checkoutAcceptable(valid),true);
 for (const change of [{estimateFor:'old'},{cartValid:false},{codEnabled:false},{posting:true},{estimating:true},{estimate:null}]) {
  assert.equal(checkoutAcceptable({...valid,...change}),false);
 }
});
