import { Router } from 'express';
import pool from '../config/db.js';
import { requireCustomer } from '../middleware/authMiddleware.js';
const router=Router();
router.use(requireCustomer);
const validId=id=>/^[1-9]\d*$/.test(String(id||''));

router.get('/',async(req,res)=>{
 try{
  const {rows}=await pool.query(`SELECT p.id::text AS id,p.name,
    CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.min_in_stock_price,v.min_active_price,p.price) ELSE p.price END AS price,
    p.image_url AS "imageUrl",p.stock,c.name AS category,w.created_at AS "savedAt",
    CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.in_stock,FALSE) ELSE p.stock>0 END AS available,
    (p.show_sale_badge OR p.mrp>p.price OR COALESCE(v.has_discount,FALSE)) AS "onSale"
    FROM customer_wishlist w JOIN products p ON p.id=w.product_id
    JOIN categories c ON c.id=p.category_id
    LEFT JOIN LATERAL(SELECT COUNT(*)::integer AS variant_count,
      BOOL_OR(is_active AND stock>0) AS in_stock,
      MIN(price) FILTER(WHERE is_active AND stock>0) AS min_in_stock_price,
      MIN(price) FILTER(WHERE is_active) AS min_active_price,
      BOOL_OR(is_active AND mrp>price) AS has_discount
      FROM product_variants WHERE product_id=p.id) v ON TRUE
    WHERE w.user_id=$1 AND p.is_active=TRUE AND c.is_active=TRUE ORDER BY w.created_at DESC`,[req.user.id]);
  res.json({products:rows});
 }catch(error){console.error('Wishlist list:',error);res.status(500).json({message:'Wishlist unavailable.'});}
});

router.get('/alert-preferences',async(req,res)=>{
 try{
  const {rows}=await pool.query(`SELECT back_in_stock AS "backInStock",price_drop AS "priceDrop",sale_start AS "saleStart"
    FROM wishlist_alert_preferences WHERE user_id=$1`,[req.user.id]);
  res.json({preferences:rows[0]||{backInStock:true,priceDrop:true,saleStart:true}});
 }catch(error){console.error('Wishlist preferences:',error);res.status(500).json({message:'Alert preferences unavailable.'});}
});
router.patch('/alert-preferences',async(req,res)=>{
 const body=req.body||{};
 const keys=['backInStock','priceDrop','saleStart'];
 if(!keys.some(k=>Object.hasOwn(body,k)) || Object.keys(body).some(k=>!keys.includes(k)) || keys.some(k=>Object.hasOwn(body,k)&&typeof body[k]!=='boolean'))
   return res.status(400).json({message:'Choose valid alert preferences.'});
 try{
  const existing=await pool.query('SELECT back_in_stock,price_drop,sale_start FROM wishlist_alert_preferences WHERE user_id=$1',[req.user.id]);
  const current=existing.rows[0]||{back_in_stock:true,price_drop:true,sale_start:true};
  const {rows}=await pool.query(`INSERT INTO wishlist_alert_preferences(user_id,back_in_stock,price_drop,sale_start)
    VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET
      back_in_stock=EXCLUDED.back_in_stock,price_drop=EXCLUDED.price_drop,sale_start=EXCLUDED.sale_start,updated_at=NOW()
    RETURNING back_in_stock AS "backInStock",price_drop AS "priceDrop",sale_start AS "saleStart"`,
    [req.user.id,body.backInStock??current.back_in_stock,body.priceDrop??current.price_drop,body.saleStart??current.sale_start]);
  return res.json({preferences:rows[0]});
 }catch(error){console.error('Wishlist preference update:',error);return res.status(500).json({message:'Could not update alert preferences.'});}
});
router.get('/alerts',async(req,res)=>{
 try{
  const {rows}=await pool.query(`SELECT n.id::text AS id,n.kind,n.title,n.message,n.path,n.created_at,n.read_at,
      p.image_url AS "imageUrl" FROM admin_notifications n
      LEFT JOIN products p ON n.path=('/products/'||p.id::text)
      WHERE n.recipient_user_id=$1 AND n.kind='wishlist'
      ORDER BY n.created_at DESC,n.id DESC LIMIT 30`,[req.user.id]);
  return res.json({alerts:rows});
 }catch(error){console.error('Wishlist alert history:',error);return res.status(500).json({message:'Wishlist alerts unavailable.'});}
});

router.put('/:id',async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({message:'Invalid product ID.'});
 try{
  const result=await pool.query(`INSERT INTO customer_wishlist(user_id,product_id,alert_price,alert_available,alert_sale)
    SELECT $1,p.id,
      CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.min_in_stock_price,v.min_active_price,p.price) ELSE p.price END,
      CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.in_stock,FALSE) ELSE p.stock>0 END,
      (p.show_sale_badge OR p.mrp>p.price OR COALESCE(v.has_discount,FALSE))
    FROM products p JOIN categories c ON c.id=p.category_id
    LEFT JOIN LATERAL(SELECT COUNT(*)::integer AS variant_count,
      BOOL_OR(is_active AND stock>0) AS in_stock,
      MIN(price) FILTER(WHERE is_active AND stock>0) AS min_in_stock_price,
      MIN(price) FILTER(WHERE is_active) AS min_active_price,
      BOOL_OR(is_active AND mrp>price) AS has_discount
      FROM product_variants WHERE product_id=p.id) v ON TRUE
    WHERE p.id=$2 AND p.is_active=TRUE AND c.is_active=TRUE
    ON CONFLICT DO NOTHING RETURNING product_id`,[req.user.id,req.params.id]);
  if(!result.rowCount){const check=await pool.query('SELECT 1 FROM customer_wishlist WHERE user_id=$1 AND product_id=$2',[req.user.id,req.params.id]);
    if(!check.rowCount)return res.status(404).json({message:'Product not available.'});}
  res.json({saved:true});
 }catch(error){console.error('Wishlist add:',error);res.status(500).json({message:'Could not save product.'});}
});
router.delete('/:id',async(req,res)=>{
 if(!validId(req.params.id))return res.status(400).json({message:'Invalid product ID.'});
 try{await pool.query('DELETE FROM customer_wishlist WHERE user_id=$1 AND product_id=$2',[req.user.id,req.params.id]);res.json({saved:false});}
 catch(error){console.error('Wishlist remove:',error);res.status(500).json({message:'Could not remove product.'});}
});
export default router;
