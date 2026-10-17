import { useEffect, useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";
import {
  getProductMedia,
  addProductImage,
  addProductVideo,
  reorderProductMedia,
  removeProductMedia,
  updateFeatured,
} from "../../services/productService";
export default function ProductMediaManager({
  productId,
  initialFeatured = false,
}) {
  const [media, setMedia] = useState([]),
    [image, setImage] = useState(null),
    [url, setUrl] = useState("");
  const [featured, setFeatured] = useState(initialFeatured),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setFeatured(initialFeatured);
  }, [initialFeatured]);
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
        Upload up to 16 images/videos. Use arrows to change display order. The
        first item is shown first to customers.
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
              setFeatured(v);
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
            ) : (
              <span>Video {i + 1} ▶</span>
            )}
            <span>
              {i + 1}. {m.type}
            </span>
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
      {message && (
        <p role="status" className="admin-form-message">
          {message}
        </p>
      )}
    </section>
  );
}
