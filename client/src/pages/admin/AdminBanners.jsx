import {useEffect,useState} from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import PromotionProductPicker from "../../components/admin/PromotionProductPicker";
import {apiAssetUrl} from "../../services/apiClient";
import {getAdminCategories} from "../../services/categoryService";
import {getAdminBanners,saveBanner,setBannerActive} from "../../services/bannerService";
import {categoryPaths} from "../../services/categoryHierarchy";

const blank=()=>({title:"",subtitle:"",position:"home",categoryId:"",productId:"",productName:"",
  destinationType:"shop",destinationCategoryId:"",destinationProductId:"",destinationProductName:"",
  customLink:"/products",sortOrder:"0",showText:true,image:null});
const categoryPlacement=position=>["category","both"].includes(position);
const productPlacement=position=>["product","home_product"].includes(position);
function parseDestination(url,categories){
  if(url==="/")return {destinationType:"home"};
  if(url==="/products")return {destinationType:"shop"};
  const product=url?.match(/^\/products\/([1-9]\d*)$/);
  if(product)return {destinationType:"product",destinationProductId:product[1]};
  const category=url?.match(/^\/categories\/([^/?#]+)$/);
  if(category){
    let slug=category[1];try {slug=decodeURIComponent(slug);}catch {return {destinationType:"custom",customLink:url};}
    const found=categories.find(c=>c.slug===slug);
    if(found)return {destinationType:"category",destinationCategoryId:String(found.id)};
  }
  return {destinationType:"custom",customLink:url||"/products"};
}
function placementLabel(item){
  if(item.position==="home")return "Homepage";
  if(item.position==="both")return `Homepage + Category: ${item.categoryName||item.categoryId}`;
  if(item.position==="category")return `Category: ${item.categoryName||item.categoryId}`;
  if(item.position==="home_product")return `Homepage + Product: ${item.productName||item.productId}`;
  return `Product page: ${item.productName||item.productId}`;
}

export default function AdminBanners(){
  const [items,setItems]=useState([]),[categories,setCategories]=useState([]),[draft,setDraft]=useState(blank),[editing,setEditing]=useState(null);
  const [opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  async function reload(){const [b,c]=await Promise.all([getAdminBanners(),getAdminCategories()]);setItems(b.banners||[]);setCategories(c.categories||[]);}
  useEffect(()=>{let alive=true;Promise.all([getAdminBanners(),getAdminCategories()]).then(([b,c])=>{if(alive){setItems(b.banners||[]);setCategories(c.categories||[]);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false};},[]);
  const paths=categoryPaths(categories);
  function edit(item){
    setEditing(item);setDraft({...blank(),title:item?.title||"",subtitle:item?.subtitle||"",
      position:item?.position||"home",categoryId:item?.categoryId||"",productId:item?.productId||"",
      productName:item?.productName||"",sortOrder:String(item?.sortOrder??0),showText:item?.showText!==false,...parseDestination(item?.linkUrl,paths)});
    setError("");setNotice("");setOpened(true);
  }
  function destination(){
    if(draft.destinationType==="home")return "/";
    if(draft.destinationType==="shop")return "/products";
    if(draft.destinationType==="product")return draft.destinationProductId?`/products/${draft.destinationProductId}`:null;
    if(draft.destinationType==="category"){
      const c=paths.find(p=>String(p.id)===String(draft.destinationCategoryId));
      return c?`/categories/${encodeURIComponent(c.slug)}`:null;
    }
    return draft.customLink.trim();
  }
  async function submit(e){
    e.preventDefault();setError("");
    const linkUrl=destination();
    if(!linkUrl)return setError("Choose a destination category or product before saving.");
    if(categoryPlacement(draft.position)&&!draft.categoryId)return setError("Choose a category for this promotion placement.");
    if(productPlacement(draft.position)&&!draft.productId)return setError("Choose a product for this promotion placement.");
    setBusy(true);
    try{
      const data=new FormData();
      for(const key of ["title","subtitle","position","sortOrder"])data.append(key,draft[key]);
      data.append("showText",String(draft.showText));
      data.append("categoryId",categoryPlacement(draft.position)?draft.categoryId:"");
      data.append("productId",productPlacement(draft.position)?draft.productId:"");
      data.append("linkUrl",linkUrl);
      if(draft.image)data.append("image",draft.image);
      await saveBanner(editing?.id,data);await reload();setOpened(false);setNotice("Promotion saved successfully.");
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function toggle(item){setBusy(true);setError("");try{await setBannerActive(item.id,!item.isActive);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
  return <AdminLayout title="Promotion Studio" subtitle="Choose where a banner appears and where it redirects—independently."
    actions={<button type="button" className="admin-primary-action" onClick={()=>edit(null)}>+ New promotion</button>}>
    {error&&!opened&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p role="status" className="admin-form-message">{notice}</p>}
    <section className="nx37-promotion-admin-intro" aria-label="Promotion overview">
      <div><strong>{items.filter(item => item.isActive).length}</strong><span>Published banners</span></div>
      <div><strong>{items.filter(item => item.isActive && ["home","both","home_product"].includes(item.position)).length}</strong><span>On homepage</span></div>
      <p>Up to three homepage banners are now visible together. Use <b>Order</b> to control their sequence; image-only banners never receive an extra text overlay.</p>
    </section>
    <section className="nx17-admin-banner-grid">{items.map(item=><article className="nx17-banner-card" key={item.id}>
      <img src={apiAssetUrl(item.imageUrl)} alt=""/><div><strong>{item.title}</strong>
      <p>{placementLabel(item)} · {item.isActive?"Active":"Inactive"} · Order {item.sortOrder} · {item.showText===false?"Image only":"Text overlay"}</p>
      <p className="nx19-banner-destination">Redirects to: <code>{item.linkUrl}</code></p>
      <div className="nx17-banner-actions"><button type="button" onClick={()=>edit(item)}>Edit</button>
        <button type="button" disabled={busy} onClick={()=>toggle(item)}>{item.isActive?"Hide":"Publish"}</button></div></div>
    </article>)}{!items.length&&<div className="admin-empty">No promotions yet. Add a banner to get started.</div>}</section>
    {opened&&<Modal title={editing?"Edit promotion":"New promotion"} size="medium" onClose={()=>!busy&&setOpened(false)} closeDisabled={busy}>
      <form className="admin-form nx17-banner-form" onSubmit={submit}>
        <label><span className="nx34-field-label">Headline <b className="nx34-required" aria-hidden="true">*</b></span><input required maxLength={150} value={draft.title} onChange={e=>setDraft(p=>({...p,title:e.target.value}))}/></label>
        <label>Subtitle<input maxLength={300} value={draft.subtitle} onChange={e=>setDraft(p=>({...p,subtitle:e.target.value}))}/></label>
        <div className="nx35-banner-visual-mode"><label className="nx35-banner-check"><input type="checkbox" checked={!draft.showText} onChange={e=>setDraft(p=>({...p,showText:!e.target.checked}))}/><span><strong>Use original banner design (image only)</strong><small>Hide all overlaid text and remove the dark gradient. The image displays at full brightness.</small></span></label>
          <p>For banners containing their own wording, enable image-only mode. The headline is still required internally to identify the promotion in Admin.</p></div>
        <fieldset className="nx19-section"><legend>1. Where should it appear?</legend>
          <label>Banner placement<select value={draft.position} onChange={e=>setDraft(p=>({...p,position:e.target.value,categoryId:"",productId:"",productName:""}))}>
            <option value="home">Homepage only</option>
            <option value="category">Selected category / subcategory</option>
            <option value="both">Homepage + category / subcategory</option>
            <option value="product">Specific product page</option>
            <option value="home_product">Homepage + specific product page</option>
          </select></label>
          {categoryPlacement(draft.position)&&<label><span className="nx34-field-label">Choose display category <b className="nx34-required" aria-hidden="true">*</b></span><select required value={draft.categoryId} onChange={e=>setDraft(p=>({...p,categoryId:e.target.value}))}>
            <option value="">Choose a category or subcategory</option>{paths.filter(c=>c.isActive).map(c=><option key={c.id} value={c.id}>{c.path}</option>)}
          </select></label>}
          {productPlacement(draft.position)&&<PromotionProductPicker label="Choose display product" productId={draft.productId} productName={draft.productName}
            onSelect={(id,name)=>setDraft(p=>({...p,productId:id,productName:name}))}/>}
        </fieldset>
        <fieldset className="nx19-section"><legend>2. Where should clicking it go?</legend>
          <label>Redirect destination<select value={draft.destinationType} onChange={e=>setDraft(p=>({...p,destinationType:e.target.value}))}>
            <option value="product">A specific product</option><option value="category">A category or subcategory</option>
            <option value="shop">All products (Shop)</option><option value="home">Homepage</option>
            <option value="custom">Custom internal route or external HTTPS URL</option>
          </select></label>
          {draft.destinationType==="product"&&<PromotionProductPicker label="Choose redirect product" productId={draft.destinationProductId}
            productName={draft.destinationProductName} onSelect={(id,name)=>setDraft(p=>({...p,destinationProductId:id,destinationProductName:name}))}/>}
          {draft.destinationType==="category"&&<label><span className="nx34-field-label">Choose redirect category <b className="nx34-required" aria-hidden="true">*</b></span><select required value={draft.destinationCategoryId}
            onChange={e=>setDraft(p=>({...p,destinationCategoryId:e.target.value}))}>
            <option value="">Choose a category or subcategory</option>{paths.filter(c=>c.isActive).map(c=><option key={c.id} value={c.id}>{c.path}</option>)}
          </select></label>}
          {draft.destinationType==="custom"&&<label><span className="nx34-field-label">Custom URL <b className="nx34-required" aria-hidden="true">*</b></span><input required maxLength={400} value={draft.customLink}
            placeholder="/products/12?variant=4 or https://example.com" onChange={e=>setDraft(p=>({...p,customLink:e.target.value}))}/>
            <small>Internal paths start with /; external destinations must use HTTPS. Unsafe links are rejected.</small></label>}
          <p className="nx19-url-preview">Click destination: <code>{destination()||"Select a destination"}</code></p>
        </fieldset>
        <label>Slide order<input type="number" min="0" max="10000" value={draft.sortOrder} onChange={e=>setDraft(p=>({...p,sortOrder:e.target.value}))}/></label>
        <label><span className="nx34-field-label">{editing?"Replace banner image (optional)":"Banner image"}{!editing && <b className="nx34-required" aria-hidden="true"> *</b>}</span>
          <input required={!editing} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setDraft(p=>({...p,image:e.target.files?.[0]||null}))}/>
          <small>Landscape 1600 × 600 recommended. JPG, PNG or WebP, up to 12 MB.</small></label>
        {error&&<p className="admin-alert" role="alert">{error}</p>}
        <div className="nx-sticky-actions"><button className="admin-primary-action" type="submit" disabled={busy}>{busy?"Saving…":"Save promotion"}</button></div>
      </form>
    </Modal>}
  </AdminLayout>;
}
