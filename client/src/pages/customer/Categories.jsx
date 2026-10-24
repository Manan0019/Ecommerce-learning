import usePagination from '../../hooks/usePagination';
import { Pagination, EmptyState } from "../../components/ui/index";

import useRealtimeRevision from "../../hooks/useRealtimeRevision";
import { useEffect, useState } from "react";
import UiIcon from "../../components/common/UiIcon";
import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { getCategories } from "../../services/categoryService";
import CategoryTile from "../../components/customer/CategoryTile";

export default function Categories() {
  const liveRevision=useRealtimeRevision(["catalog"]);
  const [state, setState] = useState({ loading: true, categories: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal)
      .then(data => { if (!controller.signal.aborted) setState({ loading: false, categories: data.categories || [], error: "" }); })
      .catch(err => { if (err.name !== "AbortError") setState({ loading: false, categories: [], error: err.message }); });
    return () => controller.abort();
  }, [liveRevision]);
  const top = state.categories.filter(c => !c.parentId);
  const pager=usePagination(top);
  return <CustomerLayout mainClassName="nx-categories-page nx37-collections-page">
    <header className="nx37-collections-intro"><span className="eyebrow">THE COLLECTIONS</span><h1>Find your kind of everything.</h1><p>Explore categories made for the things you love, with an easier path to every subcategory.</p></header>
    {state.loading && <div className="nx37-category-grid" aria-label="Loading categories">{[1, 2, 3, 4].map(i => <div className="nx37-category-placeholder" key={i}/>)}</div>}
    {state.error && <div className="store-alert" role="alert">{state.error}</div>}
    {!state.loading && !state.error && top.length === 0 && <EmptyState icon="grid" title="No categories yet" description="New collections will appear here when available."/>}
    <div className="nx37-category-grid nx37-directory-grid">
      {pager.items.map((category, index) => {
        const children = state.categories.filter(sub => String(sub.parentId) === String(category.id));
        return <section className="nx37-category-group" key={category.id}>
          <CategoryTile category={category} index={index} directory />
          {children.length > 0 && <div className="nx37-subcategory-row" aria-label={`${category.name} subcategories`}>
            {children.map(child => <Link key={child.id} to={`/categories/${encodeURIComponent(child.slug)}`}>{child.name}<UiIcon name="chevron-right" size={17}/></Link>)}
          </div>}
        </section>;
      })}
    </div>
  <Pagination {...pager} label="categories" onPageChange={pager.setPage}/>
  </CustomerLayout>;
}
