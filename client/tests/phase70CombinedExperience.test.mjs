import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=path.resolve(root,'../../server');
const readServer=p=>fs.readFileSync(path.join(server,p),'utf8');

test("original Phase 70 fixes remain enabled, and its stylesheet loads", () => {
  assert.match(p88('src/main.jsx'),/site\.css/);assert.match(p88('src/components/customer/RelatedProducts.jsx'),/showQuickAdd=\{false\}/);assert.match(p88('src/components/customer/ProductReviews.jsx'),/nx70-rating-line/);assert.match(p88('src/pages/admin/AdminProducts.jsx'),/nx70-preview-action/);assert.match(p88('src/styles/site.css'),/prefers-reduced-motion/);
});
test('editor permits independent persisted sale toggling with state and error handling',()=>{
 const s=read('components/admin/ProductEditorWorkspace.jsx');
 for(const term of ['setSaleBadge(productId, enabled)','setSaleEnabled(Boolean(product.showSaleBadge))','nx70-sale-editor','onChange={e => updateSale(e.target.checked)}','setError(failure.message'])assert.ok(s.includes(term),term);
});
test("sale state is visually distinct in admin products", () => {
  const products=p88('src/pages/admin/AdminProducts.jsx');const style=p88('src/styles/site.css');assert.match(products,/showSaleBadge/);assert.match(products,/aria-pressed/);assert.match(style,/nx70-sale-on|nx69-sale-action/);
});
test('sale appears on selected discounted detail configuration only',()=>{
 const s=read('pages/customer/ProductDetails.jsx');
 assert.match(s,/product\.showSaleBadge && discount > 0/);
 assert.match(s,/nx70-detail-sale-label/);
});
test("notifications use authenticated per-user read-all, not global unread reset", () => {
  const controller=p88('server/controllers/notificationsController.js');const routes=p88('server/routes/deliveryRoutes.js');const ui=p88('src/components/common/NotificationBell.jsx');assert.match(controller,/WHERE recipient_user_id=\$1 AND read_at IS NULL/);assert.match(routes,/requireAuthenticated,markAllNotificationsRead/);assert.match(ui,/markAllNotificationsRead\(\)/);assert.match(ui,/CountBadge/);assert.match(ui,/setUnread\(0\)/);
});
test('product category picker uses progressive hierarchy selectors instead of one long dropdown',()=>{
 const s=read('components/admin/CategoryPicker.jsx');
 assert.match(s,/CategoryPathSelector/);
 const cascade=read('components/admin/CategoryPathSelector.jsx');
 for(const term of ['categoryTrail','parentId','nx71-cascade-steps','Choose ${stepName(i).toLowerCase()}'])assert.ok(cascade.includes(term),term);
});
test('dashboard uses provider-neutral prepaid label without changing payment method identifiers',()=>{
 const s=read('pages/admin/AdminDashboard.jsx');
 assert.match(s,/<span>Prepaid orders<\/span>/);
 assert.match(s,/o\.paymentMethod==='Razorpay'/);
 assert.match(read('pages/admin/AdminOrders.jsx'),/\?'Prepaid':'COD'/);
});
test('reflection respects reduced motion and existing admin dangerous red actions',()=>{
 const s=read('styles/site.css');
 assert.match(s,/prefers-reduced-motion:reduce/);
 assert.match(s,/pointer-events:none/);
 assert.match(s,/:not\(\.nx69-icon-danger\)/);
});
