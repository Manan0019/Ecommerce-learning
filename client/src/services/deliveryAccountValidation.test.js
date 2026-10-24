import test from 'node:test';import assert from 'node:assert/strict';
import {deliveryFieldError,validateDeliveryForm} from './deliveryAccountValidation.js';
test('delivery account fields produce independent errors',()=>{
 const e=validateDeliveryForm({fullName:'A',email:'bad',mobileNumber:'12345678901',password:'short'});
 assert.deepEqual(Object.keys(e).sort(),['email','fullName','mobileNumber','password','payRate']);
});
test('phone must be exactly ten digits, no extra characters',()=>{
 assert.equal(deliveryFieldError('mobileNumber','9876543210'),'');
 for(const v of ['98765432101','987654321','98765 43210','abcdefghij'])assert.ok(deliveryFieldError('mobileNumber',v));
});
test('valid profile fields can be saved independently',()=>{
 assert.deepEqual(validateDeliveryForm({fullName:'Rushi Patel',mobileNumber:'9876543210'},{profile:true}),{});
});
