import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAdmin } from "../../services/adminService";
import { isAuthenticationError } from "../../services/apiClient";
import { logout as endSession } from "../../services/authService";
import AdminSidebar from "./AdminSidebar";
import { getLowStockAlerts } from "../../services/inventoryService";
import { Link } from "react-router-dom";
import NotificationBell from "../common/NotificationBell";
import { guardNumberKey, guardNumericPaste, guardNumericBeforeInput, showInvalidField, clearValidField } from "../admin/formValidation";

let lastVerifiedAdmin = null; // In-memory only; cleared on logout or auth failure.

export default function AdminLayout({ title, subtitle, actions, children }) {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState(() => lastVerifiedAdmin);
  const [loading, setLoading] = useState(() => !lastVerifiedAdmin);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stockAlertCount, setStockAlertCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadAdmin() {
      try {
        const data = await getAdmin(controller.signal);
        lastVerifiedAdmin = data.user;
        setAdmin(data.user);
      } catch (requestError) {
        if (isAuthenticationError(requestError)) {
          lastVerifiedAdmin = null;
          setAdmin(null);
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
    if (!admin) return undefined;
    let active = true;
    let current = null;
    const refresh = () => {
      if (!active || document.visibilityState === "hidden") return;
      current?.abort();
      current = new AbortController();
      getLowStockAlerts(0, current.signal)
        .then(result => { if (active) setStockAlertCount(Number(result.summary?.total || 0)); })
        .catch(() => { /* Preserve last-known count across intermittent network errors. */ });
    };
    refresh();
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("nexora:inventory-updated", refresh);
    return () => { active = false; current?.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("nexora:inventory-updated", refresh); };
  }, [admin]);

  async function logout() {
    setError("");
    try {
      await endSession();
      lastVerifiedAdmin = null;
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
    <main className="admin-main nx34-admin-main" onPasteCapture={guardNumericPaste} onBeforeInputCapture={guardNumericBeforeInput} onKeyDownCapture={guardNumberKey} onInvalidCapture={showInvalidField} onInputCapture={clearValidField}>
      <header className="admin-page-header">
        <div><p className="admin-eyebrow">Admin workspace</p><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
        <div className="admin-header-actions"><NotificationBell />{stockAlertCount > 0 && <Link className="nx24-stock-link" to="/admin/inventory" aria-label={`${stockAlertCount} inventory alerts`}><svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg> {stockAlertCount} needs attention</Link>}{actions}</div>
      </header>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {children}
    </main>
  </div>;
}
