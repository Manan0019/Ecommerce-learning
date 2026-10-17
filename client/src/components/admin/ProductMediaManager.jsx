import { useEffect, useState } from "react";
import { getVariants } from "../../services/variantService";
import { apiAssetUrl } from "../../services/apiClient";
import {
  getProductMedia,
  addProductImage,
  addProductVideo,
  reorderProductMedia,
  removeProductMedia,
  updateFeatured,
  addProductLocalVideo,
  setProductCover,
  assignProductMediaVariant,
} from "../../services/productService";
export default function ProductMediaManager({
  productId,
  initialFeatured = false,
}) {
  const [media, setMedia] = useState([]),
    [image, setImage] = useState(null),
    [videoFile, setVideoFile] = useState(null),
    [url, setUrl] = useState("");
  const [featuredOverride, setFeaturedOverride] = useState(null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const [coverUrl, setCoverUrl] = useState(null);
  const [variants, setVariants] = useState([]);
  const featured = featuredOverride ?? initialFeatured;
  useEffect(() => {
    let active = true;
    getVariants(productId, true)
      .then((d) => {
        if (active) setVariants(d.variants || []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [productId]);
  useEffect(() => {
    let active = true;
    getProductMedia(productId, true)
      .then((d) => {
        if (active) setMedia(d.media);
      })
      .catch((e) => {
        if (active) setMessage(e.message);
      });
    return () => {
      active = false;
    };
  }, [productId]);
  async function perform(action) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      const result = await getProductMedia(productId, true);
      setMedia(result.media);
      setMessage("Saved successfully");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function move(index, direction) {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    perform(() =>
      reorderProductMedia(
        productId,
        next.map((m) => m.id),
      ),
    );
  }
  return (
    <section
      className="admin-panel admin-form-panel"
      aria-label="Gallery management"
    >
      <h2>Media gallery</h2>
      <p>
        Upload up to 16 images/videos. Use arrows to change display order.
        Assign a gallery item to an SKU or keep it shared. The first applicable
        item is shown first to customers.
      </p>
      <label>
        Featured on storefront{" "}
        <input
          type="checkbox"
          checked={featured}
          disabled={busy}
          onChange={async (e) => {
            const v = e.target.checked;
            setBusy(true);
            try {
              await updateFeatured(productId, v);
              setFeaturedOverride(v);
            } catch (err) {
              setMessage(err.message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="admin-form">
        <label>
          Add gallery image (JPG / PNG / WebP; 5 MB maximum)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
          />
        </label>
        <button
          type="button"
          disabled={busy || !image}
          onClick={() =>
            perform(async () => {
              await addProductImage(productId, image);
              setImage(null);
            })
          }
        >
          Add image
        </button>
        <label>
          Add local video (MP4 / WebM; 25 MB maximum)
          <input
            type="file"
            accept="video/mp4,video/webm"
            onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
          />
        </label>
        <button
          type="button"
          disabled={busy || !videoFile}
          onClick={() =>
            perform(async () => {
              await addProductLocalVideo(productId, videoFile);
              setVideoFile(null);
            })
          }
        >
          Upload video
        </button>
        <label>
          Add YouTube video URL
          <input
            type="url"
            value={url}
            placeholder="https://www.youtube.com/watch?v=..."
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={busy || !url.trim()}
          onClick={() =>
            perform(async () => {
              await addProductVideo(productId, url.trim());
              setUrl("");
            })
          }
        >
          Add video
        </button>
      </div>
      <div className="media-manager-list">
        {media.map((m, i) => (
          <div className="media-manager-item" key={m.id}>
            {m.type === "image" ? (
              <img
                src={apiAssetUrl(m.url)}
                alt={`Gallery ${i + 1}`}
                loading="lazy"
              />
            ) : m.type === "video" ? (
              <video
                src={apiAssetUrl(m.url)}
                muted
                preload="metadata"
                controls
                width="150"
              />
            ) : (
              <span>YouTube video {i + 1} ▶</span>
            )}
            <span>
              {i + 1}. {m.type}
            </span>
            <label>
              Media for SKU
              <select
                value={m.variantId || ""}
                disabled={busy}
                aria-label={`Variant assignment for media ${i + 1}`}
                onChange={(e) =>
                  perform(() =>
                    assignProductMediaVariant(
                      productId,
                      m.id,
                      e.target.value || null,
                    ),
                  )
                }
              >
                <option value="">Shared (all variants)</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.sku} —{" "}
                    {Object.entries(v.attributes || {})
                      .map(([k, val]) => `${k}: ${val}`)
                      .join(" · ")}
                  </option>
                ))}
              </select>
            </label>
            {m.type === "image" && (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  perform(async () => {
                    const d = await setProductCover(productId, m.id);
                    setCoverUrl(d.imageUrl);
                  })
                }
              >
                Set as cover
              </button>
            )}
            <button
              type="button"
              disabled={busy || i === 0}
              onClick={() => move(i, -1)}
            >
              ↑
            </button>
            <button
              type="button"
              disabled={busy || i === media.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => perform(() => removeProductMedia(productId, m.id))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      {coverUrl && (
        <p role="status">Cover image updated for product cards: {coverUrl}</p>
      )}
      {message && (
        <p role="status" className="admin-form-message">
          {message}
        </p>
      )}
    </section>
  );
}
