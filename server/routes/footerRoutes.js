import {Router} from 'express';
import multer from 'multer';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pool from '../config/db.js';
import {requireAdmin} from '../middleware/authMiddleware.js';
import {footerFromRow,validateFooterContent} from '../services/footerContentRules.js';
export const publicFooterRoutes=Router(), adminFooterRoutes=Router();
const folder=fileURLToPath(new URL('../uploads/branding/',import.meta.url));
const read=()=>pool.query('SELECT * FROM store_footer_content WHERE id=1');
publicFooterRoutes.get('/',async (_req,res)=>{try{const {rows}=await read();res.set('Cache-Control','no-store');res.json({footer:footerFromRow(rows[0])});}catch(e){console.error('Read footer',e);res.status(503).json({message:'Footer settings are temporarily unavailable.'});}});
adminFooterRoutes.use(requireAdmin);
adminFooterRoutes.use((req,res,next)=>{const origin=req.get('origin'),expected=process.env.CLIENT_ORIGIN||'http://localhost:5173';if(origin&&origin!==expected)return res.status(403).json({message:'Origin not allowed.'});next();});
adminFooterRoutes.get('/',async (_req,res)=>{try{const {rows}=await read();res.json({footer:footerFromRow(rows[0])});}catch{res.status(503).json({message:'Footer settings unavailable.'});}});
adminFooterRoutes.put('/',async(req,res)=>{const valid=validateFooterContent(req.body);if(!valid)return res.status(400).json({message:'Enter both headlines and 2–12 ticker phrases (2–38 characters each).'});
 try{const {rows}=await pool.query(`UPDATE store_footer_content SET headline_primary=$1,headline_accent=$2,ticker_items=$3::jsonb,updated_at=now() WHERE id=1 RETURNING *`,[valid.headlinePrimary,valid.headlineAccent,JSON.stringify(valid.tickerItems)]);if(!rows.length)return res.status(503).json({message:'Footer settings are temporarily unavailable.'});res.json({footer:footerFromRow(rows[0])});}catch(e){console.error('Update footer',e);res.status(500).json({message:'Footer settings could not be saved.'});}
});
const upload=multer({storage:multer.memoryStorage(),limits:{files:1,fileSize:5*1024*1024},fileFilter(_req,file,cb){cb(null,['image/png','image/jpeg','image/webp'].includes(file.mimetype));}});
adminFooterRoutes.post('/artwork',upload.single('image'),async(req,res)=>{if(!req.file)return res.status(400).json({message:'Choose a PNG, JPEG or WebP image under 5 MB.'});let filename;
 try{
  const img=sharp(req.file.buffer,{failOn:'error',limitInputPixels:15000000});const meta=await img.metadata();
  if(!['png','jpeg','webp'].includes(meta.format)||!meta.width||!meta.height||meta.width<150||meta.height<150)return res.status(400).json({message:'Image needs at least 150 × 150 pixels.'});
  const bytes=await img.rotate().resize({width:720,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:84}).toBuffer();
  await mkdir(folder,{recursive:true});filename=`footer-${randomUUID()}.webp`;await writeFile(path.join(folder,filename),bytes,{flag:'wx'});
  const url=`/uploads/branding/${filename}`;
  const r=await pool.query('UPDATE store_footer_content SET artwork_url=$1,updated_at=now() WHERE id=1 RETURNING *',[url]);
  if(!r.rowCount)throw new Error('Footer record missing');return res.json({footer:footerFromRow(r.rows[0])});
 }catch(e){if(filename)await unlink(path.join(folder,filename)).catch(()=>{});console.error('Footer artwork',e);return res.status(400).json({message:'Could not save footer artwork.'});}
});
adminFooterRoutes.delete('/artwork',async(_req,res)=>{try{const {rows}=await pool.query('UPDATE store_footer_content SET artwork_url=NULL,updated_at=now() WHERE id=1 RETURNING *');return res.json({footer:footerFromRow(rows[0])});}catch{return res.status(500).json({message:'Could not reset footer artwork.'});}});
adminFooterRoutes.use((error,_req,res,next)=>{if(error instanceof multer.MulterError)return res.status(400).json({message:'Image must be 5 MB or smaller.'});next(error);});
