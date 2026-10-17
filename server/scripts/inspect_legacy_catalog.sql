-- READ ONLY. Run in pgAdmin against the intended development database.
SELECT current_database() AS database_name, current_user AS database_user;
SELECT COUNT(*) AS products_count FROM products;
SELECT id, name, category_id, price, stock, image_url FROM products ORDER BY id;
SELECT id, name, slug, is_active FROM categories ORDER BY id;
SELECT c.id, c.name, COUNT(p.id) AS product_count
FROM categories c LEFT JOIN products p ON p.category_id=c.id
GROUP BY c.id, c.name ORDER BY c.id;
-- All foreign keys referencing products or categories, not just the known ones.
SELECT tc.table_schema, tc.table_name, kcu.column_name,
       ccu.table_name AS referenced_table, ccu.column_name AS referenced_column,
       rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_schema=kcu.constraint_schema AND tc.constraint_name=kcu.constraint_name
JOIN information_schema.referential_constraints rc
  ON rc.constraint_schema=tc.constraint_schema AND rc.constraint_name=tc.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_schema=tc.constraint_schema AND ccu.constraint_name=tc.constraint_name
WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name IN ('products', 'categories')
ORDER BY ccu.table_name, tc.table_name;
-- Do not delete any data based on this script alone.
