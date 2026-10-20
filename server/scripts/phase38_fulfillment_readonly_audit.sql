-- Read-only checks for the COD fulfillment migration 022.
-- Run on the DEVELOPMENT PostgreSQL database. No updates or deletes.
SELECT current_database() AS database_name;
SELECT column_name, data_type FROM information_schema.columns
 WHERE table_schema='public' AND table_name='cod_orders'
 AND column_name IN ('status','payment_status','delivery_partner','tracking_reference','shipped_at','delivered_at','cod_collected_at')
 ORDER BY column_name;
SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='cod_order_events') AS order_events_table_exists;
SELECT status, payment_status, COUNT(*) AS orders FROM cod_orders GROUP BY status,payment_status ORDER BY status,payment_status;
SELECT COUNT(*) AS delivered_without_shipped_time FROM cod_orders WHERE status='delivered' AND shipped_at IS NULL;
SELECT COUNT(*) AS collection_marked_before_delivery FROM cod_orders WHERE payment_status='cod_collected' AND status<>'delivered';
SELECT o.id, o.status, o.payment_status, COUNT(e.id) AS event_count
 FROM cod_orders o LEFT JOIN cod_order_events e ON e.order_id=o.id
 GROUP BY o.id,o.status,o.payment_status ORDER BY o.id DESC LIMIT 30;
