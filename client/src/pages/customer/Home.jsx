import { Button, EmptyState } from "../../components/ui/index";
import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import ProductLoadingSkeleton from "../../components/common/ProductLoadingSkeleton";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import RecentlyViewed from "../../components/customer/RecentlyViewed";
import ProductCard from "../../components/common/ProductCard";
import NewsletterPopup from "../../components/customer/NewsletterPopup";
import FeaturedTestimonials from "../../components/customer/FeaturedTestimonials";
import PromotionCarousel from "../../components/customer/PromotionCarousel";
import CustomerLayout from "../../components/layout/CustomerLayout";
import CategoryTile from "../../components/customer/CategoryTile";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";
import {getStorefrontCopy} from "../../services/storefrontCopyService";

export default function Home() {
  const [products, setProducts] = useState([]);
 const liveRevision=useRealtimeRevision(['catalog', 'promotions', 'branding']);
  const [copy, setCopy] = useState(null);
  useEffect(()=>{const controller=new AbortController();getStorefrontCopy(controller.signal).then(d=>{if(!controller.signal.aborted)setCopy(d.copy);}).catch(()=>{});return ()=>controller.abort();},[liveRevision]);
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
  }, [liveRevision]);

  const featured = products.filter((product) => product.isFeatured).slice(0, 4);
  const featuredCategories = categories.filter(category => !category.parentId).slice(0, 8);

  return <CustomerLayout mainClassName="nx60-home">
      <PromotionCarousel position="home" fallback={<>
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">Discover more · Everyday essentials</p>
          <h1>Find what you love,<br />all in one place.</h1>
          <p className="hero-description">Explore products across every category, discover new favorites and shop with confidence.</p>
          <div className="hero-actions">
            <Button as={Link} variant="primary"  to="/products">Explore products</Button>
            <Link className="text-link" to="/about">Why shop with us </Link>
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
          <div><p className="eyebrow">{copy?.featuredEyebrow||"Live catalogue"}</p><h2 id="featured-heading">{copy?.featuredTitle||"Featured products"}</h2></div>
          <Link className="text-link" to="/products">View all </Link>
        </div>
        {loading && <div className="product-grid" role="status" aria-busy="true" aria-label="Loading products">
          {[1, 2, 3, 4].map((item) => <ProductLoadingSkeleton key={item} />)}
        </div>}
        {error && <p className="store-alert" role="alert">{error}</p>}
        {!loading && !error && featured.length === 0 && <EmptyState icon="star" title="No featured products yet" description="An admin can mark products as Featured." />}
        {!loading && !error && featured.length > 0 && <div className="product-grid">
          {featured.map((product) => <ProductCard product={product} key={product.cardKey || product.id} />)}
        </div>}
      </section>

      <section className="store-section category-section" id="categories" aria-labelledby="categories-heading">
        <div className="section-heading">
          <div><p className="eyebrow">{copy?.categoryEyebrow||"Browse what you love"}</p><h2 id="categories-heading">{copy?.categoryTitle||"Shop by category"}</h2></div>
          <Link className="text-link" to="/categories">All categories </Link>
        </div>
        {categoryError && <p className="store-alert" role="alert">{categoryError}</p>}
        {featuredCategories.length > 0 ? <div className="nx16-category-grid">
          {featuredCategories.map((category,index) => <CategoryTile key={category.id} category={category} index={index} />)}
        </div> : !loading && <EmptyState icon="grid" title="No categories yet" description="Categories will appear as products are added." />}
      </section>



      <FeaturedTestimonials />
      <RecentlyViewed />

      <section className="editorial-banner">
        <p className="eyebrow">{copy?.editorialEyebrow||"Thoughtfully selected"}</p>
        <h2>{copy?.editorialTitle||"Discover something new every day."}</h2>
        <p>{copy?.editorialDescription||"Explore products by category, brand and price, with useful details and a clear shopping cart."}</p>
        <Button as={Link} variant="secondary" className="button-light" to="/products">{copy?.editorialButton||"Browse products"}</Button>
      </section>
    <NewsletterPopup />
  </CustomerLayout>;
}
