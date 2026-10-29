import { Button, IconButton } from "../ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useCallback, useEffect, useRef, useState } from "react";
import UiIcon from "../common/UiIcon";
import PromotionBannerCopy from "./PromotionBannerCopy";
import {promotionShadeStyle} from "../../services/promotionTextStyle";
import { Link } from "react-router-dom";
import { getBanners } from "../../services/bannerService";
import { apiAssetUrl } from "../../services/apiClient";
import { movePromotionSlide, visiblePromotionWindow, promotionDotIndices } from "../../services/promotionCarouselRules";

function PromotionCard({ banner, primary = false, priority = false }) {
  const imageOnly = banner.showText === false;
  const external = banner.linkUrl.startsWith("https://");
  const content = <>
    
    <span className="nx37-promotion-image-frame">
      <img src={apiAssetUrl(banner.imageUrl)} alt={imageOnly ? banner.title : ""} loading={priority ? "eager" : "lazy"} decoding="async" />
    </span>
    {!imageOnly && <PromotionBannerCopy banner={banner}/>}
    {imageOnly && <span className="sr-only">{banner.title}</span>}
  </>;
  const cls = `nx37-promotion-card${primary ? " is-primary" : ""}${imageOnly ? " is-image-only" : " has-overlay"}`;
  return external
    ? <a style={promotionShadeStyle(banner.textStyle)} className={cls} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.title}>{content}</a>
    : <Link style={promotionShadeStyle(banner.textStyle)} className={cls} to={banner.linkUrl} aria-label={banner.title}>{content}</Link>;
}

/** 1–6 promotions at once on desktop, one active image on phones.
 * Cycles through all eligible promotions; links, placements and image-only modes stay intact.
 */
export default function PromotionCarousel({ position = "home", category, product, fallback = null }) {
  const liveRevision=useRealtimeRevision(["promotions","catalog"]);
  const [banners, setBanners] = useState([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [homeVisibleCount,setHomeVisibleCount] = useState(3);
  const [homeAutoplay,setHomeAutoplay] = useState(true);
  const [homeRotateSeconds,setHomeRotateSeconds] = useState(6);
  const [userPaused,setUserPaused] = useState(false);
  const [interactionPaused,setInteractionPaused] = useState(false);
  const [phoneView,setPhoneView] = useState(() => typeof window !== "undefined" && Boolean(window.matchMedia?.("(max-width: 720px)").matches));
  const [reducedMotion,setReducedMotion] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  const rail = useRef(null);
  const swipeStart = useRef(null);
  const preventClickUntil = useRef(0);
  const visibleCount = Math.min(banners.length,position === "home" ? homeVisibleCount : 2);
  // All banners already on screen need not reshuffle on desktop. On phones only
  // one banner is visible, so the same collection should keep sliding.
  const canAdvance = banners.length > (phoneView ? 1 : visibleCount);
  useEffect(() => {
    const controller=new AbortController();
    let first=true;
    async function refresh() {
      try {
        const result=await getBanners(position,position==="product"?product:category,controller.signal);
        if(controller.signal.aborted)return;
        const next=result.banners||[];
        setBanners(next);
        setHomeVisibleCount(result.homeVisibleCount??3);
        setHomeAutoplay(result.homeAutoplay??true);
        setHomeRotateSeconds(result.homeRotateSeconds??6);
        setActive(current=>first?0:Math.min(current,Math.max(next.length-1,0)));
        first=false;
        setLoaded(true);setFailed(false);
      } catch {
        if(!controller.signal.aborted){setLoaded(true);setFailed(true);}
      }
    }
    refresh();
    // A scheduled promotion can start or expire while a shopper leaves the page open.
    const timer=window.setInterval(refresh,60_000);
    window.addEventListener("focus",refresh);
    return ()=>{controller.abort();window.clearInterval(timer);window.removeEventListener("focus",refresh);};
  },[position,category,product,liveRevision]);

  const slide = useCallback((step) => {
    setActive(current => movePromotionSlide(current,step,banners.length));
    // The phone view deliberately shows a single image; its position is updated by state.
    if (rail.current?.scrollTo) rail.current.scrollTo({ left: 0, behavior: "instant" });
  }, [banners.length]);

  useEffect(() => {
    const query=window.matchMedia?.("(max-width: 720px)");
    if(!query) return;
    const update=()=>setPhoneView(query.matches);
    query.addEventListener?.("change",update);
    return ()=>query.removeEventListener?.("change",update);
  },[]);
  useEffect(() => {
    const query=window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if(!query) return;
    const update=()=>setReducedMotion(query.matches);
    query.addEventListener?.("change",update);
    return ()=>query.removeEventListener?.("change",update);
  },[]);
  useEffect(() => {
    if(!homeAutoplay || userPaused || interactionPaused || reducedMotion || !canAdvance) return;
    const timer=window.setInterval(()=>{
      if(document.visibilityState !== "hidden") setActive(current=>movePromotionSlide(current,1,banners.length));
    }, Math.max(3,Math.min(15,homeRotateSeconds))*1000);
    return ()=>window.clearInterval(timer);
  },[banners.length,homeAutoplay,homeRotateSeconds,userPaused,interactionPaused,reducedMotion,canAdvance]);
  const touchStart = e => {swipeStart.current=e.touches[0]?.clientX??null;};
  const touchEnd = e => {
    if(swipeStart.current==null)return;
    const dx=(e.changedTouches[0]?.clientX??swipeStart.current)-swipeStart.current;
    swipeStart.current=null;
    if(Math.abs(dx)<45)return;
    preventClickUntil.current=Date.now()+350;
    slide(dx<0?1:-1);
  };
  const handleBlur=e=>{if(!e.currentTarget.contains(e.relatedTarget))setInteractionPaused(false);};

  if (!banners.length) return loaded ? fallback : null;
  const count = visibleCount;
  const visible = visiblePromotionWindow(banners,active,count);
  const rotating = canAdvance;
  return <section className={`nx37-promotion-section ${position === "home" ? "nx37-promotion-home" : "nx37-promotion-inner"}`}
    aria-label="Current store promotions" onMouseEnter={()=>setInteractionPaused(true)} onMouseLeave={()=>setInteractionPaused(false)}
    onFocusCapture={()=>setInteractionPaused(true)} onBlurCapture={handleBlur}
    onTouchStart={touchStart} onTouchEnd={touchEnd} onTouchCancel={()=>{swipeStart.current=null;}}
    onClickCapture={e=>{if(Date.now()<preventClickUntil.current){e.preventDefault();e.stopPropagation();}}}>
    <div className="nx37-promotion-heading"><span>THE NEXORA EDIT <span aria-hidden="true">✦</span> CURATED FOR YOU</span>
      {rotating && <div className="nx47-promotion-status nx52-promotion-controls">
        {homeAutoplay && !reducedMotion && <IconButton variant="secondary" type="button" className="nx47-autoplay-toggle" aria-label={userPaused?"Resume automatic promotions":"Pause automatic promotions"}
          aria-pressed={userPaused} title={userPaused?"Resume slideshow":"Pause slideshow"} onClick={()=>setUserPaused(p=>!p)}><UiIcon name={userPaused?'play':'pause'} size={16}/></IconButton>}
      </div>}
    </div>
    <div className={`nx37-promotion-grid nx37-count-${count}${count>3?" nx41-multi-banner":""}`} ref={rail}>
      {visible.map((banner, index) => <PromotionCard key={`${banner.id}-${index}`} banner={banner} primary={index === 0} priority={position === "home" && index === 0} />)}
    </div>
    {rotating && <div className="nx52-promotion-progress" role="group" aria-label="Choose promotion">{promotionDotIndices(banners.length,active).map((i) => <Button variant="secondary" type="button" key={banners[i].id} aria-label={`Show promotion: ${banners[i].title}`} aria-current={active === i ? "true" : undefined} className={active === i ? "is-active" : ""} onClick={() => setActive(i)}><span aria-hidden="true" /></Button>)}</div>}
    {failed && <p role="status">Some promotions are temporarily unavailable.</p>}
  </section>;
}
