import test from 'node:test';import assert from 'node:assert/strict';
import {validateCouponDraft,draftDiscountPaise} from './couponDraftRules.js';
test('draft coupon normalizes code and supports bounded discounts',()=>{
 assert.equal(validateCouponDraft({code:'welcome10',kind:'percent',value:'10',minimumSubtotal:'0',maxRedemptions:100}).code,'WELCOME10');
 assert.equal(validateCouponDraft({code:'X',kind:'percent',value:'10'}),null);
 assert.equal(validateCouponDraft({code:'TEST100',kind:'percent',value:'100'}),null);
 assert.equal(validateCouponDraft({code:'SAVE20',kind:'fixed',value:'100001'}),null);
});
test('draft discount arithmetic caps fixed amount to subtotal',()=>{
 assert.equal(draftDiscountPaise({kind:'percent',value:'10'},10000n),1000n);
 assert.equal(draftDiscountPaise({kind:'fixed',value:'500'},10000n),10000n);
});
