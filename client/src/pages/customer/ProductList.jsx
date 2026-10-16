import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import ProductCard from "../../components/common/ProductCard";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import { getProducts } from "../../services/productService";

export default function ProductList() {
  const navigate = useNavigate();
  const { slug: routeCategory } = useParams();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const query = searchParams.get("q")?.trim().toLowerCase() || "";
  const selectedCategory = routeCategory || searchParams.get("category") || "";

  useEffect(() => {
    const controller = new AbortController();
    async function loadCatalogue() {
      setLoading(true);
      setError("");
      try {
        const [productData, categoryData] = await Promise.all([
          getProducts({ signal: controller.signal, category: selectedCategory }),
          getCategories(controller.signal)
        ]);
        if (!Array.isArray(productData.products) || !Array.isArray(categoryData.categories)) {
          throw new Error("The product catalogue could not be read.");
        }
        setProducts(productData.products);
        setCategories(categoryData.categories);
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setError(requestError.message || "Network connection failed.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadCatalogue();
    return () => controller.abort();
  }, [selectedCategory]);

  const visibleProducts = useMemo(() => products.filter((product) => {
    const searchable = `${product.name} ${product.description} ${product.category}`.toLowerCase();
    return !query || searchable.includes(query);
  }), [products, query]);

  const activeCategory = categories.find((category) => category.slug === selectedCategory);

  function chooseCategory(category) {
    const next = new URLSearchParams();
    if (query) next.set("q", searchParams.get("q"));
    if (category) next.set("category", category);
    navigate(`/products${next.size ? `?${next.toString()}` : ""}`);
  }

  return <CustomerLayout mainClassName="catalogue-page">
    <header className="page-hero compact-hero">
      <p className="eyebrow">The complete collection</p>
      <h1>{activeCategory?.name || "Shop"}</h1>
      <p>{activeCategory
        ? `Explore active products in ${activeCategory.name}.`
        : "Explore every piece in our current edit, sourced directly from our live catalogue."}</p>
    </header>

    <div className="catalogue-toolbar">
      <div className="category-filters" aria-label="Filter products by category">
        <button className={!selectedCategory ? "is-active" : ""} type="button"
          onClick={() => chooseCategory("")}>All</button>
        {categories.map((category) => <button
          className={selectedCategory === category.slug ? "is-active" : ""}
          type="button" onClick={() => chooseCategory(category.slug)} key={category.id}>
          {category.name}
        </button>)}
      </div>
      <p>{visibleProducts.length} {visibleProducts.length === 1 ? "product" : "products"}</p>
    </div>

    {query && <p className="search-summary">Results for “{searchParams.get("q")}”</p>}
    {loading && <div className="product-grid">{[1, 2, 3, 4].map((item) => <div className="product-skeleton" key={item} />)}</div>}
    {error && <p role="alert" className="store-alert">{error}</p>}
    {!loading && !error && selectedCategory && !activeCategory && <div className="store-empty">
      <h2>Category unavailable</h2><p>This category is inactive or does not exist.</p>
    </div>}
    {!loading && !error && (!selectedCategory || activeCategory) && visibleProducts.length === 0 && <div className="store-empty">
      <h2>No products found</h2><p>Try another search or category.</p>
    </div>}
    {!loading && !error && visibleProducts.length > 0 && <div className="product-grid">
      {visibleProducts.map((product) => <ProductCard product={product} key={product.id} />)}
    </div>}
  </CustomerLayout>;
}
