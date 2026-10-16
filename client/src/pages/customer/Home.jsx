import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { apiAssetUrl } from "../../services/apiClient";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const [productData, categoryData] = await Promise.all([
          getProducts({ signal: controller.signal }),
          getCategories(controller.signal)
        ]);
        setProducts(Array.isArray(productData.products) ? productData.products : []);
        setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, []);

  const featured = products.slice(0, 4);
  const featuredCategories = categories.slice(0, 8);

  return <CustomerLayout>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Current technology · Clear specifications</p>
          <h1>Smarter tech,<br />chosen with confidence.</h1>
          <p className="hero-description">Compare real devices, verified specifications, live prices, and current stock across the electronics that power your day.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/products">Explore electronics</Link>
            <Link className="text-link" to="/about">Why shop with us <span aria-hidden="true">→</span></Link>
          </div>
          <dl className="hero-stats">
            <div><dt>Verified</dt><dd>Structured specs</dd></div>
            <div><dt>Current</dt><dd>Live stock</dd></div>
            <div><dt>Secure</dt><dd>Protected account</dd></div>
          </dl>
        </div>
        <div className="hero-visual">
          <div className="electronics-showcase" aria-hidden="true">
            <span className="signal-ring ring-one" /><span className="signal-ring ring-two" />
            <div className="device device-phone"><span /><span /><span /></div>
            <div className="device device-laptop"><span /></div>
            <div className="device device-watch"><span /></div>
          </div>
          <div className="hero-note"><span>01</span><p>Compare the details that matter before you buy.</p></div>
        </div>
      </section>

      <section className="store-section" aria-labelledby="featured-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Live catalogue</p><h2 id="featured-heading">Featured electronics</h2></div>
          <Link className="text-link" to="/products">View all <span aria-hidden="true">→</span></Link>
        </div>
        {loading && <div className="product-grid" aria-label="Loading products">
          {[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}
        </div>}
        {error && <p className="store-alert" role="alert">{error}</p>}
        {!loading && !error && featured.length === 0 && <div className="store-empty">No active products are available yet.</div>}
        {!loading && !error && featured.length > 0 && <div className="product-grid">
          {featured.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>}
      </section>

      <section className="store-section category-section" id="categories" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Find the right device</p><h2 id="categories-heading">Shop electronics by category</h2></div>
        </div>
        {featuredCategories.length > 0 ? <div className="category-grid">
          {featuredCategories.map((category, index) => <Link
            className="category-card"
            to={`/categories/${encodeURIComponent(category.slug)}`}
            key={category.id}
          >
            {category.imageUrl && <img src={apiAssetUrl(category.imageUrl)} alt="" loading="lazy" />}
            <span className="category-number">0{index + 1}</span>
            <div><h3>{category.name}</h3><span>{category.productCount} products · Explore collection →</span></div>
          </Link>)}
        </div> : !loading && <p className="store-empty">Categories will appear as products are added.</p>}
      </section>

      <section className="editorial-banner">
        <p className="eyebrow">The Manan&apos;s Electronics standard</p>
        <h2>Technical details without the guesswork.</h2>
        <p>Search by brand, model, price, or supported feature and compare real products from the live catalogue.</p>
        <Link className="button button-light" to="/products">Start comparing</Link>
      </section>
  </CustomerLayout>;
}
