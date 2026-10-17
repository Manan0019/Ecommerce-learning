import { useEffect, useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";
import { getProductMedia } from "../../services/productService";
export default function ProductMediaGallery({ product }) {
  const [items, setItems] = useState([]),
    [selected, setSelected] = useState(0);
  useEffect(() => {
    let active = true;
    getProductMedia(product.id)
      .then((d) => {
        if (active) {
          setItems(d.media);
          setSelected(0);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [product.id]);
  const fallback = product.imageUrl
    ? [{ id: "cover", type: "image", url: product.imageUrl }]
    : [];
  const gallery = items.length ? items : fallback;
  const current = gallery[selected] || gallery[0];
  return (
    <div className="product-gallery">
      <div className="gallery-main">
        {!current ? (
          <div className="missing-image">Image coming soon</div>
        ) : current.type === "image" ? (
          <img
            src={apiAssetUrl(current.url)}
            alt={`${product.name} view ${selected + 1}`}
          />
        ) : current.type === "video" ? (
          <video
            key={current.id}
            src={apiAssetUrl(current.url)}
            controls
            preload="metadata"
            playsInline
          />
        ) : (
          <iframe
            src={current.url}
            title={`${product.name} video`}
            loading="lazy"
            allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        )}
      </div>
      {gallery.length > 1 && (
        <div className="gallery-thumbnails">
          {gallery.map((m, i) => (
            <button
              type="button"
              key={m.id}
              className={selected === i ? "selected" : ""}
              onClick={() => setSelected(i)}
              aria-label={`Show media ${i + 1}`}
            >
              {m.type === "image" ? (
                <img src={apiAssetUrl(m.url)} alt="" />
              ) : (
                <span>▶ {m.type === "video" ? "Local video" : "YouTube"}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
