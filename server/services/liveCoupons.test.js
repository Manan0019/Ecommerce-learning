import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizedCouponCode,allocateCouponDiscount,quoteLiveCoupon,saveCouponRedemption} from './liveCoupons.js';
import {calculateCheckout} from './checkoutPricing.js';
import {quoteMatchesAccepted,quoteSummary} from './checkoutAcceptance.js';

const lines=[
 {productId:'10',categoryId:9,showSaleBadge:false,unitPrice:10000n,lineTotal:20000n,quantity:2,gstPercent:'18'},
 {productId:'11',categoryId:12,showSaleBadge:true,unitPrice:4000n,lineTotal:4000n,quantity:1,gstPercent:'5'},
];
const eligibility={scope:'order',productIds:[],categoryIds:[],excludedProductIds:[],minimumQualifyingSubtotal:'0',maximumDiscount:'0',minimumUnitPrice:'0',maximumUnitPrice:'0',minimumItems:1,perCustomerLimit:1,firstOrderOnly:false,excludeSaleProducts:false,includeSubcategories:true};
const rule={code:'WELCOME10',discount_kind:'percent',discount_value:'10',minimum_subtotal:'0',max_redemptions:10,starts_at:null,expires_at:null,is_active:true,eligibility};
const policy={origin_state:'Gujarat',shipping_fee_in_state:'20',shipping_fee_other_state:'40',free_shipping_above:'1000',shipping_gst_percent:'18',tax_pricing_mode:'inclusive'};
function mockDb(r=rule,counts={used:0,customer_uses:0},other={}){
 const sql=[];
 return {sql,async query(q,values){sql.push({q,values});if(q.includes('FROM coupon_drafts'))return {rows:r?[r]:[]};if(q.includes('FROM coupon_redemptions'))return {rows:[counts]};if(q.includes('FROM cod_orders'))return {rows:other.firstOrders||[]};if(q.includes('SELECT id,parent_id FROM categories'))return {rows:other.categories||[]};if(q.includes('INSERT INTO coupon_redemptions'))return {rows:[],rowCount:1};throw new Error(`Unexpected mocked SQL: ${q}`)}};
}
async function withLive(f){const before=process.env.COUPON_REDEMPTION_ENABLED;process.env.COUPON_REDEMPTION_ENABLED='true';try{return await f();}finally{if(before===undefined)delete process.env.COUPON_REDEMPTION_ENABLED;else process.env.COUPON_REDEMPTION_ENABLED=before;}}
test('coupon normalization rejects bad codes and never confuses empty with invalid',()=>{
 assert.equal(normalizedCouponCode(' welcome10 '),'WELCOME10');
 assert.equal(normalizedCouponCode(''), '');
 assert.equal(normalizedCouponCode('bad;drop'),null);
 assert.equal(normalizedCouponCode({code:'CODE'}),null);
});
test('paid discounts allocate only eligible lines and preserve every paise',()=>{
 assert.deepEqual(allocateCouponDiscount(lines,[0],5000n),[5000n,0n]);
 const alloc=allocateCouponDiscount(lines,[0,1],1999n);
 assert.equal(alloc.reduce((a,b)=>a+b,0n),1999n);
 assert.ok(alloc.every((v,i)=>v<=lines[i].lineTotal));
 assert.throws(()=>allocateCouponDiscount(lines,[0,0],100n),/Duplicate/);
 assert.throws(()=>allocateCouponDiscount(lines,[1],4001n),/exceeds/);
});
test('no coupon never needs flag; nonempty coupon fails closed until enabled',async()=>{
 const prior=process.env.COUPON_REDEMPTION_ENABLED;delete process.env.COUPON_REDEMPTION_ENABLED;
 try{
  const db=mockDb();const plain=await quoteLiveCoupon(db,'',5,lines);assert.equal(plain.discountPaise,0n);assert.equal(db.sql.length,0);
  const locked=await quoteLiveCoupon(db,'WELCOME10',5,lines,{lock:true});assert.match(locked.error,/not enabled/);assert.equal(db.sql.length,0);
 }finally{if(prior!==undefined)process.env.COUPON_REDEMPTION_ENABLED=prior;}
});
test('active percentage coupon quotes eligible discount and requires usage queries',()=>withLive(async()=>{
 const db=mockDb();const quote=await quoteLiveCoupon(db,'welcome10',5,lines,{lock:true});
 assert.equal(quote.code,'WELCOME10');assert.equal(quote.discountPaise,2400n);assert.deepEqual(quote.allocations,[2000n,400n]);
 assert.ok(db.sql[0].q.includes('FOR UPDATE'));assert.ok(db.sql.some(s=>s.q.includes('FROM coupon_redemptions')));
 await saveCouponRedemption(db,quote,5,10,'reserved');
 assert.ok(db.sql.at(-1).q.includes('INSERT INTO coupon_redemptions'));
 assert.equal(db.sql.at(-1).values[3],'reserved');
}));
test('expired, inactive, overused and per-customer exhausted offers reject',()=>withLive(async()=>{
 const cases=[
  [mockDb({...rule,is_active:false}),/not active/],
  [mockDb({...rule,expires_at:new Date(Date.now()-3600000).toISOString()}),/expired/],
  [mockDb(rule,{used:10,customer_uses:0}),/usage limit/],
  [mockDb(rule,{used:1,customer_uses:1}),/usage limit/],
 ];
 for(const [db,reason] of cases){const q=await quoteLiveCoupon(db,rule.code,5,lines);assert.match(q.error,reason);}
}));
test('category descendants, sale exclusion, min spend, coupon caps and first-order eligibility',()=>withLive(async()=>{
 const row={...rule,discount_value:'50',eligibility:{...eligibility,scope:'categories',categoryIds:[7],includeSubcategories:true,excludeSaleProducts:true,minimumQualifyingSubtotal:'190',minimumItems:2,maximumDiscount:'30',firstOrderOnly:true}};
 const db=mockDb(row,undefined,{categories:[{id:7,parent_id:null},{id:9,parent_id:7},{id:12,parent_id:7}]});
 const quote=await quoteLiveCoupon(db,'WELCOME10',5,lines);
 assert.equal(quote.discountPaise,3000n);assert.deepEqual(quote.allocations,[3000n,0n]);
 const already=mockDb(row,undefined,{firstOrders:[{id:55}]});assert.match((await quoteLiveCoupon(already,'WELCOME10',5,lines)).error,/first order/);
 const invalidCart=mockDb({...row,eligibility:{...row.eligibility,minimumQualifyingSubtotal:'400'}});assert.match((await quoteLiveCoupon(invalidCart,'WELCOME10',5,lines)).error,/eligible product/);
}));
test('real checkout inclusive and exclusive tax quotes reflect discount and do not match stale approval',()=>withLive(async()=>{
 const quote=await quoteLiveCoupon(mockDb(),rule.code,5,lines);
 const inclusive=calculateCheckout(lines,'Gujarat',policy,quote);
 const full=calculateCheckout(lines,'Gujarat',policy);
 assert.equal(inclusive.subtotal,'240.00');assert.equal(inclusive.discountAmount,'24.00');assert.equal(inclusive.total,'236.00');
 assert.equal(full.total,'260.00');assert.ok(Number(inclusive.includedTax)<Number(full.includedTax));
 assert.equal(quoteMatchesAccepted(inclusive,quoteSummary(inclusive)),true);
 assert.equal(quoteMatchesAccepted(inclusive,quoteSummary(full)),false);
 const exclusive=calculateCheckout(lines,'Gujarat',{...policy,tax_pricing_mode:'exclusive'},quote);
 assert.equal(exclusive.discountAmount,'24.00');assert.equal(exclusive.taxPricingMode,'exclusive');
 assert.equal(Number(exclusive.total),Number(exclusive.subtotal)-Number(exclusive.discountAmount)+Number(exclusive.shippingFee)+Number(exclusive.includedTax));
}));
