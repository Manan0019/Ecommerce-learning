import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('Review CTA is conditional on server eligibility',()=>{
 const source=read('components/customer/ProductReviews.jsx');
 assert.match(source,/\/eligibility/);assert.match(source,/!adminPreview&&reviewEligible&&<details/);
});
test("Customer directory has one visible magnifier and no read-only chip", () => {
  const page=p88('src/pages/admin/AdminCustomers.jsx');const search=p88('src/components/ui/SearchField.jsx');assert.doesNotMatch(page,/admin-readonly-badge/);assert.match(page,/<SearchField/);assert.match(search,/<UiIcon name="search"/);
});
test("Admin can delete only unused staff, visually distinct disable and delete actions", () => {
  const admin=p88('src/pages/admin/AdminDelivery.jsx');const team=p88('src/components/admin/DeliveryTeamTable.jsx');assert.match(admin,/deleteUnusedDeliveryStaff/);assert.match(team,/totalAssignments/);assert.match(team,/disabled=\{busy \|\| Number\(member\.totalAssignments/);assert.match(team,/variant="danger"/);assert.match(admin,/aria-invalid/);
});
test('Delivery portal offers edit profile without changing delivery ownership',()=>{
 const source=read('pages/delivery/DeliveryDashboard.jsx');
 assert.match(source,/updateMyDeliveryProfile/);assert.match(source,/Edit profile/);
});
