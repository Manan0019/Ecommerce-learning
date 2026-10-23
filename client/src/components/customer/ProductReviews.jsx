import {useEffect,useState} from 'react';
import {apiRequest} from '../../services/apiClient';
import RatingStars from './RatingStars';
import UiIcon from '../common/UiIcon';
export default function ProductReviews({productId,adminPreview=false}){
 const [data,setData]=useState({reviews:[],count:0,average:null});
 const [reviewOpen,setReviewOpen]=useState(false);
 const [reviewEligible,setReviewEligible]=useState(false);
 const [rating,setRating]=useState(5),[hover,setHover]=useState(null),[title,setTitle]=useState(''),[body,setBody]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{const ctrl=new AbortController();setReviewEligible(false);apiRequest(`/api/engagement/reviews/${productId}`,{signal:ctrl.signal}).then(setData).catch(e=>{if(e.name!=='AbortError')setMessage(e.message);});
  if(!adminPreview)apiRequest(`/api/engagement/reviews/${productId}/eligibility`,{signal:ctrl.signal,credentials:'include'}).then(result=>setReviewEligible(Boolean(result.eligible))).catch(()=>setReviewEligible(false));
  return()=>ctrl.abort();},[productId,adminPreview]);
 async function submit(e){e.preventDefault();setBusy(true);setMessage('');try{const result=await apiRequest(`/api/engagement/reviews/${productId}`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({rating:Number(rating),title,body})});setMessage(result.message);setTitle('');setBody('');setReviewEligible(false);}
 catch(err){setMessage(err.status===401?'Sign in as a customer to write a review.':err.message);}finally{setBusy(false);}}
 return <section className="nx61-product-reviews nx64-review-section store-section" aria-label="Customer reviews">
   <div className="section-heading"><div><p className="eyebrow">Verified customer voices</p><h2>Ratings & reviews</h2></div>{data.count>0&&<div className="nx64-rating-summary"><RatingStars value={Number(data.average)}/><span>{Number(data.average).toFixed(1)} / 5 · {data.count} review{data.count!==1?'s':''}</span></div>}</div>
   {data.reviews.length?<div className="nx61-reviews-grid">{data.reviews.map(review=><article className="nx61-review-card" key={review.id}><RatingStars value={Number(review.rating)}/><h3>{review.title}</h3><p>{review.body}</p><small>{review.name} · Verified purchase</small></article>)}</div>:<p className="nx61-muted">No published reviews yet. Only verified delivered purchases can be reviewed.</p>}
   {!adminPreview&&reviewEligible&&<details className="nx61-review-form nx64-review-form" onToggle={event=>setReviewOpen(event.currentTarget.open)}><summary className="nx-review-toggle">
     <span className="nx-review-heading"><small>Customer feedback</small><strong>Share your experience</strong></span>
     <span className="nx-review-action"><span className="nx-review-action-copy">{reviewOpen?'Hide review':'Write a review'}</span><UiIcon name="chevron-down" size={17}/></span>
   </summary><form onSubmit={submit}>
     <fieldset className="nx64-rating-field"><legend>Your rating</legend><div className="nx70-rating-line"><RatingStars value={rating} previewValue={hover} onPreview={setHover} onChange={setRating} size="large"/><output>{(hover??rating).toFixed(1)} out of 5 stars</output></div><small>Choose whole or half stars</small></fieldset>
     <label>Review title<input value={title} onChange={e=>setTitle(e.target.value)} minLength={4} maxLength={100} required placeholder="What stood out to you?"/></label>
     <label>Your review<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={20} maxLength={1200} required rows={4} placeholder="How was the quality, fit and overall experience?"/></label>
     <p className="nx61-muted">Reviews require a delivered, fully paid order and are published after moderation.</p>
     <button className="button button-primary" disabled={busy} type="submit">{busy?'Submitting…':'Submit my review'}</button>
   </form></details>}
   {message&&<p role="status" className="nx61-feedback">{message}</p>}
 </section>;
}
