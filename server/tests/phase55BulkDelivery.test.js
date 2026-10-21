import test from 'node:test';
import assert from 'node:assert/strict';
import {validateBulkDeliveryAssignment,eligibleForAssignment,canUpdateDelivery} from '../services/deliveryRules.js';
const request=(ids,executive='9')=>({executiveId:executive,orderIds:ids});
test('bulk assignment accepts 2–25 unique order ids for one executive',()=>{
 assert.equal(validateBulkDeliveryAssignment(request(['11','12'])),null);
 assert.equal(validateBulkDeliveryAssignment(request(Array.from({length:25},(_,i)=>String(i+1)))),null);
 assert.match(validateBulkDeliveryAssignment(request(['1'])),/2 and 25/);
 assert.match(validateBulkDeliveryAssignment(request(Array.from({length:26},(_,i)=>String(i+1)))),/2 and 25/);
});
test('bulk assignment rejects invalid and repeated IDs',()=>{
 assert.match(validateBulkDeliveryAssignment(request(['1','1'])),/unique/);
 assert.match(validateBulkDeliveryAssignment(request(['0','2'])),/valid/);
 assert.match(validateBulkDeliveryAssignment(request(['abc','2'])),/valid/);
 assert.match(validateBulkDeliveryAssignment(request(['1','2'],'0')),/active delivery/);
 assert.match(validateBulkDeliveryAssignment({executiveId:'7',orderIds:'1,2'}),/2 and 25/);
});
test('bulk assignment retains existing payment and status checks',()=>{
 assert.equal(eligibleForAssignment({status:'shipped',payment_method:'cod'}),true);
 assert.equal(eligibleForAssignment({status:'processing',payment_method:'razorpay',payment_status:'razorpay_paid'}),true);
 assert.equal(eligibleForAssignment({status:'processing',payment_method:'razorpay',payment_status:'payment_pending'}),false);
 assert.equal(eligibleForAssignment({status:'cancelled',payment_method:'cod'}),false);
 assert.equal(canUpdateDelivery({status:'shipped',refund_status:null},{status:'assigned'},'out_for_delivery'),true);
});
import {readFileSync} from 'node:fs';
const controller=readFileSync(new URL('../controllers/deliveryController.js',import.meta.url),'utf8');
const routes=readFileSync(new URL('../routes/deliveryRoutes.js',import.meta.url),'utf8');
test('admin bulk endpoint is origin guarded and batch writes are transactional',()=>{
 assert.match(routes,/admin\.post\('\/assignments\/batch',originGuard,assignDeliveryBatch\)/);
 assert.match(controller,/export async function assignDeliveryBatch/);
 const body=controller.split('export async function assignDeliveryBatch')[1].split('export async function updateMyDelivery')[0];
 assert.match(body,/await db\.query\('BEGIN'\)/);
 assert.match(body,/await db\.query\('COMMIT'\)/);
 assert.match(body,/await db\.query\('ROLLBACK'\)/);
 assert.match(body,/SELECT \* FROM cod_orders WHERE id=\$1 FOR UPDATE/);
 assert.match(body,/prior\.rows\.length/);
});
test('staff workload uses a complete database count rather than only limited assignment list',()=>{
 assert.match(controller,/COUNT\(a\.order_id\) FILTER/);
 assert.match(controller,/openDeliveries:row\.open_deliveries/);
});
