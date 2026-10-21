import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { capturedPaymentMatches, razorpaySettings, verifyCheckoutSignature, verifyWebhookSignature } from '../services/razorpayService.js';

const secret='test-example-secret-not-a-real-payment-key';
test('checkout signature is derived from stored gateway order, never client order data',()=>{
  const order='order_123456789',payment='pay_123456789';
  const signature=createHmac('sha256',secret).update(`${order}|${payment}`).digest('hex');
  assert.equal(verifyCheckoutSignature(order,payment,signature,secret),true);
  assert.equal(verifyCheckoutSignature('order_abcdefghi',payment,signature,secret),false);
  assert.equal(verifyCheckoutSignature(order,'pay_abcdefghi',signature,secret),false);
  assert.equal(verifyCheckoutSignature(order,payment,'broken',secret),false);
});
test('webhook signature requires raw bytes and separate secret',()=>{
  const raw=Buffer.from('{"event":"payment.captured"}');
  const signature=createHmac('sha256',secret).update(raw).digest('hex');
  assert.equal(verifyWebhookSignature(raw,signature,secret),true);
  assert.equal(verifyWebhookSignature(raw.toString('utf8'),signature,secret),false);
  assert.equal(verifyWebhookSignature(Buffer.concat([raw,Buffer.from(' ')]),signature,secret),false);
  assert.equal(verifyWebhookSignature(raw,signature,'different-long-secret'),false);
});
test('captured payment must match stored amount, order and currency',()=>{
  const order={razorpay_order_id:'order_123456789',grand_total:'1499.50'};
  const valid={id:'pay_123456789',order_id:order.razorpay_order_id,amount:149950,currency:'INR',captured:true,status:'captured'};
  assert.equal(capturedPaymentMatches(valid,order),true);
  for(const mutation of [ {amount:149951},{order_id:'order_other'},{currency:'USD'},{status:'authorized'},{captured:false},{id:'invalid'}]) {
    assert.equal(capturedPaymentMatches({...valid,...mutation},order),false);
  }
});
test('gateway disabled when mode and key prefix do not match',()=>{
  const before=Object.fromEntries(['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_MODE'].map(k=>[k,process.env[k]]));
  try{
    process.env.RAZORPAY_KEY_ID='rzp_live_this_is_not_a_key';process.env.RAZORPAY_KEY_SECRET=secret;process.env.RAZORPAY_MODE='test';
    assert.equal(razorpaySettings().enabled,false);
    process.env.RAZORPAY_MODE='live';
    assert.equal(razorpaySettings().enabled,true);
  }finally{for(const [k,v] of Object.entries(before))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
