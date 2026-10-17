import { useState } from "react";
import { apiAssetUrl } from "../../services/apiClient";
export default function ProductMediaGallery({product,variantId=null,variantAttributes={},items=[]}){
 const [selectedId,setSelectedId]=useState(null);
 const shared=items.filter(m=>!m.variantId&&!m.optionKey);
 const matchingOption=items.filter(m=>m.optionKey&&variantAttributes?.[m.optionKey]===m.optionValue);
 const matchingVariant=items.filter(m=>m.variantId===variantId&&variantId!==null);
 const gallery=[...new Map([
   ...matchingVariant.sort((a,b)=>a.order-b.order),
   ...matchingOption.sort((a,b)=>a.order-b.order),
   ...shared.sort((a,b)=>a.order-b.order)
 ].map(m=>[m.id,m])).values()];
 const fallback=product.imageUrl?[{id:"cover",type:"image",url:product.imageUrl}]:[];
 const visible=gallery.length?gallery:fallback;
 const current=visible.find(m=>m.id===selectedId)||visible[0];
 return <div className="product-gallery">
  <div className="gallery-main" aria-live="polite">{!current?<div className="missing-image">Image coming soon</div>:current.type==="image"?
   <img key={current.id} className="gallery-transition" src={apiAssetUrl(current.url)} alt={product.name}/>:current.type==="video"?
   <video key={current.id} className="gallery-transition" src={apiAssetUrl(current.url)} controls preload="metadata" playsInline/>:
   <iframe key={current.id} className="gallery-transition" src={current.url} title={`${product.name} video`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>}</div>
  {visible.length>1&&<div className="gallery-thumbnails" aria-label="Product image thumbnails">{visible.map((m,i)=><button type="button" key={m.id} className={current?.id===m.id?"selected":""} onClick={()=>setSelectedId(m.id)} aria-label={`Show media ${i+1}`} aria-pressed={current?.id===m.id}>
   {m.type==="image"?<img src={apiAssetUrl(m.url)} alt=""/>:<span>▶ {m.type==="video"?"Video":"YouTube"}</span>}</button>)}</div>}
 </div>;
}
