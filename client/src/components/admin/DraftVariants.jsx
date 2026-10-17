import { useState } from "react";
import { validateVariantDrafts } from "./variantDraftValidation";
import { generateVariantMatrix, newOptionGroup } from "./variantGenerator";
import { updatePricingDraft } from "./variantPricing";
import VariantPriceFields from "./VariantPriceFields";

const blank = () => ({key:crypto.randomUUID(),sku:"",attributesText:"",mrp:"",price:"",stock:"0",isActive:true,pricingMode:"price"});
export default function DraftVariants({variants,onChange,disabled=false,existingVariants=[]}){
 const [groups,setGroups]=useState(()=>[{...newOptionGroup(),name:"Color"},{...newOptionGroup(),name:"Size"}]);
 const [skuPrefix,setSkuPrefix]=useState("ITEM"),[defaultMrp,setDefaultMrp]=useState(""),[defaultPrice,setDefaultPrice]=useState(""),[defaultStock,setDefaultStock]=useState("0");
 const [error,setError]=useState(""),[feedback,setFeedback]=useState("");
 function change(next){onChange(next);setError("");setFeedback("");}
 function update(id,field,value){change(variants.map(row=>row.key!==id?row:["mrp","price","discount"].includes(field)?updatePricingDraft(row,field,value):{...row,[field]:value}));}
 function generate(){try{
   const additions=generateVariantMatrix({groups:groups.filter(g=>g.name.trim()||g.values.trim()),skuPrefix,defaultMrp,defaultPrice,defaultStock,existing:[...variants,...existingVariants],limit:120});
   if(additions.length)onChange([...variants,...additions]);
   setFeedback(additions.length?`${additions.length} editable SKU drafts generated. Nothing saved to database yet.`:"All combinations already exist.");setError("");
  }catch(e){setError(e.message);setFeedback("");}}
 function updateGroup(id,field,value){setGroups(gs=>gs.map(g=>g.id===id?{...g,[field]:value}:g));}
 return <section className="admin-panel" aria-label="Product variants draft">
  <h2>SKU Variants — Dynamic Option Matrix</h2>
  <p>Add any relevant option groups (Color, RAM, Storage, Size, Volume...). The generator creates their combinations; review each selling price, MRP and stock before saving.</p>
  <fieldset disabled={disabled} className="admin-panel"><legend>Generate combinations</legend>
   {groups.map((group,index)=><div className="admin-form-grid two-column" key={group.id}>
     <label>Option group {index+1}<input value={group.name} maxLength={40} onChange={e=>updateGroup(group.id,"name",e.target.value)} placeholder="Color"/></label>
     <label>Values (comma-separated)<input value={group.values} onChange={e=>updateGroup(group.id,"values",e.target.value)} placeholder="Black, White, Blue"/></label>
     <button type="button" disabled={groups.length===1} onClick={()=>setGroups(gs=>gs.filter(g=>g.id!==group.id))}>Remove option group</button>
   </div>)}
   <button type="button" disabled={groups.length>=8} onClick={()=>setGroups(gs=>[...gs,newOptionGroup()])}>+ Add option group</button>
   <div className="admin-form-grid three-column">
     <label>SKU prefix<input value={skuPrefix} onChange={e=>setSkuPrefix(e.target.value)}/></label>
     <label>Default MRP (₹)<input type="number" min="0.01" step="0.01" value={defaultMrp} onChange={e=>setDefaultMrp(e.target.value)}/></label>
     <label>Default selling price (₹)<input type="number" min="0.01" step="0.01" value={defaultPrice} onChange={e=>setDefaultPrice(e.target.value)}/></label>
     <label>Default stock per SKU<input type="number" min="0" step="1" value={defaultStock} onChange={e=>setDefaultStock(e.target.value)}/></label>
   </div>
   <button type="button" disabled={disabled||variants.length>=120} onClick={generate}>Generate SKU combinations</button>
   <p>Maximum 8 option groups and 120 total SKU drafts per product. This prevents accidental creation of thousands of combinations.</p>
  </fieldset>
  <button type="button" disabled={disabled||variants.length>=120} onClick={()=>change([...variants,blank()])}>+ Add SKU manually</button>
  {variants.map((row,index)=><fieldset key={row.key} disabled={disabled} className="admin-panel" style={{marginTop:12}}>
    <legend>SKU {index+1}</legend>
    <div className="admin-form-grid two-column">
      <label>SKU<input value={row.sku} onChange={e=>update(row.key,"sku",e.target.value)} maxLength={80} required/></label>
      <label>Stock<input type="number" min="0" step="1" value={row.stock} onChange={e=>update(row.key,"stock",e.target.value)} required/></label>
    </div>
    <VariantPriceFields row={row} onFieldChange={(field,value)=>update(row.key,field,value)} disabled={disabled}/>
    <label>Option values (one per line, e.g. Color: Midnight)<textarea value={row.attributesText} onChange={e=>update(row.key,"attributesText",e.target.value)} placeholder={"Color: Midnight\nRAM: 16 GB\nStorage: 1 TB"}/></label>
    <label><input type="checkbox" checked={row.isActive} onChange={e=>update(row.key,"isActive",e.target.checked)}/> Active</label>
    <button type="button" onClick={()=>change(variants.filter(v=>v.key!==row.key))}>Remove draft</button>
  </fieldset>)}
  {variants.length>0&&<button type="button" onClick={()=>{try{validateVariantDrafts(variants);setFeedback("All SKU entries pass local validation.");setError("");}catch(e){setError(e.message);setFeedback("");}}}>Validate SKU drafts</button>}
  {feedback&&<p role="status">{feedback}</p>}{error&&<p role="alert" className="admin-alert">{error}</p>}
 </section>;
}
