import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { useCart } from "../../hooks/useCart";
import { quoteCart } from "../../services/cartService";
import { createCodOrder } from "../../services/orderService";
import { getCurrentUser } from "../../services/authService";
import { isAuthenticationError, apiAssetUrl } from "../../services/apiClient";

const initialAddress = { fullName: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "" };
const money = v => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export default function Checkout() {
  const { items, clearCart } = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState(initialAddress);
  const [quote, setQuote] = useState(null);
  const [checking, setChecking] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const account = await getCurrentUser(controller.signal);
        if (account.user?.role !== "customer") { navigate(account.user?.role === "admin" ? "/admin/dashboard" : "/login", { replace: true }); return; }
        setRole("customer");
        setAddress(old => ({ ...old, fullName: account.user.fullName || "", phone: account.user.mobileNumber || "" }));
        const result = await quoteCart(items, controller.signal);
        if (!controller.signal.aborted) setQuote(result);
      } catch (e) {
        if (isAuthenticationError(e)) navigate("/login", { replace: true, state: { from: "/checkout", message: "Sign in to complete your Cash on Delivery order." } });
        else if (!controller.signal.aborted) setError(e.message);
      } finally { if (!controller.signal.aborted) setChecking(false); }
    }
    load();
    return () => controller.abort();
  }, [items, navigate]);
  async function submit(e) {
    e.preventDefault();
    if (posting || !quote?.valid || !items.length) return;
    setPosting(true); setError("");
    try {
      const result = await createCodOrder({ items, address, paymentMethod: "cod", requestKey: requestKey.current });
      clearCart();
      navigate("/orders", { replace: true, state: { placedId: result.order.id, alreadyPlaced: result.alreadyPlaced } });
    } catch (e) {
      if (isAuthenticationError(e)) navigate("/login", { replace: true, state: { from: "/checkout", message: "Please sign in again to place your order." } });
      else setError(e.message);
    } finally { setPosting(false); }
  }
  const fields = [
    { key: "fullName", title: "Full name", autoComplete: "name", max: 100 },
    { key: "phone", title: "Mobile number", type: "tel", autoComplete: "tel", max: 15 },
    { key: "addressLine1", title: "Street address and house number", autoComplete: "address-line1", max: 200, wide: true },
    { key: "addressLine2", title: "Apartment, landmark (optional)", autoComplete: "address-line2", max: 200, wide: true, optional: true },
    { key: "city", title: "City", autoComplete: "address-level2", max: 100 },
    { key: "state", title: "State", autoComplete: "address-level1", max: 100 },
    { key: "pincode", title: "PIN code", inputMode: "numeric", autoComplete: "postal-code", max: 6, pattern: "[0-9]{6}" },
  ];
  return <CustomerLayout mainClassName="nx-cod-page">
    <div className="nx-page-intro"><Link className="nx-back-link" to="/cart">← Back to cart</Link><p className="eyebrow">Secure order placement</p><h1>Cash on Delivery</h1><p>Confirm your items and delivery address. No online payment is required.</p></div>
    {checking && <p role="status" className="nx-cod-message">Checking your account, prices and stock…</p>}
    {error && <div role="alert" className="nx-cod-message nx-cod-error">{error}{!posting && <button type="button" onClick={()=>window.location.reload()}>Refresh</button>}</div>}
    {!checking && role === "customer" && <div className="nx-cod-grid">
      <form id="nx-cod-form" className="nx-cod-panel nx-cod-address" onSubmit={submit}>
        <div className="nx-section-heading"><span className="nx-step-number">01</span><div><h2>Delivery address</h2><p>We'll use this address for your COD order.</p></div></div>
        <div className="nx-cod-fields">{fields.map(field => <label key={field.key} className={`nx-cod-field ${field.wide ? "nx-cod-wide" : ""}`}>
          <span>{field.title}{!field.optional && <b aria-label="required"> *</b>}</span>
          <input required={!field.optional} name={field.key} type={field.type || "text"} autoComplete={field.autoComplete} inputMode={field.inputMode} maxLength={field.max} pattern={field.pattern} minLength={field.key === "addressLine1" ? 5 : undefined} value={address[field.key]} onChange={e => setAddress(old=>({...old,[field.key]:e.target.value}))}/>
        </label>)}</div>
        <div className="nx-cod-method"><div className="nx-section-heading"><span className="nx-step-number">02</span><div><h2>Payment method</h2><p>Only Cash on Delivery is available.</p></div></div><div className="nx-cod-method-selected"><span>✓</span><div><strong>Cash on Delivery (COD)</strong><small>Pay when your order arrives. No payment details requested.</small></div></div></div>
        <button className="button button-primary nx-cod-submit" disabled={posting || !quote?.valid || !items.length || checking} type="submit">{posting ? "Placing order…" : `Place COD order · ${money(quote?.availableSubtotal)}`}</button>
        <p className="nx-cod-note">Clicking Place COD order creates an order and reserves stock by deducting it. There is no online charge.</p>
      </form>
      <aside className="nx-cod-panel nx-cod-summary"><div className="nx-section-heading"><span className="nx-step-number">03</span><div><h2>Your order</h2><p>Final prices checked against the store.</p></div></div>
        {!quote?.valid && <div className="nx-cod-message nx-cod-error">Some items are no longer available. <Link to="/cart">Review your cart</Link> before placing an order.</div>}
        {quote?.items?.map(item => <div key={`${item.productId}-${item.variantId||""}`} className="nx-cod-summary-line"><div className="nx-cod-summary-product">{item.imageUrl && <img src={apiAssetUrl(item.imageUrl)} alt="" loading="lazy"/>}<div><strong>{item.name || "Unavailable product"}</strong><small>{item.sku ? `${item.sku} · ` : ""}Qty {item.quantity}</small></div></div><span>{item.lineTotal ? money(item.lineTotal) : "—"}</span></div>)}
        <div className="nx-cod-summary-line"><span>Subtotal</span><strong>{money(quote?.availableSubtotal)}</strong></div>
        <div className="nx-cod-summary-line"><span>Shipping</span><span>Free (demo)</span></div>
        <div className="nx-cod-total"><span>Amount due on delivery</span><strong>{money(quote?.availableSubtotal)}</strong></div>
        <p className="nx-cod-note">This demo does not calculate separate taxes or carrier charges. COD only.</p>
      </aside>
    </div>}
  </CustomerLayout>;
}
