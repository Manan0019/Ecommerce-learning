import pool from '../config/db.js';
import { normalizeAddress, validateAddress } from '../services/codOrderRules.js';

const validId = v => /^[1-9]\d*$/.test(String(v));
const mapAddress = r => ({id:String(r.id),label:r.label,fullName:r.full_name,phone:r.phone,addressLine1:r.address_line1,addressLine2:r.address_line2,city:r.city,state:r.state,pincode:r.pincode,isDefault:r.is_default});
export async function listAddresses(req,res){
  try { const r=await pool.query('SELECT * FROM customer_addresses WHERE customer_id=$1 ORDER BY is_default DESC,id DESC',[req.user.id]);return res.json({addresses:r.rows.map(mapAddress)}); }
  catch(e){console.error('List addresses',e);return res.status(500).json({message:'Could not load saved addresses.'});}
}
export async function saveAddress(req,res){
  const body=req.body||{};
  const err=validateAddress(body);if(err)return res.status(400).json({message:err});
  const label=String(body.label || 'Home').trim();if(!label || label.length>30)return res.status(400).json({message:'Invalid address label.'});
  const data=normalizeAddress(body),id=req.params.id;
  if(id && !validId(id))return res.status(400).json({message:'Invalid address ID.'});
  const db=await pool.connect();let started=false;
  try{
    await db.query('BEGIN');started=true;
    await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
    const count=await db.query('SELECT COUNT(*)::int AS total FROM customer_addresses WHERE customer_id=$1',[req.user.id]);
    if(!id && count.rows[0].total>=10){await db.query('ROLLBACK');started=false;return res.status(409).json({message:'Maximum 10 saved addresses.'});}
    const current=id?await db.query('SELECT * FROM customer_addresses WHERE customer_id=$1 AND id=$2',[req.user.id,id]):null;
    if(id&&!current.rows.length){await db.query('ROLLBACK');started=false;return res.status(404).json({message:'Address not found.'});}
    const makeDefault=body.isDefault===true || (!id && count.rows[0].total===0);
    if(makeDefault)await db.query('UPDATE customer_addresses SET is_default=false WHERE customer_id=$1',[req.user.id]);
    const values=[req.user.id,label,data.fullName,data.phone,data.addressLine1,data.addressLine2,data.city,data.state,data.pincode];
    const result=id?await db.query(`UPDATE customer_addresses SET label=$2,full_name=$3,phone=$4,address_line1=$5,address_line2=$6,city=$7,state=$8,pincode=$9,is_default=$10,updated_at=now() WHERE customer_id=$1 AND id=$11 RETURNING *`,[...values,makeDefault||current.rows[0].is_default,id]):await db.query(`INSERT INTO customer_addresses(customer_id,label,full_name,phone,address_line1,address_line2,city,state,pincode,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[...values,makeDefault]);
    await db.query('COMMIT');started=false;return res.status(id?200:201).json({address:mapAddress(result.rows[0])});
  }catch(e){if(started)await db.query('ROLLBACK').catch(()=>{});console.error('Save address',e);return res.status(500).json({message:'Could not save address.'});}finally{db.release();}
}
export async function deleteAddress(req,res){
  if(!validId(req.params.id))return res.status(400).json({message:'Invalid address.'});
  try {const r=await pool.query('DELETE FROM customer_addresses WHERE id=$1 AND customer_id=$2 RETURNING id',[req.params.id,req.user.id]);if(!r.rows.length)return res.status(404).json({message:'Address not found.'});return res.json({deleted:true});}
  catch(e){console.error('Delete address',e);return res.status(500).json({message:'Could not delete address.'});}
}
export async function setDefaultAddress(req,res){
  if(!validId(req.params.id))return res.status(400).json({message:'Invalid address.'});const db=await pool.connect();let open=false;
  try{await db.query('BEGIN');open=true;await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
    const r=await db.query('SELECT id FROM customer_addresses WHERE customer_id=$1 AND id=$2',[req.user.id,req.params.id]);if(!r.rows.length){await db.query('ROLLBACK');open=false;return res.status(404).json({message:'Address not found.'});}
    await db.query('UPDATE customer_addresses SET is_default=false WHERE customer_id=$1',[req.user.id]);await db.query('UPDATE customer_addresses SET is_default=true WHERE id=$1 AND customer_id=$2',[req.params.id,req.user.id]);
    await db.query('COMMIT');open=false;return res.json({updated:true});
  }catch(e){if(open)await db.query('ROLLBACK').catch(()=>{});console.error('Set default address',e);return res.status(500).json({message:'Could not update address.'});}finally{db.release();}
}
