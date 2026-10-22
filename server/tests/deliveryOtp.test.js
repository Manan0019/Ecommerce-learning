import test from 'node:test';
import assert from 'node:assert/strict';
import {otpEnabled,issueDeliveryCode,verifyDeliveryCode,otpRequestAllowed,maskedEmail,DELIVERY_OTP_LIFETIME_MS} from '../services/deliveryOtp.js';
const secret='safe-test-delivery-otp-secret-32-chars-long';
test('delivery OTP is six digits and only protected digest is stored',()=>{
 const o=issueDeliveryCode(secret,'123');
 assert.match(o.code,/^\d{6}$/);assert.match(o.salt,/^[0-9a-f]{32}$/);assert.match(o.hash,/^[0-9a-f]{64}$/);
 assert.ok(!o.hash.includes(o.code));assert.ok(verifyDeliveryCode(o.code,o.salt,'123',secret,o.hash));
 assert.equal(verifyDeliveryCode('000000',o.salt,'124',secret,o.hash),false);
 assert.equal(verifyDeliveryCode('not-code',o.salt,'123',secret,o.hash),false);
});
test('delivery OTP requires mail and dedicated signing secret',()=>{
 assert.equal(otpEnabled({DELIVERY_OTP_SECRET:'short',SMTP_USER:'a',SMTP_PASSWORD:'b'}),false);
 assert.equal(otpEnabled({DELIVERY_OTP_SECRET:secret,SMTP_USER:'a',SMTP_PASSWORD:'b'}),true);
 assert.equal(otpEnabled({DELIVERY_OTP_SECRET:secret,SMTP_USER:'a'}),false);
});
test('resend has cooldown and bounded hourly budget',()=>{
 const now=Date.now();
 assert.equal(otpRequestAllowed(null,now).count,1);
 assert.equal(otpRequestAllowed({sent_at:new Date(now-59000),send_window_at:new Date(now-59000),send_count:1},now).ok,false);
 assert.equal(otpRequestAllowed({sent_at:new Date(now-62000),send_window_at:new Date(now-900000),send_count:5},now).ok,false);
 assert.equal(otpRequestAllowed({sent_at:new Date(now-62000),send_window_at:new Date(now-900000),send_count:4},now).count,5);
 assert.equal(otpRequestAllowed({sent_at:new Date(now-62000),send_window_at:new Date(now-4000000),send_count:5},now).count,1);
 assert.equal(DELIVERY_OTP_LIFETIME_MS,600000);
 assert.equal(maskedEmail('customer@example.com'),'c***@example.com');
});
