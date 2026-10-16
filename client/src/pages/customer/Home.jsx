import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import heroImage from "../../assets/hero.png";
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
  const featuredCategories = categories.slice(0, 4);

  return <CustomerLayout>
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
        <p className="eyebrow">The Manan's Store standard</p>
        <h2>Fewer, better things.</h2>
        <p>We select useful, enduring products and present them with honest details, so every choice feels considered.</p>
        <Link className="button button-light" to="/about">Discover our approach</Link>
      </section>
  </CustomerLayout>;
}
