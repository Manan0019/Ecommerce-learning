import {useState} from 'react';
import {Link,useLocation,useSearchParams} from 'react-router-dom';
import AuthLayout from '../../components/auth/AuthLayout';
import PasswordField from '../../components/auth/PasswordField';
import {requestPasswordReset,resetPassword} from '../../services/authService';
export default function PasswordRecovery({reset=false}){
 const [params]=useSearchParams();const location=useLocation();const token=params.get('token')||'';
 const [email,setEmail]=useState(typeof location.state?.email === 'string' ? location.state.email : ''),[password,setPassword]=useState(''),[confirmPassword,setConfirm]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e){e.preventDefault();setError('');setNotice('');setBusy(true);
  try {const r=reset?await resetPassword({token,password,confirmPassword}):await requestPasswordReset(email);setNotice(r.message);if(reset){setPassword('');setConfirm('');}}
  catch(e){setError(e.message);}finally{setBusy(false);}
 }
 return <AuthLayout eyebrow="Account security" title={reset?'Choose a new password':'Forgot your password?'} description={reset?'Create a strong password to secure your account.':'Enter your customer account email. We will send a single-use reset link if the account exists.'}>
  <form className="auth-form" onSubmit={submit}>
  {reset?<>
   <PasswordField id="reset-pass" label="New password (12+ characters)" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" required/>
   <PasswordField id="reset-confirm" label="Confirm password" value={confirmPassword} onChange={e=>setConfirm(e.target.value)} autoComplete="new-password" required/>
   {!/^[a-f0-9]{64}$/.test(token)&&<p className="auth-message auth-message-error">Invalid or missing reset link. Request a new one.</p>}
  </>:<label className="auth-field">Email address<input type="email" value={email} autoComplete="email" maxLength={254} onChange={e=>setEmail(e.target.value)} required placeholder="you@example.com"/></label>}
  {error&&<p className="auth-message auth-message-error" role="alert">{error}</p>}
  {notice&&<p className="auth-message auth-message-success" role="status">{notice}</p>}
  <button className="auth-submit" type="submit" disabled={busy||(reset&&!/^[a-f0-9]{64}$/.test(token))}>{busy?'Processing…':reset?'Reset password':'Email reset link'}</button>
  </form><p className="auth-switch"><Link to="/login">Back to sign in</Link></p>
 </AuthLayout>;
}
