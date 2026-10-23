import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProduct, getProductMedia } from '../../services/productService';
import { getVariants } from '../../services/variantService';
import { apiAssetUrl } from '../../services/apiClient';
import ProductVariantSelector from './ProductVariantSelector';
import { quickViewPictures } from './quickViewGallery';

const money = value => `₹${Number(value || 0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
export default function ProductQuickView({ productId, detailUrl, onAdd }) {
 const [data,setData]=useState(null),[variants,setVariants]=useState([]),[media,setMedia]=useState([]),[selectedId,setSelectedId]=useState(null),[imageIndex,setImageIndex]=useState(0),[quantity,setQuantity]=useState(1),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);setError('');
  Promise.all([getProduct(productId),getVariants(productId),getProductMedia(productId)]).then(([p,v,m])=>{
    if(!active)return;
    setData(p.product);setVariants(v.variants||[]);setMedia(m.media||[]);
    // Avoid silently choosing size or colour on behalf of the customer.
    setSelectedId(null);setImageIndex(0);
  }).catch(e=>{if(active)setError(e.message||'Could not load this product.');}).finally(()=>{if(active)setLoading(false);});
  return ()=>{active=false;};
 },[productId]);
 if(loading)return <div className="nx64-quick-loading" role="status">Loading product choices…</div>;
 if(error||!data)return <div role="alert">{error||'Product unavailable.'} <Link to={detailUrl}>Open product page</Link></div>;
 const selected=variants.find(v=>String(v.id)===String(selectedId));
 // Unselected: browse all authentic gallery photos. Selected: show matching SKU/colour only.
 const pictures=quickViewPictures(media,selected,variants.length>0,data.imageUrl);
 const picture=pictures[imageIndex % (pictures.length||1)];
 const price=selected?.price??data.price;
 const mrp=selected?.mrp??data.mrp;
 const stock=Number(selected?.stock??data.stock??0);
 const ready=!variants.length||Boolean(selected);
 const canAdd=ready&&stock>0&&data.isActive!==false&&(!selected||selected.isActive!==false);
 const selectedUrl=ready&&selected?`${detailUrl.split('?')[0]}?variant=${selected.id}`:detailUrl;
 return <div className="nx64-quick-view">
  <div className="nx64-quick-gallery">
   {!selected && variants.length>0 && pictures.length>0 && <p className="nx66-gallery-context">Browse all product photos · Select options for the matching configuration</p>}
   <div className="nx64-quick-photo">
    {picture?<img src={apiAssetUrl(picture.url)} alt={`${data.name} — photo ${imageIndex+1} of ${pictures.length}`}/>:<span className="nx64-no-photo">No photographs are available for this configuration</span>}
    {pictures.length>1&&<div className="nx64-quick-image-nav">
      <button type="button" aria-label="Previous product image" onClick={()=>setImageIndex(i=>(i+pictures.length-1)%pictures.length)}>Prev</button>
      <button type="button" aria-label="Next product image" onClick={()=>setImageIndex(i=>(i+1)%pictures.length)}>Next</button>
    </div>}
   </div>
   {pictures.length>1&&<div className="nx64-quick-thumbnails">{pictures.map((m,i)=><button type="button" key={`${m.id}-${m.url}`} className={i===imageIndex?'is-active':''} onClick={()=>setImageIndex(i)} aria-label={`View image ${i+1}`}><img src={apiAssetUrl(m.url)} alt=""/></button>)}</div>}
  </div>
  <div className="nx64-quick-info">
   <small className="eyebrow">{data.category}</small><h3>{data.name}</h3>
   {data.showSaleBadge && Number(mrp)>Number(price) && <span className="nx70-detail-sale-label">SALE</span>}
   <div className="nx64-quick-prices">{Number(mrp)>Number(price)&&<del>{money(mrp)}</del>}<strong>{money(price)}</strong></div>
   <p className="nx64-quick-description">{data.shortDescription || (data.description||'').slice(0,220) || 'Explore this product and its available options.'}</p>
   <ProductVariantSelector variants={variants} selectedVariant={selected} media={media} coverUrl={!variants.length?data.imageUrl:null}
    onSelect={id=>{setSelectedId(id);setImageIndex(0);setQuantity(1);}} />
   <p className="nx64-quick-stock" role="status">{!ready?'Choose your options to check availability':stock>0?`${stock} available`:'Out of stock'}</p>
   <div className="nx64-quick-qty"><label htmlFor="nx64-quick-quantity">Quantity</label><input id="nx64-quick-quantity" type="number" min="1" max={Math.max(stock,1)} value={quantity} onChange={e=>setQuantity(Math.min(Math.max(1,Number(e.target.value)||1),Math.max(1,stock)))}/></div>
   <div className="nx64-quick-actions"><button type="button" disabled={!canAdd} className="button button-primary" onClick={()=>onAdd(String(data.id),quantity,selected?.id||null)}>{!ready?'Choose options':'Add to cart'}</button><Link className="button button-secondary" to={selectedUrl}>Full product details</Link></div>
  </div>
 </div>;
}
