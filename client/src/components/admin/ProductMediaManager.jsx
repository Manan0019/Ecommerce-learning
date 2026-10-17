import { useEffect, useState } from "react";
import { getVariants } from "../../services/variantService";
import { apiAssetUrl } from "../../services/apiClient";
import { getProductMedia, addProductImage, addProductVideo, reorderProductMedia,removeProductMedia,
  updateFeatured,addProductLocalVideo,setProductCover,assignProductMediaScope } from "../../services/productService";
export default function ProductMediaManager({productId,initialFeatured=false}){
 const [media,setMedia]=useState([]),[variants,setVariants]=useState([]);
 const [image,setImage]=useState(null),[videoFile,setVideoFile]=useState(null),[url,setUrl]=useState("");
 const [featuredOverride,setFeaturedOverride]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const featured=featuredOverride??initialFeatured;
 useEffect(()=>{let active=true;getProductMedia(productId,true).then(d=>{if(active)setMedia(d.media);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false};},[productId]);
 useEffect(()=>{let active=true;getVariants(productId,true).then(d=>{if(active)setVariants(d.variants||[]);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false};},[productId]);
 async function perform(fn){setBusy(true);setMessage("");try{await fn();const d=await getProductMedia(productId,true);setMedia(d.media);setMessage("Saved successfully.");}catch(e){setMessage(e.message);}finally{setBusy(false);}}
 function move(index,delta){const next=[...media],target=index+delta;if(target<0||target>=next.length)return;
 [next[index],next[target]]=[next[target],next[index]];perform(()=>reorderProductMedia(productId,next.map(m=>m.id)));}
 const options=new Map();for(const variant of variants)for(const [k,v] of Object.entries(variant.attributes||{})){
  if(!options.has(k))options.set(k,new Set());options.get(k).add(v);
 }
 function valueFor(m){return m.variantId?`variant:${m.variantId}`:m.optionKey?`option:${m.optionKey}:${m.optionValue}`:"shared";}
 function scopeChanged(m,value){if(value==="shared")return perform(()=>assignProductMediaScope(productId,m.id,{scope:"shared"}));
  if(value.startsWith("variant:"))return perform(()=>assignProductMediaScope(productId,m.id,{scope:"variant",variantId:value.slice(8)}));
  const [,key,...rest]=value.split(":");return perform(()=>assignProductMediaScope(productId,m.id,{scope:"option",optionKey:key,optionValue:rest.join(":")}));}
 return <section className="admin-panel admin-form-panel" aria-label="Gallery management">
  <h2>Product media</h2><p>Assign media to all SKUs (Shared), to any option value such as Color: Midnight, or to one exact SKU. Use arrows to control gallery order.</p>
  <label className="admin-featured-toggle"><input type="checkbox" checked={featured} disabled={busy} onChange={e=>{const value=e.target.checked;perform(async()=>{await updateFeatured(productId,value);setFeaturedOverride(value);});}}/> Feature this product</label>
  <div className="admin-form-grid three-column">
   <div><label>Upload images<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setImage(e.target.files?.[0]||null)}/></label>
    <button type="button" disabled={busy||!image} onClick={()=>perform(async()=>{await addProductImage(productId,image);setImage(null);})}>Add image</button></div>
   <div><label>Upload MP4/WebM (max 25 MB)<input type="file" accept="video/mp4,video/webm" onChange={e=>setVideoFile(e.target.files?.[0]||null)}/></label>
    <button type="button" disabled={busy||!videoFile} onClick={()=>perform(async()=>{await addProductLocalVideo(productId,videoFile);setVideoFile(null);})}>Add local video</button></div>
   <div><label>YouTube URL<input type="url" value={url} onChange={e=>setUrl(e.target.value)}/></label>
    <button type="button" disabled={busy||!url.trim()} onClick={()=>perform(async()=>{await addProductVideo(productId,url.trim());setUrl("");})}>Add YouTube video</button></div>
  </div>
  <button type="button" disabled={busy} onClick={()=>getVariants(productId,true).then(d=>setVariants(d.variants||[])).catch(e=>setMessage(e.message))}>Refresh SKU list</button>
  <div className="media-manager-list">{media.map((m,i)=><div className="media-manager-item" key={m.id}>
   {m.type==="image"?<img src={apiAssetUrl(m.url)} alt={`Gallery ${i+1}`} loading="lazy"/>:m.type==="video"?<video src={apiAssetUrl(m.url)} muted preload="metadata" controls width="150"/>:<span>YouTube video ▶</span>}
   <span>{i+1}. {m.type}</span>
   <label>Visible for<select value={valueFor(m)} disabled={busy} onChange={e=>scopeChanged(m,e.target.value)}>
    <option value="shared">Shared — every configuration</option>
    {[...options].flatMap(([key,values])=>[...values].map(value=><option key={`${key}:${value}`} value={`option:${key}:${value}`}>{key}: {value} — all matching SKUs</option>))}
    {variants.map(v=><option key={v.id} value={`variant:${v.id}`}>Exact SKU: {v.sku}</option>)}
   </select></label>
   {m.type==="image"&&<button type="button" disabled={busy} onClick={()=>perform(()=>setProductCover(productId,m.id))}>Set product cover</button>}
   <button type="button" aria-label="Move up" disabled={busy||i===0} onClick={()=>move(i,-1)}>↑</button>
   <button type="button" aria-label="Move down" disabled={busy||i===media.length-1} onClick={()=>move(i,1)}>↓</button>
   <button type="button" disabled={busy} onClick={()=>perform(()=>removeProductMedia(productId,m.id))}>Remove</button>
  </div>)}</div>
  {message&&<p role="status" className="admin-form-message">{message}</p>}
 </section>;
}
