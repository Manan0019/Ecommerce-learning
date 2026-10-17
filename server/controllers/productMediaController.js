import pool from "../config/db.js";
import { saveCatalogImage, removeCatalogImage } from "../services/catalogImageService.js";
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
const present = r => ({ id:String(r.id),type:r.media_type,url:r.media_url,order:r.sort_order });
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
 try {
  const existing=await pool.query("SELECT id FROM products WHERE id=$1",[req.params.id]);
  if(!existing.rows.length) return res.status(404).json({message:"Product not found"});
  const count=await pool.query("SELECT count(*)::integer AS n FROM product_media WHERE product_id=$1",[req.params.id]);
  if(count.rows[0].n>=16) return res.status(400).json({message:"Maximum 16 gallery items"});
  let type,url;
  if(req.file){type="image";saved=await saveCatalogImage(req.file,"products",{required:true});url=saved.url;}
  else {type="youtube";url=youtubeUrl(req.body?.url);if(!url)return res.status(400).json({message:"Provide a supported HTTPS YouTube video URL, or upload an image"});}
  const result=await pool.query("INSERT INTO product_media(product_id,media_type,media_url,sort_order) VALUES($1,$2,$3,(SELECT COALESCE(MAX(sort_order),-1)+1 FROM product_media WHERE product_id=$1)) RETURNING *",[req.params.id,type,url]);
  return res.status(201).json({media:present(result.rows[0])});
 }catch(e){await removeCatalogImage(saved);console.error("Add media",e);return res.status(500).json({message:"Unable to add media"});}
}
export async function reorderProductMedia(req,res){
 if(!idOK(req.params.id)||!Array.isArray(req.body?.ids)||req.body.ids.length>16||req.body.ids.some(v=>!idOK(v))||new Set(req.body.ids).size!==req.body.ids.length)return res.status(400).json({message:"Invalid media ordering"});
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
export async function changeFeatured(req,res){
 if(!idOK(req.params.id)||typeof req.body?.isFeatured!=="boolean")return res.status(400).json({message:"Invalid featured flag"});
 try{const r=await pool.query("UPDATE products SET is_featured=$1,updated_at=NOW() WHERE id=$2 RETURNING id,is_featured",[req.body.isFeatured,req.params.id]);
 if(!r.rows.length)return res.status(404).json({message:"Product not found"});return res.json({id:String(r.rows[0].id),isFeatured:r.rows[0].is_featured});}
 catch(e){console.error(e);return res.status(500).json({message:"Unable to update featured status"});}
}
