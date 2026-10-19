import {useEffect,useState} from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import {apiAssetUrl} from "../../services/apiClient";
import {getAdminCategories} from "../../services/categoryService";
import {getAdminBanners,saveBanner,setBannerActive} from "../../services/bannerService";
import {categoryPaths} from "../../services/categoryHierarchy";
const blank=()=>({title:"",subtitle:"",position:"home",categoryId:"",linkUrl:"/products",sortOrder:"0",image:null});
export default function AdminBanners(){
 const [items,setItems]=useState([]),[categories,setCategories]=useState([]),[draft,setDraft]=useState(blank),[editing,setEditing]=useState(null);
 const [opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 async function reload(){const [b,c]=await Promise.all([getAdminBanners(),getAdminCategories()]);setItems(b.banners||[]);setCategories(c.categories||[]);}
 useEffect(()=>{let alive=true;Promise.all([getAdminBanners(),getAdminCategories()]).then(([b,c])=>{if(alive){setItems(b.banners||[]);setCategories(c.categories||[]);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false};},[]);
 const paths=categoryPaths(categories);
 function edit(item){setEditing(item);setDraft({title:item?.title||"",subtitle:item?.subtitle||"",position:item?.position||"home",categoryId:item?.categoryId||"",linkUrl:item?.linkUrl||"/products",sortOrder:String(item?.sortOrder||0),image:null});setError("");setOpened(true)}
 async function submit(e){e.preventDefault();setBusy(true);setError("");try{
   const data=new FormData();for(const key of ['title','subtitle','position','categoryId','linkUrl','sortOrder'])data.append(key,key==='categoryId'&&draft.position==='home'?'':draft[key]);
   if(draft.image)data.append('image',draft.image);
   await saveBanner(editing?.id,data);await reload();setOpened(false);setNotice('Promotion saved successfully.');
  }catch(err){setError(err.message)}finally{setBusy(false)}
 }
 async function toggle(item){setBusy(true);setError("");try{await setBannerActive(item.id,!item.isActive);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <AdminLayout title="Promotion Studio" subtitle="Create homepage and category-specific promotions with locally uploaded artwork."
 actions={<button type="button" className="admin-primary-action" onClick={()=>edit(null)}>+ New promotion</button>}>
  {error&&!opened&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p role="status" className="admin-form-message">{notice}</p>}
  <section className="nx17-admin-banner-grid">{items.map(item=><article className="nx17-banner-card" key={item.id}>
    <img src={apiAssetUrl(item.imageUrl)} alt=""/><div><strong>{item.title}</strong><p>{item.position==='home'?'Homepage':item.position==='both'?`Home + ${item.categoryName||item.categoryId}`:`Category: ${item.categoryName||item.categoryId}`} · {item.isActive?'Active':'Inactive'} · Position {item.sortOrder}</p>
    <div className="nx17-banner-actions"><button type="button" onClick={()=>edit(item)}>Edit</button><button type="button" disabled={busy} onClick={()=>toggle(item)}>{item.isActive?'Hide':'Publish'}</button></div></div>
   </article>)}{!items.length&&<div className="admin-empty">No promotions yet. Add a banner to get started.</div>}</section>
  {opened&&<Modal title={editing?'Edit promotion':'New promotion'} size="medium" onClose={()=>!busy&&setOpened(false)} closeDisabled={busy}>
   <form className="admin-form nx17-banner-form" onSubmit={submit}>
    <label>Headline<input required maxLength={150} value={draft.title} onChange={e=>setDraft(p=>({...p,title:e.target.value}))}/></label>
    <label>Subtitle<input maxLength={300} value={draft.subtitle} onChange={e=>setDraft(p=>({...p,subtitle:e.target.value}))}/></label>
    <label>Placement<select value={draft.position} onChange={e=>setDraft(p=>({...p,position:e.target.value,categoryId:""}))}><option value="home">Homepage only</option><option value="category">Category or subcategory only</option><option value="both">Homepage and selected category / subcategory</option></select></label>
    {draft.position!=='home'&&<label>Choose target category / subcategory<select required value={draft.categoryId} onChange={e=>setDraft(p=>({...p,categoryId:e.target.value}))}><option value="">Select category</option>{paths.map(c=><option key={c.id} value={c.id}>{c.path}</option>)}</select></label>}
    <div className="nx18-destination-controls">
      <label>Destination type<select value={draft.linkUrl.startsWith("https://") ? "external" : "internal"}
        onChange={e=>setDraft(p=>({...p,linkUrl:e.target.value==="external"?"https://":"/products"}))}>
        <option value="internal">Page within Nexora</option><option value="external">External website (HTTPS)</option>
      </select></label>
      {!draft.linkUrl.startsWith("https://") && <label>Quick destination<select value="" onChange={e=>setDraft(p=>({...p,linkUrl:e.target.value}))}>
        <option value="">Select a page, or enter a custom path below</option>
        <option value="/">Homepage</option><option value="/products">All products</option><option value="/categories">Category directory</option>
        {paths.map(c=><option key={c.id} value={`/categories/${c.slug}`}>{c.path}</option>)}
      </select></label>}
      <label>Click destination URL<input required value={draft.linkUrl} placeholder="/categories/laptop or https://example.com/offer"
        onChange={e=>setDraft(p=>({...p,linkUrl:e.target.value}))} />
        <small>Use a Nexora path starting with /, or a full HTTPS link. External links open in a new tab.</small>
      </label>
    </div>
    <label>Slide order<input type="number" min="0" max="10000" value={draft.sortOrder} onChange={e=>setDraft(p=>({...p,sortOrder:e.target.value}))}/></label>
    <label>{editing?'Replace banner image (optional)':'Banner image (required)'}<input required={!editing} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setDraft(p=>({...p,image:e.target.files?.[0]||null}))}/><small>Landscape 1600 × 600 recommended. JPG, PNG or WebP, up to 12 MB.</small></label>
    {error&&<p className="admin-alert" role="alert">{error}</p>}
    <div className="nx-sticky-actions"><button className="admin-primary-action" type="submit" disabled={busy}>{busy?'Saving…':'Save promotion'}</button></div>
   </form>
  </Modal>}
 </AdminLayout>;
}
