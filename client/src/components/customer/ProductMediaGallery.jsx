import { useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";
import { visibleProductMedia } from "./galleryMedia";

export default function ProductMediaGallery({ product, variantId = null, variantAttributes = {}, items = [] }) {
  const [selectedId, setSelectedId] = useState(null);
  const gallery = visibleProductMedia(items, variantId, variantAttributes);
  const fallback = product.imageUrl ? [{ id: "cover", type: "image", url: product.imageUrl }] : [];
  const visible = gallery.length ? gallery : fallback;
  const current = visible.find(item => String(item.id) === String(selectedId)) || visible[0];
  return <div className="product-gallery">
    <div className="gallery-main" aria-live="polite">
      {!current ? <div className="missing-image">Image coming soon</div>
        : current.type === "image" ? <img key={current.id} className="gallery-transition" src={apiAssetUrl(current.url)} alt={product.name} />
          : current.type === "video" ? <video key={current.id} className="gallery-transition" src={apiAssetUrl(current.url)} controls preload="metadata" playsInline />
            : <iframe key={current.id} className="gallery-transition" src={current.url} title={`${product.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />}
    </div>
    {visible.length > 1 && <div className="gallery-thumbnails" aria-label="Product gallery thumbnails">
      {visible.map((item, index) => <button type="button" key={item.id} className={current?.id === item.id ? "selected" : ""} onClick={() => setSelectedId(item.id)} aria-label={`Show media ${index + 1}`} aria-pressed={current?.id === item.id}>
        {item.type === "image" ? <img src={apiAssetUrl(item.url)} alt="" /> : <span>▶ {item.type === "video" ? "Video" : "YouTube"}</span>}
      </button>)}
    </div>}
  </div>;
}
