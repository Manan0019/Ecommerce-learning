import { EmptyState } from "../../components/ui/index";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { apiAssetUrl } from "../../services/apiClient";
import { getCurrentUser } from "../../services/authService";
import { getWishlist, removeWishlist } from "../../services/wishlistService";

export default function Wishlist() {
 const [products, setProducts] = useState([]);
 const [message, setMessage] = useState("");
 const [busyId, setBusyId] = useState(null);
 const [loading, setLoading] = useState(true);
 const [mode, setMode] = useState("guest");
 useEffect(() => {
  const controller = new AbortController();
  async function load() {
   try {
    const auth = await getCurrentUser(controller.signal);
    if (auth.user?.role === "customer") {
      setMode("customer");
      const result = await getWishlist(controller.signal);
      setProducts(result.products ?? []);
    } else { setMode(auth.user?.role === "admin" ? "admin" : "guest"); }
   } catch (error) { if (error.name !== "AbortError" && error.status !== 401) setMessage(error.message); }
   finally { if (!controller.signal.aborted) setLoading(false); }
  }
  load(); return () => controller.abort();
 }, []);
 async function remove(id) {
  setBusyId(id); setMessage("");
  try { await removeWishlist(id); setProducts((prev) => prev.filter((p) => p.id !== id)); }
  catch (error) { setMessage(error.message); }
  finally { setBusyId(null); }
 }
 return <CustomerLayout mainClassName="wishlist-page">
  <h1>My Wishlist</h1>
  {loading && <p>Loading wishlist…</p>}
  {message && <p role="alert" className="store-alert">{message}</p>}
  {!loading && mode !== "customer" && <p>Sign in with a customer account to save products across visits. {mode === "guest" && <Link to="/login">Sign in</Link>}{mode === "admin" && <Link to="/admin/dashboard">Return to admin</Link>}</p>}
  {!loading && mode === "customer" && products.length === 0 && <EmptyState icon="heart" title="Your wishlist is empty" description="Tap the heart on a product to save it for later." action={<Link className="button button-primary" to="/products">Browse products</Link>}/>}
  <div className="wishlist-grid">{products.map((p) => <article key={p.id} className="wishlist-card">
   <Link to={`/products/${p.id}`}>{p.imageUrl && <img alt={p.name} src={apiAssetUrl(p.imageUrl)} loading="lazy"/>}<h2>{p.name}</h2></Link>
   <p>{p.category} · ₹{Number(p.price).toFixed(2)}</p>
   <button type="button" disabled={busyId === p.id} onClick={() => remove(p.id)}>Remove from wishlist</button>
  </article>)}</div>
 </CustomerLayout>;
}
