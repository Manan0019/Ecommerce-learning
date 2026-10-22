import {useEffect,useState} from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import {getAdminStorefrontCopy,saveStorefrontCopy} from '../../services/storefrontCopyService';
const groups=[
 {title:'Top announcement ribbon',fields:[['ribbonLabel','Ribbon label',46],['ribbonMessage','Ribbon message',94]]},
 {title:'Featured collection',fields:[['featuredEyebrow','Small heading',48],['featuredTitle','Section title',70]]},
 {title:'Category collection',fields:[['categoryEyebrow','Small heading',48],['categoryTitle','Section title',70]]},
 {title:'Bottom editorial card',fields:[['editorialEyebrow','Small heading',48],['editorialTitle','Section title',110],['editorialDescription','Description',230],['editorialButton','Button label',40]]}
];
export default function AdminStorefrontCopy(){
 const [copy,setCopy]=useState(null),[error,setError]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{getAdminStorefrontCopy().then(result=>setCopy(result.copy)).catch(e=>setError(e.message));},[]);
 async function save(e){e.preventDefault();setBusy(true);setError('');setMessage('');try{const result=await saveStorefrontCopy(copy);setCopy(result.copy);setMessage('Saved. Refresh the storefront to see your text.');}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <AdminLayout title="Storefront wording" subtitle="Edit the announcement bar, homepage section headings and the bottom editorial card.">
 <section className="admin-panel nx63-store-copy">
 {error&&<p role="alert" className="nx62-editor-error">{error}</p>}{message&&<p role="status" className="nx62-editor-success">{message}</p>}
 {!copy?<p>Loading storefront content…</p>:<form onSubmit={save} className="nx63-copy-form">
 {groups.map(group=><fieldset key={group.title}><legend>{group.title}</legend><div className="nx63-copy-fields">{group.fields.map(([key,label,max])=><label key={key}>{label}{key==='editorialDescription'?<textarea required value={copy[key]||''} maxLength={max} rows={3} onChange={e=>setCopy(f=>({...f,[key]:e.target.value}))}/>:<input required value={copy[key]||''} maxLength={max} onChange={e=>setCopy(f=>({...f,[key]:e.target.value}))}/>}</label>)}</div></fieldset>)}
 <button className="admin-primary-action" type="submit" disabled={busy}>{busy?'Saving…':'Save storefront wording'}</button>
 </form>}
 </section></AdminLayout>;
}
