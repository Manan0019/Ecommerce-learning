import { useEffect,useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import {readCompareIds} from '../../components/customer/StorefrontCardActions';
import {getProduct} from '../../services/productService';
import {apiAssetUrl} from '../../services/apiClient';
export default function Compare(){
 const [products,setProducts]=useState([]);const [error,setError]=useState('');
 useEffect(()=>{let live=true;Promise.all(readCompareIds().map(id=>getProduct(id).then(data=>data.product).catch(()=>null))).then(rows=>{if(live)setProducts(rows.filter(Boolean));}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
 function remove(id){localStorage.setItem('nexora_comparisons_v1',JSON.stringify(readCompareIds().filter(x=>String(x)!==String(id))));setProducts(a=>a.filter(x=>String(x.id)!==String(id)));}
 return <CustomerLayout mainClassName="nx61-compare-page"><section className="store-section"><p className="eyebrow">Side by side</p><h1>Compare products</h1><p>Compare up to four products; choose the right configuration before adding it to your cart.</p>{error&&<p role="alert">{error}</p>}
 {products.length?<div className="nx61-compare-grid">{products.map(p=><article key={p.id}><Link to={`/products/${p.id}`}><img src={apiAssetUrl(p.imageUrl)} alt={p.name}/></Link><h2>{p.name}</h2><p>{p.category}</p><p><strong>₹{Number(p.price).toLocaleString('en-IN')}</strong></p><p>{p.brand||'Brand not specified'}</p><p>{Number(p.stock)>0?'In stock':'Out of stock'}</p><Link className="button button-primary" to={`/products/${p.id}`}>Choose options</Link><button type="button" onClick={()=>remove(p.id)}>Remove</button></article>)}</div>:<div className="store-empty">No comparisons yet. Use the compare icon on any product card. <Link to="/products">Browse products</Link></div>}
 </section></CustomerLayout>;
}
