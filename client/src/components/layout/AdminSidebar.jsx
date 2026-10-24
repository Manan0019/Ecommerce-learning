import { Button, CountBadge } from "../ui/index";
import UiIcon from "../common/UiIcon";
import { useLayoutEffect, useRef } from "react";
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
  { to: "/admin/reviews", label: "Customer Reviews", icon: "★" },
  { to: "/admin/delivery", label: "Delivery Executives", icon: "▱" },
  { to: "/admin/finance", label: "Finance & Payouts", icon: "₹" },
  { to: "/admin/analytics", label: "Analytics", icon: "⌁" },
  { to: "/admin/settings", label: "Shipping & Tax", icon: "⚙" },
  { to: "/admin/branding", label: "Branding & Logo", icon: "✦" },
  { to: "/admin/footer", label: "Footer & Moving Banner", icon: "≈" },
  { to: "/admin/coupons", label: "Coupons", icon: "%" },
  { to: "/admin/storefront-copy", label: "Storefront Wording", icon: "✎" }
];

let rememberedAdminNavScroll = 0;

export default function AdminSidebar({ admin, isOpen, onClose, onLogout, stockAlertCount = 0 }) {
  const scrollRef = useRef(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = rememberedAdminNavScroll;
  }, []);
  const initials = admin.fullName.split(/\s+/).slice(0, 2)
    .map((part) => part[0]).join("").toUpperCase();

  return <aside id="admin-sidebar" className={`admin-sidebar ${isOpen ? "is-open" : ""}`}>
    <Link className="admin-brand" to="/admin/dashboard" onClick={onClose}>
      <BrandLogo markClassName="admin-brand-mark" showAdminLabel />
    </Link>
    <div className="nx64-sidebar-scroll" ref={scrollRef} onScroll={event => { rememberedAdminNavScroll = event.currentTarget.scrollTop; }}><nav className="admin-nav" aria-label="Admin navigation">
      <p>Workspace</p>
      {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.end} onClick={onClose}>
        <span aria-hidden="true">{item.icon}</span>{item.label}{item.to === "/admin/inventory" && stockAlertCount > 0 && <CountBadge className="nx24-sidebar-count">{stockAlertCount}</CountBadge>}
      </NavLink>)}
    </nav></div>
    <div className="admin-sidebar-footer">
      <Link to="/" onClick={onClose}><UiIcon name="store" size={17}/>View Storefront</Link>
      <Button variant="secondary" type="button" onClick={onLogout}><UiIcon name="log-out" size={17}/>Logout</Button>
      <div className="admin-identity">
        <span>{initials}</span>
        <div><strong>{admin.fullName}</strong><small>{admin.email}</small></div>
      </div>
    </div>
  </aside>;
}
