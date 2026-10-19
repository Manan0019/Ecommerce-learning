import WishlistButton from "../../components/customer/WishlistButton";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import ProductMediaGallery from "../../components/customer/ProductMediaGallery";
import ProductVariantSelector from "../../components/customer/ProductVariantSelector";
import RelatedProducts from "../../components/customer/RelatedProducts";
import { getProduct, getProductMedia } from "../../services/productService";
import { getVariants } from "../../services/variantService";
import { useCart } from "../../hooks/useCart";

export default function ProductDetails() {
  const { id } = useParams();
  return <ProductDetailsContent key={id} id={id} />;
}

function ProductDetailsContent({ id }) {
  const { addToCart } = useCart();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedVariantId = searchParams.get("variant");
  const initialVariantRef = useRef(requestedVariantId);
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
        const data = await getProduct(id, controller.signal);
        setProduct(data.product);
        const [result,mediaResult]=await Promise.all([getVariants(id),getProductMedia(id)]);
        if (!controller.signal.aborted) { setVariants(result.variants); setMedia(mediaResult.media||[]); setVariantId(result.variants.find(v => String(v.id) === String(initialVariantRef.current))?.id || result.variants.find(v => v.stock > 0)?.id || result.variants[0]?.id || ""); }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProduct();
    return () => controller.abort();
  }, [id]);

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
  const canBuy=effectiveStock>0 && (!variants.length || Boolean(selectedVariant?.isActive));

  return <CustomerLayout mainClassName="product-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link><span aria-hidden="true">/</span><Link to="/products">Shop</Link>
        {product && <><span aria-hidden="true">/</span><span>{product.name}</span></>}
      </nav>
      {loading && <div className="detail-skeleton" aria-label="Loading product" />}
      {error && <p role="alert" className="store-alert">{error}</p>}
      {product && <article className="product-detail">
        <div className="product-detail-media">
          <ProductMediaGallery key={selectedVariant?.attributes?.color ?? selectedVariant?.attributes?.colour ?? variantId} product={product} variantId={selectedVariant?.id || null} variantAttributes={selectedVariant?.attributes||{}} items={media} />
        </div>
        <div className="product-detail-copy">
          <Link className="eyebrow detail-category-link" to={`/categories/${product.categorySlug}`}>{product.category}</Link>
          {(product.brand || product.model) && <p className="detail-model">{[product.brand, product.model].filter(Boolean).join(" · ")}</p>}
          <h1 aria-live="polite">{displayTitle}</h1>
          <div className="detail-price-block" aria-live="polite">
            {discount>0&&<strong className="detail-discount">↓{discount}%</strong>}
            {discount>0&&<s className="detail-mrp">₹{Number(effectiveMrp).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</s>}
            <strong className="detail-price">₹{Number(effectivePrice).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}</strong>
          </div>
          <details className="nx17-description"><summary>Product information</summary><p className="detail-description">{product.description}</p></details>
          <div className={`stock-status ${canBuy ? "in-stock" : "out-of-stock"}`}>
            <span />{canBuy ? `${effectiveStock} available` : "Currently unavailable"}
          </div>
          <ProductVariantSelector variants={variants} selectedVariant={selectedVariant} media={media}
            coverUrl={product.imageUrl} onSelect={selected=>{
              setVariantId(selected); setQuantity(1); setAdded(false);
              setSearchParams(previous => { const next = new URLSearchParams(previous); next.set("variant", selected); return next; }, {replace: true});
            }}/>
          <WishlistButton productId={product.id} />
          <div className="purchase-panel">
            <label htmlFor="product-quantity">Quantity</label>
            <div className="purchase-row">
              <div className="quantity-picker">
                <button type="button" aria-label="Decrease quantity" disabled={quantity <= 1}
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}>−</button>
                <input id="product-quantity" type="number" min="1" max={Math.min(99, effectiveStock)}
                  value={quantity} disabled={!canBuy}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (Number.isInteger(next) && next >= 1 && next <= Math.min(99, effectiveStock)) setQuantity(next);
                  }} />
                <button type="button" aria-label="Increase quantity"
                  disabled={effectiveStock === 0 || quantity >= Math.min(99, effectiveStock)}
                  onClick={() => setQuantity((value) => Math.min(effectiveStock, 99, value + 1))}>+</button>
              </div>
              <button className="button button-primary add-cart-button" type="button"
                disabled={!canBuy} onClick={addProduct}>
                {!canBuy ? "Out of stock" : "Add to cart"}
              </button>
            </div>
            {added && <p className="added-message" role="status">Added to your cart. <Link to="/cart">View cart →</Link></p>}
          </div>
          <ul className="product-assurances">
            <li><span>✓</span> Secure customer session</li>
            <li><span>✓</span> Live price and stock</li>
            <li><span>✓</span> Carefully selected quality</li>
          </ul>
        </div>
      </article>}
      {product?.specificationDisplay?.groups?.length > 0 && <section className="technical-specifications" aria-labelledby="technical-specifications-heading">
        <div className="section-heading"><div><p className="eyebrow">Product data</p><h2 id="technical-specifications-heading">Product specifications</h2></div></div>
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
      </section>}
      {product && <RelatedProducts productId={product.id} />}
  </CustomerLayout>;
}
