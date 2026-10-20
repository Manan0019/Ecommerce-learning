import test from 'node:test';import assert from 'node:assert/strict';
import {movePromotion} from '../src/services/promotionOrder.js';
import {bannerStatus, toUtcDateTime} from '../src/services/promotionSchedule.js';
test('numeric position changes reorder a copy while preserving every promotion',()=>{
 const ids=['7','12','42'];assert.deepEqual(movePromotion(ids,0,2),['12','42','7']);assert.deepEqual(ids,['7','12','42']);
 assert.deepEqual(movePromotion(ids,1,0),['12','7','42']);assert.deepEqual(movePromotion(ids,-1,2),ids);
});
test('admin statuses distinguish hidden, future, ended and live',()=>{
 const now=Date.parse('2026-10-20T12:00:00Z');
 assert.equal(bannerStatus({isActive:false},now),'Hidden');
 assert.equal(bannerStatus({isActive:true,startsAt:'2026-10-21T12:00:00Z'},now),'Scheduled');
 assert.equal(bannerStatus({isActive:true,endsAt:'2026-10-19T12:00:00Z'},now),'Ended');
 assert.equal(bannerStatus({isActive:true},now),'Live');
});
test('empty schedule becomes unrestricted; invalid date rejected',()=>{assert.equal(toUtcDateTime(''),null);assert.equal(toUtcDateTime('bad'),null)});
