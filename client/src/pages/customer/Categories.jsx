import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import { apiAssetUrl } from "../../services/apiClient";

export default function Categories() {
  const [state, setState] = useState({ loading: true, categories: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then(data => setState({ loading: false, categories: data.categories || [], error: "" }))
      .catch(err => { if (err.name !== "AbortError") setState({ loading: false, categories: [], error: err.message }); });
    return () => controller.abort();
  }, []);
  return <CustomerLayout mainClassName="nx-categories-page">
    <header className="nx-page-intro"><p className="eyebrow">Find your next favourite</p><h1>Explore every category.</h1>
      <p>Browse our collections and discover products that match your interests.</p></header>
    {state.loading && <p role="status">Loading categories…</p>}
    {state.error && <p className="store-alert" role="alert">{state.error}</p>}
    {!state.loading && !state.error && state.categories.length === 0 && <div className="store-empty">Categories will appear here when the catalogue is ready.</div>}
    <div className="nx-category-landing-grid">
      {state.categories.map((category, index) => <Link className="nx-category-landing-card" key={category.id} to={`/categories/${encodeURIComponent(category.slug)}`}>
        <div className="nx-category-landing-visual">{category.imageUrl ? <img src={apiAssetUrl(category.imageUrl)} loading="lazy" alt="" /> : <span aria-hidden="true">{["✦","◈","✳","✿"][index % 4]}</span>}</div>
        <div className="nx-category-landing-info"><h2>{category.name}</h2><p>{category.productCount} products</p><span aria-hidden="true">Explore →</span></div>
      </Link>)}
    </div>
  </CustomerLayout>;
}
