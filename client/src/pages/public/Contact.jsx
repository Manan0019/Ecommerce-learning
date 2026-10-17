import CustomerLayout from "../../components/layout/CustomerLayout";
import { SITE_NAME, SITE_SUPPORT_EMAIL } from "../../config/site";

export default function Contact() {
  return <CustomerLayout mainClassName="content-page contact-page">
    <header className="page-hero"><p className="eyebrow">Contact {SITE_NAME}</p><h1>We're here to help you explore.</h1>
      <p>This is a local-development demo store. The details shown below are placeholders and are not monitored contact channels.</p></header>
    <div className="contact-layout">
      <section className="contact-details">
        <div><p className="eyebrow">Demo email</p><p>{SITE_SUPPORT_EMAIL}</p></div>
        <div><p className="eyebrow">Demo location</p><address>India · Example address (not a physical store)</address></div>
        <div><p className="eyebrow">Store status</p><p>Local development · Cart preview only</p></div>
      </section>
      <section className="admin-panel nx-demo-contact"><h2>Get in touch</h2><p>A working support form will be added when this demo is prepared for deployment. No message is sent from this page today.</p>
        <div className="nx-upload-tip">To update this page later, change the centralized store settings in <code>client/src/config/site.js</code>.</div></section>
    </div>
  </CustomerLayout>;
}
