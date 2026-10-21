import {useEffect,useState} from "react";
import PromotionCategorySelect from "../../components/admin/PromotionCategorySelect";
import AdminLayout from "../../components/layout/AdminLayout";
import Modal from "../../components/common/Modal";
import PromotionProductPicker from "../../components/admin/PromotionProductPicker";
import {apiAssetUrl} from "../../services/apiClient";
import {getAdminCategories} from "../../services/categoryService";
import {getAdminBanners,saveBanner,setBannerActive,setPromotionDisplayCount} from "../../services/bannerService";
import PromotionOrderManager from "../../components/admin/PromotionOrderManager";
import {bannerStatus,toLocalDateTime,toUtcDateTime} from "../../services/promotionSchedule";
import {categoryPaths} from "../../services/categoryHierarchy";

const blank=()=>({title:"",subtitle:"",position:"home",categoryId:"",productId:"",productName:"",
  destinationType:"shop",destinationCategoryId:"",destinationProductId:"",destinationProductName:"",
  customLink:"/products",showText:true,startsAt:"",endsAt:"",image:null});
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


const previewCaptions={
  1:"One large feature",2:"Two side-by-side features",3:"Original: one lead, two supporting",
  4:"Balanced: two columns, two rows",5:"Editorial: one lead, four supporting",
  6:"Campaign wall: two wide, four supporting",
};
function PromotionLayoutPreview({count}){
  const n=Math.max(1,Math.min(6,Number(count)||3));
  return <div className="nx41-admin-layout-preview" aria-label={`${n} banner arrangement preview`}>
    <span className="nx39-eyebrow">DESKTOP LAYOUT PREVIEW</span>
    <div className={`nx41-admin-preview-grid nx41-admin-preview-${n}`} aria-hidden="true">
      {Array.from({length:n},(_,i)=><span key={i}>{i+1}</span>)}
    </div>
    <small>{previewCaptions[n]}. On phones, the carousel shows one slide at a time.</small>
  </div>;
}

export default function AdminBanners(){
  const [items,setItems]=useState([]),[categories,setCategories]=useState([]),[draft,setDraft]=useState(blank),[editing,setEditing]=useState(null);
  const [opened,setOpened]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
  const [homeCount,setHomeCount]=useState(3),[homeAutoplay,setHomeAutoplay]=useState(true),[homeRotateSeconds,setHomeRotateSeconds]=useState(6),[savingDisplay,setSavingDisplay]=useState(false);
  async function reload(){const [b,c]=await Promise.all([getAdminBanners(),getAdminCategories()]);setItems(b.banners||[]);setCategories(c.categories||[]);setHomeCount(b.homeVisibleCount??3);setHomeAutoplay(b.homeAutoplay??true);setHomeRotateSeconds(b.homeRotateSeconds??6);}
  useEffect(()=>{let alive=true;Promise.all([getAdminBanners(),getAdminCategories()]).then(([b,c])=>{if(alive){setItems(b.banners||[]);setCategories(c.categories||[]);setHomeCount(b.homeVisibleCount??3);setHomeAutoplay(b.homeAutoplay??true);setHomeRotateSeconds(b.homeRotateSeconds??6);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false};},[]);
  const paths=categoryPaths(categories);
  function edit(item){
    setEditing(item);setDraft({...blank(),title:item?.title||"",subtitle:item?.subtitle||"",
      position:item?.position||"home",categoryId:item?.categoryId||"",productId:item?.productId||"",
      productName:item?.productName||"",showText:item?.showText!==false,
      startsAt:toLocalDateTime(item?.startsAt),endsAt:toLocalDateTime(item?.endsAt),...parseDestination(item?.linkUrl,paths)});
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
    const startsAt=toUtcDateTime(draft.startsAt),endsAt=toUtcDateTime(draft.endsAt);
    if((draft.startsAt&&!startsAt)||(draft.endsAt&&!endsAt)||(startsAt&&endsAt&&startsAt>=endsAt))
      return setError("Use valid start/end dates, with the end after the start.");
    setBusy(true);
    try{
      const data=new FormData();
      for(const key of ["title","subtitle","position"])data.append(key,draft[key]);
      data.append("startsAt",startsAt||"");data.append("endsAt",endsAt||"");
      data.append("showText",String(draft.showText));
      data.append("categoryId",categoryPlacement(draft.position)?draft.categoryId:"");
      data.append("productId",productPlacement(draft.position)?draft.productId:"");
      data.append("linkUrl",linkUrl);
      if(draft.image)data.append("image",draft.image);
      await saveBanner(editing?.id,data);await reload();setOpened(false);setNotice("Promotion saved successfully.");
    }catch(err){setError(err.message)}finally{setBusy(false)}
  }
  async function toggle(item){setBusy(true);setError("");try{await setBannerActive(item.id,!item.isActive);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function saveDisplay(){setSavingDisplay(true);setError("");try{await setPromotionDisplayCount(homeCount,homeAutoplay,homeRotateSeconds);await reload();setNotice("Homepage layout saved.");}catch(e){setError(e.message);}finally{setSavingDisplay(false);}}
  const live=items.filter(item=>bannerStatus(item)==="Live");
  const upcoming=items.filter(item=>bannerStatus(item)==="Scheduled");
  return <AdminLayout title="Promotion Studio" subtitle="Choose where a banner appears and where it redirects—independently."
    actions={<button type="button" className="admin-primary-action" onClick={()=>edit(null)}>+ New promotion</button>}>
    {error&&!opened&&<p className="admin-alert" role="alert">{error}</p>}{notice&&<p role="status" className="admin-form-message">{notice}</p>}
    <section className="nx39-metrics" aria-label="Promotion statistics">
      <div><strong>{items.length}</strong><span>Total banners</span></div>
      <div><strong>{live.length}</strong><span>Currently live</span></div>
      <div><strong>{live.filter(item=>["home","both","home_product"].includes(item.position)).length}</strong><span>Live on homepage</span></div>
      <div><strong>{upcoming.length}</strong><span>Scheduled next</span></div>
    </section>
    <div className="nx39-layout-panel"><div><span className="nx39-eyebrow">HOMEPAGE LAYOUT</span><h2>How many banners appear together?</h2>
      <p>Choose a curated layout: 3 = one large + two supporting banners, 4 = a 2×2 grid, 5 = one featured + four tiles, 6 = two wide features + four tiles. More promotions rotate into these positions automatically. Phones show one at a time.</p></div>
      <label><span>Visible banners</span><select value={homeCount} onChange={e=>setHomeCount(Number(e.target.value))}>
        {[1,2,3,4,5,6].map(n=><option key={n} value={n}>{({1:"1 · Full-width",2:"2 · Side by side",3:"3 · Featured + 2 (original)",4:"4 · 2 × 2 balanced",5:"5 · Featured + 4 mosaic",6:"6 · Twin features + 4 tiles"})[n]}</option>)}
      </select></label>
      <label className="nx41-autoplay-toggle"><span>Automatic slideshow</span><input type="checkbox" checked={homeAutoplay} onChange={e=>setHomeAutoplay(e.target.checked)} aria-label="Automatically rotate promotion banners"/></label>
      <label><span>Change banner every</span><select value={homeRotateSeconds} disabled={!homeAutoplay} onChange={e=>setHomeRotateSeconds(Number(e.target.value))}>
        {[3,4,5,6,7,8,9,10,12,15].map(n=><option key={n} value={n}>{n} seconds</option>)}
      </select></label>
      <button type="button" className="admin-primary-action" disabled={savingDisplay} onClick={saveDisplay}>{savingDisplay?"Saving…":"Save layout"}</button>
      <PromotionLayoutPreview count={homeCount}/>
    </div>
    <PromotionOrderManager items={items} onSaved={reload}/>
    <div className="nx39-section-heading"><span className="nx39-eyebrow">BANNER LIBRARY</span><h2>All promotions</h2><p>Modify content, placement, destination, visibility and schedule here.</p></div>
    <section className="nx17-admin-banner-grid">{items.map((item,i)=><article className="nx17-banner-card nx39-library-card" key={item.id}>
      <img src={apiAssetUrl(item.imageUrl)} alt="" loading="lazy"/><div><div className="nx39-card-titles"><strong>{item.title}</strong><span className={`nx39-status nx39-${bannerStatus(item).toLowerCase()}`}>{bannerStatus(item)}</span></div>
      <p><strong>#{i+1}</strong> · {placementLabel(item)} · {item.showText===false?"Image only":"Text overlay"}</p>
      <p className="nx19-banner-destination">Redirects to: <code>{item.linkUrl}</code></p>
      {(item.startsAt||item.endsAt)&&<p className="nx39-schedule-caption">{item.startsAt?`From ${new Date(item.startsAt).toLocaleString()}`:"Immediately"} / {item.endsAt?new Date(item.endsAt).toLocaleString():"No end date"}</p>}
      <div className="nx17-banner-actions"><button type="button" onClick={()=>edit(item)}>Edit</button>
        <button type="button" disabled={busy} onClick={()=>toggle(item)}>{item.isActive?"Disable":"Enable"}</button></div></div>
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
          {categoryPlacement(draft.position)&&<PromotionCategorySelect label="Choose display category" categories={categories} value={draft.categoryId}
              onChange={id=>setDraft(p=>({...p,categoryId:id}))}/>}
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
          {draft.destinationType==="category"&&<PromotionCategorySelect label="Choose redirect category" categories={categories} value={draft.destinationCategoryId}
             onChange={id=>setDraft(p=>({...p,destinationCategoryId:id}))}/>}
          {draft.destinationType==="custom"&&<label><span className="nx34-field-label">Custom URL <b className="nx34-required" aria-hidden="true">*</b></span><input required maxLength={400} value={draft.customLink}
            placeholder="/products/12?variant=4 or https://example.com" onChange={e=>setDraft(p=>({...p,customLink:e.target.value}))}/>
            <small>Internal paths start with /; external destinations must use HTTPS. Unsafe links are rejected.</small></label>}
          <p className="nx19-url-preview">Click destination: <code>{destination()||"Select a destination"}</code></p>
        </fieldset>
        <fieldset className="nx39-schedule-fields"><legend>3. Promotion schedule (optional)</legend>
          <p>Use your local date and time. Empty fields mean no time limit. The promotion must also be enabled.</p>
          <div className="nx39-schedule-grid"><label>Start date &amp; time<input type="datetime-local" value={draft.startsAt}
            onChange={e=>setDraft(p=>({...p,startsAt:e.target.value}))}/></label>
            <label>End date &amp; time<input type="datetime-local" value={draft.endsAt}
            onChange={e=>setDraft(p=>({...p,endsAt:e.target.value}))}/></label></div>
        </fieldset>
        <p className="nx39-order-hint">Display position is managed in the numbered <b>Promotion positions</b> section after saving.</p>
        <label><span className="nx34-field-label">{editing?"Replace banner image (optional)":"Banner image"}{!editing && <b className="nx34-required" aria-hidden="true"> *</b>}</span>
          <input required={!editing} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setDraft(p=>({...p,image:e.target.files?.[0]||null}))}/>
          <small>Landscape 1600 × 600 recommended. JPG, PNG or WebP, up to 12 MB.</small></label>
        {error&&<p className="admin-alert" role="alert">{error}</p>}
        <div className="nx-sticky-actions"><button className="admin-primary-action" type="submit" disabled={busy}>{busy?"Saving…":"Save promotion"}</button></div>
      </form>
    </Modal>}
  </AdminLayout>;
}
