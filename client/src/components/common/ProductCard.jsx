import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiAssetUrl } from "../../services/apiClient";

// A bounded gallery is included in the catalogue response, so browsing doesn't
// require one extra HTTP request for every product tile.
export default function ProductCard({ product }) {
  const detailUrl = `/products/${product.parentProductId || product.id}${product.selectedVariantId ? `?variant=${encodeURIComponent(product.selectedVariantId)}` : ""}`;
  const images = Array.isArray(product.previewImages) && product.previewImages.length
    ? product.previewImages.filter(Boolean).slice(0, 6)
    : product.imageUrl ? [product.imageUrl] : [];
  const [active, setActive] = useState(0);
  const timer = useRef(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const current = images[Math.min(active, images.length - 1)];

  function stopPreview(reset = false) {
    if (timer.current != null) window.clearInterval(timer.current);
    timer.current = null;
    if (reset) setActive(0);
  }
  function startPreview() {
    stopPreview();
    if (images.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer.current = window.setInterval(() => setActive(index => (index + 1) % images.length), 1600);
  }
  useEffect(() => () => { if (timer.current != null) window.clearInterval(timer.current); }, []);
  function choose(index) { setActive((index + images.length) % images.length); }
  function onTouchStart(event) {
    touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    swiped.current = false;
  }
  function onTouchEnd(event) {
    if (!touch.current || images.length < 2) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swiped.current = true;
      choose(active + (dx < 0 ? 1 : -1));
    }
  }

  return <article className="product-card nx29-preview-card">
    <div className="nx29-card-stage" onMouseEnter={() => { if (window.matchMedia("(hover: hover)").matches) startPreview(); }} onMouseLeave={() => stopPreview(true)} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <Link className="product-image-link" to={detailUrl} aria-label={`View ${product.name}`} onClick={event => { if (swiped.current) { event.preventDefault(); swiped.current = false; } }}>
        {current ? <img key={current} className="nx29-card-image" src={apiAssetUrl(current)} alt={product.name} loading="lazy" />
          : <div className="missing-image">Image coming soon</div>}
        {product.stock === 0 && <span className="product-badge">Sold out</span>}
      </Link>
      {images.length > 1 && <>
        <div className="nx29-card-arrows" aria-label="Preview product images">
          <button type="button" onClick={() => choose(active - 1)} aria-label={`Previous image for ${product.name}`}>‹</button>
          <button type="button" onClick={() => choose(active + 1)} aria-label={`Next image for ${product.name}`}>›</button>
        </div>
        <div className="nx29-card-dots" aria-label="Choose product image">
          {images.map((image, index) => <button
            key={`${image}:${index}`}
            type="button"
            aria-label={`Show image ${index + 1} of ${images.length} for ${product.name}`}
            aria-pressed={index === active}
            className={index === active ? "active" : ""}
            onClick={() => choose(index)}
          />)}
        </div>
      </>}
    </div>
    <div className="product-info">
      <p className="product-category">{product.category}</p>
      {product.colorLabel && <p className="nx16-color-label">Color: {product.colorLabel}</p>}
      {(product.brand || product.model) && <p className="product-brand">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
      <h3><Link to={detailUrl}>{product.name}</Link></h3>
      <div className="product-meta">
        <p className="product-price">{Number(product.mrp) > Number(product.price) && <><span className="detail-discount">↓{Math.round((Number(product.mrp) - Number(product.price)) / Number(product.mrp) * 100)}% </span><s className="detail-mrp">₹{Number(product.mrp).toLocaleString("en-IN")}</s> </>}₹{Number(product.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
        <span>{product.stock > 0 ? "Available" : "Out of stock"}</span>
      </div>
    </div>
  </article>;
}
