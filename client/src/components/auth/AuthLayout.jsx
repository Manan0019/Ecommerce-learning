import { Link } from "react-router-dom";
import { SITE_NAME } from "../../config/site";

export default function AuthLayout({ eyebrow, title, description, children, compact = false }) {
  return <main className={`auth-shell${compact ? " auth-shell-compact" : ""}`}>
    <section className="auth-visual" aria-label={`${SITE_NAME} introduction`}>
      <Link className="auth-brand" to="/" aria-label={`${SITE_NAME} home`}>
        <span className="auth-brand-mark">{SITE_NAME.charAt(0)}</span>
        <span>{SITE_NAME}</span>
      </Link>

      <div className="auth-visual-copy">
        <p>Designed for what&apos;s next</p>
        <h2>Your next tech upgrade starts here.</h2>
        <span>Discover devices with clear specifications and live availability.</span>
      </div>

      <div className="auth-tech-scene" aria-hidden="true">
        <span className="auth-orbit auth-orbit-one" />
        <span className="auth-orbit auth-orbit-two" />
        <div className="auth-device auth-device-screen"><span /></div>
        <div className="auth-device auth-device-phone"><span /><i /></div>
        <span className="auth-glow" />
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
