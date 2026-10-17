# Product wipe — NOT executed
Your ZIP contains source and migration files, not the output of your live database queries. Do not run a blind TRUNCATE/CASCADE.
1. Back up your PostgreSQL database using pg_dump.
2. Run the read-only dependency audit (below) on the correct database.
3. Check product references from order items, cart, reviews, variants and other tables.
4. Review precise target product IDs and dependent records before preparing a transaction for deletion.
5. Remove local product images only after verifying no surviving record references them. Never delete profile/category uploads.

```sql
SELECT count(*) AS product_count FROM products;
SELECT id,name,category_id,image_url FROM products ORDER BY id;
SELECT tc.table_schema,tc.table_name,kcu.column_name FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name AND tc.constraint_schema=kcu.constraint_schema
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name AND tc.constraint_schema=ccu.constraint_schema
WHERE tc.constraint_type='FOREIGN KEY' AND ccu.table_name='products';
```
