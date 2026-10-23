import test from 'node:test';import assert from 'node:assert/strict';
import {validateNewDeliveryAccount,validateDeliveryProfile} from '../services/deliveryStaffValidation.js';
test('backend rejects individual invalid fields',()=>{
 assert.deepEqual(Object.keys(validateNewDeliveryAccount({fullName:'A',email:'wrong',mobileNumber:'12345678901',password:'short'})).sort(),['email','fullName','mobileNumber','password']);
});
test('backend accepts ten digit mobile and validated profile',()=>{
 assert.deepEqual(validateDeliveryProfile({fullName:'Rushi Patel',mobileNumber:'9876543210'}),{});
 assert.ok(validateDeliveryProfile({fullName:'Rushi Patel',mobileNumber:'98765432100'}).mobileNumber);
});
