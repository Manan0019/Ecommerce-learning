import { useEffect, useMemo, useRef, useState } from "react";
import Modal from "../common/Modal";
import { getVariants } from "../../services/variantService";
import { apiAssetUrl } from "../../services/apiClient";
import {
  getProductMedia,
  addProductImage,
  addProductVideo,
  addProductLocalVideo,
  reorderProductMedia,
  removeProductMedia,
  updateFeatured,
  setProductCover,
  assignProductMediaScope,
} from "../../services/productService";

const MAX_ITEMS = 60;
const IMAGE_LIMIT = 12 * 1024 * 1024;
const blankScope = { mode: "shared", optionValue: "", variantId: "" };
function scopeLabel(item) {
  if (item.variantId) return "Exact SKU";
  if (item.optionKey)
    return `${item.optionKey.replaceAll("_", " ")}: ${item.optionValue}`;
  return "Shared · all options";
}
function initialScope(item) {
  if (item.variantId)
    return {
      ...blankScope,
      mode: "variant",
      variantId: String(item.variantId),
    };
  if (item.optionKey)
    return {
      ...blankScope,
      mode: "option",
      optionValue: JSON.stringify([item.optionKey, item.optionValue]),
    };
  return { ...blankScope };
}
function payloadFor(scope) {
  if (scope.mode === "variant")
    return { scope: "variant", variantId: scope.variantId };
  if (scope.mode === "option") {
    const [optionKey, optionValue] = JSON.parse(scope.optionValue);
    return { scope: "option", optionKey, optionValue };
  }
  return { scope: "shared" };
}

export default function ProductMediaManager({
  productId,
  initialFeatured = false,
  coverUrl = "",
  onCoverChanged,
}) {
  const [media, setMedia] = useState([]);
  const [variants, setVariants] = useState([]);
  const [featuredOverride, setFeaturedOverride] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadType, setUploadType] = useState("image");
  const [files, setFiles] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadScope, setUploadScope] = useState({ ...blankScope });
  const [uploadProgress, setUploadProgress] = useState("");
  const [assignment, setAssignment] = useState(null);
  const [assignmentScope, setAssignmentScope] = useState({ ...blankScope });
  const [removal, setRemoval] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [dragging, setDragging] = useState(null);
  const dragSource = useRef(null);
  const featured = featuredOverride ?? initialFeatured;

  async function refreshMedia() {
    const data = await getProductMedia(productId, true);
    setMedia(data.media || []);
  }
  async function refreshVariants() {
    const data = await getVariants(productId, true);
    setVariants(data.variants || []);
  }
  useEffect(() => {
    let active = true;
    Promise.all([
      getProductMedia(productId, true),
      getVariants(productId, true),
    ])
      .then(([m, v]) => {
        if (active) {
          setMedia(m.media || []);
          setVariants(v.variants || []);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [productId]);

  const optionValues = useMemo(() => {
    const map = new Map();
    for (const variant of variants)
      for (const [key, value] of Object.entries(variant.attributes || {})) {
        map.set(JSON.stringify([key, value]), { key, value });
      }
    return [...map.entries()].map(([id, value]) => ({ id, ...value }));
  }, [variants]);

  async function run(action, successMessage) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await action();
      await refreshMedia();
      if (successMessage) setMessage(successMessage);
      return result;
    } catch (e) {
      setError(e.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function saveReorder(sourceIndex, destinationIndex) {
    if (
      busy ||
      sourceIndex < 0 ||
      destinationIndex < 0 ||
      sourceIndex === destinationIndex
    )
      return;
    const next = [...media];
    const [item] = next.splice(sourceIndex, 1);
    next.splice(destinationIndex, 0, item);
    // Optimistic reorder, with reload of authoritative order on success/failure.
    setMedia(next);
    const result = await run(
      () =>
        reorderProductMedia(
          productId,
          next.map((m) => m.id),
        ),
      "Gallery order saved.",
    );
    if (!result) {
      try {
        await refreshMedia();
      } catch {
        /* keep error already displayed */
      }
    }
  }
  function onDragStart(event, index) {
    if (busy) {
      event.preventDefault();
      return;
    }
    dragSource.current = index;
    setDragging(index);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(index));
  }
  function onDrop(event, index) {
    event.preventDefault();
    const source = dragSource.current;
    dragSource.current = null;
    setDragging(null);
    setDragOver(null);
    if (Number.isInteger(source)) void saveReorder(source, index);
  }
  async function upload(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    const itemsToUpload = uploadType === "youtube" ? [videoUrl.trim()] : files;
    if (
      !itemsToUpload.length ||
      (uploadType === "youtube" && !itemsToUpload[0])
    ) {
      setError("Select a file or enter a YouTube link.");
      return;
    }
    if (media.length + itemsToUpload.length > MAX_ITEMS) {
      setError(`Only ${MAX_ITEMS - media.length} gallery slots remain.`);
      return;
    }
    if (
      uploadType === "image" &&
      files.some(
        (f) =>
          !["image/jpeg", "image/png", "image/webp"].includes(f.type) ||
          f.size > IMAGE_LIMIT,
      )
    ) {
      setError("Images must be JPG, PNG or WebP, at most 12 MB each.");
      return;
    }
    if (
      (uploadScope.mode === "option" && !uploadScope.optionValue) ||
      (uploadScope.mode === "variant" && !uploadScope.variantId)
    ) {
      setError("Choose the option value or exact SKU before uploading.");
      return;
    }
    setBusy(true);
    const failures = [];
    let uploaded = 0;
    try {
      for (const [index, file] of itemsToUpload.entries()) {
        setUploadProgress(`Uploading ${index + 1} of ${itemsToUpload.length}…`);
        try {
          const result =
            uploadType === "image"
              ? await addProductImage(productId, file)
              : uploadType === "video"
                ? await addProductLocalVideo(productId, file)
                : await addProductVideo(productId, file);
          uploaded++;
          if (uploadScope.mode !== "shared") {
            try {
              await assignProductMediaScope(
                productId,
                result.media.id,
                payloadFor(uploadScope),
              );
            } catch (e) {
              failures.push(
                `Item ${index + 1} uploaded as Shared; assignment failed: ${e.message}`,
              );
            }
          }
        } catch (e) {
          failures.push(`Item ${index + 1}: ${e.message}`);
        }
      }
      await refreshMedia();
      if (failures.length) setError(failures.join(" | "));
      if (uploaded)
        setMessage(
          `${uploaded} gallery item${uploaded === 1 ? "" : "s"} uploaded. ${failures.length ? "Review warnings below." : "Visibility applied."}`,
        );
      // Clear completed selections even on partial failure: retrying a whole batch could duplicate already uploaded files.
      if (uploaded) {
        setUploadOpen(false);
        setFiles([]);
        setVideoUrl("");
        setUploadScope({ ...blankScope });
      }
    } finally {
      setBusy(false);
      setUploadProgress("");
    }
  }
  async function setVisibility() {
    if (!assignment) return;
    if (
      (assignmentScope.mode === "option" && !assignmentScope.optionValue) ||
      (assignmentScope.mode === "variant" && !assignmentScope.variantId)
    ) {
      setError("Choose an option value or SKU.");
      return;
    }
    const result = await run(
      () =>
        assignProductMediaScope(
          productId,
          assignment.id,
          payloadFor(assignmentScope),
        ),
      "Gallery visibility updated.",
    );
    if (result) setAssignment(null);
  }
  async function setCover(item) {
    const result = await run(
      () => setProductCover(productId, item.id),
      "Product cover updated.",
    );
    if (result) onCoverChanged?.(result.imageUrl || item.url);
  }
  async function deleteItem() {
    if (!removal) return;
    const result = await run(
      () => removeProductMedia(productId, removal.id),
      "Gallery entry removed (local file retained safely).",
    );
    if (result) setRemoval(null);
  }
  async function toggleFeatured(value) {
    const result = await run(
      () => updateFeatured(productId, value),
      value ? "Featured on homepage." : "Removed from featured products.",
    );
    if (result) setFeaturedOverride(value);
  }
  function scopePicker(value, onChange) {
    return (
      <div className="nx15-scope-editor">
        <div
          className="nx15-scope-choices"
          role="group"
          aria-label="Media visibility"
        >
          {[
            ["shared", "All variants", "Shared for every configuration"],
            ["option", "Matching option", "For a color, size or other option"],
            ["variant", "One SKU", "Specific purchasable configuration"],
          ].map(([mode, title, detail]) => (
            <label
              key={mode}
              className={
                value.mode === mode
                  ? "nx15-scope-choice selected"
                  : "nx15-scope-choice"
              }
            >
              <input
                type="radio"
                name={
                  onChange === setUploadScope ? "upload-scope" : "edit-scope"
                }
                checked={value.mode === mode}
                onChange={() => onChange({ ...blankScope, mode })}
              />
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            </label>
          ))}
        </div>
        {value.mode === "option" && (
          <label className="nx15-select-label">
            Select an option and value
            <select
              value={value.optionValue}
              onChange={(e) =>
                onChange((s) => ({ ...s, optionValue: e.target.value }))
              }
            >
              <option value="">Select, e.g. Color: Midnight</option>
              {optionValues.map((o) => (
                <option value={o.id} key={o.id}>
                  {o.key.replaceAll("_", " ")}: {o.value}
                </option>
              ))}
            </select>
          </label>
        )}
        {value.mode === "variant" && (
          <label className="nx15-select-label">
            Select an exact SKU
            <select
              value={value.variantId}
              onChange={(e) =>
                onChange((s) => ({ ...s, variantId: e.target.value }))
              }
            >
              <option value="">Choose SKU</option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.sku} · {Object.values(v.attributes || {}).join(" / ")}
                </option>
              ))}
            </select>
          </label>
        )}
        {variants.length === 0 && value.mode !== "shared" && (
          <p className="nx-upload-tip">
            First create product SKUs, then assign media to a color/option or
            exact variant.
          </p>
        )}
      </div>
    );
  }

  return (
    <section className="admin-panel nx-media-manager nx15-media-manager">
      <div className="admin-panel-heading nx15-media-heading">
        <div>
          <p className="eyebrow">Product presentation</p>
          <h2>Media studio</h2>
          <p>
            Upload together, assign visibility once, and drag cards into the
            right order.
          </p>
        </div>
        <button
          type="button"
          className="admin-primary-action"
          disabled={busy || media.length >= MAX_ITEMS}
          onClick={() => {
            setUploadOpen(true);
            setError("");
          }}
        >
          + Upload media
        </button>
      </div>
      <div className="nx15-media-topline">
        <label className="nx-inline-checkbox">
          <input
            type="checkbox"
            checked={featured}
            disabled={busy}
            onChange={(e) => void toggleFeatured(e.target.checked)}
          />{" "}
          Featured on homepage
        </label>
        <span>
          {media.length} of {MAX_ITEMS} media slots used
        </span>
        <button
          type="button"
          className="nx-text-action"
          disabled={busy}
          onClick={() => refreshVariants().catch((e) => setError(e.message))}
        >
          Refresh SKUs
        </button>
      </div>
      <div className="nx15-media-help">
        <strong>Visibility:</strong> <span>Shared = everyone</span>
        <span>Option = e.g. all Midnight colors</span>
        <span>SKU = one precise combination</span>
      </div>
      <p className="nx15-media-hint">
        Drag a card onto another to reorder. Prefer a keyboard? Use the
        “Position” selector on each card.
      </p>
      {message && (
        <p className="admin-form-message" role="status">
          {message}
        </p>
      )}
      {error && !uploadOpen && !assignment && !removal && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {!media.length && (
        <div className="admin-empty">
          No gallery images yet. Add your first product photo or video.
        </div>
      )}
      <div className="nx-media-grid nx15-sort-grid">
        {media.map((item, index) => (
          <article
            key={item.id}
            draggable={!busy}
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => {
              e.preventDefault();
              if (!busy) {
                e.dataTransfer.dropEffect = "move";
                setDragOver(index);
              }
            }}
            onDrop={(e) => onDrop(e, index)}
            onDragLeave={() => setDragOver(null)}
            onDragEnd={() => {
              dragSource.current = null;
              setDragging(null);
              setDragOver(null);
            }}
            className={`nx-media-card nx15-sort-card${dragOver === index ? " is-drop-target" : ""}${dragging === index ? " is-dragging" : ""}`}
          >
            <div className="nx-media-preview">
              {item.type === "image" ? (
                <img
                  src={apiAssetUrl(item.url)}
                  alt={`Gallery image ${index + 1}`}
                  loading="lazy"
                  draggable={false}
                />
              ) : item.type === "video" ? (
                <video
                  src={apiAssetUrl(item.url)}
                  muted
                  preload="metadata"
                  playsInline
                />
              ) : (
                <div className="nx-youtube-placeholder">
                  <span>▶</span>YouTube video
                </div>
              )}
              <span className="nx-media-index">{index + 1}</span>
              {item.type === "image" && item.url === coverUrl && (
                <span className="nx-cover-badge">Cover</span>
              )}
              <span className="nx15-drag-handle" aria-hidden="true">
                ⠿ Drag
              </span>
            </div>
            <div className="nx-media-info">
              <span>
                {item.type === "image"
                  ? "Image"
                  : item.type === "video"
                    ? "Local video"
                    : "YouTube"}
              </span>
              <strong>{scopeLabel(item)}</strong>
            </div>
            <label className="nx15-position-control">
              Position
              <select
                aria-label={`Position for gallery item ${index + 1}`}
                disabled={busy}
                value={index}
                onChange={(e) =>
                  void saveReorder(index, Number(e.target.value))
                }
              >
                {media.map((_, pos) => (
                  <option value={pos} key={pos}>
                    {pos + 1}
                  </option>
                ))}
              </select>
            </label>
            <div className="nx15-card-actions">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setAssignment(item);
                  setAssignmentScope(initialScope(item));
                  setError("");
                }}
              >
                Visibility
              </button>
              {item.type === "image" && (
                <button
                  type="button"
                  disabled={busy || item.url === coverUrl}
                  onClick={() => void setCover(item)}
                >
                  Set cover
                </button>
              )}
              <button
                type="button"
                className="nx15-remove"
                disabled={busy}
                onClick={() => {
                  setRemoval(item);
                  setError("");
                }}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {uploadOpen && (
        <Modal
          title="Upload product media"
          subtitle="Multiple images at once; assign shared, option-specific or SKU-specific visibility."
          size="medium"
          closeDisabled={busy}
          onClose={() => {
            setUploadOpen(false);
            setError("");
          }}
        >
          <form className="nx15-upload-form" onSubmit={upload}>
            <div className="nx-filter-pills" aria-label="Media type">
              {[
                ["image", "Images"],
                ["video", "Video file"],
                ["youtube", "YouTube URL"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={uploadType === value}
                  className={uploadType === value ? "is-active" : ""}
                  onClick={() => {
                    setUploadType(value);
                    setFiles([]);
                    setVideoUrl("");
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {uploadType === "image" && (
              <label>
                Select JPG, PNG or WebP images (12 MB each)
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </label>
            )}
            {uploadType === "video" && (
              <label>
                MP4 or WebM video (25 MB maximum)
                <input
                  type="file"
                  accept="video/mp4,video/webm"
                  onChange={(e) =>
                    setFiles(Array.from(e.target.files || []).slice(0, 1))
                  }
                />
              </label>
            )}
            {uploadType === "youtube" && (
              <label>
                Video URL
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                />
              </label>
            )}
            {uploadType !== "youtube" && files.length > 0 && (
              <p className="nx15-file-count">
                {files.length} file{files.length === 1 ? "" : "s"} selected ·{" "}
                {MAX_ITEMS - media.length} available slots
              </p>
            )}
            <h3>Who should see these files?</h3>
            {scopePicker(uploadScope, setUploadScope)}
            {uploadProgress && (
              <p role="status" className="nx15-file-count">
                {uploadProgress}
              </p>
            )}
            {error && (
              <p className="admin-alert" role="alert">
                {error}
              </p>
            )}
            <div className="nx-sticky-actions">
              <button
                type="submit"
                className="admin-primary-action"
                disabled={busy}
              >
                {busy ? "Uploading…" : "Upload and assign"}
              </button>
              <button
                type="button"
                className="admin-secondary-action"
                disabled={busy}
                onClick={() => setUploadOpen(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
      {assignment && (
        <Modal
          title="Change media visibility"
          subtitle="Applies to this gallery item only."
          size="medium"
          closeDisabled={busy}
          onClose={() => {
            setAssignment(null);
            setError("");
          }}
        >
          {scopePicker(assignmentScope, setAssignmentScope)}
          {error && (
            <p className="admin-alert" role="alert">
              {error}
            </p>
          )}
          <div className="nx-sticky-actions">
            <button
              className="admin-primary-action"
              type="button"
              disabled={busy}
              onClick={() => void setVisibility()}
            >
              Save visibility
            </button>
            <button
              className="admin-secondary-action"
              type="button"
              disabled={busy}
              onClick={() => setAssignment(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
      {removal && (
        <Modal
          title="Remove gallery entry?"
          subtitle="This removes its database reference, not the stored file."
          size="small"
          closeDisabled={busy}
          onClose={() => setRemoval(null)}
        >
          <p>
            Make sure it is not the active cover image. Local files are retained
            to prevent deleting shared assets accidentally.
          </p>
          {error && (
            <p className="admin-alert" role="alert">
              {error}
            </p>
          )}
          <div className="nx-sticky-actions">
            <button
              className="admin-danger-action"
              type="button"
              disabled={busy}
              onClick={() => void deleteItem()}
            >
              Remove entry
            </button>
            <button
              className="admin-secondary-action"
              type="button"
              disabled={busy}
              onClick={() => setRemoval(null)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
