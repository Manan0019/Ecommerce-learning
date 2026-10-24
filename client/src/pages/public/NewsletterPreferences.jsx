import {useState} from 'react';import {Link,useSearchParams} from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';import {apiRequest} from '../../services/apiClient';
export default function NewsletterPreferences({action='confirm'}){
 const [params]=useSearchParams();const token=params.get('token')||'';
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function submit(){setBusy(true);setError('');setMessage('');try{
  const path=action==='confirm'?'/api/engagement/newsletter/confirm':'/api/engagement/newsletter/unsubscribe';
  const result=await apiRequest(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});setMessage(result.message);
 }catch(e){setError(e.message)}finally{setBusy(false);}}
 const valid=action==='confirm'?/^[a-f0-9]{64}$/.test(token):/^[a-f0-9]{48}$/.test(token);
 return <CustomerLayout mainClassName="nx82-policy-page"><div className="nx82-newsletter-confirm"><p>YOUR PREFERENCES</p><h1>{action==='confirm'?'Confirm your email':'Unsubscribe from Nexora updates'}</h1><span>{action==='confirm'?'Only confirmed addresses can receive marketing emails.':'You will no longer receive promotional emails; important order updates may continue.'}</span>
  {!valid?<p role="alert">This link is invalid or incomplete.</p>:<button type="button" disabled={busy} onClick={submit}>{busy?'Saving…':action==='confirm'?'Confirm subscription':'Unsubscribe'}</button>}
  {error&&<p role="alert">{error}</p>}{message&&<p role="status">{message}</p>}<Link to="/">Return to store</Link></div></CustomerLayout>;
}
