import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const API = "http://localhost:4000";

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const response = await fetch(
          `${API}/api/products`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Could not load products.");
        }

        const data = await response.json();

        setProducts(data.products);

      } catch (error) {
        if (error.name !== "AbortError") {
          setError(error.message);
        }

      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  if (loading) {
    return <p>Loading products...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  return (
    <main className="store-container">
      <header className="store-header">
        <h1>Our Products</h1>

        <nav>
          <Link to="/login">Customer Login</Link>
          {" | "}
          <Link to="/admin/login">Admin</Link>
        </nav>
      </header>

      {products.length === 0 ? (
        <p>No products available yet.</p>
      ) : (
        <div className="product-grid">
          {products.map((product) => (
            <Link
              to={`/products/${product.id}`}
              className="product-card"
              key={product.id}
            >
              <img
                src={`${API}${product.imageUrl}`}
                alt={product.name}
                loading="lazy"
              />

              <div className="product-info">
                <small>{product.category}</small>

                <h2>{product.name}</h2>

                <p className="product-price">
                  ₹{Number(product.price).toFixed(2)}
                </p>

                <p>
                  {product.stock > 0
                    ? "In Stock"
                    : "Out of Stock"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}