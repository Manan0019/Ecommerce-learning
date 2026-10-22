import UiIcon from "../../components/common/UiIcon";
import {useCallback,useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiRequest} from '../../services/apiClient';
const empty={code:'',kind:'percent',value:'10',minimumSubtotal:'0',minimumQualifyingSubtotal:'0',maximumDiscount:'0',minimumUnitPrice:'0',maximumUnitPrice:'0',minimumItems:'1',maxRedemptions:'100',perCustomerLimit:'1',scope:'order',productIds:[],categoryIds:[],excludedProductIds:[],firstOrderOnly:false,excludeSaleProducts:false,includeSubcategories:true,startsAt:'',expiresAt:''};
function toForm(d){return {...empty,...d,productIds:d.productIds||[],categoryIds:d.categoryIds||[],excludedProductIds:d.excludedProductIds||[],startsAt:d.startsAt?String(d.startsAt).slice(0,16):'',expiresAt:d.expiresAt?String(d.expiresAt).slice(0,16):''};}
export default function AdminCoupons(){
 const [coupons,setCoupons]=useState([]),[form,setForm]=useState(empty),[editing,setEditing]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[targets,setTargets]=useState([]),[lookupError,setLookupError]=useState(''),[filter,setFilter]=useState(''),[simulation,setSimulation]=useState(null),[sampleSubtotal,setSampleSubtotal]=useState('2000'),[sampleQualifying,setSampleQualifying]=useState('2000'),[sampleQuantity,setSampleQuantity]=useState('2'),[simBusy,setSimBusy]=useState(false);
 const refresh=useCallback(async()=>{const data=await apiRequest('/api/admin/coupon-drafts',{credentials:'include'});setCoupons(data.coupons||[]);},[]);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[refresh]);
 useEffect(()=>{if(form.scope==='order'){setTargets([]);return;}const controller=new AbortController();
 const timer=setTimeout(()=>{apiRequest('/api/admin/coupon-drafts/targets?type='+form.scope+'&q='+encodeURIComponent(filter),{credentials:'include',signal:controller.signal})
 .then(d=>{if(!controller.signal.aborted){setTargets(d.targets||[]);setLookupError('');}}).catch(e=>{if(!controller.signal.aborted)setLookupError('Product/category list unavailable: '+e.message);});},180);
 return ()=>{clearTimeout(timer);controller.abort();};},[form.scope,filter]);
 const update=(key,value)=>setForm(f=>({...f,[key]:value}));
 const displayed=targets;
 const updateMulti=(key,id,checked)=>setForm(f=>({...f,[key]:checked?[...f[key],id]:f[key].filter(x=>x!==id)}));
 function beginEdit(c){setEditing(c.code);setForm(toForm(c));setFilter('');setError('');setMessage('');window.scrollTo({top:0,behavior:'smooth'});}
 function reset(){setEditing(null);setForm(empty);setFilter('');}
 async function submit(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{
 const payload={...form,startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,expiresAt:form.expiresAt?new Date(form.expiresAt).toISOString():null};
 const r=await apiRequest(editing?'/api/admin/coupon-drafts/'+encodeURIComponent(editing):'/api/admin/coupon-drafts',{method:editing?'PUT':'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
 setMessage(r.message);reset();await refresh();
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function previewDraft(){setSimBusy(true);setSimulation(null);setError('');try{
  const payload={...form,startsAt:form.startsAt?new Date(form.startsAt).toISOString():null,expiresAt:form.expiresAt?new Date(form.expiresAt).toISOString():null};
  const result=await apiRequest('/api/admin/coupon-drafts/simulate',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({draft:payload,sample:{subtotal:sampleSubtotal,qualifyingSubtotal:sampleQualifying,eligibleQuantity:Number(sampleQuantity)}})});
  setSimulation(result);
 }catch(e){setError(e.message);}finally{setSimBusy(false);}}
 async function remove(code){setBusy(true);setError('');try{await apiRequest('/api/admin/coupon-drafts/'+encodeURIComponent(code),{method:'DELETE',credentials:'include'});await refresh();setMessage('Draft removed.');if(code===editing)reset();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminLayout title="Coupon rule planner" subtitle="Build targeted promotional rules for a future verified checkout release.">
 <section className="admin-panel nx62-coupon-editor nx63-coupon-editor">
 <p className="nx62-coupon-warning"><strong>Drafts only — not live discounts.</strong> You can configure targeting, eligibility and limits here. Customers cannot redeem these codes until checkout, GST, Razorpay, COD, refunds and retries are integrated and tested.</p>
 {error&&<p role="alert" className="nx62-editor-error">{error}</p>}{message&&<p role="status" className="nx62-editor-success">{message}</p>}
 <form onSubmit={submit} className="nx62-coupon-form"><h2>{editing?'Edit coupon '+editing:'Create a targeted coupon'}</h2>
 <label>Coupon code<input required value={form.code} disabled={Boolean(editing)} maxLength={24} placeholder="WELCOME10" onChange={e=>update('code',e.target.value.toUpperCase())}/></label>
 <div className="nx63-two-fields"><label>Discount type<select value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value,maximumDiscount:e.target.value==='fixed'?'0':f.maximumDiscount}))}><option value="percent">Percentage off</option><option value="fixed">Fixed amount off</option></select></label><label>Discount value<input required value={form.value} type="number" step="0.01" min="0.01" max={form.kind==='percent'?50:100000} onChange={e=>update('value',e.target.value)}/></label></div>
 <fieldset className="nx63-coupon-fieldset"><legend>Where should this coupon work?</legend>
 <div className="nx63-choice-row">{[['order','Whole order'],['products','Selected products'],['categories','Selected categories']].map(([key,name])=><label key={key} className={form.scope===key?'is-active':''}><input type="radio" name="scope" value={key} checked={form.scope===key} onChange={()=>setForm(f=>({...f,scope:key,productIds:[],categoryIds:[]}))}/>{name}</label>)}</div>
 {form.scope!=='order'&&<div className="nx63-target-picker"><strong>{form.scope==='categories'?'Choose eligible categories':'Choose eligible products'}</strong>{lookupError&&<p role="alert">{lookupError}</p>}
 <input type="search" value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Search by name…" aria-label="Search coupon targets"/>
 <div className="nx63-target-list">{displayed.map(p=>{const key=form.scope==='categories'?'categoryIds':'productIds';const id=Number(p.id);return <label key={p.id}><input type="checkbox" checked={form[key].includes(id)} onChange={e=>updateMulti(key,id,e.target.checked)}/><span>{p.name||p.title} <small>#{p.id}</small></span></label>;})}</div>
 <small>{form.scope==='categories'?form.categoryIds.length:form.productIds.length} selected. Search all catalog records, up to 80 matches per search.</small>
 </div>}
 {form.scope==='categories'&&<label className="nx63-check"><input type="checkbox" checked={form.includeSubcategories} onChange={e=>update('includeSubcategories',e.target.checked)}/> Include nested subcategories</label>}
 </fieldset>
 <div className="nx63-two-fields"><label>Minimum cart subtotal (₹)<input type="number" min="0" step="0.01" required value={form.minimumSubtotal} onChange={e=>update('minimumSubtotal',e.target.value)}/></label><label>Minimum eligible-item spend (₹)<input type="number" min="0" step="0.01" required value={form.minimumQualifyingSubtotal} onChange={e=>update('minimumQualifyingSubtotal',e.target.value)}/></label></div>
 <div className="nx63-two-fields"><label>Minimum eligible product price (₹)<input type="number" min="0" step="0.01" value={form.minimumUnitPrice} onChange={e=>update('minimumUnitPrice',e.target.value)}/></label><label>Maximum eligible product price (₹ · 0 = unlimited)<input type="number" min="0" step="0.01" value={form.maximumUnitPrice} onChange={e=>update('maximumUnitPrice',e.target.value)}/></label></div>
 <label>Minimum qualifying items<input type="number" min="1" max="100" value={form.minimumItems} onChange={e=>update('minimumItems',e.target.value)}/></label>
 {form.kind==='percent'&&<label>Maximum discount cap (₹ · 0 = no cap)<input type="number" min="0" step="0.01" value={form.maximumDiscount} onChange={e=>update('maximumDiscount',e.target.value)}/></label>}
 <div className="nx63-two-fields"><label>Overall redemption limit<input type="number" min="1" max="100000" value={form.maxRedemptions} onChange={e=>update('maxRedemptions',e.target.value)}/></label><label>Uses per customer<input type="number" min="1" max="100" value={form.perCustomerLimit} onChange={e=>update('perCustomerLimit',e.target.value)}/></label></div>
 <div className="nx63-two-fields"><label>Valid from (optional)<input type="datetime-local" value={form.startsAt} onChange={e=>update('startsAt',e.target.value)}/></label><label>Expires (optional)<input type="datetime-local" value={form.expiresAt} onChange={e=>update('expiresAt',e.target.value)}/></label></div>
 <div className="nx63-rule-flags"><label><input type="checkbox" checked={form.firstOrderOnly} onChange={e=>update('firstOrderOnly',e.target.checked)}/> New customers' first order only</label><label><input type="checkbox" checked={form.excludeSaleProducts} onChange={e=>update('excludeSaleProducts',e.target.checked)}/> Exclude sale products</label></div>
 <section className="nx64-coupon-simulation" aria-label="Draft discount preview"><h3>Test an example basket</h3><p>Non-transactional estimate. It does not reserve, redeem or validate a real cart.</p>
 <div className="nx63-two-fields"><label>Example cart subtotal (₹)<input inputMode="decimal" value={sampleSubtotal} onChange={e=>setSampleSubtotal(e.target.value)}/></label><label>Example qualifying items value (₹)<input inputMode="decimal" value={sampleQualifying} onChange={e=>setSampleQualifying(e.target.value)}/></label></div>
 <label>Qualifying item quantity<input type="number" min="0" max="1000" value={sampleQuantity} onChange={e=>setSampleQuantity(e.target.value)}/></label>
 <button type="button" className="nx62-secondary" onClick={previewDraft} disabled={simBusy}>{simBusy?'Estimating…':'Preview draft discount'}</button>
 {simulation&&<div className="nx64-coupon-preview" role="status"><strong>Illustrative reduction ₹{simulation.estimatedDiscount}</strong><span>Example after reduction: ₹{simulation.subtotalAfterDiscount}</span><small>{simulation.sampleMeetsThresholds?'Thresholds met in this sample.':'Sample does not meet the configured thresholds.'}</small><small>{simulation.disclaimer}</small></div>}
 </section>
 <button type="submit" className="admin-primary-action" disabled={busy}>{busy?'Saving…':editing?'Update coupon draft':'Save coupon draft'}</button>{editing&&<button className="nx62-secondary" type="button" onClick={reset}>Cancel editing</button>}
 </form>
 <div className="nx62-coupon-list"><h2>Saved coupon rules</h2>{!coupons.length?<p>No coupon drafts created yet.</p>:coupons.map(c=><article key={c.code} className="nx62-coupon-item nx63-coupon-item"><div><strong>{c.code}</strong><small>{c.kind==='percent'?`${c.value}% off`:`₹${c.value} off`} · {c.scope==='products'?'Specific products':c.scope==='categories'?'Specific categories':'Whole order'}</small><small>Min cart ₹{c.minimumSubtotal} · Limit {c.maxRedemptions} · Draft</small></div><div className="nx63-coupon-actions nx69-row-actions"><button type="button" className="nx69-icon-action" aria-label={`Edit coupon ${c.code}`} title="Edit draft" disabled={busy} onClick={()=>beginEdit(c)}><UiIcon name="edit" size={18}/></button><button type="button" className="nx69-icon-action nx69-icon-danger" title="Delete draft" aria-label={`Delete coupon ${c.code}`} disabled={busy} onClick={()=>remove(c.code)}><UiIcon name="trash" size={18}/></button></div></article>)}</div>
 </section></AdminLayout>;
}
