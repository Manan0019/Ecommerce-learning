import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const f=path=>readFileSync(new URL(path,import.meta.url),'utf8');
test('customer uses themed dialog and order-ownership-guarded endpoint',()=>{
 const view=f('../src/pages/customer/Orders.jsx');
 const dialog=f('../src/components/customer/OrderCancellationDialog.jsx');
 assert.match(view,/Request cancellation/);
 assert.match(dialog,/aria-modal="true"/);
 assert.match(dialog,/Send cancellation request/);
 assert.match(f('../../server/routes/orderRoutes.js'),/customer\.post\("\/:id\/cancellation-request", checkWriteOrigin, requestOrderCancellation\)/);
 assert.match(f('../../server/controllers/orderCancellationController.js'),/customer_id=\$2 FOR UPDATE/);
});
test('admin retains refund approval path and COD cancellation path, without bypassing review',()=>{
 const view=f('../src/pages/admin/AdminOrders.jsx');
 assert.match(view,/Approve & refund/);
 assert.match(view,/Approve & cancel COD/);
 assert.match(view,/Decline request/);
 assert.match(f('../../server/controllers/orderController.js'),/A customer cancellation request is pending/);
 assert.match(f('../../server/controllers/razorpayRefundController.js'),/order_cancellation_requests SET status='approved'/);
});
