import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {getBanners} from "../../services/bannerService";
import {apiAssetUrl} from "../../services/apiClient";
export default function PromotionCarousel({position="home",category,fallback=null}){
  const [banners,setBanners]=useState([]),[index,setIndex]=useState(0),[loaded,setLoaded]=useState(false);
  const touchStart=useRef(null);
  useEffect(()=>{const controller=new AbortController();getBanners(position,category,controller.signal).then(r=>{if(!controller.signal.aborted){setBanners(r.banners||[]);setIndex(0);setLoaded(true);}}).catch(()=>{if(!controller.signal.aborted)setLoaded(true)});return ()=>controller.abort();},[position,category]);
  useEffect(()=>{
    if(banners.length<2 || (typeof window!=="undefined"&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
    const timer=window.setInterval(()=>setIndex(i=>(i+1)%banners.length),6500);
    return ()=>window.clearInterval(timer);
  },[banners.length]);
  if(!banners.length)return loaded?fallback:null;
  const slide=banners[index%banners.length];
  const external = slide.linkUrl.startsWith("https://");
  const content = <><img src={apiAssetUrl(slide.imageUrl)} alt="" loading={position==="home"?"eager":"lazy"}/>
      <span className="nx17-promo-content"><strong>{slide.title}</strong>{slide.subtitle&&<span>{slide.subtitle}</span>}<em>Explore collection →</em></span></>;
  return <section className="nx17-promo" aria-label="Promotional banners" aria-roledescription="carousel"
    onTouchStart={e=>{touchStart.current=e.changedTouches[0]?.clientX ?? null}}
    onTouchEnd={e=>{if(touchStart.current==null||banners.length<2)return;const delta=(e.changedTouches[0]?.clientX??touchStart.current)-touchStart.current;touchStart.current=null;if(Math.abs(delta)>45)setIndex(i=>(i+(delta<0?1:banners.length-1))%banners.length)}}>
    {external ? <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer" className="nx17-promo-link">{content}</a>
      : <Link to={slide.linkUrl} className="nx17-promo-link">{content}</Link>}
    {banners.length>1&&<div className="nx17-promo-controls">
      <button type="button" aria-label="Previous promotion" onClick={()=>setIndex(i=>(i-1+banners.length)%banners.length)}>‹</button>
      <span aria-live="polite">{banners.map((banner,i)=><button type="button" key={banner.id} aria-label={`Show promotion ${i+1}`} aria-current={i===index?"true":undefined} className={i===index?"selected":""} onClick={()=>setIndex(i)}/>)}</span>
      <button type="button" aria-label="Next promotion" onClick={()=>setIndex(i=>(i+1)%banners.length)}>›</button>
    </div>}
  </section>;
}
