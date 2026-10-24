import test from 'node:test';import assert from 'node:assert/strict';
import {validUnsafeRequestOrigin} from '../middleware/unsafeRequestOrigin.js';
const expected='https://nexora.example';
test('origin mismatch rejected even when fetch metadata says same-origin',()=>assert.equal(validUnsafeRequestOrigin({method:'POST',expected,origin:'https://evil.example',fetchSite:'same-origin'}),false));
test('absent origin rejected in strict mode',()=>assert.equal(validUnsafeRequestOrigin({method:'POST',expected}),false));
test('matching origin permits customer and admin writes',()=>assert.equal(validUnsafeRequestOrigin({method:'PATCH',expected,origin:expected}),true));
test('external fetch-site rejected even with matching origin',()=>assert.equal(validUnsafeRequestOrigin({method:'POST',expected,origin:expected,fetchSite:'cross-site'}),false));
test('safe reads without headers permitted',()=>assert.equal(validUnsafeRequestOrigin({method:'GET',expected}),true));
test('same-origin browser fetch metadata is accepted without origin header',()=>assert.equal(validUnsafeRequestOrigin({method:'DELETE',expected,fetchSite:'same-origin'}),true));
