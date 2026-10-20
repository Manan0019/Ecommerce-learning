import { validBannerDestination, validBannerPlacement } from "../services/bannerTargeting.js";
import { parseBannerVisualMode } from "../services/bannerVisualMode.js";
import { normalizePromotionOrder, parsePromotionSchedule, homeBannerCount } from "../services/promotionPlanning.js";
import pool from "../config/db.js";
import { saveCatalogImage, removeCatalogImage } from "../services/catalogImageService.js";

const idOk = value => typeof value === "string" && /^[1-9]\d{0,18}$/.test(value) && BigInt(value)<=9223372036854775807n;
const join = `LEFT JOIN categories c ON c.id=b.category_id
  LEFT JOIN products p ON p.id=b.product_id
  LEFT JOIN categories pc ON pc.id=p.category_id`;
const fields = "b.*, c.name AS category_name, p.name AS product_name";
const map = r => ({
  id: String(r.id), title:r.title, subtitle:r.subtitle||"", imageUrl:r.image_url, linkUrl:r.link_url,
  position:r.position, categoryId:r.category_id == null? null:String(r.category_id),
  categoryName:r.category_name||null, productId:r.product_id == null? null:String(r.product_id),
  productName:r.product_name||null, sortOrder:r.sort_order, showText:r.show_text !== false, isActive:r.is_active,
  startsAt:r.starts_at?.toISOString?.() ?? r.starts_at ?? null,
  endsAt:r.ends_at?.toISOString?.() ?? r.ends_at ?? null
});
function validate(body) {
  const title=typeof body?.title==="string"?body.title.trim():"";
  const subtitle=typeof body?.subtitle==="string"?body.subtitle.trim():"";
  const position=body?.position;
  const categoryId=body?.categoryId||null;
  const productId=body?.productId||null;
  const linkUrl=typeof body?.linkUrl==="string"?body.linkUrl.trim():"/products";
  const sortOrder=Number(body?.sortOrder??0);
  const showText=parseBannerVisualMode(body?.showText);
  const schedule=parsePromotionSchedule(body?.startsAt, body?.endsAt);
  if(showText === null || !schedule)return null;
  if(!title||title.length>150||subtitle.length>300||
     !validBannerPlacement(position,categoryId,productId)||!validBannerDestination(linkUrl)||
     !Number.isInteger(sortOrder)||sortOrder<0||sortOrder>10000)return null;
  return {title,subtitle,position,categoryId,productId,linkUrl,sortOrder,showText,...schedule};
}
async function validateTargets(values) {
  if(values.categoryId){
    const {rowCount}=await pool.query("SELECT 1 FROM categories WHERE id=$1 AND is_active=TRUE",[values.categoryId]);
    if(!rowCount)return "The selected category does not exist or is inactive.";
  }
  if(values.productId){
    const {rowCount}=await pool.query(`SELECT 1 FROM products p JOIN categories c ON c.id=p.category_id
      WHERE p.id=$1 AND p.is_active=TRUE AND c.is_active=TRUE`,[values.productId]);
    if(!rowCount)return "The selected promotion product does not exist or is inactive.";
  }
  // An internal product destination must resolve to an active product at publish/save time.
  const match=values.linkUrl.match(/^\/products\/([1-9]\d*)(?:\?variant=[1-9]\d*)?$/);
  if(match){
    const {rowCount}=await pool.query(`SELECT 1 FROM products p JOIN categories c ON c.id=p.category_id
      WHERE p.id=$1 AND p.is_active=TRUE AND c.is_active=TRUE`,[match[1]]);
    if(!rowCount)return "The redirect product does not exist or is inactive.";
  }
  return null;
}

export async function searchPromotionProducts(req,res){
  const q=req.query.q??"";
  if(typeof q!=="string"||q.length>120)return res.status(400).json({message:"Invalid product search."});
  try{
    const term=q.trim();
    const {rows}=await pool.query(`SELECT p.id,p.name,p.brand,c.name AS category_name FROM products p
      JOIN categories c ON c.id=p.category_id
      WHERE p.is_active=TRUE AND c.is_active=TRUE AND
        ($1='' OR p.name ILIKE '%'||$1||'%' OR COALESCE(p.brand,'') ILIKE '%'||$1||'%' OR p.id::text=$1)
      ORDER BY CASE WHEN p.name ILIKE $1||'%' THEN 0 ELSE 1 END,p.created_at DESC,p.id DESC LIMIT 20`,[term]);
    res.json({products:rows.map(r=>({id:String(r.id),name:r.name,brand:r.brand||"",category:r.category_name}))});
  }catch(err){console.error(err);res.status(500).json({message:"Unable to search products."});}
}
export async function listAdminBanners(_req,res){
  try {const {rows}=await pool.query(`SELECT ${fields} FROM promotion_banners b ${join}
    ORDER BY b.sort_order,b.id`);
    const display=await pool.query("SELECT home_visible_count FROM promotion_display_settings WHERE id=1");
    res.json({banners:rows.map(map),homeVisibleCount:display.rows[0]?.home_visible_count ?? 3});
  }catch(err){console.error(err);res.status(500).json({message:"Unable to load banners."});}
}
export async function listBanners(req,res){
  const pos=req.query.position;
  if(!["home","category","product"].includes(pos))return res.status(400).json({message:"Invalid banner location."});
  const category=req.query.category;
  const product=req.query.product;
  if(pos==="category"&&(typeof category!=="string"||!category||category.length>100))
    return res.status(400).json({message:"Invalid banner category."});
  if(pos==="product"&&!idOk(product))return res.status(400).json({message:"Invalid banner product ID."});
  try{
    const {rows}=await pool.query(`SELECT ${fields} FROM promotion_banners b ${join}
      WHERE b.is_active=TRUE
        AND (b.starts_at IS NULL OR b.starts_at<=NOW())
        AND (b.ends_at IS NULL OR b.ends_at>NOW())
        AND (
          ($1='home' AND (b.position='home' OR (b.position='both' AND c.is_active=TRUE)
              OR (b.position='home_product' AND p.is_active=TRUE AND pc.is_active=TRUE)))
          OR ($1='category' AND b.position IN ('category','both') AND c.slug=$2 AND c.is_active=TRUE)
          OR ($1='product' AND b.position IN ('product','home_product') AND b.product_id=$3::bigint
              AND p.is_active=TRUE AND pc.is_active=TRUE)
        )
      ORDER BY b.sort_order,b.id LIMIT 12`,[pos,pos==="category"?category:null,pos==="product"?product:null]);
    const display=pos === "home" ? await pool.query("SELECT home_visible_count FROM promotion_display_settings WHERE id=1") : null;
    res.json({banners:rows.map(map),homeVisibleCount:display?.rows[0]?.home_visible_count ?? 3});
  }catch(err){console.error(err);res.status(500).json({message:"Unable to load promotions."});}
}
export async function createBanner(req,res){
  const values=validate(req.body);
  if(!values)return res.status(400).json({message:"Invalid banner title, placement, target or link."});
  if(!req.file)return res.status(400).json({message:"Please upload a banner image."});
  let saved=null;
  try{
    const targetError=await validateTargets(values);
    if(targetError)return res.status(400).json({message:targetError});
    saved=await saveCatalogImage(req.file,"banners",{required:true});
    const client=await pool.connect();
    let rows;
    try {
      await client.query("BEGIN");
      await client.query("LOCK TABLE promotion_banners IN SHARE ROW EXCLUSIVE MODE");
      ({rows}=await client.query(`INSERT INTO promotion_banners
        (title,subtitle,image_url,link_url,position,category_id,product_id,sort_order,show_text,starts_at,ends_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,
          (SELECT COALESCE(MAX(sort_order),0)+1 FROM promotion_banners),$8,$9,$10) RETURNING *`,
        [values.title,values.subtitle,saved.url,values.linkUrl,values.position,
         values.categoryId,values.productId,values.showText,values.startsAt,values.endsAt]));
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK");throw error; }
    finally {client.release();}
    res.status(201).json({banner:map(rows[0])});
  }catch(err){await removeCatalogImage(saved);if(err.code==='23503')return res.status(400).json({message:"Promotion target not found."});console.error(err);res.status(500).json({message:"Unable to add banner."});}
}
export async function updateBanner(req,res){
  if(!idOk(req.params.id))return res.status(400).json({message:"Invalid banner ID."});
  const values=validate(req.body);
  if(!values)return res.status(400).json({message:"Invalid banner details."});
  let saved=null;
  try{
    const targetError=await validateTargets(values);
    if(targetError)return res.status(400).json({message:targetError});
    if(req.file)saved=await saveCatalogImage(req.file,"banners");
    const {rows}=await pool.query(`UPDATE promotion_banners SET
      title=$1,subtitle=$2,image_url=COALESCE($3,image_url),link_url=$4,position=$5,
      category_id=$6,product_id=$7,show_text=$8,starts_at=$9,ends_at=$10,updated_at=NOW()
      WHERE id=$11 RETURNING *`,
      [values.title,values.subtitle,saved?.url||null,values.linkUrl,values.position,values.categoryId,values.productId,values.showText,values.startsAt,values.endsAt,req.params.id]);
    if(!rows.length){await removeCatalogImage(saved);return res.status(404).json({message:"Banner not found."});}
    res.json({banner:map(rows[0])});
  }catch(err){await removeCatalogImage(saved);if(err.code==='23503')return res.status(400).json({message:"Promotion target not found."});console.error(err);res.status(500).json({message:"Unable to update banner."});}
}
export async function toggleBanner(req,res){
  if(!idOk(req.params.id)||typeof req.body?.isActive!=="boolean")return res.status(400).json({message:"Invalid request."});
  try{const {rows}=await pool.query('UPDATE promotion_banners SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[req.body.isActive,req.params.id]);
    if(!rows.length)return res.status(404).json({message:"Banner not found."});res.json({banner:map(rows[0])});}
  catch(err){console.error(err);res.status(500).json({message:"Unable to change banner status."});}
}

/** All positions are 1-based and unique after this atomic write. The client must send
 * the complete current list so concurrent admin changes fail instead of losing changes. */
export async function reorderBanners(req,res) {
  if(!Array.isArray(req.body?.ids) || req.body.ids.length > 500)
    return res.status(400).json({message:"Provide the complete promotion order."});
  const client=await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("LOCK TABLE promotion_banners IN SHARE ROW EXCLUSIVE MODE");
    const {rows}=await client.query("SELECT id::text AS id FROM promotion_banners ORDER BY sort_order,id");
    const currentIds=rows.map(r=>r.id);
    const ids=normalizePromotionOrder(req.body.ids,currentIds);
    const expectedIds=normalizePromotionOrder(req.body.expectedIds,currentIds);
    if(!ids || !expectedIds || expectedIds.some((id,i)=>id!==currentIds[i])){
      await client.query("ROLLBACK");
      return res.status(409).json({message:"Promotion positions changed in another session. Refresh before saving."});
    }
    await client.query(`UPDATE promotion_banners b SET sort_order = ranked.position_number,
      updated_at=NOW() FROM unnest($1::bigint[]) WITH ORDINALITY AS ranked(id,position_number)
      WHERE b.id=ranked.id`,[ids]);
    await client.query("COMMIT");
    res.json({message:"Promotion positions saved.",positions:ids.map((id,i)=>({id,number:i+1}))});
  }catch(err){try{await client.query("ROLLBACK");}catch{}console.error(err);res.status(500).json({message:"Unable to save positions."});}
  finally{client.release();}
}

export async function updatePromotionDisplay(req,res) {
  const count=homeBannerCount(req.body?.homeVisibleCount);
  if(count===null)return res.status(400).json({message:"Choose between 1 and 3 homepage banners."});
  try{
    const {rows}=await pool.query(`INSERT INTO promotion_display_settings(id,home_visible_count)
      VALUES(1,$1) ON CONFLICT(id) DO UPDATE SET home_visible_count=$1,updated_at=NOW()
      RETURNING home_visible_count`,[count]);
    res.json({homeVisibleCount:rows[0].home_visible_count});
  }catch(err){console.error(err);res.status(500).json({message:"Unable to change banner layout."});}
}
