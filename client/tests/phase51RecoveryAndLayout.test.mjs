import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('the root departments selector precedes contextual subcategories',()=>{
 const source=read('../src/pages/customer/ProductList.jsx');
 assert.ok(source.indexOf('<section className="nx48-departments"') < source.indexOf('className="nx17-subcategories"'));
 assert.match(source,/rootCategories\(categories\)/);
 assert.match(source,/categories.filter\(c=>String\(c.parentId\)===String\(category.id\)\)/);
});
test('product cells clamp long titles and allow stock/price notes to wrap within table',()=>{
 const css=read('../src/styles/site.css');
 for(const required of ['table-layout:fixed','-webkit-line-clamp:2','white-space:normal','overflow-x:auto','flex-wrap:wrap']) assert.ok(css.includes(required),required);
 assert.match(read('../src/pages/admin/AdminProducts.jsx'),/title=\{product.name\}/);
});
test('admin delivery checks the backend service before enabling account creation',()=>{
 const source=read('../src/pages/admin/AdminDelivery.jsx');
 assert.match(source,/getDeliveryHealth\(controller.signal\)/);
 assert.match(source,/disabled=\{loading\|\|!serviceReady\}/);
 assert.match(source,/Delivery setup needs attention/);
 assert.match(source,/\{error&&<p className="admin-alert" role="alert">\{error\}<\/p>\}/);
 assert.match(read('../src/services/deliveryService.js'),/admin\/delivery\/health/);
});
test('dashboard degrades clearly if an optional delivery API is missing',()=>{
 const source=read('../src/pages/admin/AdminDashboard.jsx');
 assert.match(source,/labels=\['Store summary','Products','Orders','Inventory alerts','Delivery assignments'\]/);
 assert.match(source,/serviceIssues\.some/);
 assert.match(source,/Retry data/);
 assert.doesNotMatch(source,/Some dashboard data could not load\. Reload the page to try again/);
});
test('backend route and health check are included, and API HTML 404 is explained',()=>{
 const routes=read('../../server/routes/deliveryRoutes.js');
 const index=read('../../server/index.js');
 assert.match(routes,/admin.get\('\/health'/);
 assert.match(routes,/admin.post\('\/staff'/);
 assert.match(routes,/to_regclass\('public.delivery_staff_profiles'\)/);
 assert.match(index,/app.use\("\/api\/admin\/delivery",adminDeliveryRoutes\)/);
 assert.match(read('../src/services/apiClient.js'),/This feature is temporarily unavailable/);
});
test('unified stylesheet is imported once and retains later cascade rules',()=>{
 const main=read('../src/main.jsx');
 assert.match(main,/styles\/site\.css/);
 const css=read('../src/styles/site.css');
 assert.ok(css.indexOf('legacy layer 50.css')<css.indexOf('legacy layer 51.css'));
});
