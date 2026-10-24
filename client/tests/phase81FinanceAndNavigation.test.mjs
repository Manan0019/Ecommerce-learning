import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const root=new URL('../src/',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
test('finance UI and menu are both role-appropriate',()=>{
 const shared=read('components/delivery/EarningsLedger.jsx');
 const admin=read('pages/admin/AdminFinance.jsx');
 const courier=read('pages/delivery/DeliveryDashboard.jsx');
 const nav=read('components/layout/AdminSidebar.jsx');
 assert.match(shared,/getMyEarnings/);assert.match(shared,/getAdminCollections/);
 assert.match(shared,/recordDeliveryPayout/);assert.match(shared,/Custom range/);
 assert.match(admin,/<EarningsLedger admin/);assert.match(courier,/<EarningsLedger \/>/);
 assert.match(nav,/\/admin\/finance/);
});
test('common leave-page dialog blocks SPA routes and preserves refresh guard',()=>{
 const app=read('App.jsx'),guard=read('components/common/UnsavedNavigationGuard.jsx');
 assert.match(app,/createBrowserRouter/);assert.match(app,/UnsavedNavigationGuard/);
 assert.match(guard,/useBlocker/);assert.match(guard,/beforeunload/);
 assert.match(guard,/Keep editing/);assert.match(guard,/Discard and leave/);
 assert.match(guard,/nexora:changes-saved/);
 assert.match(guard,/input\[type="search"\]/);
});
test("admin may edit name, email, phone and pay, and icon is centered", () => {
  const admin=p88('src/pages/admin/AdminDelivery.jsx');const team=p88('src/components/admin/DeliveryTeamTable.jsx');const style=p88('src/styles/modules/foundation/design-system.css');assert.match(admin,/editDeliveryStaff/);assert.match(admin,/Pay per completed delivery/);assert.match(team,/IconButton/);assert.match(style,/\.nx-ui-icon-button/);
});
