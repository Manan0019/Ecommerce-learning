import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { SITE_NAME } from "../../config/site";
import { useCart } from "../../hooks/useCart";
import { apiAssetUrl } from "../../services/apiClient";
import { getCurrentUser, logout as endSession } from "../../services/authService";
import { getProductSuggestions } from "../../services/productService";

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.65a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" /></svg>;
}

function CartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H6m4 12h.01M17 20h.01" /></svg>;
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
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUser() {
      try {
        const data = await getCurrentUser(controller.signal);
        if (data.user?.role === "customer" || data.user?.role === "admin") setUser(data.user);
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

  const initials = user?.fullName
    ?.split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  return <header className="store-header">
    <div className="navbar">
      <Link className="brand" to="/" aria-label={`${SITE_NAME} home`}>
        <span className="brand-mark">N</span>
        <span>{SITE_NAME}</span>
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
          <NavLink to="/" end onClick={() => setMobileOpen(false)}>Home</NavLink>
          <NavLink to="/products" onClick={() => setMobileOpen(false)}>Shop</NavLink>
          <NavLink to="/categories" onClick={() => setMobileOpen(false)}>Categories</NavLink>
          <NavLink to="/about" onClick={() => setMobileOpen(false)}>About Us</NavLink>
          <NavLink to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</NavLink>
        </nav>

        <form className="nav-search nx-nav-search" role="search" onSubmit={submitSearch} ref={searchRef} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchFocused(false); }}>
          <label className="sr-only" htmlFor="nav-search-input">Search products</label>
          <input id="nav-search-input" type="search" placeholder="Search products" value={query}
            onFocus={() => setSearchFocused(true)} onChange={(event) => { setQuery(event.target.value); setSuggestionsLoading(event.target.value.trim().length >= 2); }} autoComplete="off" aria-autocomplete="list" aria-controls="nx-search-suggestions" aria-expanded={searchFocused && query.trim().length >= 2} />
          <button type="submit" aria-label="Search"><SearchIcon /></button>
          {searchFocused && query.trim().length >= 2 && <div className="nx-search-suggestions" id="nx-search-suggestions" role="region" aria-label="Search suggestions">
            <div className="nx-search-suggestion-heading">Search suggestions</div>
            {suggestionsLoading && <p className="nx-search-empty">Finding matches…</p>}
            {!suggestionsLoading && suggestions.categories.length > 0 && <div className="nx-search-group">
              <span>Categories</span>{suggestions.categories.map(c => <Link onClick={chooseSuggestion} key={`c-${c.id}`} to={`/categories/${encodeURIComponent(c.slug)}`}>▦ {c.name}<small>Collection</small></Link>)}
            </div>}
            {!suggestionsLoading && suggestions.products.length > 0 && <div className="nx-search-group"><span>Products</span>
              {suggestions.products.map(p => <Link key={`p-${p.cardKey || p.id}`} to={`/products/${p.id}${p.selectedVariantId ? `?variant=${encodeURIComponent(p.selectedVariantId)}` : ""}`} onClick={chooseSuggestion}>
                {p.imageUrl ? <img src={apiAssetUrl(p.imageUrl)} alt="" /> : <span className="nx-search-placeholder">◈</span>}
                <span className="nx-search-result-label">{p.name}<small>{p.brand || p.category}</small></span>
              </Link>)}
            </div>}
            {!suggestionsLoading && !suggestions.products.length && !suggestions.categories.length && <p className="nx-search-empty">No direct matches. Try a different product or brand.</p>}
            <button type="submit" className="nx-search-view-all">View all results for “{query.trim()}” →</button>
          </div>}
        </form>
      </div>

      <div className="nav-actions">
        {user?.role === "admin" && <Link className="admin-return-link" to="/admin/dashboard">Admin Dashboard</Link>}
        <Link className="wishlist-header-link" to="/wishlist" aria-label="Wishlist">♡ <span>Wishlist</span></Link>
        <Link className="cart-link" to="/cart" aria-label={`Cart with ${itemCount} items`}>
          <CartIcon />
          {itemCount > 0 && <span className="cart-count">{itemCount > 99 ? "99+" : itemCount}</span>}
        </Link>

        {user ? <div className="profile-menu" ref={profileRef}>
          <button className="avatar-button" type="button" aria-label="Open account menu"
            aria-haspopup="menu" aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}>
            {user.profileImageUrl
              ? <img src={apiAssetUrl(user.profileImageUrl)} alt="" />
              : <span>{initials || "U"}</span>}
          </button>
          {profileOpen && <div className="profile-dropdown" role="menu">
            <p>{user.fullName}</p>
            {user.role === "admin" ? <Link role="menuitem" to="/admin/dashboard" onClick={() => setProfileOpen(false)}>Back to Admin Dashboard</Link> : <Link role="menuitem" to="/dashboard" onClick={() => setProfileOpen(false)}>My Profile</Link>}
            <Link role="menuitem" to="/wishlist" onClick={() => setProfileOpen(false)}>Wishlist</Link>
            <button role="menuitem" type="button" onClick={logout}>Logout</button>
            {authError && <small role="alert">{authError}</small>}
          </div>}
        </div> : <Link className="login-button" to="/login">Login</Link>}
      </div>
    </div>
  </header>;
}
