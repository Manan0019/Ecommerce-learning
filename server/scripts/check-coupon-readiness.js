/** Read-only preflight for enabling Nexora coupon checkout.
 * Run from server/: node scripts/check-coupon-readiness.js
 * Never prints environment secrets or mutates data.
 */
import 'dotenv/config';
import pool from '../config/db.js';

const requirements = {
  coupon_drafts: ['code', 'is_active', 'eligibility', 'max_redemptions'],
  coupon_redemptions: ['code', 'customer_id', 'order_id', 'status'],
  cod_orders: ['coupon_code', 'discount_amount'],
  cod_order_items: ['discount_amount'],
};
let ready = true;
try {
  const { rows } = await pool.query(`SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ANY($1::text[])`, [Object.keys(requirements)]);
  const found = new Set(rows.map(row => `${row.table_name}.${row.column_name}`));
  for (const [table, columns] of Object.entries(requirements)) {
    const missing = columns.filter(col => !found.has(`${table}.${col}`));
    if (missing.length) {
      ready = false;
      console.log(`MISSING ${table}: ${missing.join(', ')}`);
    } else {
      console.log(`READY ${table}`);
    }
  }
  console.log('COUPON_DB_READY=' + ready);
  console.log('COUPON_REDEMPTION_ENABLED=' + (process.env.COUPON_REDEMPTION_ENABLED === 'true'));
  if (!ready) {
    console.log('Apply pending migrations to a backed-up staging database before enabling checkout coupons.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error('Could not complete read-only coupon preflight:', error.code || error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
