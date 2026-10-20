import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getBanners } from "../../services/bannerService";
import { apiAssetUrl } from "../../services/apiClient";

function PromotionCard({ banner, primary = false, priority = false }) {
  const imageOnly = banner.showText === false;
  const external = banner.linkUrl.startsWith("https://");
  const content = <>
    <span className="nx37-promotion-image-frame">
      <img src={apiAssetUrl(banner.imageUrl)} alt={imageOnly ? banner.title : ""} loading={priority ? "eager" : "lazy"} decoding="async" />
    </span>
    {!imageOnly && <span className="nx37-promotion-copy"><strong>{banner.title}</strong>{banner.subtitle && <span>{banner.subtitle}</span>}<em>Explore offer <span aria-hidden="true">↗</span></em></span>}
    {imageOnly && <span className="sr-only">{banner.title}</span>}
  </>;
  const cls = `nx37-promotion-card${primary ? " is-primary" : ""}${imageOnly ? " is-image-only" : " has-overlay"}`;
  return external
    ? <a className={cls} href={banner.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={banner.title}>{content}</a>
    : <Link className={cls} to={banner.linkUrl} aria-label={banner.title}>{content}</Link>;
}

/** Three promotions at once on desktop; a horizontally swipeable rail on phones.
 * Placement, existing banner links and the image-only option are unchanged.
 */
export default function PromotionCarousel({ position = "home", category, product, fallback = null }) {
  const [banners, setBanners] = useState([]);
  const [active, setActive] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const rail = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    getBanners(position, position === "product" ? product : category, controller.signal)
      .then(result => { if (!controller.signal.aborted) { setBanners(result.banners || []); setActive(0); setLoaded(true); setFailed(false); } })
      .catch(() => { if (!controller.signal.aborted) { setLoaded(true); setFailed(true); } });
    return () => controller.abort();
  }, [position, category, product]);

  const slide = useCallback((step) => {
    setActive(current => banners.length ? (current + step + banners.length) % banners.length : 0);
    if (rail.current) rail.current.scrollTo({ left: 0, behavior: "smooth" });
  }, [banners.length]);

  if (!banners.length) return loaded ? fallback : null;
  const count = Math.min(banners.length, position === "home" ? 3 : 2);
  const visible = Array.from({ length: count }, (_, i) => banners[(active + i) % banners.length]);
  return <section className={`nx37-promotion-section ${position === "home" ? "nx37-promotion-home" : "nx37-promotion-inner"}`} aria-label="Current store promotions">
    <div className="nx37-promotion-heading"><span>THE NEXORA EDIT <span aria-hidden="true">✦</span> CURATED FOR YOU</span>
      {banners.length > count && <div className="nx37-promotion-controls">
        <button type="button" onClick={() => slide(-1)} aria-label="Previous promotions">←</button>
        <span aria-live="polite">{active + 1} / {banners.length}</span>
        <button type="button" onClick={() => slide(1)} aria-label="Next promotions">→</button>
      </div>}
    </div>
    <div className={`nx37-promotion-grid nx37-count-${count}`} ref={rail}>
      {visible.map((banner, index) => <PromotionCard key={`${banner.id}-${index}`} banner={banner} primary={index === 0} priority={position === "home" && index === 0} />)}
    </div>
    {banners.length > count && <div className="nx37-promotion-dots" aria-label="Select promotion set">{banners.map((banner, i) => <button type="button" key={banner.id} aria-label={`Start with promotion ${i + 1}`} aria-current={active === i ? "true" : undefined} className={active === i ? "is-active" : ""} onClick={() => setActive(i)} />)}</div>}
    {failed && <p role="status">Some promotions are temporarily unavailable.</p>}
  </section>;
}
