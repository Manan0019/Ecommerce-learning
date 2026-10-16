import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { apiAssetUrl } from "../../services/apiClient";
import { quoteCart } from "../../services/cartService";
import { useCart } from "../../hooks/useCart";

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadQuote() {
      setLoading(true);
      setError("");
      setQuote(null);
      try {
        const data = await quoteCart(items, controller.signal);
        if (!controller.signal.aborted) setQuote(data);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadQuote();
    return () => controller.abort();
  }, [items]);

  return <CustomerLayout mainClassName="cart-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">Your selection</p><h1>Shopping cart</h1>
      </header>
      {loading && <p className="loading-message">Checking current prices and availability…</p>}
      {error && <p role="alert" className="store-alert">{error}</p>}
      {!loading && !error && items.length === 0 && <div className="store-empty empty-cart">
        <h2>Your cart is waiting</h2><p>Explore the collection and add something you love.</p>
        <Link className="button button-primary" to="/products">Start shopping</Link>
      </div>}
      {!loading && !error && quote && items.length > 0 && <div className="cart-layout">
        <section className="cart-items" aria-label="Cart items">
          {quote.items.map((item) => <article className="cart-item" key={item.productId}>
            <div className="cart-item-image">
              {item.imageUrl
                ? <img src={apiAssetUrl(item.imageUrl)} alt={item.name || "Product"} />
                : <span>No image</span>}
            </div>
            <div className="cart-item-copy">
              <div><h2>{item.name || "Unavailable product"}</h2>
                {item.unitPrice && <p>₹{item.unitPrice} each</p>}</div>
              {!item.available && <p className="cart-warning">{item.reason || "Unavailable"}</p>}
              {item.availableStock !== undefined && <p className="stock-copy">{item.availableStock} available</p>}
              <div className="cart-item-actions">
                <div className="quantity-picker compact-picker">
                  <button type="button" aria-label={`Decrease ${item.name || "item"} quantity`}
                    onClick={() => item.quantity === 1 ? removeFromCart(item.productId) : updateQuantity(item.productId, item.quantity - 1)}>−</button>
                  <span aria-live="polite">{item.quantity}</span>
                  <button type="button" aria-label={`Increase ${item.name || "item"} quantity`}
                    disabled={!item.available || item.quantity >= 99 || item.quantity >= item.availableStock}
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
                </div>
                <button className="remove-button" type="button" onClick={() => removeFromCart(item.productId)}>Remove</button>
              </div>
            </div>
            {item.lineTotal && <strong className="line-total">₹{item.lineTotal}</strong>}
          </article>)}
        </section>
        <aside className="cart-summary">
          <p className="eyebrow">Order summary</p><h2>Summary</h2>
          <div><span>Subtotal</span><strong>₹{quote.subtotal}</strong></div>
          <div><span>Shipping</span><span>Calculated later</span></div>
          {!quote.valid && <p className="cart-warning">Update unavailable items before checkout.</p>}
          <button className="button button-primary" type="button" disabled>Checkout coming soon</button>
          <button className="clear-cart-button" type="button" onClick={clearCart}>Clear cart</button>
          <Link className="text-link" to="/products">← Continue shopping</Link>
        </aside>
      </div>}
  </CustomerLayout>;
}
