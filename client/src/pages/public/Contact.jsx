import { useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { SITE_NAME, SITE_SUPPORT_EMAIL } from "../../config/site";

const faqs = [
  { question: "Can I place an order?", answer: "Not yet. This local demonstration includes product browsing, wishlists and cart pricing, but checkout and payments are intentionally unavailable." },
  { question: "Where do product prices come from?", answer: "The storefront reads catalogue prices from PostgreSQL. The cart checks prices and available SKU stock through the backend before showing totals." },
  { question: "Can I choose size, color or other variations?", answer: "Yes. Products that have configurations allow you to choose a specific SKU before you add it to your cart." },
  { question: "Is the demo support email monitored?", answer: "No. The email address and location below are placeholders. No customer support requests or messages are currently processed." }
];
export default function Contact() {
  const [open, setOpen] = useState(0);
  return <CustomerLayout mainClassName="content-page nx15-content-page nx15-contact-page">
    <header className="nx15-page-intro"><p className="eyebrow">Contact · {SITE_NAME}</p><h1>Need a hand finding your way?</h1>
      <p>Here are answers to the most common questions about this demonstration store.</p></header>
    <div className="nx15-contact-layout">
      <section className="nx15-contact-main"><p className="eyebrow">Frequently asked questions</p><h2>Everything worth knowing.</h2>
        <div className="nx15-faq-list">{faqs.map((item,i) => <div key={item.question} className="nx15-faq-item">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{item.question}</span><span aria-hidden="true">{open === i ? "−" : "+"}</span></button>
          {open === i && <p>{item.answer}</p>}
        </div>)}</div>
      </section>
      <aside className="nx15-contact-aside"><span className="nx15-contact-icon" aria-hidden="true">✉</span><h2>Store information</h2>
        <p>We are still developing the website locally, so these details are illustrative rather than live contact channels.</p>
        <div><small>Example email</small><strong>{SITE_SUPPORT_EMAIL}</strong></div>
        <div><small>Example location</small><strong>India · Demo store</strong></div>
        <div><small>Current store mode</small><strong>Browse & cart preview</strong></div>
        <p className="nx15-contact-note">No contact form is connected and no messages are transmitted from this page.</p>
      </aside>
    </div>
  </CustomerLayout>;
}
