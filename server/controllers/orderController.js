import { createHash } from "node:crypto";
import pool from "../config/db.js";
import { fromPaise, validateCartItems } from "../services/cartPricing.js";
import { canChangeOrderStatus, makeOrderLine, normalizeAddress, validOrderId, validRequestKey, validateAddress } from "../services/codOrderRules.js";

const statementError = (res, error, label) => {
  console.error(label, error);
  if (error.code === "42P01" || error.code === "42703") return res.status(503).json({ message: "COD order database migration 015 is not installed yet." });
  if (error.code === "23503") return res.status(409).json({ message: "Product or SKU is no longer available." });
  if (error.code === "40P01" || error.code === "40001") return res.status(409).json({ message: "Stock changed while ordering. Check your cart and retry." });
  return res.status(500).json({ message: "Could not complete the requested order operation." });
};
const serializeOrder = r => ({ id: String(r.id), status: r.status, paymentMethod: "Cash on Delivery", paymentStatus: "cod_pending", subtotal: r.subtotal, shippingFee: r.shipping_fee, total: r.grand_total, address: r.address_snapshot, placedAt: r.placed_at, updatedAt: r.updated_at, customerName: r.customer_name ?? null, customerEmail: r.customer_email ?? null });

// COD means an actual order. Stock is deducted ONLY after all validations inside a transaction.
export async function placeCodOrder(req, res) {
  const { items, address, requestKey, paymentMethod } = req.body || {};
  const invalid = validateCartItems(items);
  if (invalid || !items?.length) return res.status(400).json({ message: invalid || "Your cart is empty." });
  const addressError = validateAddress(address);
  if (addressError) return res.status(400).json({ message: addressError });
  if (paymentMethod !== "cod") return res.status(400).json({ message: "Only Cash on Delivery is supported." });
  if (!validRequestKey(requestKey)) return res.status(400).json({ message: "Invalid order request key." });
  const cleanAddress = normalizeAddress(address);
  const digest = createHash("sha256").update(JSON.stringify({ items: [...items].sort((a,b)=>`${a.productId}:${a.variantId ?? ""}`.localeCompare(`${b.productId}:${b.variantId ?? ""}`)), address: cleanAddress, paymentMethod })).digest("hex");
  const db = await pool.connect();
  let open = false;
  try {
    await db.query("BEGIN"); open = true;
    // Lock customer row to serialize identical submissions and concurrent orders for this account.
    const customer = await db.query("SELECT id FROM users WHERE id=$1 AND role='customer' FOR UPDATE", [req.user.id]);
    if (!customer.rows.length) { await db.query("ROLLBACK"); open=false; return res.status(403).json({message:"Customer account unavailable."}); }
    const duplicate = await db.query("SELECT * FROM cod_orders WHERE customer_id=$1 AND request_key=$2", [req.user.id, requestKey]);
    if (duplicate.rows.length) {
      await db.query("COMMIT"); open=false;
      if (duplicate.rows[0].request_digest !== digest) return res.status(409).json({message:"This request key was already used for a different order."});
      return res.status(200).json({ order: serializeOrder(duplicate.rows[0]), alreadyPlaced: true });
    }
    const ids = [...new Set(items.map(i => i.productId))];
    const variantIds = [...new Set(items.map(i=>i.variantId).filter(Boolean))];
    // Stable locking order reduces deadlocks when multiple shoppers order the same SKUs.
    const p = await db.query(`SELECT p.id,p.name,p.price,p.stock,p.image_url,p.is_active,c.is_active AS category_active
      FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=ANY($1::bigint[]) ORDER BY p.id FOR UPDATE OF p`, [ids]);
    const v = variantIds.length ? await db.query(`SELECT id,product_id,sku,attributes,price,stock,is_active
      FROM product_variants WHERE id=ANY($1::bigint[]) ORDER BY id FOR UPDATE`, [variantIds]) : {rows:[]};
    const configured = await db.query("SELECT DISTINCT product_id FROM product_variants WHERE product_id=ANY($1::bigint[])", [ids]);
    const products = new Map(p.rows.map(row=>[String(row.id),row]));
    const variants = new Map(v.rows.map(row=>[String(row.id),row]));
    const variantRequired = new Set(configured.rows.map(row=>String(row.product_id)));
    const lines = [];
    let subtotal=0n;
    for (const item of items) {
      const result = makeOrderLine(item,products.get(item.productId),item.variantId ? variants.get(item.variantId):null,variantRequired.has(item.productId));
      if (result.error) { await db.query("ROLLBACK");open=false;return res.status(409).json({message:result.error,requiresCartReview:true}); }
      lines.push(result);subtotal+=result.lineTotal;
    }
    if (subtotal <= 0n || subtotal > 999999999999n) { await db.query("ROLLBACK");open=false;return res.status(400).json({message:"Invalid order total."}); }
    const orderResult=await db.query(`INSERT INTO cod_orders (customer_id,request_key,request_digest,subtotal,grand_total,address_snapshot)
      VALUES($1,$2,$3,$4,$4,$5::jsonb) RETURNING *`, [req.user.id,requestKey,digest,fromPaise(subtotal),JSON.stringify(cleanAddress)]);
    const order=orderResult.rows[0];
    for(const line of lines) {
      await db.query(`INSERT INTO cod_order_items(order_id,product_id,variant_id,name_snapshot,sku_snapshot,attributes_snapshot,image_snapshot,quantity,unit_price,line_total)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10)`,[order.id,line.productId,line.variantId,line.name,line.sku,JSON.stringify(line.attributes),line.imageUrl,line.quantity,fromPaise(line.unitPrice),fromPaise(line.lineTotal)]);
      if(line.variantId) await db.query("UPDATE product_variants SET stock=stock-$1,updated_at=NOW() WHERE id=$2",[line.quantity,line.variantId]);
      else await db.query("UPDATE products SET stock=stock-$1 WHERE id=$2",[line.quantity,line.productId]);
    }
    await db.query("COMMIT");open=false;
    return res.status(201).json({order:serializeOrder(order),alreadyPlaced:false});
  }catch(error){if(open)await db.query("ROLLBACK").catch(()=>{});return statementError(res,error,"Place COD order:");}
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
