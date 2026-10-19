import test from 'node:test';
import assert from 'node:assert/strict';
import { validBannerDestination, validBannerPlacement, isExternalBannerDestination } from '../services/bannerTargeting.js';
test('banner supports homepage, category, or both targeting correctly',()=>{
 assert.equal(validBannerPlacement('home',null),true);
 assert.equal(validBannerPlacement('category','7'),true);
 assert.equal(validBannerPlacement('both','7'),true);
 assert.equal(validBannerPlacement('both',null),false);
 assert.equal(validBannerPlacement('home','7'),false);
});
test('banner redirect accepts local routes and safe external HTTPS destinations',()=>{
 for(const ok of ['/products','/categories/laptop','/products/14?variant=12','https://example.com/offer']) assert.equal(validBannerDestination(ok),true,ok);
 for(const bad of ['//evil.example','javascript:alert(1)','http://example.com','https://me:pw@example.com','', '/\\evil.com']) assert.equal(validBannerDestination(bad),false,bad);
 assert.equal(isExternalBannerDestination('https://example.com'),true);
});
