-- READ-ONLY: run AFTER migration 015 and after placing a local test COD order.
SELECT current_database() AS connected_database;
SELECT to_regclass('public.cod_orders') AS cod_orders_table,
       to_regclass('public.cod_order_items') AS cod_order_items_table;
SELECT id, customer_id, status, payment_method, payment_status,
       subtotal, shipping_fee, grand_total, placed_at
FROM cod_orders ORDER BY id DESC LIMIT 20;
SELECT o.id AS order_id, o.subtotal,
       COALESCE(SUM(i.line_total),0) AS total_of_lines
FROM cod_orders o LEFT JOIN cod_order_items i ON i.order_id=o.id
GROUP BY o.id,o.subtotal HAVING o.subtotal <> COALESCE(SUM(i.line_total),0);
SELECT id, status, payment_status FROM cod_orders
WHERE payment_method <> 'cod' OR payment_status <> 'cod_pending';
-- Last two queries should return 0 rows when order totals and COD states are consistent.
