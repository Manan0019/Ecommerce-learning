import usePagination from '../../hooks/usePagination';
import { SearchField, ClearFilters, Button, Card, EmptyState, EntityTitle, Pagination } from "../../components/ui/index";

import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiRequest} from '../../services/apiClient';
export default function AdminReviews(){
 const [query,setQuery]=useState(''); const liveRevision=useRealtimeRevision(["reviews"]);const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(null);
 async function load(signal){const result=await apiRequest('/api/engagement/admin/reviews',{credentials:'include',signal});if(!signal?.aborted)setRows(result.reviews||[]);}
 useEffect(()=>{const controller=new AbortController();queueMicrotask(()=>{if(!controller.signal.aborted)load(controller.signal).catch(e=>{if(!controller.signal.aborted)setError(e.message);});});return()=>controller.abort();},[liveRevision]);
 async function decide(id,status){setBusy(id);setError('');try{await apiRequest(`/api/engagement/admin/reviews/${id}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});await load();}catch(e){setError(e.message);}finally{setBusy(null);}}
 const matches=rows.filter(row=>[row.product_name,row.reviewer_name,row.title,row.body,row.status].some(value=>String(value||'').toLowerCase().includes(query.toLowerCase())));
 const {page,pages,items:visible,setPage}=usePagination(matches,query);
 return <AdminLayout title="Customer Reviews" subtitle="Approve real purchase reviews before publishing them on the storefront.">
 {error&&<p className="admin-alert" role="alert">{error}</p>}
 <Card as="div" className="admin-panel"><div className="nx61-review-moderation"><div className="nx77-table-toolbar"><SearchField label="Search reviews" value={query} onChange={e=>setQuery(e.target.value)}/><ClearFilters active={Boolean(query)} onClear={()=>setQuery("")}/></div>{rows.length>0&&!matches.length&&<EmptyState icon="search" title="No matching reviews" description="Try a different product, reviewer or review text."/>}{rows.length===0&&<EmptyState title="No reviews yet" description="Customer reviews will appear here after eligible purchases."/>}
 {visible.map(r=><article key={r.id}><div><EntityTitle>{r.product_name}</EntityTitle><small>{r.reviewer_name} · {r.rating}/5 stars · {r.status}</small></div><h3>{r.title}</h3><p>{r.body}</p>
 {r.status==='pending'&&<div className="nx61-review-actions"><Button variant="secondary" disabled={busy===r.id} onClick={()=>decide(r.id,'approved')}>Approve</Button><Button variant="secondary" disabled={busy===r.id} onClick={()=>decide(r.id,'rejected')}>Reject</Button></div>}
 </article>)}</div><Pagination page={page} pages={pages} total={matches.length} pageSize={10} label="reviews" onPageChange={setPage}/></Card>
 </AdminLayout>;
}
