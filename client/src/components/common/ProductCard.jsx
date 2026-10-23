import { useEffect, useRef, useState } from "react";
import StorefrontCardActions from "../customer/StorefrontCardActions";
import UiIcon from "./UiIcon";
import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";

// A bounded gallery is included in the catalogue response, so browsing doesn't
// require one extra HTTP request for every product tile.
export default function ProductCard({ product, showQuickAdd = true }) {
  const detailUrl = `/products/${product.parentProductId || product.id}${product.selectedVariantId ? `?variant=${encodeURIComponent(product.selectedVariantId)}` : ""}`;
  const images = Array.isArray(product.previewImages) && product.previewImages.length
    ? product.previewImages.filter(Boolean).slice(0, 6)
    : product.imageUrl ? [product.imageUrl] : [];
  const [active, setActive] = useState(0);
  const [failedImages, setFailedImages] = useState([]);
  // Broken/missing uploads should not leave a browser broken-image glyph.
  const availableImages = images.filter(url => !failedImages.includes(url));
  const timer = useRef(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const manuallyNavigated = useRef(false);
  const current = availableImages[Math.min(active, availableImages.length - 1)];

  function stopPreview(reset = false) {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    if (reset) setActive(0);
  }
  function startPreview() {
    stopPreview();
    if (manuallyNavigated.current) return;
    if (availableImages.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive(index => (index + 1) % availableImages.length), 1600);
  }
  useEffect(() => () => { if (timer.current != null) window.clearInterval(timer.current); }, []);
  function choose(index) {
    stopPreview(); // A manual action always wins over the hover slideshow.
    manuallyNavigated.current = true;
    if (availableImages.length) setActive((index + availableImages.length) % availableImages.length);
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
  return <article className="product-card nx29-preview-card nx74-link-card">
    <Link className="nx74-card-hit-area" to={detailUrl} aria-label={`Open ${product.name} details`} />
    <div className="nx29-card-stage" onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) startPreview(); }} onMouseLeave={() => { stopPreview(true); manuallyNavigated.current = false; }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link className="product-image-link" to={detailUrl} aria-label={`View ${product.name}`} onClick={event => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}>
        {current ? <img key={current} className="nx29-card-image" src={apiAssetUrl(current)} alt={product.name} loading="lazy" onError={() => { setFailedImages(prev => prev.includes(current) ? prev : [...prev, current]); setActive(0); }} />
          : <div className="missing-image">Image coming soon</div>}
        {product.stock === 0 && <span className="product-badge">Sold out</span>}
        {product.showSaleBadge && Number(product.displayStock ?? product.stock)>0 && Number(product.mrp)>Number(product.price) && <span className="nx61-sale-label">Sale</span>}
      </Link>
      <StorefrontCardActions product={product} detailUrl={detailUrl} imageUrl={current || product.imageUrl} showQuickAdd={showQuickAdd} />
      {availableImages.length > 1 && <>
        <div className="nx29-card-arrows" aria-label="Preview product images">
          <button type="button" onClick={() => choose(active - 1)} aria-label={`Previous image for ${product.name}`}><UiIcon name="chevron-left" size={17}/></button>
          <button type="button" onClick={() => choose(active + 1)} aria-label={`Next image for ${product.name}`}><UiIcon name="chevron-right" size={17}/></button>
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
      <h3><Link to={detailUrl}>{product.name}</Link></h3>
      <div className="product-meta">
        <p className="product-price nx66-product-price">{Number(product.mrp) > Number(product.price) && <><span className="detail-discount">−{Math.round((Number(product.mrp) - Number(product.price)) / Number(product.mrp) * 100)}%</span><s className="detail-mrp">{money(product.mrp)}</s></>}<strong className="nx66-selling-price">{money(product.price)}</strong></p>
        <span>{product.stock > 0 ? "Available" : "Out of stock"}</span>
      </div>
    </div>
  </article>;
}
