import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProduct, updateProduct, updateProductImage } from "../../services/productService";
import { useActiveCategories } from "../../hooks/useActiveCategories";
import { useSpecificationDefinition } from "../../hooks/useSpecificationDefinition";
import ProductSpecificationFields from "./ProductSpecificationFields";
import ProductMediaManager from "./ProductMediaManager";
import ProductVariantsManager from "./ProductVariantsManager";
import VariantPriceFields from "./VariantPriceFields";
import CategoryPicker from "./CategoryPicker";
import { updatePricingDraft } from "./variantPricing";
import { getVariants } from "../../services/variantService";

const tabs = [
  { id: "details", label: "Product details", description: "Name, category, pricing and specifications" },
  { id: "variants", label: "SKUs & inventory", description: "Options, individual prices and available quantities" },
  { id: "gallery", label: "Gallery & media", description: "Images, videos, display order and visibility" }
];

export default function ProductEditorWorkspace({ productId, onSaved, initialTab = "details" }) {
  const navigate = useNavigate();
  const imageFormRef = useRef(null);
  const [tab, setTab] = useState(initialTab);
  const { categories, categoriesLoading, categoriesError } = useActiveCategories();
  const [form, setForm] = useState(null);
  const [specifications, setSpecifications] = useState({});
  const definition = useSpecificationDefinition(form?.categoryId);
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [hasSkus, setHasSkus] = useState(false);
  const [newImage, setNewImage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await getAdminProduct(productId, controller.signal);
        if (controller.signal.aborted) return;
        const product = data.product;
        setForm({ name: product.name, brand: product.brand || "", model: product.model || "",
          description: product.description || "", categoryId: String(product.categoryId),
          mrp: String(product.mrp ?? product.price), price: String(product.price), stock: String(product.stock), lowStockThreshold:String(product.lowStockThreshold ?? 5), gstPercent:product.gstPercent==null?"":String(product.gstPercent), pricingMode: "price" });
        setSpecifications(product.specifications || {});
        setImageUrl(product.imageUrl || "");
        setFeatured(Boolean(product.isFeatured));
        const result = await getVariants(productId, true);
        if (!controller.signal.aborted) setHasSkus((result.variants || []).length > 0);
      } catch (failure) {
        if (isAuthenticationError(failure)) { navigate("/login", { replace: true }); return; }
        if (failure.name !== "AbortError") setError(failure.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, [productId, navigate]);

  function handleChange(event) {
    const { name, value } = event.target;
    if (name === "categoryId") setSpecifications({});
    setForm((old) => ["price", "mrp"].includes(name) ? updatePricingDraft(old, name, value) : { ...old, [name]: value });
  }

  async function saveDetails(event) {
    event.preventDefault();
    if (!form.categoryId) { setError("Select a valid category or subcategory."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      await updateProduct(productId, { ...form, stock: Number(form.stock), specifications });
      setMessage("Product details saved. You can continue with SKUs or gallery in the tabs above.");
      onSaved?.();
    } catch (failure) {
      if (isAuthenticationError(failure)) { navigate("/login", { replace: true }); return; }
      setError(failure.message);
    } finally { setSaving(false); }
  }

  async function uploadCover(event) {
    event.preventDefault();
    if (!newImage) return;
    const data = new FormData(); data.append("image", newImage);
    setUploading(true); setError(""); setMessage("");
    try {
      const result = await updateProductImage(productId, data);
      setImageUrl(result.imageUrl); setNewImage(null); imageFormRef.current?.reset();
      setMessage("Cover replaced successfully."); onSaved?.();
    } catch (failure) { setError(failure.message); }
    finally { setUploading(false); }
  }

  if (loading) return <div className="admin-empty">Loading product…</div>;
  if (!form) return <p className="admin-alert" role="alert">{error || "Product not found."}</p>;

  return <div className="nx-product-editor">
    <nav className="nx-editor-tabs" aria-label="Product editor sections">
      {tabs.map((item, index) => <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""}
        onClick={() => { setTab(item.id); setError(""); setMessage(""); }} aria-current={tab === item.id ? "step" : undefined}>
        <span className="nx-tab-index">0{index + 1}</span><span><strong>{item.label}</strong><small>{item.description}</small></span>
      </button>)}
    </nav>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {message && <p className="admin-form-message" role="status">{message}</p>}
    {tab === "details" && <div className="nx-editor-detail-grid">
      <section className="admin-panel admin-form-panel">
        <div className="admin-panel-heading"><div><h2>Product information</h2><p>Changes are saved independently of gallery and variants.</p></div></div>
        <form className="admin-form" onSubmit={saveDetails}>
          <label>Name<input name="name" value={form.name} onChange={handleChange} required /></label>
          <div className="admin-form-grid two-column">
            <label>Brand<input name="brand" value={form.brand} onChange={handleChange} maxLength={80} /></label>
            <label>Model<input name="model" value={form.model} onChange={handleChange} maxLength={120} /></label>
          </div>
          <label>Description<textarea name="description" rows={4} value={form.description} onChange={handleChange} required /></label>
          <div className="admin-form-grid two-column">
            <CategoryPicker categories={categories} value={form.categoryId} disabled={categoriesLoading || !categories.length}
              onChange={categoryId => { setSpecifications({}); setForm(old => ({ ...old, categoryId })); }} />
            {!hasSkus && <>
              <label>Simple product stock<input name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /></label>
              <label>Low-stock alert threshold<input name="lowStockThreshold" type="number" min="0" max="1000000" step="1" value={form.lowStockThreshold} onChange={handleChange} required /><small>Warn the admin at or below this quantity.</small></label>
            </>}
          </div>
          {hasSkus ? <p className="nx22-sku-notice"><strong>SKU-controlled product:</strong> Selling price, MRP and stock are managed per SKU in the SKUs tab. Parent values are retained only for legacy compatibility.</p>
            : <VariantPriceFields row={form} disabled={saving} onFieldChange={(key, value) => setForm(old => updatePricingDraft(old, key, value))}/>}
          <label className="nx25-gst-field">GST rate for this product (%)<input name="gstPercent" type="number" min="0" max="40" step="0.01" value={form.gstPercent ?? ""} onChange={handleChange} placeholder="Use store default"/><small>Leave empty for the store default rate.</small></label>
          <ProductSpecificationFields definition={definition.definition} specifications={specifications}
            onChange={(key,value) => setSpecifications(old => ({ ...old, [key]: value }))} loading={definition.loading}/>
          {(categoriesError || definition.error) && <p className="admin-alert" role="alert">{categoriesError || definition.error}</p>}
          <div className="nx-sticky-actions"><button className="admin-primary-action" type="submit" disabled={saving}>{saving ? "Saving…" : "Save product details"}</button></div>
        </form>
      </section>
      <aside className="admin-panel nx-cover-panel">
        <h2>Catalogue cover</h2><p>This is the image customers see on product cards. The Gallery tab controls all media.</p>
        <div className="nx-cover-preview">{imageUrl ? <img src={apiAssetUrl(imageUrl)} alt="Current product cover" /> : <span>No image</span>}</div>
        <form className="admin-form" onSubmit={uploadCover} ref={imageFormRef}>
          <label>Replace cover image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => setNewImage(e.target.files?.[0] || null)} /></label>
          <button type="submit" className="admin-secondary-action" disabled={uploading || !newImage}>{uploading ? "Uploading…" : "Replace cover"}</button>
        </form>
        <button className="nx-text-action" type="button" onClick={() => setTab("gallery")}>Manage all gallery images →</button>
      </aside>
    </div>}
    {tab === "variants" && <ProductVariantsManager productId={productId} />}
    {tab === "gallery" && <ProductMediaManager productId={productId} initialFeatured={featured} coverUrl={imageUrl} onCoverChanged={setImageUrl} />}
  </div>;
}
