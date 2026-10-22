import { orderStages as progression, orderStageNames as labels, getOrderStageProgress } from "../../services/orderProgress";
const eventNames = {delivery_assigned:'Assigned to delivery executive',out_for_delivery:'Out for delivery',failed_attempt:'Delivery attempt unsuccessful',reschedule_requested:'Delivery reschedule requested',refund_processed:'Refund completed',payment_verified:'Payment confirmed',cod_collected:'COD cash received'};
const friendlyEvent = kind => eventNames[kind] || labels[kind] || String(kind||'Update').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const displayDate = value => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "";
};

export default function OrderTimeline({ order, compact = false }) {
  const status = order?.status || "placed";
  const events = Array.isArray(order?.events) ? order.events : [];
  const current = getOrderStageProgress(status).current;
  const online=order?.paymentMethod==='Razorpay';
  return <section className={`nx38-tracking ${compact ? "nx38-tracking-compact" : ""}`} aria-label="Order progress">
    <h3>Order progress</h3>
    {status.startsWith('refund_') ? <div className="nx38-cancelled" role="status">{status==='refund_pending'?'A full refund has been requested. Order dispatch is paused until Razorpay confirms processing.':'Refund needs manual store review. Please contact support.'}</div> : status.startsWith('payment_') ? <div className="nx38-cancelled" role="status">{status==='payment_pending'?'Online payment is pending. This order is not ready for fulfillment; stock is temporarily reserved.':status==='payment_expired'?'Unpaid order expired after payment reconciliation. Stock was restored.':'Payment needs manual store review before any fulfillment.'}</div> : status === "cancelled" ? <div className="nx38-cancelled" role="status">This order was cancelled. Any stock reserved for it was restored.</div> : <ol className="nx38-steps">
      {progression.map((step, index) => <li key={step} className={`${index <= current ? "is-done" : ""} ${index === current ? "is-current" : ""}`} aria-current={index === current ? "step" : undefined}>
        <span className="nx38-step-dot" aria-hidden="true">{index < current ? "✓" : index === current ? "●" : "·"}</span>
        <span>{labels[step]}</span>
      </li>)}
    </ol>}
    {(order.deliveryPartner || order.trackingReference) && <div className="nx38-delivery-info"><strong>Courier / delivery service:</strong> {order.deliveryPartner || "Not specified"}{order.trackingReference && <><span className="nx38-ref-label">Courier tracking ID:</span><code>{order.trackingReference}</code></>}</div>}
    <div className="nx38-cash-state" role="status">{online?(order.refundStatus==='processed'?'Razorpay full refund processed':order.refundStatus==='failed'?'Razorpay refund failed — manual review':order.refundStatus?'Refund '+order.refundStatus+' — awaiting Razorpay confirmation':order.paymentStatus==='razorpay_paid'?'Paid online — Razorpay payment captured':order.paymentStatus==='razorpay_review'?'Online payment needs manual review':order.paymentStatus==='razorpay_expired'?'Unpaid payment expired':'Waiting for verified Razorpay payment'):(order.paymentStatus === 'cod_collected' ? 'Cash on Delivery recorded as collected by the store' : 'Cash on Delivery — collection not yet recorded')}</div>
    {!compact && events.length > 0 && <details className="nx38-history"><summary>Tracking history · {events.length} updates</summary><ol>{events.map((event, i) => <li key={`${event.type}-${i}`}><span>{friendlyEvent(event.type)}</span><time>{displayDate(event.at)}</time>{event.notes && <small>{event.notes}</small>}</li>)}</ol></details>}
  </section>;
}
