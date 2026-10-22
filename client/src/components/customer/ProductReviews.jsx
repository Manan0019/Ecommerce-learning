import {useEffect,useState} from 'react';
import {apiRequest} from '../../services/apiClient';
export default function ProductReviews({productId,adminPreview=false}){
 const [data,setData]=useState({reviews:[],count:0,average:null}),[rating,setRating]=useState(5),[title,setTitle]=useState(''),[body,setBody]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const ctrl=new AbortController();apiRequest(`/api/engagement/reviews/${productId}`,{signal:ctrl.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setMessage(e.message);});return()=>ctrl.abort();},[productId]);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{const result=await apiRequest(`/api/engagement/reviews/${productId}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:Number(rating),title,body})});setMessage(result.message);setTitle('');setBody('');}
 catch(err){setMessage(err.status===401?'Sign in as a customer to write a review.':err.message);}finally{setBusy(false);}}
 return <section className="nx61-product-reviews store-section" aria-label="Customer reviews"><div className="section-heading"><div><p className="eyebrow">Real experiences</p><h2>Customer reviews</h2></div>{data.count>0&&<span>★ {data.average} · {data.count} approved review{data.count!==1?'s':''}</span>}</div>
  {data.reviews.length?<div className="nx61-reviews-grid">{data.reviews.map(review=><article className="nx61-review-card" key={review.id}><div aria-label={`${review.rating} out of 5 stars`}>{'★'.repeat(review.rating)}{'☆'.repeat(5-review.rating)}</div><h3>{review.title}</h3><p>{review.body}</p><small>{review.name} · Verified purchase</small></article>)}</div>:<p className="nx61-muted">No published reviews yet. Reviews are only shown after moderation.</p>}
  {!adminPreview&&<details className="nx61-review-form"><summary>Write a review for a delivered purchase</summary><form onSubmit={submit}>
    <label>Rating<select value={rating} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option value={n} key={n}>{n} stars</option>)}</select></label>
    <label>Review title<input value={title} onChange={e=>setTitle(e.target.value)} minLength={4} maxLength={100} required placeholder="Your experience in a few words"/></label>
    <label>Details<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={20} maxLength={1200} required rows={4}/></label>
    <p className="nx61-muted">Only delivered and fully paid purchases can be reviewed. Your first name and review may appear publicly after admin approval.</p>
    <button className="button button-primary" disabled={busy} type="submit">{busy?'Submitting…':'Submit review'}</button>
  </form></details>}
  {message&&<p role="status" className="nx61-feedback">{message}</p>}
 </section>;
}
