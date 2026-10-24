import { EmptyState, Button, Checkbox, DataTable, EntitySubtitle, EntityTitle, FormField, IconButton, SearchField, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/index";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import CustomerLayout from '../../components/layout/CustomerLayout';
import UiIcon from '../../components/common/UiIcon';
import { readCompareIds, saveCompareProduct } from '../../services/compareStorage';
import { getProduct, getProductSuggestions } from '../../services/productService';
import { apiAssetUrl } from '../../services/apiClient';
import { buildSpecificationComparison } from '../../services/compareMatrix';

const rupees = value => value == null || value === '' ? '—' : `₹${Number(value).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const display = value => value == null || value === '' ? '—' : Array.isArray(value) ? value.join(', ') : typeof value === 'boolean' ? value ? 'Yes' : 'No' : String(value);
const rowDefinitions = [
  ['Price','price',p=>rupees(p?.price)],
  ['Original price','mrp',p=>Number(p?.mrp)>Number(p?.price)?rupees(p?.mrp):'—'],
  ['Brand','brand',p=>display(p?.brand)],
  ['Category','category',p=>display(p?.category)],
  ['Model','model',p=>display(p?.model)],
  ['Stock availability','stock',p=>Number(p?.stock)>0?`${p.stock} available`:'Out of stock'],
  ['Options','options',p=>p?.hasVariants?'Select colour / size / configuration':'Standard product'],
];
export default function Compare(){
 const [ids,setIds]=useState(()=>readCompareIds().map(String));
 const [products,setProducts]=useState([]);
 const [search,setSearch]=useState('');
 const [suggestions,setSuggestions]=useState([]);
 const [loading,setLoading]=useState(false);
 const [searching,setSearching]=useState(false);
 const [error,setError]=useState('');
 const [message,setMessage]=useState('');
 const [differencesOnly,setDifferencesOnly]=useState(false);
 useEffect(()=>{const sync=()=>setIds(readCompareIds().map(String));window.addEventListener('nexora:compare-changed',sync);window.addEventListener('storage',sync);return()=>{window.removeEventListener('nexora:compare-changed',sync);window.removeEventListener('storage',sync);};},[]);
 const idsKey=ids.join(',');
 useEffect(()=>{
  let live=true;
  queueMicrotask(()=>{if(live){setLoading(Boolean(ids.length));setError('');}});
  Promise.all(ids.map(id=>getProduct(id).then(data=>data.product).catch(()=>null))).then(rows=>{
   if(!live)return;
   setProducts(rows.filter(Boolean));
  }).catch(err=>{if(live)setError(err.message||'Could not load comparisons.');}).finally(()=>{if(live)setLoading(false);});
  return()=>{live=false;};
 },[ids,idsKey]); // Re-fetch when the saved ID sequence changes.
 useEffect(()=>{
  const controller=new AbortController();
  if(search.trim().length<2){queueMicrotask(()=>{if(!controller.signal.aborted){setSuggestions([]);setSearching(false);}});return()=>controller.abort();}
  queueMicrotask(()=>{if(!controller.signal.aborted)setSearching(true);});
  const timer=setTimeout(()=>getProductSuggestions(search.trim(),controller.signal).then(data=>{if(!controller.signal.aborted)setSuggestions((data.products||[]).filter(p=>!ids.includes(String(p.parentProductId||p.id))));}).catch(()=>{if(!controller.signal.aborted)setSuggestions([]);}).finally(()=>{if(!controller.signal.aborted)setSearching(false);}),240);
  return()=>{clearTimeout(timer);controller.abort();};
 },[search,ids,idsKey]);
 const remove=useCallback(id=>{const next=readCompareIds().filter(x=>String(x)!==String(id));localStorage.setItem('nexora_comparisons_v1',JSON.stringify(next));window.dispatchEvent(new Event('nexora:compare-changed'));setMessage('Product removed from comparison.');},[]);
 const add=useCallback(product=>{const result=saveCompareProduct(product);setMessage(result);if(result==='Added to compare'){setSearch('');setSuggestions([]);}},[]);
 const specs=useMemo(()=>buildSpecificationComparison(products),[products]);
 const common=new Set(products.map(p=>p.id));
 const basicRows=useMemo(()=>rowDefinitions.filter(([, ,render])=>!differencesOnly||products.length<2||new Set(products.map(p=>String(render(p)))).size>1),[products,differencesOnly]);
 const visibleSpecs=useMemo(()=>specs.filter(item=>!differencesOnly||products.length<2||new Set(products.map(p=>String(display(item.values[String(p.id)])))).size>1),[specs,products,differencesOnly]);
 function clearAll(){localStorage.setItem('nexora_comparisons_v1','[]');window.dispatchEvent(new Event('nexora:compare-changed'));setMessage('Comparison cleared.');setDifferencesOnly(false);} 
 return <CustomerLayout mainClassName="nx69-compare-page"><section className="store-section nx69-compare-shell">
  <header className="nx69-compare-intro"><div><p className="eyebrow">Shop with confidence</p><h1>Compare products</h1><p>Compare genuine prices, availability and specifications—side by side. Add up to four products.</p></div><div className="nx69-compare-main-actions"><Button as={Link} variant="secondary" to="/products" >Explore products</Button>{ids.length>0&&<Button variant="secondary" className="nx69-compare-clear" type="button" onClick={clearAll}><UiIcon name="trash" size={16}/> Clear comparison</Button>}</div></header>
  {error&&<p className="admin-alert" role="alert">{error}</p>}{message&&<p className="nx69-compare-message" role="status">{message}</p>}
  <div className="nx69-compare-search"><FormField htmlFor="nx69-compare-product">Add a product to compare <small>{ids.length}/4 selected</small></FormField><div className="nx69-compare-search-field"><SearchField id="nx69-compare-product" placeholder="Search products by name or brand" value={search} onChange={e=>setSearch(e.target.value)} disabled={ids.length>=4} autoComplete="off"/></div>
   {search.trim().length>=2&&ids.length<4&&<div className="nx69-compare-results" role="list" aria-label="Product suggestions">{searching?<p role="status">Searching products…</p>:suggestions.length?suggestions.map(product=><Button variant="secondary" role="listitem" key={product.id} type="button" onClick={()=>add(product)}><span>{product.imageUrl?<img src={apiAssetUrl(product.imageUrl)} alt=""/>:<UiIcon name="package" size={24}/>}</span><span><EntityTitle>{product.name}</EntityTitle><EntitySubtitle>{product.brand||product.category||'Product'}</EntitySubtitle></span><UiIcon name="plus" size={18}/></Button>):<p>No matching products found. Try another name or brand.</p>}</div>}
  </div>
  {products.length>1&&<FormField inline className="nx69-difference-switch"><Checkbox type="checkbox" checked={differencesOnly} onChange={e=>setDifferencesOnly(e.target.checked)}/><span>Show only differences</span></FormField>}
  {loading&&<p role="status" className="nx69-compare-loading">Loading accurate product details…</p>}
  {!loading&&!products.length?<EmptyState icon="compare" title="Your comparison is empty" description="Tap Compare on a product card to add it here." action={<Button as={Link} variant="primary" to="/products">Find products</Button>}/>:
  <div className="nx69-compare-scroll" role="region" tabIndex={0} aria-label="Side-by-side product comparison" aria-describedby="nx69-compare-scroll-hint"><p id="nx69-compare-scroll-hint" className="sr-only">Scroll horizontally on small screens to compare the product columns.</p>
   <DataTable className="nx69-compare-table"><TableHead><TableRow><TableHeader scope="col" className="nx69-compare-label-col">Compare features</TableHeader>{products.map(p=><TableHeader scope="col" key={p.id}><div className="nx69-compare-product"><IconButton variant="danger" type="button" className="nx69-compare-remove" onClick={()=>remove(p.id)} aria-label={`Remove ${p.name} from comparison`} title="Remove product"><UiIcon name="x" size={18}/></IconButton><Link  to={`/products/${p.id}`} className="nx69-compare-image">{p.imageUrl?<img src={apiAssetUrl(p.imageUrl)} alt={p.name}/>:<UiIcon name="package" size={38}/>}</Link><span className="nx69-compare-category">{p.category}</span><EntityTitle as={Link} className="nx69-compare-product-name" to={`/products/${p.id}`}>{p.name}</EntityTitle><strong className="nx69-compare-price">{rupees(p.price)}</strong><Link className="nx69-compare-choose" to={`/products/${p.id}`}>View options</Link></div></TableHeader>)}</TableRow></TableHead>
   <TableBody><TableRow className="nx69-compare-group"><TableHeader scope="row" colSpan={products.length+1}>Essential details</TableHeader></TableRow>{basicRows.map(([label,key,render])=><TableRow key={key}><TableHeader scope="row">{label}</TableHeader>{products.map(p=><TableCell key={p.id}>{render(p)}</TableCell>)}</TableRow>)}
   {visibleSpecs.length>0&&<TableRow className="nx69-compare-group"><TableHeader scope="row" colSpan={products.length+1}>Technical specifications</TableHeader></TableRow>}
   {visibleSpecs.map((item)=><TableRow key={item.id}><TableHeader scope="row"><small>{item.group}</small>{item.label}</TableHeader>{products.map(p=><TableCell key={p.id}>{display(item.values[String(p.id)])}</TableCell>)}</TableRow>)}
   <TableRow><TableHeader scope="row">Next step</TableHeader>{products.map(p=><TableCell key={p.id}><Link to={`/products/${p.id}`} className="nx69-compare-choose">View full product</Link></TableCell>)}</TableRow></TableBody></DataTable>
  </div>}
  {common.size>0&&<p className="nx69-compare-footnote">Displayed prices and stock come from the current catalogue. Variant-specific prices and availability are confirmed when you select an SKU on the product page.</p>}
 </section></CustomerLayout>;
}
