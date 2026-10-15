import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import StoreHeader from "../components/StoreHeader";
const API = "http://localhost:4000";
export default function CartPage() {
  const { items, updateQuantity, removeFromCart, clearCart } = useCart();
  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true); setError(""); setQuote(null);
      try {
        const response = await fetch(`${API}/api/cart/quote`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }), signal: controller.signal
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        if (!controller.signal.aborted) setQuote(data);
      } catch (err) { if (err.name !== "AbortError") setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return () => controller.abort();
  }, [items]);
  return <main className="store-container"><StoreHeader />
    <h1>Shopping Cart</h1><p><Link to="/products">← Continue shopping</Link></p>
    {loading && <p>Checking current prices and stock...</p>}
    {error && <p role="alert" className="store-alert">{error}</p>}
    {!loading && !error && items.length === 0 && <div className="store-empty">Your cart is empty.</div>}
    {!loading && !error && quote && items.length > 0 && <>
      <div className="cart-items">{quote.items.map(item => <article className="cart-item" key={item.productId}>
        {item.imageUrl && <img src={`${API}${item.imageUrl}`} alt={item.name || "Product"} />}
        <div><h2>{item.name || "Unavailable product"}</h2>
          {item.unitPrice && <p>₹{item.unitPrice} each</p>}
          {!item.available && <p className="cart-warning">{item.reason || "Unavailable"}</p>}
          {item.availableStock !== undefined && <p>Available stock: {item.availableStock}</p>}
          <div className="quantity-controls">
            <button type="button" onClick={() => item.quantity === 1
              ? removeFromCart(item.productId) : updateQuantity(item.productId, item.quantity - 1)}>−</button>
            <span>{item.quantity}</span>
            <button type="button" disabled={!item.available || item.quantity >= 99 || item.quantity >= item.availableStock}
              onClick={() => updateQuantity(item.productId, item.quantity + 1)}>+</button>
          </div>
          <button type="button" onClick={() => removeFromCart(item.productId)}>Remove</button>
        </div>
        {item.lineTotal && <strong>₹{item.lineTotal}</strong>}
      </article>)}</div>
      <div className="cart-summary"><h2>Summary</h2><p>Subtotal: <strong>₹{quote.subtotal}</strong></p>
        {!quote.valid && <p className="cart-warning">Some cart items are unavailable. Update your cart.</p>}
        <p>Shipping and tax are not included.</p>
        <button type="button" onClick={clearCart}>Clear cart</button>
        <button type="button" disabled>Checkout in Lesson 10</button>
      </div>
    </>}
  </main>;
}
