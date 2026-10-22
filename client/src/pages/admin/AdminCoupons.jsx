import {useCallback,useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiRequest} from '../../services/apiClient';
const empty={code:'',kind:'percent',value:'10',minimumSubtotal:'0',maxRedemptions:'100'};
export default function AdminCoupons(){
 const [coupons,setCoupons]=useState([]),[form,setForm]=useState(empty),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const refresh=useCallback(async()=>{const data=await apiRequest('/api/admin/coupon-drafts',{credentials:'include'});setCoupons(data.coupons||[]);},[]);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[refresh]);
 async function create(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{const r=await apiRequest('/api/admin/coupon-drafts',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setMessage(r.message);setForm(empty);await refresh();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(code){setBusy(true);setError('');try{await apiRequest('/api/admin/coupon-drafts/'+encodeURIComponent(code),{method:'DELETE',credentials:'include'});await refresh();setMessage('Draft removed.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminLayout title="Coupon planning" subtitle="Prepare coupon codes for a future verified checkout release.">
 <section className="admin-panel nx62-coupon-editor">
   <p className="nx62-coupon-warning"><strong>Draft mode only.</strong> These codes cannot be redeemed by customers yet. Phase 63 will connect discounts to GST, COD, Razorpay, refunds and retry protection after verification.</p>
   {error&&<p role="alert" className="nx62-editor-error">{error}</p>}{message&&<p role="status" className="nx62-editor-success">{message}</p>}
   <form onSubmit={create} className="nx62-coupon-form"><h2>Create coupon draft</h2>
    <label>Coupon code<input required value={form.code} maxLength={24} placeholder="WELCOME10" onChange={e=>setForm(f=>({...f,code:e.target.value.toUpperCase()}))}/></label>
    <label>Discount type<select value={form.kind} onChange={e=>setForm(f=>({...f,kind:e.target.value}))}><option value="percent">Percent off</option><option value="fixed">Fixed amount (₹)</option></select></label>
    <label>Discount value<input value={form.value} type="number" step="0.01" min="0.01" max={form.kind==='percent'?50:100000} onChange={e=>setForm(f=>({...f,value:e.target.value}))}/></label>
    <label>Minimum subtotal (₹)<input value={form.minimumSubtotal} type="number" min="0" step="0.01" onChange={e=>setForm(f=>({...f,minimumSubtotal:e.target.value}))}/></label>
    <label>Planned redemption limit<input value={form.maxRedemptions} type="number" min="1" max="100000" onChange={e=>setForm(f=>({...f,maxRedemptions:e.target.value}))}/></label>
    <button type="submit" className="admin-primary-action" disabled={busy}>{busy?'Saving…':'Save coupon draft'}</button>
   </form>
   <div className="nx62-coupon-list"><h2>Saved draft codes</h2>{!coupons.length?<p>No coupon drafts created yet.</p>:coupons.map(c=><div key={c.code} className="nx62-coupon-item"><div><strong>{c.code}</strong><small>{c.kind==='percent'?`${c.value}% off`:`₹${c.value} off`} · minimum ₹{c.minimumSubtotal} · Draft</small></div><button type="button" disabled={busy} onClick={()=>remove(c.code)}>Delete</button></div>)}</div>
 </section></AdminLayout>;
}
