import CustomerLayout from '../../components/layout/CustomerLayout';
import {Link} from 'react-router-dom';
const questions=[
 ['How can I track my order?','Sign in and open My Orders. You can view payment and delivery events for your orders. Courier references shown there are entered by the store and may not provide a live external tracking link.'],
 ['What payment methods are available?','Checkout shows Cash on Delivery and Razorpay online payment when the store has enabled them. The final payable amount is confirmed before you submit.'],
 ['Can I cancel an order?','For eligible orders, request cancellation from My Orders. The administrator reviews the request. Online refunds are processed through the verified Razorpay refund workflow.'],
 ['Is GST included in the displayed price?','The store may use inclusive or exclusive GST pricing. The checkout provides a breakdown of applicable tax, shipping and the final total before you pay.'],
 ['How are delivered orders confirmed?','For deliveries handled by Nexora delivery executives, the customer receives a verification code by email. Share it only when the parcel is being handed to you.'],
 ['How do I write a product review?','Customers who purchased and received a product, with a completed payment, can submit a review on its product page. Reviews appear after approval.']
];
export default function Faq(){return <CustomerLayout mainClassName="nx61-faq"><section className="store-section"><p className="eyebrow">Help & information</p><h1>Frequently asked questions</h1><p>Answers about shopping, orders and deliveries.</p><div className="nx61-faq-list">{questions.map(([q,a])=><details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div><p>Still need help? <Link to="/contact">Contact Nexora</Link>.</p></section></CustomerLayout>}
