import { useEffect, useRef, useState } from "react";

const money = value => `₹${Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const configMessages = {
  razorpay_unconfigured: "Razorpay keys or mode are not configured correctly in the backend.",
  refund_opt_in_missing: "To enable TEST refunds, add RAZORPAY_REFUNDS_ENABLED=true to server/.env, check RAZORPAY_MODE=test, and restart Express.",
  live_refund_opt_in_missing: "Live refunds are locked. Use Test Mode for development; live refunds require separate authorization.",
};

const actions = {
  refund: { eyebrow: "RAZORPAY · FULL REFUND", heading: "Refund and cancel order", detail: "The refund is submitted to Razorpay. The order stays blocked from dispatch while it is processing. Stock is restored only when Razorpay confirms the refund is processed.", submit: "Request full refund", tone: "danger" },
  "cancel-cod": { eyebrow: "ORDER MANAGEMENT", heading: "Cancel COD order?", detail: "Cancelling this order restores its stock. This action cannot be undone.", submit: "Cancel order", tone: "danger" },
  delivered: { eyebrow: "ORDER MANAGEMENT", heading: "Confirm delivery?", detail: "Confirm that the order was delivered. This is a manual status update.", submit: "Mark delivered", tone: "primary" },
  expire: { eyebrow: "PAYMENT REVIEW", heading: "Review unpaid reservation?", detail: "Nexora will check Razorpay before releasing any reserved stock. This action is allowed only after the required waiting period.", submit: "Verify & expire", tone: "danger" },
  collect: { eyebrow: "CASH COLLECTION", heading: "Confirm COD collection?", detail: "Record that you have received the full COD amount. Only confirm after cash has actually been collected.", submit: "Record cash received", tone: "primary" },
};

export default function OrderActionDialog({ dialog, busy, error, refundConfig, onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const dialogRef = useRef(null);
  const initialRef = useRef(null);
  const previousActive = useRef(null);
  const action = actions[dialog.type];
  const isRefund = dialog.type === "refund";
  const normalizedReason = reason.trim();
  const disabledConfig = isRefund && refundConfig?.enabled === false;
  const canSubmit = !busy && !disabledConfig && (!isRefund || (normalizedReason.length >= 10 && normalizedReason.length <= 200 && acknowledged));

  useEffect(() => {
    previousActive.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    initialRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousActive.current?.focus?.();
    };
  }, []);

  function onKeyDown(event) {
    if (event.key === "Escape") {
      if (!busy) onClose();
      event.preventDefault();
    }
    if (event.key !== "Tab") return;
    const targets = [...dialogRef.current.querySelectorAll('button:not(:disabled), textarea:not(:disabled), input:not(:disabled)')];
    if (!targets.length) return;
    if (event.shiftKey && document.activeElement === targets[0]) {
      targets[targets.length - 1].focus();
      event.preventDefault();
    } else if (!event.shiftKey && document.activeElement === targets[targets.length - 1]) {
      targets[0].focus();
      event.preventDefault();
    }
  }

  function submit(event) {
    event.preventDefault();
    if (canSubmit) onConfirm(isRefund ? normalizedReason : undefined);
  }

  return <div className="nx44-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) onClose(); }}>
    <section ref={dialogRef} className="nx44-action-dialog" role="dialog" aria-modal="true" aria-labelledby="nx44-dialog-heading" aria-describedby="nx44-dialog-detail" onKeyDown={onKeyDown}>
      <form onSubmit={submit}>
        <header className="nx44-dialog-head">
          <div><span className="nx44-dialog-kicker">{action.eyebrow}</span><h2 id="nx44-dialog-heading">{action.heading}</h2></div>
          <button ref={!isRefund ? initialRef : undefined} type="button" className="nx44-dialog-close" aria-label="Close dialog" onClick={onClose} disabled={busy}>×</button>
        </header>
        <div className="nx44-dialog-body">
          <div className="nx44-order-summary"><span>Order #{dialog.order.id}</span><strong>{money(dialog.order.total)}</strong></div>
          <p id="nx44-dialog-detail">{action.detail}</p>
          {isRefund && <>
            <label className="nx44-refund-label" htmlFor="nx44-refund-reason">Reason for refund <span>*</span></label>
            <textarea ref={initialRef} id="nx44-refund-reason" minLength={10} maxLength={200} required rows={4} value={reason} onChange={event => setReason(event.target.value)} placeholder="Explain why this order needs a full refund…" disabled={busy || disabledConfig} />
            <div className="nx44-reason-meta"><small>10–200 characters</small><small>{normalizedReason.length}/200</small></div>
            <label className="nx44-refund-ack"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} disabled={busy || disabledConfig}/><span>I understand this requests a full payment refund and blocks fulfillment. The action cannot be reversed once accepted.</span></label>
            {disabledConfig && <div className="nx44-config-warning" role="status"><strong>Refunds are disabled on the server.</strong><p>{configMessages[refundConfig.reason] || "Check Razorpay refund configuration and restart Express."}</p></div>}
          </>}
          {error && <div className="nx44-dialog-error" role="alert">{error}</div>}
        </div>
        <footer className="nx44-dialog-actions"><button type="button" className="nx44-dialog-cancel" onClick={onClose} disabled={busy}>Keep order</button><button type="submit" className={`nx44-dialog-submit is-${action.tone}`} disabled={!canSubmit}>{busy ? "Processing…" : action.submit}</button></footer>
      </form>
    </section>
  </div>;
}
