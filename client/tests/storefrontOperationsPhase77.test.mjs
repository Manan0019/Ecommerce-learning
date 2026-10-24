import {readFileSync as phase88ReadFile} from 'node:fs';
const p88 = relative => phase88ReadFile(new URL(relative.startsWith('server/')?'../../'+relative:'../'+relative,import.meta.url),'utf8');
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
test('unified categories trigger shows menu and retains category directory link',()=>{const s=read('src/components/layout/CategoryMegaMenu.jsx');assert.match(s,/nx78-category-unified/);assert.match(s,/to="\/categories"/);assert.match(s,/aria-expanded/)});
test('one image product has intentional hover and multi-image slideshow remains guarded',()=>{const card=read('src/components/common/ProductCard.jsx');const css=read('src/styles/modules/foundation/interactive-controls.css');assert.match(card,/nx77-single-image/);assert.match(card,/canPreviewGallery\(availableImages\)/);assert.match(css,/nx29-card-stage:hover \.nx29-card-image/);assert.match(css,/nx77-single-image::after\{content:none/)});
test("both delivery workspaces offer search and paginated tables", () => {
  const admin=p88('src/pages/admin/AdminDelivery.jsx');const team=p88('src/components/admin/DeliveryTeamTable.jsx');const executive=p88('src/pages/delivery/DeliveryDashboard.jsx');assert.match(admin,/<SearchField/);assert.match(admin,/<Pagination/);assert.match(team,/pageSize|Pagination/);assert.match(executive,/<SearchField/);assert.match(executive,/<Pagination/);
});
test('shipping settings make free delivery threshold explicit and preserve regional price preview',()=>{const s=read('src/pages/admin/AdminCheckoutSettings.jsx');for(const t of ['previewFee','free_shipping_above','nx77-shipping-help','within-state'])assert.ok(s.includes(t))});
test('coupons keep catalogue simulation and require deliberate publish',()=>{const s=read('src/pages/admin/AdminCoupons.jsx');assert.match(s,/\/api\/admin\/coupons\/test-cart/);assert.match(s,/setConfirmPublish/);assert.match(s,/redemptionReady/)});
test('Nexora styles stay purpose-named and have reduced motion',()=>{const build=read('scripts/build-styles.mjs'),css=read('src/styles/modules/foundation/interactive-controls.css');assert.match(build,/foundation\/interactive-controls.css/);assert.match(css,/prefers-reduced-motion/)});
