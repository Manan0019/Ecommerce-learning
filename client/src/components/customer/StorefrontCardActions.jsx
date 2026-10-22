import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { addWishlist } from '../../services/wishlistService';
import { apiAssetUrl } from '../../services/apiClient';
import UiIcon from '../common/UiIcon';
import Modal from '../common/Modal';
import ProductQuickView from './ProductQuickView';

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

    {!needsOptions && Number(product.stock)>0 && <button className="nx61-quick-add" type="button" onClick={quickAdd}>
      <UiIcon name="bag" size={17}/>Quick Add
    </button>}
    {message&&<span role="status" className="nx61-card-feedback">{message}</span>}
    {quick&&<Modal size="large" title="Quick view" onClose={()=>setQuick(false)}>
      <ProductQuickView productId={parentId} detailUrl={detailUrl} onAdd={(id,qty,variantId)=>{addToCart(id,qty,variantId);setQuick(false);setMessage('Added to cart');}}/>
    </Modal>}
  </>;
}
