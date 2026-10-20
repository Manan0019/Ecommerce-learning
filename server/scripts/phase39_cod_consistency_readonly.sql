-- Nexora Phase 39: read-only checkout reliability / inventory accounting audit.
-- Execute only after migrations 015, 017 and 022. Run against your DEVELOPMENT DB.
-- Safe: SELECT only; does not change orders, payment statuses, stock or media.
SELECT current_database() AS database_name, NOW() AS checked_at;
-- Verify every order has at least one item and item subtotals match the order snapshot.
SELECT o.id AS order_id, o.status, o.subtotal AS stored_subtotal,
       COALESCE(SUM(i.line_total),0)::numeric(12,2) AS sum_of_item_lines,
       (o.subtotal - COALESCE(SUM(i.line_total),0))::numeric(12,2) AS difference
FROM cod_orders o LEFT JOIN cod_order_items i ON i.order_id=o.id
GROUP BY o.id,o.status,o.subtotal
HAVING COUNT(i.id)=0 OR ABS(o.subtotal - COALESCE(SUM(i.line_total),0)) > 0.01
ORDER BY o.id DESC LIMIT 100;
-- COD total must equal merchandise subtotal + shipping charge.
SELECT id, subtotal, shipping_fee, grand_total,
       (grand_total - subtotal - shipping_fee)::numeric(12,2) AS difference
FROM cod_orders
WHERE ABS(grand_total - subtotal - shipping_fee) > 0.01
ORDER BY id DESC LIMIT 100;
-- Each item line total must match quantity * captured unit price.
SELECT id,order_id,quantity,unit_price,line_total
FROM cod_order_items
WHERE ABS(line_total - unit_price * quantity) > 0.01
ORDER BY id DESC LIMIT 100;
-- Flag potentially inconsistent COD cash-collection state.
SELECT id,status,payment_status,delivered_at,cod_collected_at
FROM cod_orders
WHERE (payment_status='cod_collected' AND (status<>'delivered' OR cod_collected_at IS NULL))
   OR (payment_status='cod_pending' AND cod_collected_at IS NOT NULL)
ORDER BY id DESC LIMIT 100;
-- Review recent orders without modifying data.
SELECT id,status,payment_status,subtotal,shipping_fee,grand_total,placed_at
FROM cod_orders ORDER BY id DESC LIMIT 20;
