import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import ProductCard from "../components/ProductCard";
import StoreFooter from "../components/StoreFooter";
import StoreHeader from "../components/StoreHeader";

export default function ProductList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = searchParams.get("q")?.trim().toLowerCase() || "";
  const selectedCategory = searchParams.get("category") || "";

  useEffect(() => {
    const controller = new AbortController();
    async function loadProducts() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
        if (!Array.isArray(data.products)) throw new Error("The product catalogue could not be read.");
        setProducts(data.products);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message || "Network connection failed.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadProducts();
    return () => controller.abort();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category))].sort(), [products]);
  const visibleProducts = products.filter((product) => {
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const searchable = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return matchesCategory && (!query || searchable.includes(query));
  });

  function chooseCategory(category) {
    const next = new URLSearchParams(searchParams);
    if (category) next.set("category", category);
    else next.delete("category");
    setSearchParams(next);
  }

  return <div className="storefront">
    <StoreHeader />
    <main className="catalogue-page">
      <header className="page-hero compact-hero">
        <p className="eyebrow">The complete collection</p>
        <h1>Shop</h1>
        <p>Explore every piece in our current edit, sourced directly from our live catalogue.</p>
      </header>

      <div className="catalogue-toolbar">
        <div className="category-filters" aria-label="Filter products by category">
          <button className={!selectedCategory ? "is-active" : ""} type="button" onClick={() => chooseCategory("")}>All</button>
          {categories.map((category) => <button className={selectedCategory === category ? "is-active" : ""}
            type="button" onClick={() => chooseCategory(category)} key={category}>{category}</button>)}
        </div>
        <p>{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}</p>
      </div>

      {query && <p className="search-summary">Results for “{searchParams.get("q")}”</p>}
      {loading && <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}</div>}
      {error && <p role="alert" className="store-alert">{error}</p>}
      {!loading && !error && visibleProducts.length === 0 && <div className="store-empty">
        <h2>No products found</h2><p>Try another search or category.</p>
      </div>}
      {!loading && !error && visibleProducts.length > 0 && <div className="product-grid">
        {visibleProducts.map((product) => <ProductCard product={product} key={product.id} />)}
      </div>}
    </main>
    <StoreFooter />
  </div>;
}
