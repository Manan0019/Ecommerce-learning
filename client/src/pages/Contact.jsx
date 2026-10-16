import StoreFooter from "../components/StoreFooter";
import StoreHeader from "../components/StoreHeader";

export default function Contact() {
  return <div className="storefront">
    <StoreHeader />
    <main className="content-page contact-page">
      <header className="page-hero">
        <p className="eyebrow">Contact us</p>
        <h1>We’d love to hear from you.</h1>
      </header>
      <div className="contact-layout">
        <section className="contact-details">
          <div><p className="eyebrow">Email</p><a href="mailto:mananbhayani4@gmail.com">mananbhayani4@gmail.com</a></div>
          <div><p className="eyebrow">Phone</p><a href="tel:+918799315529">+91 87993 15529</a></div>
          <div><p className="eyebrow">Location</p><address>S-02, Shree Nilkanth Business Hub, Near D-mart, Singanpore, Causeway Rd, Katargam, Surat, Gujarat, 395004</address></div>
          <div><p className="eyebrow">Hours</p><p>Monday – Saturday<br />9:30 AM – 6:30 PM</p></div>
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
