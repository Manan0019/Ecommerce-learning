import { Link } from "react-router-dom";
import UiIcon from "../common/UiIcon";
import { SITE_NAME } from "../../config/site";
import BrandLogo from "../common/BrandLogo";

export default function AuthLayout({ eyebrow, title, description, children, compact = false, reflection = false, workforce = false }) {
  return <main className={`auth-shell nx32-auth-shell${compact ? " auth-shell-compact" : ""}${reflection ? " nx68-auth-reflect" : ""}`}>
    <section className="auth-visual" aria-label={`${SITE_NAME} introduction`}>
      <Link className="auth-brand" to={workforce ? "/delivery/login" : "/"} aria-label={`${SITE_NAME} ${workforce ? "delivery" : "home"}`}>
        <BrandLogo markClassName="auth-brand-mark" />
      </Link>
      <div className="auth-visual-copy">
        {workforce ? <>
          <p>DELIVERING WITH NEXORA</p>
          <h2>Every delivery matters.</h2>
          <span>Manage your assigned orders, confirm deliveries securely and keep track of your earnings.</span>
          <div className="nx32-auth-trust" aria-label="Delivery workspace features">
            <span>✓ View assignments</span>
            <span>↗ Track progress</span>
            <span>₹ See earnings</span>
          </div>
        </> : <>
          <p>DISCOVER YOUR NEXT FAVOURITE</p>
          <h2>Great finds. One happy place.</h2>
          <span>Fashion, technology and everyday essentials, thoughtfully brought together.</span>
          <Link to="/" className="nx36-auth-explore">Explore the store <UiIcon name="chevron-right" size={17}/></Link>
          <div className="nx32-auth-trust" aria-label="What you can do at Nexora">
            <span>✦ Discover products</span>
            <span>♡ Save favourites</span>
            <span>✓ View your orders</span>
          </div>
        </>}
      </div>
      <div className="nx32-showcase" aria-hidden="true">
        {workforce ? <>
          <div className="nx32-showcase-card nx32-showcase-one"><span>01 / ASSIGN</span><strong>My deliveries</strong></div>
          <div className="nx32-showcase-card nx32-showcase-two"><span>02 / CONFIRM</span><strong>Verified drop-offs</strong></div>
          <div className="nx32-showcase-card nx32-showcase-three"><span>03 / EARN</span><strong>My earnings</strong></div>
        </> : <>
          <div className="nx32-showcase-card nx32-showcase-one"><span>01 / DISCOVER</span><strong>Fresh styles</strong></div>
          <div className="nx32-showcase-card nx32-showcase-two"><span>02 / EXPLORE</span><strong>New tech</strong></div>
          <div className="nx32-showcase-card nx32-showcase-three"><span>03 / LOVE</span><strong>Your kind of find</strong></div>
        </>}
      </div>
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
