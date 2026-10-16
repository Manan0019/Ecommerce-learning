import StoreFooter from "../components/StoreFooter";
import StoreHeader from "../components/StoreHeader";

export default function Contact() {
  return <div className="storefront">
    <StoreHeader />
    <main className="content-page contact-page">
      <header className="page-hero">
        <p className="eyebrow">Contact us</p>
        <h1>We’d love to hear from you.</h1>
        <p>This page uses editable placeholder details. Replace them with your support channels, business hours, and location before launch.</p>
      </header>
      <div className="contact-layout">
        <section className="contact-details">
          <div><p className="eyebrow">Email</p><a href="mailto:hello@example.com">hello@example.com</a></div>
          <div><p className="eyebrow">Phone</p><a href="tel:+910000000000">+91 00000 00000</a></div>
          <div><p className="eyebrow">Studio</p><address>Your business address<br />City, State, PIN</address></div>
          <div><p className="eyebrow">Hours</p><p>Monday–Friday<br />9:00 AM–6:00 PM</p></div>
        </section>
        <form className="contact-form" onSubmit={(event) => event.preventDefault()}>
          <h2>Send a message</h2>
          <p className="form-note">Connect this placeholder form to your preferred support service before launch.</p>
          <label>Name<input type="text" name="name" autoComplete="name" required /></label>
          <label>Email<input type="email" name="email" autoComplete="email" required /></label>
          <label>Subject<input type="text" name="subject" required /></label>
          <label>Message<textarea name="message" rows="6" required /></label>
          <button className="button button-primary" type="submit">Send message</button>
        </form>
      </div>
    </main>
    <StoreFooter />
  </div>;
}
