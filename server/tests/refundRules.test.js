import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleForFullRefund,totalPaise,refundMatchesOrder,refundWritesEnabled,isRefundStatus} from '../services/refundRules.js';
const payment={id:'pay_123456789',order_id:'order_123456789',status:'captured',captured:true,currency:'INR',amount:19900,amount_refunded:0};
const order={id:'44',payment_method:'razorpay',payment_status:'razorpay_paid',status:'placed',grand_total:'199.00',
 razorpay_order_id:'order_123456789',razorpay_payment_id:payment.id,refund_request_key:'nx_order_44_full_refund_v1',refund_status:null};
const refund={id:'rfnd_123456789',status:'processed',payment_id:payment.id,currency:'INR',amount:19900,receipt:order.refund_request_key};
test('refund eligibility only captured Razorpay pre-shipment orders',()=>{
 assert.equal(eligibleForFullRefund(order),true);
 for(const status of ['processing','shipped','delivered','cancelled','refund_pending','payment_pending'])assert.equal(eligibleForFullRefund({...order,status}),false);
 assert.equal(eligibleForFullRefund({...order,payment_method:'cod'}),false);
 assert.equal(eligibleForFullRefund({...order,payment_status:'razorpay_pending'}),false);
 assert.equal(eligibleForFullRefund({...order,refund_status:'pending'}),false);
});
test('amount computed in integer paise and malformed money fails closed',()=>{
 assert.equal(totalPaise(order),19900);
 for(const value of ['199.0','199.999','1e4','0.00','-1.00','199.00xx'])assert.equal(totalPaise({...order,grand_total:value}),null);
});
test('refund matches order, payment, currency, exact amount and receipt or known id',()=>{
 assert.equal(refundMatchesOrder(refund,order),true);
 for(const changed of [{amount:19901},{currency:'USD'},{payment_id:'pay_99999999'},{receipt:'wrong'},{id:'wrong'}]){
   assert.equal(refundMatchesOrder({...refund,...changed},order),false);
 }
 assert.equal(refundMatchesOrder({...refund,receipt:null},{...order,razorpay_refund_id:refund.id}),true);
 assert.equal(refundMatchesOrder({...refund,receipt:null},{...order,razorpay_refund_id:'rfnd_99999999'}),false);
});
test('live refund requires two opt-ins, test refund requires one',()=>{
 const testSettings={enabled:true,mode:'test'},liveSettings={enabled:true,mode:'live'};
 assert.equal(refundWritesEnabled({},testSettings),false);
 assert.equal(refundWritesEnabled({RAZORPAY_REFUNDS_ENABLED:'true'},testSettings),true);
 assert.equal(refundWritesEnabled({RAZORPAY_REFUNDS_ENABLED:'true'},liveSettings),false);
 assert.equal(refundWritesEnabled({RAZORPAY_REFUNDS_ENABLED:'true',RAZORPAY_LIVE_REFUNDS_ENABLED:'true'},liveSettings),true);
 assert.equal(refundWritesEnabled({RAZORPAY_REFUNDS_ENABLED:'true',RAZORPAY_LIVE_REFUNDS_ENABLED:'true'},{enabled:false,mode:'live'}),false);
});
test('Razorpay expected refund statuses',()=>{
 for(const state of ['created','pending','processed','failed'])assert.equal(isRefundStatus(state),true);
 assert.equal(isRefundStatus('paid'),false);
});

test('provider webhook receipt may be null; server-generated notes identify the exact refund',()=>{
  assert.equal(refundMatchesOrder({...refund,receipt:null,notes:{order:order.refund_request_key}},order),true);
  assert.equal(refundMatchesOrder({...refund,receipt:null,notes:{order:'another_order'}},order),false);
  assert.equal(refundMatchesOrder({...refund,receipt:null,notes:{order:order.refund_request_key},amount:100},order),false);
});
