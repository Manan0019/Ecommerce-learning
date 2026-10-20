import test from 'node:test';
import assert from 'node:assert/strict';
import { acceptedQuoteError, quoteMatchesAccepted, quoteSummary } from '../services/checkoutAcceptance.js';
import { deductStock } from '../services/stockDeduction.js';
const current = { subtotal:'100.00',shippingFee:'20.00',total:'120.00',taxableValue:'101.69',includedTax:'18.31',cgst:'9.15',sgst:'9.16',igst:'0.00',taxType:'CGST + SGST' };
test('checkout accepts an exact live quote using paise rather than floating arithmetic',()=>{
 assert.equal(acceptedQuoteError(current),null);
 assert.equal(quoteMatchesAccepted(current, {...current,total:'120'}),true);
 assert.equal(quoteMatchesAccepted(current, {...current,total:'120.01'}),false);
});
test('checkout blocks missing, negative, nonnumeric and incomplete quote approvals',()=>{
 assert.ok(acceptedQuoteError(null));
 for (const total of ['1e4','-5','NaN',Infinity,'0.0001']) assert.ok(acceptedQuoteError({...current,total}));
 assert.ok(acceptedQuoteError({total:'120.00'}));
});
test('tax, shipping and tax jurisdiction changes require a fresh approval',()=>{
 for(const field of ['subtotal','shippingFee','total','taxableValue','includedTax','cgst','sgst']){
  assert.equal(quoteMatchesAccepted(current,{...current,[field]:'0.00'}),false,field);
 }
 assert.equal(quoteMatchesAccepted(current,{...current,taxType:'IGST'}),false);
 assert.deepEqual(quoteSummary(current),current);
});
test('deductStock uses stock guarded SQL for both simple products and exact SKUs',async()=>{
 const calls=[];const db={async query(sql,params){calls.push({sql,params});return {rows:[{id:params[1]}]};}};
 await deductStock(db,{quantity:3,variantId:'9',productId:'2'});
 await deductStock(db,{quantity:2,variantId:null,productId:'2'});
 assert.match(calls[0].sql,/UPDATE product_variants SET stock=stock-\$1/);
 assert.match(calls[1].sql,/UPDATE products SET stock=stock-\$1/);
 for(const call of calls) assert.match(call.sql,/stock >= \$1 RETURNING id/);
 assert.deepEqual(calls[0].params,[3,'9']);
});
test('zero guarded-row updates throw a rollback-triggering stock conflict',async()=>{
 const db={async query(){return {rows:[]};}};
 await assert.rejects(deductStock(db,{quantity:7,productId:'2'}),{code:'NX_STOCK_CHANGED'});
});
