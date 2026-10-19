import { Link, NavLink } from "react-router-dom";
import BrandLogo from "../common/BrandLogo";

const navigation = [
  { to: "/admin/dashboard", label: "Dashboard", icon: "⌂", end: true },
  { to: "/admin/products", label: "Manage Products", icon: "□" },
  { to: "/admin/featured", label: "Featured Products", icon: "★" },
  { to: "/admin/inventory", label: "Inventory Alerts", icon: "!" },
  { to: "/admin/categories", label: "Manage Categories", icon: "◇" },
  { to: "/admin/banners", label: "Promotions", icon: "▧" },
  { to: "/admin/customers", label: "Customers", icon: "○" },
  { to: "/admin/orders", label: "Orders", icon: "▤" },
  { to: "/admin/analytics", label: "Analytics", icon: "⌁" },
  { to: "/admin/settings", label: "Shipping & Tax", icon: "⚙" },
  { to: "/admin/branding", label: "Branding & Logo", icon: "✦" }
];

export default function AdminSidebar({ admin, isOpen, onClose, onLogout, stockAlertCount = 0 }) {
  const initials = admin.fullName.split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();

  return <aside id="admin-sidebar" className={`admin-sidebar ${isOpen ? "is-open" : ""}`}>
    <Link className="admin-brand" to="/admin/dashboard" onClick={onClose}>
      <BrandLogo markClassName="admin-brand-mark" showAdminLabel />
    </Link>
    <nav className="admin-nav" aria-label="Admin navigation">
      <p>Workspace</p>
      {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}>
        <span aria-hidden="true">{item.icon}</span>{item.label}{item.to === "/admin/inventory" && stockAlertCount > 0 && <span className="nx24-sidebar-count">{stockAlertCount}</span>}
      </NavLink>)}
    </nav>
    <div className="admin-sidebar-footer">
      <Link to="/" onClick={onClose}><span aria-hidden="true">↗</span>View Storefront</Link>
      <button type="button" onClick={onLogout}><span aria-hidden="true">⇥</span>Logout</button>
      <div className="admin-identity">
        <span>{initials}</span>
        <div><strong>{admin.fullName}</strong><small>{admin.email}</small></div>
      </div>
    </div>
  </aside>;
}
