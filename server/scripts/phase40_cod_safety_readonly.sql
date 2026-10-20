-- Phase 40 — READ ONLY checkout/inventory sanity report.
-- Use ONLY against the Nexora development database with migrations through 023.
-- No writes, UPDATEs, DELETEs, TRUNCATEs, or sequence changes.
BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS auditor;

-- Must return zero rows (orders whose totals are not mathematically consistent).
SELECT id,subtotal,shipping_fee,grand_total
FROM cod_orders WHERE subtotal + shipping_fee <> grand_total
ORDER BY id DESC LIMIT 50;

-- Must return zero rows (orders with no preserved item snapshot).
SELECT o.id,o.status,o.placed_at
FROM cod_orders o WHERE NOT EXISTS (SELECT 1 FROM cod_order_items i WHERE i.order_id=o.id)
ORDER BY o.id DESC LIMIT 50;

-- Must return zero rows (duplicates despite the uniqueness constraint).
SELECT customer_id,request_key,COUNT(*) AS copies
FROM cod_orders GROUP BY customer_id,request_key HAVING COUNT(*)>1;

-- Inspect totals. For historic orders, reporting differences may require
-- reconciliation; do not automatically change financial records.
SELECT o.id,o.subtotal,COALESCE(SUM(i.line_total),0) AS item_lines,
 o.subtotal-COALESCE(SUM(i.line_total),0) AS discrepancy
FROM cod_orders o LEFT JOIN cod_order_items i ON i.order_id=o.id
GROUP BY o.id HAVING o.subtotal<>COALESCE(SUM(i.line_total),0)
ORDER BY o.id DESC LIMIT 50;

-- Must return zero rows; no negative stock for either simple products or SKUs.
SELECT 'product' AS stock_type,id,stock FROM products WHERE stock<0
UNION ALL
SELECT 'variant',id,stock FROM product_variants WHERE stock<0;

-- Must return zero rows (cash collection must not precede delivery).
SELECT id,status,payment_status,cod_collected_at,delivered_at
FROM cod_orders WHERE payment_status='cod_collected'
AND (status<>'delivered' OR delivered_at IS NULL OR cod_collected_at IS NULL);

-- Current state counts, useful for operators testing dispatch and cancellation.
SELECT status,payment_status,COUNT(*) AS orders,COALESCE(SUM(grand_total),0) AS value_inr
FROM cod_orders GROUP BY status,payment_status ORDER BY status,payment_status;
COMMIT;
