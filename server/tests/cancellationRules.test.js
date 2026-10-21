import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestCancellation, isPendingCancellation, cancellationReasonValid } from '../services/cancellationRules.js';
const cod={status:'placed',payment_method:'cod',payment_status:'cod_pending',refund_status:null};
const online={status:'confirmed',payment_method:'razorpay',payment_status:'razorpay_paid',refund_status:null};
test('eligible COD and captured Razorpay can request before processing',()=>{
 assert.equal(canRequestCancellation(cod),true);
 assert.equal(canRequestCancellation(online),true);
});
test('no cancellation requests during processing, shipping, delivery or cancellation',()=>{
 for(const status of ['processing','shipped','delivered','cancelled','payment_pending','refund_pending'])assert.equal(canRequestCancellation({...online,status}),false);
});
test('never allow online pending, expired, refund initiated, refunded or reviewed',()=>{
 for(const status of ['razorpay_pending','razorpay_expired','razorpay_review','razorpay_refunded'])assert.equal(canRequestCancellation({...online,payment_status:status}),false);
 assert.equal(canRequestCancellation({...online,refund_status:'requested'}),false);
 assert.equal(canRequestCancellation({...cod,payment_status:'cod_collected'}),false);
});
test('reject invalid reasons and whitespace; allow 10 to 200 characters',()=>{
 for(const value of [null,0,'', '     ', 'short', ' '.repeat(4)+'a'.repeat(5)])assert.equal(cancellationReasonValid(value),false);
 assert.equal(cancellationReasonValid('No longer needed'),true);
 assert.equal(cancellationReasonValid('x'.repeat(200)),true);
 assert.equal(cancellationReasonValid('x'.repeat(201)),false);
});
test('only pending is a pending request',()=>{
 assert.equal(isPendingCancellation({status:'pending'}),true);
 for(const status of ['approved','declined',null])assert.equal(isPendingCancellation({status}),false);
});
