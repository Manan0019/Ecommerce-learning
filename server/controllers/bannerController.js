import pool from "../config/db.js";
import { saveCatalogImage, removeCatalogImage } from "../services/catalogImageService.js";

const idOk = v => typeof v === "string" && /^[1-9]\d*$/.test(v);
const map = r => ({id:String(r.id),title:r.title,subtitle:r.subtitle || "",imageUrl:r.image_url,linkUrl:r.link_url,
  position:r.position,categoryId:r.category_id == null ? null:String(r.category_id),categoryName:r.category_name || null,
  sortOrder:r.sort_order,isActive:r.is_active});
function validate(body) {
  const title=typeof body?.title === "string" ? body.title.trim() : "";
  const subtitle=typeof body?.subtitle === "string" ? body.subtitle.trim() : "";
  const position=body?.position;
  const categoryId=body?.categoryId || null;
  const linkUrl=typeof body?.linkUrl === "string" ? body.linkUrl.trim() : "/products";
  const sortOrder=Number(body?.sortOrder ?? 0);
  if (!title || title.length>150 || subtitle.length>300 || !["home","category"].includes(position) ||
      (position==="category" ? !idOk(categoryId) : Boolean(categoryId)) ||
      !/^\/(?:[a-zA-Z0-9?&=%._/\-]*)$/.test(linkUrl) || linkUrl.startsWith("//") ||
      !Number.isInteger(sortOrder) || sortOrder<0 || sortOrder>10000) return null;
  return {title,subtitle,position,categoryId,linkUrl,sortOrder};
}
const join = "LEFT JOIN categories c ON c.id=b.category_id";
const fields = "b.*, c.name AS category_name";
export async function listAdminBanners(_req,res) {
  try {const {rows}=await pool.query(`SELECT ${fields} FROM promotion_banners b ${join} ORDER BY b.position,b.category_id NULLS FIRST,b.sort_order,b.id`);res.json({banners:rows.map(map)});}
  catch(err){console.error(err);res.status(500).json({message:"Unable to load banners."});}
}
export async function listBanners(req,res) {
  const pos=req.query.position;
  if(!["home","category"].includes(pos))return res.status(400).json({message:"Invalid banner location."});
  const category=req.query.category;
  if(pos==="category" && (typeof category!=="string" || category.length>100))return res.status(400).json({message:"Invalid banner category."});
  try {
    const {rows}=await pool.query(`SELECT ${fields} FROM promotion_banners b ${join}
      WHERE b.is_active=TRUE AND b.position=$1
      AND ($1='home' AND b.category_id IS NULL OR $1='category' AND c.slug=$2 AND c.is_active=TRUE)
      ORDER BY b.sort_order,b.id LIMIT 12`,[pos,pos==="category"?category:null]);
    res.json({banners:rows.map(map)});
  }catch(err){console.error(err);res.status(500).json({message:"Unable to load promotions."});}
}
export async function createBanner(req,res) {
  const values=validate(req.body);
  if(!values)return res.status(400).json({message:"Invalid title, location, category, or link."});
  if(!req.file)return res.status(400).json({message:"Please upload a banner image."});
  let saved=null;
  try {
    saved=await saveCatalogImage(req.file,"banners",{required:true});
    const {rows}=await pool.query(`INSERT INTO promotion_banners(title,subtitle,image_url,link_url,position,category_id,sort_order)
      VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,[values.title,values.subtitle,saved.url,values.linkUrl,values.position,values.categoryId,values.sortOrder]);
    res.status(201).json({banner:map(rows[0])});
  }catch(err){await removeCatalogImage(saved);if(err.code==='23503')return res.status(400).json({message:"Category not found."});console.error(err);res.status(500).json({message:"Unable to add banner."});}
}
export async function updateBanner(req,res) {
  if(!idOk(req.params.id))return res.status(400).json({message:"Invalid banner ID."});
  const values=validate(req.body);
  if(!values)return res.status(400).json({message:"Invalid banner details."});
  let saved=null;
  try {
    if(req.file)saved=await saveCatalogImage(req.file,"banners");
    const {rows}=await pool.query(`UPDATE promotion_banners SET title=$1,subtitle=$2,image_url=COALESCE($3,image_url),link_url=$4,position=$5,category_id=$6,sort_order=$7,updated_at=NOW()
      WHERE id=$8 RETURNING *`,[values.title,values.subtitle,saved?.url||null,values.linkUrl,values.position,values.categoryId,values.sortOrder,req.params.id]);
    if(!rows.length){await removeCatalogImage(saved);return res.status(404).json({message:"Banner not found."});}
    res.json({banner:map(rows[0])});
  }catch(err){await removeCatalogImage(saved);if(err.code==='23503')return res.status(400).json({message:"Category not found."});console.error(err);res.status(500).json({message:"Unable to update banner."});}
}
export async function toggleBanner(req,res){
  if(!idOk(req.params.id)||typeof req.body?.isActive!=="boolean")return res.status(400).json({message:"Invalid request."});
  try{const {rows}=await pool.query('UPDATE promotion_banners SET is_active=$1,updated_at=NOW() WHERE id=$2 RETURNING *',[req.body.isActive,req.params.id]);
  if(!rows.length)return res.status(404).json({message:"Banner not found."});res.json({banner:map(rows[0])});}
  catch(err){console.error(err);res.status(500).json({message:"Unable to change banner status."});}
}
