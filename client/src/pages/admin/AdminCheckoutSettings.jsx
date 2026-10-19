import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiRequest} from '../../services/apiClient';
const entries=[
 {key:'origin_state',label:'Dispatch state / origin',type:'text',help:'Used to distinguish intra-state and inter-state shipping and GST breakdown.'},
 {key:'shipping_fee_in_state',label:'Shipping fee within origin state (₹)',type:'number'},
 {key:'shipping_fee_other_state',label:'Shipping fee to other states (₹)',type:'number'},
 {key:'free_shipping_above',label:'Free shipping when subtotal reaches (₹)',type:'number',help:'Enter 0 to disable threshold-based free shipping.'},
 {key:'default_item_gst_percent',label:'Default item GST rate (%)',type:'number',help:'Applied only when a product has no product-specific tax rate. Set a verified rate.'},
 {key:'shipping_gst_percent',label:'GST included in shipping fee (%)',type:'number',help:'Confirm treatment of shipping charges with a tax professional.'},
];
export default function AdminCheckoutSettings(){
 const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{const ctrl=new AbortController();apiRequest('/api/admin/checkout-settings',{credentials:'include',signal:ctrl.signal}).then(r=>{if(!ctrl.signal.aborted)setForm(r.settings)}).catch(e=>{if(!ctrl.signal.aborted)setError(e.message)});return ()=>ctrl.abort()},[]);
 async function save(event){event.preventDefault();setBusy(true);setError('');setMessage('');try{const r=await apiRequest('/api/admin/checkout-settings',{credentials:'include',method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});setForm(r.settings);setMessage('Shipping and tax settings saved. New COD quotes use the updated policy.')}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <AdminLayout title="Shipping & Tax Settings" subtitle="Manage COD shipping, tax-inclusive pricing and readiness for real orders.">
 <section className="admin-panel nx25-settings"><p className="nx25-warning"><strong>Before going live:</strong> Confirm GST rates and shipping treatment with your accountant. Validate serviceable PIN codes and your courier process. Online payments are disabled.</p>
 {error&&<p role="alert" className="nx-cod-message nx-cod-error">{error}</p>}
 {form?<form onSubmit={save} className="nx25-settings-form"><div className="nx25-settings-grid">{entries.map(entry=><label key={entry.key} className="nx-cod-field"><span>{entry.label} *</span><input type={entry.type} required min={entry.type==='number'?0:undefined} max={entry.key.includes('gst')?40:undefined} step={entry.type==='number'?'0.01':undefined} value={form[entry.key]??''} onChange={e=>setForm(old=>({...old,[entry.key]:e.target.value}))}/>{entry.help&&<small>{entry.help}</small>}</label>)}</div>
 <label className="nx25-check"><input type="checkbox" checked={!!form.cod_enabled} onChange={e=>setForm(old=>({...old,cod_enabled:e.target.checked}))}/> Enable real COD order placement</label><p className="nx25-muted">New installation defaults to COD disabled. Enable only after verifying fulfillment and tax settings.</p>
 <button className="admin-primary-action" disabled={busy}>{busy?'Saving…':'Save shipping & tax rules'}</button>{message&&<p role="status" className="nx25-success">{message}</p>}</form>:!error&&<p>Loading settings…</p>}</section>
 </AdminLayout>
}
