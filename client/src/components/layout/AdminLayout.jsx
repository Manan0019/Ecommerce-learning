import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdmin } from "../../services/adminService";
import { isAuthenticationError } from "../../services/apiClient";
import { logout as endSession } from "../../services/authService";
import AdminSidebar from "./AdminSidebar";

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
        const data = await getAdmin(controller.signal);
        setAdmin(data.user);
      } catch (requestError) {
        if (isAuthenticationError(requestError)) {
          navigate("/login", { replace: true });
          return;
        }
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
      await endSession();
      navigate("/login", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  if (loading) return <div className="admin-loading">Checking administrator session…</div>;
  if (!admin) return <div className="admin-loading" role="alert">{error || "Administrator session unavailable."}</div>;

  return <div className="admin-shell">
    <button className="admin-mobile-toggle" type="button" aria-label="Toggle admin navigation"
      aria-expanded={sidebarOpen} aria-controls="admin-sidebar"
      onClick={() => setSidebarOpen((open) => !open)}>
      <span /><span /><span />
    </button>
    {sidebarOpen && <button className="admin-sidebar-backdrop" type="button" aria-label="Close navigation"
      onClick={() => setSidebarOpen(false)} />}
    <AdminSidebar admin={admin} isOpen={sidebarOpen}
      onClose={() => setSidebarOpen(false)} onLogout={logout} />
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
