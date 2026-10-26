import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthenticationRoute, shouldBlockUnsavedNavigation } from '../src/components/common/unsavedNavigationPolicy.js';
const loc = (pathname, search = '') => ({ pathname, search });

test('authentication pages are never considered editable drafts', () => {
  for (const pathname of ['/login','/admin/login','/delivery/login','/signup','/verify-otp','/forgot-password','/reset-password']) {
    assert.equal(isAuthenticationRoute(pathname), true);
    assert.equal(shouldBlockUnsavedNavigation({dirty:true,currentLocation:loc(pathname),nextLocation:loc('/admin/dashboard')}), false);
  }
});
test('forced login redirects are never blocked', () => {
  assert.equal(shouldBlockUnsavedNavigation({dirty:true,currentLocation:loc('/admin/products/new'),nextLocation:loc('/login')}), false);
});
test('real unsaved editor navigation remains protected', () => {
  assert.equal(shouldBlockUnsavedNavigation({dirty:true,currentLocation:loc('/admin/products/new'),nextLocation:loc('/admin/dashboard')}), true);
  assert.equal(shouldBlockUnsavedNavigation({dirty:true,currentLocation:loc('/admin/products','?filter=x'),nextLocation:loc('/admin/products','?filter=y')}), true);
  assert.equal(shouldBlockUnsavedNavigation({dirty:false,currentLocation:loc('/admin/products/new'),nextLocation:loc('/admin/dashboard')}), false);
});
