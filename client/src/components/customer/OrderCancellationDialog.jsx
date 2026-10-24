import { Button, FormField, IconButton, Textarea } from "../ui/index";
import UiIcon from "../common/UiIcon";
import { useEffect, useRef, useState } from 'react';
const money=value=>`₹${Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function OrderCancellationDialog({order,busy,error,onClose,onConfirm}){
 const [reason,setReason]=useState('');const dialogRef=useRef(null),textRef=useRef(null),previous=useRef(null);
 const valid=reason.trim().length>=10&&reason.trim().length<=200;
 useEffect(()=>{
  previous.current=document.activeElement;const old=document.body.style.overflow;
  document.body.style.overflow='hidden';textRef.current?.focus();
  return()=>{document.body.style.overflow=old;previous.current?.focus?.();};
 },[]);
 function onKeyDown(event){
  if(event.key==='Escape'){event.preventDefault();if(!busy)onClose();}
  if(event.key!=='Tab')return;
  const available=[...dialogRef.current.querySelectorAll('button:not(:disabled),textarea:not(:disabled)')];
  if(!available.length)return;
  if(event.shiftKey&&document.activeElement===available[0]){available.at(-1).focus();event.preventDefault();}
  else if(!event.shiftKey&&document.activeElement===available.at(-1)){available[0].focus();event.preventDefault();}
 }
 return <div className="nx44-modal-backdrop" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
  <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="nx45-cancel-title" aria-describedby="nx45-cancel-details" className="nx44-action-dialog" onKeyDown={onKeyDown}>
   <form onSubmit={event=>{event.preventDefault();if(valid&&!busy)onConfirm(reason.trim());}}>
    <header className="nx44-dialog-head"><div><span className="nx44-dialog-kicker">ORDER ASSISTANCE</span><h2 id="nx45-cancel-title">Request order cancellation</h2></div><IconButton variant="secondary" type="button" className="nx44-dialog-close" onClick={onClose} disabled={busy} aria-label="Close dialog"><UiIcon name="x" size={17}/></IconButton></header>
    <div className="nx44-dialog-body">
     <div className="nx44-order-summary"><span>Order #{order.id}</span><strong>{money(order.total)}</strong></div>
     <p id="nx45-cancel-details">We'll send your request to the Nexora team. The order is not cancelled until an administrator approves it. For online payments, any refund must be processed and confirmed by Razorpay.</p>
     <FormField className="nx44-refund-label" htmlFor="nx45-reason">Why do you want to cancel? <span>*</span></FormField>
     <Textarea ref={textRef} id="nx45-reason" rows={4} minLength={10} maxLength={200} required value={reason} onChange={event=>setReason(event.target.value)} placeholder="Please describe your cancellation request…" disabled={busy}/>
     <div className="nx44-reason-meta"><small>10–200 characters</small><small>{reason.trim().length}/200</small></div>
     {error&&<div className="nx44-dialog-error" role="alert">{error}</div>}
    </div>
    <footer className="nx44-dialog-actions"><Button variant="secondary" type="button" className="nx44-dialog-cancel" onClick={onClose} disabled={busy}>Keep order</Button><Button variant="primary" className="nx44-dialog-submit" type="submit" disabled={!valid||busy}>{busy?'Submitting…':'Send cancellation request'}</Button></footer>
   </form>
  </section>
 </div>;
}
