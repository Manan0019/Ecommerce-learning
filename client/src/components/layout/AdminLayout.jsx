import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdmin } from "../../services/adminService";
import { isAuthenticationError } from "../../services/apiClient";
import { logout as endSession } from "../../services/authService";
import AdminSidebar from "./AdminSidebar";
import { getLowStockAlerts } from "../../services/inventoryService";
import { Link } from "react-router-dom";
import { guardNumberKey, showInvalidField, clearValidField } from "../admin/formValidation";

export default function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stockAlertCount, setStockAlertCount] = useState(0);

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

  useEffect(() => {
    let active = true;
    getLowStockAlerts(0).then(result => { if(active) setStockAlertCount(result.summary?.total || 0); }).catch(() => {});
    return () => { active = false; };
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
      onClose={() => setSidebarOpen(false)} onLogout={logout} stockAlertCount={stockAlertCount} />
    <main className="admin-main" onKeyDownCapture={guardNumberKey} onInvalidCapture={showInvalidField} onInputCapture={clearValidField}>
      <header className="admin-page-header">
        <div><p className="admin-eyebrow">Admin workspace</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        <div className="admin-header-actions">{stockAlertCount > 0 && <Link className="nx24-stock-link" to="/admin/inventory" aria-label={`${stockAlertCount} inventory alerts`}>🔔 {stockAlertCount} stock alerts</Link>}{actions}</div>
      </header>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {children}
    </main>
  </div>;
}
