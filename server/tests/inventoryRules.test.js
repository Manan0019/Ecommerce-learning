import test from 'node:test';
import assert from 'node:assert/strict';
import { inventoryAlertStatus } from '../services/inventoryRules.js';
test('zero stock reports out regardless of threshold',()=>assert.equal(inventoryAlertStatus(0,0),'out'));
test('stock at threshold reports low',()=>assert.equal(inventoryAlertStatus(5,5),'low'));
test('stock above threshold does not alert',()=>assert.equal(inventoryAlertStatus(6,5),null));
test('inactive or invalid stock does not alert',()=>{
 assert.equal(inventoryAlertStatus(0,5,false),null);
 assert.equal(inventoryAlertStatus(-1,5),null);
});
