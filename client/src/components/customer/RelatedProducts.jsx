import "../../styles/related-products.css";
import { useEffect, useState } from "react";
import ProductCard from "../common/ProductCard";
import { getRelatedProducts } from "../../services/relatedProductService";

export default function RelatedProducts({ productId }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  useEffect(() => {
    const controller = new AbortController();
    getRelatedProducts(productId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(Array.isArray(data.products) ? data.products : []);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== "AbortError")
          setStatus("error");
      });
    return () => controller.abort();
  }, [productId]);

  if (status === "loading")
    return (
      <section aria-label="Related products">
        <p>Finding similar products…</p>
      </section>
    );
  if (status === "error") return null; // Recommendations must not prevent purchasing/browsing.
  if (!items.length) return null;
  return (
    <section
      className="related-products"
      aria-labelledby="related-products-title"
    >
      <div className="section-heading">
        <div>
          <p className="eyebrow">Discover more</p>
          <h2 id="related-products-title">You may also like</h2>
        </div>
      </div>
      <div className="product-grid related-products-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
