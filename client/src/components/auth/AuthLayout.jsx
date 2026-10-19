import { Link } from "react-router-dom";
import { SITE_NAME } from "../../config/site";
import BrandLogo from "../common/BrandLogo";

export default function AuthLayout({ eyebrow, title, description, children, compact = false }) {
  return <main className={`auth-shell${compact ? " auth-shell-compact" : ""}`}>
    <section className="auth-visual" aria-label={`${SITE_NAME} introduction`}>
      <Link className="auth-brand" to="/" aria-label={`${SITE_NAME} home`}>
        <BrandLogo markClassName="auth-brand-mark" />
      </Link>

      <div className="auth-visual-copy">
        <p>Curated for everyday life</p>
        <h2>Discover something you’ll love.</h2>
        <span>Explore styles, gadgets, home essentials and more—all in one place.</span>
      </div>

      <div className="nx-auth-art" aria-hidden="true"><span>find.</span><span>love.</span><span>repeat.</span></div>
    </section>

    <section className="auth-form-panel">
      <div className="auth-card">
        <div className="auth-heading">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
      </div>
    </section>
  </main>;
}
