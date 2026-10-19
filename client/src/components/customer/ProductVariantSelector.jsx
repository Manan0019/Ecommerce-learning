import { apiAssetUrl } from "../../services/apiClient";

const priority=["color","colour","system_memory","ram","memory","storage","size"];
const money=n=>`₹${Number(n).toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
function choiceFor(variants,current,key,value) {
 const candidates=variants.filter(v=>v.attributes[key]===value);
 if(!candidates.length)return null;
 const preserved=Object.entries(current?.attributes||{}).filter(([k])=>k!==key);
 return [...candidates].sort((a,b)=>{
  const score=x=>preserved.filter(([k,v])=>x.attributes[k]===v).length;
  return score(b)-score(a) || Number(b.stock>0)-Number(a.stock>0);
 })[0];
}
export default function ProductVariantSelector({variants,selectedVariant,onSelect,media=[],coverUrl}){
 if(!variants.length)return null;
 const groups={};
 for(const variant of variants)for(const [key,value] of Object.entries(variant.attributes||{})){
  if(!groups[key])groups[key]=new Set();groups[key].add(value);
 }
 const ordered=Object.keys(groups).sort((a,b)=>{
  const ai=priority.indexOf(a),bi=priority.indexOf(b);
  return (ai<0?100:ai)-(bi<0?100:bi);
 });
 if(!ordered.length)return <div className="variant-selection"><h3>Configuration</h3>{variants.map(v=><button key={v.id} type="button" className={`variant-option ${selectedVariant?.id===v.id?"is-selected":""}`} onClick={()=>onSelect(v.id)}>{v.sku} · {money(v.price)}</button>)}</div>;
 return <div className="variant-selection" aria-label="Select product configuration">
  {ordered.map(key=><fieldset key={key} className="variant-option-group">
   <legend><strong>{key.replaceAll("_"," ").replace(/\b\w/g,s=>s.toUpperCase())}:</strong> <span>{selectedVariant?.attributes?.[key]||"Choose"}</span></legend>
   <div className="variant-choice-row">{[...groups[key]].map(value=>{
     const candidate=choiceFor(variants,selectedVariant,key,value);
     const selected=selectedVariant?.attributes[key]===value;
     const isColor=["color","colour"].includes(key);
     const relevant=media.filter(m=>m.type==="image"&&(
       m.optionKey===key&&m.optionValue===value ||
       String(m.variantId)===String(candidate?.id) && candidate?.id!=null));
     const picture=relevant.find(m=>m.isCardCover)||relevant[0];
     const img=picture?.url||coverUrl;
     return <button type="button" key={value} disabled={!candidate} aria-pressed={selected}
       aria-label={`${value}${candidate?.stock===0?", out of stock":""}`}
       className={`variant-option ${selected?"is-selected":""} ${candidate?.stock===0?"is-sold-out":""} ${isColor?"is-image-option":""}`}
       onClick={()=>candidate&&onSelect(candidate.id)}>
       {isColor&&img&&<img src={apiAssetUrl(img)} alt="" loading="lazy"/>}
       <span>{value}</span>
       {key==="storage"&&candidate&&<small>{money(candidate.price)}</small>}
       {candidate?.stock===0&&<small>Out of stock</small>}
     </button>;
   })}</div>
  </fieldset>)}
  <p className="variant-selection-summary">Selected: {ordered.map(k=>selectedVariant?.attributes?.[k]).filter(Boolean).join(" · ")}</p>
 </div>;
}
