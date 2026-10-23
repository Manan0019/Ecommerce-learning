import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../src');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const server=path.resolve(root,'../../server');
const readServer=p=>fs.readFileSync(path.join(server,p),'utf8');

test('original Phase 70 fixes remain enabled, and its stylesheet loads',()=>{
 assert.match(read('main.jsx'),/phase70\.css/);
 assert.match(read('components/customer/RelatedProducts.jsx'),/showQuickAdd=\{false\}/);
 assert.match(read('components/customer/ProductReviews.jsx'),/nx70-rating-line/);
 assert.match(read('pages/admin/AdminProducts.jsx'),/nx70-preview-action/);
 assert.match(read('styles/phase70.css'),/nx68-auth-reflect \.auth-submit::after/);
});
test('editor permits independent persisted sale toggling with state and error handling',()=>{
 const s=read('components/admin/ProductEditorWorkspace.jsx');
 for(const term of ['setSaleBadge(productId, enabled)','setSaleEnabled(Boolean(product.showSaleBadge))','nx70-sale-editor','onChange={e => updateSale(e.target.checked)}','setError(failure.message'])assert.ok(s.includes(term),term);
});
test('sale state is visually distinct in admin products',()=>{
 const s=read('pages/admin/AdminProducts.jsx');
 assert.match(s,/nx70-sale-on/);
 assert.match(s,/nx70-sale-off/);
 assert.match(s,/aria-pressed=\{Boolean\(product\.showSaleBadge\)\}/);
});
test('sale appears on selected discounted detail configuration only',()=>{
 const s=read('pages/customer/ProductDetails.jsx');
 assert.match(s,/product\.showSaleBadge && discount > 0/);
 assert.match(s,/nx70-detail-sale-label/);
});
test('notifications use authenticated per-user read-all, not global unread reset',()=>{
 const controller=readServer('controllers/notificationsController.js');
 const routes=readServer('routes/deliveryRoutes.js');
 assert.match(controller,/WHERE recipient_user_id=\$1 AND read_at IS NULL/);
 assert.match(routes,/notificationRoutes\.patch\('\/read-all',originGuard,requireAuthenticated,markAllNotificationsRead\)/);
 const ui=read('components/common/NotificationBell.jsx');
 assert.match(ui,/markAllNotificationsRead\(\)/);
 assert.match(ui,/setUnread\(0\)/);
 assert.match(ui,/unread>0&&<span className="nx46-bell-count"/);
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
 const s=read('styles/phase70.css');
 assert.match(s,/prefers-reduced-motion:reduce/);
 assert.match(s,/pointer-events:none/);
 assert.match(s,/:not\(\.nx69-icon-danger\)/);
});
