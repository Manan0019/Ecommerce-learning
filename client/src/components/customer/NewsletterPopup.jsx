import { Button, Checkbox, FormField, TextField } from "../ui/index";
import {useEffect,useState} from 'react';
import {apiRequest} from '../../services/apiClient';
import Modal from '../common/Modal';
const KEY='nx61_newsletter_prompt';
export default function NewsletterPopup(){
 const [visible,setVisible]=useState(false),[email,setEmail]=useState(''),[consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{const last=Number(localStorage.getItem(KEY)||0);if(last&&Date.now()-last<30*86400000)return undefined;
    const timer=setTimeout(()=>setVisible(true),14000);return()=>clearTimeout(timer);},[]);
 function close(){localStorage.setItem(KEY,String(Date.now()));setVisible(false);}
 async function subscribe(e){e.preventDefault();if(!consent)return;setBusy(true);setMessage('');try{
   const result=await apiRequest('/api/engagement/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,consent:true})});setMessage(result.message);localStorage.setItem(KEY,String(Date.now()));
  }catch(err){setMessage(err.message);}finally{setBusy(false);}}
 if(!visible)return null;
 return <Modal title="Discover what's next" subtitle="A little more Nexora in your inbox." size="medium" onClose={close}>
  <div className="nx61-newsletter"><div className="nx61-newsletter-art" aria-hidden="true"><span>✦</span><strong>THE NEXORA EDIT</strong><p>New arrivals. Thoughtful picks. Your kind of finds.</p></div>
    <form onSubmit={subscribe}><h3>Be first to know.</h3><p>Get occasional updates on new collections and store announcements. No discount promise, no spam.</p>
    <FormField>Email address<TextField type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" /></FormField>
    <FormField inline className="nx61-consent"><Checkbox type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/> I agree to receive marketing emails. I can unsubscribe.</FormField>
    {message&&<p role="status">{message}</p>}
    <Button variant="primary"  type="submit" disabled={!consent||busy}>{busy?'Saving…':'Subscribe'}</Button>
    <Button variant="secondary" className="nx61-not-now" type="button" onClick={close}>No thanks</Button></form>
  </div>
 </Modal>;
}
