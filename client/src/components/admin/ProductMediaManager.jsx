import { useEffect, useMemo, useState } from "react";
import Modal from "../common/Modal";
import { getVariants } from "../../services/variantService";
import { apiAssetUrl } from "../../services/apiClient";
import { getProductMedia, addProductImage, addProductVideo, addProductLocalVideo,
  reorderProductMedia, removeProductMedia, updateFeatured, setProductCover, assignProductMediaScope } from "../../services/productService";

function scopeLabel(item) {
  if (item.variantId) return "Exact SKU only";
  if (item.optionKey) return `${item.optionKey.replaceAll("_", " ")}: ${item.optionValue}`;
  return "Everyone (shared)";
}
function scopeFrom(item) {
  if (item.variantId) return { mode: "variant", variantId: String(item.variantId), optionValue: "" };
  if (item.optionKey) return { mode: "option", optionValue: JSON.stringify([item.optionKey,item.optionValue]), variantId: "" };
  return { mode: "shared", variantId: "", optionValue: "" };
}

export default function ProductMediaManager({ productId, initialFeatured = false, coverUrl = "", onCoverChanged }) {
  const [items, setItems] = useState([]);
  const [variants, setVariants] = useState([]);
  const [uploadType, setUploadType] = useState("image");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [target, setTarget] = useState(null);
  const [scope, setScope] = useState({ mode: "shared", optionValue: "", variantId: "" });
  const [toDelete, setToDelete] = useState(null);
  const [featuredOverride, setFeaturedOverride] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const featured = featuredOverride ?? initialFeatured;

  async function refreshMedia() { const data = await getProductMedia(productId, true); setItems(data.media || []); return data.media || []; }
  async function refreshVariants() { const data = await getVariants(productId, true); setVariants(data.variants || []); }
  useEffect(() => {
    let active = true;
    Promise.all([getProductMedia(productId, true), getVariants(productId, true)]).then(([m, v]) => {
      if (active) { setItems(m.media || []); setVariants(v.variants || []); }
    }).catch(err => { if (active) setError(err.message); });
    return () => { active = false; };
  }, [productId]);

  const optionValues = useMemo(() => {
    const unique = new Map();
    for (const variant of variants) for (const [key, value] of Object.entries(variant.attributes || {})) {
      unique.set(JSON.stringify([key, value]), { key, value });
    }
    return [...unique.entries()].map(([id, option]) => ({ id, ...option }));
  }, [variants]);

  async function perform(action, successText = "Saved.") {
    setBusy(true); setError(""); setMessage("");
    try { const result = await action(); await refreshMedia(); setMessage(successText); return result; }
    catch (err) { setError(err.message); return null; }
    finally { setBusy(false); }
  }
  function beginAssignment(item) { setTarget(item); setScope(scopeFrom(item)); setError(""); }
  async function saveScope() {
    if (!target) return;
    if (scope.mode === "option" && !scope.optionValue) { setError("Choose the color or other option value."); return; }
    if (scope.mode === "variant" && !scope.variantId) { setError("Choose an exact SKU."); return; }
    const body = scope.mode === "shared" ? { scope: "shared" }
      : scope.mode === "variant" ? { scope: "variant", variantId: scope.variantId }
      : (() => { const [optionKey, optionValue] = JSON.parse(scope.optionValue); return { scope: "option", optionKey, optionValue }; })();
    const result = await perform(() => assignProductMediaScope(productId, target.id, body), "Media visibility updated.");
    if (result) setTarget(null);
  }
  async function upload(event) {
    event.preventDefault();
    if (items.length >= 16) { setError("A product can have at most 16 gallery items."); return; }
    if (uploadType !== "youtube" && !file) { setError("Choose a file first."); return; }
    if (uploadType === "youtube" && !youtubeUrl.trim()) { setError("Paste a YouTube URL."); return; }
    const result = await perform(() => uploadType === "image" ? addProductImage(productId, file)
      : uploadType === "video" ? addProductLocalVideo(productId, file)
        : addProductVideo(productId, youtubeUrl.trim()), "Media uploaded. Choose who should see it.");
    if (result) {
      setUploadOpen(false); setFile(null); setYoutubeUrl("");
      if (result.media) beginAssignment(result.media);
    }
  }
  async function move(index, delta) {
    const other = index + delta;
    if (other < 0 || other >= items.length) return;
    const next = [...items];
    [next[index], next[other]] = [next[other], next[index]];
    await perform(() => reorderProductMedia(productId, next.map(item => item.id)), "Gallery order saved.");
  }
  async function remove() {
    if (!toDelete) return;
    const result = await perform(() => removeProductMedia(productId, toDelete.id), "Gallery item removed. Local files are retained for safe cleanup.");
    if (result) setToDelete(null);
  }
  async function cover(item) {
    const result = await perform(() => setProductCover(productId, item.id), "New product cover selected.");
    if (result) onCoverChanged?.(result.imageUrl || item.url);
  }
  async function updateFeature(value) {
    const result = await perform(() => updateFeatured(productId, value), value ? "Product featured on storefront." : "Product no longer featured.");
    if (result) setFeaturedOverride(value);
  }

  return <section className="admin-panel nx-media-manager">
    <div className="admin-panel-heading"><div><h2>Product gallery</h2><p>Upload once, then choose which configurations can see each image or video.</p></div>
      <button type="button" className="admin-primary-action" disabled={busy || items.length >= 16} onClick={() => { setUploadOpen(true); setError(""); }}>+ Add image or video</button></div>
    <div className="nx-gallery-toolbar"><label className="nx-inline-checkbox"><input type="checkbox" checked={featured} disabled={busy} onChange={e => updateFeature(e.target.checked)}/> Feature this product on the homepage</label>
      <span>{items.length} / 16 gallery items</span><button className="nx-text-action" type="button" disabled={busy} onClick={() => refreshVariants().catch(e => setError(e.message))}>↻ Refresh SKUs</button></div>
    <div className="nx-media-explainer"><strong>How visibility works</strong>
      <div><span><b>Everyone</b><small>Shared photos, size guides or demo videos.</small></span><span><b>Option value</b><small>Midnight images apply to all Midnight SKUs.</small></span><span><b>Exact SKU</b><small>Only one configuration sees this media.</small></span></div>
    </div>
    {message && <p className="admin-form-message" role="status">{message}</p>}
    {error && !target && !uploadOpen && !toDelete && <p className="admin-alert" role="alert">{error}</p>}
    {items.length === 0 ? <div className="admin-empty">No gallery items yet. Upload a product image to get started.</div> : <div className="nx-media-grid">
      {items.map((item, index) => <article className="nx-media-card" key={item.id}>
        <div className="nx-media-preview">{item.type === "image" ? <img src={apiAssetUrl(item.url)} alt={`Gallery item ${index + 1}`} loading="lazy"/>
          : item.type === "video" ? <video src={apiAssetUrl(item.url)} muted preload="metadata" playsInline />
            : <div className="nx-youtube-placeholder"><span>▶</span>YouTube video</div>}
          <span className="nx-media-index">{index + 1}</span>{coverUrl && item.type === "image" && item.url === coverUrl && <span className="nx-cover-badge">Cover</span>}
        </div>
        <div className="nx-media-info"><span>{item.type === "image" ? "Image" : item.type === "video" ? "Local video" : "YouTube"}</span><strong>{scopeLabel(item)}</strong></div>
        <button className="nx-scope-button" type="button" disabled={busy} onClick={() => beginAssignment(item)}>Set visibility ↗</button>
        <div className="nx-media-actions">
          <button type="button" aria-label={`Move item ${index + 1} earlier`} disabled={busy || index === 0} onClick={() => move(index,-1)}>←</button>
          <button type="button" aria-label={`Move item ${index + 1} later`} disabled={busy || index === items.length - 1} onClick={() => move(index,1)}>→</button>
          {item.type === "image" && <button type="button" disabled={busy} onClick={() => cover(item)}>Make cover</button>}
          <button type="button" className="nx-remove" disabled={busy} onClick={() => { setToDelete(item); setError(""); }}>Remove</button>
        </div>
      </article>)}
    </div>}

    {uploadOpen && <Modal title="Add product media" subtitle="Upload locally stored images/videos or link a YouTube video." size="medium" closeDisabled={busy}
      onClose={() => { setUploadOpen(false); setError(""); }}>
      <form className="admin-form nx-upload-form" onSubmit={upload}>
        <div className="nx-filter-pills" aria-label="Media type">
          {[ ["image", "Images"], ["video", "Local video"], ["youtube", "YouTube"] ].map(([value,label]) => <button type="button" key={value} aria-pressed={uploadType === value} className={uploadType === value ? "is-active" : ""}
            onClick={() => { setUploadType(value); setFile(null); setYoutubeUrl(""); }}>{label}</button>)}
        </div>
        {uploadType === "image" && <label>Product image (JPG, PNG or WebP)<input key="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setFile(e.target.files?.[0] || null)} required /></label>}
        {uploadType === "video" && <label>MP4 or WebM video (maximum 25 MB)<input key="video" type="file" accept="video/mp4,video/webm" onChange={e => setFile(e.target.files?.[0] || null)} required /></label>}
        {uploadType === "youtube" && <label>YouTube video URL<input type="url" placeholder="https://www.youtube.com/watch?v=…" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} required /></label>}
        <div className="nx-upload-tip">New uploads start as <strong>Shared</strong>. After upload, we'll open the visibility selector so you can choose a color or SKU if needed.</div>
        {error && <p className="admin-alert" role="alert">{error}</p>}
        <div className="nx-sticky-actions"><button type="submit" className="admin-primary-action" disabled={busy}>{busy ? "Uploading…" : "Upload media"}</button>
          <button type="button" className="admin-secondary-action" disabled={busy} onClick={() => setUploadOpen(false)}>Cancel</button></div>
      </form>
    </Modal>}
    {target && <Modal title="Who should see this media?" subtitle="Choose one visibility rule; you can change it at any time." size="medium" closeDisabled={busy}
      onClose={() => { setTarget(null); setError(""); }}>
      <div className="nx-scope-options">
        <label className={scope.mode === "shared" ? "is-selected" : ""}><input type="radio" name="mediaScope" checked={scope.mode === "shared"} onChange={() => setScope({ mode: "shared", optionValue: "", variantId: "" })}/><span><strong>Everyone · Shared</strong><small>Use for generic product photos, size charts and demo videos.</small></span></label>
        <label className={scope.mode === "option" ? "is-selected" : ""}><input type="radio" name="mediaScope" checked={scope.mode === "option"} onChange={() => setScope({ mode: "option", optionValue: "", variantId: "" })}/><span><strong>Matching option · e.g. Color = Midnight</strong><small>Automatically shows for every SKU with this option value.</small></span></label>
        {scope.mode === "option" && <label className="nx-scope-select">Select option and value<select value={scope.optionValue} onChange={e => setScope(old => ({ ...old, optionValue: e.target.value }))}>
          <option value="">Choose color / size / other option</option>{optionValues.map(option => <option key={option.id} value={option.id}>{option.key.replaceAll("_", " ")}: {option.value}</option>)}
        </select></label>}
        <label className={scope.mode === "variant" ? "is-selected" : ""}><input type="radio" name="mediaScope" checked={scope.mode === "variant"} onChange={() => setScope({ mode: "variant", optionValue: "", variantId: "" })}/><span><strong>One exact SKU</strong><small>Only the selected color / size / storage combination sees it.</small></span></label>
        {scope.mode === "variant" && <label className="nx-scope-select">Select SKU<select value={scope.variantId} onChange={e => setScope(old => ({ ...old, variantId: e.target.value }))}>
          <option value="">Choose exact SKU</option>{variants.map(v => <option key={v.id} value={v.id}>{v.sku} · {Object.values(v.attributes || {}).join(" / ")}</option>)}
        </select></label>}
      </div>
      {variants.length === 0 && scope.mode !== "shared" && <p className="nx-upload-tip">Create SKU variants first, then assign visibility to a color or exact SKU.</p>}
      {error && <p role="alert" className="admin-alert">{error}</p>}
      <div className="nx-sticky-actions"><button className="admin-primary-action" type="button" disabled={busy || (scope.mode === "option" && !scope.optionValue) || (scope.mode === "variant" && !scope.variantId)} onClick={saveScope}>{busy ? "Saving…" : "Save visibility"}</button>
        <button className="admin-secondary-action" type="button" disabled={busy} onClick={() => setTarget(null)}>Cancel</button></div>
    </Modal>}
    {toDelete && <Modal title="Remove gallery item?" subtitle="The record will disappear from the product gallery." size="small" closeDisabled={busy}
      onClose={() => setToDelete(null)}>
      <p>Removing this gallery item will not delete the locally stored file. The storefront cover may still reference it; choose a replacement cover first if necessary.</p>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      <div className="nx-sticky-actions"><button type="button" className="admin-danger-action" disabled={busy} onClick={remove}>{busy ? "Removing…" : "Remove gallery item"}</button>
        <button type="button" className="admin-secondary-action" disabled={busy} onClick={() => setToDelete(null)}>Cancel</button></div>
    </Modal>}
  </section>;
}
