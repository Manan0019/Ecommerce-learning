import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateCheckout} from './checkoutPricing.js';
const policy={origin_state:'Gujarat',shipping_fee_in_state:'50',shipping_fee_other_state:'150',free_shipping_above:'0',tax_pricing_mode:'exclusive',shipping_gst_percent:'18',default_item_gst_percent:'18'};
const one=[{lineTotal:100000n,gstPercent:'18'}];
test('Gujarat order adds configured local shipping and tax to base price',()=>{const r=calculateCheckout(one,'Gujarat',policy);assert.equal(r.shippingFee,'50.00');assert.equal(r.total,'1239.00');assert.equal(r.shippingRegion,'within-state')});
test('Other state adds distinct ₹150 shipping and tax',()=>{const r=calculateCheckout(one,'Maharashtra',policy);assert.equal(r.shippingFee,'150.00');assert.equal(r.total,'1357.00');assert.equal(r.taxType,'IGST')});
test('Free shipping only when explicit threshold is enabled and met',()=>{const r=calculateCheckout(one,'Maharashtra',{...policy,free_shipping_above:'900'});assert.equal(r.shippingFee,'0.00');assert.equal(r.total,'1180.00');assert.equal(r.shippingReason,'threshold')});
