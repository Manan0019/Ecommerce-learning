import {useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {getBanners} from "../../services/bannerService";
import {apiAssetUrl} from "../../services/apiClient";
export default function PromotionCarousel({position="home",category,product,fallback=null}){
  const [banners,setBanners]=useState([]),[index,setIndex]=useState(0),[loaded,setLoaded]=useState(false);
  const touchStart=useRef(null);
  useEffect(()=>{const controller=new AbortController();getBanners(position,position==="product"?product:category,controller.signal).then(r=>{if(!controller.signal.aborted){setBanners(r.banners||[]);setIndex(0);setLoaded(true);}}).catch(()=>{if(!controller.signal.aborted)setLoaded(true)});return ()=>controller.abort();},[position,category,product]);
  useEffect(()=>{
    if(banners.length<2 || (typeof window!=="undefined"&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
    const timer=window.setInterval(()=>setIndex(i=>(i+1)%banners.length),6500);
    return ()=>window.clearInterval(timer);
  },[banners.length]);
  if(!banners.length)return loaded?fallback:null;
  const slide=banners[index%banners.length];
  const external = slide.linkUrl.startsWith("https://");
  const imageOnly = slide.showText === false;
  const content = <>{imageOnly && <img className="nx36-promo-background" src={apiAssetUrl(slide.imageUrl)} alt="" aria-hidden="true" loading="lazy" />}<img className={imageOnly ? "nx36-promo-artwork" : undefined} src={apiAssetUrl(slide.imageUrl)} alt={imageOnly?slide.title:""} loading={position==="home"?"eager":"lazy"}/>
      {!imageOnly && <span className="nx17-promo-content"><strong>{slide.title}</strong>{slide.subtitle&&<span>{slide.subtitle}</span>}<em>{slide.linkUrl.startsWith("/products/")?"View product →":"Explore offer →"}</em></span>}</>;
  return <section className={`nx17-promo ${position==="product"?"nx19-promo-product":""} ${slide.showText===false?"nx35-promo-image-only":""}`} aria-label="Promotional banners" aria-roledescription="carousel"
    onTouchStart={e=>{touchStart.current=e.changedTouches[0]?.clientX ?? null}}
    onTouchEnd={e=>{if(touchStart.current==null||banners.length<2)return;const delta=(e.changedTouches[0]?.clientX??touchStart.current)-touchStart.current;touchStart.current=null;if(Math.abs(delta)>45)setIndex(i=>(i+(delta<0?1:banners.length-1))%banners.length)}}>
    {external ? <a href={slide.linkUrl} target="_blank" rel="noopener noreferrer" className="nx17-promo-link" aria-label={imageOnly?slide.title:undefined}>{content}</a>
      : <Link to={slide.linkUrl} className="nx17-promo-link" aria-label={imageOnly?slide.title:undefined}>{content}</Link>}
    {banners.length>1&&<div className="nx17-promo-controls">
      <button type="button" aria-label="Previous promotion" onClick={()=>setIndex(i=>(i-1+banners.length)%banners.length)}>‹</button>
      <span aria-live="polite">{banners.map((banner,i)=><button type="button" key={banner.id} aria-label={`Show promotion ${i+1}`} aria-current={i===index?"true":undefined} className={i===index?"selected":""} onClick={()=>setIndex(i)}/>)}</span>
      <button type="button" aria-label="Next promotion" onClick={()=>setIndex(i=>(i+1)%banners.length)}>›</button>
    </div>}
  </section>;
}
