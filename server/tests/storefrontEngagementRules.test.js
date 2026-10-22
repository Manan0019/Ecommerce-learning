import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeNewsletterEmail,validateReview,reviewEligible} from '../services/storefrontEngagementRules.js';
test('newsletter email is normalized and invalid addresses rejected',()=>{
 assert.equal(normalizeNewsletterEmail(' ABC@Example.COM '),'abc@example.com');
 for(const invalid of ['x@',null,'no-space @site.test','a'.repeat(260)+'@example.com'])assert.equal(normalizeNewsletterEmail(invalid),null);
});
test('review validation requires rating and meaningful text',()=>{
 const valid={rating:5,title:'Excellent quality',body:'The item arrived in good condition and works very well.'};
 assert.equal(validateReview(valid),null);
 assert.match(validateReview({...valid,rating:7}),/rating/);
 assert.match(validateReview({...valid,body:'short'}),/20/);
});
test('only delivered paid purchase qualifies for a verified review',()=>{
 assert.equal(reviewEligible({status:'delivered',payment_status:'razorpay_paid'}),true);
 assert.equal(reviewEligible({status:'delivered',payment_status:'cod_collected'}),true);
 assert.equal(reviewEligible({status:'delivered',payment_status:'cod_pending'}),false);
 assert.equal(reviewEligible({status:'shipped',payment_status:'razorpay_paid'}),false);
});
