import test from 'node:test';
import assert from 'node:assert/strict';
import {canReportDeliveryIssue,validateDeliveryIssue,canUpdateDelivery} from '../services/deliveryRules.js';
const order={status:'shipped',refund_status:null};
const courier={status:'out_for_delivery'};
test('only a dispatched, active attempt without pending issue can be reported',()=>{
 assert.equal(canReportDeliveryIssue(order,courier,false),true);
 assert.equal(canReportDeliveryIssue(order,courier,true),false);
 assert.equal(canReportDeliveryIssue({...order,status:'delivered'},courier,false),false);
 assert.equal(canReportDeliveryIssue({...order,refund_status:'pending'},courier,false),false);
 assert.equal(canReportDeliveryIssue(order,{status:'assigned'},false),false);
});
test('issue requires bounded reason and known type',()=>{
 assert.equal(validateDeliveryIssue({kind:'failed_attempt',reason:'Customer unavailable'}),null);
 assert.match(validateDeliveryIssue({kind:'cancel_order',reason:'Customer unavailable'}),/valid delivery issue/);
 assert.match(validateDeliveryIssue({kind:'failed_attempt',reason:'no'}),/10–300/);
 assert.match(validateDeliveryIssue({kind:'failed_attempt',reason:'x'.repeat(301)}),/10–300/);
 assert.match(validateDeliveryIssue({kind:'failed_attempt',reason:'Customer unavailable',requestedDate:'2026-11-02'}),/Only rescheduling/);
});
test('reschedule date is validated, calendar aware and within next 30 days',()=>{
 const today=new Date();const next=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()+1)).toISOString().slice(0,10);
 const valid={kind:'reschedule_requested',reason:'Customer asked for tomorrow',requestedDate:next};
 assert.equal(validateDeliveryIssue(valid),null);
 assert.match(validateDeliveryIssue({...valid,requestedDate:'2026-02-30'}),/within the next 30 days/);
 assert.match(validateDeliveryIssue({...valid,requestedDate:'1970-01-01'}),/within the next 30 days/);
 assert.match(validateDeliveryIssue({...valid,requestedDate:'bogus'}),/valid proposed/);
});
test('delivery transition remains strictly sequenced',()=>{
 assert.equal(canUpdateDelivery(order,{status:'assigned'},'out_for_delivery'),true);
 assert.equal(canUpdateDelivery(order,courier,'delivered'),true);
 assert.equal(canUpdateDelivery(order,courier,'out_for_delivery'),false);
});
