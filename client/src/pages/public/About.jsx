import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { SITE_NAME } from "../../config/site";

const values = [
  { no: "01", title: "Find more in less time", icon: "⌕", body: "Browse categories, explore suggestions and narrow down products with useful filters and clear details." },
  { no: "02", title: "Choose the right variation", icon: "◇", body: "See product colors, sizes, specifications, media and current SKU-level price before adding anything to your cart." },
  { no: "03", title: "Know what you're adding", icon: "◎", body: "Cart totals and availability are checked against the product catalogue instead of relying on stored browser prices." }
];
export default function About() {
  return <CustomerLayout mainClassName="content-page nx15-content-page">
    <section className="nx15-editorial-hero">
      <div><p className="eyebrow">Our story · {SITE_NAME}</p><h1>One place for all the things you love.</h1>
        <p>We believe browsing should feel thoughtful and effortless. From everyday essentials to exciting discoveries, {SITE_NAME} brings your interests together in one clear shopping experience.</p>
        <Link className="button button-primary" to="/categories">Discover our categories</Link></div>
      <div className="nx15-editorial-art" aria-hidden="true"><span>n.</span><small>DISCOVER MORE / EVERY DAY</small></div>
    </section>
    <section className="nx15-story-section"><div className="nx15-story-intro"><p className="eyebrow">Designed for discovery</p><h2>More clarity. More choice. Less clutter.</h2><p>Find the right item, compare options and build your ideal cart without extra steps.</p></div>
      <div className="nx15-values-grid">{values.map(v => <article className="nx15-value-card" key={v.no}><span className="nx15-value-icon">{v.icon}</span><small>{v.no}</small><h3>{v.title}</h3><p>{v.body}</p></article>)}</div>
    </section>
    <section className="nx15-disclosure"><strong>About this demo</strong><p>{SITE_NAME} is currently a locally developed demonstration store. It offers product browsing and cart estimates only. Orders, payment collection, delivery and reviews are not enabled. Business details are placeholders.</p></section>
    <section className="nx15-cta"><div><p className="eyebrow">Explore your interests</p><h2>Something interesting is always around the corner.</h2></div><Link className="button button-light" to="/products">Browse our catalogue →</Link></section>
  </CustomerLayout>;
}
