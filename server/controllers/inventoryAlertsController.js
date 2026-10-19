import pool from '../config/db.js';
import { inventoryAlertStatus } from '../services/inventoryRules.js';
export async function getLowStock(req, res) {
  const limit = req.query.limit === undefined ? 100 : Number(req.query.limit);
  if(!Number.isInteger(limit)||limit<0||limit>500) return res.status(400).json({message:'Limit must be between 0 and 500.'});
  try {
    // Variant rows are authoritative once any SKU exists. Simple products use parent stock.
    // Active records only: inactive SKUs and products cannot be purchased.
    const sql=`WITH alerts AS (
      SELECT p.id AS product_id, p.name AS product_name, v.id AS variant_id, v.sku,
        v.attributes, v.stock AS available, v.low_stock_threshold AS threshold
      FROM product_variants v JOIN products p ON p.id=v.product_id
      WHERE p.is_active=TRUE AND v.is_active=TRUE AND v.stock<=v.low_stock_threshold
      UNION ALL
      SELECT p.id,p.name,NULL::bigint,NULL::varchar(80),'{}'::jsonb,p.stock,p.low_stock_threshold
      FROM products p WHERE p.is_active=TRUE AND p.stock<=p.low_stock_threshold
        AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id)
    )
    SELECT product_id::text AS "productId",product_name AS "productName",variant_id::text AS "variantId",
      sku,attributes,available,threshold,COUNT(*) OVER()::integer AS total,
      COUNT(*) FILTER (WHERE available=0) OVER()::integer AS "outOfStock"
    FROM alerts ORDER BY (available=0) DESC,available ASC,product_name,variant_id LIMIT $1`;
    const {rows}=await pool.query(sql,[limit===0?1:limit]);
    const {rows:stats}= limit===0 ? await pool.query(`SELECT
      (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id=v.product_id
         WHERE p.is_active AND v.is_active AND v.stock<=v.low_stock_threshold)::integer AS variant_count,
      (SELECT COUNT(*) FROM products p WHERE p.is_active AND p.stock<=p.low_stock_threshold
         AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id))::integer AS simple_count,
      (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id=v.product_id
         WHERE p.is_active AND v.is_active AND v.stock=0)::integer AS variant_out,
      (SELECT COUNT(*) FROM products p WHERE p.is_active AND p.stock=0
         AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id))::integer AS simple_out`) : {rows:[]};
    const total=limit===0?stats[0].variant_count+stats[0].simple_count:Number(rows[0]?.total||0);
    const outOfStock=limit===0?stats[0].variant_out+stats[0].simple_out:Number(rows[0]?.outOfStock||0);
    const items=limit===0?[]:rows.map(({total:_total,outOfStock:_out,...item})=>({...item,status:inventoryAlertStatus(Number(item.available), Number(item.threshold))}));
    return res.json({summary:{total,outOfStock,lowStock:total-outOfStock},items});
  }catch(e){console.error('Low stock alert query:',e);return res.status(500).json({message:'Unable to retrieve stock alerts.'});}
}
