import {useEffect,useState} from "react";
import {searchPromotionProducts} from "../../services/bannerService";

/** Search-backed picker: unlike the admin product table, not limited to the first 100 products. */
export default function PromotionProductPicker({label,productId,productName,onSelect}) {
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [open,setOpen]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      searchPromotionProducts(query,controller.signal)
        .then(data=>{if(!controller.signal.aborted){setResults(data.products||[]);setError("");}})
        .catch(err=>{if(!controller.signal.aborted)setError(err.message);});
    },250);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query]);
  return <div className="nx19-product-picker" onBlur={event=>{
    if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);
  }}>
    <label htmlFor={`${label.replace(/\W+/g,"-")}-search`}>{label}</label>
    {productId&&<div className="nx19-selected-product"><strong>{productName||`Product #${productId}`}</strong>
      <button type="button" onClick={()=>{onSelect("","");setQuery("");setOpen(true);}}>Change / Clear</button>
    </div>}
    <input id={`${label.replace(/\W+/g,"-")}-search`} type="search" autoComplete="off"
      placeholder="Search products by name, brand or ID…" value={query}
      role="combobox" aria-expanded={open} aria-controls={`${label.replace(/\W+/g,"-")}-results`}
      onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setOpen(true);}} />
    {open&&<div id={`${label.replace(/\W+/g,"-")}-results`} role="listbox" className="nx19-product-results">
      {results.length===0?<p>{error||"No active products found."}</p>:results.map(item=><button type="button" role="option" aria-selected={String(item.id)===String(productId)}
        key={item.id} onClick={()=>{onSelect(item.id,item.name);setQuery("");setOpen(false);}}>
        <strong>{item.name}</strong><small>{item.brand?`${item.brand} · `:""}{item.category} · ID {item.id}</small>
      </button>)}
    </div>}
    <small>Only published products in active categories are shown. The selection remains saved until changed.</small>
  </div>;
}
