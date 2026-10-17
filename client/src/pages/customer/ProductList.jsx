import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import ProductFilters from "../../components/customer/ProductFilters";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";

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

  function chooseCategory(slug) {
    const next = new URLSearchParams();
    if (searchQuery) next.set("q", searchQuery);
    const sort = searchParams.get("sort");
    if (sort) next.set("sort", sort);
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
      for (const name of ["q", "category", "sort"]) {
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
        {categories.map((item) => (
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
            : `${pagination.total} ${pagination.total === 1 ? "product" : "products"}`}
        </p>
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
                <p>Remove a filter or try a broader search.</p>
              </div>
            )}
          {!loading && !error && products.length > 0 && (
            <div className="product-grid">
              {products.map((product) => (
                <ProductCard product={product} key={product.id} />
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
