import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('admin product title and image have storefront preview without changing edit modal',()=>{
 const p=src('../src/pages/admin/AdminProducts.jsx');assert.match(p,/products\/\$\{product.id\}\/preview/);assert.match(p,/setEditor\(/);assert.match(p,/AdminProductEditDialog/);
 const dialog=src('../src/components/admin/AdminProductEditDialog.jsx');assert.match(dialog,/ProductEditorWorkspace/);
});
test('delivery role routing, assignment panel and separate delivery page exist',()=>{
 const app=src('../src/App.jsx');assert.match(app,/admin\/delivery/);assert.match(app,/delivery\/dashboard/);
 const page=src('../src/pages/delivery/DeliveryDashboard.jsx');assert.match(page,/getMyAssignments/);assert.match(page,/updateMyDelivery/);
});
test('admin notification inbox polls for new events',()=>{
 const c=src('../src/components/common/NotificationBell.jsx');assert.match(c,/setInterval/);assert.match(c,/markNotificationRead/);
});
test('dashboard has order and delivery overview',()=>{
 const p=src('../src/pages/admin/AdminDashboard.jsx');assert.match(p,/Recent orders/);assert.match(p,/Delivery operations/);
});
