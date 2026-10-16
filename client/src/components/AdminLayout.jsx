import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/api";

const navigation = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "⌂", end: true },
  { to: "/admin/products", label: "Manage Products", icon: "□" },
  { to: "/admin/categories", label: "Manage Categories", icon: "◇" },
  { to: "/admin/customers", label: "Customers", icon: "○" },
  { to: "/admin/orders", label: "Orders", icon: "▤" },
  { to: "/admin/analytics", label: "Analytics", icon: "⌁" },
  { to: "/admin/settings", label: "Settings", icon: "⚙" }
];

export default function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAdmin() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/me`, {
          credentials: "include",
          signal: controller.signal
        });
        if (response.status === 401 || response.status === 403) {
          navigate("/login", { replace: true });
          return;
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load administrator profile.");
        setAdmin(data.user);
      } catch (requestError) {
        if (requestError.name !== "AbortError") setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    loadAdmin();
    return () => controller.abort();
  }, [navigate]);

  useEffect(() => {
    function closeWithEscape(event) {
      if (event.key === "Escape") setSidebarOpen(false);
    }
    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, []);

  async function logout() {
    setError("");
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Logout failed.");
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <div className="admin-loading">Checking administrator session…</div>;
  if (!admin) return <div className="admin-loading" role="alert">{error || "Administrator session unavailable."}</div>;

  const initials = admin.fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return <div className="admin-shell">
    <button className="admin-mobile-toggle" type="button" aria-label="Toggle admin navigation"
      aria-expanded={sidebarOpen} aria-controls="admin-sidebar"
      onClick={() => setSidebarOpen((open) => !open)}>
      <span /><span /><span />
    </button>
    {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="Close navigation"
      onClick={() => setSidebarOpen(false)} />}

    <aside id="admin-sidebar" className={`admin-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <Link className="admin-brand" to="/admin/dashboard" onClick={() => setSidebarOpen(false)}>
        <span className="admin-brand-mark">M</span>
        <span><strong>Manan&apos;s Store</strong><small>Administration</small></span>
      </Link>

      <nav className="admin-nav" aria-label="Admin navigation">
        <p>Workspace</p>
        {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end}
          onClick={() => setSidebarOpen(false)}>
          <span aria-hidden="true">{item.icon}</span>{item.label}
        </NavLink>)}
      </nav>

      <div className="admin-sidebar-footer">
        <Link to="/" onClick={() => setSidebarOpen(false)}><span aria-hidden="true">↗</span>View Storefront</Link>
        <button type="button" onClick={logout}><span aria-hidden="true">⇥</span>Logout</button>
        <div className="admin-identity">
          <span>{initials}</span>
          <div><strong>{admin.fullName}</strong><small>{admin.email}</small></div>
        </div>
      </div>
    </aside>

    <main className="admin-main">
      <header className="admin-page-header">
        <div><p className="admin-eyebrow">Admin workspace</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        {actions && <div className="admin-header-actions">{actions}</div>}
      </header>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {children}
    </main>
  </div>;
}
