import pool from '../config/db.js';
import { notifyUser } from './notificationService.js';
import { broadcastUser } from './realtime.js';
import { wishlistTransitions } from './wishlistAlertRules.js';

// Product-level alerts (not SKU-specific): any sellable active variant counts as available.
// Do not use product.stock when SKUs exist, because the stored parent stock can be stale.
export const wishlistStateSelect = `
  SELECT w.user_id, w.product_id, w.alert_price, w.alert_available, w.alert_sale, w.alert_revision,
    p.name, p.is_active, c.is_active AS category_active,
    CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.in_stock,FALSE) ELSE p.stock>0 END
      AND p.is_active AND c.is_active AS available,
    CASE WHEN COALESCE(v.variant_count,0)>0 THEN COALESCE(v.min_in_stock_price,v.min_active_price,p.price)
      ELSE p.price END AS current_price,
    (p.show_sale_badge OR p.mrp>p.price OR COALESCE(v.has_discount,FALSE))
      AND p.is_active AND c.is_active AS on_sale,
    COALESCE(pref.back_in_stock,TRUE) AS back_in_stock,
    COALESCE(pref.price_drop,TRUE) AS price_drop,
    COALESCE(pref.sale_start,TRUE) AS sale_start
  FROM customer_wishlist w
  JOIN products p ON p.id=w.product_id
  JOIN categories c ON c.id=p.category_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::integer AS variant_count,
      BOOL_OR(is_active AND stock>0) AS in_stock,
      MIN(price) FILTER(WHERE is_active AND stock>0) AS min_in_stock_price,
      MIN(price) FILTER(WHERE is_active) AS min_active_price,
      BOOL_OR(is_active AND mrp>price) AS has_discount
    FROM product_variants WHERE product_id=p.id
  ) v ON TRUE
  LEFT JOIN wishlist_alert_preferences pref ON pref.user_id=w.user_id`;


const messages={
  stock: name=>({title:'Back in stock',message:`${name} is available again.`}),
  price: name=>({title:'Wishlist price drop',message:`The price of ${name} has decreased. Check the current offer.`}),
  sale: name=>({title:'Wishlist sale alert',message:`${name} is now on sale.`})
};
let scanning=false;
let pendingTimer=null;

export async function reconcileWishlistAlerts({productId=null, log=console}={}) {
  if(scanning)return {skipped:true};
  scanning=true;
  let db;
  const recipients=new Set();
  let scanned=0,created=0;
  try {
    db=await pool.connect();
    await db.query('BEGIN');
    // Advisory lock serializes simultaneous workers on the same PostgreSQL database.
    const lock=await db.query('SELECT pg_try_advisory_xact_lock(91091, 1) AS acquired');
    if(!lock.rows[0].acquired){await db.query('ROLLBACK');return {skipped:true};}
    const {rows}=await db.query(`${wishlistStateSelect}
      ${productId ? 'WHERE w.product_id=$1' : ''}
      ORDER BY w.product_id,w.user_id FOR UPDATE OF w`, productId ? [productId] : []);
    for(const state of rows){
      scanned++;
      const events=wishlistTransitions(state,state);
      // Preserve exact NUMERIC values; postgres returns them as strings.
      const changed=state.alert_price===null || state.alert_available===null || state.alert_sale===null ||
        Number(state.alert_price)!==Number(state.current_price) || state.alert_available!==state.available || state.alert_sale!==state.on_sale;
      if(!changed)continue;
      const revision=Number(state.alert_revision)+1;
      await db.query(`UPDATE customer_wishlist SET alert_price=$3,alert_available=$4,alert_sale=$5,alert_revision=$6
        WHERE user_id=$1 AND product_id=$2`,[state.user_id,state.product_id,state.current_price,state.available,state.on_sale,revision]);
      for(const event of events){
        const {title,message}=messages[event](String(state.name||'Product').slice(0,85));
        await notifyUser(db,state.user_id,{key:`wishlist:${state.product_id}:${event}:${revision}`,kind:'wishlist',title,message,path:`/products/${state.product_id}`});
        recipients.add(String(state.user_id));
        created++;
      }
    }
    await db.query('COMMIT');
  }catch(error){
    try{await db?.query('ROLLBACK');}catch{}
    log.error('Wishlist alert scan failed:',error);
    throw error;
  }finally{db?.release();scanning=false;}
  for(const id of recipients)broadcastUser(id,['notifications','wishlist']);
  return {scanned,created};
}

// Mutation callbacks are only hints. A periodic full scan also catches checkout,
// refund, sweeper, and missed events after reconnects/server restarts.
export function scheduleWishlistAlerts(productId=null){
  clearTimeout(pendingTimer);
  pendingTimer=setTimeout(()=>{
    pendingTimer=null;
    reconcileWishlistAlerts({productId}).catch(()=>{});
  },600);
  pendingTimer.unref?.();
}
export function startWishlistAlertWorker({log=console}={}){
  if(process.env.WISHLIST_ALERTS_ENABLED==='0')return ()=>{};
  const scan=()=>reconcileWishlistAlerts({log}).catch(()=>{});
  const first=setTimeout(scan,3000);first.unref?.();
  const timer=setInterval(scan,120000);timer.unref?.();
  return ()=>{clearTimeout(first);clearInterval(timer);clearTimeout(pendingTimer);};
}
