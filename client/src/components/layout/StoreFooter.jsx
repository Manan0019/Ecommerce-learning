import { Link } from "react-router-dom";
import { SITE_NAME } from "../../config/site";

export default function StoreFooter() {
  return <footer className="store-footer">
    <div>
      <Link className="brand footer-brand" to="/"><span className="brand-mark">M</span><span>{SITE_NAME}</span></Link>
      <p>Considered essentials for modern living.</p>
    </div>
    <nav aria-label="Footer navigation">
      <Link to="/products">Shop</Link>
      <Link to="/about">About Us</Link>
      <Link to="/contact">Contact Us</Link>
      <Link to="/dashboard">My Profile</Link>
    </nav>
    <p className="footer-note">© {new Date().getFullYear()} {SITE_NAME}</p>
  </footer>;
}
