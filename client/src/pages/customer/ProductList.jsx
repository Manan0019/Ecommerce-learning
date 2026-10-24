import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import ProductLoadingSkeleton from "../../components/common/ProductLoadingSkeleton";
import { useEffect, useState } from "react";
import UiIcon from "../../components/common/UiIcon";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import CategoryArtwork from "../../components/customer/CategoryArtwork";
import CategoryMiniArtwork from "../../components/customer/CategoryMiniArtwork";
import PromotionCarousel from "../../components/customer/PromotionCarousel";
import ProductFilters from "../../components/customer/ProductFilters";
import ActiveFilterChips from "../../components/customer/ActiveFilterChips";
import { removeCatalogueFilter } from "../../services/activeFilters";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";
import { rootCategories } from "../../services/categoryHierarchy";

export default function ProductList() {
  const navigate = useNavigate();
 const liveRevision=useRealtimeRevision(['catalog', 'inventory']);
  const { slug: routeCategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const searchQuery = searchParams.get("q") || "";
  const selectedCategory = routeCategory || searchParams.get("category") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState([]);
  const [priceBounds, setPriceBounds] = useState(null);
  const [category, setCategory] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then((data) =>
        setCategories(Array.isArray(data.categories) ? data.categories : []),
      )
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      });
    return () => controller.abort();
  }, [liveRevision]);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(queryString);
        if (selectedCategory) params.set("category", selectedCategory);
        params.set("includePriceBounds", "true");
        // A premium catalogue starts with one representative card per parent product.
        // Shoppers can explicitly switch to color or configuration browsing.
        if (!params.has("view")) params.set("view", "products");
        const data = await getProducts({ signal: controller.signal, params });
        if (!controller.signal.aborted) {
          setProducts(data.products || []);
          setFacets(data.facets || []);
          setPriceBounds(data.priceBounds || null);
          setCategory(data.category || null);
          setPagination(
            data.pagination || { page: 1, limit: 12, total: 0, pages: 0 },
          );
        }
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, [queryString, selectedCategory,liveRevision]);

  function updateParams(change) {
    const next = new URLSearchParams(searchParams);
    change(next);
    next.delete("page");
    setSearchParams(next);
  }

  const activeCategory = categories.find(item => item.slug === selectedCategory);
  const ancestors = [];
  const seen = new Set(activeCategory ? [String(activeCategory.id)] : []);
  let cursor = activeCategory;
  while (cursor?.parentId && !seen.has(String(cursor.parentId))) {
    seen.add(String(cursor.parentId));
    cursor = categories.find(item => String(item.id) === String(cursor.parentId));
    if (cursor) ancestors.unshift(cursor);
  }
  const parentCategory = ancestors.length ? ancestors[ancestors.length - 1] : null;

  function chooseCategory(slug) {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    const sort = searchParams.get("sort");
    if (sort) next.set("sort", sort);
    const view = searchParams.get("view");
    if (view) next.set("view", view);
    if (slug) next.set("category", slug);
    else next.delete("category");
    navigate(`/products${next.size ? `?${next.toString()}` : ""}`);
  }

  function changeFilter(key, values) {
    if (!key) {
      const preserved = new URLSearchParams();
      for (const name of ["q", "category", "sort", "view"]) {
        const value = searchParams.get(name);
        if (value) preserved.set(name, value);
      }
      setSearchParams(preserved);
      return;
    }
    updateParams((next) => {
      if (values.length) next.set(key, values.join(","));
      else next.delete(key);
    });
  }

  function changePage(page) {
    const next = new URLSearchParams(searchParams);
    next.set("page", String(page));
    setSearchParams(next);
    document.querySelector('.catalogue-results-bar')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  return (
    <CustomerLayout mainClassName="catalogue-page">
      <header className="catalogue-hero">
        <div className="nx25-hero-copy"><p className="eyebrow">Discover products across every category</p>
        <h1>{category?.name || "Explore our collection"}</h1></div>
        <Link to="/categories" className="nx48-hero-collections">Explore collections</Link>
      </header>

      {activeCategory && <nav className="nx18-category-breadcrumb" aria-label="Category hierarchy">
        <Link to="/categories">Categories</Link>
        {ancestors.map(parent => <span key={parent.id} className="nx21-crumb"><UiIcon name="chevron-right" size={15}/>
          <Link to={`/categories/${encodeURIComponent(parent.slug)}`}>{parent.name}</Link></span>)}
        <UiIcon name="chevron-right" size={15}/><strong>{activeCategory.name}</strong>
      </nav>}
      {selectedCategory&&<PromotionCarousel position="category" category={selectedCategory}/>}
      <section className="nx48-departments" aria-label="Browse departments">
        <div className="nx48-departments-top">
          <div><span className="nx48-section-kicker">CURATED DEPARTMENTS</span><h2>Explore collections</h2></div>
          <Link to="/categories" className="nx48-departments-all">All categories</Link>
        </div>
        <div className="nx48-department-track" role="group" aria-label="Choose a department">
          <button type="button" className={`nx48-department ${!selectedCategory ? "is-active" : ""}`}
            aria-pressed={!selectedCategory} onClick={() => chooseCategory("")}>
            <span className="nx48-department-icon nx49-all-departments-icon" aria-hidden="true">
              {rootCategories(categories).length ? <span className="nx49-all-departments-mosaic">
                {rootCategories(categories).slice(0, 4).map(root => <CategoryMiniArtwork key={root.id} category={root} />)}
              </span> : <UiIcon name="grid" size={20}/>}
            </span>
            <span className="nx48-department-text"><strong>All products</strong><small>Everything in store</small></span>
            <span className="nx66-department-accent" aria-hidden="true"/>
          </button>
          {rootCategories(categories).map(item => {
            const isActive = item.slug === selectedCategory || ancestors.some(ancestor => ancestor.slug === item.slug);
            return <button key={item.id} type="button" className={`nx48-department ${isActive ? "is-active" : ""}`}
              aria-pressed={isActive} onClick={() => chooseCategory(item.slug)}>
              <CategoryMiniArtwork category={item} className="nx48-department-icon" />
              <span className="nx48-department-text"><strong>{item.name}</strong><small>{Number(item.productCount)>0?`${item.productCount} products`:"View collection"}</small></span>
              <span className="nx66-department-accent" aria-hidden="true"/>
            </button>;
          })}
        </div>
      </section>

      {category&&categories.some(c=>String(c.parentId)===String(category.id))&&<section className="nx17-subcategories" aria-label={`Shop ${category.name} subcategories`}>
        <h2>Explore {category.name}</h2>
        <div className="nx17-subcategory-shelf">{categories.filter(c=>String(c.parentId)===String(category.id)).map(child=><Link key={child.id} to={`/categories/${encodeURIComponent(child.slug)}`}>
          <CategoryArtwork category={child} /><strong>{child.name}</strong><span className="nx34-category-action" aria-hidden="true">Explore</span></Link>)}</div>
      </section>}

      <div className="catalogue-results-bar">
        <p>
          {loading
            ? "Searching…"
            : `${pagination.total} ${(searchParams.get("view") || "products") === "products" ? "products" : searchParams.get("view") === "colors" ? "color choices" : "configurations"}`}
        </p>
        <label className="nx17-view-control">
          Show
          <select value={searchParams.get("view") || "products"} onChange={e => updateParams(next=>next.set("view",e.target.value))}>
            <option value="products">One per product</option><option value="colors">By color</option><option value="variants">All configurations</option>
          </select>
        </label>
        <label>
          Sort by
          <select
            value={
              searchParams.get("sort") ||
              (searchParams.get("q") ? "relevance" : "newest")
            }
            onChange={(event) =>
              updateParams((next) => next.set("sort", event.target.value))
            }
          >
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>

      <ActiveFilterChips
        params={searchParams}
        facets={facets}
        onRemove={(chip) => setSearchParams(removeCatalogueFilter(searchParams, chip))}
        onClear={() => changeFilter(null, [])}
      />

      <div className="catalogue-layout">
        <ProductFilters
          facets={facets}
          priceBounds={priceBounds}
          params={searchParams}
          disabled={loading}
          onFilterChange={changeFilter}
          onPriceChange={(min, max) =>
            updateParams((next) => {
              if (min) next.set("minPrice", min);
              else next.delete("minPrice");
              if (max) next.set("maxPrice", max);
              else next.delete("maxPrice");
            })
          }
        />
        <section className="catalogue-results" aria-live="polite">
          {loading && (
            <div className="product-grid" role="status" aria-label="Loading products" aria-busy="true">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductLoadingSkeleton key={index} />
              ))}
            </div>
          )}
          {error && (
            <p role="alert" className="store-alert">
              {error}
            </p>
          )}
          {!loading && !error && selectedCategory && !category && (
            <div className="store-empty">
              <h2>Category unavailable</h2>
              <p>This category is inactive or does not exist.</p>
            </div>
          )}
          {!loading &&
            !error &&
            products.length === 0 &&
            (!selectedCategory || category) && (
              <div className="store-empty">
                <h2>No matching products</h2>
                <p>{parentCategory ? `No active products are assigned to ${activeCategory.name} yet. Try ${parentCategory.name} or remove a filter.` : "Remove a filter or try a broader search."}</p>
                {parentCategory && <Link to={`/categories/${encodeURIComponent(parentCategory.slug)}`} className="button button-primary">Browse {parentCategory.name}</Link>}
              </div>
            )}
          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard product={product} key={product.cardKey || product.id} />
              ))}
            </div>
          )}
          {!loading && !error && pagination.pages > 1 && (
            <nav className="pagination" aria-label="Product pages">
              <button
                type="button"
                disabled={pagination.page <= 1}
                onClick={() => changePage(pagination.page - 1)}
              >
                Previous
              </button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                type="button"
                disabled={pagination.page >= pagination.pages}
                onClick={() => changePage(pagination.page + 1)}
              >
                Next
              </button>
            </nav>
          )}
        </section>
      </div>
    </CustomerLayout>
  );
}

