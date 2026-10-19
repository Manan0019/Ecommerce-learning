import { createHash } from "node:crypto";
import pool from "../config/db.js";
import { fromPaise, validateCartItems } from "../services/cartPricing.js";
import { calculateCheckout } from "../services/checkoutPricing.js";
import { canChangeOrderStatus, makeOrderLine, normalizeAddress, validOrderId, validRequestKey, validateAddress } from "../services/codOrderRules.js";

const statementError = (res, error, label) => {
  console.error(label, error);
  if (error.code === "42P01" || error.code === "42703") return res.status(503).json({ message: "COD database migrations 015–017 are required." });
  if (error.code === "23503") return res.status(409).json({ message: "Product or SKU is no longer available." });
  if (error.code === "40P01" || error.code === "40001") return res.status(409).json({ message: "Stock changed while ordering. Check your cart and retry." });
  return res.status(500).json({ message: "Could not complete the requested order operation." });
};
const serializeOrder = r => ({ taxTotal:r.tax_total, taxableValue:r.taxable_value, cgst:r.cgst, sgst:r.sgst, igst:r.igst, id: String(r.id), status: r.status, paymentMethod: "Cash on Delivery", paymentStatus: "cod_pending", subtotal: r.subtotal, shippingFee: r.shipping_fee, total: r.grand_total, address: r.address_snapshot, placedAt: r.placed_at, updatedAt: r.updated_at, customerName: r.customer_name ?? null, customerEmail: r.customer_email ?? null });

// Item identity/price/stock checks are identical for estimate and final COD placement.
async function loadOrderLines(db, items, lock = false) {
  const ids=[...new Set(items.map(i=>i.productId))];
  const variantIds=[...new Set(items.map(i=>i.variantId).filter(Boolean))];
  const p=await db.query(`SELECT p.id,p.name,p.price,p.stock,p.image_url,p.is_active,p.gst_percent,c.is_active AS category_active
    FROM products p JOIN categories c ON c.id=p.category_id
    WHERE p.id=ANY($1::bigint[]) ORDER BY p.id ${lock?'FOR UPDATE OF p':''}`,[ids]);
  const v=variantIds.length?await db.query(`SELECT id,product_id,sku,attributes,price,stock,is_active FROM product_variants
    WHERE id=ANY($1::bigint[]) ORDER BY id ${lock?'FOR UPDATE':''}`,[variantIds]):{rows:[]};
  const configured=await db.query('SELECT DISTINCT product_id FROM product_variants WHERE product_id=ANY($1::bigint[])',[ids]);
  const products=new Map(p.rows.map(r=>[String(r.id),r]));
  const variants=new Map(v.rows.map(r=>[String(r.id),r]));
  const variantRequired=new Set(configured.rows.map(r=>String(r.product_id)));
  const lines=[];
  for(const item of items){
    const product=products.get(item.productId);
    const line=makeOrderLine(item,product,item.variantId?variants.get(item.variantId):null,variantRequired.has(item.productId));
    if(line.error)return {error:line.error};
    lines.push({...line,gstPercent:product.gst_percent});
  }
  return {lines};
}
async function resolveAddress(db,userId,body){
  if(body?.addressId != null){
    if(!/^[1-9]\d*$/.test(String(body.addressId)))return {error:'Invalid saved address.'};
    const r=await db.query('SELECT * FROM customer_addresses WHERE customer_id=$1 AND id=$2',[userId,body.addressId]);
    if(!r.rows.length)return {error:'Saved address was not found.'};
    const a=r.rows[0];return {address:{fullName:a.full_name,phone:a.phone,addressLine1:a.address_line1,addressLine2:a.address_line2,city:a.city,state:a.state,pincode:a.pincode}};
  }
  const error=validateAddress(body?.address);
  return error?{error}:{address:normalizeAddress(body.address)};
}
async function fetchPolicy(db){const r=await db.query('SELECT * FROM store_checkout_settings WHERE id=1');if(!r.rows.length)throw new Error('Store shipping settings missing');return r.rows[0];}
const externalBreakdown=b=>({subtotal:b.subtotal,shippingFee:b.shippingFee,total:b.total,taxableValue:b.taxableValue,includedTax:b.includedTax,cgst:b.cgst,sgst:b.sgst,igst:b.igst,taxType:b.taxType});
export async function estimateCodOrder(req,res){
 const {items}=req.body||{};const invalid=validateCartItems(items);if(invalid||!items?.length)return res.status(400).json({message:invalid||'Cart is empty.'});
 try{const address=await resolveAddress(pool,req.user.id,req.body);if(address.error)return res.status(400).json({message:address.error});
  const policy=await fetchPolicy(pool);const result=await loadOrderLines(pool,items);
  if(result.error)return res.status(409).json({message:result.error,requiresCartReview:true});
  const lines=result.lines.map(x=>({...x,gstPercent:x.gstPercent??policy.default_item_gst_percent}));
  const amounts=calculateCheckout(lines,address.address.state,policy);
  return res.json({estimate:externalBreakdown(amounts),codEnabled:policy.cod_enabled,taxDisclaimer:'GST components are included in displayed prices. Tax settings must be verified before accepting live orders.'});
 }catch(e){return statementError(res,e,'Estimate COD order:');}
}
// Save COD orders and their stock deductions in one transaction, never trust client totals.
export async function placeCodOrder(req,res){
 const {items,requestKey,paymentMethod}=req.body||{};
 const invalid=validateCartItems(items);if(invalid||!items?.length)return res.status(400).json({message:invalid||'Your cart is empty.'});
 if(paymentMethod!=='cod')return res.status(400).json({message:'Only Cash on Delivery is supported.'});
 if(!validRequestKey(requestKey))return res.status(400).json({message:'Invalid order request key.'});
 const digest=createHash('sha256').update(JSON.stringify({items:[...items].sort((a,b)=>`${a.productId}:${a.variantId??''}`.localeCompare(`${b.productId}:${b.variantId??''}`)),addressId:req.body?.addressId??null,address:req.body?.addressId?null:req.body?.address,paymentMethod})).digest('hex');
 const db=await pool.connect();let open=false;
 try{
  await db.query('BEGIN');open=true;
  const customer=await db.query("SELECT id FROM users WHERE id=$1 AND role='customer' FOR UPDATE",[req.user.id]);
  if(!customer.rows.length){await db.query('ROLLBACK');open=false;return res.status(403).json({message:'Customer account unavailable.'});}
  const duplicate=await db.query('SELECT * FROM cod_orders WHERE customer_id=$1 AND request_key=$2',[req.user.id,requestKey]);
  if(duplicate.rows.length){await db.query('COMMIT');open=false;if(duplicate.rows[0].request_digest!==digest)return res.status(409).json({message:'Request key already used for another order.'});return res.json({order:serializeOrder(duplicate.rows[0]),alreadyPlaced:true});}
  const address=await resolveAddress(db,req.user.id,req.body);
  if(address.error){await db.query('ROLLBACK');open=false;return res.status(400).json({message:address.error});}
  const policy=await fetchPolicy(db);
  if(!policy.cod_enabled){await db.query('ROLLBACK');open=false;return res.status(409).json({message:'Cash on Delivery is not yet enabled by the store. Please try again later.'});}
  const result=await loadOrderLines(db,items,true);
  if(result.error){await db.query('ROLLBACK');open=false;return res.status(409).json({message:result.error,requiresCartReview:true});}
  const lines=result.lines.map(x=>({...x,gstPercent:x.gstPercent??policy.default_item_gst_percent}));
  const amounts=calculateCheckout(lines,address.address.state,policy);
  if(amounts._total<=0n||amounts._total>999999999999n){await db.query('ROLLBACK');open=false;return res.status(400).json({message:'Invalid order total.'});}
  const saved=await db.query(`INSERT INTO cod_orders(customer_id,request_key,request_digest,subtotal,shipping_fee,grand_total,address_snapshot,tax_total,taxable_value,cgst,sgst,igst)
    VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12) RETURNING *`,[req.user.id,requestKey,digest,amounts.subtotal,amounts.shippingFee,amounts.total,JSON.stringify(address.address),amounts.includedTax,amounts.taxableValue,amounts.cgst,amounts.sgst,amounts.igst]);
  const order=saved.rows[0];
  for(const [i,line] of lines.entries()){
    await db.query(`INSERT INTO cod_order_items(order_id,product_id,variant_id,name_snapshot,sku_snapshot,attributes_snapshot,image_snapshot,quantity,unit_price,line_total,gst_percent,included_tax)
      VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12)`,[order.id,line.productId,line.variantId,line.name,line.sku,JSON.stringify(line.attributes),line.imageUrl,line.quantity,fromPaise(line.unitPrice),fromPaise(line.lineTotal),line.gstPercent,amounts.itemTaxes[i]]);
    if(line.variantId)await db.query('UPDATE product_variants SET stock=stock-$1,updated_at=NOW() WHERE id=$2',[line.quantity,line.variantId]);
    else await db.query('UPDATE products SET stock=stock-$1 WHERE id=$2',[line.quantity,line.productId]);
  }
  await db.query('COMMIT');open=false;return res.status(201).json({order:serializeOrder(order),alreadyPlaced:false});
 }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});return statementError(res,e,'Place COD order:');}
 finally{db.release();}
}

async function loadItems(db,orderIds){
 if (!orderIds.length) return new Map();
 const result=await db.query(`SELECT order_id,product_id,variant_id,name_snapshot,sku_snapshot,attributes_snapshot,image_snapshot,quantity,unit_price,line_total
  FROM cod_order_items WHERE order_id=ANY($1::bigint[]) ORDER BY id`,[orderIds]);
 const map=new Map();for(const r of result.rows){ const key=String(r.order_id);if(!map.has(key))map.set(key,[]);map.get(key).push({productId:String(r.product_id),variantId:r.variant_id?String(r.variant_id):null,name:r.name_snapshot,sku:r.sku_snapshot,attributes:r.attributes_snapshot,imageUrl:r.image_snapshot,quantity:r.quantity,unitPrice:r.unit_price,lineTotal:r.line_total});}return map;
}
export async function myOrders(req,res){
 try {const r=await pool.query("SELECT * FROM cod_orders WHERE customer_id=$1 ORDER BY placed_at DESC,id DESC LIMIT 100",[req.user.id]);const items=await loadItems(pool,r.rows.map(x=>x.id));res.json({orders:r.rows.map(x=>({...serializeOrder(x),items:items.get(String(x.id))??[]}))});}
 catch(e){return statementError(res,e,"Customer orders:");}
}
export async function adminOrders(req,res){
 try {const r=await pool.query(`SELECT o.*,u.full_name AS customer_name,u.email AS customer_email FROM cod_orders o JOIN users u ON u.id=o.customer_id
 ORDER BY o.placed_at DESC,o.id DESC LIMIT 200`);const items=await loadItems(pool,r.rows.map(x=>x.id));return res.json({orders:r.rows.map(x=>({...serializeOrder(x),items:items.get(String(x.id))??[]}))});}
 catch(e){return statementError(res,e,"Admin orders:");}
}
export async function changeCodOrderStatus(req,res){
 const id=req.params.id;const status=req.body?.status;
 if(!validOrderId(id)||!(["confirmed","processing","cancelled"].includes(status)))return res.status(400).json({message:"Invalid order or status."});
 const db=await pool.connect();let open=false;
 try{
  await db.query("BEGIN");open=true;
  const r=await db.query("SELECT * FROM cod_orders WHERE id=$1 FOR UPDATE",[id]);
  if(!r.rows.length){await db.query("ROLLBACK");open=false;return res.status(404).json({message:"Order not found."});}
  const order=r.rows[0];
  if(!canChangeOrderStatus(order.status,status)){await db.query("ROLLBACK");open=false;return res.status(409).json({message:`Cannot change an order from ${order.status} to ${status}.`});}
  if(status==='cancelled'){
    const items=await db.query("SELECT product_id,variant_id,quantity FROM cod_order_items WHERE order_id=$1 ORDER BY id",[id]);
    for(const item of items.rows){
      if(item.variant_id)await db.query("UPDATE product_variants SET stock=stock+$1,updated_at=NOW() WHERE id=$2",[item.quantity,item.variant_id]);
      else await db.query("UPDATE products SET stock=stock+$1 WHERE id=$2",[item.quantity,item.product_id]);
    }
  }
  const changed=await db.query("UPDATE cod_orders SET status=$2,updated_at=NOW() WHERE id=$1 RETURNING *",[id,status]);
  await db.query("COMMIT");open=false;return res.json({order:serializeOrder(changed.rows[0])});
 }catch(e){if(open)await db.query("ROLLBACK").catch(()=>{});return statementError(res,e,"Update COD order:");}
 finally{db.release();}
}
export async function adminCodSummary(_req,res){
 try{const r=await pool.query(`SELECT COUNT(*)::int AS total_count,
 COUNT(*) FILTER (WHERE status='placed')::int AS pending_count,
 COUNT(*) FILTER (WHERE status='confirmed')::int AS confirmed_count,
 COUNT(*) FILTER (WHERE status='processing')::int AS processing_count,
 COALESCE(SUM(grand_total) FILTER (WHERE status <> 'cancelled'),0)::numeric(12,2) AS order_value
 FROM cod_orders`);return res.json({summary:{total:r.rows[0].total_count,placed:r.rows[0].pending_count,confirmed:r.rows[0].confirmed_count,processing:r.rows[0].processing_count,orderValue:r.rows[0].order_value}});}
 catch(e){return statementError(res,e,"COD summary:");}
}
