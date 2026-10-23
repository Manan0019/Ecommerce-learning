import {test} from 'node:test';
import assert from 'node:assert/strict';
import {canonicalIndianState,INDIAN_STATES} from '../services/indianStates.js';
import {calculateCheckout,validateCheckoutSettings} from '../services/checkoutPricing.js';
import {validateAddress,normalizeAddress} from '../services/codOrderRules.js';
import {toPaise} from '../services/cartPricing.js';
const policy={origin_state:'Gujarat',shipping_fee_in_state:'50.00',shipping_fee_other_state:'150.00',free_shipping_above:'5000.00',default_item_gst_percent:'18',shipping_gst_percent:'18',tax_pricing_mode:'exclusive',cod_enabled:true};
const product=(amount)=>[{lineTotal:toPaise(amount),gstPercent:'18'}];
test('states and union territories are enumerated and aliases canonicalized',()=>{
 assert.equal(INDIAN_STATES.length,36);
 assert.equal(canonicalIndianState('gJ'),'Gujarat');assert.equal(canonicalIndianState('  gujarat '),'Gujarat');
 assert.equal(canonicalIndianState('NCT of Delhi'),'Delhi');assert.equal(canonicalIndianState('Maharashtra'),'Maharashtra');
 assert.equal(canonicalIndianState('not a real state'),null);
});
test('state aliases do not mistakenly apply interstate shipping',()=>{
 const q=calculateCheckout(product('1000.00'),'GJ',policy);
 assert.equal(q.shippingFee,'50.00');assert.equal(q.shippingRegion,'within-state');assert.equal(q.taxType,'CGST + SGST');
});
test('interstate delivery uses the other-state rate and IGST',()=>{
 const q=calculateCheckout(product('1000.00'),'Maharashtra',policy);
 assert.equal(q.shippingFee,'150.00');assert.equal(q.shippingRegion,'other-state');assert.equal(q.taxType,'IGST');
});
test('free shipping rule clearly explains why both regional fees were overridden',()=>{
 for(const state of ['Gujarat','Maharashtra']){
  const q=calculateCheckout(product('6000.00'),state,policy);
  assert.equal(q.shippingFee,'0.00');assert.equal(q.shippingReason,'threshold');
 }
});
test('disabling free shipping restores regional fees even for large orders',()=>{
 const updated={...policy,free_shipping_above:'0.00'};
 assert.equal(calculateCheckout(product('6000.00'),'Gujarat',updated).shippingFee,'50.00');
 assert.equal(calculateCheckout(product('6000.00'),'Maharashtra',updated).shippingFee,'150.00');
});
test('invalid region cannot be mistaken for intra-state tax',()=>{
 assert.throws(()=>calculateCheckout(product('1000.00'),'Gujrta',policy),/valid Indian/);
 assert.equal(validateCheckoutSettings({...policy,origin_state:'planet Mars'}),null);
 assert.equal(validateCheckoutSettings({...policy,origin_state:'GJ'}).origin_state,'Gujarat');
});
test('new delivery addresses must contain a valid state and preserve its canonical name',()=>{
 const address={fullName:'Test Buyer',phone:'9876543210',addressLine1:'Street number 123',city:'Surat',state:'GJ',pincode:'395003'};
 assert.equal(validateAddress(address),null);
 assert.equal(normalizeAddress(address).state,'Gujarat');
 assert.match(validateAddress({...address,state:'Gujrta'}),/valid Indian state/);
});
