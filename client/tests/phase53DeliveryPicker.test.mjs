import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {deliveryTeamWithWorkload,filterDeliveryTeam,isOpenDelivery} from '../src/services/deliveryAssignmentView.js';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const staff=[
 {id:'11',fullName:'Meera Shah',email:'meera@example.test',mobile:'9876500001',isActive:true},
 {id:'12',fullName:'Ravi Patel',email:'ravi@example.test',mobile:'9876500002',isActive:true},
 {id:'13',fullName:'Disabled User',email:'disabled@example.test',mobile:'9876500003',isActive:false},
];
const assignment=(executiveId, deliveryStatus, orderStatus='shipped')=>({executiveId,deliveryStatus,orderStatus});
test('workloads count assigned and in-transit orders only, with string-safe executive ids',()=>{
 const result=deliveryTeamWithWorkload(staff,[assignment(11,'assigned'),assignment('11','out_for_delivery'),assignment('11','delivered'),assignment('12','assigned','cancelled')]);
 assert.equal(result.find(x=>x.id==='11').openDeliveries,2);
 assert.equal(result.find(x=>x.id==='12').openDeliveries,0);
 assert.equal(result.at(-1).isActive,false);
 assert.equal(isOpenDelivery(assignment('11','delivered')),false);
});
test('directory search supports name, email and phone without changing active flags',()=>{
 const result=deliveryTeamWithWorkload(staff,[]);
 assert.deepEqual(filterDeliveryTeam(result,'  9876500002  ').map(x=>x.id),['12']);
 assert.deepEqual(filterDeliveryTeam(result,'SHAH').map(x=>x.id),['11']);
 assert.deepEqual(filterDeliveryTeam(result,'disabled@example.test').map(x=>x.id),['13']);
 assert.equal(filterDeliveryTeam(result,'abc').length,0);
});
test('assignment dialog requires deliberate confirmation and disables inactive executives',()=>{
 const dialog=src('../src/components/admin/DeliveryExecutivePicker.jsx');
 assert.match(dialog,/type="radio"/);
 assert.match(dialog,/disabled=\{!person\.isActive \|\| busy\}/);
 assert.match(dialog,/disabled=\{!canSubmit\}/);
 assert.match(dialog,/onClick=\{\(\) => onAssign\(selectedId\)\}/);
 assert.match(dialog,/openDeliveries/);
 assert.match(dialog,/Search by name, mobile or email/);
});
test('delivery operations replaces native dropdown and orders can deep-link to picker',()=>{
 const admin=src('../src/pages/admin/AdminDelivery.jsx'),orders=src('../src/pages/admin/AdminOrders.jsx');
 assert.match(admin,/DeliveryExecutivePicker/);
 assert.match(admin,/requestedOrderId=searchParams.get\('orderId'\)/);
 assert.match(admin,/Choose executive/);
 assert.doesNotMatch(admin,/<select aria-label=\{`Executive for order/);
 assert.match(orders,/\/admin\/delivery\?orderId=/);
});
