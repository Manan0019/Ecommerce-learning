import {Router} from 'express';
import pool from '../config/db.js';
import {requireAdmin} from '../middleware/authMiddleware.js';
import {validateCouponDraft,previewDraftCoupon} from '../services/couponDraftRules.js';
import {testCouponAgainstCatalogue} from '../services/couponCatalogueTest.js';
const router=Router();
router.use(requireAdmin);
router.use((req,res,next)=>{const origin=req.get('origin');if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Origin not allowed.'});next();});
const cols='code,discount_kind,discount_value,minimum_subtotal,max_redemptions,starts_at,expires_at,created_at,eligibility';
const present=r=>({code:r.code,kind:r.discount_kind,value:r.discount_value,minimumSubtotal:r.minimum_subtotal,maxRedemptions:r.max_redemptions,startsAt:r.starts_at,expiresAt:r.expires_at,createdAt:r.created_at,status:'draft',...(r.eligibility||{})});
router.post('/simulate', (req,res)=>{
  const draft = validateCouponDraft(req.body?.draft);
  if (!draft) return res.status(400).json({message:'Save valid coupon rules before previewing.'});
  try { return res.json(previewDraftCoupon(draft,req.body?.sample)); }
  catch(e) { return res.status(400).json({message:e.message}); }
});
// Use actual catalogue records for a safe dry-run; this NEVER discounts a customer payment.
router.post('/test-cart',async(req,res)=>{
 const code=String(req.body?.code||'').toUpperCase();
 const items=req.body?.items;
 if(!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code)||!Array.isArray(items)||!items.length||items.length>12||
    items.some(i=>!Number.isSafeInteger(Number(i.productId))||Number(i.productId)<1||!Number.isSafeInteger(i.quantity)||i.quantity<1||i.quantity>10)||
    new Set(items.map(i=>String(i.productId))).size!==items.length){return res.status(400).json({message:'Enter a saved code and 1–12 unique products with quantities from 1 to 10.'});}
 try{
  const [coupon,products,categories]=await Promise.all([
   pool.query('SELECT * FROM coupon_drafts WHERE code=$1',[code]),
   pool.query(`SELECT p.id,p.category_id,p.price,p.is_active,p.show_sale_badge,c.is_active AS category_active FROM products p JOIN categories c ON c.id=p.category_id WHERE p.id=ANY($1::integer[])`,[items.map(i=>Number(i.productId))]),
   pool.query('SELECT id,parent_id FROM categories')
  ]);
  if(!coupon.rows.length)return res.status(404).json({message:'Coupon draft not found.'});
  const row=coupon.rows[0];
  const validated=validateCouponDraft({code:row.code,kind:row.discount_kind,value:row.discount_value,minimumSubtotal:row.minimum_subtotal,
   maxRedemptions:row.max_redemptions,startsAt:row.starts_at,expiresAt:row.expires_at,...row.eligibility});
  if(!validated)return res.status(409).json({message:'Stored coupon has invalid rules. Edit and save it before testing.'});
  const result=testCouponAgainstCatalogue(validated,items,products.rows,categories.rows);
  return res.json(result);
 }catch(e){console.error('Test coupon against catalogue',e);return res.status(503).json({message:'Could not test against the current catalogue.'});}
});
router.get('/targets',async(req,res)=>{
 const type=req.query.type==='categories'?'categories':'products';
 const q=String(req.query.q||'').trim().slice(0,70);
 try{const sql=type==='categories'?'SELECT id,name FROM categories WHERE name ILIKE $1 ORDER BY name,id LIMIT 80':'SELECT id,name FROM products WHERE name ILIKE $1 ORDER BY name,id LIMIT 80';
 const {rows}=await pool.query(sql,['%'+q.replace(/[\\%_]/g,'')+'%']);
 return res.json({targets:rows,type});
 }catch(e){console.error('Coupon targets',e);return res.status(503).json({message:'Could not load coupon targets.'});}
});
router.get('/',async(_req,res)=>{try{const {rows}=await pool.query(`SELECT ${cols} FROM coupon_drafts ORDER BY created_at DESC LIMIT 200`);res.json({coupons:rows.map(present)});}catch(e){console.error(e);res.status(503).json({message:'Coupon drafts unavailable. Run migrations 035 and 037.'});}});
async function targetsExist(db,c){
 const {productIds,categoryIds,excludedProductIds}=c.eligibility;
 const wantedProducts=[...new Set([...productIds,...excludedProductIds])];
 if(wantedProducts.length){const r=await db.query('SELECT id FROM products WHERE id=ANY($1::integer[])',[wantedProducts]);if(r.rows.length!==wantedProducts.length)return false;}
 if(categoryIds.length){const r=await db.query('SELECT id FROM categories WHERE id=ANY($1::integer[])',[categoryIds]);if(r.rows.length!==categoryIds.length)return false;}
 return true;
}
router.post('/',async(req,res)=>{const c=validateCouponDraft(req.body);if(!c)return res.status(400).json({message:'Invalid draft: check discount, eligibility, selected products/categories and limits.'});try{
 if(!await targetsExist(pool,c))return res.status(400).json({message:'One or more selected products/categories no longer exist.'});
 const {rows}=await pool.query(`INSERT INTO coupon_drafts(code,discount_kind,discount_value,minimum_subtotal,max_redemptions,starts_at,expires_at,eligibility) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) RETURNING ${cols}`,[c.code,c.kind,c.value,c.minimumSubtotal,c.maxRedemptions,c.startsAt,c.expiresAt,JSON.stringify(c.eligibility)]);
 res.status(201).json({coupon:present(rows[0]),message:'Coupon rule saved as a draft. It cannot be redeemed yet.'});
 }catch(e){if(e.code==='23505')return res.status(409).json({message:'Coupon code already exists.'});console.error(e);res.status(500).json({message:'Coupon draft could not be saved.'});}});
router.put('/:code',async(req,res)=>{const c=validateCouponDraft(req.body);if(!c||String(req.params.code).toUpperCase()!==c?.code)return res.status(400).json({message:'Invalid coupon update. Existing code cannot be renamed.'});try{
 if(!await targetsExist(pool,c))return res.status(400).json({message:'Selected products or categories are unavailable.'});
 const r=await pool.query(`UPDATE coupon_drafts SET discount_kind=$2,discount_value=$3,minimum_subtotal=$4,max_redemptions=$5,starts_at=$6,expires_at=$7,eligibility=$8::jsonb WHERE code=$1 RETURNING ${cols}`,[c.code,c.kind,c.value,c.minimumSubtotal,c.maxRedemptions,c.startsAt,c.expiresAt,JSON.stringify(c.eligibility)]);
 if(!r.rowCount)return res.status(404).json({message:'Draft not found.'});return res.json({coupon:present(r.rows[0]),message:'Draft rules updated. Checkout remains unchanged.'});
 }catch(e){console.error(e);return res.status(500).json({message:'Coupon draft update failed.'});}});
router.delete('/:code',async(req,res)=>{const code=String(req.params.code||'').toUpperCase();if(!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code))return res.status(400).json({message:'Invalid coupon code.'});try{const r=await pool.query('DELETE FROM coupon_drafts WHERE code=$1',[code]);if(!r.rowCount)return res.status(404).json({message:'Coupon draft not found.'});res.json({message:'Draft deleted.'});}catch{res.status(500).json({message:'Could not delete draft.'});}});
export default router;
