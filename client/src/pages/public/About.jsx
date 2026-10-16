import { Link } from "react-router-dom";
import CustomerLayout from "../../components/layout/CustomerLayout";

export default function About() {
  return <CustomerLayout mainClassName="content-page">
      <header className="page-hero">
        <p className="eyebrow">About Manan&apos;s Electronics</p>
        <h1>Technology should be easier to understand.</h1>
        <p>We organize electronics around clear specifications, current availability, and practical product information.</p>
      </header>
      <section className="story-grid">
        <article><span>01</span><h2>Clear comparisons</h2><p>Structured specifications help customers compare compatible devices and meaningful features.</p></article>
        <article><span>02</span><h2>Real inventory</h2><p>Every listing, image, price, and stock value comes directly from the live store catalogue.</p></article>
        <article><span>03</span><h2>Focused support</h2><p>Our catalogue is designed to make product research straightforward before and after purchase.</p></article>
      </section>
      <section className="content-callout"><div><p className="eyebrow">Explore the edit</p><h2>Find something made for your everyday.</h2></div><Link className="button button-light" to="/products">Shop now</Link></section>
  </CustomerLayout>;
}
