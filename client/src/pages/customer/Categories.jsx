import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import CategoryTile from "../../components/customer/CategoryTile";

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
    <div className="nx16-category-grid nx16-category-directory">
      {state.categories.filter(c=>!c.parentId).map((category,index) => <div key={category.id} className="nx17-category-tree"><CategoryTile category={category} index={index} directory /><div className="nx17-subcategory-links">{state.categories.filter(sub=>String(sub.parentId)===String(category.id)).map(sub=><Link key={sub.id} to={`/categories/${encodeURIComponent(sub.slug)}`}>{sub.name} ↗</Link>)}</div></div>)}
    </div>
  </CustomerLayout>;
}
