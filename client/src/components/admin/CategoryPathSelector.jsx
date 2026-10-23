import {useMemo} from 'react';

/** Cascading category picker. No API changes; stores the selected leaf's existing ID. */
export function categoryTrail(categories, id) {
  const byId=new Map(categories.map(c=>[String(c.id),c]));
  const seen=new Set(); const trail=[];let current=byId.get(String(id));
  while(current&&!seen.has(String(current.id))){trail.unshift(current);seen.add(String(current.id));current=byId.get(String(current.parentId));}
  return trail;
}
export function categoryDepth(categories,id){return categoryTrail(categories,id).length;}
const stepNames=['Main category','Subcategory','Third-level category','Fourth-level category'];
const stepName = index => stepNames[index] || `Level ${index+1} category`;

export default function CategoryPathSelector({categories=[],value='',onChange,depth=null,disabled=false,required=false,label='Category hierarchy',idPrefix='nx-category'}){
 const trail=useMemo(()=>categoryTrail(categories,value),[categories,value]);
 const levels=depth===null?Math.min(8,Math.max(1,trail.length+1)):Math.max(0,Math.min(7,depth));
 const steps=[];
 for(let i=0;i<levels;i++){
  if(i>0&&!trail[i-1])break;
  const parent=i===0?null:String(trail[i-1].id);
  const choices=categories.filter(c=>i===0?!c.parentId:String(c.parentId)===parent).sort((a,b)=>a.name.localeCompare(b.name));
  if(!choices.length){if(depth===null)break;continue;}
  steps.push({i,choices});
 }
 function changeAt(index,id){
  onChange(id|| (index>0?String(trail[index-1]?.id||''):''));
 }
 return <fieldset className="nx71-category-cascade" disabled={disabled} aria-label={label}>
   <legend>{label}{required&&<span aria-hidden="true" className="nx34-required"> *</span>}</legend>
   <div className="nx71-cascade-steps">{steps.map(({i,choices})=><label key={i} htmlFor={`${idPrefix}-${i}`}><span>{i+1}. {stepName(i)}</span>
    <select id={`${idPrefix}-${i}`} value={String(trail[i]?.id||'')} onChange={e=>changeAt(i,e.target.value)} required={required&&depth!==null}>
     <option value="">{`Choose ${stepName(i).toLowerCase()}`}</option>
     {choices.map(c=><option key={c.id} value={String(c.id)}>{c.name}</option>)}
    </select></label>)}</div>
   {trail.length>0&&<p className="nx71-category-crumb" aria-live="polite">Selected path: <strong>{trail.map(c=>c.name).join(' / ')}</strong></p>}
   {depth!==null&&depth>0&&trail.length!==depth&&<p className="nx71-category-help" role="status">Choose all {depth} parent {depth===1?'category':'categories'} before saving.</p>}
 </fieldset>;
}
