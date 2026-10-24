import { Button } from "../../components/ui/index";
import {Link} from 'react-router-dom';
import UiIcon from '../../components/common/UiIcon';
import CustomerLayout from '../../components/layout/CustomerLayout';
import {SITE_SUPPORT_EMAIL,SITE_SUPPORT_PHONE,SITE_MERCHANT_NAME,SITE_MERCHANT_ADDRESS,SITE_GRIEVANCE_NAME,SITE_POLICIES_COMPLETE} from '../../config/site';
const entries={
 terms:{title:'Terms & conditions',sub:'How orders, payments and shopping work.',sections:[
  ['Your order','Product descriptions, availability and final payable amounts are displayed at checkout. Submitting an order creates a request which may be accepted, fulfilled or cancelled under the disclosed policies.'],
  ['Payments','The available methods and tax breakdown are shown before payment. Card/UPI details are handled by our payment provider; Nexora does not ask you to send these credentials by email.'],
  ['Your responsibilities','Provide accurate delivery details. Do not misuse offers or attempt unauthorized access to customer and delivery accounts.'],
  ['Questions and disputes','Contact our published support and grievance officer. Applicable Indian consumer rights are not excluded by these terms.']]},
 privacy:{title:'Privacy policy',sub:'How account and order information is handled.',sections:[
  ['Information collected','We process account identifiers, contact and delivery addresses, product and order details, payment references, and communications needed to operate the store.'],
  ['Why we use it','To authenticate accounts, fulfill purchases, send transactional status messages, provide customer support, prevent fraud and manage lawful records. Newsletter marketing requires a separate confirmation.'],
  ['Providers','Payment processing, shipping and email providers may receive the minimum necessary data for their services. Never include banking passwords or card PINs in support messages.'],
  ['Retention and requests','Retention is determined by applicable tax, consumer and operational requirements. Contact the merchant for access, correction or complaints. The merchant must publish its finalized retention and deletion periods before launch.']]},
 refunds:{title:'Returns, cancellation & refunds',sub:'Review the conditions before placing your order.',sections:[
  ['Cancellations','Request eligible cancellation from My Orders. Orders that have entered dispatch or require verified online refunds follow the order-specific approval workflow.'],
  ['Defective or incorrect products','Please contact support with your order ID and images for damaged, defective, incorrect or misdescribed products. Your statutory consumer remedies remain available.'],
  ['Returns and exclusions','The merchant must confirm product-category eligibility, return window, return-shipping costs and condition requirements before accepting live orders. No unverified return period is promised here.'],
  ['Refund method and timeline','Approved prepaid refunds are initiated through the payment provider. The final settlement timeline depends on the issuing institution. COD refunds require an independently arranged refund method after verification.']]},
 shipping:{title:'Shipping & delivery',sub:'Tracking, handling and address requirements.',sections:[
  ['Delivery availability','Shipping fees, available service areas and taxes are calculated during checkout and depend on the destination and order.'],
  ['Dispatch and tracking','Orders progress from confirmed through preparing, dispatched and delivered. Tracking references are shown in My Orders when provided.'],
  ['Delivery confirmation','Assigned deliveries can require an email OTP at the handover. Share the code only after receiving your order.'],
  ['Delivery times','The merchant must publish a realistic dispatch and delivery range for each service region before launch. Contact support if your order is delayed.']]}
};
const policyLinks = [
  ['terms','/terms','Terms & conditions','list'],
  ['privacy','/privacy','Privacy','eye'],
  ['refunds','/returns-refunds','Returns & refunds','refresh-cw'],
  ['shipping','/shipping-policy','Shipping & delivery','truck']
];
export default function StorePolicy({kind='terms'}){
 const entry=entries[kind]||entries.terms;
 const currentIndex=Math.max(0,policyLinks.findIndex(([key])=>key===kind));
 const nextPolicy=policyLinks[(currentIndex+1)%policyLinks.length];
 const topicIcon=policyLinks[currentIndex][3];
 return <CustomerLayout mainClassName="nx82-policy-page nx84-policy-page">
  <nav aria-label="Breadcrumb" className="nx82-policy-crumb"><Link className="nx83-policy-animated-link" to="/"><span>Home</span></Link><UiIcon name="chevron-right" size={13}/><span aria-current="page">{entry.title}</span></nav>
  <header className="nx82-policy-heading nx84-policy-hero">
   <div className="nx84-policy-hero-copy"><p className="nx84-policy-eyebrow"><span className="nx84-policy-eyebrow-dot"/> NEXORA · CUSTOMER INFORMATION</p><h1>{entry.title}</h1><span>{entry.sub}</span><div className="nx84-policy-hero-foot"><UiIcon name="check-circle" size={17}/><span>Clear information for a more confident shopping experience</span></div></div>
   <div className="nx84-policy-hero-art" aria-hidden="true"><div className="nx84-policy-art-glow"/><div className="nx84-policy-art-symbol"><UiIcon name={topicIcon} size={68}/></div><div className="nx84-policy-art-lines"><i/><i/><i/></div></div>
  </header>
  <nav aria-label="Customer policies" className="nx82-policy-other nx84-policy-tabs">
   {policyLinks.map(([policy,to,label,icon])=><Link key={policy} to={to} className="nx83-policy-animated-link nx84-policy-tab" aria-current={kind===policy?'page':undefined}><UiIcon name={icon} size={18}/><span>{label}</span>{kind===policy&&<span className="nx84-policy-selected" aria-hidden="true"><UiIcon name="check" size={15}/></span>}</Link>)}
  </nav>
  {!SITE_POLICIES_COMPLETE&&<aside className="nx82-policy-warning nx84-policy-warning" role="status"><UiIcon name="check-circle" size={21}/><div><strong>Merchant publication pending</strong><p>These are draft customer disclosures, not finalized policies. Real merchant contact details, delivery promises, return windows and legal review are required before live payment onboarding.</p></div></aside>}
  <div className="nx82-policy-layout nx84-policy-layout">
   <article className="nx82-policy-body nx84-policy-body" aria-label={`${entry.title} details`}>
    <div className="nx84-policy-document-head"><div><p>THE DETAILS</p><h2>What you should know</h2></div><span>{String(entry.sections.length).padStart(2,'0')} topics</span></div>
    {entry.sections.map(([heading,content],i)=><section key={heading} id={`policy-section-${i+1}`}><small>{String(i+1).padStart(2,'0')}</small><div><h2>{heading}</h2><p>{content}</p></div></section>)}
    <div className="nx84-policy-document-foot"><UiIcon name="check-circle" size={20}/><p>Questions about an order or these policies? Our customer support page is the best place to start.</p><Link className="nx83-policy-animated-link" to="/contact"><span>Get support</span><UiIcon name="right" size={16}/></Link></div>
   </article>
   <aside className="nx82-policy-contact nx84-policy-contact" aria-label="Merchant and support contact">
    <div className="nx84-policy-aside-heading"><span className="nx84-policy-aside-icon"><UiIcon name="store" size={23}/></span><div><small>NEED ASSISTANCE?</small><strong>Merchant & support</strong></div></div>
    <div className="nx84-policy-contact-list"><div><small>Registered business</small><p>{SITE_MERCHANT_NAME||'Legal business name: to be published'}</p></div><div><small>Business address</small><p>{SITE_MERCHANT_ADDRESS||'Registered business address: to be published'}</p></div><div><small>Customer service</small><p>{SITE_SUPPORT_EMAIL?<a className="nx83-policy-animated-link" href={`mailto:${SITE_SUPPORT_EMAIL}`}><span>{SITE_SUPPORT_EMAIL}</span></a>:'Support email: to be published'}</p><p>{SITE_SUPPORT_PHONE||'Support phone: to be published'}</p></div><div><small>Grievance contact</small><p>{SITE_GRIEVANCE_NAME||'To be published'}</p></div></div>
    <Button as={Link} variant="secondary" className="nx83-policy-animated-link nx83-policy-support-link nx84-policy-contact-action" to="/contact"><span>Contact customer support</span><span aria-hidden="true" className="nx83-policy-support-arrow"><UiIcon name="right" size={18}/></span></Button>
    <div className="nx84-policy-jump"><strong>On this page</strong>{entry.sections.map(([heading],i)=><a key={heading} href={`#policy-section-${i+1}`}><span>{String(i+1).padStart(2,'0')}</span>{heading}</a>)}</div>
   </aside>
  </div>
  <footer className="nx84-policy-bottom"><div><span>CONTINUE EXPLORING</span><h2>More shopping information</h2><p>Everything you need to know, all in one place.</p></div><Link className="nx83-policy-animated-link nx84-policy-next" to={nextPolicy[1]}><UiIcon name={nextPolicy[3]} size={20}/><span>{nextPolicy[2]}</span><UiIcon name="right" size={19}/></Link></footer>
 </CustomerLayout>;
}
