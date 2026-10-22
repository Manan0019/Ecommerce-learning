import { useRef, useState } from "react";
import UiIcon from "../common/UiIcon";
import { apiAssetUrl } from "../../services/apiClient";
import { visibleProductMedia } from "./galleryMedia";

export default function ProductMediaGallery({ product, variantId = null, variantAttributes = {}, items = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const zoomRef = useRef(null);
  const thumbsRef = useRef(null);
  const touchRef = useRef(null);
  const swipedRef = useRef(false);
  const gallery = visibleProductMedia(items, variantId, variantAttributes);
  const fallback = product.imageUrl ? [{ id: "cover", type: "image", url: product.imageUrl }] : [];
  // When a product has no variant-specific colour, include a distinct parent cover
  // alongside the saved gallery instead of losing a real photograph.
  // For colour/size SKUs never mix in a potentially unrelated parent cover.
  const visible = !variantId && gallery.length
    ? [...(fallback.filter(cover => !gallery.some(item => item.url === cover.url))), ...gallery]
    : gallery.length ? gallery : (variantId ? [] : fallback);
  const selected = visible.find(item => String(item.id) === String(selectedId)) || visible[0];
  const current = visible.find(item => String(item.id) === String(hoveredId)) || selected;
  const index = visible.findIndex(item => String(item.id) === String(current?.id));

  function moveSelection(offset) {
    if (visible.length < 2) return;
    const next = visible[(Math.max(0, index) + offset + visible.length) % visible.length];
    setSelectedId(next.id);
    setHoveredId(null);
  }
  function onTouchStart(event) {
    touchRef.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    swipedRef.current = false;
  }
  function onTouchEnd(event) {
    if (!touchRef.current || visible.length < 2) return;
    const dx = event.changedTouches[0].clientX - touchRef.current.x;
    const dy = event.changedTouches[0].clientY - touchRef.current.y;
    touchRef.current = null;
    if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      swipedRef.current = true;
      moveSelection(dx < 0 ? 1 : -1);
    }
  }
  function mediaContent(item) {
    if (item.type === "image") return <img key={item.id} className="gallery-transition" src={apiAssetUrl(item.url)} alt={product.name} />;
    if (item.type === "video") return <video key={item.id} className="gallery-transition" src={apiAssetUrl(item.url)} controls preload="metadata" playsInline />;
    return <iframe key={item.id} className="gallery-transition" src={item.url} title={`${product.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />;
  }
  return <div className="product-gallery nx29-detail-gallery">
    <div className="gallery-main" aria-live="off" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {!current ? <div className="missing-image">Image coming soon</div>
        : current.type === "image" ? <button
          type="button" className="nx29-zoom-trigger"
          aria-label={`Enlarge image ${index + 1} of ${visible.length}`}
          onClick={() => { if (swipedRef.current) { swipedRef.current = false; return; } zoomRef.current?.showModal(); }}
        >{mediaContent(current)}<span className="nx29-zoom-hint" aria-hidden="true"><UiIcon name="maximize" size={16}/> View larger</span></button>
          : mediaContent(current)}
      {visible.length > 1 && <div className="nx57-gallery-arrows">
        <button type="button" onClick={() => moveSelection(-1)} aria-label="Previous product image"><UiIcon name="chevron-left" size={19}/></button>
        <button type="button" onClick={() => moveSelection(1)} aria-label="Next product image"><UiIcon name="chevron-right" size={19}/></button>
      </div>}
    </div>
    {visible.length > 1 && <div className="nx57-thumbnail-shell">
      <button type="button" className="nx57-thumbnail-scroll" aria-label="Scroll thumbnails left" onClick={()=>thumbsRef.current?.scrollBy({left:-240,behavior:'smooth'})}><UiIcon name="chevron-left" size={17}/></button>
      <div ref={thumbsRef} className="gallery-thumbnails nx29-gallery-thumbnails nx57-thumbnail-track" aria-label="Product gallery thumbnails">
      {visible.map((item, thumbIndex) => <button type="button" key={item.id}
        className={String(selected?.id) === String(item.id) ? "selected" : ""}
        onClick={() => { setSelectedId(item.id); setHoveredId(null); }}
        onPointerEnter={event => { if (event.pointerType === "mouse") setHoveredId(item.id); }}
        onPointerLeave={() => setHoveredId(null)}
        onFocus={() => setHoveredId(item.id)}
        onBlur={() => setHoveredId(null)}
        aria-label={`Show media ${thumbIndex + 1} of ${visible.length}`}
        aria-pressed={String(selected?.id) === String(item.id)}>
        {item.type === "image" ? <img src={apiAssetUrl(item.url)} alt="" loading="lazy" /> : <span>▶ {item.type === "video" ? "Video" : "YouTube"}</span>}
      </button>)}
      </div><button type="button" className="nx57-thumbnail-scroll" aria-label="Scroll thumbnails right" onClick={()=>thumbsRef.current?.scrollBy({left:240,behavior:'smooth'})}><UiIcon name="chevron-right" size={17}/></button>
    </div>}
    <dialog ref={zoomRef} className="nx29-image-dialog" aria-label={`${product.name} enlarged image`}>
      <button type="button" className="nx29-image-dialog-close nx64-animated-close" onClick={() => zoomRef.current?.close()} aria-label="Close enlarged image"><UiIcon name="x" size={18}/></button>
      {current?.type === "image" && <img src={apiAssetUrl(current.url)} alt={product.name} />}
    </dialog>
  </div>;
}
