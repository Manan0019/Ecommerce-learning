import { useEffect, useState } from "react";
import UiIcon from "../common/UiIcon";
import { Link } from "react-router-dom";
import { buildCategoryMenu } from "./categoryMenuTree";
import { getCategories } from "../../services/categoryService";
import { apiAssetUrl } from "../../services/apiClient";

function CategoryGlyph({ name, iconUrl }) {
  if (iconUrl) return <span className="nx35-category-glyph nx36-custom-glyph"><img src={apiAssetUrl(iconUrl)} alt="" loading="lazy" /></span>;
  const label = name.toLowerCase();
  const symbol = /beauty|makeup|skin|hair|cosmetic/.test(label) ? "✦"
    : /computer|laptop|mobile|smart|electronics|tablet|phone/.test(label) ? "▣"
    : /fashion|cloth|shirt|topwear|bottomwear|jean|shoe|footwear/.test(label) ? "♢"
    : /home|kitchen|decor|living/.test(label) ? "⌂"
    : /sport|fitness/.test(label) ? "◉" : "◇";
  return <span className="nx35-category-glyph" aria-hidden="true">{symbol}</span>;
}

function MenuBranch({ category, close, depth = 0, ancestors = [] }) {
  const [expanded, setExpanded] = useState(false);
  const [direction, setDirection] = useState("right");
  const children = category.children || [];
  const target = `/categories/${encodeURIComponent(category.slug)}`;
  const id = String(category.id ?? "");
  if (ancestors.includes(id) || depth > 14) return null;
  const hasChildren = children.length > 0;
  function selectSide(event) {
    if (!hasChildren || typeof window === "undefined") return;
    const rect = event.currentTarget.getBoundingClientRect();
    setDirection(window.innerWidth - rect.right < 275 && rect.left > 265 ? "left" : "right");
  }
  return <li className={`nx35-category-item ${hasChildren ? "has-children" : ""} ${expanded ? "is-expanded" : ""} ${direction === "left" ? "opens-left" : ""}`}
    onPointerEnter={selectSide} onFocus={selectSide}>
    <div className="nx35-category-item-row">
      <Link to={target} className="nx35-category-link" onClick={close}>
        <CategoryGlyph name={category.name} iconUrl={category.menuIconUrl} />
        <span>{category.name}</span>
      </Link>
      {hasChildren && <button type="button" className="nx35-category-expand" aria-expanded={expanded}
        aria-label={`${expanded ? "Collapse" : "Expand"} ${category.name} subcategories`}
        onClick={() => setExpanded(open => !open)}><UiIcon name="chevron-right" size={16}/></button>}
    </div>
    {hasChildren && <ul className="nx35-category-submenu" aria-label={`${category.name} subcategories`}>
      <li className="nx35-menu-parent-link"><Link to={target} onClick={close}>View all {category.name} <UiIcon name="chevron-right" size={15}/></Link></li>
      {children.map(child => <MenuBranch key={child.id} category={child} close={close} depth={depth+1} ancestors={[...ancestors,id]} />)}
    </ul>}
  </li>;
}

export default function CategoryMegaMenu({ mobileOpen, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ categories: [], error: "" });
  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal).then(result => {
      if (!controller.signal.aborted) setData({ categories: result.categories || [], error: "" });
    }).catch(error => { if (!controller.signal.aborted) setData({ categories: [], error: error.message }); });
    return () => controller.abort();
  }, []);
  const categories = buildCategoryMenu(data.categories);
  function close() { setOpen(false); onNavigate?.(); }
  return <div className={`nx35-category-nav ${open ? "is-open" : ""}`}
    onMouseEnter={() => {if (!mobileOpen && window.matchMedia("(min-width: 861px)").matches) setOpen(true);}}
    onMouseLeave={() => { if (!mobileOpen) setOpen(false); }}
    onBlur={event => {if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);}}
    onKeyDown={event => { if (event.key === "Escape") {event.preventDefault();event.currentTarget.querySelector(".nx35-category-trigger")?.focus();setOpen(false);} }}>
    <div className="nx35-nav-trigger-row">
      <Link className="nx35-category-trigger nx77-category-main-link" to="/categories" onClick={close} aria-label="Browse all categories">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.4"/></svg>
        <span>Categories</span>
      </Link>
      <button className="nx77-category-menu-toggle" type="button" aria-label="Open category quick menu" aria-haspopup="true" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><UiIcon name="chevron-down" size={15}/></button>
    </div>
    <nav className="nx35-category-dropdown" aria-label="Category and subcategory navigation">
      <div className="nx35-category-heading"><span>EXPLORE BY CATEGORY</span><Link to="/categories" onClick={close}>View all <UiIcon name="chevron-right" size={15}/></Link></div>
      {data.error ? <p className="nx35-category-empty" role="alert">Categories are temporarily unavailable. <Link to="/categories" onClick={close}>Browse collections</Link></p>
        : categories.length ? <ul className="nx35-category-roots">{categories.map(category => <MenuBranch key={category.id} category={category} close={close}/>)}</ul>
          : <p className="nx35-category-empty">Loading categories…</p>}
    </nav>
  </div>;
}
