import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import {apiAssetUrl} from "../../services/apiClient";
import PromotionCarousel from "../../components/customer/PromotionCarousel";
import ProductFilters from "../../components/customer/ProductFilters";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";
import { rootCategories } from "../../services/categoryHierarchy";

export default function ProductList() {
  const navigate = useNavigate();
  const { slug: routeCategory } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryString = searchParams.toString();
  const searchQuery = searchParams.get("q") || "";
  const selectedCategory = routeCategory || searchParams.get("category") || "";
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [facets, setFacets] = useState([]);
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams(queryString);
        if (selectedCategory) params.set("category", selectedCategory);
        const data = await getProducts({ signal: controller.signal, params });
        if (!controller.signal.aborted) {
          setProducts(data.products || []);
          setFacets(data.facets || []);
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
  }, [queryString, selectedCategory]);

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

  function submitSearch(searchDraft) {
    updateParams((next) => {
      const clean = searchDraft.trim();
      if (clean) next.set("q", clean);
      else next.delete("q");
    });
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <CustomerLayout mainClassName="catalogue-page">
      <header className="catalogue-hero">
        <p className="eyebrow">Discover products across every category</p>
        <h1>{category?.name || "Explore our collection"}</h1>
        <CatalogueSearch
          key={searchQuery}
          query={searchQuery}
          onSubmit={submitSearch}
        />
      </header>

      {activeCategory && <nav className="nx18-category-breadcrumb" aria-label="Category hierarchy">
        <Link to="/categories">Categories</Link>
        {ancestors.map(parent => <span key={parent.id} className="nx21-crumb"><span aria-hidden="true">›</span>
          <Link to={`/categories/${encodeURIComponent(parent.slug)}`}>{parent.name}</Link></span>)}
        <span aria-hidden="true">›</span><strong>{activeCategory.name}</strong>
      </nav>}
      {selectedCategory&&<PromotionCarousel position="category" category={selectedCategory}/>}
      {category&&categories.some(c=>String(c.parentId)===String(category.id))&&<section className="nx17-subcategories" aria-label={`Shop ${category.name} subcategories`}>
        <h2>Explore {category.name}</h2>
        <div className="nx17-subcategory-shelf">{categories.filter(c=>String(c.parentId)===String(category.id)).map(child=><Link key={child.id} to={`/categories/${encodeURIComponent(child.slug)}`}>
          <span>{child.imageUrl?<img src={apiAssetUrl(child.imageUrl)} alt="" loading="lazy"/>:<span className="nx21-category-placeholder" aria-hidden="true">{child.name.slice(0, 1).toUpperCase()}</span>}</span><strong>{child.name}</strong></Link>)}</div>
      </section>}

      <div
        className="category-filters category-tabs"
        aria-label="Browse categories"
      >
        <button
          className={!selectedCategory ? "is-active" : ""}
          type="button"
          onClick={() => chooseCategory("")}
        >
          All products
        </button>
        {rootCategories(categories).map((item) => (
          <button
            className={selectedCategory === item.slug ? "is-active" : ""}
            type="button"
            onClick={() => chooseCategory(item.slug)}
            key={item.id}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="catalogue-results-bar">
        <p>
          {loading
            ? "Searching…"
            : `${pagination.total} ${searchParams.get("view") === "products" ? "product styles" : searchParams.get("view") === "colors" ? "product families (color cards may be more)" : "configurations"}`}
        </p>
        <label className="nx17-view-control">
          Show
          <select value={searchParams.get("view") || "variants"} onChange={e => updateParams(next=>next.set("view",e.target.value))}>
            <option value="variants">All configurations</option><option value="colors">By color</option><option value="products">One per product</option>
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

      <div className="catalogue-layout">
        <ProductFilters
          facets={facets}
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
            <div className="product-grid">
              {Array.from({ length: 6 }, (_, index) => (
                <div className="product-skeleton" key={index} />
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

function CatalogueSearch({ query, onSubmit }) {
  const [searchDraft, setSearchDraft] = useState(query);

  return (
    <form
      className="catalogue-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(searchDraft);
      }}
    >
      <label className="sr-only" htmlFor="catalogue-search">
        Search products
      </label>
      <input
        id="catalogue-search"
        type="search"
        value={searchDraft}
        placeholder="Search by product, brand, model or specification"
        onChange={(event) => setSearchDraft(event.target.value)}
      />
      <button type="submit">Search</button>
    </form>
  );
}
