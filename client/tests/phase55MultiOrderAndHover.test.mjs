import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../src/',import.meta.url);
const read=f=>readFileSync(new URL(f,base),'utf8');
test('Admin Delivery allows multi-order selection with confirm dialog',()=>{
 const s=read('pages/admin/AdminDelivery.jsx');
 assert.match(s,/selectedOrderIds/);
 assert.match(s,/assignDeliveryBatch\(selectedOrders\.map/);
 assert.match(s,/DeliveryBatchAssignmentDialog/);
 assert.match(s,/Open deliveries/);
});
test('Batch selector displays team workload and requires confirmation',()=>{
 const s=read('components/admin/DeliveryBatchAssignmentDialog.jsx');
 assert.match(s,/onAssign\(chosen\.id\)/);
 assert.match(s,/open deliveries/);
 assert.match(s,/orders\.map/);
});
test('Admin product hover styling never draws partial underlines',()=>{
 const s=read('styles/site.css');
 assert.match(s,/\.nx46-product-title:hover/);
 assert.match(s,/text-decoration:none!important/);
 assert.match(s,/outline:2px solid/);
});
