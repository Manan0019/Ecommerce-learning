import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "../assets/hero.png";
import { API_BASE_URL } from "../config/api";
import ProductCard from "../components/ProductCard";
import StoreFooter from "../components/StoreFooter";
import StoreHeader from "../components/StoreHeader";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load products.");
        setProducts(Array.isArray(data.products) ? data.products : []);
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
  const categories = [...new Map(products.map((product) => [product.category, product])).values()].slice(0, 4);

  return <div className="storefront">
    <StoreHeader />
    <main>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">New season · Thoughtfully selected</p>
          <h1>Everyday pieces,<br />beautifully considered.</h1>
          <p className="hero-description">Discover quality products chosen to bring comfort, character, and quiet confidence to your day.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/products">Shop the collection</Link>
            <Link className="text-link" to="/about">Our story <span aria-hidden="true">→</span></Link>
          </div>
          <dl className="hero-stats">
            <div><dt>Curated</dt><dd>Quality first</dd></div>
            <div><dt>Secure</dt><dd>Trusted checkout</dd></div>
            <div><dt>Personal</dt><dd>Made for you</dd></div>
          </dl>
        </div>
        <div className="hero-visual">
          <img src={heroImage} alt="A curated collection of modern lifestyle products" />
          <div className="hero-note"><span>01</span><p>Designed for the rhythm of modern life.</p></div>
        </div>
      </section>

      <section className="store-section" aria-labelledby="featured-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Editor’s selection</p><h2 id="featured-heading">Featured products</h2></div>
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
          <div><p className="eyebrow">Find your edit</p><h2 id="categories-heading">Browse by category</h2></div>
        </div>
        {categories.length > 0 ? <div className="category-grid">
          {categories.map((product, index) => <Link
            className="category-card"
            to={`/products?category=${encodeURIComponent(product.category)}`}
            key={product.category}
          >
            {product.imageUrl && <img src={`${API_BASE_URL}${product.imageUrl}`} alt="" loading="lazy" />}
            <span className="category-number">0{index + 1}</span>
            <div><h3>{product.category}</h3><span>Explore collection →</span></div>
          </Link>)}
        </div> : !loading && <p className="store-empty">Categories will appear as products are added.</p>}
      </section>

      <section className="editorial-banner">
        <p className="eyebrow">The Manan's Store standard</p>
        <h2>Fewer, better things.</h2>
        <p>We select useful, enduring products and present them with honest details, so every choice feels considered.</p>
        <Link className="button button-light" to="/about">Discover our approach</Link>
      </section>
    </main>
    <StoreFooter />
  </div>;
}
