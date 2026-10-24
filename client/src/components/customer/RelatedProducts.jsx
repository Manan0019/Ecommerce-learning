import { Button } from "../ui/index";
import ProductLoadingSkeleton from "../common/ProductLoadingSkeleton";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../common/ProductCard";
import { getRelatedProducts } from "../../services/relatedProductService";

// The section must never block checkout, but failed requests should not vanish
// silently. A retry and Shop fallback make problems diagnosable in the browser.
export default function RelatedProducts({ productId }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getRelatedProducts(productId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setItems(Array.isArray(data?.products) ? data.products : []);
          setStatus("ready");
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted && error.name !== "AbortError") {
          setStatus("error");
        }
      });
    return () => controller.abort();
  }, [productId, attempt]);

  return <section className="related-products nx33-recommendations" aria-labelledby="related-products-title">
    <div className="section-heading nx33-recommendations-heading">
      <div>
        <p className="eyebrow">Keep exploring</p>
        <h2 id="related-products-title">You may also like</h2>
        <p className="nx33-recommendations-subtitle">Discover related products and more from your favourite categories.</p>
      </div>
      <Link className="nx33-see-all nx78-explore-all" to="/products?view=products">Explore all products</Link>
    </div>
    {status === "loading" && <div className="nx33-recommendations-loading" role="status" aria-label="Loading recommendations">
      {Array.from({ length: 4 }, (_, index) => <ProductLoadingSkeleton key={index} />)}
    </div>}
    {status === "error" && <div className="nx33-recommendations-state" role="status">
      <strong>Recommendations are temporarily unavailable.</strong>
      <p>You can still explore the catalogue while we reconnect.</p>
      <Button variant="primary"  type="button" onClick={() => { setStatus("loading"); setAttempt(x => x + 1); }}>Try again</Button>
    </div>}
    {status === "ready" && (items.length
      ? <div className="product-grid related-products-grid">
          {items.map((product) => <ProductCard key={product.cardKey || product.id} product={product} showQuickAdd={false} />)}
        </div>
      : <div className="nx33-recommendations-state"><strong>Explore more from Nexora</strong>
          <p>There aren't any closely related products published yet.</p>
          <Button as={Link} variant="primary"  to="/products?view=products">Browse the collection</Button>
        </div>)}
  </section>;
}
