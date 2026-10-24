import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const base=new URL('../src/',import.meta.url);
const read=f=>readFileSync(new URL(f,base),'utf8');
test("Admin Delivery allows multi-order selection with confirm dialog", () => {
  const delivery=p88('src/pages/admin/AdminDelivery.jsx');assert.match(delivery,/selectedOrderIds/);assert.match(delivery,/assignDeliveryBatch\(selectedOrders\.map/);assert.match(delivery,/DeliveryBatchAssignmentDialog/);assert.match(delivery,/toggleAllOrders/);
});
test('Batch selector displays team workload and requires confirmation',()=>{
 const s=read('components/admin/DeliveryBatchAssignmentDialog.jsx');
 assert.match(s,/onAssign\(chosen\.id\)/);
 assert.match(s,/open deliveries/);
 assert.match(s,/orders\.map/);
});
test("Admin product hover styling never draws partial underlines", () => {
  const s=p88('src/styles/modules/foundation/design-system.css');const products=p88('src/pages/admin/AdminProducts.jsx');assert.match(s,/\.nx-ui-entity-title/);assert.match(s,/text-decoration:\s*none/);assert.match(s,/focus-visible/);assert.match(products,/EntityCell|EntityTitle/);
});
