import { Link } from "react-router-dom";
import StoreFooter from "../components/StoreFooter";
import StoreHeader from "../components/StoreHeader";

export default function About() {
  return <div className="storefront">
    <StoreHeader />
    <main className="content-page">
      <header className="page-hero">
        <p className="eyebrow">About Store</p>
        <h1>Good design should feel effortless.</h1>
        <p>This editable placeholder introduces your brand, its point of view, and the care behind every product in the collection.</p>
      </header>
      <section className="story-grid">
        <article><span>01</span><h2>Our perspective</h2><p>Replace this copy with the story behind your store: what you believe, who you serve, and why your collection deserves attention.</p></article>
        <article><span>02</span><h2>Our selection</h2><p>Describe how you choose products, evaluate quality, and build a catalogue customers can browse with confidence.</p></article>
        <article><span>03</span><h2>Our promise</h2><p>Add your service promise here, including the experience customers can expect before and after every purchase.</p></article>
      </section>
      <section className="content-callout"><div><p className="eyebrow">Explore the edit</p><h2>Find something made for your everyday.</h2></div><Link className="button button-light" to="/products">Shop now</Link></section>
    </main>
    <StoreFooter />
  </div>;
}
