import test from 'node:test';
import assert from 'node:assert/strict';
import {wishlistTransitions} from '../services/wishlistAlertRules.js';
const before={alert_price:'299.00',alert_available:false,alert_sale:false};
const after={current_price:'249.00',available:true,on_sale:true,is_active:true,category_active:true,back_in_stock:true,price_drop:true,sale_start:true};
test('baseline never sends historic alerts',()=>{
 assert.deepEqual(wishlistTransitions({...before,alert_price:null},after),[]);
 assert.deepEqual(wishlistTransitions({...before,alert_available:null},after),[]);
});
test('only transitions produce wishlist notifications',()=>{
 assert.deepEqual(wishlistTransitions(before,after),['stock','price','sale']);
 assert.deepEqual(wishlistTransitions({...before,alert_price:'249.00',alert_available:true,alert_sale:true},after),[]);
});
test('silent for inactive products and inactive categories',()=>{
 assert.deepEqual(wishlistTransitions(before,{...after,is_active:false}),[]);
 assert.deepEqual(wishlistTransitions(before,{...after,category_active:false}),[]);
});
test('preferences suppress individual alert kinds',()=>{
 assert.deepEqual(wishlistTransitions(before,{...after,back_in_stock:false,price_drop:false}),['sale']);
});
test('only price decreases notify, not equal or increased prices',()=>{
 assert.deepEqual(wishlistTransitions({...before,alert_price:'250.00',alert_available:true,alert_sale:false},{...after,current_price:'280.00',on_sale:false}),[]);
 assert.deepEqual(wishlistTransitions({...before,alert_price:'250.00',alert_available:true},{...after,current_price:'250.00',on_sale:false}),[]);
});
