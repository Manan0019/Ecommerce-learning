import { markChangesSaved } from "../common/savedFormState.js";
import { Button, Card, Checkbox, FormField, TextField, Textarea, Tabs, Tab } from "../ui/index";
import FileUploadField from "./FileUploadField";
import { useEffect, useRef, useState } from "react";
import UiIcon from "../common/UiIcon";
import { useNavigate } from "react-router-dom";
import { apiAssetUrl, isAuthenticationError } from "../../services/apiClient";
import { getAdminProduct, updateProduct, updateProductImage, setSaleBadge } from "../../services/productService";
import { useActiveCategories } from "../../hooks/useActiveCategories";
import { useSpecificationDefinition } from "../../hooks/useSpecificationDefinition";
import ProductSpecificationFields from "./ProductSpecificationFields";
import ProductMediaManager from "./ProductMediaManager";
import ProductVariantsManager from "./ProductVariantsManager";
import VariantPriceFields from "./VariantPriceFields";
import CategoryPicker from "./CategoryPicker";
import ProductBuyingGuideEditor from "./ProductBuyingGuideEditor";
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
  const [buyingGuide, setBuyingGuide] = useState({});
  const definition = useSpecificationDefinition(form?.categoryId);
  const [imageUrl, setImageUrl] = useState("");
  const [featured, setFeatured] = useState(false);
  const [hasSkus, setHasSkus] = useState(false);
  const [saleEnabled, setSaleEnabled] = useState(false);
  const [saleSaving, setSaleSaving] = useState(false);
  const [saleMessage, setSaleMessage] = useState("");
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
          description: product.description || "", shortDescription:product.shortDescription || "", categoryId: String(product.categoryId),
          mrp: String(product.mrp ?? product.price), price: String(product.price), stock: String(product.stock), lowStockThreshold:String(product.lowStockThreshold ?? 5), gstPercent:product.gstPercent==null?"":String(product.gstPercent), pricingMode: "price" });
        setSpecifications(product.specifications || {});
        setBuyingGuide(product.buyingGuide || {});
        setImageUrl(product.imageUrl || "");
        setFeatured(Boolean(product.isFeatured));
        setSaleEnabled(Boolean(product.showSaleBadge));
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
      await updateProduct(productId, { ...form, stock: Number(form.stock), specifications, buyingGuide });
      markChangesSaved();
      setMessage("Product details saved. You can continue with SKUs or gallery in the tabs above.");
      onSaved?.();
    } catch (failure) {
      if (isAuthenticationError(failure)) { navigate("/login", { replace: true }); return; }
      setError(failure.message);
    } finally { setSaving(false); }
  }

  async function updateSale(enabled) {
    setSaleSaving(true); setSaleMessage(""); setError("");
    try {
      const result = await setSaleBadge(productId, enabled);
      setSaleEnabled(Boolean(result.showSaleBadge));
      setSaleMessage(result.showSaleBadge ? "Sale badge enabled for discounted configurations." : "Sale badge disabled on the storefront.");
      onSaved?.();
    } catch (failure) {
      setError(failure.message || "Could not change Sale visibility.");
    } finally { setSaleSaving(false); }
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
    <Tabs className="nx-editor-tabs" label="Product editor sections">
      {tabs.map((item, index) => <Tab key={item.id} selected={tab === item.id} id={`product-${productId}-${item.id}-tab`} aria-controls={`product-${productId}-panel`}
        onClick={() => { setTab(item.id); setError(""); setMessage(""); }}>
        <span className="nx-tab-index">0{index + 1}</span><span><strong>{item.label}</strong><small>{item.description}</small></span>
      </Tab>)}
    </Tabs>
    {error && <p className="admin-alert" role="alert">{error}</p>}
    {message && <p className="admin-form-message" role="status">{message}</p>}
    <div role="tabpanel" id={`product-${productId}-panel`} aria-labelledby={`product-${productId}-${tab}-tab`}>
    {tab === "details" && <div className="nx-editor-detail-grid">
      <Card as="section" className="admin-panel admin-form-panel">
        <div className="admin-panel-heading"><div><h2>Product information</h2><p>Changes are saved independently of gallery and variants.</p></div></div>
        <form className="admin-form" onSubmit={saveDetails}>
          <FormField><span className="nx34-field-label">Product name <b className="nx34-required" aria-hidden="true">*</b></span><TextField name="name" value={form.name} onChange={handleChange} required /></FormField>
          <div className="admin-form-grid two-column">
            <FormField>Brand<TextField name="brand" value={form.brand} onChange={handleChange} maxLength={80} /></FormField>
            <FormField>Model<TextField name="model" value={form.model} onChange={handleChange} maxLength={120} /></FormField>
          </div>
          <FormField><span className="nx34-field-label">Short description</span><Textarea name="shortDescription" rows={2} maxLength={320} value={form.shortDescription} onChange={handleChange} placeholder="The quick product summary customers see first" /><small>Up to 320 characters.</small></FormField>
          <FormField><span className="nx34-field-label">Full description <b className="nx34-required" aria-hidden="true">*</b></span><Textarea name="description" rows={4} value={form.description} onChange={handleChange} required /></FormField>
          <div className="admin-form-grid two-column">
            <CategoryPicker categories={categories} value={form.categoryId} disabled={categoriesLoading || !categories.length}
              onChange={categoryId => { setSpecifications({}); setForm(old => ({ ...old, categoryId })); }} />
            {!hasSkus && <>
              <FormField><span className="nx34-field-label">Simple product stock <b className="nx34-required" aria-hidden="true">*</b></span><TextField name="stock" type="number" min="0" step="1" value={form.stock} onChange={handleChange} required /></FormField>
              <FormField><span className="nx34-field-label">Low-stock alert threshold <b className="nx34-required" aria-hidden="true">*</b></span><TextField name="lowStockThreshold" type="number" min="0" max="1000000" step="1" value={form.lowStockThreshold} onChange={handleChange} required /><small>Warn the admin at or below this quantity.</small></FormField>
            </>}
          </div>
          {hasSkus ? <p className="nx22-sku-notice"><strong>SKU-controlled product:</strong> Selling price, MRP and stock are managed per SKU in the SKUs tab. Parent values are retained only for legacy compatibility.</p>
            : <VariantPriceFields row={form} disabled={saving} onFieldChange={(key, value) => setForm(old => updatePricingDraft(old, key, value))}/>}
          <section className={`nx70-sale-editor ${saleEnabled ? "is-enabled" : "is-disabled"}`} aria-label="Sale badge setting">
            <div className="nx70-sale-editor-heading"><span className="nx70-sale-tag">SALE</span><div><strong>Storefront Sale label</strong><small>Shown only when Sale is enabled and the selected product or SKU has a real discount (selling price below MRP).</small></div><span className="nx70-sale-state" role="status">{saleEnabled ? "Enabled" : "Disabled"}</span></div>
            <FormField inline className="nx70-sale-toggle"><Checkbox type="checkbox" checked={saleEnabled} disabled={saleSaving || saving} onChange={e => updateSale(e.target.checked)}/><span>{saleEnabled ? "Sale visibility is on" : "Show a Sale badge on discounted products"}</span></FormField>
            {saleMessage && <small className="nx70-sale-message" role="status">{saleMessage}</small>}
          </section>
          <FormField className="nx25-gst-field">GST rate for this product (%)<TextField name="gstPercent" type="number" min="0" max="40" step="0.01" value={form.gstPercent ?? ""} onChange={handleChange} placeholder="Use store default"/><small>Leave empty for the store default rate.</small></FormField>
          <ProductSpecificationFields definition={definition.definition} specifications={specifications}
            onChange={(key,value) => setSpecifications(old => ({ ...old, [key]: value }))} loading={definition.loading}/>
          {(categoriesError || definition.error) && <p className="admin-alert" role="alert">{categoriesError || definition.error}</p>}
          <ProductBuyingGuideEditor value={buyingGuide} onChange={setBuyingGuide} categoryName={categories.find(category=>String(category.id)===String(form.categoryId))?.name||""}/>
          <div className="nx-sticky-actions"><Button variant="primary"  type="submit" disabled={saving}>{saving ? "Saving…" : "Save product details"}</Button></div>
        </form>
      </Card>
      <aside className="admin-panel nx-cover-panel">
        <h2>Catalogue cover</h2><p>This is the image customers see on product cards. The Gallery tab controls all media.</p>
        <div className="nx-cover-preview">{imageUrl ? <img src={apiAssetUrl(imageUrl)} alt="Current product cover" /> : <span>No image</span>}</div>
        <form className="admin-form" onSubmit={uploadCover} ref={imageFormRef}>
          <FileUploadField label="Replace cover image" selection={newImage?.name||''} onChange={e => setNewImage(e.target.files?.[0] || null)}/>
          <Button variant="primary" type="submit"  disabled={uploading || !newImage}>{uploading ? "Uploading…" : "Replace cover"}</Button>
        </form>
        <Button variant="ghost" className="nx-text-action" type="button" onClick={() => setTab("gallery")}>Manage all gallery images <UiIcon name="right" size={17}/></Button>
      </aside>
    </div>}
    {tab === "variants" && <ProductVariantsManager productId={productId} />}
    {tab === "gallery" && <ProductMediaManager productId={productId} initialFeatured={featured} coverUrl={imageUrl} onCoverChanged={setImageUrl} />}
    </div>
  </div>;
}
