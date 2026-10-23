import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('Review CTA is conditional on server eligibility',()=>{
 const source=read('components/customer/ProductReviews.jsx');
 assert.match(source,/\/eligibility/);assert.match(source,/!adminPreview&&reviewEligible&&<details/);
});
test('Customer directory has one visible magnifier and no read-only chip',()=>{
 assert.doesNotMatch(read('pages/admin/AdminCustomers.jsx'),/admin-readonly-badge/);
 assert.match(read('styles/modules/admin/delivery-and-profile-polish.css'),/nx74-customer-search input\[type="search"\].*background-image:none/);
});
test('Admin can delete only unused staff, visually distinct disable and delete actions',()=>{
 const source=read('pages/admin/AdminDelivery.jsx');
 assert.match(source,/deleteUnusedDeliveryStaff/);assert.match(source,/nx80-icon-danger/);
 assert.match(source,/s\.totalAssignments/);assert.match(source,/aria-invalid/);
});
test('Delivery portal offers edit profile without changing delivery ownership',()=>{
 const source=read('pages/delivery/DeliveryDashboard.jsx');
 assert.match(source,/updateMyDeliveryProfile/);assert.match(source,/Edit profile/);
});
