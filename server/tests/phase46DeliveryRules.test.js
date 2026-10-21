import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleForAssignment,canUpdateDelivery,validId,validNewPassword} from '../services/deliveryRules.js';
const valid={status:'processing',payment_method:'razorpay',payment_status:'razorpay_paid'};
test('delivery assignment only allows eligible paid/cod fulfillment',()=>{
 assert.equal(eligibleForAssignment(valid),true);
 assert.equal(eligibleForAssignment({...valid,payment_method:'cod',payment_status:'cod_pending'}),true);
 for(const status of ['placed','payment_pending','refund_pending','cancelled','delivered'])assert.equal(eligibleForAssignment({...valid,status}),false);
 assert.equal(eligibleForAssignment({...valid,payment_status:'razorpay_pending'}),false);
});
test('delivery steps require shipment and assigned courier sequence',()=>{
 const shipped={status:'shipped',refund_status:null};
 assert.equal(canUpdateDelivery(shipped,{status:'assigned'},'out_for_delivery'),true);
 assert.equal(canUpdateDelivery(shipped,{status:'out_for_delivery'},'delivered'),true);
 assert.equal(canUpdateDelivery(shipped,{status:'assigned'},'delivered'),false);
 assert.equal(canUpdateDelivery({...shipped,status:'processing'},{status:'assigned'},'out_for_delivery'),false);
 assert.equal(canUpdateDelivery({...shipped,refund_status:'pending'},{status:'out_for_delivery'},'delivered'),false);
});
test('identifiers and passwords validated',()=>{
 assert.equal(validId('123'),true);assert.equal(validId('0'),false);assert.equal(validId('abc'),false);
 assert.equal(validNewPassword('StrongPassword123!'),true);assert.equal(validNewPassword('short'),false);
});
