import {useEffect,useState} from "react";
import {createVariant,getVariants,updateVariant} from "../../services/variantService";
import {validateVariantDrafts} from "./variantDraftValidation";
import {updatePricingDraft,discountFromPrices} from "./variantPricing";
import DraftVariants from "./DraftVariants";
import VariantPriceFields from "./VariantPriceFields";
const empty=()=>({sku:"",attributesText:"",mrp:"",price:"",stock:"0",isActive:true,pricingMode:"price"});
function parseAttributes(text){const attrs={};for(const line of text.split("\n")){
 if(!line.trim())continue;const pos=line.indexOf(":");if(pos<1)throw Error("Use Option: Value on every line.");
 const key=line.slice(0,pos).trim().toLowerCase().replace(/\s+/g,"_");const value=line.slice(pos+1).trim();
 if(!/^[a-z][a-z0-9_]{0,39}$/.test(key)||!value||key in attrs)throw Error("Invalid or duplicate option group.");attrs[key]=value;
 }return attrs;}
export default function ProductVariantsManager({productId}){
 const [variants,setVariants]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null);
 const [drafts,setDrafts]=useState([]),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 async function refresh(){const result=await getVariants(productId,true);setVariants(result.variants);}
 useEffect(()=>{let active=true;getVariants(productId,true).then(d=>{if(active)setVariants(d.variants);}).catch(e=>{if(active)setMessage(e.message);});return()=>{active=false};},[productId]);
 function edit(v){setEditing(v.id);setForm({sku:v.sku,price:String(v.price),mrp:String(v.mrp??v.price),
  discount:discountFromPrices(String(v.mrp??v.price),String(v.price)),pricingMode:"price",stock:String(v.stock),isActive:v.isActive,
  attributesText:Object.entries(v.attributes).map(([k,value])=>`${k}: ${value}`).join("\n")});}
 async function save(event){event.preventDefault();setBusy(true);setMessage("");try{
  const attributes=parseAttributes(form.attributesText);
  const data=validateVariantDrafts([{...form,key:"edited" ,attributesText:form.attributesText,attributes}])[0];
  const body={sku:data.sku,attributes:data.attributes,mrp:data.mrp,price:data.price,stock:Number(data.stock),isActive:data.isActive};
  if(editing)await updateVariant(productId,editing,body);else await createVariant(productId,body);
  await refresh();setForm(empty());setEditing(null);setMessage("SKU saved.");
 }catch(e){setMessage(e.message);}finally{setBusy(false);}}
 async function saveDrafts(){setMessage("");let validated;try{validated=validateVariantDrafts(drafts);}catch(e){setMessage(e.message);return;}
  setBusy(true);const failed=[];
  for(const row of validated){try{await createVariant(productId,{sku:row.sku,attributes:row.attributes,mrp:row.mrp,price:row.price,
    stock:Number(row.stock),isActive:row.isActive});}catch(e){failed.push({...row,error:e.message});}}
  setDrafts(failed);try{await refresh();}catch(e){setMessage(e.message);}
  setMessage(failed.length?`${validated.length-failed.length} saved; ${failed.length} failed. Please correct the remaining drafts.`:`${validated.length} SKU(s) saved.`);
  setBusy(false);
 }
 return <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Product variants</h2><p>Every SKU has its own option combination, MRP, selling price and stock.</p></div></div>
  <div className="variant-admin-list">{variants.map(v=><div key={v.id} className="variant-admin-row">
    <strong>{v.sku}</strong><span>{Object.entries(v.attributes).map(([k,val])=>`${k}: ${val}`).join(" · ")}</span>
    <span>₹{v.price} <s>₹{v.mrp}</s></span><span>Stock {v.stock}</span><span>{v.isActive?"Active":"Inactive"}</span>
    <button type="button" disabled={busy} onClick={()=>edit(v)}>Edit SKU</button></div>)}</div>
  <form className="admin-form" onSubmit={save}>
   <h3>{editing?"Edit existing SKU":"Add one SKU"}</h3>
   <div className="admin-form-grid two-column">
    <label>SKU<input required value={form.sku} onChange={e=>setForm(x=>({...x,sku:e.target.value}))}/></label>
    <label>Stock<input type="number" min="0" step="1" required value={form.stock} onChange={e=>setForm(x=>({...x,stock:e.target.value}))}/></label>
   </div>
   <VariantPriceFields row={form} disabled={busy} onFieldChange={(field,value)=>setForm(x=>updatePricingDraft(x,field,value))}/>
   <label>Options (one per line, e.g. Color: Black)<textarea value={form.attributesText} onChange={e=>setForm(x=>({...x,attributesText:e.target.value}))}/></label>
   <label><input type="checkbox" checked={form.isActive} onChange={e=>setForm(x=>({...x,isActive:e.target.checked}))}/> Active</label>
   <button type="submit" disabled={busy}>{busy?"Saving...":editing?"Update SKU":"Add SKU"}</button>
   {editing&&<button type="button" onClick={()=>{setEditing(null);setForm(empty());}}>Cancel edit</button>}
  </form>
  <DraftVariants variants={drafts} onChange={setDrafts} disabled={busy} existingVariants={variants}/>
  {drafts.length>0&&<button type="button" disabled={busy} onClick={saveDrafts}>{busy?"Saving...":`Save ${drafts.length} generated SKU(s)`}</button>}
  {message&&<p role="status" className="admin-form-message">{message}</p>}
 </section>;
}
