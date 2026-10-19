import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import ProductEditorWorkspace from "../../components/admin/ProductEditorWorkspace";
import { createProduct, addProductImage, addProductVideo, updateFeatured } from "../../services/productService";
import DraftVariants from "../../components/admin/DraftVariants";
import { validateVariantDrafts } from "../../components/admin/variantDraftValidation";
import { createVariant } from "../../services/variantService";
import { isAuthenticationError } from "../../services/apiClient";
import { useActiveCategories } from "../../hooks/useActiveCategories";
import { useSpecificationDefinition } from "../../hooks/useSpecificationDefinition";
import ProductSpecificationFields from "../../components/admin/ProductSpecificationFields";
import { updatePricingDraft } from "../../components/admin/variantPricing";
import VariantPriceFields from "../../components/admin/VariantPriceFields";

export default function AddProduct() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { categories, categoriesLoading, categoriesError } = useActiveCategories();
  const [form, setForm] = useState({ name: "", brand: "", model: "", description: "", categoryId: "", mrp: "", price: "", stock: "",pricingMode:"price" });
  const [specifications, setSpecifications] = useState({});
  const specification = useSpecificationDefinition(form.categoryId);
  const [image, setImage] = useState(null);
  const [queuedMedia, setQueuedMedia] = useState([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [createdProduct, setCreatedProduct] = useState(null);
  const [variantDrafts, setVariantDrafts] = useState([]);
  const [variantFailures, setVariantFailures] = useState([]);
  const [uploadReport, setUploadReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [savedPanel, setSavedPanel] = useState(null);
  const [message, setMessage] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "categoryId") setSpecifications({});
    setForm((previous) => (["price","mrp"].includes(name) ? updatePricingDraft(previous,name,value) : { ...previous, [name]: value }));
  }

  function updateSpecification(key, value) {
    setSpecifications((previous) => ({ ...previous, [key]: value }));
  }

  function queueImages(event) {
    const files = [...(event.target.files || [])];
    setQueuedMedia((previous) => [
      ...previous,
      ...files.filter((file) => ["image/png", "image/jpeg", "image/webp"].includes(file.type))
        .map((file) => ({ key: crypto.randomUUID(), type: "image", file }))
    ].slice(0, 59));
    event.target.value = "";
  }

  function queueVideo() {
    const value = videoUrl.trim();
    if (!/^https:\/\/(?:www\.|m\.)?youtube\.com\/|^https:\/\/youtu\.be\//i.test(value)) {
      setMessage("Use a YouTube video URL with HTTPS.");
      return;
    }
    setQueuedMedia((previous) => previous.length < 59
      ? [...previous, { key: crypto.randomUUID(), type: "youtube", url: value }]
      : previous);
    setVideoUrl("");
    setMessage("");
  }

  function moveQueued(index, destination) {
    setQueuedMedia((previous) => {
      if (destination < 0 || destination >= previous.length) return previous;
      const result = [...previous];
      [result[index], result[destination]] = [result[destination], result[index]];
      return result;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    let validVariants;
    try { validVariants = validateVariantDrafts(variantDrafts); }
    catch (validationError) { setMessage(validationError.message); return; }
    if (!image) {
      setMessage("Please select a product image.");
      return;
    }
    const formData = new FormData();
    Object.entries(form).filter(([key])=>!["discount","pricingMode"].includes(key)).forEach(([key, value]) => formData.append(key, value));
    formData.append("specifications", JSON.stringify(specifications));
    formData.append("image", image);
    setLoading(true);
    setMessage("");
    try {
      const result = await createProduct(formData);
      const created = result.product;
      setCreatedProduct(created);
      const failures = [];
      const unsaved = [];
      for (const draft of validVariants) {
        try {
          await createVariant(created.id, {
            sku: draft.sku.trim(),
            customTitle: draft.customTitle || "",
            attributes: draft.attributes,
            price: draft.price,
            mrp: draft.mrp,
            stock: Number(draft.stock),
            isActive: draft.isActive
          });
        } catch (variantError) {
          unsaved.push({ ...draft, error: variantError.message });
          failures.push(`SKU ${draft.sku}: ${variantError.message}`);
        }
      }
      setVariantFailures(unsaved);
      for (const [index, item] of queuedMedia.entries()) {
        try {
          if (item.type === "image") await addProductImage(created.id, item.file);
          else await addProductVideo(created.id, item.url);
        } catch (uploadError) {
          failures.push(`Item ${index + 1}: ${uploadError.message}`);
        }
      }
      if (featured) {
        try { await updateFeatured(created.id, true); }
        catch (featuredError) { failures.push(`Featured: ${featuredError.message}`); }
      }
      setUploadReport(failures.length
        ? `Product saved (#${created.id}), but some media/settings failed: ${failures.join("; ")}. Use the manager below to retry.`
        : `Product #${created.id} created with ${queuedMedia.length + 1} gallery item(s).`);
      setMessage("");
    } catch (requestError) {
      if (isAuthenticationError(requestError)) {
        navigate("/login", { replace: true });
        return;
      }
      setMessage(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  return <AdminLayout title="Add Product" subtitle="Create a product with its gallery, videos and featured status."
    actions={<Link className="admin-secondary-action" to="/admin/products">Cancel</Link>}>
    {createdProduct ? <section className="admin-panel admin-form-panel nx-saved-product">
      <div className="nx-saved-mark" aria-hidden="true">✓</div>
      <h2>Product created</h2>
      <p role="status">{uploadReport}</p>
      <p>The product is saved. Continue editing from these focused popups—you do not need to scroll through every section.</p>
      {variantFailures.length > 0 && <p className="admin-alert" role="alert">{variantFailures.length} SKU(s) need correction. Open Manage SKUs and save the missing configurations; do not create the product again.</p>}
      <div className="nx-saved-actions">
        <button type="button" className="admin-primary-action" onClick={() => setSavedPanel("gallery")}>Manage gallery & visibility</button>
        <button type="button" className="admin-secondary-action" onClick={() => setSavedPanel("variants")}>Manage SKUs & prices</button>
        <button type="button" className="admin-secondary-action" onClick={() => setSavedPanel("details")}>Edit product details</button>
      </div>
      <div className="admin-form-actions">
        <Link className="admin-secondary-action" to="/admin/products">Back to products</Link>
        <button type="button" className="admin-primary-action" onClick={() => {
          setCreatedProduct(null); setSavedPanel(null); setQueuedMedia([]); setFeatured(false);
          setUploadReport(""); setVariantDrafts([]); setVariantFailures([]);
          setForm({ name:"", brand:"", model:"", description:"", categoryId:"", mrp:"", price:"", stock:"", pricingMode:"price" });
          setSpecifications({}); setImage(null); formRef.current?.reset();
        }}>Create another product</button>
      </div>
      {savedPanel && <Modal title={`Product #${createdProduct.id} · ${savedPanel === "gallery" ? "Gallery" : savedPanel === "variants" ? "SKUs" : "Details"}`}
        subtitle="Edit the saved product without leaving this page." size="large" onClose={() => setSavedPanel(null)}>
        <ProductEditorWorkspace key={`${createdProduct.id}-${savedPanel}`} productId={createdProduct.id} initialTab={savedPanel}/>
      </Modal>}
    </section> : <section className="admin-panel admin-form-panel">
      <form className="admin-form" ref={formRef} onSubmit={handleSubmit}>
        <label>Product name<input name="name" placeholder="Product name" value={form.name} onChange={handleChange} required /></label>
        <div className="admin-form-grid two-column">
          <label>Brand<input name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} maxLength={80} /></label>
          <label>Model<input name="model" placeholder="Model number or family" value={form.model} onChange={handleChange} maxLength={120} /></label>
        </div>
        <label>Description<textarea name="description" placeholder="Product description" value={form.description} onChange={handleChange} required /></label>
        <div className="admin-form-grid">
          <label>Category<select name="categoryId" value={form.categoryId} onChange={handleChange}
            disabled={categoriesLoading || categories.length === 0} required>
            <option value="">{categoriesLoading ? "Loading categories…" : "Select a category"}</option>
            {categories.map((category) => <option value={category.id} key={category.id}>{category.name}</option>)}
          </select></label>
          <label>Stock<input type="number" name="stock" placeholder="Stock quantity" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
        </div>
        <VariantPriceFields row={form} onFieldChange={(field,value)=>setForm(old=>updatePricingDraft(old,field,value))} disabled={loading}/>
        <DraftVariants variants={variantDrafts} onChange={setVariantDrafts} disabled={loading} />
        <ProductSpecificationFields definition={specification.definition} specifications={specifications}
          onChange={updateSpecification} loading={specification.loading} />
        {specification.error && <p className="admin-alert" role="alert">{specification.error}</p>}
        <label>Product image<input type="file" accept="image/jpeg,image/png,image/webp"
          onChange={(event) => setImage(event.target.files?.[0] || null)} required /></label>
        <section className="admin-media-draft" aria-label="New product gallery">
          <h2>Gallery and videos</h2>
          <p>Start with your cover image and up to 59 more gallery items or YouTube videos. They upload as <strong>Shared</strong> by default. After creating the product, use <strong>Manage gallery & visibility</strong> to assign a specific color or SKU. Local MP4/WebM uploads are available there too.</p>
          <label>Additional gallery images (JPG, PNG, WebP; 12 MB each)
            <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={queueImages}/>
          </label>
          <label>YouTube video URL
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </label>
          <button type="button" onClick={queueVideo} disabled={loading || !videoUrl.trim() || queuedMedia.length >= 59}>Queue video</button>
          <label className="admin-featured-toggle"><input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)}/> Feature this product on the homepage</label>
          <p className="nx15-media-hint">Use the position dropdown to arrange new media. After saving you can drag gallery cards freely.</p>
          <ol className="media-manager-list">
            {queuedMedia.map((item, index) => <li className="media-manager-item" key={item.key}>
              <span><strong>{index + 2}. {item.type === "image" ? "Image" : "YouTube video"}</strong> · {item.type === "image" ? item.file.name : item.url}<small> · Shared (you can change this after saving)</small></span>
              <label className="nx15-position-control">Position <select disabled={loading} value={index} onChange={e => moveQueued(index, Number(e.target.value))}>{queuedMedia.map((_, i) => <option value={i} key={i}>{i+1}</option>)}</select></label>
              <button type="button" disabled={loading} onClick={() => setQueuedMedia((previous) => previous.filter((candidate) => candidate.key !== item.key))}>Remove</button>
            </li>)}
          </ol>
        </section>
        <button className="admin-primary-action" type="submit" disabled={loading}>{loading ? "Creating…" : "Create Product"}</button>
      </form>
      {message && <p className="admin-form-message" role="status">{message}</p>}
      {categoriesError && <p className="admin-alert" role="alert">{categoriesError}</p>}
      {!categoriesLoading && categories.length === 0 && <p className="admin-alert">Create an active category before adding products.</p>}
    </section>}
  </AdminLayout>;
}
