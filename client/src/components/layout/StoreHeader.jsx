import { useEffect, useRef, useState } from "react";
import UiIcon from "../common/UiIcon";
import CategoryMiniArtwork from "../customer/CategoryMiniArtwork";
import { Link, useNavigate } from "react-router-dom";
import { SITE_NAME } from "../../config/site";
import BrandLogo from "../common/BrandLogo";
import CategoryMegaMenu from "./CategoryMegaMenu";
import NotificationBell from "../common/NotificationBell";
import { useCart } from "../../hooks/useCart";
import { apiAssetUrl } from "../../services/apiClient";
import { getCurrentUser, logout as endSession } from "../../services/authService";
import { getProductSuggestions } from "../../services/productService";
import { getCategories } from "../../services/categoryService";

function SearchIcon() { return <UiIcon name="search" size={21} />; }

function HeartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.8a5.6 5.6 0 0 0-7.9 0L12 5.7l-.9-.9a5.6 5.6 0 0 0-7.9 7.9L12 21l8.8-8.3a5.6 5.6 0 0 0 0-7.9Z" /></svg>;
}

function CartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6m4 12h.01M17 20h.01" /></svg>;
}

export default function StoreHeader() {
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [suggestions, setSuggestions] = useState({ products: [], categories: [] });
  const [categoryArtwork, setCategoryArtwork] = useState({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUser() {
      try {
        const data = await getCurrentUser(controller.signal);
        if (["customer", "admin", "delivery"].includes(data.user?.role)) setUser(data.user);
      } catch (error) {
        if (error.name !== "AbortError") setAuthError("Account status is unavailable.");
      }
    }
    loadUser();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    function closeMenus(event) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileOpen(false);
      }
      if (event.type === "pointerdown" && profileRef.current &&
          !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("keydown", closeMenus);
    document.addEventListener("pointerdown", closeMenus);
    return () => {
      document.removeEventListener("keydown", closeMenus);
      document.removeEventListener("pointerdown", closeMenus);
    };
  }, []);

  // The suggestion endpoint supplies category names/slugs; the public category
  // directory supplies the uploaded icon artwork without changing the API.
  useEffect(() => {
    const controller = new AbortController();
    getCategories(controller.signal).then(result => {
      if (!controller.signal.aborted) {
        setCategoryArtwork(Object.fromEntries((result.categories || []).map(category => [category.slug, category])));
      }
    }).catch(() => { /* Text suggestions remain usable if artwork is unavailable. */ });
    return () => controller.abort();
  }, []);

  // Suggestions are real active database records; stale requests are cancelled.
  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2) return;
    const controller = new AbortController();
    const task = setTimeout(() => {
      getProductSuggestions(clean, controller.signal)
        .then(data => { if (!controller.signal.aborted) { setSuggestions({ products: data.products || [], categories: data.categories || [] }); setSuggestionsLoading(false); } })
        .catch(() => { if (!controller.signal.aborted) { setSuggestions({ products: [], categories: [] }); setSuggestionsLoading(false); } });
    }, 230);
    return () => { clearTimeout(task); controller.abort(); };
  }, [query]);

  function chooseSuggestion() {
    setSearchFocused(false);
    setQuery("");
    setMobileOpen(false);
  }

  function submitSearch(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    navigate(cleanQuery ? `/products?q=${encodeURIComponent(cleanQuery)}` : "/products");
    setSearchFocused(false);
    setMobileOpen(false);
  }

  async function logout() {
    setAuthError("");
    try {
      await endSession();
      setUser(null);
      setProfileOpen(false);
      navigate("/", { replace: true });
    } catch (error) {
      setAuthError(error.message);
    }
  }

  return <header className="store-header nx34-header">
    <div className="nx34-header-ribbon"><span className="nx34-ribbon-dot" /> <strong>THE NEXORA EDIT</strong><span className="nx34-ribbon-separator" />Discover something worth keeping <span className="nx34-ribbon-arrow">✦</span></div>
    <div className="navbar">
      <Link className="brand" to="/" aria-label={`${SITE_NAME} home`}>
        <BrandLogo showIcon={false} />
      </Link>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label="Toggle navigation"
        aria-expanded={mobileOpen}
        aria-controls="store-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span /><span /><span />
      </button>

      <div id="store-navigation" className={`nav-panel ${mobileOpen ? "is-open" : ""}`}>
        <nav className="store-nav" aria-label="Primary navigation">
          <CategoryMegaMenu mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} />
        </nav>

        <form className="nav-search nx-nav-search" role="search" onSubmit={submitSearch} ref={searchRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false); }}>
          <label className="sr-only" htmlFor="nav-search-input">Search products</label>
          <input id="nav-search-input" type="search" placeholder="Search products, brands and collections" value={query}
            onFocus={() => setSearchFocused(true)} onKeyDown={event => { if (event.key === "Escape") { setSearchFocused(false); event.currentTarget.blur(); } }} onChange={(event) => { setQuery(event.target.value); setSuggestionsLoading(event.target.value.trim().length >= 2); }} autoComplete="off" aria-autocomplete="list" aria-controls="nx-search-suggestions" aria-expanded={searchFocused && query.trim().length >= 2} />
          <button type="submit" className="nx47-search-submit" aria-label="Search"><SearchIcon /></button>
          {searchFocused && query.trim().length >= 2 && <div className="nx-search-suggestions" id="nx-search-suggestions" role="region" aria-label="Search suggestions">
            <div className="nx-search-suggestion-heading">Search suggestions</div>
            {suggestionsLoading && <p className="nx-search-empty">Finding matches…</p>}
            {!suggestionsLoading && suggestions.categories.length > 0 && <div className="nx-search-group">
              <span>Categories</span>{suggestions.categories.map(c => <Link onClick={chooseSuggestion} key={`c-${c.id}`} to={`/categories/${encodeURIComponent(c.slug)}`}><CategoryMiniArtwork category={categoryArtwork[c.slug] || c} className="nx49-search-category-icon"/><span className="nx47-search-category">{c.name}<small>Collection</small></span></Link>)}
            </div>}
            {!suggestionsLoading && suggestions.products.length > 0 && <div className="nx-search-group"><span>Products</span>
              {suggestions.products.map(p => <Link key={`p-${p.cardKey || p.id}`} to={`/products/${p.id}${p.selectedVariantId ? `?variant=${encodeURIComponent(p.selectedVariantId)}` : ""}`} onClick={chooseSuggestion}>
                {p.imageUrl ? <img src={apiAssetUrl(p.imageUrl)} alt="" /> : <span className="nx-search-placeholder"><UiIcon name="bag" size={18}/></span>}
                <span className="nx-search-result-label">{p.name}<small>{p.brand || p.category}</small></span>
              </Link>)}
            </div>}
            {!suggestionsLoading && !suggestions.products.length && !suggestions.categories.length && <p className="nx-search-empty">No direct matches. Try a different product or brand.</p>}
            <button type="submit" className="nx-search-view-all"><span>View all results for “{query.trim()}”</span><span className="nx49-suggestion-action"><UiIcon name="chevron-right" size={16}/></span></button>
          </div>}
        </form>
      </div>

      <div className="nav-actions">
        {user?.role === "customer" && <NotificationBell />}
        {user?.role === "admin" && <Link className="admin-return-link" to="/admin/dashboard">Admin Dashboard</Link>}
        {user?.role === "delivery" && <Link className="admin-return-link" to="/delivery/dashboard">Delivery workspace</Link>}
        {user?.role !== "delivery" && <Link className="wishlist-header-link nx34-wishlist-icon" to="/wishlist" aria-label="View wishlist" title="Wishlist"><HeartIcon /></Link>}
        {user?.role !== "delivery" && <Link className="cart-link" to="/cart" aria-label={`Cart with ${itemCount} items`}>
          <CartIcon />
          {itemCount > 0 && <span className="cart-count">{itemCount > 99 ? "99+" : itemCount}</span>}
        </Link>}

        {user ? <div className="profile-menu" ref={profileRef}>
          <button className="avatar-button" type="button" aria-label="Open account menu" title="Account"
            aria-haspopup="menu" aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4"/><path d="M4.8 20c.35-4.25 3.1-6.35 7.2-6.35s6.85 2.1 7.2 6.35"/></svg>
          </button>
          {profileOpen && <div className="profile-dropdown" role="menu">
            <p>{user.fullName}</p>
            {user.role === "admin" ? <Link role="menuitem" to="/admin/dashboard" onClick={() => setProfileOpen(false)}>Back to Admin Dashboard</Link> : user.role === "delivery" ? <Link role="menuitem" to="/delivery/dashboard" onClick={() => setProfileOpen(false)}>Delivery workspace</Link> : <><Link role="menuitem" to="/dashboard" onClick={() => setProfileOpen(false)}>My Profile</Link><Link role="menuitem" to="/orders" onClick={() => setProfileOpen(false)}>My Orders</Link><Link role="menuitem" to="/addresses" onClick={() => setProfileOpen(false)}>Saved Addresses</Link></>}
            {user.role !== 'delivery' && <Link role="menuitem" to="/wishlist" onClick={() => setProfileOpen(false)}>Wishlist</Link>}
            <button role="menuitem" type="button" onClick={logout}>Logout</button>
            {authError && <small role="alert">{authError}</small>}
          </div>}
        </div> : <Link className="login-button" to="/login">Login</Link>}
      </div>
    </div>
  </header>;
}
