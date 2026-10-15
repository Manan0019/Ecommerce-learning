import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StoreHeader from "../components/StoreHeader";
const API = "http://localhost:4000";
export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${API}/api/products`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        if (!Array.isArray(data.products)) throw new Error("API did not return a products array.");
        setProducts(data.products);
      } catch (err) {
        if (err.name !== "AbortError") setError(err.message || "Network connection failed.");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load();
    return () => controller.abort();
  }, []);
  return <main className="store-container">
    <StoreHeader />
    <h1>Our Products</h1>
    {loading && <p>Loading products from PostgreSQL...</p>}
    {error && <div role="alert" className="store-alert">
      <strong>Products could not load.</strong><p>{error}</p>
      <p>Open <a href={`${API}/api/products`} target="_blank" rel="noreferrer">the public product API</a> to check the backend response.</p>
    </div>}
    {!loading && !error && products.length === 0 &&
      <div className="store-empty"><h2>No active products yet</h2>
        <p>Make sure the admin has created a product and activated it.</p>
        <Link to="/admin/products">Manage Products (admin login required)</Link>
      </div>}
    {!loading && !error && products.length > 0 && <div className="product-grid">
      {products.map(product => <Link className="product-card" to={`/products/${product.id}`} key={product.id}>
        {product.imageUrl
          ? <img src={`${API}${product.imageUrl}`} alt={product.name} loading="lazy" onError={e => { e.currentTarget.style.opacity = "0.25"; }} />
          : <div className="missing-image">No image</div>}
        <div className="product-info"><small>{product.category}</small><h2>{product.name}</h2>
          <p className="product-price">₹{Number(product.price).toFixed(2)}</p>
          <p>{product.stock > 0 ? `In stock (${product.stock})` : "Out of stock"}</p>
        </div>
      </Link>)}
    </div>}
  </main>;
}
