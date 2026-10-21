import test from 'node:test';
import assert from 'node:assert/strict';
import { refundConfiguration } from '../services/refundRules.js';

const testProvider = { enabled: true, mode: 'test' };
const liveProvider = { enabled: true, mode: 'live' };

test('read-only refund configuration identifies missing test opt-in', () => {
  assert.deepEqual(refundConfiguration({}, testProvider), { enabled: false, mode: 'test', reason: 'refund_opt_in_missing' });
});
test('read-only refund configuration indicates enabled test refunds', () => {
  assert.deepEqual(refundConfiguration({RAZORPAY_REFUNDS_ENABLED:'true'}, testProvider), { enabled: true, mode: 'test', reason: null });
});
test('read-only refund configuration never bypasses unconfigured provider', () => {
  const result=refundConfiguration({RAZORPAY_REFUNDS_ENABLED:'true'}, {enabled:false,mode:'test'});
  assert.equal(result.enabled,false);
  assert.equal(result.reason,'razorpay_unconfigured');
});
test('read-only refund configuration fail-closes live refunds without second opt-in', () => {
  assert.deepEqual(refundConfiguration({RAZORPAY_REFUNDS_ENABLED:'true'}, liveProvider),{enabled:false,mode:'live',reason:'live_refund_opt_in_missing'});
  assert.equal(refundConfiguration({RAZORPAY_REFUNDS_ENABLED:'true', RAZORPAY_LIVE_REFUNDS_ENABLED:'true'},liveProvider).enabled,true);
});
