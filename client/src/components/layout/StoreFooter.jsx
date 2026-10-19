import { Link } from "react-router-dom";
import { SITE_NAME, SITE_TAGLINE } from "../../config/site";
import BrandLogo from "../common/BrandLogo";

export default function StoreFooter() {
  return <footer className="store-footer">
    <div>
      <Link className="brand footer-brand" to="/"><BrandLogo /></Link>
      <p>{SITE_TAGLINE}</p>
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
