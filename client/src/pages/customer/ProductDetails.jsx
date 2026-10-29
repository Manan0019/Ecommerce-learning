import { Button, FormField, TextField } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { rememberProduct } from "../../services/recentlyViewed";
import UiIcon from "../../components/common/UiIcon";
import AdminProductEditDialog from "../../components/admin/AdminProductEditDialog";
import WishlistButton from "../../components/customer/WishlistButton";
import ProductReviews from "../../components/customer/ProductReviews";
import ProductBuyingGuide from "../../components/customer/ProductBuyingGuide";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import ProductMediaGallery from "../../components/customer/ProductMediaGallery";
import ProductVariantSelector from "../../components/customer/ProductVariantSelector";
import RelatedProducts from "../../components/customer/RelatedProducts";
import PromotionCarousel from "../../components/customer/PromotionCarousel";
import { getProduct, getProductMedia, getAdminProduct } from "../../services/productService";
import { getVariants } from "../../services/variantService";
import { apiRequest } from "../../services/apiClient";
import { useCart } from "../../hooks/useCart";

export default function ProductDetails({adminPreview=false}) {
  const { id } = useParams();
  return <ProductDetailsContent key={id} id={id} adminPreview={adminPreview} />;
}

function ProductDetailsContent({ id,adminPreview=false }) {
 const liveRevision=useRealtimeRevision(["catalog","inventory"]);
  const { addToCart } = useCart();
  const location = useLocation();
  const returnTo = /^\/admin\/(?:products|inventory|featured|dashboard|orders)(?:\/?|\?.*)$/.test(location.state?.from||"")
    ? location.state.from : "/admin/products";
  const [editTab, setEditTab] = useState(null);
  const [taxMode,setTaxMode] = useState(null);
  useEffect(()=>{if(adminPreview)return undefined;const controller=new AbortController();
    apiRequest('/api/checkout/pricing-policy',{signal:controller.signal}).then(data=>{if(!controller.signal.aborted)setTaxMode(data.taxPricingMode);}).catch(()=>{});
    return ()=>controller.abort();},[adminPreview]);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariantId = searchParams.get("variant");
  const initialVariantRef = useRef(requestedVariantId);
  const requestedEditTab=searchParams.get("edit");
  const activeEditTab=editTab || (adminPreview && ["details", "variants", "gallery"].includes(requestedEditTab) ? requestedEditTab : null);
  function closeEditor() {
    setEditTab(null);
    if (searchParams.has("edit")) {
      setSearchParams(previous => { const next = new URLSearchParams(previous); next.delete("edit"); return next; }, { replace:true });
    }
    setPreviewVersion(old => old + 1); // Reload details, SKUs and gallery after modal edits.
  }
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [variants, setVariants] = useState([]);
  const [media, setMedia] = useState([]);
  const [variantId, setVariantId] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProduct() {
      try {
        const data = await (adminPreview?getAdminProduct(id, controller.signal):getProduct(id, controller.signal));
        if (!controller.signal.aborted) { setProduct(data.product); if (!adminPreview) rememberProduct(data.product); }
        const [result,mediaResult]=await Promise.all([getVariants(id,adminPreview),getProductMedia(id,adminPreview)]);
        if (!controller.signal.aborted) { setVariants(result.variants); setMedia(mediaResult.media||[]); setVariantId(result.variants.find(v => String(v.id) === String(initialVariantRef.current))?.id || result.variants.find(v => v.stock > 0)?.id || result.variants[0]?.id || ""); }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProduct();
    return () => controller.abort();
  }, [id,adminPreview,previewVersion,liveRevision]);

  function addProduct() {
    if (variants.length && !selectedVariant) return;
    addToCart(product.id, quantity, selectedVariant?.id || null);
    setAdded(true);
  }

  const selectedVariant=variants.find(v => String(v.id) === String(requestedVariantId)) || variants.find(v=>String(v.id)===String(variantId));
  const displayTitle=selectedVariant?.customTitle?.trim() || (selectedVariant && Object.keys(selectedVariant.attributes || {}).length ? `${product?.name || ""} — ${Object.values(selectedVariant.attributes).join(" / ")}` : product?.name);
  const effectivePrice=selectedVariant?.price ?? product?.price;
  const effectiveMrp=selectedVariant?.mrp ?? effectivePrice;
  const discount=Number(effectiveMrp)>Number(effectivePrice)? Math.round((Number(effectiveMrp)-Number(effectivePrice))/Number(effectiveMrp)*100):0;
  const effectiveStock=selectedVariant?.stock ?? product?.stock ?? 0;
  const isAvailable=product?.isActive!==false && effectiveStock>0 && (!variants.length || Boolean(selectedVariant?.isActive));
  const canBuy=!adminPreview && isAvailable;

  return <CustomerLayout mainClassName="product-page">
      {adminPreview&&<section className="nx50-preview-toolbar" aria-label="Admin product preview controls">
        <div className="nx50-preview-intro"><span className="nx50-preview-kicker">ADMIN PRODUCT PREVIEW</span><strong>{product?.name || "Loading product"}</strong><small>Review the product page before editing. Checkout is unavailable in preview.</small></div>
        <div className="nx50-preview-actions">
          <Link className="nx50-back-link" to={returnTo}><UiIcon name="left" size={16}/> Back</Link>
          {product?.isActive&&<Link className="nx50-live-link" to={`/products/${id}`}><UiIcon name="chevron-right" size={16}/> Storefront</Link>}
          <Button variant="secondary" className="nx50-preview-edit" type="button" disabled={!product} onClick={()=>setEditTab("details")}>
            <UiIcon name="edit" size={16}/> Edit product</Button>
        </div>
      </section>}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        {adminPreview ? <><Link to="/admin/dashboard">Admin</Link><span aria-hidden="true">/</span><Link to="/admin/products">Products</Link></>
          : <><Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/products">Shop</Link></>}
        {product && <><span aria-hidden="true">/</span><span>{product.name}</span></>}
      </nav>
      {loading && <div className="detail-skeleton" aria-label="Loading product" />}
      {error && <section className="nx33-detail-error" role="alert"><h1>We couldn’t load this product</h1><p>{error}</p><Button as={Link} variant="primary"  to="/products">Browse products</Button></section>}
      {product && <article className="product-detail">
        <div className="product-detail-media">
          <ProductMediaGallery key={selectedVariant?.attributes?.color ?? selectedVariant?.attributes?.colour ?? variantId} product={product} variantId={selectedVariant?.id || null} variantAttributes={selectedVariant?.attributes||{}} items={media} />
        </div>
        <div className="product-detail-copy">
          <Link className="eyebrow detail-category-link" to={`/categories/${product.categorySlug}`}>{product.category}</Link>
          {(product.brand || product.model) && <p className="detail-model">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
          <h1 aria-live="polite">{displayTitle}</h1>
          {product.showSaleBadge && discount > 0 && <span className="nx70-detail-sale-label" aria-label="On sale">SALE</span>}
          <div className="detail-price-block" aria-live="polite">
            {discount>0&&<strong className="detail-discount">−{discount}%</strong>}
            {discount>0&&<s className="detail-mrp">₹{Number(effectiveMrp).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</s>}
            <strong className="detail-price">₹{Number(effectivePrice).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
          </div>
          {!adminPreview && taxMode==='exclusive' && <p className="nx57-gst-note">Base price shown · Applicable GST, shipping and any additional charges are calculated before payment at checkout.</p>}
          {(product.shortDescription || product.description) && <p className="nx58-product-summary">{product.shortDescription || product.description.slice(0, 210)}</p>}
          <div className={`stock-status ${isAvailable ? "in-stock" : "out-of-stock"}`}>
            <span />{isAvailable ? `${effectiveStock} available` : "Currently unavailable"}
          </div>
          <ProductVariantSelector variants={variants} selectedVariant={selectedVariant} media={media}
            coverUrl={product.imageUrl} onSelect={selected=>{
              setVariantId(selected); setQuantity(1); setAdded(false);
              setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("variant", selected); return next; }, {replace: true});
            }}/>
          {!adminPreview&&<><WishlistButton productId={product.id} />
          <div className="purchase-panel">
            <FormField htmlFor="product-quantity">Quantity</FormField>
            <div className="purchase-row">
              <div className="quantity-picker">
                <Button variant="secondary" type="button" aria-label="Decrease quantity" disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</Button>
                <TextField id="product-quantity" type="number" min="1" max={Math.min(99, effectiveStock)}
                  value={quantity} disabled={!canBuy}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isInteger(next) && next >= 1 && next <= Math.min(99, effectiveStock)) setQuantity(next);
                  }} />
                <Button variant="secondary" type="button" aria-label="Increase quantity"
                  disabled={effectiveStock === 0 || quantity >= Math.min(99, effectiveStock)}
                  onClick={() => setQuantity((value) => Math.min(effectiveStock, 99, value + 1))}>+</Button>
              </div>
              <Button variant="primary" className="add-cart-button" type="button"
                disabled={!canBuy} onClick={addProduct}>
                {!canBuy ? "Out of stock" : "Add to cart"}
              </Button>
            </div>
            {added && <p className="added-message" role="status">Added to your cart. <Link to="/cart">View cart</Link></p>}
          </div>
</>}
        </div>
      </article>}
      {product?.description && <section className="nx58-product-description" aria-labelledby="nx58-description-title">
        <div className="section-heading"><div><p className="eyebrow">The details</p><h2 id="nx58-description-title">About this product</h2></div></div>
        <p>{product.description}</p>
      </section>}
      {product && <PromotionCarousel position="product" product={product.id} />}
      {product?.specificationDisplay?.groups?.length > 0 && <details className="technical-specifications nx58-specifications">
        <summary><span><small>PRODUCT DETAILS</small><strong>Specifications & technical details</strong></span><UiIcon name="chevron-down" size={21}/></summary>
        <div className="specification-groups">
          {product.specificationDisplay.groups.map((group) => <article key={group.label}>
            <h3>{group.label}</h3>
            <dl>{group.items.map((item) => <div key={item.key}>
              <dt>{item.label}</dt>
              <dd>{Array.isArray(item.value) ? item.value.join(", ")
                : item.type === "boolean" ? (item.value ? "Yes" : "No")
                  : `${item.value}${item.unit ? ` ${item.unit}` : ""}`}</dd>
            </div>)}</dl>
          </article>)}
        </div>
      </details>}
      {product && <ProductBuyingGuide guide={product.buyingGuide} />}
      {product && <ProductReviews productId={product.id} adminPreview={adminPreview} />}
      {product && <RelatedProducts productId={product.id} />}
      {adminPreview&&activeEditTab&&<AdminProductEditDialog productId={id} name={product?.name} initialTab={activeEditTab}
        onClose={closeEditor} onSaved={()=>setPreviewVersion(version=>version+1)}/>}
  </CustomerLayout>;
}
