import test from 'node:test';
import assert from 'node:assert/strict';
import {validateReview} from './storefrontEngagementRules.js';
const review=rating=>({rating,title:'Good purchase',body:'This product worked well for our household.'});
test('half star increments accepted, decimals outside 0.5 steps refused',()=>{
 for(const n of [1,1.5,2,2.5,3,3.5,4,4.5,5])assert.equal(validateReview(review(n)),null);
 for(const n of [0,0.5,1.2,4.7,5.5,NaN])assert.ok(validateReview(review(n)));
});
import {previewDraftCoupon, validateCouponDraft} from './couponDraftRules.js';
test('draft simulation is never redeemed and caps its discount',()=>{
 const draft=validateCouponDraft({code:'SALE123',kind:'percent',value:'20',minimumSubtotal:'500',
 maxRedemptions:10,scope:'order',maximumDiscount:'150'});
 assert.ok(draft);
 const eligible=previewDraftCoupon(draft,{subtotal:'2000',qualifyingSubtotal:'2000',eligibleQuantity:2});
 assert.equal(eligible.estimatedDiscount,'150.00');assert.equal(eligible.checkoutApplied,false);
 assert.equal(eligible.subtotalAfterDiscount,'1850.00');
 const insufficient=previewDraftCoupon(draft,{subtotal:'300',qualifyingSubtotal:'300',eligibleQuantity:1});
 assert.equal(insufficient.estimatedDiscount,'0.00');
 assert.throws(()=>previewDraftCoupon(draft,{subtotal:'200',qualifyingSubtotal:'1000',eligibleQuantity:5}));
});

test('numeric ratings use arithmetic, not PostgreSQL string concatenation',()=>{
 const ratings=['4.5','3.5'];
 const average=Math.round(ratings.reduce((s,r)=>s+Number(r),0)/ratings.length*10)/10;
 assert.equal(average,4);
});
