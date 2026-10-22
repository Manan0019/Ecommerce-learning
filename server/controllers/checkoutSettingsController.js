import pool from '../config/db.js';
import { validateCheckoutSettings } from '../services/checkoutPricing.js';
export async function getCheckoutSettings(_req,res){try{const r=await pool.query('SELECT * FROM store_checkout_settings WHERE id=1');return res.json({settings:r.rows[0]});}catch(e){console.error('Checkout settings',e);return res.status(503).json({message:'Checkout settings migrations (017 and 030) are required.'});}}
export async function updateCheckoutSettings(req,res){const values=validateCheckoutSettings(req.body);if(!values)return res.status(400).json({message:'Invalid shipping, tax or COD settings.'});
try{const r=await pool.query(`UPDATE store_checkout_settings SET origin_state=$1,shipping_fee_in_state=$2,shipping_fee_other_state=$3,free_shipping_above=$4,shipping_gst_percent=$5,default_item_gst_percent=$6,cod_enabled=$7,tax_pricing_mode=$8,updated_at=NOW() WHERE id=1 RETURNING *`,Object.values(values));return res.json({settings:r.rows[0]});}
catch(e){console.error('Update checkout settings',e);return res.status(500).json({message:'Could not save checkout settings.'});}}
