import { useState } from "react";
import CustomerLayout from "../../components/layout/CustomerLayout";
import { SITE_NAME, SITE_SUPPORT_EMAIL } from "../../config/site";

const faqs = [
  { question: "Can I place an order?", answer: "Yes. Add products to your cart, choose a delivery address, and pay through an available checkout method." },
  { question: "Where do product prices come from?", answer: "Prices are shown on each product page and confirmed in your cart and checkout." },
  { question: "Can I choose size, color or other variations?", answer: "Yes. Products that have configurations allow you to choose a specific SKU before you add it to your cart." },
  { question: "How do I get help with an order?", answer: "Check My Orders for status updates. Contact details will be shared here when customer support is available." }
];
export default function Contact() {
  const [open, setOpen] = useState(0);
  return <CustomerLayout mainClassName="content-page nx15-content-page nx15-contact-page">
    <header className="nx15-page-intro"><p className="eyebrow">Contact · {SITE_NAME}</p><h1>Need a hand finding your way?</h1>
      <p>Find answers to your shopping and order questions.</p></header>
    <div className="nx15-contact-layout">
      <section className="nx15-contact-main"><p className="eyebrow">Frequently asked questions</p><h2>Everything worth knowing.</h2>
        <div className="nx15-faq-list">{faqs.map((item,i) => <div key={item.question} className="nx15-faq-item">
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span>{item.question}</span><span aria-hidden="true">{open === i ? "−" : "+"}</span></button>
          {open === i && <p>{item.answer}</p>}
        </div>)}</div>
      </section>
      <aside className="nx15-contact-aside"><span className="nx15-contact-icon" aria-hidden="true">✉</span><h2>Store information</h2>
        <p>For order updates, start with My Orders. Our contact details will be published here when support opens.</p>
        <div><small>Customer support</small><strong>{SITE_SUPPORT_EMAIL ? <a href={`mailto:${SITE_SUPPORT_EMAIL}`}>{SITE_SUPPORT_EMAIL}</a> : "Support details pending publication"}</strong></div>
        <div><small>Location</small><strong>India</strong></div>
        <div><small>Available services</small><strong>Shopping & order tracking</strong></div>
        
      </aside>
    </div>
  </CustomerLayout>;
}
