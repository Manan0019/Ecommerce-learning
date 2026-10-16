import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";
import { useCart } from "../context/CartContext";

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
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadUser() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          credentials: "include",
          signal: controller.signal
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.user?.role === "customer") setUser(data.user);
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

  function submitSearch(event) {
    event.preventDefault();
    const cleanQuery = query.trim();
    navigate(cleanQuery ? `/products?q=${encodeURIComponent(cleanQuery)}` : "/products");
    setMobileOpen(false);
  }

  async function logout() {
    setAuthError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Could not log out.");
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
      <Link className="brand" to="/" aria-label="Manan's Store home">
        <span className="brand-mark">M</span>
        <span>Manan's Store</span>
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
          <Link to="/#categories" onClick={() => setMobileOpen(false)}>Categories</Link>
          <NavLink to="/about" onClick={() => setMobileOpen(false)}>About Us</NavLink>
          <NavLink to="/contact" onClick={() => setMobileOpen(false)}>Contact Us</NavLink>
        </nav>

        <form className="nav-search" role="search" onSubmit={submitSearch}>
          <label className="sr-only" htmlFor="nav-search-input">Search products</label>
          <input id="nav-search-input" type="search" placeholder="Search" value={query}
            onChange={(event) => setQuery(event.target.value)} />
          <button type="submit" aria-label="Search"><SearchIcon /></button>
        </form>
      </div>

      <div className="nav-actions">
        <Link className="cart-link" to="/cart" aria-label={`Cart with ${itemCount} items`}>
          <CartIcon />
          {itemCount > 0 && <span className="cart-count">{itemCount > 99 ? "99+" : itemCount}</span>}
        </Link>

        {user ? <div className="profile-menu" ref={profileRef}>
          <button className="avatar-button" type="button" aria-label="Open account menu"
            aria-haspopup="menu" aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}>
            {user.profileImageUrl
              ? <img src={`${API_BASE_URL}${user.profileImageUrl}`} alt="" />
              : <span>{initials || "U"}</span>}
          </button>
          {profileOpen && <div className="profile-dropdown" role="menu">
            <p>{user.fullName}</p>
            <Link role="menuitem" to="/dashboard" onClick={() => setProfileOpen(false)}>My Profile</Link>
            <button role="menuitem" type="button" onClick={logout}>Logout</button>
            {authError && <small role="alert">{authError}</small>}
          </div>}
        </div> : <Link className="login-button" to="/login">Login</Link>}
      </div>
    </div>
  </header>;
}
