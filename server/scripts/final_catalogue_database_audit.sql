-- READ-ONLY PostgreSQL audit. Use in pgAdmin on your LOCAL DEVELOPMENT DB.
-- No DELETE/INSERT/UPDATE/DDL statements. Requires migrations 004-013.
-- Review schema errors if migrations have not all been applied.
BEGIN TRANSACTION READ ONLY;

-- 1) Confirm the expected catalogue tables exist.
SELECT name, to_regclass('public.' || name) IS NOT NULL AS exists
FROM (VALUES ('products'), ('categories'), ('product_variants'), ('product_media'),
             ('promotion_banners'), ('customer_wishlist')) AS expected(name)
ORDER BY name;

-- 2) Summary counts only; no customer data or secrets.
SELECT
 (SELECT COUNT(*) FROM products) AS products,
 (SELECT COUNT(*) FROM product_variants) AS variants,
 (SELECT COUNT(*) FROM product_media) AS gallery_items,
 (SELECT COUNT(*) FROM categories) AS categories,
 (SELECT COUNT(*) FROM promotion_banners) AS banners;

-- 3) Old parent category assignments: these records won't magically appear
-- in a newly created child category until reassigned from Edit Product.
SELECT c.name AS category, c.slug, COUNT(p.id)::int AS directly_assigned_products
FROM categories c LEFT JOIN products p ON p.category_id=c.id
GROUP BY c.id ORDER BY c.name;

-- 4) Check product-to-variant and media relations.
SELECT 'media points to variant on another product' AS issue, COUNT(*)::int AS affected
FROM product_media m JOIN product_variants v ON v.id=m.variant_id
WHERE v.product_id<>m.product_id
UNION ALL
SELECT 'variants with MRP below selling price', COUNT(*)::int
FROM product_variants WHERE mrp<price
UNION ALL
SELECT 'products with MRP below selling price', COUNT(*)::int
FROM products WHERE mrp<price
UNION ALL
SELECT 'category is own parent', COUNT(*)::int
FROM categories WHERE id=parent_id
UNION ALL
SELECT 'active promotion points to inactive product', COUNT(*)::int
FROM promotion_banners b JOIN products p ON p.id=b.product_id
WHERE b.is_active AND NOT p.is_active;

-- 5) Media scope counts: helps verify Shared / Option / Exact SKU.
SELECT CASE WHEN variant_id IS NOT NULL THEN 'Exact SKU'
            WHEN option_key IS NOT NULL THEN 'Matching option'
            ELSE 'Shared' END AS scope,
       COUNT(*)::int AS gallery_items
FROM product_media GROUP BY 1 ORDER BY 1;

-- 6) Available SKUs (sample aggregate, not sensitive user data).
SELECT COUNT(*) FILTER (WHERE is_active AND stock>0)::int AS active_in_stock,
       COUNT(*) FILTER (WHERE is_active AND stock=0)::int AS active_out_of_stock,
       COUNT(*) FILTER (WHERE NOT is_active)::int AS inactive_skus
FROM product_variants;

COMMIT;
