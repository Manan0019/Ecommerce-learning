import {useId,useState} from 'react';
import {INDIAN_STATES,canonicalIndianState} from '../../constants/indianStates';

// Accessible, filtered state selector: allows typing, pointer selection and arrow/Enter keys.
export default function IndianStatePicker({value='',onChange,disabled=false,required=false,name='state',placeholder='Start typing a state or union territory'}){
 const listId=useId();const [focused,setFocused]=useState(false),[highlight,setHighlight]=useState(0);
 const term=String(value).trim().toLowerCase();
 const matches=INDIAN_STATES.filter(item=>!term||item.toLowerCase().includes(term));
 const candidates=matches.slice(0,8);
 const expanded=focused&&candidates.length>0&&canonicalIndianState(value)!==value;
 function pick(next){onChange(next);setFocused(false);setHighlight(0)}
 function keyDown(event){
  if(event.key==='Escape'){setFocused(false);return}
  if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();setFocused(true);setHighlight(index=>Math.max(0,Math.min(candidates.length-1,index+(event.key==='ArrowDown'?1:-1))));return}
  if(event.key==='Enter'&&expanded&&candidates[highlight]){event.preventDefault();pick(candidates[highlight])}
 }
 return <div className="nx75-state-picker">
  <input name={name} role="combobox" aria-autocomplete="list" aria-controls={listId} aria-expanded={expanded} aria-activedescendant={expanded&&candidates[highlight]?`${listId}-${highlight}`:undefined} autoComplete="address-level1" maxLength={100} value={value} placeholder={placeholder} required={required} disabled={disabled}
   onFocus={()=>{setFocused(true);setHighlight(0)}} onBlur={()=>setFocused(false)} onChange={event=>{onChange(event.target.value);setFocused(true);setHighlight(0)}} onKeyDown={keyDown}/>
  {expanded&&<div id={listId} className="nx75-state-suggestions" role="listbox" aria-label="Suggested Indian states and union territories">
   {candidates.map((item,index)=><div role="option" aria-selected={highlight===index} id={`${listId}-${index}`} key={item} className={highlight===index?'is-highlighted':''} onPointerDown={event=>{event.preventDefault();pick(item)}}>{item}</div>)}
  </div>}
 </div>;
}
