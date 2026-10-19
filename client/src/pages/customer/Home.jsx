import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import PromotionCarousel from "../../components/customer/PromotionCarousel";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CategoryTile from "../../components/customer/CategoryTile";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";

export default function Home() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const data = await getProducts({ signal: controller.signal, params: new URLSearchParams({ featured: "true", view: "products", limit: "4" }) });
        if (!controller.signal.aborted) setProducts(Array.isArray(data.products) ? data.products : []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally { if (!controller.signal.aborted) setLoading(false); }
      try {
        const categoryData = await getCategories(controller.signal);
        if (!controller.signal.aborted) setCategories(Array.isArray(categoryData.categories) ? categoryData.categories : []);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setCategoryError(requestError.message);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, []);

  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredCategories = categories.filter(category => !category.parentId).slice(0, 8);

  return <CustomerLayout>
      <PromotionCarousel position="home" fallback={<>
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
          <div className="nx15-hero-stack" aria-hidden="true">
            <div className="nx15-hero-item nx15-hero-item-one"><span>✿</span><b>Everyday finds</b><small>Beauty · Care</small></div>
            <div className="nx15-hero-item nx15-hero-item-two"><span>◈</span><b>Fresh arrivals</b><small>Style · Fashion</small></div>
            <div className="nx15-hero-item nx15-hero-item-three"><span>✦</span><b>Discover more</b><small>Home · Essentials</small></div>
          </div>
          <div className="hero-note"><span>01</span><p>Explore more categories and find your next favorite.</p></div>
        </div>
      </section>
      </>}/>

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
          {featured.map((product) => <ProductCard product={product} key={product.cardKey || product.id} />)}
        </div>}
      </section>

      <section className="store-section category-section" id="categories" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Browse what you love</p><h2 id="categories-heading">Shop by category</h2></div>
          <Link className="text-link" to="/categories">All categories →</Link>
        </div>
        {categoryError && <p className="store-alert" role="alert">{categoryError}</p>}
        {featuredCategories.length > 0 ? <div className="nx16-category-grid">
          {featuredCategories.map((category,index) => <CategoryTile key={category.id} category={category} index={index} />)}
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
