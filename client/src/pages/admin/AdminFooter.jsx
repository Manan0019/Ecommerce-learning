import { Button, Card, FormField, IconButton, TextField } from "../../components/ui/index";
import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import UiIcon from '../../components/common/UiIcon';
import FileUploadField from '../../components/admin/FileUploadField';
import {apiAssetUrl} from '../../services/apiClient';
import {getAdminFooter,saveFooterContent,uploadFooterArtwork,removeFooterArtwork} from '../../services/footerService';
const DEFAULT={headlinePrimary:'GOOD THINGS,',headlineAccent:'FOUND HERE.',tickerItems:['NEXORA','DISCOVER','CHOOSE','LOVE YOUR FINDS'],artworkUrl:null};
export default function AdminFooter(){
 const [form,setForm]=useState(DEFAULT),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 useEffect(()=>{getAdminFooter().then(d=>setForm(d.footer||DEFAULT)).catch(e=>setError(e.message));},[]);
 const update=(key,value)=>setForm(f=>({...f,[key]:value}));
 async function save(e){e.preventDefault();setBusy(true);setError('');setMessage('');
  try{const d=await saveFooterContent({headlinePrimary:form.headlinePrimary,headlineAccent:form.headlineAccent,tickerItems:form.tickerItems});setForm(d.footer);setMessage('Footer updated. Reload storefront to see changes.');}
  catch(e){setError(e.message);}finally{setBusy(false);}}
 async function picture(file){if(!file)return;setBusy(true);setError('');setMessage('');
  try{const d=await uploadFooterArtwork(file);setForm(d.footer);setMessage('Footer image updated.');}
  catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(){setBusy(true);setError('');try{const d=await removeFooterArtwork();setForm(d.footer);setMessage('Footer image removed.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminLayout title="Footer & moving banner" subtitle="Edit the message, scrolling text and optional artwork. These changes appear across the storefront.">
  <Card as="section" className="admin-panel nx62-footer-editor">
   {error&&<p role="alert" className="nx62-editor-error">{error}</p>}{message&&<p role="status" className="nx62-editor-success">{message}</p>}
   <form onSubmit={save} className="nx62-editor-form">
    <h2>Footer headline</h2><div className="nx62-editor-grid">
      <FormField>First line<TextField value={form.headlinePrimary} maxLength={80} required onChange={e=>update('headlinePrimary',e.target.value)}/></FormField>
      <FormField>Highlighted words<TextField value={form.headlineAccent} maxLength={80} required onChange={e=>update('headlineAccent',e.target.value)}/></FormField>
    </div>
    <h2>Moving banner phrases</h2><p>Each phrase repeats continuously. A customer can pause the animation by hovering. Remove or reorder text here.</p>
    {form.tickerItems.map((phrase,i)=><div className="nx62-ticker-row" key={i}>
      <TextField aria-label={`Moving phrase ${i+1}`} value={phrase} maxLength={38} required onChange={e=>update('tickerItems',form.tickerItems.map((p,n)=>n===i?e.target.value:p))}/>
      <IconButton variant="secondary" type="button" disabled={i===0} onClick={()=>{const a=[...form.tickerItems];[a[i-1],a[i]]=[a[i],a[i-1]];update('tickerItems',a);}} title="Move up" aria-label={`Move phrase ${i+1} up`}><UiIcon name="up" size={17}/></IconButton>
      <IconButton variant="danger" type="button" disabled={form.tickerItems.length<=2} onClick={()=>update('tickerItems',form.tickerItems.filter((_,n)=>n!==i))} title="Remove phrase" aria-label={`Remove phrase ${i+1}`}><UiIcon name="trash" size={17}/></IconButton>
    </div>)}
    <Button variant="secondary" type="button"  disabled={form.tickerItems.length>=12} onClick={()=>update('tickerItems',[...form.tickerItems,'NEW COLLECTION'])}>Add phrase</Button>
    <div className="nx62-editor-actions"><Button variant="primary" disabled={busy} type="submit" ><><UiIcon name="save" size={17}/>{busy?'Saving…':'Save footer text'}</></Button></div>
   </form>
   <div className="nx62-artwork-form"><h2>Optional footer image</h2><p>Use a small, purposeful brand or collection image. PNG, JPG and WebP up to 5 MB. No image is required.</p>
     {form.artworkUrl&&<img className="nx62-art-preview" src={apiAssetUrl(form.artworkUrl)} alt="Current footer artwork"/>}
     <FileUploadField label="Choose footer artwork" help="PNG, JPEG or WebP · 5 MB maximum" disabled={busy} onChange={e=>{picture(e.target.files?.[0]);e.target.value='';}}/>
     {form.artworkUrl&&<IconButton variant="danger" type="button" disabled={busy}  onClick={remove} title="Remove footer image" aria-label="Remove footer image"><UiIcon name="trash" size={18}/></IconButton>}
   </div>
  </Card>
 </AdminLayout>;
}
