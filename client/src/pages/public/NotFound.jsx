import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";

export default function NotFound() {
  return <CustomerLayout mainClassName="nx33-not-found">
    <section className="nx33-not-found-content">
      <p className="eyebrow">Nexora · Page not found</p>
      <span className="nx33-not-found-number" aria-hidden="true">404</span>
      <h1>This page has moved or doesn't exist</h1>
      <p>Browse our collections or head back to the homepage.</p>
      <div className="nx33-not-found-actions">
        <Link className="button button-primary" to="/products">Explore products</Link>
        <Link className="button" to="/">Back to home</Link>
      </div>
    </section>
  </CustomerLayout>;
}
