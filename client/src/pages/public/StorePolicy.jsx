import {Link} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import {SITE_NAME,SITE_SUPPORT_EMAIL,SITE_SUPPORT_PHONE,SITE_MERCHANT_NAME,SITE_MERCHANT_ADDRESS,SITE_GRIEVANCE_NAME,SITE_POLICIES_COMPLETE} from '../../config/site';
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
export default function StorePolicy({kind='terms'}){
 const entry=entries[kind]||entries.terms;
 return <CustomerLayout mainClassName="nx82-policy-page">
  <nav aria-label="Breadcrumb" className="nx82-policy-crumb"><Link className="nx83-policy-animated-link" to="/"><span>Home</span></Link><span> / </span>{entry.title}</nav>
  <header className="nx82-policy-heading"><p>SHOP WITH CONFIDENCE</p><h1>{entry.title}</h1><span>{entry.sub}</span></header>
  {!SITE_POLICIES_COMPLETE&&<aside className="nx82-policy-warning" role="status"><strong>Merchant publication pending.</strong> These are draft customer disclosures, not finalized policies. Real merchant contact details, delivery promises, return windows and legal review are required before live payment onboarding.</aside>}
  <div className="nx82-policy-layout"><article className="nx82-policy-body">{entry.sections.map(([heading,content],i)=><section key={heading}><small>{String(i+1).padStart(2,'0')}</small><div><h2>{heading}</h2><p>{content}</p></div></section>)}</article>
  <aside className="nx82-policy-contact"><strong>Merchant & support</strong><p>{SITE_MERCHANT_NAME||'Legal business name: to be published'}</p><p>{SITE_MERCHANT_ADDRESS||'Registered business address: to be published'}</p><p>{SITE_SUPPORT_EMAIL?<a className="nx83-policy-animated-link" href={`mailto:${SITE_SUPPORT_EMAIL}`}><span>{SITE_SUPPORT_EMAIL}</span></a>:'Support email: to be published'}</p><p>{SITE_SUPPORT_PHONE||'Support phone: to be published'}</p><p>Grievance officer: {SITE_GRIEVANCE_NAME||'to be published'}</p><Link className="nx83-policy-animated-link nx83-policy-support-link" to="/contact"><span>Contact customer support</span><span aria-hidden="true" className="nx83-policy-support-arrow">→</span></Link></aside></div>
  <nav aria-label="Store policies" className="nx82-policy-other">
   {[['terms','/terms','Terms'],['privacy','/privacy','Privacy'],['refunds','/returns-refunds','Returns & refunds'],['shipping','/shipping-policy','Shipping']].map(([policy,to,label])=><Link key={policy} to={to} className="nx83-policy-animated-link" aria-current={kind===policy?'page':undefined}><span>{label}</span></Link>)}
  </nav>
 </CustomerLayout>;
}
