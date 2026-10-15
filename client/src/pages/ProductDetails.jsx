import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

const API = "http://localhost:4000";

export default function ProductDetails() {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadProduct() {
      setLoading(true);
      setError("");
      setProduct(null);

      try {
        const response = await fetch(
          `${API}/api/products/${id}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? "Product not found."
              : "Could not load product."
          );
        }

        const data = await response.json();
        setProduct(data.product);

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

    loadProduct();

    return () => controller.abort();
  }, [id]);

  if (loading) {
    return <p>Loading product...</p>;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  if (!product) {
    return <p>Product unavailable.</p>;
  }

  return (
    <main className="store-container">
      <Link to="/products">← Back to Products</Link>

      <div className="product-detail">
        <img
          src={`${API}${product.imageUrl}`}
          alt={product.name}
        />

        <div>
          <p>{product.category}</p>

          <h1>{product.name}</h1>

          <h2>
            ₹{Number(product.price).toFixed(2)}
          </h2>

          <p>{product.description}</p>

          <p>
            Available stock: {product.stock}
          </p>

          <button disabled={product.stock === 0}>
            {product.stock === 0
              ? "Out of Stock"
              : "Cart Coming Soon"}
          </button>
        </div>
      </div>
    </main>
  );
}