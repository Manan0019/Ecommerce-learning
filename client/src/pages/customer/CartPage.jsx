import { EmptyState, EntityTitle, Button, IconButton, QuantityStepper } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import UiIcon from "../../components/common/UiIcon";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { apiAssetUrl } from "../../services/apiClient";
import { quoteCart } from "../../services/cartService";
import { useCart } from "../../hooks/useCart";

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
 const liveRevision=useRealtimeRevision(["catalog","inventory"]);
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function refreshQuote() {
      setLoading(true);
      setError("");
      setQuote(null);
      try {
        const result = await quoteCart(items, controller.signal);
        if (!controller.signal.aborted) setQuote(result);
      } catch (err) {
        if (!controller.signal.aborted) setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    refreshQuote();
    return () => controller.abort();
  }, [items,liveRevision]);

  return <CustomerLayout mainClassName="cart-page">
    <header className="page-hero compact-hero"><p className="eyebrow">Your selection</p><h1>Shopping cart</h1></header>
    {loading && <p role="status" className="loading-message">Checking live product prices and stock…</p>}
    {error && <p role="alert" className="store-alert">{error} Please try refreshing the page.</p>}
    {!loading && !error && items.length === 0 && <EmptyState icon="bag" title="Your cart is waiting" description="Explore the collection and add something you love." action={<Button as={Link} variant="primary" to="/products">Start shopping</Button>}/>}
    {!loading && !error && quote && items.length > 0 && <div className="cart-layout">
      <section className="cart-items" aria-label="Cart items">
        {quote.items.map(item => <article className="cart-item" key={`${item.productId}:${item.variantId ?? ""}`}>
          <div className="cart-item-image">{item.imageUrl
            ? <img src={apiAssetUrl(item.imageUrl)} alt={item.name || "Product"} />
            : <span>No image</span>}</div>
          <div className="cart-item-copy">
            <EntityTitle as="h2" size="lg">{item.name || "Unavailable product"}</EntityTitle>
            {item.sku && <p className="stock-copy">SKU: {item.sku}</p>}
            {item.variantId && <p className="stock-copy">{Object.entries(item.attributes || {}).map(([k,v]) => `${k}: ${v}`).join(" · ")}</p>}
            {item.unitPrice && <p>₹{item.unitPrice} each</p>}
            {!item.available && <p role="alert" className="cart-warning">{item.reason || "Unavailable"}</p>}
            {item.availableStock !== undefined && <p className="stock-copy">{item.availableStock} available</p>}
            <div className="cart-item-actions">
              <QuantityStepper compact value={item.quantity} label={`${item.name || 'Item'} quantity`}
                onChange={next => updateQuantity(item.productId,next,item.variantId)}
                min={1} max={Math.max(1, Math.min(99, item.availableStock ?? 99))} increaseDisabled={!item.available}
                onMinDecrement={() => removeFromCart(item.productId,item.variantId)} />
              <IconButton variant="danger" type="button" className="remove-button" title="Remove from cart" aria-label={`Remove ${item.name} from cart`} onClick={() => removeFromCart(item.productId,item.variantId)}><UiIcon name="trash" size={18}/></IconButton>
              {!item.available && item.productId && <Link className="text-link" to={`/products/${item.productId}`}>Review product options</Link>}
            </div>
          </div>
          {item.lineTotal && <strong className="line-total">₹{item.lineTotal}</strong>}
        </article>)}
      </section>
      <aside className="cart-summary" aria-label="Cart price summary">
        <p className="eyebrow">Price estimate</p><h2>Cart summary</h2>
        <div><span>All listed items</span><strong>₹{quote.subtotal}</strong></div>
        <div><span>Available items</span><strong>₹{quote.availableSubtotal}</strong></div>
        {quote.unavailableCount > 0 && <p role="alert" className="cart-warning">{quote.unavailableCount} unavailable line(s) are excluded from the available-items total. Remove or update them.</p>}
        <div><span>Shipping</span><span>Calculated at checkout</span></div>
        <p className="stock-copy">Your final shipping and GST are calculated at checkout. Choose Cash on Delivery or Razorpay after reviewing the total.</p>
        <Button as={Link} variant="primary" className={`button button-primary nx-checkout-cta ${!quote.valid ? "nx-link-disabled" : ""}`} aria-disabled={!quote.valid} tabIndex={quote.valid ? 0 : -1} onClick={e => {if(!quote.valid)e.preventDefault()}} to="/checkout">Continue to checkout</Button>
        <Button variant="secondary" className="clear-cart-button" type="button" onClick={clearCart}>Clear cart</Button>
        <Link className="text-link" to="/products"><UiIcon name="left" size={17}/> Continue shopping</Link>
      </aside>
    </div>}
  </CustomerLayout>;
}
