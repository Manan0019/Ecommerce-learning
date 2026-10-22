import UiIcon from "../../components/common/UiIcon";
import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import AdminLayout from '../../components/layout/AdminLayout';
import {apiAssetUrl} from '../../services/apiClient';
import {getFeaturedAdmin,reorderFeaturedAdmin,searchFeaturedCandidates,setFeaturedAdmin} from '../../services/featuredService';

export default function AdminFeatured(){
  const [items,setItems]=useState([]),[candidates,setCandidates]=useState([]),[search,setSearch]=useState('');
  const [dragged,setDragged]=useState(null),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const load=useCallback(async()=>{const data=await getFeaturedAdmin();setItems(data.products||[]);setDirty(false);},[]);
  useEffect(()=>{let active=true;getFeaturedAdmin().then(data=>{if(active)setItems(data.products||[]);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
  useEffect(()=>{const ctrl=new AbortController();searchFeaturedCandidates(search,ctrl.signal).then(r=>setCandidates(r.products||[])).catch(e=>{if(e.name!=='AbortError')setError(e.message);});return()=>ctrl.abort();},[search]);
  function move(from,to){if(from===null||from===to||to<0||to>=items.length)return;
    setItems(old=>{const updated=[...old];const [item]=updated.splice(from,1);updated.splice(to,0,item);return updated;});setDirty(true);}
  async function save(){setSaving(true);setError('');setNotice('');try{await reorderFeaturedAdmin(items.map(x=>x.id));setDirty(false);setNotice('Featured order saved. Each product now has a unique position.');await load();}catch(e){setError(e.message);}finally{setSaving(false);}}
  async function change(productId,enabled){if(dirty){setError('Save or discard the pending order before adding or removing featured products.');return;}
    setSaving(true);setError('');setNotice('');try{await setFeaturedAdmin(productId,enabled);await load();setCandidates(old=>old.filter(x=>x.id!==productId));setNotice(enabled?'Added to featured products.':'Removed from featured products.');}catch(e){setError(e.message);}finally{setSaving(false);}}
  return <AdminLayout title="Featured Products" subtitle="A dedicated order for homepage featured products—drag rows or change their positions without conflicting numbers."
    actions={<Link className="admin-secondary-action" to="/admin/products">Products</Link>}>
    {error&&<p className="admin-alert" role="alert">{error}</p>}
    {notice&&<p className="admin-form-message" role="status">{notice}</p>}
    <section className="admin-panel nx24-featured-panel">
      <header className="nx24-panel-header"><div><h2>Homepage display order</h2><p>{items.length} parent products. Each appears once, regardless of its SKUs.</p></div><div className="nx24-actions"><button type="button" className="nx69-icon-action nx69-icon-danger" aria-label="Discard unsaved featured order" title="Discard" disabled={!dirty||saving} onClick={()=>load().catch(e=>setError(e.message))}><UiIcon name="x" size={18}/></button><button type="button" className="admin-primary-action" disabled={!dirty||saving} onClick={save}><><UiIcon name="save" size={17}/>{saving?'Saving…':'Save order'}</></button></div></header>
      {items.length===0?<div className="admin-empty">Nothing featured yet. Search below to add a product.</div>:<ol className="nx24-featured-list" aria-label="Featured product ranking">
        {items.map((item,index)=><li key={item.id} draggable={!saving}
          onDragStart={e=>{e.dataTransfer.effectAllowed='move';setDragged(index);}}
          onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();move(dragged,index);setDragged(null);}}
          onDragEnd={()=>setDragged(null)} className={dragged===index?'is-dragged':''}>
          <span className="nx24-grip" aria-hidden="true">⠿</span><span className="nx24-position">{index+1}</span>
          <Link className="nx50-feature-thumb" to={`/admin/products/${item.id}/preview`} state={{from:"/admin/featured"}} aria-label={`Preview ${item.name}`}>
            {item.imageUrl?<img className="nx24-thumb" src={apiAssetUrl(item.imageUrl)} alt=""/>:<span className="nx24-thumb nx24-placeholder">No image</span>}</Link>
          <div className="nx24-entry"><Link className="nx46-product-title" to={`/admin/products/${item.id}/preview`} state={{from:"/admin/featured"}}>{item.name}</Link><small>{item.category}{item.isActive?'':' · Inactive (hidden publicly)'}</small></div>
          <label className="nx24-jump">Position<select aria-label={`Move ${item.name} to position`} value={index} disabled={saving} onChange={e=>move(index,Number(e.target.value))}>
            {items.map((_,i)=><option key={i} value={i}>{i+1}</option>)}
          </select></label>
          <button type="button" className="nx69-icon-action nx69-icon-danger" disabled={saving} title="Remove featured product" aria-label={`Remove ${item.name} from featured`} onClick={()=>change(item.id,false)}><UiIcon name="trash" size={18}/></button>
        </li>)}
      </ol>}
      <p className="nx24-helper">Drag and drop the row to a new position. Use the position selector if dragging isn't convenient. Save once when finished.</p>
    </section>
    <section className="admin-panel nx24-featured-panel"><h2>Add featured products</h2><p>Search existing active products. A product with many sizes or colors still occupies just one featured slot.</p>
      <label className="nx24-search">Search catalogue<input type="search" value={search} maxLength={100} onChange={e=>setSearch(e.target.value)} placeholder="Name or brand"/></label>
      <div className="nx24-candidates">{candidates.map(p=><div key={p.id} className="nx24-candidate">
        <Link className="nx50-feature-thumb" to={`/admin/products/${p.id}/preview`} state={{from:"/admin/featured"}} aria-label={`Preview ${p.name}`}>
          {p.imageUrl?<img src={apiAssetUrl(p.imageUrl)} alt=""/>:<span className="nx24-thumb nx24-placeholder">No image</span>}</Link><span><Link className="nx46-product-title" to={`/admin/products/${p.id}/preview`} state={{from:"/admin/featured"}}>{p.name}</Link><small>{p.category}</small></span>
        <button type="button" className="admin-secondary-action" disabled={saving||dirty} onClick={()=>change(p.id,true)}>+ Feature</button>
      </div>)}{candidates.length===0&&<p>No matching active products available.</p>}</div>
    </section>
  </AdminLayout>;
}
