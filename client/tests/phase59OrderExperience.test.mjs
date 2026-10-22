import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('customer orders show saved product photos and names outside expandable details', () => {
 const s=read('src/pages/customer/Orders.jsx');
 assert.match(s,/nx59-customer-order-preview/);
 assert.match(s,/o\.items\.slice\(0,3\)/);
 assert.match(s,/item\.imageUrl/);
 assert.match(s,/OrderProductPreview/);
 assert.match(s,/String\(expandedId\)===String\(o\.id\)/);
 assert.match(s,/reconcileRazorpayOrder/);
 assert.match(s,/requestOrderCancellation/);
});
test('admin order action opens one accessible modal without navigating to another page', () => {
 const s=read('src/pages/admin/AdminOrders.jsx');
 assert.match(s,/<Modal key=\{o\.id\} size="order"/);
 assert.match(s,/onClick=\{\(\)=>setSelectedOrderId\(o\.id\)\}/);
 assert.match(s,/OrderTimeline order=\{o\}/);
 assert.match(s,/requestRazorpayRefund/);
 assert.match(s,/openAssignmentPicker\(o\)/);
 assert.doesNotMatch(s,/className="nx57-order-detail"/);
});
test('executive assignment dialog remains on Orders and fits a compact viewport', () => {
 const s=read('src/components/admin/DeliveryExecutivePicker.jsx');
 const css=read('src/styles/phase59.css');
 assert.match(s,/size="assignment"/);
 assert.match(s,/Confirm assignment/);
 assert.match(css,/\.nx-modal-assignment/);
 assert.match(css,/\.nx59-order-preview-item/);
 assert.match(read('src/main.jsx'),/phase59\.css/);
});
