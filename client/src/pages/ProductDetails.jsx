import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useCart } from "../context/CartContext";
import StoreHeader from "../components/StoreHeader";
const API = "http://localhost:4000";
export default function ProductDetails() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setProduct(null); setError(""); setQuantity(1); setAdded(false);
    async function load() {
      try {
        const response = await fetch(`${API}/api/products/${id}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        setProduct(data.product);
      } catch (err) { if (err.name !== "AbortError") setError(err.message); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    load(); return () => controller.abort();
  }, [id]);
  return <main className="store-container"><StoreHeader /><p><Link to="/products">← Back to Products</Link></p>
    {loading && <p>Loading product...</p>}
    {error && <p role="alert" className="store-alert">{error}</p>}
    {product && <div className="product-detail">
      {product.imageUrl ? <img src={`${API}${product.imageUrl}`} alt={product.name} /> : <div>No image</div>}
      <div><small>{product.category}</small><h1>{product.name}</h1>
        <h2>₹{Number(product.price).toFixed(2)}</h2><p>{product.description}</p>
        <p>Available stock: {product.stock}</p>
        <label htmlFor="product-quantity">Quantity </label>
        <input id="product-quantity" type="number" min="1" max={Math.min(99, product.stock)}
          value={quantity} disabled={product.stock === 0}
          onChange={event => {
            const n = Number(event.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= Math.min(99, product.stock)) setQuantity(n);
          }} />
        <button type="button" disabled={product.stock === 0} onClick={() => { addToCart(product.id, quantity); setAdded(true); }}>
          {product.stock === 0 ? "Out of stock" : "Add to cart"}
        </button>
        {added && <p role="status">Added to cart! <Link to="/cart">View cart</Link></p>}
      </div>
    </div>}
  </main>;
}
