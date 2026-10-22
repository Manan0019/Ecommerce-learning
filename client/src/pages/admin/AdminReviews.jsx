import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiRequest} from '../../services/apiClient';
export default function AdminReviews(){const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(null);
 async function load(){const result=await apiRequest('/api/engagement/admin/reviews',{credentials:'include'});setRows(result.reviews||[]);}
 useEffect(()=>{load().catch(e=>setError(e.message));},[]);
 async function decide(id,status){setBusy(id);setError('');try{await apiRequest(`/api/engagement/admin/reviews/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});await load();}catch(e){setError(e.message);}finally{setBusy(null);}}
 return <AdminLayout title="Customer Reviews" subtitle="Approve real purchase reviews before publishing them on the storefront.">
 {error&&<p className="admin-alert" role="alert">{error}</p>}
 <div className="admin-panel"><div className="nx61-review-moderation">{rows.length===0&&<p>No reviews submitted yet.</p>}
 {rows.map(r=><article key={r.id}><div><strong>{r.product_name}</strong><small>{r.reviewer_name} · {r.rating}/5 stars · {r.status}</small></div><h3>{r.title}</h3><p>{r.body}</p>
 {r.status==='pending'&&<div className="nx61-review-actions"><button disabled={busy===r.id} onClick={()=>decide(r.id,'approved')}>Approve</button><button disabled={busy===r.id} onClick={()=>decide(r.id,'rejected')}>Reject</button></div>}
 </article>)}</div></div>
 </AdminLayout>;
}
