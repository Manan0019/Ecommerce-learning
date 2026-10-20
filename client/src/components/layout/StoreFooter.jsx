import { Link } from "react-router-dom";
import { SITE_NAME, SITE_TAGLINE } from "../../config/site";
import BrandLogo from "../common/BrandLogo";

/** Editorial footer: navigation is always real, no unconfigured social/offer links. */
export default function StoreFooter() {
  return <footer className="store-footer nx34-footer">
    <div className="nx34-footer-top"><span className="nx34-footer-index">N / 001</span>
      <p>GOOD THINGS, <em>FOUND HERE.</em></p><span className="nx34-footer-star" aria-hidden="true">✳</span>
    </div>
    <div className="nx34-footer-main">
      <div className="nx34-footer-about"><Link className="brand footer-brand" to="/"><BrandLogo /></Link>
        <p>{SITE_TAGLINE}</p><span>Explore thoughtfully. Shop confidently.</span>
      </div>
      <nav aria-label="Explore Nexora" className="nx34-footer-nav"><strong>DISCOVER</strong>
        <Link to="/products">All products ↗</Link><Link to="/categories">Collections ↗</Link><Link to="/wishlist">Saved favourites ↗</Link>
      </nav>
      <nav aria-label="Your account" className="nx34-footer-nav"><strong>YOUR SPACE</strong>
        <Link to="/dashboard">Your account ↗</Link><Link to="/orders">Orders ↗</Link><Link to="/addresses">Addresses ↗</Link>
      </nav>
      <nav aria-label="About and contact" className="nx34-footer-nav"><strong>THE DETAILS</strong>
        <Link to="/about">Our story ↗</Link><Link to="/contact">Contact ↗</Link>
      </nav>
    </div>
    <div className="nx34-footer-bottom"><span>© {new Date().getFullYear()} {SITE_NAME}. All rights reserved.</span><span>MADE FOR THE CURIOUS <span aria-hidden="true">✦</span></span></div>
  </footer>;
}
