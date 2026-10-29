import { Button, Card, Checkbox, FormField, Select, TextField, Textarea } from "../../components/ui/index";

import FileUploadField from "../../components/admin/FileUploadField";
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
import CategoryPicker from "../../components/admin/CategoryPicker";
import ProductBuyingGuideEditor from "../../components/admin/ProductBuyingGuideEditor";

export default function AddProduct() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const { categories, categoriesLoading, categoriesError } = useActiveCategories();
  const [form, setForm] = useState({ name: "", brand: "", model: "", description: "", shortDescription:"", categoryId: "", mrp: "", price: "", stock: "", lowStockThreshold:"5",gstPercent:"",pricingMode:"price" });
  const [specifications, setSpecifications] = useState({});
  const [buyingGuide, setBuyingGuide] = useState({});
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
    if (!form.categoryId) { setMessage("Select a valid category or subcategory from the suggestions."); return; }
    let validVariants;
    try { validVariants = validateVariantDrafts(variantDrafts); }
    catch (validationError) { setMessage(validationError.message); return; }
    if (validVariants.length === 0 && (!form.price || !form.mrp || form.stock === "")) {
      setMessage("Enter MRP, selling price and stock for a simple product, or create at least one SKU."); return;
    }
    if (!image) {
      setMessage("Please select a product image.");
      return;
    }
    const formData = new FormData();
    // Parent columns remain for legacy simple products. SKUs have their own authoritative price/stock.
    const anchorSku = validVariants.find(row => Number(row.stock) > 0) || validVariants[0];
    const parent = anchorSku ? { ...form, mrp: anchorSku.mrp, price: anchorSku.price, stock: "0" } : form;
    Object.entries(parent).filter(([key])=>!["discount","pricingMode"].includes(key)).forEach(([key, value]) => formData.append(key, value));
    formData.append("specifications", JSON.stringify(specifications));
    formData.append("buyingGuide", JSON.stringify(buyingGuide));
    formData.append("shortDescription", form.shortDescription.trim());
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
            lowStockThreshold: Number(draft.lowStockThreshold ?? 5),
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
    actions={<Button as={Link} variant="secondary"  to="/admin/products">Cancel</Button>}>
    {createdProduct ? <Card as="section" className="admin-panel admin-form-panel nx-saved-product">
      <div className="nx-saved-mark" aria-hidden="true">✓</div>
      <h2>Product created</h2>
      <p role="status">{uploadReport}</p>
      <p>The product is saved. Continue editing from these focused popups—you do not need to scroll through every section.</p>
      {variantFailures.length > 0 && <p className="admin-alert" role="alert">{variantFailures.length} SKU(s) need correction. Open Manage SKUs and save the missing configurations; do not create the product again.</p>}
      <div className="nx-saved-actions">
        <Button variant="primary" type="button"  onClick={() => setSavedPanel("gallery")}>Manage gallery & visibility</Button>
        <Button variant="secondary" type="button"  onClick={() => setSavedPanel("variants")}>Manage SKUs & prices</Button>
        <Button variant="secondary" type="button"  onClick={() => setSavedPanel("details")}>Edit product details</Button>
      </div>
      <div className="admin-form-actions">
        <Button as={Link} variant="secondary"  to="/admin/products">Back to products</Button>
        <Button variant="primary" type="button"  onClick={() => {
          setCreatedProduct(null); setSavedPanel(null); setQueuedMedia([]); setFeatured(false);
          setUploadReport(""); setVariantDrafts([]); setVariantFailures([]);
          setForm({ name:"", brand:"", model:"", description:"", categoryId:"", mrp:"", price:"", stock:"", lowStockThreshold:"5",gstPercent:"", pricingMode:"price" });
          setSpecifications({}); setBuyingGuide({}); setImage(null); formRef.current?.reset();
        }}>Create another product</Button>
      </div>
      {savedPanel && <Modal title={`Product #${createdProduct.id} · ${savedPanel === "gallery" ? "Gallery" : savedPanel === "variants" ? "SKUs" : "Details"}`}
        subtitle="Edit the saved product without leaving this page." size="large" onClose={() => setSavedPanel(null)}>
        <ProductEditorWorkspace key={`${createdProduct.id}-${savedPanel}`} productId={createdProduct.id} initialTab={savedPanel}/>
      </Modal>}
    </Card> : <Card as="section" className="admin-panel admin-form-panel">
      <form className="admin-form" ref={formRef} onSubmit={handleSubmit}>
        <FormField><span className="nx34-field-label">Product name <b className="nx34-required" aria-hidden="true">*</b></span><TextField name="name" placeholder="Product name" value={form.name} onChange={handleChange} required /></FormField>
        <div className="admin-form-grid two-column">
          <FormField>Brand<TextField name="brand" placeholder="Brand" value={form.brand} onChange={handleChange} maxLength={80} /></FormField>
          <FormField>Model<TextField name="model" placeholder="Model number or family" value={form.model} onChange={handleChange} maxLength={120} /></FormField>
        </div>
        <FormField><span className="nx34-field-label">Short description (shown near product price)</span><Textarea name="shortDescription" rows={2} maxLength={320} placeholder="A concise summary of the product, ideally 1–2 sentences" value={form.shortDescription} onChange={handleChange}/><small>Up to 320 characters. Customers see this before choosing variants.</small></FormField>
        <FormField><span className="nx34-field-label">Full description <b className="nx34-required" aria-hidden="true">*</b></span><Textarea name="description" placeholder="Product description" value={form.description} onChange={handleChange} required /></FormField>
        <div className="admin-form-grid nx-product-stock-row">
          <CategoryPicker categories={categories} value={form.categoryId} disabled={categoriesLoading || categories.length === 0}
            onChange={categoryId => { setSpecifications({}); setForm(previous => ({...previous, categoryId})); }} />
          {variantDrafts.length === 0 && <>
            <FormField><span className="nx34-field-label">Simple product stock <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" name="stock" placeholder="Stock quantity" min="0" step="1" value={form.stock} onChange={handleChange} required /></FormField>
            <FormField><span className="nx34-field-label">Low-stock alert threshold (units) <b className="nx34-required" aria-hidden="true">*</b></span><TextField type="number" name="lowStockThreshold" min="0" max="1000000" step="1" value={form.lowStockThreshold} onChange={handleChange} required /><small>0 alerts only when out of stock.</small></FormField>
          </>}
        </div>
        {variantDrafts.length === 0 ? <VariantPriceFields row={form} onFieldChange={(field,value)=>setForm(old=>updatePricingDraft(old,field,value))} disabled={loading}/>
          : <p className="nx22-sku-notice"><strong>SKU pricing is active.</strong> Price, MRP and stock come from each SKU below. The parent product's legacy values will be initialized automatically and are not separately entered.</p>}
        <FormField className="nx25-gst-field">GST rate for this product (%)<TextField name="gstPercent" type="number" min="0" max="40" step="0.01" value={form.gstPercent} onChange={handleChange} placeholder="Use store default"/><small>Leave blank to use the rate in Shipping & Tax Settings. Rates require verification by product classification.</small></FormField>
        <DraftVariants variants={variantDrafts} onChange={setVariantDrafts} disabled={loading} />
        <ProductSpecificationFields definition={specification.definition} specifications={specifications}
          onChange={updateSpecification} loading={specification.loading} />
        {specification.error && <p className="admin-alert" role="alert">{specification.error}</p>}
        <ProductBuyingGuideEditor value={buyingGuide} onChange={setBuyingGuide} categoryName={categories.find(category=>String(category.id)===String(form.categoryId))?.name||""}/>
        <FileUploadField label="Product cover image" required selection={image?.name||''} onChange={(event) => setImage(event.target.files?.[0] || null)}/>
        <section className="admin-media-draft" aria-label="New product gallery">
          <h2>Gallery and videos</h2>
          <p>Start with your cover image and up to 59 more gallery items or YouTube videos. They upload as <strong>Shared</strong> by default. After creating the product, use <strong>Manage gallery & visibility</strong> to assign a specific color or SKU. Local MP4/WebM uploads are available there too.</p>
          <FileUploadField label="Additional gallery images" multiple help="JPG, PNG or WebP · maximum 12 MB each" selection={queuedMedia.filter(item=>item.type==='image').length?`${queuedMedia.filter(item=>item.type==='image').length} images queued`:''} onChange={queueImages}/>
          <FormField>YouTube video URL
            <TextField type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." />
          </FormField>
          <Button variant="secondary" type="button" onClick={queueVideo} disabled={loading || !videoUrl.trim() || queuedMedia.length >= 59}>Queue video</Button>
          <FormField inline className="admin-featured-toggle"><Checkbox type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)}/> Feature this product on the homepage</FormField>
          {featured && <p>Featured products are ordered in <Link to="/admin/featured">Featured Products</Link> — no overlapping position numbers.</p>}
          <p className="nx15-media-hint">Use the position dropdown to arrange new media. After saving you can drag gallery cards freely.</p>
          <ol className="media-manager-list">
            {queuedMedia.map((item, index) => <li className="media-manager-item" key={item.key}>
              <span><strong>{index + 2}. {item.type === "image" ? "Image" : "YouTube video"}</strong> · {item.type === "image" ? item.file.name : item.url}<small> · Shared (you can change this after saving)</small></span>
              <FormField className="nx15-position-control">Position <Select disabled={loading} value={index} onChange={e => moveQueued(index, Number(e.target.value))}>{queuedMedia.map((_, i) => <option value={i} key={i}>{i+1}</option>)}</Select></FormField>
              <Button variant="secondary" type="button" disabled={loading} onClick={() => setQueuedMedia((previous) => previous.filter((candidate) => candidate.key !== item.key))}>Remove</Button>
            </li>)}
          </ol>
        </section>
        <Button variant="primary"  type="submit" disabled={loading}>{loading ? "Creating…" : "Create Product"}</Button>
      </form>
      {message && <p className="admin-alert" role="alert">{message}</p>}
      {categoriesError && <p className="admin-alert" role="alert">{categoriesError}</p>}
      {!categoriesLoading && categories.length === 0 && <p className="admin-alert">Create an active category before adding products.</p>}
    </Card>}
  </AdminLayout>;
}
