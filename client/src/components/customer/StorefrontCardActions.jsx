import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { addWishlist } from '../../services/wishlistService';
import { apiAssetUrl } from '../../services/apiClient';
import UiIcon from '../common/UiIcon';
import Modal from '../common/Modal';

const KEY='nexora_comparisons_v1';
export function saveCompareProduct(product) {
  let previous=[];
  try{previous=JSON.parse(localStorage.getItem(KEY)||'[]');}catch{/* Recover invalid local data. */}
  const id=String(product.parentProductId||product.id);
  if(previous.includes(id))return 'Already in compare';
  if(previous.length>=4)return 'Compare up to four products.';
  localStorage.setItem(KEY,JSON.stringify([...previous,id]));
  window.dispatchEvent(new Event('nexora:compare-changed'));
  return 'Added to compare';
}
export function readCompareIds(){try{return JSON.parse(localStorage.getItem(KEY)||'[]').filter(x=>/^\d+$/.test(String(x))).slice(0,4);}catch{return [];}}
export default function StorefrontCardActions({product,detailUrl,imageUrl}) {
  const navigate=useNavigate();const {addToCart}=useCart();
  const [quick,setQuick]=useState(false);const [message,setMessage]=useState('');const [saved,setSaved]=useState(false);
  const parentId=String(product.parentProductId||product.id);
  const needsOptions=Boolean(product.hasVariants && !product.selectedVariantId);
  function quickAdd(){if(needsOptions){navigate(detailUrl);return;}
    addToCart(parentId,1,product.selectedVariantId?String(product.selectedVariantId):null);setMessage('Added to cart');}
  async function save(){try{await addWishlist(parentId);setSaved(true);setMessage('Saved to wishlist');}
    catch(e){if(e.status===401)navigate('/login');else setMessage(e.message||'Could not save product');}}
  return <>
    <div className="nx61-card-actions" aria-label={`Quick actions for ${product.name}`}>
      <button type="button" title="Quick view" aria-label={`Quick view ${product.name}`} onClick={()=>setQuick(true)}><UiIcon name="eye" size={18}/></button>
      <button type="button" title="Add to wishlist" aria-label={`Save ${product.name} to wishlist`} aria-pressed={saved} onClick={save}><UiIcon name="heart" size={18}/></button>
      <button type="button" title="Add to compare" aria-label={`Compare ${product.name}`} onClick={()=>setMessage(saveCompareProduct(product))}><UiIcon name="compare" size={18}/></button>
    </div>
    <button className="nx61-quick-add" type="button" disabled={Number(product.stock)<=0} onClick={quickAdd}>
      <UiIcon name="bag" size={17}/>{needsOptions?'Select options':'Quick Add'}
    </button>
    {message&&<span role="status" className="nx61-card-feedback">{message}</span>}
    {quick&&<Modal size="medium" title="Quick view" onClose={()=>setQuick(false)}>
      <div className="nx61-quick-view">
        <div className="nx61-quick-view-media">{imageUrl?<img src={apiAssetUrl(imageUrl)} alt={product.name}/>:<span>Image unavailable</span>}</div>
        <div><p className="eyebrow">{product.category}</p><h3>{product.name}</h3>
        <strong>₹{Number(product.price||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong>
        <p>{Number(product.stock)>0?'Available':'Out of stock'}</p>
        <div className="nx61-quick-view-actions"><Link className="button button-secondary" to={detailUrl} onClick={()=>setQuick(false)}>View full details</Link>
        <button className="button button-primary" type="button" disabled={Number(product.stock)<=0} onClick={()=>{quickAdd();if(!needsOptions)setQuick(false);}}>{needsOptions?'Select options':'Add to cart'}</button></div>
        </div>
      </div>
    </Modal>}
  </>;
}
