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
          getProducts({ signal: controller.signal, params: new URLSearchParams({ featured: "true", limit: "4" }) }),
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

  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredCategories = categories.slice(0, 8);

  return <CustomerLayout>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Discover more · Everyday essentials</p>
          <h1>Find what you love,<br />all in one place.</h1>
          <p className="hero-description">Explore products across every category, discover new favorites and shop with confidence.</p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/products">Explore products</Link>
            <Link className="text-link" to="/about">Why shop with us <span aria-hidden="true">→</span></Link>
          </div>
          <dl className="hero-stats">
            <div><dt>Verified</dt><dd>Quality selection</dd></div>
            <div><dt>Current</dt><dd>Product availability</dd></div>
            <div><dt>Secure</dt><dd>Protected account</dd></div>
          </dl>
        </div>
        <div className="hero-visual">
          <div className="generic-store-showcase" aria-hidden="true">Discover • Explore • Enjoy</div>
          <div className="hero-note"><span>01</span><p>Explore more categories and find your next favorite.</p></div>
        </div>
      </section>

      <section className="store-section" aria-labelledby="featured-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Live catalogue</p><h2 id="featured-heading">Featured products</h2></div>
          <Link className="text-link" to="/products">View all <span aria-hidden="true">→</span></Link>
        </div>
        {loading && <div className="product-grid" aria-label="Loading products">
          {[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}
        </div>}
        {error && <p className="store-alert" role="alert">{error}</p>}
        {!loading && !error && featured.length === 0 && <div className="store-empty">No featured products yet. An admin can mark products as Featured.</div>}
        {!loading && !error && featured.length > 0 && <div className="product-grid">
          {featured.map((product) => <ProductCard product={product} key={product.id} />)}
        </div>}
      </section>

      <section className="store-section category-section" id="categories" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Browse what you love</p><h2 id="categories-heading">Shop by category</h2></div>
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
        <p className="eyebrow">Thoughtfully selected</p>
        <h2>Discover something new every day.</h2>
        <p>Explore products by category, brand and price, with useful details and a clear shopping cart.</p>
        <Link className="button button-light" to="/products">Browse products</Link>
      </section>
  </CustomerLayout>;
}
