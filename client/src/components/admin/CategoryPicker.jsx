import { useId, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import UiIcon from "../common/UiIcon";
import { categoryPaths } from "../../services/categoryHierarchy";

export default function CategoryPicker({ categories = [], value = "", onChange, disabled = false, required = true, label = "Category / subcategory" }) {
  const inputId = useId();
  const listId = `${inputId}-list`;
  const inputRef=useRef(null);
  const [text, setText] = useState(null);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [position,setPosition]=useState(null);
  const paths = useMemo(() => categoryPaths(categories), [categories]);
  const selected = paths.find(item => String(item.id) === String(value));
  const display = text === null ? (selected?.path || "") : text;
  const matches = paths.filter(item => !text || item.path.toLowerCase().includes(text.trim().toLowerCase())).slice(0, 30);
  const locate=useCallback(()=>{
    if (!inputRef.current) return;
    const r=inputRef.current.getBoundingClientRect();
    const below=window.innerHeight-r.bottom-10;
    const above=r.top-10;
    const placeAbove=below<190 && above>below;
    const height=Math.max(90,Math.min(320,placeAbove?above-8:below-8));
    setPosition({left:r.left,top:placeAbove?Math.max(8,r.top-height-5):r.bottom+5,width:r.width,maxHeight:height});
  },[]);
  useEffect(()=>{
    if(!open)return;
    locate();
    const onPosition=()=>locate();
    window.addEventListener('scroll',onPosition,true);
    window.addEventListener('resize',onPosition);
    return ()=>{window.removeEventListener('scroll',onPosition,true);window.removeEventListener('resize',onPosition);};
  },[open,locate]);
  function select(item) {
    onChange(String(item.id));
    setText(null);setOpen(false);setHighlight(0);
  }
  function handleKey(e) {
    if(e.key === "Escape") { e.preventDefault();setOpen(false);setText(null); }
    if(e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();setOpen(true);
      setHighlight(previous => Math.max(0,Math.min(matches.length-1,previous+(e.key==="ArrowDown"?1:-1))));
    }
    if(e.key === "Enter" && open && matches.length) { e.preventDefault();select(matches[highlight] || matches[0]); }
  }
  return <div className="nx18-category-picker nx70-category-picker">
    <label htmlFor={inputId} className="nx34-category-picker-label"><span className="nx34-field-label">{label}{required && <b className="nx34-required" aria-hidden="true">*</b>}</span></label>
    <div className="nx18-combobox-wrap">
      <input ref={inputRef} id={inputId} type="search" role="combobox" aria-autocomplete="list"
        aria-expanded={open} aria-controls={open?listId:undefined} aria-activedescendant={open && matches[highlight] ? `${listId}-${matches[highlight].id}` : undefined}
        autoComplete="off" placeholder="Search categories or subcategories…" disabled={disabled} required={required} aria-required={required}
        value={display} onFocus={()=>{locate();setOpen(true);setHighlight(0);}}
        onChange={e=>{setText(e.target.value);setOpen(true);setHighlight(0);}}
        onKeyDown={handleKey} onBlur={()=>{setOpen(false);setText(null);}}/>
      <UiIcon name="search" size={18} className="nx70-category-search-icon"/>
    </div>
    {open && !disabled && position && createPortal(<ul role="listbox" id={listId} className="nx18-category-options nx70-category-options" style={position}>
      {matches.length ? matches.map((item,index)=><li id={`${listId}-${item.id}`} key={item.id} role="option"
        aria-selected={String(value)===String(item.id)} className={index===highlight?'is-highlighted':''}>
        <button type="button" onPointerDown={event=>event.preventDefault()} onMouseDown={event=>event.preventDefault()} onClick={()=>select(item)}>
          <span>{item.path}</span>
          <small>{paths.some(child=>String(child.parentId)===String(item.id))?'Parent category':'Subcategory / leaf'}</small>
        </button>
      </li>):<li className="nx18-no-category">No matching categories</li>}
    </ul>,document.body)}
    {selected && <small className="nx18-category-selected">Selected: {selected.path}</small>}
  </div>;
}
