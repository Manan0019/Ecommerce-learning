import { setFeaturedMembership } from "./featuredController.js";
import pool from "../config/db.js";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { saveCatalogImage, removeCatalogImage } from "../services/catalogImageService.js";
const videoFolder = path.join(path.dirname(fileURLToPath(import.meta.url)), "../uploads/products");
const localVideoPrefix = "/uploads/products/";
function validVideoBytes(file) {
  const b = file?.buffer;
  if (!b || b.length < 12) return false;
  const mp4 = b.toString("ascii", 4, 8) === "ftyp";
  const webm = b.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]));
  return file.mimetype === "video/mp4" && mp4 || file.mimetype === "video/webm" && webm;
}
export const MAX_GALLERY_ITEMS = 60;
const idOK = v => typeof v === "string" && /^[1-9]\d*$/.test(v);
function youtubeUrl(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    let id = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    if (["www.youtube.com","youtube.com","m.youtube.com"].includes(host)) {
      if (u.pathname === "/watch") id = u.searchParams.get("v");
      else if (u.pathname.startsWith("/shorts/") || u.pathname.startsWith("/embed/")) id = u.pathname.split("/")[2];
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id || "") ? `https://www.youtube-nocookie.com/embed/${id}` : null;
  } catch { return null; }
}
const present = r => ({ id:String(r.id),type:r.media_type,url:r.media_url,order:r.sort_order,variantId:r.variant_id == null ? null : String(r.variant_id),optionKey:r.option_key ?? null,optionValue:r.option_value ?? null,isCardCover:Boolean(r.is_card_cover) });
export async function getProductMedia(req,res) {
 if (!idOK(req.params.id)) return res.status(400).json({message:"Invalid product ID"});
 try {
  const result=await pool.query(`SELECT m.* FROM product_media m JOIN products p ON p.id=m.product_id JOIN categories c ON c.id=p.category_id WHERE m.product_id=$1 AND p.is_active=TRUE AND c.is_active=TRUE ORDER BY m.sort_order,m.id`,[req.params.id]);
  return res.json({media:result.rows.map(present)});
 } catch(e) { console.error("Media load:",e);return res.status(500).json({message:"Unable to load gallery"}); }
}
export async function getAdminMedia(req,res) {
 if (!idOK(req.params.id)) return res.status(400).json({message:"Invalid product ID"});
 try {const result=await pool.query("SELECT * FROM product_media WHERE product_id=$1 ORDER BY sort_order,id",[req.params.id]);return res.json({media:result.rows.map(present)});}
 catch(e){console.error(e);return res.status(500).json({message:"Unable to load media"});}
}
export async function addProductMedia(req,res) {
 if (!idOK(req.params.id)) return res.status(400).json({message:"Invalid product ID"});
 let saved=null;
 let savedVideoPath=null;
 try {
  const existing=await pool.query("SELECT id FROM products WHERE id=$1",[req.params.id]);
  if(!existing.rows.length) return res.status(404).json({message:"Product not found"});
  const count=await pool.query("SELECT count(*)::integer AS n FROM product_media WHERE product_id=$1",[req.params.id]);
  if(count.rows[0].n>=MAX_GALLERY_ITEMS) return res.status(400).json({message:`Maximum ${MAX_GALLERY_ITEMS} gallery items`});
  let type,url;
  if(req.file && req.file.fieldname === "video") {
    if (!validVideoBytes(req.file)) return res.status(400).json({message:"Only valid MP4 or WebM video files are supported."});
    type="video";
    const ext = req.file.mimetype === "video/mp4" ? "mp4" : "webm";
    await mkdir(videoFolder, {recursive:true});
    const filename=`${crypto.randomUUID()}.${ext}`;
    savedVideoPath=path.join(videoFolder,filename);
    await writeFile(savedVideoPath,req.file.buffer,{flag:"wx"});
    url=`${localVideoPrefix}${filename}`;
  }
  else if(req.file){type="image";saved=await saveCatalogImage(req.file,"products",{required:true});url=saved.url;}
  else {type="youtube";url=youtubeUrl(req.body?.url);if(!url)return res.status(400).json({message:"Provide a supported HTTPS YouTube video URL, or upload an image"});}
  const result=await pool.query("INSERT INTO product_media(product_id,media_type,media_url,sort_order) VALUES($1,$2,$3,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM product_media WHERE product_id=$1)) RETURNING *",[req.params.id,type,url]);
  return res.status(201).json({media:present(result.rows[0])});
 }catch(e){await removeCatalogImage(saved);
  if(savedVideoPath) {try { await unlink(savedVideoPath); } catch(cleanupError) { console.error("Video cleanup error",cleanupError); }}
  console.error("Add media",e);return res.status(500).json({message:"Unable to add media"});}
}
export async function assignMediaVariant(req,res){
 if(!idOK(req.params.id)||!idOK(req.params.mediaId))return res.status(400).json({message:"Invalid ID"});
 const variantId=req.body?.variantId;
 if(variantId!==null&&!idOK(variantId))return res.status(400).json({message:"Choose a valid variant or Shared"});
 try {
  const result=await pool.query(`UPDATE product_media AS m SET variant_id=$3,option_key=NULL,option_value=NULL
   WHERE m.id=$1 AND m.product_id=$2 AND ($3::bigint IS NULL OR EXISTS
    (SELECT 1 FROM product_variants v WHERE v.id=$3 AND v.product_id=$2))
   RETURNING m.*`,[req.params.mediaId,req.params.id,variantId]);
  if(!result.rows.length)return res.status(404).json({message:"Media or product variant not found"});
  return res.json({media:present(result.rows[0])});
 }catch(e){console.error("Assign media",e);return res.status(500).json({message:"Unable to assign media"});}
}
export async function reorderProductMedia(req,res){
 if(!idOK(req.params.id)||!Array.isArray(req.body?.ids)||req.body.ids.length>MAX_GALLERY_ITEMS||req.body.ids.some(v=>!idOK(v))||new Set(req.body.ids).size!==req.body.ids.length)return res.status(400).json({message:"Invalid media ordering"});
 const client=await pool.connect();
 try{await client.query("BEGIN");await client.query("SELECT id FROM products WHERE id=$1 FOR UPDATE",[req.params.id]);
 const rows=await client.query("SELECT id::text AS id FROM product_media WHERE product_id=$1",[req.params.id]);
 if(rows.rows.length!==req.body.ids.length || !rows.rows.every(r=>req.body.ids.includes(r.id))){await client.query("ROLLBACK");return res.status(400).json({message:"Supply every gallery item exactly once"});}
 for(const [index,id] of req.body.ids.entries())await client.query("UPDATE product_media SET sort_order=$1 WHERE id=$2 AND product_id=$3",[index,id,req.params.id]);
 await client.query("COMMIT");return res.json({message:"Media order saved"});
 }catch(e){await client.query("ROLLBACK");console.error(e);return res.status(500).json({message:"Unable to reorder gallery"});}finally{client.release();}
}
export async function deleteProductMedia(req,res){
 if(!idOK(req.params.id)||!idOK(req.params.mediaId))return res.status(400).json({message:"Invalid ID"});
 try{const result=await pool.query("DELETE FROM product_media WHERE id=$1 AND product_id=$2 RETURNING id,media_url",[req.params.mediaId,req.params.id]);
 if(!result.rows.length)return res.status(404).json({message:"Media not found"});
 // Do not delete the local file automatically: it may be the product's legacy cover or shared.
 return res.json({message:"Gallery item removed"});
 }catch(e){console.error(e);return res.status(500).json({message:"Unable to remove media"});}
}
export const changeFeatured = setFeaturedMembership;

// Makes an existing image the storefront/card cover. Never allows a video cover.
export async function setMediaCover(req,res) {
 if(!idOK(req.params.id)||!idOK(req.params.mediaId)) return res.status(400).json({message:"Invalid product or media ID"});
 try {
  const result=await pool.query(`UPDATE products AS p
    SET image_url=m.media_url, updated_at=NOW()
    FROM product_media AS m
    WHERE p.id=$1 AND m.id=$2 AND m.product_id=p.id AND m.media_type='image'
    RETURNING p.id,p.image_url`,[req.params.id,req.params.mediaId]);
  if(!result.rows.length) return res.status(404).json({message:"Product or image not found"});
  return res.json({message:"Product cover updated",imageUrl:result.rows[0].image_url});
 } catch(error) {console.error("Cover update",error);return res.status(500).json({message:"Unable to update product cover"});}
}

// Media can be shared, targeted to an option value, or tied to an exact SKU.
export async function assignMediaScope(req,res) {
 if (!idOK(req.params.id)||!idOK(req.params.mediaId)) return res.status(400).json({message:"Invalid ID"});
 const {scope,variantId,optionKey,optionValue} = req.body || {};
 if (!["shared","option","variant"].includes(scope)) return res.status(400).json({message:"Select Shared, Option value, or Exact SKU."});
 if (scope === "variant" && !idOK(variantId)) return res.status(400).json({message:"Invalid SKU ID."});
 if (scope === "option" && (typeof optionKey!=="string" || !/^[a-z][a-z0-9_]{0,39}$/.test(optionKey) ||
     typeof optionValue!=="string" || !optionValue.trim() || optionValue.length>80)) return res.status(400).json({message:"Invalid option assignment."});
 const db=await pool.connect();
 try {
  await db.query("BEGIN");
  const media=await db.query("SELECT id FROM product_media WHERE id=$1 AND product_id=$2 FOR UPDATE",[req.params.mediaId,req.params.id]);
  if (!media.rows.length){await db.query("ROLLBACK");return res.status(404).json({message:"Gallery item not found."});}
  if (scope === "variant") {
   const variant=await db.query("SELECT id FROM product_variants WHERE id=$1 AND product_id=$2",[variantId,req.params.id]);
   if (!variant.rows.length){await db.query("ROLLBACK");return res.status(400).json({message:"Selected SKU does not belong to this product."});}
  }
  if (scope === "option") {
   const exists=await db.query(`SELECT 1 FROM product_variants WHERE product_id=$1 AND attributes->>$2=$3 LIMIT 1`,
      [req.params.id,optionKey,optionValue.trim()]);
   if (!exists.rows.length){await db.query("ROLLBACK");return res.status(400).json({message:"No SKU has that option value."});}
  }
  const {rows}=await db.query(`UPDATE product_media SET variant_id=$3, option_key=$4, option_value=$5, is_card_cover=FALSE
    WHERE id=$1 AND product_id=$2 RETURNING *`,[req.params.mediaId,req.params.id,
     scope==="variant"?variantId:null,scope==="option"?optionKey:null,scope==="option"?optionValue.trim():null]);
  await db.query("COMMIT");return res.json({media:present(rows[0])});
 }catch(e){await db.query("ROLLBACK");console.error("Media scope:",e);return res.status(500).json({message:"Could not assign gallery scope."});}
 finally{db.release();}
}

// Select a distinct catalogue cover for one color/option or one exact SKU.
// The global product cover remains in products.image_url, unchanged.
export async function setMediaCardCover(req, res) {
  if (!idOK(req.params.id) || !idOK(req.params.mediaId)) return res.status(400).json({ message: "Invalid product or media ID." });
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    const locked = await db.query("SELECT id FROM products WHERE id=$1 FOR UPDATE", [req.params.id]);
    if (!locked.rows.length) { await db.query("ROLLBACK"); return res.status(404).json({ message: "Product not found." }); }
    const result = await db.query(`SELECT * FROM product_media WHERE id=$1 AND product_id=$2 FOR UPDATE`, [req.params.mediaId,req.params.id]);
    const item = result.rows[0];
    if (!item) { await db.query("ROLLBACK"); return res.status(404).json({ message: "Gallery image not found." }); }
    if (item.media_type !== "image") { await db.query("ROLLBACK"); return res.status(400).json({ message: "Only images can be covers." }); }
    if (!item.option_key && !item.variant_id) { await db.query("ROLLBACK"); return res.status(400).json({ message: "Assign the image to a color or exact SKU first. For shared images, use Set main cover." }); }
    if (item.variant_id) {
      await db.query(`UPDATE product_media SET is_card_cover=FALSE WHERE product_id=$1 AND variant_id=$2`, [req.params.id,item.variant_id]);
    } else {
      await db.query(`UPDATE product_media SET is_card_cover=FALSE WHERE product_id=$1 AND option_key=$2 AND option_value=$3 AND variant_id IS NULL`, [req.params.id,item.option_key,item.option_value]);
    }
    await db.query("UPDATE product_media SET is_card_cover=TRUE WHERE id=$1 AND product_id=$2", [item.id,req.params.id]);
    await db.query("COMMIT");
    return res.json({ message: "Catalogue card cover saved.", mediaId: String(item.id) });
  } catch(error) {
    await db.query("ROLLBACK");
    console.error("Card cover update:", error);
    return res.status(500).json({ message: "Could not update catalogue card cover." });
  } finally { db.release(); }
}
