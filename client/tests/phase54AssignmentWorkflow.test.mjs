import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../src/',import.meta.url);
const read=p=>readFileSync(new URL(p,base),'utf8');
test('Admin Orders opens same-page assignment picker without route navigation',()=>{
 const orders=read('pages/admin/AdminOrders.jsx');
 assert.match(orders,/openAssignmentPicker\(o\)/);
 assert.match(orders,/DeliveryExecutivePicker/);
 assert.doesNotMatch(orders,/to=\{`\/admin\/delivery\?orderId=/);
 assert.match(orders,/await assignDelivery\(assignmentOrder.id,executiveId\)/);
});
test('Delivery portal exposes issue reporting and admin review',()=>{
 const page=read('pages/delivery/DeliveryDashboard.jsx');
 const admin=read('pages/admin/AdminDelivery.jsx');
 const routes=read('services/deliveryService.js');
 assert.match(page,/Report delivery issue/);
 assert.match(page,/reportDeliveryIssue\(/);
 assert.match(admin,/authorizeRetry/);
 assert.match(routes,/\/issues`/);
 assert.match(routes,/\/retry-delivery`/);
});
