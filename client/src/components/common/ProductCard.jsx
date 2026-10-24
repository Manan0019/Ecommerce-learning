import { Button, EntityTitle } from "../ui/index";
import { useEffect, useRef, useState } from "react";
import StorefrontCardActions from "../customer/StorefrontCardActions";
import UiIcon from "./UiIcon";
import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";
import { cardGalleryImages, canPreviewGallery, galleryIndex } from "./cardGallery";

// A bounded gallery is included in the catalogue response, so browsing doesn't
// require one extra HTTP request for every product tile.
export default function ProductCard({ product, showQuickAdd = true }) {
  const detailUrl = `/products/${product.parentProductId || product.id}${product.selectedVariantId ? `?variant=${encodeURIComponent(product.selectedVariantId)}` : ""}`;
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  // Bounded and variant-safe, including the exact two-image case.
  const availableImages = cardGalleryImages(product, failedImages);
  const hasGallery = canPreviewGallery(availableImages);
  const timer = useRef(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const manuallyNavigated = useRef(false);
  const current = availableImages[galleryIndex(active, availableImages.length)];

  function stopPreview(reset = false) {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    if (reset) setActive(0);
  }
  function startPreview() {
    stopPreview();
    if (manuallyNavigated.current) return;
    if (!hasGallery || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive(index => galleryIndex(index + 1, availableImages.length)), 1500);
  }
  useEffect(() => () => { if (timer.current != null) window.clearInterval(timer.current); }, []);
  function choose(index) {
    stopPreview(); // A manual action always wins over the hover slideshow.
    manuallyNavigated.current = true;
    if (availableImages.length) setActive(galleryIndex(index, availableImages.length));
  }
  function onTouchStart(event) {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    swiped.current = false;
  }
  function onTouchEnd(event) {
    if (!touch.current || availableImages.length < 2) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = true;
      choose(active + (dx < 0 ? 1 : -1));
    }
  }

  const money = value => `₹${Number(value ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return <article className="product-card nx29-preview-card nx74-link-card"
    onPointerEnter={event => { if (event.pointerType === "mouse" || event.pointerType === "pen") startPreview(); }}
    onPointerLeave={() => { stopPreview(true); manuallyNavigated.current = false; }}>
    <Link  className="nx74-card-hit-area" to={detailUrl} aria-label={`Open ${product.name} details`} />
    <div className={`nx29-card-stage ${hasGallery ? "nx77-multiple-images" : "nx77-single-image"}`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link  className="product-image-link" to={detailUrl} aria-label={`View ${product.name}`} onClick={event => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}>
        {current ? <img key={current} className="nx29-card-image" src={apiAssetUrl(current)} alt={product.name} loading="lazy" onError={() => { stopPreview(); setFailedImages(prev => prev.includes(current) ? prev : [...prev, current]); setActive(0); }} />
          : <div className="missing-image">Image coming soon</div>}
        {product.stock === 0 && <span className="product-badge">Sold out</span>}
        {product.showSaleBadge && Number(product.displayStock ?? product.stock)>0 && Number(product.mrp)>Number(product.price) && <span className="nx61-sale-label">Sale</span>}
      </Link>
      <StorefrontCardActions product={product} detailUrl={detailUrl} imageUrl={current || product.imageUrl} showQuickAdd={showQuickAdd} />
      {hasGallery && <>
        <div className="nx29-card-arrows" aria-label="Preview product images">
          <Button variant="plain" type="button" onClick={() => choose(active - 1)} aria-label={`Previous image for ${product.name}`}><UiIcon name="chevron-left" size={17}/></Button>
          <Button variant="plain" type="button" onClick={() => choose(active + 1)} aria-label={`Next image for ${product.name}`}><UiIcon name="chevron-right" size={17}/></Button>
        </div>
        <div className="nx56-card-preview-track" aria-hidden="true">
          <span className="nx56-card-preview-fill" style={{ width: `${(Math.min(active + 1, availableImages.length) / availableImages.length) * 100}%` }} />
        </div>
      </>}
    </div>
    <div className="product-info">
      <p className="product-category">{product.category}</p>
      {product.colorLabel && <p className="nx16-color-label">Color: {product.colorLabel}</p>}
      {(product.brand || product.model) && <p className="product-brand">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
      <EntityTitle as="h3" size="lg"><Link to={detailUrl}>{product.name}</Link></EntityTitle>
      <div className="product-meta">
        <p className="product-price nx66-product-price">{Number(product.mrp) > Number(product.price) && <><span className="detail-discount">−{Math.round((Number(product.mrp) - Number(product.price)) / Number(product.mrp) * 100)}%</span><s className="detail-mrp">{money(product.mrp)}</s></>}<strong className="nx66-selling-price">{money(product.price)}</strong></p>
        <span>{product.stock > 0 ? "Available" : "Out of stock"}</span>
      </div>
    </div>
  </article>;
}
