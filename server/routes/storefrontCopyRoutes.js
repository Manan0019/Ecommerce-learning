import {Router} from 'express';
import pool from '../config/db.js';
import {requireAdmin} from '../middleware/authMiddleware.js';
import {defaultStorefrontCopy,validateStorefrontCopy,storefrontCopyFromRow} from '../services/storefrontCopyRules.js';
export const publicStorefrontCopyRoutes=Router();
export const adminStorefrontCopyRoutes=Router();
const read=()=>pool.query('SELECT content FROM store_home_content WHERE id=1');
publicStorefrontCopyRoutes.get('/',async(_req,res)=>{
 try{const {rows}=await read();res.set('Cache-Control','no-store');return res.json({copy:storefrontCopyFromRow(rows[0])});}
 catch{res.set('Cache-Control','no-store');return res.json({copy:defaultStorefrontCopy});}
});
adminStorefrontCopyRoutes.use(requireAdmin);
adminStorefrontCopyRoutes.use((req,res,next)=>{const origin=req.get('origin');if(origin&&origin!==(process.env.CLIENT_ORIGIN||'http://localhost:5173'))return res.status(403).json({message:'Origin not allowed.'});next();});
adminStorefrontCopyRoutes.get('/',async(_req,res)=>{try{const {rows}=await read();return res.json({copy:storefrontCopyFromRow(rows[0])});}catch{return res.status(503).json({message:'Storefront editor unavailable. Apply migration 036.'});}});
adminStorefrontCopyRoutes.put('/',async(req,res)=>{
 const copy=validateStorefrontCopy(req.body);
 if(!copy)return res.status(400).json({message:'Each heading needs 2 or more valid characters, within its allowed length.'});
 try{const {rows}=await pool.query("INSERT INTO store_home_content (id,content) VALUES(1,$1::jsonb) ON CONFLICT(id) DO UPDATE SET content=excluded.content,updated_at=now() RETURNING content",[JSON.stringify(copy)]);return res.json({copy:storefrontCopyFromRow(rows[0]),message:'Storefront wording saved.'});}
 catch(e){console.error('Storefront editor',e);return res.status(503).json({message:'Could not save storefront wording. Apply migration 036.'});}
});
