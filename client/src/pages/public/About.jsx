import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { SITE_NAME } from "../../config/site";

export default function About() {
  return <CustomerLayout mainClassName="content-page">
    <header className="page-hero"><p className="eyebrow">Welcome to {SITE_NAME}</p>
      <h1>Discover more, every day.</h1>
      <p>From everyday essentials to the things you love, our demo marketplace brings different product categories into one easy-to-browse experience.</p>
    </header>
    <section className="story-grid">
      <article><span>01</span><h2>Explore by category</h2><p>Find clothing, electronics, home goods, beauty and more through one organized catalogue.</p></article>
      <article><span>02</span><h2>Useful product details</h2><p>See configurations, photos and prices directly from our local store database.</p></article>
      <article><span>03</span><h2>Clear cart totals</h2><p>Build a cart and see current prices and stock. Checkout and payments are not enabled in this demo.</p></article>
    </section>
    <section className="content-callout"><div><p className="eyebrow">Shop your way</p><h2>A collection for all your interests.</h2></div><Link className="button button-light" to="/products">Explore products</Link></section>
  </CustomerLayout>;
}
