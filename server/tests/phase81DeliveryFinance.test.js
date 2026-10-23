import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseDeliveryRate,rupees,parseFinanceWindow,financeSummary} from '../services/deliveryFinanceRules.js';
test('per-delivery rate converts safely to integer paise',()=>{
 assert.equal(parseDeliveryRate('0'),0);assert.equal(parseDeliveryRate('99.99'),9999);
 assert.equal(parseDeliveryRate('50000.00'),5000000);assert.equal(rupees(9999),'99.99');
 for(const invalid of ['-1','0.001','50000.01','1e6','₹5','1,000',' 05','Infinity',''])assert.equal(parseDeliveryRate(invalid),null);
});
test('filters reject invalid calendar dates, reversed range and injection',()=>{
 assert.deepEqual(parseFinanceWindow({from:'2026-10-01',to:'2026-10-31'}),{from:'2026-10-01',to:'2026-10-31'});
 for(const q of [{from:'2026-02-30'},{to:'2026-10-31;delete'},{from:'2026-10-31',to:'2026-10-01'}])assert.ok(parseFinanceWindow(q).error);
});
test('only completed delivery earns compensation; payouts are separate from cash received',()=>{
 const s=financeSummary([
  {deliveryStatus:'delivered',deliveredAt:'2026-10-23',payRatePaise:15000,paidAt:null,paymentMethod:'cod',paymentStatus:'cod_pending',total:1200},
  {deliveryStatus:'delivered',deliveredAt:'2026-10-22',payRatePaise:15000,paidAt:'2026-10-23',paymentMethod:'razorpay',paymentStatus:'razorpay_paid',total:2000},
  {deliveryStatus:'assigned',payRatePaise:15000,paymentMethod:'cod',paymentStatus:'cod_pending',total:700}]);
 assert.equal(s.completed,2);assert.equal(s.pending,1);assert.equal(s.earnedPaise,30000);assert.equal(s.paidPaise,15000);assert.equal(s.unpaidPaise,15000);
 assert.equal(s.codCollected,0);assert.equal(s.prepaidCollected,2000);
});
