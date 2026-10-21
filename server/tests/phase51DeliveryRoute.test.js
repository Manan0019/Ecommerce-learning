import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file = name => readFileSync(new URL(name,import.meta.url),'utf8');
test('Phase51 recovery server registers delivery staff and notifications',()=>{
 const routes=file('../routes/deliveryRoutes.js');
 const index=file('../index.js');
 assert.match(routes,/admin\.get\('\/health'/);
 assert.match(routes,/admin\.post\('\/staff'/);
 assert.match(routes,/admin\.get\('\/assignments'/);
 assert.match(routes,/admin\.use\(requireAdmin\)/);
 assert.match(index,/app\.use\("\/api\/admin\/delivery",adminDeliveryRoutes\)/);
 assert.match(index,/app\.use\("\/api\/delivery",deliveryRoutes\)/);
 assert.match(index,/app\.use\("\/api\/notifications",notificationRoutes\)/);
});
test('schema health is read-only and requires migration 028 tables',()=>{
 const routes=file('../routes/deliveryRoutes.js');
 assert.match(routes,/to_regclass\('public.delivery_staff_profiles'\)/);
 assert.match(routes,/to_regclass\('public.delivery_assignments'\)/);
 assert.match(routes,/to_regclass\('public.admin_notifications'\)/);
 assert.match(routes,/ready:Boolean/);
 const migration=file('../migrations/028_delivery_notifications.sql');
 for(const table of ['delivery_staff_profiles','delivery_assignments','admin_notifications'])assert.ok(migration.includes(`CREATE TABLE ${table}`));
});
