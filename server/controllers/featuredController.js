import pool from '../config/db.js';
import { orderFeaturedIds, isExactFeaturedReorder } from '../services/featuredOrdering.js';
const positiveId = value => typeof value === 'string' && /^[1-9]\d*$/.test(value);
const FEATURED_LOCK = 240017;

async function tx(handler) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [FEATURED_LOCK]);
    const result = await handler(client);
    await client.query('COMMIT');
    return result;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
async function readIds(client) {
  const { rows } = await client.query(`SELECT id::text AS id FROM products WHERE is_featured=TRUE
    ORDER BY featured_position ASC NULLS LAST, id DESC FOR UPDATE`);
  return rows.map(r => r.id);
}
async function writeIds(client, ids) {
  // Atomic renumbering, protected by advisory transaction lock. No unique rank conflicts.
  if (ids.length > 10000) throw new Error('FEATURED_LIMIT');
  for (let i = 0; i < ids.length; i++) {
    await client.query('UPDATE products SET featured_position=$1, updated_at=NOW() WHERE id=$2 AND is_featured=TRUE', [i + 1, ids[i]]);
  }
}
export async function listFeaturedAdmin(_req, res) {
  try {
    const { rows } = await pool.query(`SELECT p.id::text AS id, p.name, p.image_url AS "imageUrl", p.is_active AS "isActive",
      p.featured_position AS "position", c.name AS category FROM products p JOIN categories c ON c.id=p.category_id
      WHERE p.is_featured=TRUE ORDER BY p.featured_position ASC NULLS LAST,p.id DESC`);
    return res.json({ products: rows });
  } catch (e) { console.error('Featured list:',e); return res.status(500).json({message:'Unable to load featured products.'}); }
}
export async function searchFeaturedCandidates(req,res) {
  const q = String(req.query.q || '').trim();
  const category = req.query.category === 'all' || req.query.category === undefined ? null : String(req.query.category);
  const page = Math.max(1,Math.min(10000,Number.parseInt(req.query.page,10)||1));
  const limit=10;
  if(q.length>100 || (category!==null&&!/^[1-9]\d*$/.test(category))) return res.status(400).json({message:'Invalid catalogue filter.'});
  try {
    const where=`FROM products p JOIN categories c ON c.id=p.category_id
      WHERE p.is_active=TRUE AND p.is_featured=FALSE
      AND ($1='' OR p.name ILIKE '%' || $1 || '%' OR COALESCE(p.brand,'') ILIKE '%' || $1 || '%')
      AND ($2::bigint IS NULL OR p.category_id=$2::bigint)`;
    const params=[q,category];
    const [data,count]=await Promise.all([
      pool.query(`SELECT p.id::text AS id,p.name,p.image_url AS "imageUrl",c.name AS category ${where} ORDER BY p.name,p.id LIMIT $3 OFFSET $4`,[...params,limit,(page-1)*limit]),
      pool.query(`SELECT COUNT(*)::integer AS total ${where}`,params)
    ]);
    return res.json({products:data.rows,total:count.rows[0].total,page,pageSize:limit});
  }catch(e){console.error('Featured candidates:',e);return res.status(500).json({message:'Unable to search products.'});}
}
export async function setFeaturedMembership(req,res) {
  const {id}=req.params; const {isFeatured,position}=req.body || {};
  if(!positiveId(id)||typeof isFeatured!=='boolean'||(position!==undefined&&(!Number.isInteger(position)||position<1||position>10000)))
    return res.status(400).json({message:'Invalid featured product or position.'});
  try {
    const result=await tx(async client=>{
      const ids=await readIds(client);
      const found=await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE',[id]);
      if(!found.rows.length)return null;
      await client.query('UPDATE products SET is_featured=$1,featured_position=NULL,updated_at=NOW() WHERE id=$2',[isFeatured,id]);
      const next=orderFeaturedIds(ids,id,isFeatured,position);
      await writeIds(client,next);
      return next;
    });
    if(result===null)return res.status(404).json({message:'Product not found.'});
    return res.json({id,isFeatured,featuredPosition:isFeatured?result.indexOf(id)+1:null});
  }catch(e){console.error('Featured membership:',e);return res.status(500).json({message:'Unable to update featured product.'});}
}
export async function reorderFeatured(req,res) {
  const {ids}=req.body||{};
  try {
    const result=await tx(async client=>{
      const current=await readIds(client);
      if(!isExactFeaturedReorder(current,ids))return null;
      await writeIds(client,ids);
      return ids;
    });
    if(result===null)return res.status(409).json({message:'Featured products changed. Refresh the list and try again.'});
    return res.json({ids:result,message:'Featured display order saved.'});
  }catch(e){console.error('Featured reorder:',e);return res.status(500).json({message:'Unable to reorder featured products.'});}
}
