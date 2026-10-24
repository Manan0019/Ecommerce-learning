import { saveCompareProduct } from '../../services/compareStorage';
import { Button, IconButton } from "../ui/index";
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../../hooks/useCart';
import { addWishlist } from '../../services/wishlistService';
import UiIcon from '../common/UiIcon';
import Modal from '../common/Modal';
import ProductQuickView from './ProductQuickView';

export default function StorefrontCardActions({product,detailUrl,showQuickAdd=true}) {
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
      <IconButton variant="secondary" type="button" title="Quick view" aria-label={`Quick view ${product.name}`} onClick={()=>setQuick(true)}><UiIcon name="eye" size={18}/></IconButton>
      <IconButton variant="secondary" type="button" title="Add to wishlist" aria-label={`Save ${product.name} to wishlist`} aria-pressed={saved} onClick={save}><UiIcon name="heart" size={18}/></IconButton>
      <IconButton variant="secondary" type="button" title="Add to compare" aria-label={`Compare ${product.name}`} onClick={()=>setMessage(saveCompareProduct(product))}><UiIcon name="compare" size={18}/></IconButton>
    </div>

    {showQuickAdd && !needsOptions && Number(product.stock)>0 && <Button variant="secondary" className="nx61-quick-add" type="button" onClick={quickAdd}>
      <UiIcon name="bag" size={17}/>Quick Add
    </Button>}
    {message&&<span role="status" className="nx61-card-feedback">{message} {message.includes('compare') && <Link to="/compare" className="nx69-feedback-link">View comparison</Link>}</span>}
    {quick&&<Modal size="large" title="Quick view" onClose={()=>setQuick(false)}>
      <ProductQuickView productId={parentId} detailUrl={detailUrl} onAdd={(id,qty,variantId)=>{addToCart(id,qty,variantId);setQuick(false);setMessage('Added to cart');}}/>
    </Modal>}
  </>;
}
