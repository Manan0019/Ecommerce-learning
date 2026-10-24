import { EntityTitle } from "../ui/index";
import RatingStars from './RatingStars';
import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {apiRequest} from '../../services/apiClient';
export default function FeaturedTestimonials(){const [reviews,setReviews]=useState([]);
 useEffect(()=>{const ctrl=new AbortController();apiRequest('/api/engagement/reviews/featured',{signal:ctrl.signal}).then(data=>setReviews(data.reviews||[])).catch(()=>{});return()=>ctrl.abort();},[]);
 if(!reviews.length)return null; // Never invent endorsements to fill a marketing section.
 return <section className="store-section nx61-testimonials"><div className="section-heading"><div><p className="eyebrow">The Nexora community</p><h2>Hear from our customers</h2></div></div>
 <div className="nx61-testimonial-grid">{reviews.slice(0,3).map(r=><Link  to={`/products/${r.productId}`} key={r.id} className="nx61-testimonial"><RatingStars value={Number(r.rating)}/><blockquote>“{r.body}”</blockquote><EntityTitle>{r.name}</EntityTitle><small>Verified purchase · {r.productName}</small></Link>)}</div></section>;
}
